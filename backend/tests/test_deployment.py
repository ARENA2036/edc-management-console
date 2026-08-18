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
"""Robustness tests for the generic, config-driven deployment pipeline.

Covers the pure value-rendering engine (utilities/common.py) and the
component-agnostic orchestration (managers/edcManager.py). No cluster, helm or
network access is required — EdcManager.prepare_deployment is pure given config.
"""
import pytest

from utilities import common
from managers.edcManager import EdcManager


# ---------------------------------------------------------------------------
# render_template / render_structure
# ---------------------------------------------------------------------------
def test_render_template_resolves_and_keeps_unknown():
    assert common.render_template("{name}-cp", {"name": "edc1"}) == "edc1-cp"
    # Unknown placeholders are left intact rather than raising.
    assert common.render_template("{missing}", {"name": "edc1"}) == "{missing}"


def test_render_template_object_and_non_object_context():
    class O:
        def __init__(self):
            self.name = "edc1"      # instance attribute -> visible via vars()
    assert common.render_template("{name}", O()) == "edc1"
    # A context with no __dict__ degrades to an empty context, not a crash.
    assert common.render_template("{name}", 5) == "{name}"


def test_render_structure_is_recursive_and_leaf_typed():
    ctx = {"name": "edc1"}
    value = ["{name}.x", {"host": "{name}.y", "n": 3}, 7]
    assert common.render_structure(value, ctx) == ["edc1.x", {"host": "edc1.y", "n": 3}, 7]


# ---------------------------------------------------------------------------
# _set_by_path
# ---------------------------------------------------------------------------
def test_set_by_path_creates_nested_and_preserves_siblings():
    data = {"controlplane": {"ingresses": [{"tls": {"enabled": False}}]}}
    common._set_by_path(data, "controlplane.ingresses[0].tls.secretName", "s")
    common._set_by_path(data, "controlplane.ingresses[0].hostname", "h")
    ing = data["controlplane"]["ingresses"][0]
    assert ing["tls"] == {"enabled": False, "secretName": "s"}   # sibling preserved
    assert ing["hostname"] == "h"


def test_set_by_path_list_growth_and_append():
    data = {}
    common._set_by_path(data, "a.b[2]", "x")             # grows list with None padding
    assert data == {"a": {"b": [None, None, "x"]}}
    common._set_by_path(data, "iatp.trustedIssuers", "i", mode="append")
    common._set_by_path(data, "iatp.trustedIssuers", "j", mode="append")
    assert data["iatp"]["trustedIssuers"] == ["i", "j"]


def test_set_by_path_invalid_segment_raises():
    with pytest.raises(ValueError, match="Invalid value mapping path segment"):
        common._set_by_path({}, "a..b", "x")


def test_set_by_path_type_conflict_raises_clearly():
    # Base has a scalar where the path wants to descend -> loud, clear error.
    with pytest.raises(ValueError, match="expected dict"):
        common._set_by_path({"tls": "yes"}, "tls.secretName", "s")
    with pytest.raises(ValueError, match="expected list"):
        common._set_by_path({"hosts": "single"}, "hosts[0]", "h")


# ---------------------------------------------------------------------------
# _resolve_mapping_value (transforms + source selectors)
# ---------------------------------------------------------------------------
def test_resolve_value_sources():
    assert common._resolve_mapping_value({"value": True}, {}) is True
    assert common._resolve_mapping_value({"template": "{name}-x"}, {"name": "e"}) == "e-x"
    assert common._resolve_mapping_value({"from": "bpn"}, {"bpn": "BPNL01"}) == "BPNL01"


def test_resolve_value_requires_a_source():
    with pytest.raises(ValueError, match="must define one of"):
        common._resolve_mapping_value({"path": "x"}, {})


def test_transform_urlencode():
    assert common._resolve_mapping_value(
        {"from": "bpn", "transform": "urlencode"}, {"bpn": "BPN L/01"}) == "BPN+L%2F01"


def test_transform_listtomap_merges():
    out = common._resolve_mapping_value(
        {"from": "anns", "transform": "listtomap"},
        {"anns": [{"a": "1"}, {"b": "2"}]},
    )
    assert out == {"a": "1", "b": "2"}


def test_transform_listtomap_rejects_non_map_item():
    with pytest.raises(ValueError, match="listtomap"):
        common._resolve_mapping_value({"from": "x", "transform": "listtomap"}, {"x": ["nope"]})


