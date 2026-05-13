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
from utilities.httpUtils import HttpUtils
from init import settings, app_configuration, logger

def get_config(user):
    return {
        "user": user["preferred_username"],
        "data": settings
    }

def get_dataspace_settings(request):
    """
    Retrieves dataspace specific configurations from the configuration file

    Returns:
        response: :obj:`data object with the dataspace settings`
    """
    try:
        dataspace_config = app_configuration.get("dataspaceConfig", {})
        edc_config = app_configuration.get("edc", {})

        dataspace_name = dataspace_config.get("name", "ARENA2036-X")
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
                "cluster_context": app_configuration.get("clusterConfig", {}).get("context", "")
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