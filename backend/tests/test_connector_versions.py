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
"""The connector versions offered in config/configuration.yml render values the
matching upstream tractusx-connector chart actually reads.

These tests use the real configuration and the real base values templates, so a
renamed chart key (as between 0.12.x and 0.13.0) breaks here, not at deploy time.
"""
import uuid

import pytest
import yaml

from app.managers.edc_manager import EdcManager
from app.utils import common

REQUEST = {
    "name": "edc-1",
    "version": None,
    "bpn": "BPNL000000000001",
    "db_name": "edc-1-db",
    "auth": {"db_username": "edc-1-user", "db_password": "secret"},
}


@pytest.fixture(scope="module")
def manager():
    with open("config/configuration.yml") as file:
        config = yaml.safe_load(file)
    return EdcManager(config["connector"], config["dataspaceConfig"], config["components"])


def _render(manager, version):
    plan = manager.prepare_deployment("connector", {**REQUEST, "version": version})
    assert "error" not in plan, plan
    return plan


def test_offered_connector_versions(manager):
    offered = [v["version"] for v in manager.components["connector"]["versions"]]
    assert offered[:2] == ["0.13.0", "0.12.2"]
    assert "0.12.1" not in offered


def test_0_13_0_uses_the_dcp_layout_and_the_did_as_participant_id(manager):
    values = _render(manager, "0.13.0")["values"]
    did = values["participant"]["id"]
    assert did.startswith("did:web:") and did.endswith(":BPNL000000000001")
    assert values["participant"]["bpnl"] == "BPNL000000000001"
    assert "iatp" not in values                      # renamed to dcp in 0.13.0
    sts = values["dcp"]["sts"]
    assert "dim" not in sts and sts["div"]["url"].endswith("/api/sts")
    assert sts["oauth"]["client"]["id"] == "BPNL000000000001"
    assert values["dcp"]["trustedIssuers"] == ["did:web:ssi-dim-wallet-stub.arena2036-x.de:BPNL00000003CRHK"]


def test_0_13_0_context_id_is_a_stable_uuid(manager):
    first = _render(manager, "0.13.0")["values"]["participant"]["contextId"]
    again = _render(manager, "0.13.0")["values"]["participant"]["contextId"]
    assert first == again
    uuid.UUID(first)                                 # raises if not a UUID


def test_0_13_0_wires_the_cloudpirates_custom_db_user(manager):
    postgres = _render(manager, "0.13.0")["values"]["postgresql"]
    assert postgres["customUser"]["name"] == "edc-1-user"
    assert postgres["customUser"]["password"] == "secret"
    assert postgres["customUser"]["database"] == "edc-1-db"
    assert postgres["auth"]["password"] == "secret"
    # 0.12.x-only keys the 0.13.0 chart no longer reads must not be rendered.
    assert postgres["jdbcUrl"] == "jdbc:postgresql://{{ .Release.Name }}-postgresql:5432/edc"
    assert postgres["auth"]["username"] == "postgres"


def test_0_13_0_keeps_ingress_and_token_settings(manager):
    values = _render(manager, "0.13.0")["values"]
    cp = values["controlplane"]["ingresses"][0]
    assert cp["enabled"] is True and cp["endpoints"][:2] == ["protocol", "management"]
    assert cp["hostname"] == "edc-1-controlplane.txcd.arena2036-x.de"
    assert values["dataplane"]["ingresses"][0]["hostname"] == "edc-1-dataplane.txcd.arena2036-x.de"
    assert values["dataplane"]["token"]["signer"]["privatekey_alias"] == "tokenSignerPrivateKey"
    assert values["controlplane"]["bdrs"]["server"]["url"].endswith("/api/v1/directory")


def test_0_12_2_keeps_the_iatp_layout(manager):
    plan = _render(manager, "0.12.2")
    values = plan["values"]
    assert plan["chart_version"] == "0.12.2"
    assert values["participant"]["id"] == "BPNL000000000001"
    assert values["iatp"]["id"].startswith("did:web:")
    assert values["iatp"]["sts"]["dim"]["url"].endswith("/api/sts")
    assert values["postgresql"]["jdbcUrl"] == "jdbc:postgresql://edc-1-postgresql:5432/edc-1-db"


def test_version_value_mappings_merge_by_default_and_replace_on_request():
    base = [{"path": "a", "value": 1}, {"path": "b", "value": 2}]
    merged = common.version_value_mappings(base, {"valueMappings": [{"path": "b", "value": 9}]})
    assert merged == [{"path": "a", "value": 1}, {"path": "b", "value": 9}]
    replaced = common.version_value_mappings(
        base, {"replaceValueMappings": True, "valueMappings": [{"path": "c", "value": 3}]})
    assert replaced == [{"path": "c", "value": 3}]
    assert common.version_value_mappings(base, None) == base


def test_transform_uuid5_is_deterministic():
    mapping = {"path": "x", "value": "BPNL1/edc-1", "transform": "uuid5"}
    first = common._resolve_mapping_value(mapping, {})
    assert first == common._resolve_mapping_value(mapping, {})
    assert first != common._resolve_mapping_value({**mapping, "value": "BPNL1/edc-2"}, {})
