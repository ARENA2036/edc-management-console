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
import pytest
import yaml

from app.managers.edc_manager import EdcManager

REQUEST = {
    "name": "cx-1-wallet",
    "version": "0.18.0-2",
    "db_name": "cx-1-wallet-db",
    "auth": {"db_username": "cx-1-wallet-user", "db_password": "secret"},
}


@pytest.fixture(scope="module")
def plan():
    with open("config/configuration.yml") as file:
        config = yaml.safe_load(file)
    manager = EdcManager(config["connector"], config["dataspaceConfig"], config["components"])
    plan = manager.prepare_deployment("constructxWallet", REQUEST)
    assert "error" not in plan, plan
    return plan


def test_deploys_the_vendored_chart_with_the_version_as_image_tag(plan):
    assert plan["chart"] == "config/constructx-wallet"
    assert plan["chart_version"] is None and plan["version"] == "0.18.0-2"
    assert plan["values"]["wallet"]["image"]["tag"] == "0.18.0-2"
    assert plan["values"]["imagePullSecrets"] == [{"name": "ghcr-creds"}]


def test_release_unique_names_match_the_connectors_wallet_service(plan):
    assert plan["values"]["fullnameOverride"] == "cx-1-wallet"


def test_wallet_host_and_ingress(plan):
    wallet = plan["values"]["wallet"]
    assert wallet["hostname"] == "cx-1-wallet.txcd.arena2036-x.de"
    ingress = wallet["ingresses"][0]
    assert ingress["hostname"] == "cx-1-wallet.txcd.arena2036-x.de"
    assert ingress["tls"]["secretName"] == "cx-1-wallet-tls"
    assert ingress["enabled"] is True and ingress["tls"]["enabled"] is True
    assert ingress["endpoints"] == ["credentials", "did", "sts"]
    assert ingress["annotations"]["external-dns.alpha.kubernetes.io/hostname"] == ingress["hostname"]


def test_superuser_key_is_not_the_chart_default(plan):
    assert plan["values"]["wallet"]["superuser"]["apiKey"] == "YWRtaW4.secret"


def test_postgres_uses_the_component_db(plan):
    postgres = plan["values"]["postgresql"]
    assert postgres["jdbcUrl"] == "jdbc:postgresql://cx-1-wallet-postgresql:5432/cx-1-wallet-db"
    assert postgres["auth"] == {"database": "cx-1-wallet-db", "username": "cx-1-wallet-user",
                                "password": "secret"}
