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
import argparse
import logging.config
import yaml
import urllib3
import uvicorn
import uuid
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware

from auth.keycloak_config import keycloak_openid

from models.connector import Connector
from models.database import ConnectorDB
from tractusx_sdk.dataspace.managers import AuthManager
from tractusx_sdk.dataspace.managers import OAuth2Manager
from managers.edcManager import EdcManager
from managers.databaseManager import DatabaseManager
from service.edcService import EdcService
from utilities.httpUtils import HttpUtils
from utilities.operators import op
from utilities.auth_utils import get_oauth2_token

op.make_dir("logs")

idpManager: OAuth2Manager
authManager: AuthManager
edcManager: EdcManager
edcService: EdcService
databaseManager: DatabaseManager

urllib3.disable_warnings()
logging.captureWarnings(True)
logger = logging.getLogger(__name__)
# ------------------------------------------------------------
# Logging Setup
# ------------------------------------------------------------
#logging.basicConfig(level=logging.INFO)
#logger = logging.getLogger("CX-EMC")

with open('./config/logging.yml', 'rt') as f:
    # Read the yaml configuration
    log_config = yaml.safe_load(f.read())
    # Set logging filename with datetime
    date = op.get_filedate()
    op.make_dir("logs/" + date)
    log_config["handlers"]["file"]["filename"] = f'logs/{date}/{op.get_filedatetime()}-emc.log'
    logging.config.dictConfig(log_config)

logger = logging.getLogger(__name__)

# Load the configuration for the application
with open('./config/configuration.yml', 'rt') as f:
    # Read the yaml configuration
    app_configuration = yaml.safe_load(f.read())

# ------------------------------------------------------------
# Load Config
# ------------------------------------------------------------
with open("config/settings.yaml", "r") as f:
    settings = yaml.safe_load(f)

# ------------------------------------------------------------
# FastAPI Setup
# ------------------------------------------------------------
app = FastAPI(title="EMC Backend")
keycloak_openid.add_swagger_config(app)
logger.info("[INIT] Starting EMC Backend...")

# ------------------------------------------------------------
# Initialize Managers
# ------------------------------------------------------------

# init_db()
# init_edc(settings)
# init_activity()

logger.info("[INIT] All managers initialized successfully!")

# ------------------------------------------------------------
# API ROUTES
# ------------------------------------------------------------

@app.get("/health")
def get_health():
    """
    Retrieves health information from the server

    Returns:
        response: :obj:`status, timestamp`
    """
    return HttpUtils.response({
        "message": "EDC Management Console Backend",
        "status": "RUNNING",
        "timestamp": op.timestamp()
    })

