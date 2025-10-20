import requests
import logging
from typing import Dict, Optional, List

logger = logging.getLogger('staging')


class EdcService:
    def __init__(self, config: dict):
        self.config = config
        self.default_url = config.get("default_url", "")
        self.endpoints = config.get("endpoints", {})
        logger.info("[EdcService] Initialized")

    def check_connection(self) -> bool:
        try:
            liveness_url = self.default_url + self.endpoints.get("liveness", "/api/check/liveness")
            response = requests.get(liveness_url, timeout=5, verify=False)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"[EdcService] Connection check failed: {str(e)}")
            return False

    def do_get(self, counter_party_id: str, counter_party_address: str, 
               dct_type: Optional[str], path: str, 
               policies: Optional[List[str]] = None, 
               headers: Optional[Dict] = None):
        logger.info(f"[EdcService] Performing GET request to {counter_party_address}{path}")
        try:
            url = f"{counter_party_address}{path}"
            response = requests.get(url, headers=headers or {}, timeout=30, verify=False)
            return response
        except Exception as e:
            logger.error(f"[EdcService] GET request failed: {str(e)}")
            raise

    def do_post(self, counter_party_id: str, counter_party_address: str, 
                dct_type: Optional[str], path: str, 
                body: Optional[Dict] = None,
                policies: Optional[List[str]] = None, 
                headers: Optional[Dict] = None,
                content_type: str = "application/json"):
        logger.info(f"[EdcService] Performing POST request to {counter_party_address}{path}")
        try:
            url = f"{counter_party_address}{path}"
            if headers is None:
                headers = {}
            headers["Content-Type"] = content_type
            response = requests.post(url, json=body, headers=headers, timeout=30, verify=False)
            return response
        except Exception as e:
            logger.error(f"[EdcService] POST request failed: {str(e)}")
            raise
