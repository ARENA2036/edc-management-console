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

from fastapi import APIRouter, Request, Depends
from auth.keycloak_config import keycloak_openid
from controllers.connectors_controller import *

router = APIRouter(tags=["EDC"])

@router.get("/api/connectors")
async def list_connectors(request: Request):
    return await list_connectors(request)

@router.get("/api/connectors/{connector_id}")
async def get_connector(connector_id: int, user=Depends(keycloak_openid.get_current_user)):
    return await get_connector(connector_id, user)

@router.post("/api/connector")
async def add_connector(connector, request: Request):
    return await add_connector(connector, request)

@router.put("/api/connectors/{connector_id}")
async def upgrade_connector(connector_id: str, connector, request: Request):
    return await upgrade_connector(connector_id, connector, request)

@router.delete("/api/connectors/{connector_name}")
async def delete_connector(connector_name: str, request: Request):
    return await delete_connector(connector_name, request)