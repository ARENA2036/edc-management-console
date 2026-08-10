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
from fastapi.exceptions import RequestValidationError
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
from utilities.errors import (ComponentLimitExceeded, ComponentMisconfigured,
                              DuplicateComponentName, EmcError, Stage,
                              UnknownComponentType, UnsupportedVersion, classify,
                              new_error_id)
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

@app.exception_handler(EmcError)
async def handle_emc_error(request: Request, exc: EmcError):
    """A failure raised deliberately - it already carries its own status."""
    return HttpUtils.error_response(exc, stage=exc.stage, log=logger)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError):
    """422 naming the offending fields.

    FastAPI already answers 422; what it does not do is use this envelope or
    report the fields in a form a client can show without understanding
    pydantic's error format.
    """
    fields = [
        "{}: {}".format(
            ".".join(str(part) for part in item.get("loc", ()) if part != "body") or "body",
            item.get("msg", "invalid value"),
        )
        for item in exc.errors()
    ]
    error_id = new_error_id()
    logger.warning("[VALIDATION_FAILED][stage=%s][id=%s] %s",
                   Stage.REQUEST, error_id, "; ".join(fields))
    return HttpUtils.get_error_response(
        status=422,
        message="The request payload is not valid.",
        code="VALIDATION_FAILED",
        stage=Stage.REQUEST,
        detail="\n".join(fields),
        hint="Correct the listed fields and send the request again.",
        error_id=error_id,
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    """Last resort. Anything here is a bug: logged with a traceback and reported
    as 500, never downgraded to a 4xx that would look like the caller's fault."""
    return HttpUtils.error_response(exc, stage=Stage.INTERNAL, log=logger)

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

DEFAULT_MAX_COMPONENT_INSTANCES = 3


def _component_instance_limit(component_type: str) -> int:
    """Resolve the per-type instance cap, falling back to the default.

    A missing, non-numeric or non-positive ``maxInstances`` is treated as "not
    configured" rather than "unlimited" — an accidental ``maxInstances: 0`` should
    not silently disable the cap.
    """
    configured = (
        app_configuration.get("components", {})
        .get(component_type, {})
        .get("maxInstances")
    )
    try:
        limit = int(configured)
    except (TypeError, ValueError):
        return DEFAULT_MAX_COMPONENT_INSTANCES

    return limit if limit > 0 else DEFAULT_MAX_COMPONENT_INSTANCES


def _record_type(record: ConnectorDB) -> str:
    config_type = (record.config or {}).get("type")
    if isinstance(config_type, str) and config_type:
        return config_type
    if record.cp_hostname:
        return "connector"
    return ""


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
    except Exception as exc:
        error = classify(exc, stage=Stage.CLUSTER)
        logger.warning(
            "[reconcile][%s][stage=%s] Could not verify release '%s' in namespace '%s': %s; keeping row",
            error.code, error.stage, release_name, namespace, error.message,
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


@app.get("/api/components", tags=["Components"])
async def list_components(request: Request):
    """
    Retrieves the list of deployed components the user is allowed to see.

    A component is anything this console can deploy — a connector, a digital twin
    registry, a submodel server, ... — so the payload is intentionally not
    connector-specific.

    Returns:
        response: :obj:`data object with the list of components`
    """
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        existingDeployments = databaseManager.get_all_connectors()
        json_list: list = []
        for component in existingDeployments:
            # Drop rows whose Helm release no longer exists before showing them.
            if not await _reconcile_and_get_release_name(component, namespace):
                continue

            url_list = []
            # Only connector components carry a control-plane host to health-check / build URLs from.
            if component.cp_hostname:
                health = edcManager.check_health(f'{URL_SCHEME}://' + component.cp_hostname)
                logger.info("Health check status %s", health)
                component.status = "active" if health.get("healthy") else "unreachable"
                databaseManager.update_connector(component)
                for endpoint in app_configuration.get("connector", {}).get("endpoints", {}).keys():
                    url_list.append(
                        f'{URL_SCHEME}://' + component.cp_hostname + app_configuration.get("connector", {}).get("endpoints", {}).get(endpoint)
                    )
            if component.registry:
                url_list.append(f'{URL_SCHEME}://{component.registry}/semantics/registry/')
            if component.submodel:
                url_list.append(f'{URL_SCHEME}://{component.submodel}/')

            component_dict = component.to_dict()
            component_dict["urls"] = url_list
            logger.info("Fetching all components %s", component_dict)
            json_list.append(
                component_dict
            )

        return HttpUtils.response(
            status=200,
            data=json_list
        )
    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.DATABASE, log=logger)

@app.get("/api/components/health", tags=["Components"])
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
    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.UPSTREAM, log=logger)