@app.get("/api/connectors", tags=["EDC"])
async def list_connectors(request: Request):
    """
    Retrieves list of connectors the user is allowed to see

    Returns:
        response: :obj:`data object with the list of connectors`
    """
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        existingDeployments = databaseManager.get_all_connectors()
        connectorMap: dict = {}
        json_list: list = []
        for cnctor in existingDeployments:
            connectorMap[cnctor.name] = cnctor
            status = edcManager.check_health('https://' + cnctor.cp_hostname)
            logger.info("Health check status %s", status)
            cnctor.status = "healthy" if status.get("healthy", False) else "unhealthy"
            databaseManager.update_connector(cnctor)
            
            url_list = []
            for endpoint in app_configuration.get("edc", {}).get("endpoints", {}).keys():
                url_list.append(
                    'https://' + cnctor.cp_hostname + app_configuration.get("edc", {}).get("endpoints", {}).get(endpoint)
                )
            if len(cnctor.registry) != 0:
                url_list.append(f'https://{cnctor.registry}/semantics/registry/')
            if len(cnctor.submodel) != 0:
                url_list.append(f'https://{cnctor.submodel}/')

            connector_dict = cnctor.to_dict()
            connector_dict["urls"] = url_list
            logger.info("Fetching all connectors %s", connector_dict)
            json_list.append(
                connector_dict
            )

        return HttpUtils.response(
            status=200,
            data=json_list
        )
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.get("/api/connectors/{connector_id}", tags=["EDC"])
async def get_connector(connector_id: int, user=Depends(keycloak_openid.get_current_user)):
    try:
        connector = databaseManager.get_connector_by_id(connector_id)
        if not connector:
            return HttpUtils.get_error_response(status=404, message="Connector not found")
        return {
            "user": user["preferred_username"],
            "data": connector.to_dict()
        }
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.post("/api/connector", tags=["EDC"])
async def add_connector(connector: Connector, request: Request):
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        #Check if the user has more than 2 edcs already deployed, maybe create another endpoint for user check
        #We can then call the endpoint when the user clicks on the DeployEDC button itself.
        logger.info(connector)
        is_registry_enabled = len(connector.registry.url) != 0
        is_submodel_enabled = len(connector.submodel.url) != 0
       
        existingDeployments = edcService.get_connector_by_name(
            connector_name=connector.name,
            namespace=app_configuration.get("clusterConfig",{}).get("namespace", None)
        )
        if existingDeployments.get("status_code") != 200:
            # set edc helm chart directory
            value_file_name = edcManager.add_edc(
                connector, 
                is_registry_enabled=is_registry_enabled,
                is_submodel_enabled=is_submodel_enabled
            )
            response: dict = edcService.install_helm_chart(deployment_name=connector.name,
                                                           values_files=[value_file_name],
                                                           namespace=app_configuration.get("clusterConfig",{}).get("namespace", None)
                                                        )
            if (response.get("status_code", 0) != 200):
                raise Exception(response.get("data",{}).split('Error')[1])

        connector_db = databaseManager.get_connector_by_name(connector.name)
        if connector_db is None:
            logger.info(f"Entry not found in database, creating entry for {connector.name}")

            # dtr_db = DigitalTwinRegistryDB(
            #     url=connector.registry.url,
            #     credentials=connector.registry.credentials
            # )

            # submodel_db = SubModelServerDB(
            #     url=connector.submodel.url,
            #     credentials=connector.submodel.credentials
            # )
            connector_db = ConnectorDB(
                id=str(uuid.uuid4()),
                name=connector.name,
                bpn=connector.bpn,
                url = connector.url,
                version = connector.version,
                namespace = app_configuration.get("clusterConfig", {}).get("namespace", None),
                status = "unhealthy",
                cp_hostname = connector.name + '-' + app_configuration.get("edc", {}).get("hostname", {}).get("cp"),
                dp_hostname = connector.name + '-' + app_configuration.get("edc", {}).get("hostname", {}).get("dp"),
                db_name = 'edc',
                db_username = connector.db_username,
                db_password = connector.db_password,
                registry=connector.registry.url,
                submodel=connector.submodel.url
            )
            connector_db = databaseManager.create_connector(connector=connector_db)

        return HttpUtils.response(
            status=200,
            data=connector_db.to_dict()
        )

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.put("/api/connectors/{connector_id}", tags=["EDC"])
async def upgrade_connector(connector_id: str, connector: Connector, request: Request):
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        # set edc helm chart directory
        edcManager.upgrade_edc(connector)
        ##edcService = EdcService(helm_chart_directory=app_configuration.get("edc",{}).get("helm_chart_directory", None))
        response:dict = edcService.upgrade_helm_chart(deployment_name=connector.connector_name, values_files=["upgrade_values.yaml"],namespace=app_configuration.get("clusterConfig",{}).get("namespace", None))
        if (response.get("status_code", 0) != 200):
            raise Exception(response.get("data",{}).split('Error')[1])
        data: dict = response.get("data", {}).split("\n")

        return HttpUtils.response(
            status=200,
            message=str(data[0]),
            data={
                "id": str(uuid.uuid4()),
                "Name": str(data[1].split()[1]),
                "Namespace": str(data[3].split()[1]),
                "Status": str(data[4].split()[1]),
                "Revision": str(data[5].split()[1])
            })

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.delete("/api/connectors/{connector_name}", tags=["EDC"])
async def delete_connector(connector_name: str, request: Request):

    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        connector = databaseManager.get_connector_by_name(name=connector_name)

        response:dict = edcService.uninstall_helm_chart(connector_id=connector.name, namespace=app_configuration.get("clusterConfig",{}).get("namespace", None))
        if (response.get("status_code", 0) != 200):
            raise Exception(response.get("data",{}).split('Error')[1])

        databaseManager.delete_connector(connector_id=connector.id)

        return HttpUtils.response(
            status=200,
            message=str(response.get("data", {})))

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))


