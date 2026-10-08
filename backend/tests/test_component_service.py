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
"""The rules ComponentService enforces, exercised without a cluster or a database.

These moved out of the request handlers, where nothing could reach them without
Helm and Kubernetes. Everything the service collaborates with is passed in, so
each rule is now testable on its own.
"""
import pytest

from app.managers.cluster_manager import Phase, ReleaseStatus
from app.models.connector import ComponentRequest
from app.models.database import ConnectorDB
from app.services import component_service
from app.services.component_service import ComponentService
from app.utils import errors
from app.utils.ownership import ComponentScope

OURS = "BPNL0000000OURS"
THEIRS = "BPNL000000THEIRS"


def row(name, bpn=OURS, ctype="connector", release=None):
    return ConnectorDB(id=f"id-{name}", name=name, url="", bpn=bpn, namespace="ns",
                       status="active", config={"type": ctype,
                                                "release": release or name})


class FakeDatabase:
    def __init__(self, rows=()):
        self.rows = list(rows)
        self.deleted = []
        self.written = []

    def get_all_connectors(self, bpn=None):
        return [r for r in self.rows if bpn is None or r.bpn == bpn]

    def get_connector_by_name(self, name, bpn=None):
        for r in self.rows:
            if r.name == name and (bpn is None or r.bpn == bpn):
                return r
        return None

    def get_connector_by_id(self, connector_id, bpn=None):
        for r in self.rows:
            if r.id == connector_id and (bpn is None or r.bpn == bpn):
                return r
        return None

    def create_connector(self, connector):
        self.rows.append(connector)
        self.written.append(connector)
        return connector

    def update_connector(self, connector):
        self.written.append(connector)
        return connector

    def delete_connector(self, connector_id):
        self.deleted.append(connector_id)
        self.rows = [r for r in self.rows if r.id != connector_id]
        return True


class FakeEdcService:
    def __init__(self, exists=True, verify_raises=None):
        self.exists = exists
        self.verify_raises = verify_raises
        self.installed = []
        self.uninstalled = []

    async def release_exists(self, release_name, namespace):
        if self.verify_raises is not None:
            raise self.verify_raises
        return self.exists

    async def install_or_upgrade(self, **kwargs):
        self.installed.append(kwargs)

    async def uninstall(self, release_name, namespace):
        self.uninstalled.append((release_name, namespace))


class FakeCluster:
    def collect(self):
        return {}

    def statuses_from(self, facts):
        return {}

    def resolve(self, statuses, release):
        return ReleaseStatus(Phase.NOT_FOUND, detail="")


class FakeEdcManager:
    def prepare_deployment(self, component_type, source):
        return {"release_name": source.name, "chart": "chart", "repo": "repo",
                "version": "1.0.0", "values": {}}

    def component_reachable(self, record, base_url):
        return {"url": base_url, "status_code": 200, "reachable": True, "detail": ""}


def service(database=None, edc_service=None):
    return ComponentService(database=database or FakeDatabase(),
                            cluster=FakeCluster(),
                            edc_manager=FakeEdcManager(),
                            edc_service=edc_service or FakeEdcService())


def request(name, ctype="connector", **extra):
    return ComponentRequest(type=ctype, name=name, **extra)


@pytest.fixture
def scope():
    return ComponentScope(OURS)


@pytest.fixture(autouse=True)
def _cap_of_two(monkeypatch):
    monkeypatch.setattr(component_service.config, "component_instance_limit",
                        lambda component_type: 2)
    monkeypatch.setattr(component_service.config, "cluster_namespace", lambda: "ns")
    monkeypatch.setattr(component_service.config, "connector_hostnames", lambda: {})
    monkeypatch.setattr(component_service.config, "connector_endpoints", lambda: {})


# -- ownership ---------------------------------------------------------------
@pytest.mark.asyncio
async def test_a_component_requested_under_another_bpn_is_refused(scope):
    with pytest.raises(errors.EmcError) as error:
        await service().deploy([request("edc1", bpn=THEIRS)], scope)
    assert error.value.status == 403
    assert error.value.code == "SESSION_BPN_MISMATCH"


@pytest.mark.asyncio
async def test_the_callers_bpn_is_stamped_onto_every_component(scope):
    database = FakeDatabase()
    components = [request("edc1"), request("dtr1", "digitalTwinRegistry")]
    await service(database).deploy(components, scope)
    assert [c.bpn for c in components] == [OURS, OURS]
    assert {r.bpn for r in database.rows} == {OURS}


@pytest.mark.asyncio
async def test_a_name_owned_by_another_company_is_refused(scope):
    """Names become Helm release names in one shared namespace, so an unscoped
    lookup is what decides whether a name is free at all."""
    database = FakeDatabase([row("edc1", bpn=THEIRS)])
    with pytest.raises(errors.ComponentNameTaken):
        await service(database).deploy([request("edc1")], scope)


