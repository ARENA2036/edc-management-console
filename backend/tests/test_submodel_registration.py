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
"""POST /api/submodel/{submodel_service_id} - registering an existing service.

The handler called ``database_manager.log_activity``; the module global is
``databaseManager``. Every request therefore raised ``NameError``, the handler's
blanket ``except`` turned it into a 500 tagged ``stage=upstream``, and the
endpoint had never once returned a success. Nothing but executing the handler
catches that, which is what these tests do.

They also pin the ordering the handler now guarantees: the caller's credentials
are only spent once the request is known to be acceptable.
"""
import socket

import pytest
from fastapi.testclient import TestClient

from app import main
from app.auth.roles import require_admin

ADMIN = {"preferred_username": "tester", "bpn": "BPNL0000000TEST", "roles": ("Admin",)}
PUBLIC_ADDRESS = "93.184.216.34"


class RecordingActivityLog:
    """Stands in for the DatabaseManager global, which only ``init_app`` binds."""

    def __init__(self):
        self.entries = []

    def log_activity(self, **kwargs):
        self.entries.append(kwargs)


class Recorder:
    """A stand-in for ``requests.get`` / ``requests.post`` that records its calls."""

    def __init__(self, result=None, raises=None):
        self.calls = []
        self._result = result
        self._raises = raises

    def __call__(self, url, **kwargs):
        self.calls.append((url, kwargs))
        if self._raises is not None:
            raise self._raises
        return self._result


class Response:
    def __init__(self, status_code):
        self.status_code = status_code


@pytest.fixture
def activity(monkeypatch):
    recorder = RecordingActivityLog()
    monkeypatch.setattr(main, "databaseManager", recorder, raising=False)
    return recorder


@pytest.fixture
def resolves_public(monkeypatch):
    """Pin DNS to a public address so no test depends on the network."""
    monkeypatch.delenv("EMC_URL_SCHEME", raising=False)
    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM,
                                  socket.IPPROTO_TCP, "", (PUBLIC_ADDRESS, 443))],
    )


@pytest.fixture
def client():
    main.app.dependency_overrides[require_admin] = lambda: ADMIN
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def register(client, **payload):
    return client.post("/api/submodel/sms-1", json=payload)


# ---------------------------------------------------------------------------
# The regression: the handler could not complete at all.
# ---------------------------------------------------------------------------
def test_registration_succeeds_and_is_written_to_the_activity_log(
        client, activity, resolves_public, monkeypatch):
    probe = Recorder(result=Response(200))
    monkeypatch.setattr(main.requests, "get", probe)

    response = register(client, url="https://sms.example.com", bpn="BPNL0000000TEST")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body == {"id": "sms-1", "url": "https://sms.example.com",
                    "bpn": "BPNL0000000TEST", "reachable": True, "status": "connected"}

    # The path parameter is declared on the route, so it has to reach the handler.
    assert [entry["connector_name"] for entry in activity.entries] == ["sms-1"]
    assert activity.entries[0]["status"] == "success"

    # The probe goes to the service's health path, rebuilt from the vetted origin.
    assert probe.calls[0][0] == "https://sms.example.com/api/health"


def test_a_service_that_does_not_answer_is_reported_not_raised(
        client, activity, resolves_public, monkeypatch):
    monkeypatch.setattr(main.requests, "get",
                        Recorder(raises=main.requests.ConnectionError("refused")))

    response = register(client, url="https://sms.example.com", bpn="BPNL0000000TEST")

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "unreachable"
    assert activity.entries[0]["status"] == "warning"


# ---------------------------------------------------------------------------
# Nothing leaves this backend until the request is known to be acceptable.
# ---------------------------------------------------------------------------
def test_a_request_without_a_bpn_is_refused(client, activity, monkeypatch):
    probe = Recorder(result=Response(200))
    monkeypatch.setattr(main.requests, "get", probe)

    response = register(client, url="https://sms.example.com")

    assert response.status_code == 400
    assert response.json()["code"] == "MISSING_REQUIRED_FIELD"
    assert "bpn" in response.json()["error"]
    assert probe.calls == []
    assert activity.entries == []


def test_oauth2_credentials_are_not_spent_on_an_incomplete_request(
        client, activity, monkeypatch):
    """The token request used to be made before the payload was checked, so an
    incomplete request still shipped the client secret to whatever the caller
    named as the token endpoint."""
    token_request = Recorder(result=Response(200))
    monkeypatch.setattr(main.requests, "post", token_request)

    response = register(client,
                        url="https://sms.example.com",
                        authType="oauth2",
                        submodelOAuthAccessTokenUrl="https://idp.example.com/token",
                        submodelOAuthClientId="emc",
                        submodelOAuthClientSecret="s3cret")

    assert response.status_code == 400
    assert token_request.calls == []


def test_a_missing_api_key_is_a_bad_request_not_an_unreachable_service(
        client, activity, resolves_public, monkeypatch):
    """``X-API-Key: None`` used to make requests raise, which the probe's except
    turned into "the service is unreachable" - blaming the service for the
    caller's omission."""
    probe = Recorder(result=Response(200))
    monkeypatch.setattr(main.requests, "get", probe)

    response = register(client, url="https://sms.example.com",
                        bpn="BPNL0000000TEST", authType="apiKey")

    assert response.status_code == 400
    assert "apiKey" in response.json()["error"]
    assert probe.calls == []


def test_a_service_resolving_inward_is_refused(client, activity, monkeypatch):
    """The SSRF guard has to stay wired into the handler, not just be tested on
    its own: the probe carries the caller's credentials."""
    monkeypatch.delenv("EMC_URL_SCHEME", raising=False)
    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM,
                                  socket.IPPROTO_TCP, "", ("169.254.169.254", 443))],
    )
    probe = Recorder(result=Response(200))
    monkeypatch.setattr(main.requests, "get", probe)

    response = register(client, url="https://metadata.example.com",
                        bpn="BPNL0000000TEST")

    assert response.status_code == 400
    assert response.json()["code"] == "UNSAFE_URL"
    assert probe.calls == []


# ---------------------------------------------------------------------------
# The endpoint that claimed to deploy.
# ---------------------------------------------------------------------------
def test_the_deploy_endpoint_is_gone(client):
    """POST /api/submodel reported ``"status": "deployed"`` having deployed
    nothing, and echoed the caller's credentials back. Deploying a submodel
    server is POST /api/component with type submodelServer."""
    assert client.post("/api/submodel", json={"url": "https://sms.example.com"}).status_code == 404
