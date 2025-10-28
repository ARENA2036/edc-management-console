import requests
import logging
import yaml
from typing import Dict, Optional
from urllib.parse import urlparse


from models.connector import Connector
from utilities.common import parse_yaml

logger = logging.getLogger('staging')


class EdcManager:
    def __init__(self, cluster_config: dict, edc_config:dict, dataspace_config: dict):
        self.cluster_config = cluster_config
        self.default_url = edc_config.get("default_url", "")
        self.endpoints = edc_config.get("endpoints", {})
        self.helm_chart_directory = edc_config.get("helm_chart_directory", None)
        self.ssi_wallet_url = dataspace_config.get("ssi_wallet",{}).get("url", None)
        self.authority_id = dataspace_config.get("authority_id", "BPNL00000003CRHK")

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

    def add_edc(self, connector: Connector):
        try:
            if connector is None:
                logger.error(f"[EDC Manager] No edc configuration was found")
                return {"error": "[EDC Manager] No edc configuration was found"}
            wallet_hostname =urlparse(self.ssi_wallet_url).hostname
            connector.iatp_id = f"did:web:{wallet_hostname}:{connector.bpn}"
            connector.trustedIssuers = f"did:web:{wallet_hostname}:{self.authority_id}"
            connector.sts_dim_url = f"{self.ssi_wallet_url}/api/sts"
            connector.sts_oauth_tokenUrl = f"{self.ssi_wallet_url}/oauth/token"
            connector.sts_oauth_client_id = connector.bpn
            connector.sts_oauth_secretAlias = "edc-wallet-secret"
            connector.cp_bdrs_server_url = f"{self.ssi_wallet_url}/api/v1/directory"
            connector.cp_hostname = f"{connector.connector_name}-controlplane"
            connector.dp_hostname = f"{connector.connector_name}-dataplane"

            parse_yaml(connector=connector, helm_chart_dir=self.helm_chart_directory, action="install")

        except Exception as e:
            logger.error(f"[EDC Manager] It was not possible to do the POST request to the EDC! Reason: [{str(e)}]")
            return {"error": str(e)}

    def upgrade_edc(self, connector: Connector):
        try:
            if connector is None:
                logger.error(f"[EDC Manager] No edc configuration was found")
                return {"error": "[EDC Manager] No edc configuration was found"}
            wallet_hostname =urlparse(self.ssi_wallet_url).hostname
            connector.iatp_id = f"did:web:{wallet_hostname}:{connector.bpn}"
            connector.trustedIssuers = f"did:web:{wallet_hostname}:{self.authority_id}"
            connector.sts_dim_url = f"{self.ssi_wallet_url}/api/sts"
            connector.sts_oauth_tokenUrl = f"{self.ssi_wallet_url}/oauth/token"
            connector.sts_oauth_client_id = connector.bpn
            connector.sts_oauth_secretAlias = "edc-wallet-secret"
            connector.cp_bdrs_server_url = f"{self.ssi_wallet_url}/api/v1/directory"
            connector.cp_hostname = f"{connector.connector_name}-controlplane"
            connector.dp_hostname = f"{connector.connector_name}-dataplane"

            parse_yaml(connector=connector, helm_chart_dir=self.helm_chart_directory, action="upgrade")

        except Exception as e:
            logger.error(f"[EDC Manager] It was not possible to do the PUT request to the EDC! Reason: [{str(e)}]")
            return {"error": str(e)}


    def get_connectors(self):
        try:
            pass
        except Exception as e:
            logger.error(f"[EDC Manager] It was not possible to do the GET request to the EDC! Reason: [{str(e)}]")
            return {"error": str(e)}

    def get_connector_by_id(self, connector_id):
        try:
            pass
        except Exception as e:
            logger.error(f"[EDC Manager] It was not possible to do the GET request to the EDC! Reason: [{str(e)}]")
            return {"error": str(e)}

    def delete_edc(self, connector: Connector):
        try:
            pass
        except Exception as e:
            logger.error(f"[EDC Manager] It was not possible to do the DELETE request to the EDC! Reason: [{str(e)}]")
            return {"error": str(e)}