# -- limits ------------------------------------------------------------------
@pytest.mark.asyncio
async def test_deploying_past_the_cap_is_refused(scope):
    database = FakeDatabase([row("edc1"), row("edc2")])
    with pytest.raises(errors.ComponentLimitExceeded) as error:
        await service(database).deploy([request("edc3")], scope)
    assert error.value.status == 409


@pytest.mark.asyncio
async def test_redeploying_an_existing_name_at_the_cap_is_an_upgrade(scope):
    """Otherwise upgrading a component while at the limit would be impossible."""
    database = FakeDatabase([row("edc1"), row("edc2")])
    deployed = await service(database).deploy([request("edc1")], scope)
    assert [entry["name"] for entry in deployed] == ["edc1"]


@pytest.mark.asyncio
async def test_the_cap_is_counted_within_the_callers_own_bpn(scope):
    """One company filling its quota must not block another."""
    database = FakeDatabase([row("a", bpn=THEIRS), row("b", bpn=THEIRS)])
    assert await service(database).deploy([request("ours1")], scope)


@pytest.mark.asyncio
async def test_a_duplicate_name_in_one_payload_is_refused(scope):
    with pytest.raises(errors.DuplicateComponentName):
        await service().deploy([request("edc1"), request("edc1", "submodelServer")], scope)


@pytest.mark.asyncio
async def test_an_over_limit_request_deploys_nothing_at_all(scope):
    """The checks are pre-flight, so a refused request leaves the cluster alone
    rather than installing the first few components and failing part-way."""
    database = FakeDatabase([row("edc1"), row("edc2")])
    edc_service = FakeEdcService()
    with pytest.raises(errors.ComponentLimitExceeded):
        await service(database, edc_service).deploy(
            [request("dtr1", "digitalTwinRegistry"), request("edc3")], scope)
    assert edc_service.installed == []


# -- deploy and delete -------------------------------------------------------
@pytest.mark.asyncio
async def test_deploy_installs_the_release_and_persists_a_row(scope):
    database = FakeDatabase()
    edc_service = FakeEdcService()
    deployed = await service(database, edc_service).deploy([request("edc1")], scope)

    assert deployed == [{"type": "connector", "name": "edc1",
                         "release": "edc1", "version": "1.0.0"}]
    assert edc_service.installed[0]["release_name"] == "edc1"
    assert [r.name for r in database.rows] == ["edc1"]


@pytest.mark.asyncio
async def test_a_client_supplied_db_password_is_replaced(scope):
    """The frontend derives it from the component name, so it is guessable by
    anyone who can read the dashboard."""
    database = FakeDatabase()
    component = request("edc1", auth={"db_password": "edc1-password"})
    await service(database).deploy([component], scope)
    assert component.auth["db_password"] != "edc1-password"
    assert len(component.auth["db_password"]) > 20


@pytest.mark.asyncio
async def test_delete_uninstalls_the_release_and_drops_the_row(scope):
    database = FakeDatabase([row("edc1")])
    edc_service = FakeEdcService()
    assert await service(database, edc_service).delete("edc1", scope) == "edc1"
    assert edc_service.uninstalled == [("edc1", "ns")]
    assert database.rows == []


@pytest.mark.asyncio
async def test_deleting_a_component_of_another_company_is_not_found(scope):
    """Answered "not found" rather than "forbidden", so the API never confirms
    that another company's component exists."""
    database = FakeDatabase([row("edc1", bpn=THEIRS)])
    edc_service = FakeEdcService()
    with pytest.raises(errors.NotFound):
        await service(database, edc_service).delete("edc1", scope)
    assert edc_service.uninstalled == []


# -- reconciliation ----------------------------------------------------------
@pytest.mark.asyncio
async def test_a_row_whose_release_is_gone_is_pruned(scope):
    database = FakeDatabase([row("edc1")])
    listing = await service(database, FakeEdcService(exists=False)).list_components(scope)
    assert listing == []
    assert database.deleted == ["id-edc1"]


@pytest.mark.asyncio
async def test_an_unreachable_cluster_keeps_the_row(scope):
    """"Could not ask" is not "confirmed gone" - a network blip must not look
    like a deleted component and invite the dashboard to clean it up."""
    edc_service = FakeEdcService(verify_raises=RuntimeError("Kubernetes cluster unreachable"))
    database = FakeDatabase([row("edc1")])
    listing = await service(database, edc_service).list_components(scope)
    assert [entry["name"] for entry in listing] == ["edc1"]
    assert database.deleted == []
