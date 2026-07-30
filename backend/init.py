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
import asyncio
import logging.config
import yaml
import urllib3
import uvicorn
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

from typing import Optional
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware

from auth.keycloak_config import keycloak_openid

from models.connector import DeploymentRequest
from models.database import ConnectorDB
from tractusx_sdk.dataspace.managers import AuthManager
from tractusx_sdk.dataspace.managers import OAuth2Manager
from managers.edcManager import EdcManager, URL_SCHEME
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


def _record_type(record: ConnectorDB) -> str:
    config_type = (record.config or {}).get("type")
    if isinstance(config_type, str) and config_type:
        return config_type
    if record.cp_hostname:
        return "connector"
    return ""


def _linked_connector_name(record: ConnectorDB) -> str:
    config = record.config or {}
    linked = config.get("linkedConnector")
    if isinstance(linked, str) and linked:
        return linked
    if _record_type(record) == "connector":
        return record.name
    return ""


def _is_linked_to_connector(record: ConnectorDB, connector_name: str) -> bool:
    linked = _linked_connector_name(record)
    if linked:
        return linked == connector_name
    # Backward compatibility for rows created before linkedConnector was persisted.
    return record.name.startswith(connector_name + "-")

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

async def _reconcile_and_get_release_name(record: ConnectorDB, default_namespace) -> Optional[str]:
    """Return the record's Helm release name if it still exists in the cluster;
    prune the DB row and return None otherwise.

    ``release_exists`` only returns False on a definitive "release not found".
    Any other failure (helm/kubectl unreachable, wrong kubecontext, a network
    blip, RBAC, etc.) is NOT the same as "confirmed gone" — we fail open and
    keep showing the row rather than pruning it or letting the whole endpoint
    500 just because the cluster couldn't be reached for a moment.
    """
    release_name = (record.config or {}).get("release") or record.name
    namespace = record.namespace or default_namespace
    try:
        exists = await edcService.release_exists(release_name=release_name, namespace=namespace)
    except Exception as e:
        logger.warning(
            "[reconcile] Could not verify release '%s' in namespace '%s' (%s); keeping row",
            release_name, namespace, e,
        )
        return release_name

    if exists:
        return release_name
    logger.warning(
        "[reconcile] Pruning stale row '%s' (release '%s' not found in namespace '%s')",
        record.name, release_name, namespace,
    )
    databaseManager.delete_connector(connector_id=record.id)
    return None


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

        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        existingDeployments = databaseManager.get_all_connectors()
        json_list: list = []
        for cnctor in existingDeployments:
            # Drop rows whose Helm release no longer exists before showing them.
            if not await _reconcile_and_get_release_name(cnctor, namespace):
                continue

            url_list = []
            # Only connector rows carry a control-plane host to health-check / build URLs from.
            if cnctor.cp_hostname:
                health = edcManager.check_health(f'{URL_SCHEME}://' + cnctor.cp_hostname)
                logger.info("Health check status %s", health)
                cnctor.status = "active" if health.get("healthy") else "unreachable"
                databaseManager.update_connector(cnctor)
                for endpoint in app_configuration.get("connector", {}).get("endpoints", {}).keys():
                    url_list.append(
                        f'{URL_SCHEME}://' + cnctor.cp_hostname + app_configuration.get("connector", {}).get("endpoints", {}).get(endpoint)
                    )
            if cnctor.registry:
                url_list.append(f'{URL_SCHEME}://{cnctor.registry}/semantics/registry/')
            if cnctor.submodel:
                url_list.append(f'{URL_SCHEME}://{cnctor.submodel}/')

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

@app.get("/api/connectors/health", tags=["EDC"])
async def all_components_health(request: Request):
    """Health of every deployed component — for continuous polling from the
    frontend. Each component is probed by type (connector -> EDC liveness/
    readiness, others -> ingress reachability) and its row status is refreshed."""
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        results = []
        for record in databaseManager.get_all_connectors():
            if not await _reconcile_and_get_release_name(record, namespace):
                continue
            health = edcManager.component_health(record)
            record.status = "active" if health.get("healthy") else "unreachable"
            databaseManager.update_connector(record)
            results.append(health)

        return HttpUtils.response(status=200, data=results)
    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.get("/api/connectors/{connector_name}/health", tags=["EDC"])
async def get_component_health(connector_name: str, request: Request):
    """Health of a single deployed component (by name) — for continuous polling
    from the frontend. Refreshes and returns the component's health + status."""
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        record = databaseManager.get_connector_by_name(name=connector_name)
        if not record:
            return HttpUtils.get_error_response(status=404, message="Component not found")

        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        if not await _reconcile_and_get_release_name(record, namespace):
            return HttpUtils.get_error_response(status=404, message="Component not found")

        health = edcManager.component_health(record)
        record.status = "active" if health.get("healthy") else "unreachable"
        databaseManager.update_connector(record)
        return HttpUtils.response(status=200, data=health)
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