@app.get("/api/components/{component_name}/health", tags=["Components"])
async def get_component_health(component_name: str, request: Request):
    """Health of a single deployed component (by name) — for continuous polling
    from the frontend. Refreshes and returns the component's health + status."""
    try:
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        record = databaseManager.get_connector_by_name(name=component_name)
        if not record:
            return HttpUtils.get_error_response(
                status=404, code="COMPONENT_NOT_FOUND", stage=Stage.REQUEST,
                message=f"No component named '{component_name}' is known to this console.")

        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        if not await _reconcile_and_get_release_name(record, namespace):
            return HttpUtils.get_error_response(
                status=404, code="COMPONENT_NOT_FOUND", stage=Stage.CLUSTER,
                message=f"Component '{component_name}' no longer exists in the cluster.",
                hint="Refresh the dashboard - the component list has changed.")

        health = edcManager.component_health(record)
        record.status = "active" if health.get("healthy") else "unreachable"
        databaseManager.update_connector(record)
        return HttpUtils.response(status=200, data=health)
    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.UPSTREAM, log=logger)

@app.get("/api/components/{component_id}", tags=["Components"])
async def get_component(component_id: str, user=Depends(keycloak_openid.get_current_user)):
    """Retrieves a single deployed component by its id."""
    try:
        component = databaseManager.get_connector_by_id(component_id)
        if not component:
            return HttpUtils.get_error_response(
                status=404, code="COMPONENT_NOT_FOUND", stage=Stage.REQUEST,
                message=f"No component with id '{component_id}' is known to this console.")
        return {
            "user": user["preferred_username"],
            "data": component.to_dict()
        }
    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.DATABASE, log=logger)

