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
"""Deployed components: connectors, digital twin registries, submodel servers.

Nothing here decides anything - the rules live in ComponentService and the error
envelopes in app.api.errors. These functions bind a URL to a call and shape the
reply.

Route order matters: /components/health has to be declared before
/components/{component_id}, or the id route swallows it.
"""
from fastapi import APIRouter, Depends

from app.api.dependencies import (get_admin_scope, get_component_service,
                                  get_current_user, get_scope)
from app.models.connector import DeploymentRequest
from app.services.component_service import ComponentService
from app.utils.http_utils import HttpUtils
from app.utils.ownership import ComponentScope

router = APIRouter(prefix="/api", tags=["Components"])


@router.get("/components")
async def list_components(service: ComponentService = Depends(get_component_service),
                          scope: ComponentScope = Depends(get_scope)):
    """The deployed components this caller is allowed to see."""
    return HttpUtils.response(status=200, data=await service.list_components(scope))


@router.get("/components/health")
async def all_components_health(service: ComponentService = Depends(get_component_service),
                                scope: ComponentScope = Depends(get_scope)):
    """Health of every deployed component, for continuous polling."""
    return HttpUtils.response(status=200, data=await service.health_of_all(scope))


@router.get("/components/{component_name}/health")
async def get_component_health(component_name: str,
                               service: ComponentService = Depends(get_component_service),
                               scope: ComponentScope = Depends(get_scope)):
    """Health of one deployed component, for continuous polling."""
    return HttpUtils.response(status=200, data=await service.health_of(component_name, scope))


@router.get("/components/{component_id}")
async def get_component(component_id: str,
                        service: ComponentService = Depends(get_component_service),
                        scope: ComponentScope = Depends(get_scope),
                        user: dict = Depends(get_current_user)):
    """One deployed component by id."""
    return {
        "user": user["preferred_username"],
        "data": service.get(component_id, scope).to_dict(),
    }


@router.post("/component")
async def add_components(payload: DeploymentRequest,
                         service: ComponentService = Depends(get_component_service),
                         scope: ComponentScope = Depends(get_admin_scope)):
    """Deploy the components in the request."""
    deployed = await service.deploy(payload.components, scope)
    return HttpUtils.response(status=200, data={"deployed": deployed})


@router.put("/components/{component_id}")
async def upgrade_components(component_id: str, payload: DeploymentRequest,
                             service: ComponentService = Depends(get_component_service),
                             scope: ComponentScope = Depends(get_admin_scope)):
    """Upgrade (or install) the components in the request - Helm
    install-or-upgrade is the same operation, so this shares the deploy path."""
    upgraded = await service.deploy(payload.components, scope)
    return HttpUtils.response(status=200, message="Components upgraded",
                              data={"upgraded": upgraded})


@router.delete("/components/{component_name}")
async def delete_component(component_name: str,
                           service: ComponentService = Depends(get_component_service),
                           scope: ComponentScope = Depends(get_admin_scope)):
    """Delete one component and uninstall its Helm release."""
    deleted = await service.delete(component_name, scope)
    return HttpUtils.response(status=200, message=f"Deleted '{deleted}'")
