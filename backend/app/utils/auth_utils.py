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
import contextlib
import ipaddress
import logging
import os
import socket
import threading
from urllib.parse import urlsplit, urlunsplit

import requests

from app.utils.errors import EmcError, Stage

logger = logging.getLogger('app')

REQUEST_TIMEOUT_SECONDS = 10


def _allowed_schemes() -> set:
    """``https`` only, unless the deployment already runs plain HTTP.

    Mirrors ``EMC_URL_SCHEME`` (see ``app/managers/edc_manager.py``) so a local or
    on-cluster HTTP setup is not silently broken by this check.
    """
    if os.getenv("EMC_URL_SCHEME", "https").strip().lower() == "http":
        return {"https", "http"}

    return {"https"}


def _validate_external_url(raw_url, *, field: str, allow_query: bool = False):
    """Check ``raw_url`` names a public endpoint and return ``(url, host, port, resolved)``.

    Every caller here builds an outbound request out of a URL the API caller
    supplied, and attaches credentials to it. Unchecked, that is a server-side
    request forgery sink: this backend runs inside the cluster, so it can reach
    the cloud metadata service, the Kubernetes API and every internal Service —
    and it would hand the client secret or bearer token to whichever host the
    caller named.

    Rejects anything that is not a plain public HTTPS endpoint: wrong scheme,
    embedded credentials, and — after resolving the name — loopback, private,
    link-local, multicast or otherwise non-global addresses.
    """
    if not raw_url or not isinstance(raw_url, str) or not raw_url.strip():
        raise EmcError(f"{field} is required.",
                       status=400, code="MISSING_REQUIRED_FIELD", stage=Stage.REQUEST)

    url = raw_url.strip()
    try:
        parts = urlsplit(url)
    except ValueError as exception:
        raise EmcError(f"{field} is not a valid URL.",
                       status=400, code="UNSAFE_URL", stage=Stage.REQUEST,
                       detail=str(exception))
    schemes = _allowed_schemes()

    if parts.scheme not in schemes:
        raise EmcError(f"{field} must use {' or '.join(sorted(schemes))}.",
                       status=400, code="UNSAFE_URL", stage=Stage.REQUEST,
                       detail=f"Received scheme {parts.scheme or '<none>'!r}.",
                       hint="Credentials are sent with this request, so the endpoint "
                            "must be reachable over TLS.")

    if parts.username or parts.password:
        raise EmcError(f"{field} must not embed credentials.",
                       status=400, code="UNSAFE_URL", stage=Stage.REQUEST)

    if not allow_query and (parts.query or parts.fragment):
        raise EmcError(f"{field} must not carry a query string or fragment.",
                       status=400, code="UNSAFE_URL", stage=Stage.REQUEST)

    try:
        host = parts.hostname
    except ValueError as exception:
        raise EmcError(f"{field} has an invalid host.",
                       status=400, code="UNSAFE_URL", stage=Stage.REQUEST,
                       detail=str(exception))
    if not host:
        raise EmcError(f"{field} must include a hostname.",
                       status=400, code="UNSAFE_URL", stage=Stage.REQUEST)

    try:
        port = parts.port or (80 if parts.scheme == "http" else 443)
    except ValueError as exception:
        raise EmcError(f"{field} has an invalid port.",
                       status=400, code="UNSAFE_URL", stage=Stage.REQUEST,
                       detail=str(exception))

    try:
        resolved = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exception:
        raise EmcError(f"{field} does not resolve to a reachable host.",
                       status=400, code="UNSAFE_URL", stage=Stage.REQUEST,
                       detail=str(exception))

    for entry in resolved:
        address = ipaddress.ip_address(entry[4][0])
        if not address.is_global or address.is_multicast:
            logger.warning("[auth] Refused %s pointing at the internal address %s", field, address)
            raise EmcError(f"{field} resolves to a non-public address.",
                           status=400, code="UNSAFE_URL", stage=Stage.REQUEST,
                           detail=f"{host} resolves to {address}.",
                           hint="Only endpoints reachable on the public internet "
                                "can be registered here.")

    return url, host, port, resolved


def assert_safe_external_url(raw_url, *, field: str, allow_query: bool = False) -> str:
    return _validate_external_url(raw_url, field=field, allow_query=allow_query)[0]


_dns_pin_lock = threading.Lock()


@contextlib.contextmanager
def pinned_connection(raw_url, *, field: str, allow_query: bool = False):
    url, host, _port, resolved = _validate_external_url(raw_url, field=field, allow_query=allow_query)
    real_getaddrinfo = socket.getaddrinfo

    def _pinned(node, *args, **kwargs):
        if node == host:
            return resolved
        return real_getaddrinfo(node, *args, **kwargs)

    with _dns_pin_lock:
        socket.getaddrinfo = _pinned
        try:
            yield url
        finally:
            socket.getaddrinfo = real_getaddrinfo


def build_external_url(base_url, path: str, *, field: str) -> str:
    parts = urlsplit(assert_safe_external_url(base_url, field=field))
    base_path = parts.path.rstrip("/")

    return urlunsplit((parts.scheme, parts.netloc,
                       f"{base_path}/{path.lstrip('/')}", "", ""))


def get_oauth2_token(oauth_config: dict) -> str:
    """Fetch an OAuth2 access token using the client-credentials grant."""
    client_id = oauth_config.get("clientId")
    client_secret = oauth_config.get("clientSecret")
    if not client_id or not client_secret:
        raise EmcError("submodelOAuthClientId and submodelOAuthClientSecret are required.",
                       status=400, code="MISSING_REQUIRED_FIELD", stage=Stage.REQUEST)

    scope = oauth_config.get("scope", "openid")
    client_auth = oauth_config.get("clientAuth", "basic")

    data = {"grant_type": "client_credentials", "scope": scope}
    auth = None

    if client_auth == "basic":
        auth = (client_id, client_secret)
    else:
        data["client_id"] = client_id
        data["client_secret"] = client_secret

    with pinned_connection(oauth_config.get("accessTokenUrl"),
                          field="submodelOAuthAccessTokenUrl", allow_query=True) as token_url:
        try:
            response = requests.post(token_url, data=data, auth=auth,
                                     timeout=REQUEST_TIMEOUT_SECONDS, allow_redirects=False)
        except requests.RequestException as exception:
            raise EmcError("Could not reach the submodel service's token endpoint.",
                           status=502, code="OAUTH_TOKEN_UNREACHABLE", stage=Stage.UPSTREAM,
                           detail=str(exception))

    if response.status_code != 200:
        raise EmcError("The token endpoint rejected the client credentials.",
                       status=502, code="OAUTH_TOKEN_REFUSED", stage=Stage.UPSTREAM,
                       detail=f"HTTP {response.status_code} from the token endpoint.")

    try:
        payload = response.json()
    except ValueError as exception:
        raise EmcError("The token endpoint did not return JSON.",
                       status=502, code="OAUTH_TOKEN_MALFORMED", stage=Stage.UPSTREAM,
                       detail=str(exception))

    token = payload.get("access_token") if isinstance(payload, dict) else None
    if not token or not isinstance(token, str):
        raise EmcError("The token endpoint returned no access_token.",
                       status=502, code="OAUTH_TOKEN_MALFORMED", stage=Stage.UPSTREAM)

    return token