def _upsert_component_row(comp, plan, namespace):
    """Create or refresh the ConnectorDB row for one deployed component.

    Each component is persisted as its own row keyed by its `name`; `config`
    records its type + release. cp/dp hostnames are only meaningful for the
    connector itself (used by the health probe), so they stay None for others.

    Components are independent: nothing records a relationship to a connector,
    and deleting one never affects another.
    """
    cp_host = app_configuration.get("connector", {}).get("hostname", {}).get("controlplane")
    dp_host = app_configuration.get("connector", {}).get("hostname", {}).get("dataplane")
    auth = getattr(comp, "auth", None) or {}
    row_config = {
        "type": comp.type,
        "release": plan["release_name"],
        "chart": plan["chart"],
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


def _assert_within_component_limits(components):
    """Reject the whole request if it would push any component type past its cap.

    Runs as a pre-flight check before any Helm work, so an over-limit request
    changes nothing at all rather than deploying the first few components and then
    failing part-way through.

    Re-deploying a name that already exists is an in-place upgrade (Helm
    install-or-upgrade), not a new instance, so it is deliberately not counted
    against the cap — otherwise upgrading a component while at the limit would be
    impossible.
    """
    existing = databaseManager.get_all_connectors()
    existing_names = {record.name for record in existing}

    counts: dict = {}
    for record in existing:
        record_type = _record_type(record)
        if record_type:
            counts[record_type] = counts.get(record_type, 0) + 1

    for comp in components:
        if not comp.type or not comp.name:
            continue
        if comp.name in existing_names:
            continue

        limit = _component_instance_limit(comp.type)
        counts[comp.type] = counts.get(comp.type, 0) + 1
        if counts[comp.type] > limit:
            raise ComponentLimitExceeded(
                f"Cannot deploy '{comp.name}': at most {limit} component(s) of type "
                f"'{comp.type}' may exist at a time and that limit is already reached. "
                "Delete an existing one before deploying another.",
                hint="Delete an existing component of this type, then deploy again.",
            )


def _plan_error(plan) -> EmcError:
    """Map a ``prepare_deployment`` refusal onto the right status.

    An unknown type or an unsupported version is the caller's mistake (400); a
    component whose chart block is incomplete is this console's own
    misconfiguration (500). ``prepare_deployment`` tags each refusal with
    ``error_code`` so this never has to sniff the message text.
    """
    message = plan.get("error", "The deployment could not be prepared.")
    by_code = {
        "VERSION_UNSUPPORTED": (
            UnsupportedVersion,
            "Choose one of the versions published on /api/dataspace for this component type."),
        "COMPONENT_TYPE_UNKNOWN": (
            UnknownComponentType,
            "Only types configured under `components` in configuration.yml can be deployed."),
        "COMPONENT_CONFIG_INVALID": (
            ComponentMisconfigured,
            "An operator must fix this component's `chart` block in configuration.yml."),
    }
    error_class, hint = by_code.get(plan.get("error_code"), (None, None))
    if error_class is None:
        return EmcError(message, stage=Stage.CONFIG)
    return error_class(message, hint=hint)


async def _deploy_components(components, namespace):
    """Install-or-upgrade every component in the request (config-driven) and
    persist one DB row per component. A component with no `type`/`name` is an
    empty/optional slot and is skipped. Shared by POST (create) and PUT (upgrade)
    since Helm install-or-upgrade is the same operation either way."""
    deployed = []
    named_components = [comp.name for comp in components if comp.type and comp.name]
    seen_names = set()
    for dup_name in named_components:
        if dup_name in seen_names:
            raise DuplicateComponentName(
                f"Component name '{dup_name}' is used more than once in this request. "
                "Each component (connector, submodel server, digital twin registry) "
                "needs its own unique name.",
                hint="Rename one of the duplicates and submit again.",
            )
        seen_names.add(dup_name)

    _assert_within_component_limits(components)

    for comp in components:
        if not comp.type or not comp.name:
            continue
        plan = edcManager.prepare_deployment(comp.type, comp)
        if "error" in plan:
            raise _plan_error(plan)
        await edcService.install_or_upgrade(
            release_name=plan["release_name"],
            chart_name=plan["chart"],
            repo=plan["repo"],
            version=plan["version"],
            values=plan["values"],
            namespace=namespace,
        )
        _upsert_component_row(comp, plan, namespace)
        deployed.append({"type": comp.type, "name": comp.name,
                         "release": plan["release_name"], "version": plan["version"]})

    return deployed


@app.post("/api/component", tags=["Components"])
async def add_components(payload: DeploymentRequest, request: Request):
    """Deploy the components in the request.

    The payload is a list of components, each selected by its `type`
    (connector, digitalTwinRegistry, submodelServer, ...), so this endpoint is
    not connector-specific.
    """
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()
        logger.info(payload)
        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        deployed = await _deploy_components(payload.components, namespace)
        return HttpUtils.response(status=200, data={"deployed": deployed})

    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.HELM, log=logger)

@app.put("/api/components/{component_id}", tags=["Components"])
async def upgrade_components(component_id: str, payload: DeploymentRequest, request: Request):
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

    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.HELM, log=logger)

