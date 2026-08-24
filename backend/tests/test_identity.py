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

import base64
import os
import sys
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from jose import jwt

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from auth.keycloak_config import KeycloakOpenID  # noqa: E402

ISSUER = "https://centralidp.example.de/auth/realms/CX-Central"


def _generate_key(kid):
    """A private key plus its public half as a JWKS entry, as a realm serves it."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()

    def b64u(number):
        raw = number.to_bytes((number.bit_length() + 7) // 8, "big")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    numbers = key.public_key().public_numbers()
    return pem, {"kty": "RSA", "kid": kid, "alg": "RS256", "use": "sig",
                 "n": b64u(numbers.n), "e": b64u(numbers.e)}


def _sign(pem, kid, claims, issuer=ISSUER):
    payload = {"iss": issuer, "azp": "EMC-1", "iat": int(time.time()),
               "exp": int(time.time()) + 300, **claims}
    return jwt.encode(payload, pem, algorithm="RS256", headers={"kid": kid})


@pytest.fixture
def keycloak(monkeypatch):
    for name in ("KEYCLOAK_URL", "KEYCLOAK_REALM", "KEYCLOAK_CLIENT_ID"):
        monkeypatch.delenv(name, raising=False)

    instance = KeycloakOpenID()
    instance.configure(url="https://centralidp.example.de/auth/", realm="CX-Central")
    return instance


def test_issuer_matches_the_value_keycloak_puts_in_tokens(keycloak):
    assert keycloak.issuer == ISSUER
    assert keycloak.jwks_uri == f"{ISSUER}/protocol/openid-connect/certs"


def test_explicit_issuer_wins_over_the_centralidp_fallback():
    """The realm issuing browser tokens is configured separately from the
    backend's own `centralidp` client, which may point elsewhere — conflating the
    two rejected every real login."""
    instance = KeycloakOpenID()
    instance.configure(url="https://centralidp.txcd.example.de/auth/", realm="CX-Central",
                       fallback_url="https://centralidp.example.de/auth/",
                       fallback_realm="CX-Central")

    assert instance.issuer == "https://centralidp.txcd.example.de/auth/realms/CX-Central"

    fallback = KeycloakOpenID()
    fallback.configure(url=None, realm=None,
                       fallback_url="https://centralidp.example.de/auth/",
                       fallback_realm="CX-Central")
    assert fallback.issuer == ISSUER


def test_reads_company_identity_from_a_valid_token(keycloak, monkeypatch):
    pem, jwk = _generate_key("kid-1")
    monkeypatch.setattr(keycloak, "_fetch_jwks", lambda: {"keys": [jwk]})

    token = _sign(pem, "kid-1", {"bpn": "BPNL00000000052O", "organisation": "Delay Inc.",
                                 "preferred_username": "devaji"})
    user = keycloak.build_user(keycloak.decode_token(token), token)

    assert user["bpn"] == "BPNL00000000052O"
    assert user["company"] == "Delay Inc."
    assert user["preferred_username"] == "devaji"


def test_reads_a_multivalued_claim(keycloak, monkeypatch):
    """Keycloak multivalued mappers emit a list; treating that as "no value"
    would break the exact realm configuration this targets."""
    pem, jwk = _generate_key("kid-1")
    monkeypatch.setattr(keycloak, "_fetch_jwks", lambda: {"keys": [jwk]})

    user = keycloak.build_user(keycloak.decode_token(_sign(pem, "kid-1", {"bpn": ["BPNL01"]})))
    assert user["bpn"] == "BPNL01"


def test_missing_claims_are_reported_empty_not_invented(keycloak, monkeypatch):
    """A realm without the mappers must yield an empty company, never a
    configured default standing in for the user's own."""
    pem, jwk = _generate_key("kid-1")
    monkeypatch.setattr(keycloak, "_fetch_jwks", lambda: {"keys": [jwk]})

    user = keycloak.build_user(keycloak.decode_token(_sign(pem, "kid-1", {})))
    assert user["bpn"] == ""
    assert user["company"] == ""


