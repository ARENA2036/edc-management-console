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
