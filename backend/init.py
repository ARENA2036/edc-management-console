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
# from managers import database_manager, edc_manager, activity_managerr
from models.requests import ConnectorCreate, ConnectorUpdate
from models.connector import Connector
# from models.database import Connector
from tractusx_sdk.dataspace.managers import AuthManager
from tractusx_sdk.dataspace.managers import OAuth2Manager
from managers.edcManager import EdcManager
from managers.databaseManager import DatabaseManager
from service.edcService import EdcService
from utilities.httpUtils import HttpUtils
from utilities.operators import op

op.make_dir("logs")

idpManager: OAuth2Manager
authManager: AuthManager
edcManager: EdcManager
edcService: EdcService
databaseManager: DatabaseManager

urllib3.disable_warnings()
logging.captureWarnings(True)

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

logger = logging.getLogger('staging')

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

        response: dict = edcService.get_all_connectors(namespace=app_configuration.get("clusterConfig",{}).get("namespace", None))
        if (response.get("status_code", 0) != 200):
            raise
        data = response.get("data", {}).split("\n")
        if (len(data) == 2):
            return HttpUtils.response(
                status=200,
                data="[]",
                message="No EDCs found"
            )

        existingDeployments = databaseManager.get_all_connectors()
        connectorMap: dict = {}
        for cnctor in existingDeployments:
            connectorMap[cnctor.name] = cnctor 

        
        json_list: list = []
        # iterate from first to second last element (last is empty string)
        for i in range(1, len(data) - 1):
            name,  namespace, revision, updated, status, chart, version = data[i].split('\t')
            json_list.append({
                "id": connectorMap.get(name).id,
                "name": name,
                "url": connectorMap.get(name).url,
                "bpn": connectorMap.get(name).bpn,
                "status": status,
                "namespace": namespace,
                "revision": revision,
                "updated": updated,
                "chart": chart,
                "version": version                 
            })

        # for index, value in  enumerate(data):
        #     # skip the 0th index, its the header
        #     if (len(data) != (index+1)):
        #         formatted_response: dict = data[index+1].split("\t")
        #         if (formatted_response[0] != ""):
        #             json_object: dict = {
        #                 "id": str(uuid.uuid4()),
        #                 "name": str(formatted_response[0]).replace(' ',''),
        #                 "url": str(formatted_response[1]).replace(' ',''),
        #                 "Revision": str(formatted_response[2]).replace(' ',''),
        #                 "Updated": str(formatted_response[3]).replace(' ',''),
        #                 "status": str(formatted_response[4]).replace(' ',''),
        #                 "Chart": str(formatted_response[5]).replace(' ',''),
        #                 "version": str(formatted_response[6]).replace(' ','')
        #             }
        #             json_list.append(json_object)


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


        existingDeployments = edcService.get_connector_by_name(
            connector_name=connector.name,
            namespace=app_configuration.get("clusterConfig",{}).get("namespace", None)
        )
        print(existingDeployments)
        if len(existingDeployments.get("data")) == 0:
            # set edc helm chart directory
            edcManager.add_edc(connector)
            #edcService = EdcService(helm_chart_directory=app_configuration.get("edc",{}).get("helm_chart_directory", None))
            response: dict = edcService.install_helm_chart(deployment_name=connector.name, 
                                                           values_files=["install_values.yaml"],namespace=app_configuration.get("clusterConfig",{}).get("namespace", None)
                                                        )
            if (response.get("status_code", 0) != 200):
                raise Exception(response.get("data",{}).split('Error')[1])


        connector_id = str(uuid.uuid4())

        connector_db = databaseManager.create_connector(
            id = connector_id,
            name = connector.name,
            url=connector.url,
            bpn=connector.bpn,
        )


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

