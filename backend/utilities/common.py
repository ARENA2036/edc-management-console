import base64
import subprocess
import os
import urllib.parse
import requests
import yaml
from urllib import *
import logging

from models.connector import Connector
logger = logging.getLogger(__name__)

SUB_DIR = "charts/umbrella"
DEFAULT_VALUES_FILE = "values.yaml"

def ensure_kubectl_installed():
    try:
        subprocess.run("kubectl version --client", capture_output=True)
        print("kubectl is already installed.")
    except subprocess.CalledProcessError:
        print("Installing kubectl...")
        subprocess.run("curl -LO -s https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl")
        subprocess.run("chmod +x kubectl")
        subprocess.run("sudo mv kubectl /usr/local/bin/")
        subprocess.run("kubectl version --client")
        print("kubectl installed successfully.")

def switch_kubectl_context(context_name):
    subprocess.run(f"kubectl config use-context {context_name}")

def ensure_helm_installed():
    try:
        subprocess.run("helm version --client", capture_output=True)
        print("helm is already installed.")
    except subprocess.CalledProcessError:
        print("Installing kubectl...")
        #run_command("curl -LO -s https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl")
        #run_command("chmod +x kubectl")
        #run_command("sudo mv kubectl /usr/local/bin/")
        #run_command("helm version --client")
        print("kubectl installed successfully.")

def update_helm_dependencies():
    os.chdir(f"../{SUB_DIR}")
    print(f"Working directory: {os.getcwd()}")
    subprocess.run("helm dependency update ../tx-data-provider")
    subprocess.run("helm dependency update")

def install_helm_chart(deployment_name:str, values_files:list, namespace:str):

    formatted_files = " ".join([" -f " + file for file in values_files])
    print(f"Installing helm chart with values from {values_files}...")
    subprocess.run(f"helm install {deployment_name}  {formatted_files} --namespace {namespace} --debug .")
    print(f"Install helm chart successful...")


def upgrade_helm_chart(deployment_name:str, values_files:list, namespace:str):

    formatted_files = " ".join([" -f " + file for file in values_files])
    print(f"Upgrading helm chart with values from {values_files}...")
    subprocess.run(f"helm upgrade -i {deployment_name} {formatted_files} --namespace {namespace} --debug .")
    print(f"Upgrade helm chart successful...")

def parse_yaml(connector: Connector,
               helm_chart_dir:str,
               action="install",
               files_config: dict = {},
               is_registry_enabled: bool = False,
               is_submodel_enabled: bool = False
               ):
    # try:
    if helm_chart_dir is None:
        return {"error": "EDC helm chart directory was not specified [ADD EDC]"}
    print(connector.version)
    version_no = int(connector.version.split('.')[1])
    if version_no == 9:
        full_path = helm_chart_dir + files_config.get("values", {}).get("v9")
    elif version_no == 10:
        full_path = helm_chart_dir + files_config.get("values", {}).get("v10")
    elif version_no == 11:
        full_path = helm_chart_dir + files_config.get("values", {}).get("v11")

    # Step 1: Open and parse the existing YAML file
    with open(os.path.abspath(full_path), "r") as file:
        data = yaml.safe_load(file)

    if is_submodel_enabled:
        data.setdefault("simple-data-backend", {})["enabled"] = True
        data.setdefault("simple-data-backend", {})["fullnameOverride"] = f"{connector.name}-submodelserver"
        data['simple-data-backend']['ingress']['hosts'][0]['host'] = connector.submodel.url
        data['simple-data-backend']['ingress']['tls'][0]['hosts'][0] = connector.submodel.url

    if is_registry_enabled:
        # update dtr details in value file
        data.setdefault("digital-twin-registry", {})["enabled"] = True
        data['digital-twin-registry']['enableKeycloak'] = True
        data['digital-twin-registry']['enablePostgres'] = True
        data.setdefault("digital-twin-registry", {})["fullnameOverride"] = f"{connector.name}-dtr"

        data['digital-twin-registry']['keycloak']['fullnameOverride'] = f"{connector.name}-keycloak"
        data['digital-twin-registry']['keycloak']['externalDatabase']['existingSecret'] = f"{connector.name}-keycloak-database-credentials"
        data['digital-twin-registry']['registry']['fullnameOveride'] = f"{connector.name}-registry"
        data['digital-twin-registry']['registry']['ingress']['hosts'][0]['host'] = connector.registry.url
        data['digital-twin-registry']['registry']['host'] = connector.registry.url

        if version_no == 9:
            data['digital-twin-registry']['registry']['ingress']['tls'][0]['hosts'][0] = connector.registry.url
        elif version_no == 10:
            data['digital-twin-registry']['registry']['ingress']['tls']['enabled'] = True
    # # Step 2: Append or update values
    # # Example: updating participant.id
    data.setdefault("participant", {})["id"] = urllib.parse.quote_plus(f"{connector.bpn}")
    data.setdefault("iatp", {})["id"] = f"{connector.iatp_id}"
    data.setdefault("iatp", {})["trustedIssuers"][0] = f"{connector.trustedIssuers}"
    data.setdefault("iatp", {})["sts"]["dim"]["url"] = f"{connector.sts_dim_url}"
    data.setdefault("iatp", {}).setdefault("sts", {}).setdefault("dim",{})["url"] = connector.sts_dim_url
    data.setdefault("iatp", {}).setdefault("sts", {}).setdefault("oauth",{})["token_url"] = connector.sts_oauth_tokenUrl
    data.setdefault("iatp", {}).setdefault("sts", {}).setdefault("oauth",{}).setdefault("client",{})["id"] = connector.sts_oauth_client_id
    data.setdefault("iatp", {}).setdefault("sts", {}).setdefault("oauth",{}).setdefault("client",{})["secret_alias"] = connector.sts_oauth_secretAlias

    data.setdefault("controlplane", {}).setdefault("bdrs", {}).setdefault("server",{})["url"] = connector.cp_bdrs_server_url
    data.setdefault("controlplane", {}).setdefault("ingresses", {})[0]["hostname"] = connector.cp_hostname
    #data.setdefault("controlplane", {}).setdefault("ingresses", {})[1]["hostname"] = f"ax-{connector.cp_hostname}"
    data.setdefault("dataplane", {}).setdefault("ingresses", {})[0]["hostname"] = connector.dp_hostname

    data.setdefault("postgresql", {}).setdefault("auth", {})["database"] = connector.db_name
    data.setdefault("postgresql", {}).setdefault("auth", {})["username"] = connector.db_username
    data.setdefault("postgresql", {}).setdefault("auth", {})["password"] = connector.db_password

    # Save updated YAML
    file_path = f"{helm_chart_dir}/{connector.name}_values_{version_no}.yaml"
    # full_path = os.path.abspath(file_path)
    with open(file_path, "w") as file:
        yaml.dump(data, file, sort_keys=False)

    return f"{connector.name}_values_{version_no}.yaml"
    # except Exception as e:
    #     logging.error(f"It was not possible to do the POST request to the EDC! Reason: [{str(e)}]")
    #     return {"error": str(e)}


def delete_file(file_path):
    try:
        # Check if the file exists before attempting to delete it
        if os.path.exists(file_path):
            os.remove(file_path)
            logging.debug(f"{file_path} has been deleted successfully.")
    except Exception as e:
        logging.error(f"It was not possible to delete a file! Reason: [{str(e)}]")
        return {"error": str(e)}
