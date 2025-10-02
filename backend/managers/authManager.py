from fastapi import Request
import logging

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

        api_key = request.headers.get(self.api_key_header)
        
        if not api_key:
            logger.warning("[AuthManager] No API key provided in request")
            return False

        if api_key != self.configured_api_key:
            logger.warning("[AuthManager] Invalid API key provided")
            return False

        return True

    def extract_bpn_from_request(self, request: Request) -> str:
        return request.headers.get('Edc-Bpn', 'unknown')