def test_unknown_transform_raises():
    with pytest.raises(ValueError, match="Unknown transform"):
        common._resolve_mapping_value({"value": "x", "transform": "bogus"}, {})


# ---------------------------------------------------------------------------
# apply_value_mappings / merge_value_mappings / resolve_version_entry
# ---------------------------------------------------------------------------
def test_apply_value_mappings_when_gating():
    data = {}
    mappings = [
        {"path": "always", "value": 1},
        {"path": "reg", "value": 1, "when": "registry.url"},
        {"path": "sub", "value": 1, "when": "submodel.url"},
    ]
    source = {"registry": {"url": "x"}, "submodel": {"url": ""}}
    common.apply_value_mappings(data, source, mappings)
    assert data == {"always": 1, "reg": 1}     # 'sub' gated off (empty url)


def test_apply_value_mappings_missing_path_raises():
    with pytest.raises(ValueError, match="missing required 'path'"):
        common.apply_value_mappings({}, {}, [{"value": 1}])


def test_get_field_path_and_condition_met():
    src = {"submodel": {"url": "u"}, "registry": {"url": ""}}
    assert common.get_field_path(src, "submodel.url") == "u"
    assert common.get_field_path(src, "registry.url") == ""
    assert common.get_field_path(src, "missing.url") is None
    assert common.get_field_path({"submodel": None}, "submodel.url") is None

    assert common.condition_met("always", {}) is True
    assert common.condition_met(None, {}) is True
    assert common.condition_met("submodel.url", src) is True
    assert common.condition_met("registry.url", src) is False   # empty string -> falsy
    assert common.condition_met("missing.url", src) is False
    with pytest.raises(ValueError):
        common.condition_met({"bad": 1}, {})


def test_merge_value_mappings_overrides_by_path_and_appends():
    base = [{"path": "a", "value": 1}, {"path": "b", "value": 2}]
    override = [{"path": "b", "value": 99}, {"path": "c", "value": 3}]
    merged = common.merge_value_mappings(base, override)
    assert merged == [{"path": "a", "value": 1}, {"path": "b", "value": 99}, {"path": "c", "value": 3}]


def test_resolve_version_entry():
    versions = [{"version": "1.0"}, {"version": "2.0"}]
    assert common.resolve_version_entry("2.0", versions) == {"version": "2.0"}
    assert common.resolve_version_entry("9.9", versions) is None
    assert common.resolve_version_entry("1.0", None) is None


def test_render_values_without_template_starts_empty():
    out = common.render_values({"name": "e"}, None, [{"path": "a.b", "template": "{name}"}])
    assert out == {"a": {"b": "e"}}


# ---------------------------------------------------------------------------
# EdcManager.prepare_deployment / deployments_for / all_release_names
# ---------------------------------------------------------------------------
@pytest.fixture
def manager(tmp_path):
    # A connector base values template on disk (versioned component).
    (tmp_path / "values-1.0.0.yaml").write_text("controlplane:\n  ingresses:\n    - {}\n")
    components = {
        "connector": {
            "deployWhen": "always",
            "releaseName": "{name}",
            "version": "{version}",
            "chart": {"name": "tractusx-connector", "repo": "tx"},
            "templatesDir": str(tmp_path) + "/",
            "versions": [{"version": "1.0.0", "valuesYaml": "values-1.0.0.yaml"}],
            "derive": {"cp_host": "{name}-{controlplane_hostname}"},
            "valueMappings": [
                {"path": "participant.id", "from": "bpn", "transform": "urlencode"},
                {"path": "controlplane.ingresses[0].hostname", "from": "cp_host"},
            ],
        },
        "submodelServer": {
            "deployWhen": "submodel.url",
            "releaseName": "{name}-sms",
            "chart": {"name": "simple-data-backend", "repo": "tx"},
            "versions": [{"version": "0.1.0"}],
            "valueMappings": [{"path": "fullnameOverride", "template": "{name}-sms"}],
        },
        "identityhub": {
            "deployWhen": "always",
            "releaseName": "{name}-idhub",
            "chart": {"name": "tractusx-identityhub", "repo": "tx"},
            "versions": [{"version": "v0.3.2"}, {"version": "v0.3.1"}],
            "valueMappings": [],
        },
        "broken": {"deployWhen": "always", "chart": {}},   # no chart.name
    }
    connector_cfg = {"hostname": {"controlplane": "cp.net", "dataplane": "dp.net"},
                     "sts": {}, "bdrs": {}, "didMethod": "did:web"}
    dataspace_cfg = {"ssi_wallet": {"url": "https://wallet.net"}, "authority_id": "BPNLAUTH"}
    return EdcManager(connector_cfg, dataspace_cfg, components)