@app.post("/api/submodel", tags=["Submodel"])
async def add_submodel_service(data: dict, user=Depends(keycloak_openid.get_current_user)):
    """Deploy a submodel service independently"""
    try:
        url = data.get("url")
        service_type = data.get("type", "submodel-service")

        auth_config = {
            "authType": data.get("submodelAuthType", "none"),
            "apiKey": data.get("submodelApiKey"),
            "bearerToken": data.get("submodelBearerToken"),
            "oauth2": {
                "accessTokenUrl": data.get("submodelOAuthAccessTokenUrl"),
                "clientId": data.get("submodelOAuthClientId"),
                "clientSecret": data.get("submodelOAuthClientSecret"),
                "scope": data.get("submodelOAuthScope"),
                "clientAuth": data.get("submodelOAuthClientAuth")
            }
        }

        if not url:
            return HttpUtils.get_error_response(status=400, message="URL is required")

        database_manager.log_activity(
            action="DEPLOY_SUBMODEL",
            details=f"Submodel service deployed by {user['preferred_username']}: {url} | Auth: {auth_config['authType']}",
            status="success"
        )

        return {
            "message": f"Submodel service deployed by {user['preferred_username']}",
            "data": {
                "url": url,
                "type": service_type,
                "auth": auth_config,
                "status": "deployed"
            }
        }
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.post("/api/submodel/{submodel_service_id}", tags=["Submodel"])
async def add_existing_submodel_service(data: dict, user=Depends(keycloak_openid.get_current_user)):
    """Register a submodel service independently"""
    try:
        url = data.get("url")
        bpn = data.get("bpn")
        auth_type = data.get("authType", "none")

        headers = {"Content-Type": "application/json"}

        if auth_type == "apiKey":
            headers["X-API-Key"] = data.get("apiKey")
        elif auth_type == "bearer":
            headers["Authorization"] = f"Bearer {data.get('bearerToken')}"
        elif auth_type == "oauth2":
            oauth_config = {
                "accessTokenUrl": data.get("submodelOAuthAccessTokenUrl"),
                "clientId": data.get("submodelOAuthClientId"),
                "clientSecret": data.get("submodelOAuthClientSecret"),
                "scope": data.get("submodelOAuthScope", "openid"),
                "clientAuth": data.get("submodelOAuthClientAuth", "basic")
            }
            token = get_oauth2_token(oauth_config)
            headers["Authorization"] = f"Bearer {token}"

        if not url or not bpn:
            return HttpUtils.get_error_response(status=400, message="URL and BPN are required")

        import requests
        health_url = f"{url.rstrip('/')}/api/health"
        try:
            check = requests.get(health_url, headers=headers, timeout=5)
            reachable = check.status_code == 200
        except Exception:
            reachable = False

        database_manager.log_activity(
            action="CONNECT_SUBMODEL",
            details=f"Existing submodel service connected by {user['preferred_username']}: {url} (BPN: {bpn})",
            status="success" if reachable else "warning"
        )


        return {
            "message": f"Submodel service connected by {user['preferred_username']}",
            "data": {
                "url": url,
                "bpn": bpn,
                "reachable": reachable,
                "status": "connected" if reachable else "unreachable"
            }
        }

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

# @app.get("/api/logs", tags=["Logs"])
# async def get_activity(limit: int = 20, user=Depends(keycloak_openid.get_current_user)):
#     try:
#         logs = activity_manager.get_recent_logs(limit)
#         return {
#             "user": user["preferred_username"],
#             "data": logs
#         }
#     except Exception as e:
#         logger.exception(str(e))
#         return HttpUtils.get_error_response(status=500, message=str(e))

@app.get("/api/config", tags=["Config"])
async def get_config(user=Depends(keycloak_openid.get_current_user)):
    return {
        "user": user["preferred_username"],
        "data": settings
    }

