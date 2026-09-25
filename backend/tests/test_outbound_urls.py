###############################################################
# Tractus-X - EDC Management Console
#
# Copyright (c) 2026 ARENA2036 e.V.
# Copyright (c) 2026 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################
"""Outbound URLs built from caller-supplied input.

``add_existing_submodel_service`` lets the caller name both a submodel service
and its OAuth2 token endpoint, and this backend then calls them *with
credentials attached*. Unvalidated, that is a server-side request forgery sink
into the cluster: the metadata service, the Kubernetes API and every internal
Service are one request away, and the client secret goes with it.
"""

import os
import socket
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utilities.auth_utils import (assert_safe_external_url,  # noqa: E402
                                  build_external_url, get_oauth2_token)
from utilities.errors import EmcError  # noqa: E402


@pytest.fixture(autouse=True)
def _https_only(monkeypatch):
    monkeypatch.delenv("EMC_URL_SCHEME", raising=False)


def _resolves_to(monkeypatch, address):
    """Pin DNS so the test does not depend on the network."""
    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM,
                                  socket.IPPROTO_TCP, "", (address, 443))],
    )


def test_accepts_a_public_https_endpoint(monkeypatch):
    _resolves_to(monkeypatch, "93.184.216.34")
    url = "https://idp.example.com/realms/x/protocol/openid-connect/token"
    assert assert_safe_external_url(url, field="accessTokenUrl") == url


@pytest.mark.parametrize("address, what", [
    ("127.0.0.1", "loopback"),
    ("10.1.2.3", "private class A"),
    ("172.16.5.4", "private class B"),
    ("192.168.1.10", "private class C"),
    ("169.254.169.254", "cloud metadata service"),
    ("0.0.0.0", "unspecified"),
])
def test_rejects_internal_addresses(monkeypatch, address, what):
    """The name may be public while the record points inward — a DNS entry
    resolving to 169.254.169.254 is the classic cloud-credential theft."""
    _resolves_to(monkeypatch, address)

    with pytest.raises(EmcError) as error:
        assert_safe_external_url("https://looks-fine.example.com/token",
                                 field="accessTokenUrl")
    assert error.value.status == 400
    assert error.value.code == "UNSAFE_URL", what


@pytest.mark.parametrize("url", [
    "http://idp.example.com/token",          # no TLS: credentials in clear
    "file:///etc/passwd",
    "gopher://idp.example.com:70/_payload",
    "ftp://idp.example.com/token",
])
def test_rejects_non_https_schemes(monkeypatch, url):
    _resolves_to(monkeypatch, "93.184.216.34")

    with pytest.raises(EmcError) as error:
        assert_safe_external_url(url, field="accessTokenUrl")
    assert error.value.code == "UNSAFE_URL"


def test_rejects_embedded_credentials(monkeypatch):
    _resolves_to(monkeypatch, "93.184.216.34")

    with pytest.raises(EmcError):
        assert_safe_external_url("https://user:secret@idp.example.com/token",
                                 field="accessTokenUrl")


def test_rejects_a_missing_url():
    for value in (None, "", "   ", 42):
        with pytest.raises(EmcError):
            assert_safe_external_url(value, field="accessTokenUrl")


def test_http_is_allowed_only_when_the_deployment_already_uses_it(monkeypatch):
    """`EMC_URL_SCHEME=http` is an existing, deliberate deployment choice; the
    private-address check still applies."""
    _resolves_to(monkeypatch, "93.184.216.34")
    monkeypatch.setenv("EMC_URL_SCHEME", "http")
    url = "http://idp.example.com/token"
    assert assert_safe_external_url(url, field="accessTokenUrl") == url

    _resolves_to(monkeypatch, "127.0.0.1")
    with pytest.raises(EmcError):
        assert_safe_external_url(url, field="accessTokenUrl")


def test_token_request_is_bounded_and_does_not_follow_redirects(monkeypatch):
    """A vetted public host must not be able to 302 the credentialled request
    onto an internal address, and it must not hang the worker."""
    _resolves_to(monkeypatch, "93.184.216.34")
    seen = {}

    class Response:
        status_code = 200

        @staticmethod
        def json():
            return {"access_token": "TOK"}

    def post(url, **kwargs):
        seen.update(url=url, **kwargs)
        return Response()

    monkeypatch.setattr("utilities.auth_utils.requests.post", post)

    token = get_oauth2_token({"accessTokenUrl": "https://idp.example.com/token",
                              "clientId": "cid", "clientSecret": "sec"})

    assert token == "TOK"
    assert seen["allow_redirects"] is False
    assert seen["timeout"] > 0
    assert seen["auth"] == ("cid", "sec")


def test_token_request_refuses_an_internal_endpoint(monkeypatch):
    _resolves_to(monkeypatch, "169.254.169.254")

    def post(*args, **kwargs):  # pragma: no cover - must never run
        raise AssertionError("the request should never have been made")

    monkeypatch.setattr("utilities.auth_utils.requests.post", post)

    with pytest.raises(EmcError) as error:
        get_oauth2_token({"accessTokenUrl": "https://metadata.example.com/token",
                          "clientId": "cid", "clientSecret": "sec"})
    assert error.value.code == "UNSAFE_URL"


def test_upstream_failures_surface_as_502_not_a_keyerror(monkeypatch):
    """The old code did `response.json()["access_token"]`, so an error page
    became an unhandled KeyError and a 500."""
    _resolves_to(monkeypatch, "93.184.216.34")

    class Refused:
        status_code = 401

        @staticmethod
        def json():
            return {"error": "invalid_client"}

    monkeypatch.setattr("utilities.auth_utils.requests.post",
                        lambda *args, **kwargs: Refused())

    with pytest.raises(EmcError) as error:
        get_oauth2_token({"accessTokenUrl": "https://idp.example.com/token",
                          "clientId": "cid", "clientSecret": "wrong"})
    assert error.value.status == 502


def test_rejects_a_query_string_or_fragment_on_a_base_url(monkeypatch):
    """`https://host/?x=` + `/api/health` collapses to `https://host/?x=/api/health`,
    which lets the caller pick where on the host the probe lands."""
    _resolves_to(monkeypatch, "93.184.216.34")

    for url in ("https://svc.example.com/?next=", "https://svc.example.com/#frag"):
        with pytest.raises(EmcError) as error:
            assert_safe_external_url(url, field="url")
        assert error.value.code == "UNSAFE_URL"


def test_token_endpoints_may_carry_a_query_string(monkeypatch):
    """Some IdPs do; the token URL is used whole, never concatenated."""
    _resolves_to(monkeypatch, "93.184.216.34")
    url = "https://idp.example.com/token?tenant=acme"
    assert assert_safe_external_url(url, field="accessTokenUrl", allow_query=True) == url


@pytest.mark.parametrize("base, expected", [
    ("https://svc.example.com", "https://svc.example.com/api/health"),
    ("https://svc.example.com/", "https://svc.example.com/api/health"),
    ("https://svc.example.com/sub", "https://svc.example.com/sub/api/health"),
    ("https://svc.example.com/sub/", "https://svc.example.com/sub/api/health"),
])
def test_probe_url_is_the_vetted_origin_plus_a_literal_path(monkeypatch, base, expected):
    _resolves_to(monkeypatch, "93.184.216.34")
    assert build_external_url(base, "api/health", field="url") == expected


def test_probe_url_refuses_an_internal_base(monkeypatch):
    _resolves_to(monkeypatch, "10.0.0.5")

    with pytest.raises(EmcError) as error:
        build_external_url("https://svc.example.com", "api/health", field="url")
    assert error.value.code == "UNSAFE_URL"
