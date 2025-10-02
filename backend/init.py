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
from service.edcService import EdcService
from utilities.httpUtils import HttpUtils
from utilities.operators import op

op.make_dir("logs")

app_configuration: dict
log_config: dict
edcManager: EdcManager
edcService: EdcService
authManager: AuthManager
databaseManager: DatabaseManager

urllib3.disable_warnings()
logging.captureWarnings(True)

with open('./config/logging.yml', 'rt') as f:
    log_config = yaml.safe_load(f.read())
    date = op.get_filedate()
    op.make_dir("logs/" + date)
    log_config["handlers"]["file"]["filename"] = f'logs/{date}/{op.get_filedatetime()}-edc-manager.log'
    logging.config.dictConfig(log_config)

logger = logging.getLogger('staging')

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
        "status": "RUNNING",
        "timestamp": op.timestamp()
    })


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
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))


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
        
        version = connector.config.get('version') if connector.config else None
        new_connector = databaseManager.create_connector(
            name=connector.name,
            url=connector.url,
            bpn=connector.bpn,
            version=version,
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