@app.get("/api/dataspace", tags=["Dataspace"])
async def get_dataspace_settings(request: Request):
    """
    Retrieves dataspace specific configurations from the configuration file

    Returns:
        response: :obj:`data object with the dataspace settings`
    """
    try:
        dataspace_config = app_configuration.get("dataspaceConfig", {})
        edc_config = app_configuration.get("edc", {})

        dataspace_name = dataspace_config.get("name", "ARENA2036-X")
        bpn = dataspace_config.get("authority_id", "BPNL000000000000")

        dataspace_settings = {
            "name": dataspace_name,
            "bpn": bpn,
            "realm": dataspace_config.get("name", "CX-Central"),
            "username": dataspace_config.get("preferred_username", "user"),
            "centralidp": {
                "url": dataspace_config.get("centralidp", {}).get("url", ""),
                "realm": dataspace_config.get("centralidp", {}).get("realm", "")
            },
            "ssi_wallet": {
                "url": dataspace_config.get("ssi_wallet", {}).get("url", ""),
            },
            "portal": {
                "url": dataspace_config.get("portal", {}).get("url", "")
            },
            "discovery": {
                "semantics_url": dataspace_config.get("discovery", {}).get("semantics", {}).get("url", ""),
                "discovery_finder": dataspace_config.get("discovery", {}).get("discoveryFinder", {}).get("endpoint", ""),
                "bpn_discovery": dataspace_config.get("discovery", {}).get("bpnDiscovery", {}).get("endpoint", "")
            },
            "edc": {
                "default_url": edc_config.get("default_url", ""),
                "cluster_context": app_configuration.get("clusterConfig", {}).get("context", "")
            },
            "readonly": True
        }
        logger.info("%s", dataspace_settings)

        return {
            "user": dataspace_config.get("preferred_username", "user"),
            "data": dataspace_settings
        }
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))


def init_app(host: str, port: int, log_level: str = "info"):
    global app, app_configuration, edcService, edcManager, edcDiscoveryService, discoveryFinderService, authManager, databaseManager

    ## API Key Authorization
    authManager = AuthManager()
    auth_config: dict = app_configuration.get("authorization", {"enabled": False})
    auth_enabled: bool = auth_config.get("enabled", False)

    if auth_enabled:
        api_key: dict = auth_config.get("apiKey", {"key": "X-Api-Key", "value": "password"})
        authManager = AuthManager(api_key_header=api_key.get("key", "X-Api-Key"),
                                configured_api_key=api_key.get("value", "password"), auth_enabled=True)

    edcService = EdcService(helm_chart_directory=app_configuration.get("edc",{}).get("helm_chart_directory", None))

    ## Get environment specific configurations
    cluster_config: dict = app_configuration["clusterConfig"]
    file_config: dict = app_configuration["files"]
    edc_config: dict = app_configuration.get("edc", {})
    logger.info(edc_config)
    edcManager = EdcManager(
        cluster_config=cluster_config,
        edc_config=edc_config,
        dataspace_config=app_configuration.get("dataspaceConfig",{}),
        files_config=file_config
    )

    ## Initialize database manager
    databaseManager = DatabaseManager(database_url="sqlite:///edc_manager.db")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_methods=['*'],
        allow_headers=['*']
    )

    uvicorn.run(app, host=host, port=port, log_level=log_level)

    logger.info("[INIT] Application Startup Initialization Completed!")
    logger.info("✅ EMC backend configured and ready on port 8001.")



def get_arguments():
    """
    Commandline argument handling. Return the populated namespace.

    Returns:
        args: :func:`parser.parse_args`
    """

    parser = argparse.ArgumentParser()

    parser.add_argument("--port", default=8001,
                        help="The server port where it will be available", required=False, type=int)

    parser.add_argument("--host", default="localhost",
                        help="The server host where it will be available", required=False, type=str)

    parser.add_argument("--debug", default=False, action="store_false", \
                        help="Enable and disable the debug", required=False)

    args = parser.parse_args()
    return args


if __name__ == "__main__":

    print("  _____ __  __  ____   ____             _                  _ ")
    print(" | ____|  \\/  |/ ___| | __ )  __ _  ___| | _____ _ __   __| |")
    print(" |  _| | |\\/| | |     |  _ \\ / _` |/ __| |/ / _ \\ '_ \\ / _` |")
    print(" | |___| |  | | |___  | |_) | (_| | (__|   <  __/ | | | (_| |")
    print(" |_____|_|  |_|\\____| |____/ \\__,_|\\___|_|\\_\\___|_| |_|\\__,_|")
    print("                                                             ")

    print("Application starting, listening to requests...\n")

    # Initialize the server environment and get the comand line arguments
    args = get_arguments()
    # Configure the logging confiuration depending on the configuration stated
    logger = logging.getLogger('staging')
    if args.debug:
        logger = logging.getLogger('development')

    # Init application
    init_app(host=args.host, port=args.port, log_level=("debug" if args.debug else "info"))

    print("\nClosing the application... Thank you for using the EDC Management Console (EMC)!")
