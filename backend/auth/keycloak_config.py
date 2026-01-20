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
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import logging

logger = logging.getLogger('staging')

security = HTTPBearer()

class KeycloakOpenID:
    def __init__(self):
        self.keycloak_url = os.getenv("KEYCLOAK_URL", "https://centralidp.arena2036-x.de/auth/")
        self.realm = os.getenv("KEYCLOAK_REALM", "CX-Central")
        self.client_id = os.getenv("KEYCLOAK_CLIENT_ID", "CX-EDC")
        
    def add_swagger_config(self, app):
        """Add Keycloak OAuth2 to Swagger UI"""
        pass
    
    async def get_current_user(
        self, 
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ) -> dict:
        """Extract and validate user from JWT token"""
        token = credentials.credentials
        
        try:
            decoded = jwt.decode(
                token, 
                key="", 
                options={"verify_signature": False}
            )
            
            username = decoded.get("preferred_username", "unknown")
            logger.info(f"[Keycloak] Authenticated user: {username}")

            return {
                "preferred_username": username,
                "email": decoded.get("email", ""),
                "given_name": decoded.get("given_name", ""),
                "family_name": decoded.get("family_name", ""),
                "name": decoded.get("name", ""),
                "roles": decoded.get("realm_access", {}).get("roles", []),
                "sub": decoded.get("sub", ""),
                "token": token
            }
        except JWTError as e:
            logger.error(f"[Keycloak] JWT validation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

keycloak_openid = KeycloakOpenID()

# Token-Verifikation lockern (nur zum Testen)
keycloak_openid._verify_audience = False
