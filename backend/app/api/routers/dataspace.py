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
"""The dataspace the console is wired into, as the frontend needs to see it."""
from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.auth.roles import is_admin
from app.core import config

router = APIRouter(prefix="/api", tags=["Dataspace"])


def _absolute(value) -> str:
    """configuration.yml carries bare hostnames; the frontend needs URLs."""
    if not value:
        return ""
    if isinstance(value, str) and value.startswith(("http://", "https://")):
        return value
    return f"https://{value}"


@router.get("/dataspace")
async def get_dataspace_settings(user: dict = Depends(get_current_user)):
    dataspace = config.dataspace_config()
    connector = config.connector_config()
    sde = config.sde_config()
    hostnames = config.connector_hostnames()
    discovery = dataspace.get("discovery") or {}
    authority_bpn = dataspace.get("authority_id", "BPNL000000000000")

    return {
        "user": dataspace.get("preferred_username", "user"),
        "data": {
            "name": dataspace.get("name", "Your Dataspace"),
            "authority_bpn": authority_bpn,
            "bpn": authority_bpn,
            "realm": config.centralidp_config().get("realm", ""),
            "username": dataspace.get("preferred_username", "user"),
            "centralidp": {
                "url": config.centralidp_config().get("url", ""),
                "realm": config.centralidp_config().get("realm", ""),
            },
            "ssi_wallet": {"url": (dataspace.get("ssi_wallet") or {}).get("url", "")},
            "portal": {"url": (dataspace.get("portal") or {}).get("url", "")},
            "sde": {
                "url": sde.get("url", ""),
                "client_id": sde.get("client_id", ""),
                "manufacturerId": sde.get("manufacturerId", ""),
                "providerEDC": sde.get("providerEDC", ""),
                "consumerEDC": sde.get("consumerEDC", ""),
                "registryUrl": sde.get("registryUrl", ""),
            },
            "discovery": {
                "semantics_url": (discovery.get("semantics") or {}).get("url", ""),
                "discovery_finder": (discovery.get("discoveryFinder") or {}).get("endpoint", ""),
                "bpn_discovery": (discovery.get("bpnDiscovery") or {}).get("endpoint", ""),
            },
            "edc": {
                "default_url": connector.get("default_url", ""),
                "controlplane_url": (_absolute(hostnames.get("controlplane"))
                                     or connector.get("default_url", "")),
                "dataplane_url": _absolute(hostnames.get("dataplane")),
                # Bare host suffixes, exactly as the cp_hostname/dp_hostname
                # derive templates consume them. The wizard prefixes the
                # connector name, so the hostname it previews matches the
                # Ingress the backend will create. Sent separately from the
                # *_url fields so the UI never has to split a URL to get one.
                "controlplane_host_suffix": hostnames.get("controlplane", ""),
                "dataplane_host_suffix": hostnames.get("dataplane", ""),
                "cluster_context": config.cluster_config().get("context", ""),
            },
            "session": {
                "username": user.get("preferred_username", ""),
                "name": user.get("name", ""),
                "bpn": user.get("bpn", ""),
                "company": user.get("company", ""),
                "roles": list(user.get("roles", ())),
                "isAdmin": is_admin(user),
            },
            "deployment": {
                "connector": config.component_versions("connector"),
                "digitalTwinRegistry": config.component_versions("digitalTwinRegistry"),
                "submodelServer": config.component_versions("submodelServer"),
            },
            "readonly": True,
        },
    }