def test_prepare_connector_uses_request_version_and_derivations(manager):
    plan = manager.prepare_deployment("connector", {"name": "e1", "bpn": "BPN/1", "version": "1.0.0"})
    assert plan["release_name"] == "e1"
    assert plan["chart"] == "tractusx-connector"
    assert plan["version"] == "1.0.0"
    assert plan["values"]["participant"]["id"] == "BPN%2F1"          # urlencoded
    assert plan["values"]["controlplane"]["ingresses"][0]["hostname"] == "e1-cp.net"  # derived


def test_prepare_component_defaults_to_latest_listed_version(manager):
    plan = manager.prepare_deployment("submodelServer", {"name": "e1"})
    assert plan["version"] == "0.1.0"                                 # versions[0]
    assert plan["release_name"] == "e1-sms"
    assert plan["values"] == {"fullnameOverride": "e1-sms"}

    idhub = manager.prepare_deployment("identityhub", {"name": "e1"})
    assert idhub["version"] == "v0.3.2"                               # latest listed


def test_prepare_unknown_component_and_missing_chart(manager):
    assert "error" in manager.prepare_deployment("nope", {"name": "e1"})
    err = manager.prepare_deployment("broken", {"name": "e1"})
    assert "chart.name" in err["error"]


def test_prepare_unsupported_version_is_reported(manager):
    plan = manager.prepare_deployment("connector", {"name": "e1", "version": "9.9.9"})
    assert "error" in plan and "Unsupported" in plan["error"]


def test_deployments_for_gates_on_request_fields(manager):
    # "broken" has no deployWhen -> always; submodelServer gates on submodel.url.
    with_submodel = {"name": "e1", "version": "1.0.0", "submodel": {"url": "u"}, "registry": {"url": ""}}
    assert manager.deployments_for(with_submodel) == ["connector", "submodelServer", "identityhub", "broken"]
    without = {"name": "e1", "version": "1.0.0", "submodel": {"url": ""}, "registry": {"url": ""}}
    assert manager.deployments_for(without) == ["connector", "identityhub", "broken"]
    # Missing fields entirely are treated as "not requested".
    assert manager.deployments_for({"name": "e1"}) == ["connector", "identityhub", "broken"]


def test_all_release_names_covers_every_component(manager):
    assert manager.all_release_names({"name": "e1"}) == ["e1", "e1-sms", "e1-idhub", "e1"]


def test_arbitrary_request_field_gates_and_maps(tmp_path):
    """A component gated/mapped on a field that is NOT declared on the Connector
    model still works, because the model accepts extra fields."""
    from models.connector import Connector

    components = {
        "connector": {"deployWhen": "always", "releaseName": "{name}",
                      "chart": {"name": "tractusx-connector", "repo": "tx"},
                      "versions": [{"version": "1.0.0"}], "valueMappings": []},
        # brand-new component, gated + mapped purely from an undeclared field
        "vault": {"deployWhen": "vault.url", "releaseName": "{name}-vault",
                  "chart": {"name": "vault", "repo": "tx"},
                  "versions": [{"version": "0.28.0"}],
                  "valueMappings": [{"path": "server.host", "from": "vault.url"}]},
    }
    mgr = EdcManager({"hostname": {}, "sts": {}, "bdrs": {}}, {"ssi_wallet": {}}, components)

    # The Connector model has no `vault` field, yet it round-trips as an extra.
    req = Connector(name="e1", bpn="B", version="1.0.0", url="u",
                    **{"vault": {"url": "https://vault.example"}})
    assert mgr.deployments_for(req) == ["connector", "vault"]

    req_off = Connector(name="e1", bpn="B", version="1.0.0", url="u")
    assert mgr.deployments_for(req_off) == ["connector"]   # no vault field -> skipped

    plan = mgr.prepare_deployment("vault", req)
    assert plan["values"]["server"]["host"] == "https://vault.example"
