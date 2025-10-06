from fastapi import Request
import logging
from jose import jwt, JWTError

logger = logging.getLogger('staging')


class AuthManager:
    def __init__(self, api_key_header: str = "X-Api-Key", 
                 configured_api_key: str = "password", 
                 auth_enabled: bool = False):
        self.api_key_header = api_key_header
        self.configured_api_key = configured_api_key
        self.auth_enabled = auth_enabled
        logger.info(f"[AuthManager] Initialized (enabled: {auth_enabled})")

    def is_authenticated(self, request: Request) -> bool:
        if not self.auth_enabled:
            return True

        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            logger.warning("[AuthManager] No Authorization header provided")
            return False

        if not auth_header.startswith('Bearer '):
            logger.warning("[AuthManager] Invalid Authorization header format")
            return False

        token = auth_header.replace('Bearer ', '')
        
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            logger.info(f"[AuthManager] Token decoded successfully for user: {decoded.get('preferred_username', 'unknown')}")
            return True
        except JWTError as e:
            logger.warning(f"[AuthManager] Invalid JWT token: {str(e)}")
            return False

    def extract_bpn_from_request(self, request: Request) -> str:
        return request.headers.get('Edc-Bpn', 'unknown')
    
    def get_username_from_token(self, request: Request) -> str:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            try:
                decoded = jwt.decode(token, options={"verify_signature": False})
                return decoded.get('preferred_username', 'unknown')
            except JWTError:
                return 'unknown'
        return 'unknown'
