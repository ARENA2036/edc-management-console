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
import asyncio

import pytest
import yaml

from app.managers.edc_manager import EdcManager
from app.services.edc_service import EdcService

REQUEST = {
    "name": "cx-1",
    "version": "0.13.0-021daa74",
    "bpn": "BPNL000000000001",
    "db_name": "cx-1-db",
    "auth": {"db_username": "cx-1-user", "db_password": "secret"},
}


@pytest.fixture(scope="module")
def manager():
    with open("config/configuration.yml") as file:
        config = yaml.safe_load(file)
    return EdcManager(config["connector"], config["dataspaceConfig"], config["components"])


@pytest.fixture(scope="module")
def plan(manager):
    plan = manager.prepare_deployment("constructxConnector", REQUEST)
    assert "error" not in plan, plan
    return plan


def test_deploys_the_vendored_chart_without_a_helm_version(plan):
    assert plan["chart"] == "config/constructx-connector"
    assert plan["repo"] is None and plan["chart_version"] is None
    assert plan["version"] == "0.13.0-021daa74"
    assert plan["release_name"] == "cx-1"


def test_identity_uses_the_connectors_own_did(plan):
    values = plan["values"]
    did = "did:web:cx-1-wallet.txcd.arena2036-x.de"
    assert values["participant"]["id"] == did
    assert values["iatp"]["id"] == did
    assert values["iatp"]["sts"]["oauth"]["client"]["id"] == did
    assert values["iatp"]["sts"]["oauth"]["token_url"] == "http://cx-1-wallet:9292/api/sts/token"
    assert values["iatp"]["trustedIssuerId"] == "did:web:issuer.txcd.arena2036-x.de"
    assert values["iatp"]["trustedIssuers"] == ["did:web:issuer.txcd.arena2036-x.de"]


def test_chart_default_staging_identities_are_overridden(plan):
    for plane in ("controlplane", "dataplane"):
        env = plan["values"][plane]["env"]
        assert env["EDC_IAM_ISSUER_ID"] == "did:web:cx-1-wallet.txcd.arena2036-x.de"
        assert env["EDC_IAM_STS_OAUTH_CLIENT_SECRET_ALIAS"] == "sts-client-secret"
    dp_env = plan["values"]["dataplane"]["env"]
    assert dp_env["EDC_IAM_TRUSTED-ISSUER_EXAMPLE_ID"] == "did:web:issuer.txcd.arena2036-x.de"


def test_release_unique_names_and_ingresses(plan):
    values = plan["values"]
    assert values["nameOverride"] == "cx-1"
    cp, dp = values["controlplane"]["ingresses"], values["dataplane"]["ingresses"]
    assert cp[0]["hostname"] == "cx-1-controlplane.txcd.arena2036-x.de"
    assert cp[0]["endpoints"][:2] == ["protocol", "management"]
    assert dp[0]["hostname"] == "cx-1-dataplane.txcd.arena2036-x.de"
    assert cp[1]["enabled"] is False and dp[1]["enabled"] is False


def test_images_and_pull_secrets_are_set_per_plane(plan):
    for plane in ("controlplane", "dataplane"):
        assert plan["values"][plane]["image"]["repository"].startswith("ghcr.io/project-construct-x/")
        assert plan["values"][plane]["imagePullSecrets"] == [{"name": "ghcr-creds"}]


def test_postgres_uses_the_cloudpirates_image_and_the_component_db(plan):
    postgres = plan["values"]["postgresql"]
    assert postgres["image"] == {"registry": "docker.io", "repository": "postgres", "tag": "18.3"}
    assert postgres["jdbcUrl"] == "jdbc:postgresql://cx-1-postgresql:5432/cx-1-db"
    assert postgres["auth"] == {"database": "cx-1-db", "username": "cx-1-user", "password": "secret"}


def test_it_is_a_connector_and_offered_by_version(manager):
    assert manager.is_connector_type("constructxConnector")
    assert manager.is_connector_type("connector")
    assert not manager.is_connector_type("submodelServer")
    versions = [v["version"] for v in manager.components["constructxConnector"]["versions"]]
    assert versions == ["0.13.0-021daa74"]


class _RecordingCommand:
    def __init__(self):
        self.calls = []

    async def run(self, command, input=None):
        self.calls.append(command)
        return b""


def _service_with(command):
    service = EdcService()
    service._command = command
    return service


def test_dependencies_are_built_once_for_a_local_chart_with_dependencies(tmp_path):
    chart = tmp_path / "chart"
    chart.mkdir()
    (chart / "Chart.yaml").write_text(
        "name: c\nversion: 1.0.0\ndependencies:\n  - name: vault\n    version: 0.28.0\n")
    command = _RecordingCommand()
    service = _service_with(command)

    first = asyncio.run(service._with_dependencies(str(chart)))
    second = asyncio.run(service._with_dependencies(str(chart)))

    assert first == second == str(chart)          # writable: built in place
    assert command.calls == [["dependency", "build", str(chart)]]


def test_a_local_chart_without_dependencies_is_left_alone(tmp_path):
    chart = tmp_path / "chart"
    chart.mkdir()
    (chart / "Chart.yaml").write_text("name: c\nversion: 1.0.0\n")
    command = _RecordingCommand()

    assert asyncio.run(_service_with(command)._with_dependencies(str(chart))) == str(chart)
    assert command.calls == []


def test_a_read_only_chart_is_built_on_a_copy(tmp_path, monkeypatch):
    chart = tmp_path / "chart"
    chart.mkdir()
    (chart / "Chart.yaml").write_text("name: c\nversion: 1.0.0\ndependencies:\n  - name: vault\n")
    monkeypatch.setattr("app.services.edc_service.os.access", lambda path, mode: False)
    monkeypatch.setattr("app.services.edc_service.tempfile.gettempdir", lambda: str(tmp_path / "tmp"))
    command = _RecordingCommand()

    built = asyncio.run(_service_with(command)._with_dependencies(str(chart)))

    assert built.startswith(str(tmp_path / "tmp" / "emc-charts" / "chart-"))
    assert (tmp_path / "tmp" / "emc-charts").exists()
    assert command.calls == [["dependency", "build", built]]
