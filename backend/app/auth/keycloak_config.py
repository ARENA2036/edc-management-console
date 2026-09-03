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
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError, JWTError

logger = logging.getLogger('app')

security = HTTPBearer(auto_error=False)

JWKS_TTL_SECONDS = 300
ALGORITHMS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "PS256"]

BPN_CLAIM = "bpn"
COMPANY_CLAIM = "organisation"
ROLES_CLAIM = "roles"
RESOURCE_ACCESS_CLAIM = "resource_access"
REALM_ACCESS_CLAIM = "realm_access"


def _clean(value: Optional[str]) -> str:
    """Trim a config value, treating un-substituted placeholders as unset."""
    if not value or not isinstance(value, str):
        return ""

    stripped = value.strip()
    if stripped.startswith("__") or (stripped.startswith("${") and stripped.endswith("}")):
        return ""

    return stripped


def _names(value: Any) -> list:
    """Every non-empty string in a claim that may hold one value or a list."""
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []

    if isinstance(value, (list, tuple)):
        return [entry.strip() for entry in value
                if isinstance(entry, str) and entry.strip()]

    return []


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
        self.client_id = _clean(os.getenv("KEYCLOAK_CLIENT_ID"))
        self._jwks: Optional[dict] = None
        self._jwks_fetched_at = 0.0
        self._jwks_lock = threading.Lock()

    def configure(self, *, url=None, realm=None, client_id=None,
                  fallback_url=None, fallback_realm=None):
        """Apply configuration.yml settings. Environment variables win."""
        if not self.keycloak_url:
            self.keycloak_url = _clean(url) or _clean(fallback_url)
        if not self.realm:
            self.realm = _clean(realm) or _clean(fallback_realm)
        if not self.client_id:
            self.client_id = _clean(client_id)

        logger.info("[Keycloak] Verifying tokens issued by %s", self.issuer or "<unconfigured>")
        if self.client_id:
            logger.info("[Keycloak] Accepting tokens issued for client %s", self.client_id)
        else:
            logger.warning("[Keycloak] identity.clientId is not set; tokens issued for any "
                           "client in this realm will be accepted.")

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

    def _assert_issued_for_this_client(self, claims: dict) -> None:
        """Reject a token minted for a different client in the same realm.

        Checked against ``azp`` as well as ``aud`` because Keycloak public
        clients carry the client id in ``azp`` and frequently have no ``aud``
        naming this application at all.
        """
        if not self.client_id:
            return

        audience = claims.get("aud")
        accepted = {audience} if isinstance(audience, str) else set(audience or ())
        accepted.add(_first(claims.get("azp")))
        if self.client_id not in accepted:
            raise _unauthorized(
                f"Token was not issued for this application; expected client "
                f"{self.client_id!r}."
            )

    def decode_token(self, token: str) -> dict:
        """Return the token's verified claims, or raise 401."""
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
            claims = jwt.decode(token, key=jwks, algorithms=ALGORITHMS,
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

        self._assert_issued_for_this_client(claims)
        return claims

    def roles_from(self, claims: dict) -> tuple:
        """Role names this token carries, in assignment order, de-duplicated.

        Keycloak puts an application's own roles under
        ``resource_access.<client>.roles`` and realm-wide ones under
        ``realm_access.roles``. Both are read, so a deployment can model
        Admin/User as client roles on this client or as realm roles without the
        backend caring which.
        """
        granted = []

        resource_access = claims.get(RESOURCE_ACCESS_CLAIM)
        if self.client_id and isinstance(resource_access, dict):
            client_roles = resource_access.get(self.client_id)
            if isinstance(client_roles, dict):
                granted.extend(_names(client_roles.get(ROLES_CLAIM)))

        realm_access = claims.get(REALM_ACCESS_CLAIM)
        if isinstance(realm_access, dict):
            granted.extend(_names(realm_access.get(ROLES_CLAIM)))

        return tuple(dict.fromkeys(granted))

    def build_user(self, claims: dict, token: str = "") -> dict:
        """The caller, the company they act for and what they may do."""
        return {
            "preferred_username": _first(claims.get("preferred_username")) or "unknown",
            "name": _first(claims.get("name")),
            "email": _first(claims.get("email")),
            "bpn": _first(claims.get(BPN_CLAIM)).upper(),
            "company": _first(claims.get(COMPANY_CLAIM)),
            "roles": self.roles_from(claims),
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


def _unverified_issuer(token: str) -> str:
    """The token's own `iss`, read without verifying. For error messages only."""
    try:
        return jwt.get_unverified_claims(token).get("iss", "")
    except Exception:
        return "<unreadable>"


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail,
                         headers={"WWW-Authenticate": "Bearer"})


keycloak_openid = KeycloakOpenID()
