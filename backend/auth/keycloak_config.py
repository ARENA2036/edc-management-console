###############################################################
# Tractus-X - EDC Management Console
#
# Copyright (c) 2025 ARENA2036 e.V.
# Copyright (c) 2025 Contributors to the Eclipse Foundation
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

import os
import time
import requests
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from dotenv import load_dotenv

from auth.models import AuthenticatedUser

load_dotenv()

logger = logging.getLogger("staging")
security = HTTPBearer()


class KeycloakOpenID:
    def __init__(self):
        self.keycloak_url = os.getenv("KEYCLOAK_URL")
        self.realm = os.getenv("KEYCLOAK_REALM")
        self.client_id = os.getenv("KEYCLOAK_CLIENT_ID")

        self.issuer = f"{self.keycloak_url}/realms/{self.realm}"
        self.jwks_url = f"{self.issuer}/protocol/openid-connect/certs"

        self.jwks = None
        self.jwks_last_refresh = 0
        self.jwks_cache_ttl = 300  # seconds

    def _get_jwks(self):
        if not self.jwks or time.time() - self.jwks_last_refresh > self.jwks_cache_ttl:
            try:
                response = requests.get(self.jwks_url, timeout=5)
                response.raise_for_status()
                self.jwks = response.json()
                self.jwks_last_refresh = time.time()
                logger.info("[Keycloak] JWKS refreshed")
            except Exception as e:
                logger.error(f"[Keycloak] Failed to refresh JWKS: {e}")
                raise HTTPException(status_code=500, detail="Auth server error")

        return self.jwks

    def get_public_key(self, token: str):
        jwks = self._get_jwks()

        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                return key

        raise HTTPException(status_code=401, detail="Public key not found")
    
    def extract_roles(self, decoded_token: dict):
        realm_roles = decoded_token.get("realm_access", {}).get("roles", [])

        resource_roles = decoded_token.get("resource_access", {}) \
            .get(self.client_id, {}) \
            .get("roles", [])

        return list(set(realm_roles + resource_roles))

    def add_swagger_config(self, app):
        app.swagger_ui_init_oauth = {
            "clientId": self.client_id,
            "usePkceWithAuthorizationCodeGrant": True,
            "scopes": "openid profile email"
        }

    async def get_current_user(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> AuthenticatedUser:

        token = credentials.credentials

        try:
            key = self.get_public_key(token)

            decoded = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer,
                options={
                    "verify_exp": True,
                    "verify_aud": True,
                    "verify_iss": True,
                }
            )

            roles = self.extract_roles(decoded)

            user = AuthenticatedUser(
                username=decoded.get("preferred_username"),
                roles=roles,
                token=decoded
            )

            logger.info(f"[Keycloak] User: {user.username} Roles: {roles}")

            return user

        except JWTError as e:
            logger.error(f"[Keycloak] JWT validation failed: {str(e)}")

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        except Exception as e:
            logger.error(f"[Keycloak] Unexpected error: {str(e)}")

            raise HTTPException(
                status_code=500,
                detail="Authentication system error"
            )


keycloak_openid = KeycloakOpenID()
