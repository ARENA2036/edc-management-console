import requests
import logging
import os
import json
import subprocess
import yaml
from typing import Dict, Optional, List
from utilities import httpUtils
from utilities.common import delete_file

logger = logging.getLogger(__name__)

SUB_DIR = "charts/umbrella"
DEFAULT_VALUES_FILE = "values.yaml"


class EdcService:
    def __init__(self, helm_chart_directory="./tractusx-connector"):
       self.helm_directory = helm_chart_directory
       self.ensure_kubectl_installed()
       self.ensure_helm_installed()
       self.update_helm_dependencies()

    def ensure_kubectl_installed(self):
        try:
            subprocess.run("kubectl version --client", shell=True, capture_output=True)
            print("kubectl is already installed.")
        except subprocess.CalledProcessError:
            print("Installing kubectl...")
            subprocess.run("curl -LO -s https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl")
            subprocess.run("chmod +x kubectl")
            subprocess.run("sudo mv kubectl /usr/local/bin/")
            subprocess.run("kubectl version --client")
            print("kubectl installed successfully.")

    def switch_kubectl_context(self, context_name):
        subprocess.run(f"kubectl config use-context {context_name}", shell=True)

    def ensure_helm_installed(self):
        try:
            subprocess.run("helm version --client", shell=True, capture_output=True)
            print("helm is already installed.")
        except subprocess.CalledProcessError:
            print("Installing kubectl...")
            # subprocess.run("curl -LO -s https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl")
            # subprocess.run("chmod +x kubectl")
            # subprocess.run("sudo mv kubectl /usr/local/bin/")
            # subprocess.run("helm version --client")
            print("kubectl installed successfully.")

    def update_helm_dependencies(self):
        os.chdir(f"{self.helm_directory}")
        print(f"Working directory: {os.getcwd()}")
        subprocess.run("helm dependency update", shell=True)
        os.chdir("..")

    def install_helm_chart(self, deployment_name:str, values_files:list, namespace:str):
        try:
            self.update_helm_dependencies()
            os.chdir(f"{self.helm_directory}")
            formatted_files = " ".join([" -f " + file for file in values_files])
            print(f"Installing helm chart with values from {values_files}...")
            result = subprocess.run(f"helm install {deployment_name} \
            {formatted_files} --namespace {namespace} --set log4j2.config=\"default log4j2 config placeholder\" --create-namespace --debug .", shell=True, capture_output=True, text=True)
            if (result.returncode !=0):
                logger.error(f"[EdcService] It was not possible to install EDC, return code: {str(result.returncode)}")
                return {"status_code": 500, "data": result.stderr}
            logger.info(f"stdout: {result.stdout}")
            logger.debug(f"stderr: {result.stderr}")

            # delete a file(s) after the installation
            # [ delete_file(f"{os.getcwd()}/{file}") for file in values_files ]
            os.chdir("..")
            return {"status_code": 200, "data": result.stdout}

        except subprocess.CalledProcessError as err:
            logger.error(f"[EdcService] error occurred in install EDC: {str(err.stderr)}")
            return {"status_code": 500, "data": err}
        except Exception as e:
            logger.error(f"[EdcService] Install EDC failed: {str(e)}")
            return {"status_code": 500, "data": e}


    def upgrade_helm_chart(self, deployment_name:str, values_files:list, namespace:str):

        try:
            formatted_files = " ".join([" -f " + file for file in values_files])
            print(f"Upgrading helm chart with values from {values_files}...")
            result = subprocess.run(f"helm upgrade -i {deployment_name}  {formatted_files} --namespace {namespace} --debug .", shell=True, capture_output=True, text=True)
            if (result.returncode !=0):
                logger.error(f"[EdcService] It was not possible to upgrade EDC, return code: {str(result.returncode)}")
                return {"status_code": 500, "data": result.stderr}
            logger.info(f"stdout: {result.stdout}")
            logger.debug(f"stderr: {result.stdout}")
            logger.info(f"Upgrade EDC successful...")

            # delete a file(s) after the installation
            [ delete_file(f"{os.getcwd()}/{file}") for file in values_files ]
            return {"status_code": 200, "data": result.stdout}

        except subprocess.CalledProcessError as err:
            logger.error(f"[EdcService] Internal Server error occurred in upgrade EDC: {str(err.stderr)}")
            return {"status_code": 500, "data": err}
        except Exception as e:
            logger.error(f"[EdcService] Internal Server error, Upgrade EDC failed: {str(e)}")
            return {"status_code": 500, "data": e}

    def get_all_connectors(self, namespace:str):
        try:
            result = subprocess.run(f"helm list --namespace {namespace}", shell=True, capture_output=True, text=True)
            if (result.returncode !=0):
                logger.error(f"[EdcService] It was not possible to get all EDCs, return code: {str(result.returncode)}")
                raise
            logger.info(f"stdout: {result.stdout}")
            logger.debug(f"stderr: {result.stdout}")
            return {"status_code": 200, "data": result.stdout}

        except Exception as e:
            logger.error(f"[EdcService] Internal Server error, list EDCs failed: {str(e)}")
            return {"status_code": 500, "data": e}

    def get_connector_by_name(self, namespace, connector_name):
        try:
            ## TODO: get connector_name by Id
            result = subprocess.run(f"helm list --namespace {namespace} | grep -i {connector_name}", shell=True, capture_output=True, text=True)
            if (result.returncode !=0):
                logger.error(f"[EdcService] It was not possible to get the EDC, return code: {str(result.returncode)}")
                raise
            logger.info(f"stdout: {result.stdout}")
            logger.debug(f"stderr: {result.stdout}")
            return {"status_code": 200, "data": result.stdout}

        except Exception as e:
            logger.error(f"[EdcService] Internal Server error, get the EDC failed: {str(e)}")
            return {"status_code": 500, "data": e}

    def uninstall_helm_chart(self, namespace, connector_id):
        try:
            ## TODO: get connector_name by Id
            connector_name = connector_id
            result = subprocess.run(f"helm uninstall {connector_name} --namespace {namespace}", shell=True, capture_output=True, text=True)
            if (result.returncode !=0):
                logger.error(f"[EdcService] It was not possible to delete the EDC, return code: {str(result.returncode)}")
                return {"status_code": 500, "data": result.stderr}
            logger.info(f"stdout: {result.stdout}")
            logger.debug(f"stderr: {result.stdout}")
            return {"status_code": 200, "data": result.stdout}

        except Exception as e:
            logger.error(f"[EdcService] Internal Server error, delete the EDC failed: {str(e)}")
            return {"status_code": 500, "data": e}

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
