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
"""What a route may ask for, and where those objects come from.

The runtime is built once by the lifespan handler and kept on `app.state`, so
this module holds no mutable state of its own and a test can substitute any part
of it through `app.dependency_overrides`.
"""
from dataclasses import dataclass

from fastapi import Depends, Request

from app.auth.keycloak_config import keycloak_openid
from app.auth.roles import require_admin
from app.core import config
from app.managers.cluster_manager import ClusterManager
from app.managers.database_manager import DatabaseManager
from app.managers.edc_manager import EdcManager
from app.services.component_service import ComponentService
from app.services.edc_service import EdcService
from app.utils.errors import EmcError, Stage
from app.utils.ownership import ComponentScope


@dataclass(frozen=True)
class Runtime:
    """Everything that outlives a request."""

    edc_service: EdcService
    edc_manager: EdcManager
    database: DatabaseManager
    cluster: ClusterManager


def build_runtime() -> Runtime:
    return Runtime(
        edc_service=EdcService(repositories=config.helm_repositories()),
        edc_manager=EdcManager(
            connector_config=config.connector_config(),
            dataspace_config=config.dataspace_config(),
            components_config=config.components_config(),
        ),
        database=DatabaseManager(database_url=config.database_url()),
        cluster=ClusterManager(namespace=config.cluster_namespace()),
    )


def get_runtime(request: Request) -> Runtime:
    runtime = getattr(request.app.state, "runtime", None)
    if runtime is None:
        raise EmcError("The backend is still starting up.",
                       status=503, code="NOT_READY", stage=Stage.INTERNAL,
                       hint="Retry in a moment.")
    return runtime


def get_database(runtime: Runtime = Depends(get_runtime)) -> DatabaseManager:
    return runtime.database


def get_component_service(runtime: Runtime = Depends(get_runtime)) -> ComponentService:
    return ComponentService(
        database=runtime.database,
        cluster=runtime.cluster,
        edc_manager=runtime.edc_manager,
        edc_service=runtime.edc_service,
    )


def get_current_user(user: dict = Depends(keycloak_openid.get_current_user)) -> dict:
    return user


def get_admin_user(user: dict = Depends(require_admin)) -> dict:
    return user


def get_scope(user: dict = Depends(get_current_user)) -> ComponentScope:
    return ComponentScope.for_user(user)


def get_admin_scope(user: dict = Depends(get_admin_user)) -> ComponentScope:
    return ComponentScope.for_user(user)
