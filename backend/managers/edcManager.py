import requests
import logging
from typing import Dict, Optional

logger = logging.getLogger('staging')


class EdcManager:
    def __init__(self, edc_config: dict):
        self.edc_config = edc_config
        self.default_url = edc_config.get("default_url", "")
        self.endpoints = edc_config.get("endpoints", {})
        logger.info(f"[EdcManager] Initialized with default URL: {self.default_url}")

    def check_health(self, connector_url: Optional[str] = None) -> Dict:
        url = connector_url or self.default_url
        liveness_endpoint = url + self.endpoints.get("liveness", "/api/check/liveness")
        readiness_endpoint = url + self.endpoints.get("readiness", "/api/check/readiness")

        result = {
            "url": url,
            "liveness": "unknown",
            "readiness": "unknown",
            "healthy": False
        }

        try:
            liveness_response = requests.get(liveness_endpoint, timeout=5, verify=False)
            result["liveness"] = "healthy" if liveness_response.status_code == 200 else "unhealthy"
        except Exception as e:
            logger.error(f"[EdcManager] Liveness check failed: {str(e)}")
            result["liveness"] = "unhealthy"

        try:
            readiness_response = requests.get(readiness_endpoint, timeout=5, verify=False)
            result["readiness"] = "ready" if readiness_response.status_code == 200 else "not ready"
        except Exception as e:
            logger.error(f"[EdcManager] Readiness check failed: {str(e)}")
            result["readiness"] = "not ready"

        result["healthy"] = result["liveness"] == "healthy" and result["readiness"] == "ready"
        return result

    def get_assets(self, connector_url: Optional[str] = None) -> Dict:
        url = connector_url or self.default_url
        assets_endpoint = url + self.endpoints.get("assets", "/v3/assets")
        
        try:
            response = requests.get(assets_endpoint, timeout=10, verify=False)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"[EdcManager] Failed to get assets: {str(e)}")
            return {"error": str(e)}

    def get_policies(self, connector_url: Optional[str] = None) -> Dict:
        url = connector_url or self.default_url
        policies_endpoint = url + self.endpoints.get("policies", "/v3/policydefinitions")
        
        try:
            response = requests.get(policies_endpoint, timeout=10, verify=False)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"[EdcManager] Failed to get policies: {str(e)}")
            return {"error": str(e)}

    def get_contracts(self, connector_url: Optional[str] = None) -> Dict:
        url = connector_url or self.default_url
        contracts_endpoint = url + self.endpoints.get("contracts", "/v3/contractdefinitions")
        
        try:
            response = requests.get(contracts_endpoint, timeout=10, verify=False)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"[EdcManager] Failed to get contracts: {str(e)}")
            return {"error": str(e)}