def _upsert_component_row(comp, plan, namespace, linked_connector):
    """Create or refresh the ConnectorDB row for one deployed component.

    Each component is persisted as its own row keyed by its `name`; `config`
    records its type + release. cp/dp hostnames are only meaningful for the
    connector itself (used by the health probe), so they stay None for others.
    """
    cp_host = app_configuration.get("connector", {}).get("hostname", {}).get("controlplane")
    dp_host = app_configuration.get("connector", {}).get("hostname", {}).get("dataplane")
    auth = getattr(comp, "auth", None) or {}
    row_config = {
        "type": comp.type,
        "release": plan["release_name"],
        "chart": plan["chart"],
        "linkedConnector": linked_connector,
    }

    record = databaseManager.get_connector_by_name(comp.name)
    if record is None:
        record = ConnectorDB(
            id=str(uuid.uuid4()),
            name=comp.name,
            bpn=getattr(comp, "bpn", "") or "",
            url=getattr(comp, "url", "") or "",
            version=plan["version"] or "",
            namespace=namespace,
            status="active",
            config=row_config,
            cp_hostname=(f"{comp.name}-{cp_host}" if comp.type == "connector" and cp_host else None),
            dp_hostname=(f"{comp.name}-{dp_host}" if comp.type == "connector" and dp_host else None),
            db_name=getattr(comp, "db_name", None) or "edc",
            db_username=auth.get("db_username"),
            db_password=auth.get("db_password"),
            registry="",
            submodel="",
        )
        return databaseManager.create_connector(connector=record)

    # Re-deploy/upgrade: refresh the request-derived fields and recorded release.
    record.config = row_config
    record.bpn = getattr(comp, "bpn", record.bpn) or record.bpn
    record.url = getattr(comp, "url", record.url) or record.url
    record.version = plan["version"] or record.version
    record.db_name = getattr(comp, "db_name", record.db_name) or record.db_name
    record.db_username = auth.get("db_username", record.db_username)
    record.db_password = auth.get("db_password", record.db_password)
    record.status = "active"
    return databaseManager.update_connector(record)


async def _deploy_components(components, namespace):
    """Install-or-upgrade every component in the request (config-driven) and
    persist one DB row per component. A component with no `type`/`name` is an
    empty/optional slot and is skipped. Shared by POST (create) and PUT (upgrade)
    since Helm install-or-upgrade is the same operation either way."""
    deployed = []
    connector_name = next((comp.name for comp in components if comp.type == "connector"), "")
    desired_component_names = {comp.name for comp in components if comp.type != "connector"}

    named_components = [comp.name for comp in components if comp.type and comp.name]
    seen_names = set()
    for dup_name in named_components:
        if dup_name in seen_names:
            raise Exception(
                f"Component name '{dup_name}' is used more than once in this request. "
                "Each component (connector, submodel server, digital twin registry) "
                "needs its own unique name."
            )
        seen_names.add(dup_name)

    for comp in components:
        if not comp.type or not comp.name:
            continue
        plan = edcManager.prepare_deployment(comp.type, comp)
        if "error" in plan:
            raise Exception(plan["error"])
        await edcService.install_or_upgrade(
            release_name=plan["release_name"],
            chart_name=plan["chart"],
            repo=plan["repo"],
            version=plan["version"],
            values=plan["values"],
            namespace=namespace,
        )
        linked_connector = connector_name if comp.type != "connector" else comp.name
        _upsert_component_row(comp, plan, namespace, linked_connector)
        deployed.append({"type": comp.type, "name": comp.name,
                         "release": plan["release_name"], "version": plan["version"]})

    if connector_name:
        existing_rows = databaseManager.get_all_connectors()
        rows_to_remove = [
            row for row in existing_rows
            if _record_type(row) != "connector"
            and _is_linked_to_connector(row, connector_name)
            and row.name not in desired_component_names
        ]
        for row in rows_to_remove:
            release_name = (row.config or {}).get("release") or row.name
            await edcService.uninstall(release_name=release_name, namespace=row.namespace or namespace)
            databaseManager.delete_connector(connector_id=row.id)

    return deployed


