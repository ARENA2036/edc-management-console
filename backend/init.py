<<<<<<< HEAD
# Set up imports configuration
import argparse
import logging.config
import yaml
import urllib3
import uvicorn
import uuid
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from managers import init_db, init_edc, init_activity
from auth.keycloak_config import keycloak_openid
from managers import database_manager, edc_manager, activity_manager
from managers import DatabaseManager, edc_manager, activity_manager
from models.requests import ConnectorCreate, ConnectorUpdate
from models.connector import Connector
from tractusx_sdk.dataspace.managers import AuthManager
from tractusx_sdk.dataspace.managers import OAuth2Manager
from managers.edcManager import EdcManager
=======
import argparse
import logging.config
import os
import sys
from io import BytesIO
import re

import requests
import urllib3
import uvicorn
import yaml
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from managers.authManager import AuthManager
from managers.edcManager import EdcManager
from managers.databaseManager import DatabaseManager
from models.requests import ConnectorCreate, ConnectorUpdate, EdcRequest, EdcPostRequest, Search, SearchProof
>>>>>>> f506ce7 (Add core backend and frontend structure for EDC connector management)
from service.edcService import EdcService
from utilities.httpUtils import HttpUtils
from utilities.operators import op

op.make_dir("logs")

<<<<<<< HEAD
idpManager: OAuth2Manager
authManager: AuthManager
edcManager: EdcManager
edcService: EdcService
=======
app_configuration: dict
log_config: dict
edcManager: EdcManager
edcService: EdcService
authManager: AuthManager
>>>>>>> f506ce7 (Add core backend and frontend structure for EDC connector management)
databaseManager: DatabaseManager

urllib3.disable_warnings()
logging.captureWarnings(True)

<<<<<<< HEAD
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
=======
with open('./config/logging.yml', 'rt') as f:
    log_config = yaml.safe_load(f.read())
    date = op.get_filedate()
    op.make_dir("logs/" + date)
    log_config["handlers"]["file"]["filename"] = f'logs/{date}/{op.get_filedatetime()}-edc-manager.log'
>>>>>>> f506ce7 (Add core backend and frontend structure for EDC connector management)
    logging.config.dictConfig(log_config)

logger = logging.getLogger('staging')

<<<<<<< HEAD
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
=======
with open('./config/configuration.yml', 'rt') as f:
    config_content = f.read()
    for match in re.finditer(r'\$\{(\w+)\}', config_content):
        env_var = match.group(1)
        env_value = os.getenv(env_var, '')
        config_content = config_content.replace(match.group(0), env_value)
    app_configuration = yaml.safe_load(config_content)

