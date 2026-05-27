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
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
import jwt
from jwt import PyJWKClient, InvalidTokenError

from auth.models import AuthenticatedUser

load_dotenv()

logger = logging.getLogger("staging")
security = HTTPBearer(auto_error=False)


class KeycloakOpenID:
    def __init__(self):
        self.keycloak_url = os.getenv("KEYCLOAK_URL")
        self.realm = os.getenv("KEYCLOAK_REALM")
        self.client_id = os.getenv("KEYCLOAK_CLIENT_ID")

        if not all([self.keycloak_url, self.realm, self.client_id]):
            raise RuntimeError("Missing Keycloak configuration")

        self.issuer = f"{self.keycloak_url}/realms/{self.realm}"
        self.jwks_url = f"{self.issuer}/protocol/openid-connect/certs"

        self.jwk_client = PyJWKClient(self.jwks_url)

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
            signing_key = self.jwk_client.get_signing_key_from_jwt(token)

            decoded = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer,
                options={
                    "verify_signature": True,
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

        except InvalidTokenError as e:
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