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

import uuid
import logging
from fastapi import Request
from fastapi import Depends
from auth.keycloak_config import keycloak_openid
from models.connector import Connector
from models.database import ConnectorDB
from utilities.httpUtils import HttpUtils
from utilities.auth_utils import get_oauth2_token
from init import authManager, edcManager, databaseManager, edcService, app_configuration, logger


async def list_connectors(request):
    """
    Retrieves list of connectors the user is allowed to see

    Returns:
        response: :obj:`data object with the list of connectors`
    """
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        existingDeployments = databaseManager.get_all_connectors()
        connectorMap: dict = {}
        json_list: list = []
        for cnctor in existingDeployments:
            connectorMap[cnctor.name] = cnctor
            status = edcManager.check_health('https://' + cnctor.cp_hostname)
            logger.info("Health check status %s", status)
            cnctor.status = "healthy" if status.get("healthy", False) else "unhealthy"
            databaseManager.update_connector(cnctor)
            
            url_list = []
            for endpoint in app_configuration.get("edc", {}).get("endpoints", {}).keys():
                url_list.append(
                    'https://' + cnctor.cp_hostname + app_configuration.get("edc", {}).get("endpoints", {}).get(endpoint)
                )
            if len(cnctor.registry) != 0:
                url_list.append(f'https://{cnctor.registry}/semantics/registry/')
            if len(cnctor.submodel) != 0:
                url_list.append(f'https://{cnctor.submodel}/')

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

async def get_connector(connector_id: int, user: dict):
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

async def add_connector(connector, request: Request):
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        #Check if the user has more than 2 edcs already deployed, maybe create another endpoint for user check
        #We can then call the endpoint when the user clicks on the DeployEDC button itself.
        logger.info(connector)
        is_registry_enabled = len(connector.registry.url) != 0
        is_submodel_enabled = len(connector.submodel.url) != 0
       
        existingDeployments = edcService.get_connector_by_name(
            connector_name=connector.name,
            namespace=app_configuration.get("clusterConfig",{}).get("namespace", None)
        )
        if existingDeployments.get("status_code") != 200:
            # set edc helm chart directory
            value_file_name = edcManager.add_edc(
                connector,
                is_registry_enabled=is_registry_enabled,
                is_submodel_enabled=is_submodel_enabled
            )
            response: dict = edcService.install_helm_chart(deployment_name=connector.name,
                                                           values_files=[value_file_name],
                                                           namespace=app_configuration.get("clusterConfig",{}).get("namespace", None)
                                                        )
            if (response.get("status_code", 0) != 200):
                raise Exception(response.get("data",{}).split('Error')[1])

        connector_db = databaseManager.get_connector_by_name(connector.name)
        if connector_db is None:
            logger.info(f"Entry not found in database, creating entry for {connector.name}")

            # dtr_db = DigitalTwinRegistryDB(
            #     url=connector.registry.url,
            #     credentials=connector.registry.credentials
            # )

            # submodel_db = SubModelServerDB(
            #     url=connector.submodel.url,
            #     credentials=connector.submodel.credentials
            # )
            connector_db = ConnectorDB(
                id=str(uuid.uuid4()),
                name=connector.name,
                bpn=connector.bpn,
                url = connector.url,
                version = connector.version,
                namespace = app_configuration.get("clusterConfig", {}).get("namespace", None),
                status = "unhealthy",
                cp_hostname = connector.name + '-' + app_configuration.get("edc", {}).get("hostname", {}).get("cp"),
                dp_hostname = connector.name + '-' + app_configuration.get("edc", {}).get("hostname", {}).get("dp"),
                db_name = 'edc',
                db_username = connector.db_username,
                db_password = connector.db_password,
                registry=connector.registry.url,
                submodel=connector.submodel.url
            )
            connector_db = databaseManager.create_connector(connector=connector_db)

        return HttpUtils.response(
            status=200,
            data=connector_db.to_dict()
        )

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))

async def upgrade_connector(connector_id: str, connector, request: Request):
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

async def delete_connector(connector_name: str, request: Request):
    try:
        ## Check if the api key is present and if it is authenticated
        if not authManager.is_authenticated(request=request):
            return HttpUtils.get_not_authorized()

        connector = databaseManager.get_connector_by_name(name=connector_name)

        response:dict = edcService.uninstall_helm_chart(connector_id=connector.name, namespace=app_configuration.get("clusterConfig",{}).get("namespace", None))
        if (response.get("status_code", 0) != 200):
            raise Exception(response.get("data",{}).split('Error')[1])

        databaseManager.delete_connector(connector_id=connector.id)

        return HttpUtils.response(
            status=200,
            message=str(response.get("data", {})))

    except Exception as e:
        logger.exception(str(e))
        return HttpUtils.get_error_response(status=500, message=str(e))