app = FastAPI(title="EDC Connector Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    logger.debug("[HEALTH CHECK] Retrieving positive health information!")
    return HttpUtils.response({
>>>>>>> f506ce7 (Add core backend and frontend structure for EDC connector management)
        "status": "RUNNING",
        "timestamp": op.timestamp()
    })

<<<<<<< HEAD
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

        ##edcService = EdcService()
        response: dict = edcService.get_all_connectors(namespace=app_configuration.get("clusterConfig",{}).get("namespace", None))
        if (response.get("status_code", 0) != 200):
            raise
        data: dict = response.get("data", {}).split("\n")
        if (len(data) == 2):
            return HttpUtils.response(
                status=200,
                data="[]",
                message="No EDCs found"
            )

        json_list: list = []
        for index, value in  enumerate(data):
            # skip the 0th index, its the header
            if (len(data) != (index+1)):
                formatted_response: dict = data[index+1].split("\t")
                if (formatted_response[0] != ""):
                    json_object: dict = {
                        "id": str(uuid.uuid4()),
                        "Name": str(formatted_response[0]).replace(' ',''),
                        "Namespace": str(formatted_response[1]).replace(' ',''),
                        "Revision": str(formatted_response[2]).replace(' ',''),
                        "Updated": str(formatted_response[3]).replace(' ',''),
                        "Status": str(formatted_response[4]).replace(' ',''),
                        "Chart": str(formatted_response[5]).replace(' ',''),
                        "App_Version": str(formatted_response[6]).replace(' ','')
                    }
                    json_list.append(json_object)


        return HttpUtils.response(
            status=200,
            data=json_list)

        # connectors = database_manager.get_all_connectors()
        # if connectors is not None:
        #     logger.info(f"Retrieving list of connectors...")
        #
        # return {
        #     "data": [conn.to_dict() for conn in connectors]
        # }
=======

@app.get("/api/config")
async def get_config(request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        return HttpUtils.response({
            "appConfig": app_configuration.get("appConfig", {}),
            "dataspaceConfig": app_configuration.get("dataspaceConfig", {}),
            "edc": {
                "endpoints": app_configuration.get("edc", {}).get("endpoints", {})
            }
        })
>>>>>>> f506ce7 (Add core backend and frontend structure for EDC connector management)
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

<<<<<<< HEAD
@app.get("/api/connectors/{connector_id}", tags=["EDC"])
async def get_connector(connector_id: int, user=Depends(keycloak_openid.get_current_user)):
    try:
        connector = database_manager.get_connector_by_id(connector_id)
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

        # set edc helm chart directory
        edcManager.add_edc(connector)
        #edcService = EdcService(helm_chart_directory=app_configuration.get("edc",{}).get("helm_chart_directory", None))
        response: dict = edcService.install_helm_chart(deployment_name=connector.connector_name, values_files=["install_values.yaml"],namespace=app_configuration.get("clusterConfig",{}).get("namespace", None))
        if (response.get("status_code", 0) != 200):
            raise Exception(response.get("data",{}).split('Error')[1])

        data: dict = response.get("data", {}).split("\n")
        connector_id = str(uuid.uuid4())

        # existing = database_manager.get_connector_by_name(connector.name)
        # if existing:
        #     return HttpUtils.get_error_response(status=400, message="Connector already exists")
        #
        # version = connector.config.get('version') if connector.config else None
        # new_connector = databaseManager.create_connector(
        #     id=1,
        #     name=connector.connector_name,
        #     url=connector.connector_url,
        #     bpn=connector.bpn,
        #     config={}
        #  )
        #
        # databaseManager.log_activity(
        #     action="CREATE_CONNECTOR",
        #     connector_id=new_connector.id,
        #     connector_name=new_connector.name,
        #     details=f"Connector created",
        #     status="success"
        # )

        return HttpUtils.response(
            status=200,
            data={
                "id": connector_id,
                "Name": str(data[0].split()[1]),
                "Namespace": str(data[2].split()[1]),
                "Status": str(data[3].split()[1]),
                "Revision": str(data[4].split()[1])
            })

        # return {
        #     "message": f"Connector created by {user['preferred_username']}",
        #     "data": new_connector.to_dict()
        # }
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

    #     updated = database_manager.update_connector(
    #         connector_id=connector_id,
    #         name=connector.name,
    #         url=connector.url,
    #         bpn=connector.bpn,
    #         config=connector.config
    #     )
    #
    #     if not updated:
    #         return HttpUtils.get_error_response(status=404, message="Connector not found")
    #
    #     database_manager.log_activity(
    #         action="UPDATE_CONNECTOR",
    #         connector_id=connector_id,
    #         connector_name=updated.name,
    #         details=f"Connector updated by {user['preferred_username']}",
    #         status="success"
    #     )
    #
    #     return {
    #         "message": f"Connector updated by {user['preferred_username']}",
    #         "data": updated.to_dict()
    #     }
    # except Exception as e:
    #     logger.exception(str(e))
    #     return HttpUtils.get_error_response(status=500, message=str(e))

@app.delete("/api/connectors/{connector_id}", tags=["EDC"])
async def delete_connector(connector_id: str, connector: Connector, request: Request):

    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        # set edc helm chart directory
        # edcManager.delete_edc(connector)
        response:dict = edcService.uninstall_helm_chart(connector_id=connector.connector_name, namespace=app_configuration.get("clusterConfig",{}).get("namespace", None))
        if (response.get("status_code", 0) != 200):
            raise Exception(response.get("data",{}).split('Error')[1])

        return HttpUtils.response(
            status=200,
            message=str(response.get("data", {})))

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))
        # try:
        #     connector = database_manager.get_connector_by_id(connector_id)
        #     if not connector:
        #         return HttpUtils.get_error_response(status=404, message="Connector not found")
        #
        #     success = database_manager.delete_connector(connector_id)
        #     if success:
        #         database_manager.log_activity(
        #             action="DELETE_CONNECTOR",
        #             connector_id=connector_id,
        #             connector_name=connector.name,
        #             details=f"Connector deleted by {user['preferred_username']}",
        #             status="success"
        #         )
        #         return {"message": f"Connector deleted by {user['preferred_username']}"}

        return HttpUtils.get_error_response(status=500, message="Failed to delete")
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.post("/api/submodel", tags=["Submodel"])
async def add_submodel_service(data: dict, user=Depends(keycloak_openid.get_current_user)):
    """Deploy a submodel service independently"""
    try:
        url = data.get("url")
        api_key = data.get("apiKey")
        service_type = data.get("type", "submodel-service")

        if not url:
            return HttpUtils.get_error_response(status=400, message="URL is required")

        database_manager.log_activity(
            action="DEPLOY_SUBMODEL",
            details=f"Submodel service deployed by {user['preferred_username']}: {url}",
            status="success"
        )

        return {
            "message": f"Submodel service deployed by {user['preferred_username']}",
            "data": {
                "url": url,
                "type": service_type,
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

        if not url or not bpn:
            return HttpUtils.get_error_response(status=400, message="URL and BPN are required")

        database_manager.log_activity(
            action="REGISTER_SUBMODEL",
            details=f"Submodel service registered by {user['preferred_username']}: {url} (BPN: {bpn})",
            status="success"
        )

        return {
            "message": f"Submodel service registered by {user['preferred_username']}",
            "data": {
                "url": url,
                "bpn": bpn,
                "status": "registered"
            }
        }
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.get("/api/logs", tags=["Logs"])
async def get_activity(limit: int = 20, user=Depends(keycloak_openid.get_current_user)):
    try:
        logs = activity_manager.get_recent_logs(limit)
        return {
            "user": user["preferred_username"],
            "data": logs
        }
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

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
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        dataspace_config = app_configuration.get("dataspaceConfig", {})

        semantics_url:str = dataspace_config.get("discovery", {}).get("semantics", {}).get("url", "")

        return HttpUtils.response({
            "name": dataspace_config.get("name", None),
            "authority_id": dataspace_config.get("authority_id", None),
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
                "discovery_finder_url": semantics_url + dataspace_config.get("discovery", {}).get("discoveryFinder", {}).get("endpoint", ""),
                "bpn_discovery_url": semantics_url + dataspace_config.get("discovery", {}).get("bpnDiscovery", {}).get("endpoint", "")
            },
        })

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

    edc_config: dict = app_configuration.get("edc", {})

    edcManager = EdcManager(cluster_config=cluster_config,edc_config=edc_config, dataspace_config=app_configuration.get("dataspaceConfig",{}))

    ## Initialize database manager
    databaseManager = DatabaseManager(database_url="sqlite:///edc_manager.db")
    init_db()
    init_edc(settings)
    init_activity()


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

=======

@app.get("/api/connectors")
async def get_connectors(request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        connectors = databaseManager.get_all_connectors()
        return HttpUtils.response([conn.to_dict() for conn in connectors])
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message="Failed to retrieve connectors")


@app.get("/api/connectors/{connector_id}")
async def get_connector(connector_id: int, request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        connector = databaseManager.get_connector_by_id(connector_id)
        if not connector:
            return HttpUtils.get_error_response(status=404, message="Connector not found")
        
        return HttpUtils.response(connector.to_dict())
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message="Failed to retrieve connector")


@app.post("/api/connectors")
async def create_connector(connector: ConnectorCreate, request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        existing = databaseManager.get_connector_by_name(connector.name)
        if existing:
            return HttpUtils.get_error_response(status=400, message="Connector with this name already exists")
        
        new_connector = databaseManager.create_connector(
            name=connector.name,
            url=connector.url,
            bpn=connector.bpn,
            config=connector.config
        )
        
        databaseManager.log_activity(
            action="CREATE_CONNECTOR",
            connector_id=new_connector.id,
            connector_name=new_connector.name,
            details=f"Created connector: {new_connector.name}",
            status="success"
        )
        
        return HttpUtils.response(new_connector.to_dict(), status=201)
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message="Failed to create connector")


@app.put("/api/connectors/{connector_id}")
async def update_connector(connector_id: int, connector: ConnectorUpdate, request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        existing = databaseManager.get_connector_by_id(connector_id)
        if not existing:
            return HttpUtils.get_error_response(status=404, message="Connector not found")
        
        update_data = connector.dict(exclude_unset=True)
        updated_connector = databaseManager.update_connector(connector_id, **update_data)
        
        databaseManager.log_activity(
            action="UPDATE_CONNECTOR",
            connector_id=connector_id,
            connector_name=updated_connector.name,
            details=f"Updated connector: {updated_connector.name}",
            status="success"
        )
        
        return HttpUtils.response(updated_connector.to_dict())
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message="Failed to update connector")


@app.delete("/api/connectors/{connector_id}")
async def delete_connector(connector_id: int, request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        connector = databaseManager.get_connector_by_id(connector_id)
        if not connector:
            return HttpUtils.get_error_response(status=404, message="Connector not found")
        
        connector_name = connector.name
        success = databaseManager.delete_connector(connector_id)
        
        if success:
            databaseManager.log_activity(
                action="DELETE_CONNECTOR",
                connector_id=connector_id,
                connector_name=connector_name,
                details=f"Deleted connector: {connector_name}",
                status="success"
            )
            return HttpUtils.response({"message": "Connector deleted successfully"})
        else:
            return HttpUtils.get_error_response(status=500, message="Failed to delete connector")
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message="Failed to delete connector")


@app.get("/api/connectors/{connector_id}/health")
async def check_connector_health(connector_id: int, request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        connector = databaseManager.get_connector_by_id(connector_id)
        if not connector:
            return HttpUtils.get_error_response(status=404, message="Connector not found")
        
        health_status = edcManager.check_health(connector.url)
        
        new_status = "healthy" if health_status["healthy"] else "unhealthy"
        databaseManager.update_connector(connector_id, status=new_status)
        
        return HttpUtils.response(health_status)
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message="Failed to check health")


@app.get("/api/edc/health")
async def check_default_edc_health(request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        health_status = edcManager.check_health()
        return HttpUtils.response(health_status)
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message="Failed to check EDC health")


@app.get("/api/activity-logs")
async def get_activity_logs(request: Request, limit: int = 50):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        
        logs = databaseManager.get_recent_activity(limit=limit)
        return HttpUtils.response([log.to_dict() for log in logs])
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message="Failed to retrieve activity logs")