def test_rejects_token_signed_by_another_key(keycloak, monkeypatch):
    """A forged token claiming someone else's BPN must not authenticate."""
    _, realm_jwk = _generate_key("kid-1")
    attacker_pem, _ = _generate_key("kid-1")  # same kid, wrong key
    monkeypatch.setattr(keycloak, "_fetch_jwks", lambda: {"keys": [realm_jwk]})

    with pytest.raises(HTTPException) as error:
        keycloak.decode_token(_sign(attacker_pem, "kid-1", {"bpn": "BPNL00000000052O"}))
    assert error.value.status_code == 401


def test_rejects_token_from_another_realm_and_names_both_issuers(keycloak, monkeypatch):
    """The failure an operator actually hits: backend pointed at the wrong
    Keycloak. The message must say so, not just "signature failed"."""
    pem, jwk = _generate_key("kid-1")
    monkeypatch.setattr(keycloak, "_fetch_jwks", lambda: {"keys": [jwk]})

    other = "https://centralidp.txcd.example.de/auth/realms/CX-Central"
    with pytest.raises(HTTPException) as error:
        keycloak.decode_token(_sign(pem, "kid-1", {}, issuer=other))

    assert other in error.value.detail
    assert ISSUER in error.value.detail


def test_rejects_expired_token(keycloak, monkeypatch):
    pem, jwk = _generate_key("kid-1")
    monkeypatch.setattr(keycloak, "_fetch_jwks", lambda: {"keys": [jwk]})

    expired = jwt.encode({"iss": ISSUER, "iat": 500, "exp": 1000}, pem,
                         algorithm="RS256", headers={"kid": "kid-1"})
    with pytest.raises(HTTPException) as error:
        keycloak.decode_token(expired)
    assert "expired" in error.value.detail.lower()


def test_unknown_kid_refreshes_the_keys_once(keycloak, monkeypatch):
    """Key rotation must not log everyone out, but a bad token must not trigger
    unbounded requests to the IdP either."""
    pem, rotated = _generate_key("kid-2")
    _, stale = _generate_key("kid-1")
    calls = {"n": 0}

    def fetch():
        calls["n"] += 1
        return {"keys": [stale]} if calls["n"] == 1 else {"keys": [rotated]}

    monkeypatch.setattr(keycloak, "_fetch_jwks", fetch)

    assert keycloak.decode_token(_sign(pem, "kid-2", {"bpn": "BPNL01"}))["bpn"] == "BPNL01"
    assert calls["n"] == 2


def test_fails_closed_when_the_idp_is_unreachable(keycloak, monkeypatch):
    """Without keys no trust decision is possible; accepting anything here would
    reintroduce the hole this replaces."""
    monkeypatch.setattr(keycloak, "_fetch_jwks", lambda: None)
    pem, _ = _generate_key("kid-1")

    with pytest.raises(HTTPException) as error:
        keycloak.decode_token(_sign(pem, "kid-1", {}))
    assert error.value.status_code == 401


def test_fails_closed_when_no_identity_provider_is_configured(monkeypatch):
    """A missing URL/realm is a misconfiguration, not permission to trust the
    caller. Without an issuer there is nothing to verify against, so anyone
    could self-sign a token carrying whatever `bpn` they liked."""
    for name in ("KEYCLOAK_URL", "KEYCLOAK_REALM", "KEYCLOAK_CLIENT_ID"):
        monkeypatch.delenv(name, raising=False)

    unconfigured = KeycloakOpenID()
    assert not unconfigured.is_configured

    pem, _ = _generate_key("kid-1")
    forged = _sign(pem, "kid-1", {"bpn": "BPNL000000000042", "organisation": "Someone Else"})

    with pytest.raises(HTTPException) as error:
        unconfigured.decode_token(forged)
    assert error.value.status_code == 401


