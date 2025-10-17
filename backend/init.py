# Set up imports configuration
import argparse
import logging.config
import yaml
import urllib3
import uvicorn
import requests
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from managers import init_db, init_edc, init_activity
from auth.keycloak_config import keycloak_openid
from managers import database_manager, edc_manager, activity_manager
from models.requests import ConnectorCreate, ConnectorUpdate
from tractusx_sdk.dataspace.managers import AuthManager
from tractusx_sdk.dataspace.managers import OAuth2Manager
from utilities.httpUtils import HttpUtils
from utilities.operators import op

op.make_dir("logs")

idpManager: OAuth2Manager
authManager: AuthManager

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
# CORS Setup
# ------------------------------------------------------------
origins = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "https://centralidp.arena2036-x.de",
    "https://*.replit.dev",
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# Initialize Managers
# ------------------------------------------------------------


init_db()
init_edc(settings)
init_activity()

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
        connectors = database_manager.get_all_connectors()
        if connectors is not None:
            logger.info(f"Retrieving list of connectors...")

        return {
            "data": [conn.to_dict() for conn in connectors]
        }
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

@app.post("/api/connectors", tags=["EDC"])
async def create_connector(connector: ConnectorCreate, user=Depends(keycloak_openid.get_current_user)):
    try:
        existing = database_manager.get_connector_by_name(connector.name)
        if existing:
            return HttpUtils.get_error_response(status=400, message="Connector already exists")
        
        version = connector.config.get('version') if connector.config else None
        new_connector = database_manager.create_connector(
            name=connector.name,
            url=connector.url,
            bpn=connector.bpn,
            version=version,
            config=connector.config
        )
        
        database_manager.log_activity(
            action="CREATE_CONNECTOR",
            connector_id=new_connector.id,
            connector_name=new_connector.name,
            details=f"Connector created by {user['preferred_username']}",
            status="success"
        )
        
        return {
            "message": f"Connector created by {user['preferred_username']}", 
            "data": new_connector.to_dict()
        }
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.put("/api/connectors/{connector_id}", tags=["EDC"])
async def update_connector(connector_id: int, connector: ConnectorUpdate, user=Depends(keycloak_openid.get_current_user)):
    try:
        updated = database_manager.update_connector(
            connector_id=connector_id,
            name=connector.name,
            url=connector.url,
            bpn=connector.bpn,
            config=connector.config
        )
        
        if not updated:
            return HttpUtils.get_error_response(status=404, message="Connector not found")
        
        database_manager.log_activity(
            action="UPDATE_CONNECTOR",
            connector_id=connector_id,
            connector_name=updated.name,
            details=f"Connector updated by {user['preferred_username']}",
            status="success"
        )
        
        return {
            "message": f"Connector updated by {user['preferred_username']}",
            "data": updated.to_dict()
        }
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.delete("/api/connectors/{connector_id}", tags=["EDC"])
async def delete_connector(connector_id: int, user=Depends(keycloak_openid.get_current_user)):
    try:
        connector = database_manager.get_connector_by_id(connector_id)
        if not connector:
            return HttpUtils.get_error_response(status=404, message="Connector not found")
        
        success = database_manager.delete_connector(connector_id)
        if success:
            database_manager.log_activity(
                action="DELETE_CONNECTOR",
                connector_id=connector_id,
                connector_name=connector.name,
                details=f"Connector deleted by {user['preferred_username']}",
                status="success"
            )
            return {"message": f"Connector deleted by {user['preferred_username']}"}
        
        return HttpUtils.get_error_response(status=500, message="Failed to delete")
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.post("/api/submodel/deploy", tags=["Submodel"])
async def deploy_submodel_service(data: dict, user=Depends(keycloak_openid.get_current_user)):
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

@app.post("/api/submodel/register", tags=["Submodel"])
async def register_submodel_service(data: dict, user=Depends(keycloak_openid.get_current_user)):
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

@app.get("/api/activity-logs", tags=["Logs"])
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
async def get_dataspace_settings(user=Depends(keycloak_openid.get_current_user)):
    """Get Keycloak-synchronized dataspace settings (read-only)"""
    try:
        dataspace_config = settings.get("dataspaceConfig", {})
        edc_config = settings.get("edc", {})
        
        dataspace_name = user.get("realm", "ARENA2036-X")
        bpn = user.get("bpn", "BPNL000000000000")
        
        dataspace_settings = {
            "name": dataspace_name,
            "bpn": bpn,
            "realm": user.get("realm", "CX-Central"),
            "username": user["preferred_username"],
            "centralidp": {
                "url": dataspace_config.get("centralidp", {}).get("url", ""),
                "realm": dataspace_config.get("centralidp", {}).get("realm", "")
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
                "cluster_context": edc_config.get("clusterConfig", {}).get("context", "")
            },
            "readonly": True
        }
        
        return {
            "user": user["preferred_username"],
            "data": dataspace_settings
        }
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))


def init_app(host: str, port: int, log_level: str = "info"):
    global app, app_configuration, flagManager, flagService, edcService, edcManager, edcDiscoveryService, discoveryFinderService, authManager

    authManager = AuthManager()

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

