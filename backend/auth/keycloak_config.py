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
import logging
import os
import threading
import time
from typing import Any, Optional

import requests
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError, JWTError

logger = logging.getLogger('app')

security = HTTPBearer(auto_error=False)

JWKS_TTL_SECONDS = 300
ALGORITHMS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "PS256"]

BPN_CLAIM = "bpn"
COMPANY_CLAIM = "organisation"


def _clean(value: Optional[str]) -> str:
    """Trim a config value, treating un-substituted placeholders as unset."""
    if not value or not isinstance(value, str):
        return ""

    stripped = value.strip()
    if stripped.startswith("__") or (stripped.startswith("${") and stripped.endswith("}")):
        return ""

    return stripped


def _first(value: Any) -> str:
    """Flatten a claim to one string; Keycloak multivalued mappers emit lists."""
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, (list, tuple)):
        for entry in value:
            flattened = _first(entry)
            if flattened:
                return flattened

    return ""


class KeycloakOpenID:
    def __init__(self):
        self.keycloak_url = _clean(os.getenv("KEYCLOAK_URL"))
        self.realm = _clean(os.getenv("KEYCLOAK_REALM"))
        self.verify_signature = _env_flag("KEYCLOAK_VERIFY_SIGNATURE", True)
        self._jwks: Optional[dict] = None
        self._jwks_fetched_at = 0.0
        self._jwks_lock = threading.Lock()

    def configure(self, *, url=None, realm=None, fallback_url=None, fallback_realm=None):
        """Apply configuration.yml settings. Environment variables win."""
        if not self.keycloak_url:
            self.keycloak_url = _clean(url) or _clean(fallback_url)
        if not self.realm:
            self.realm = _clean(realm) or _clean(fallback_realm)

        logger.info("[Keycloak] Verifying tokens issued by %s", self.issuer or "<unconfigured>")

    @property
    def is_configured(self) -> bool:
        return bool(self.keycloak_url and self.realm)

    @property
    def issuer(self) -> str:
        """``<base>/realms/<realm>`` — the ``iss`` value Keycloak puts in tokens."""
        if not self.is_configured:
            return ""

        return f"{self.keycloak_url.rstrip('/')}/realms/{self.realm}"

    @property
    def jwks_uri(self) -> str:
        return f"{self.issuer}/protocol/openid-connect/certs" if self.issuer else ""

    def add_swagger_config(self, app):
        return None

    def _fetch_jwks(self) -> Optional[dict]:
        try:
            response = requests.get(self.jwks_uri, timeout=10)
            response.raise_for_status()
            jwks = response.json()
        except Exception as exception:
            logger.error("[Keycloak] Could not fetch JWKS from %s: %s", self.jwks_uri, exception)
            return None

        return jwks if isinstance(jwks, dict) and jwks.get("keys") else None

    def get_jwks(self, force_refresh: bool = False) -> Optional[dict]:
        with self._jwks_lock:
            fresh = self._jwks and (time.monotonic() - self._jwks_fetched_at) < JWKS_TTL_SECONDS
            if fresh and not force_refresh:
                return self._jwks

            jwks = self._fetch_jwks()
            if jwks:
                self._jwks = jwks
                self._jwks_fetched_at = time.monotonic()
            # Keep serving the previous keys on a failed refresh: a blip at the
            # IdP should not log everyone out.
            return self._jwks

    def decode_token(self, token: str) -> dict:
        """Return the token's verified claims, or raise 401."""
        if not self.verify_signature:
            logger.warning("[Keycloak] KEYCLOAK_VERIFY_SIGNATURE is off; token is untrusted.")
            return jwt.decode(token, key="", options={"verify_signature": False,
                                                      "verify_aud": False})

        if not self.is_configured:
            logger.error("[Keycloak] No identity provider configured; rejecting bearer tokens.")
            raise _unauthorized("Identity provider is not configured; the token cannot be trusted.")

        try:
            kid = jwt.get_unverified_header(token).get("kid")
        except JWTError as exception:
            raise _unauthorized(f"Malformed token: {exception}")

        jwks = self.get_jwks()
        if not jwks or not any(key.get("kid") == kid for key in jwks.get("keys", [])):
            jwks = self.get_jwks(force_refresh=True)
        if not jwks:
            raise _unauthorized("Identity provider keys are unavailable")

        try:
            return jwt.decode(token, key=jwks, algorithms=ALGORITHMS,
                              issuer=self.issuer, options={"verify_aud": False})
        except ExpiredSignatureError:
            raise _unauthorized("Token has expired")
        except (JWTClaimsError, JWTError) as exception:
            # Nearly always the wrong realm rather than a bad token, so name both
            # issuers instead of just saying "signature verification failed".
            raise _unauthorized(
                f"Token rejected: {exception}. Token issuer={_unverified_issuer(token)!r}, "
                f"configured issuer={self.issuer!r}."
            )

    def build_user(self, claims: dict, token: str = "") -> dict:
        """The caller and the company they act for, from verified claims."""
        return {
            "preferred_username": _first(claims.get("preferred_username")) or "unknown",
            "name": _first(claims.get("name")),
            "email": _first(claims.get("email")),
            "bpn": _first(claims.get(BPN_CLAIM)).upper(),
            "company": _first(claims.get(COMPANY_CLAIM)),
            "token": token,
        }

    async def get_current_user(
        self,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    ) -> dict:
        """Require a valid bearer token; 401 otherwise."""
        if credentials is None or not credentials.credentials:
            raise _unauthorized("Missing bearer token")

        return self.build_user(self.decode_token(credentials.credentials),
                               credentials.credentials)

    def get_optional_user(self, request: Request) -> Optional[dict]:
        """Identity when a valid token is present, ``None`` otherwise.

        An invalid token returns None rather than raising, so attaching a stale
        token can never turn a working API-key call into a 401.
        """
        header = request.headers.get("Authorization", "")
        if not header.lower().startswith("bearer "):
            return None

        token = header.split(" ", 1)[1].strip()
        try:
            return self.build_user(self.decode_token(token), token) if token else None
        except HTTPException as exception:
            logger.warning("[Keycloak] Ignoring unusable bearer token: %s", exception.detail)
            return None


def _unverified_issuer(token: str) -> str:
    """The token's own `iss`, read without verifying. For error messages only."""
    try:
        return jwt.get_unverified_claims(token).get("iss", "")
    except Exception:
        return "<unreadable>"


def _env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    return default if raw is None else raw.strip().lower() in {"1", "true", "yes", "on"}


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail,
                         headers={"WWW-Authenticate": "Bearer"})


keycloak_openid = KeycloakOpenID()