@app.post("/api/data/get")
async def data_get(get_request: EdcRequest, request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        return HttpUtils.proxy(edcService.do_get(
            counter_party_id=get_request.bpn,
            counter_party_address=get_request.url,
            dct_type=get_request.dct_type,
            path=get_request.path,
            policies=get_request.policies,
            headers=get_request.headers
        ))
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(
            status=500,
            message=f"GET request failed: {str(e)}"
        )


@app.post("/api/data/post")
async def data_post(post_request: EdcPostRequest, request: Request):
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        return HttpUtils.proxy(edcService.do_post(
            counter_party_id=post_request.bpn,
            counter_party_address=post_request.url,
            dct_type=post_request.dct_type,
            path=post_request.path,
            policies=post_request.policies,
            headers=post_request.headers,
            body=post_request.body,
            content_type=post_request.content_type
        ))
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(
            status=500,
            message=f"POST request failed: {str(e)}"
        )


def init_app():
    global app, app_configuration, edcManager, edcService, authManager, databaseManager
    
    logger.info("[INIT] Starting EDC Connector Manager...")
    
    database_url = os.getenv("DATABASE_URL", "sqlite:///./edc_manager.db")
    databaseManager = DatabaseManager(database_url=database_url)
    logger.info(f"[INIT] Database initialized")
    
    auth_config: dict = app_configuration.get("authorization", {"enabled": False})
    auth_enabled: bool = auth_config.get("enabled", False)
    
    if auth_enabled:
        api_key: dict = auth_config.get("apiKey", {"key": "X-Api-Key", "value": "password"})
        authManager = AuthManager(
            api_key_header=api_key.get("key", "X-Api-Key"),
            configured_api_key=api_key.get("value", "password"),
            auth_enabled=True
        )
    else:
        authManager = AuthManager(auth_enabled=False)
    
    edc_config: dict = app_configuration.get("edc", {})
    if not edc_config:
        raise Exception("[INIT] No EDC configuration found!")
    
    edcManager = EdcManager(edc_config=edc_config)
    edcService = EdcService(config=edc_config)
    
    logger.info("[INIT] All managers initialized successfully!")
    
    databaseManager.log_activity(
        action="SYSTEM_START",
        details="EDC Connector Manager started",
        status="success"
    )

init_app()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EDC Connector Manager")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    parser.add_argument("--port", type=int, default=8000, help="Port to run the server on")
    parser.add_argument("--log-level", type=str, default="info", help="Log level")
    
    args = parser.parse_args()
    logger.info(f"[INIT] Starting server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level=args.log_level)
>>>>>>> f506ce7 (Add core backend and frontend structure for EDC connector management)
