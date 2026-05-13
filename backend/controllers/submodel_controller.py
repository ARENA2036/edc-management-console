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

import logging
import requests
from utilities.httpUtils import HttpUtils
from utilities.auth_utils import get_oauth2_token
from init import databaseManager as database_manager, logger

async def add_submodel_service(data: dict, user):
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


async def add_existing_submodel_service(data: dict, user):
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
