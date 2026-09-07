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
"""Configuration this backend runs on, read once at import.

`configuration.yml` describes the dataspace and the components that may be
deployed into it; `settings.yaml` is handed to the frontend as-is. The accessors
exist so callers ask for a value by name rather than walking a dict four levels
deep, which is what the deep `.get({}).get({})` chains used to do at every call
site.
"""
import os
from pathlib import Path
from typing import Optional

import yaml

CONFIG_DIR = Path(os.getenv("EMC_CONFIG_DIR", "config"))

DEFAULT_MAX_COMPONENT_INSTANCES = 3


def _load(filename: str) -> dict:
    with open(CONFIG_DIR / filename, "rt", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


app_configuration: dict = _load("configuration.yml")
settings: dict = _load("settings.yaml")


def dataspace_config() -> dict:
    return app_configuration.get("dataspaceConfig") or {}


def connector_config() -> dict:
    return app_configuration.get("connector") or {}


def components_config() -> dict:
    return app_configuration.get("components") or {}


def sde_config() -> dict:
    return app_configuration.get("sde") or {}


def identity_config() -> dict:
    return dataspace_config().get("identity") or {}


def centralidp_config() -> dict:
    return dataspace_config().get("centralidp") or {}


def client_id() -> Optional[str]:
    return (app_configuration.get("appConfig") or {}).get("client_id")


def cluster_config() -> dict:
    return dataspace_config().get("clusterConfig") or {}


def cluster_namespace() -> Optional[str]:
    return cluster_config().get("namespace")


def connector_endpoints() -> dict:
    return connector_config().get("endpoints") or {}


def connector_hostnames() -> dict:
    return connector_config().get("hostname") or {}


def helm_repositories() -> list:
    return connector_config().get("helmRepositories") or []


def component_instance_limit(component_type: str) -> int:
    """The per-type instance cap, falling back to the default.

    A missing, non-numeric or non-positive `maxInstances` counts as "not
    configured" rather than "unlimited", so an accidental `maxInstances: 0`
    cannot silently disable the cap.
    """
    configured = (components_config().get(component_type) or {}).get("maxInstances")
    try:
        limit = int(configured)
    except (TypeError, ValueError):
        return DEFAULT_MAX_COMPONENT_INSTANCES

    return limit if limit > 0 else DEFAULT_MAX_COMPONENT_INSTANCES


def component_versions(component_key: str) -> dict:
    """The chart versions and instance cap the deploy wizard offers for a type.

    Sourced from the same `components.<key>` block that EdcManager validates
    against, so the UI can never offer a version the backend would reject.
    """
    component = components_config().get(component_key) or {}
    versions = [entry.get("version") for entry in (component.get("versions") or [])
                if entry.get("version")]
    return {
        "defaultVersion": versions[0] if versions else "",
        "availableVersions": versions,
        "maxInstances": component_instance_limit(component_key),
    }


def database_url() -> str:
    """DATABASE_URL wins, then configuration.yml, then a sqlite file under ./data.

    ./data is where the chart mounts the persistent volume. A sqlite path
    anywhere else lives on the container's ephemeral filesystem, so every pod
    restart resets the database to whatever was baked into the image and
    resurrects component rows that no longer exist in the cluster.
    """
    configured = (os.environ.get("DATABASE_URL")
                  or (app_configuration.get("database") or {}).get("url"))
    if configured and not configured.strip().startswith("${"):
        return configured

    data_dir = os.path.join(os.getcwd(), "data")
    os.makedirs(data_dir, exist_ok=True)
    return f"sqlite:///{os.path.join(data_dir, 'edc_manager.db')}"


def allowed_origins() -> list:
    return [origin.strip() for origin
            in os.environ.get("EMC_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