@app.delete("/api/components/{component_name}", tags=["Components"])
async def delete_component(component_name: str, request: Request):
    """Delete exactly one component by name and uninstall its Helm release.

    Components are independent, so deleting a connector never touches a digital
    twin registry or submodel server, even if they were deployed together.
    """
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        record = databaseManager.get_connector_by_name(name=component_name)
        if not record:
            return HttpUtils.get_error_response(
                status=404, code="COMPONENT_NOT_FOUND", stage=Stage.REQUEST,
                message=f"No component named '{component_name}' is known to this console.",
                hint="It may already have been deleted - refresh the dashboard.")

        namespace = app_configuration.get("dataspaceConfig", {}).get("clusterConfig", {}).get("namespace", None)
        release_name = (record.config or {}).get("release") or record.name
        await edcService.uninstall(
            release_name=release_name,
            namespace=record.namespace or namespace,
        )
        databaseManager.delete_connector(connector_id=record.id)

        return HttpUtils.response(status=200, message=f"Deleted '{record.name}'")

    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.HELM, log=logger)


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
            return HttpUtils.get_error_response(
                status=400, code="MISSING_REQUIRED_FIELD", stage=Stage.REQUEST,
                message="A submodel service URL is required.")

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
    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.UPSTREAM, log=logger)

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
            return HttpUtils.get_error_response(
                status=400, code="MISSING_REQUIRED_FIELD", stage=Stage.REQUEST,
                message="Both a submodel service URL and a BPN are required.")

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

    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.UPSTREAM, log=logger)

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

def _configured_url(value):
    """Normalise a configured hostname into an absolute URL.

    Values in configuration.yml are bare hostnames (e.g. ``controlplane.example.de``),
    but the frontend expects browser-usable URLs, so prefix a scheme when missing.
    """
    if not value:
        return ""

    if isinstance(value, str) and (
        value.startswith("http://") or value.startswith("https://")
    ):
        return value

    return f"https://{value}"


def _component_versions(component_key: str):
    """Expose the Helm chart versions and the instance cap for a component type.

    The deployment wizard in the frontend populates its version dropdown from this,
    and sends the chosen value back on POST /api/component. Keeping it sourced from
    the same ``components.<key>.versions`` block that edcManager validates against
    means the UI can never offer a version the backend would reject.

    ``maxInstances`` is published for the same reason: the dashboard renders "x/max"
    counters and disables full component types from it, so the number the user sees
    is the number ``_assert_within_component_limits`` actually enforces.
    """
    component_config = app_configuration.get("components", {}).get(component_key, {})
    versions = [
        entry.get("version")
        for entry in (component_config.get("versions") or [])
        if entry.get("version")
    ]
    return {
        "defaultVersion": versions[0] if versions else "",
        "availableVersions": versions,
        "maxInstances": _component_instance_limit(component_key),
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
                "controlplane_url": _configured_url(
                    edc_config.get("hostname", {}).get("controlplane")
                ) or edc_config.get("default_url", ""),
                "dataplane_url": _configured_url(
                    edc_config.get("hostname", {}).get("dataplane")
                ),
                # Bare host suffixes, exactly as consumed by the `cp_hostname` /
                # `dp_hostname` derive templates ("{name}-{controlplane_hostname}").
                # The wizard prefixes the user's connector name to these, so the
                # hostname it previews matches the Ingress the backend will create.
                # Sent separately from the *_url fields so the UI never has to infer
                # a suffix by string-splitting a URL.
                "controlplane_host_suffix": edc_config.get("hostname", {}).get("controlplane", ""),
                "dataplane_host_suffix": edc_config.get("hostname", {}).get("dataplane", ""),
                "cluster_context": dataspace_config.get("clusterConfig", {}).get("context", "")
            },
            "deployment": {
                "connector": _component_versions("connector"),
                "digitalTwinRegistry": _component_versions("digitalTwinRegistry"),
                "submodelServer": _component_versions("submodelServer"),
            },
            "readonly": True
        }
        logger.info("%s", dataspace_settings)

        return {
            "user": dataspace_config.get("preferred_username", "user"),
            "data": dataspace_settings
        }
    except Exception as exc:
        return HttpUtils.error_response(exc, stage=Stage.CONFIG, log=logger)


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
