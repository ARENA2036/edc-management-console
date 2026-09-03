###############################################################
# Tractus-X - EDC Management Console
#
# Copyright (c) 2026 ARENA2036 e.V.
# Copyright (c) 2026 Contributors to the Eclipse Foundation
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
"""Registering a submodel service that is already running elsewhere.

Deploying one is POST /api/component with `type: submodelServer`.
"""
import logging

import requests
from fastapi import APIRouter, Depends

from app.api.dependencies import get_admin_user, get_database
from app.managers.database_manager import DatabaseManager
from app.utils.auth_utils import (assert_safe_external_url, build_external_url,
                                  get_oauth2_token)
from app.utils.errors import BadRequest, Stage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Submodel"])


@router.post("/submodel/{submodel_service_id}")
async def add_existing_submodel_service(submodel_service_id: str, data: dict,
                                        user: dict = Depends(get_admin_user),
                                        database: DatabaseManager = Depends(get_database)):
    """Register an already-running submodel service and report whether it answers.

    The service is not deployed or persisted by this console; the registration is
    recorded in the activity log and the endpoint is probed once.
    """
    url = data.get("url")
    bpn = data.get("bpn")
    auth_type = data.get("authType", "none")

    required = {"url": url, "bpn": bpn}
    if auth_type == "apiKey":
        required["apiKey"] = data.get("apiKey")
    elif auth_type == "bearer":
        required["bearerToken"] = data.get("bearerToken")

    missing = [field for field, value in required.items() if not value]
    if missing:
        raise BadRequest("This registration is missing required field(s): "
                         + ", ".join(missing) + ".",
                         code="MISSING_REQUIRED_FIELD", stage=Stage.REQUEST)

    url = assert_safe_external_url(url, field="url")
    health_url = build_external_url(url, "api/health", field="url")

    headers = {"Content-Type": "application/json"}
    if auth_type == "apiKey":
        headers["X-API-Key"] = required["apiKey"]
    elif auth_type == "bearer":
        headers["Authorization"] = f"Bearer {required['bearerToken']}"
    elif auth_type == "oauth2":
        headers["Authorization"] = "Bearer " + get_oauth2_token({
            "accessTokenUrl": data.get("submodelOAuthAccessTokenUrl"),
            "clientId": data.get("submodelOAuthClientId"),
            "clientSecret": data.get("submodelOAuthClientSecret"),
            "scope": data.get("submodelOAuthScope", "openid"),
            "clientAuth": data.get("submodelOAuthClientAuth", "basic"),
        })

    # Any failure here means "it did not answer", which is a result to report
    # rather than an error - the registration itself still stands.
    try:
        check = requests.get(health_url, headers=headers, timeout=5,
                             allow_redirects=False)
        reachable = check.status_code == 200
    except Exception as exception:
        logger.info("[submodel] %s did not answer: %s", health_url, exception)
        reachable = False

    database.log_activity(
        action="CONNECT_SUBMODEL",
        connector_name=submodel_service_id,
        details=f"Existing submodel service connected by {user['preferred_username']}: "
                f"{url} (BPN: {bpn})",
        status="success" if reachable else "warning",
    )

    return {
        "message": f"Submodel service connected by {user['preferred_username']}",
        "data": {
            "id": submodel_service_id,
            "url": url,
            "bpn": bpn,
            "reachable": reachable,
            "status": "connected" if reachable else "unreachable",
        },
    }