@app.post("/api/connector", tags=["EDC"])
async def add_connector(payload: DeploymentRequest, request: Request):
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        logger.info(payload)
        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        deployed = await _deploy_components(payload.components, namespace)
        return HttpUtils.response(status=200, data={"deployed": deployed})

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.put("/api/connectors/{connector_id}", tags=["EDC"])
async def upgrade_connector(connector_id: str, payload: DeploymentRequest, request: Request):
    """Upgrade (or install) the components in the request. Same array payload and
    config-driven path as POST — Helm install-or-upgrade is the same operation, so
    this re-renders each component's values and rolls the release forward."""
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        logger.info(payload)
        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        upgraded = await _deploy_components(payload.components, namespace)
        return HttpUtils.response(status=200, message="Components upgraded",
                                  data={"upgraded": upgraded})

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

@app.delete("/api/connectors/{connector_name}", tags=["EDC"])
async def delete_connector(connector_name: str, request: Request):
    """Delete one row by name; if it is an EDC connector, delete linked components too."""
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        record = databaseManager.get_connector_by_name(name=connector_name)
        if not record:
            return HttpUtils.get_error_response(status=404, message="Component not found")

        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        targets = [record]
        if _record_type(record) == "connector":
            linked = [
                row for row in databaseManager.get_all_connectors()
                if _record_type(row) != "connector" and _is_linked_to_connector(row, record.name)
            ]
            targets.extend(linked)

        for target in targets:
            release_name = (target.config or {}).get("release") or target.name
            await edcService.uninstall(
                release_name=release_name,
                namespace=target.namespace or namespace,
            )
            databaseManager.delete_connector(connector_id=target.id)

        return HttpUtils.response(
            status=200,
            message=f"Deleted '{record.name}' and {len(targets) - 1} linked component(s)")

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
        edc_config = app_configuration.get("connector", {})

        dataspace_name = dataspace_config.get("name", "Your Dataspace")
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
            "sde": {
                "url": app_configuration.get("sde", {}).get("url", ""),
                "client_id": app_configuration.get("sde", {}).get("client_id", ""),
                "manufacturerId": app_configuration.get("sde", {}).get("manufacturerId", ""),
                "providerEDC": app_configuration.get("sde", {}).get("providerEDC", ""),
                "consumerEDC": app_configuration.get("sde", {}).get("consumerEDC", ""),
                "registryUrl": app_configuration.get("sde", {}).get("registryUrl", ""),
            },
            "discovery": {
               "semantics_url": dataspace_config.get("discovery", {}).get("semantics", {}).get("url", ""),
                "discovery_finder": dataspace_config.get("discovery", {}).get("discoveryFinder", {}).get("endpoint", ""),
                "bpn_discovery": dataspace_config.get("discovery", {}).get("bpnDiscovery", {}).get("endpoint", "")
            },
            "edc": {
                "default_url": edc_config.get("default_url", ""),
                "cluster_context": dataspace_config.get("clusterConfig", {}).get("context", "")
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

    ## Get environment specific configurations
    connector_config: dict = app_configuration.get("connector", {})

    edcService = EdcService(repositories=connector_config.get("helmRepositories", []))
    # Register the configured Helm repositories before serving requests so each
    # deployable's chart + subchart dependencies can be resolved at deploy time.
    # Runs in a throwaway loop here since uvicorn has not started its own yet.
    try:
        asyncio.run(edcService.ensure_repositories())
    except Exception as e:
        logger.error("[INIT] Failed to register Helm repositories: %s", str(e))

    edcManager = EdcManager(
        connector_config=connector_config,
        dataspace_config=app_configuration.get("dataspaceConfig", {}),
        components_config=app_configuration.get("components", {}),
    )

    ## Initialize database manager
    ## The sqlite file MUST live under the persistent-volume mount (./data, which
    ## the Helm chart mounts the PVC at /backend/data). Anywhere else (e.g. the
    ## previous "sqlite:///edc_manager.db", relative to WORKDIR /backend) lives on
    ## the container's ephemeral root filesystem: every pod restart/recreate then
    ## resets the DB back to whatever was baked into the image at build time,
    ## silently resurrecting stale/removed connector rows that no longer exist in
    ## the cluster. DATABASE_URL (see configuration.yml `database.url`) still wins
    ## if explicitly set, e.g. to point at a real Postgres instance.
    configured_db_url = os.environ.get("DATABASE_URL") or app_configuration.get("database", {}).get("url")
    if not configured_db_url or configured_db_url.strip().startswith("${"):
        data_dir = os.path.join(os.getcwd(), "data")
        os.makedirs(data_dir, exist_ok=True)
        configured_db_url = f"sqlite:///{os.path.join(data_dir, 'edc_manager.db')}"
    databaseManager = DatabaseManager(database_url=configured_db_url)

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
