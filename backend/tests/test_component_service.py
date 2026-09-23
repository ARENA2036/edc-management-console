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
from sqlalchemy.exc import IntegrityError

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
    def __init__(self, rows=(), raise_on_create=None):
        self.rows = list(rows)
        self.deleted = []
        self.written = []
        self._raise_on_create = raise_on_create

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
        if self._raise_on_create is not None:
            raise self._raise_on_create
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
    def __init__(self, exists=True, verify_raises=None, workloads=()):
        self.exists = exists
        self.verify_raises = verify_raises
        self.workloads = list(workloads)
        self.installed = []
        self.uninstalled = []

    async def release_workloads(self, release_name, namespace):
        return list(self.workloads)

    async def release_exists(self, release_name, namespace):
        if self.verify_raises is not None:
            raise self.verify_raises
        return self.exists

    async def install_or_upgrade(self, **kwargs):
        self.installed.append(kwargs)

    async def uninstall(self, release_name, namespace):
        self.uninstalled.append((release_name, namespace))


class FakeCluster:
    def __init__(self):
        self.expected = None

    def collect(self):
        return {}

    def statuses_from(self, facts, expected=None):
        self.expected = expected
        return {}

    def resolve(self, statuses, release):
        return ReleaseStatus(Phase.NOT_FOUND, detail="")


class FakeEdcManager:
    def prepare_deployment(self, component_type, source):
        return {"release_name": source.name, "chart": "chart", "repo": "repo",
                "version": "1.0.0", "chart_version": "1.0.0", "values": {}}

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


@pytest.mark.asyncio
async def test_a_name_taken_by_a_concurrent_request_is_a_conflict_not_a_500(scope):
    database = FakeDatabase(raise_on_create=IntegrityError("INSERT", {}, Exception("UNIQUE")))
    with pytest.raises(errors.ComponentNameTaken) as error:
        await service(database).deploy([request("edc1")], scope)
    assert error.value.status == 409


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
    deployed = await service(database).deploy([request("ours1")], scope)
    assert [entry["name"] for entry in deployed] == ["ours1"]


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

def connector_row(cp_hostname=None, dp_hostname=None):
    return ConnectorDB(id="id-edc1", name="edc1", url="", bpn=OURS, namespace="ns",
                       status="active", config={"type": "connector", "release": "edc1"},
                       cp_hostname=cp_hostname, dp_hostname=dp_hostname)


def test_both_planes_are_published_as_absolute_urls():
    endpoints = ComponentService._endpoints_for(
        connector_row(cp_hostname="edc1-controlplane.example.de",
                      dp_hostname="edc1-dataplane.example.de"))
    assert endpoints == {"controlPlane": "https://edc1-controlplane.example.de",
                         "dataPlane": "https://edc1-dataplane.example.de"}


def test_a_component_without_planes_publishes_no_endpoints():
    """A submodel server or registry has no planes, so it gets an empty map
    rather than keys holding empty strings a caller would have to filter."""
    assert ComponentService._endpoints_for(connector_row()) == {}


@pytest.mark.asyncio
async def test_the_listing_carries_the_data_plane_alongside_the_control_plane(scope):
    database = FakeDatabase([connector_row(cp_hostname="edc1-controlplane.example.de",
                                           dp_hostname="edc1-dataplane.example.de")])
    listing = await service(database).list_components(scope)
    assert listing[0]["endpoints"]["dataPlane"] == "https://edc1-dataplane.example.de"
@pytest.mark.asyncio
async def test_a_freshly_deployed_component_is_recorded_as_deploying(scope):
    database = FakeDatabase()
    await service(database).deploy([request("edc1")], scope)
    assert database.rows[0].status == Phase.DEPLOYING


@pytest.mark.asyncio
async def test_a_redeploy_drops_an_existing_row_back_to_deploying(scope):
    database = FakeDatabase([row("edc1")])
    await service(database).deploy([request("edc1")], scope)
    assert database.rows[0].status == Phase.DEPLOYING


@pytest.mark.asyncio
async def test_each_release_is_judged_against_the_workloads_helm_says_it_applies(scope):
    database = FakeDatabase([row("edc1", release="edc1-release")])
    edc_service = FakeEdcService(workloads=["edc1-controlplane", "edc1-dataplane"])
    svc = service(database, edc_service)
    await svc.list_components(scope)
    assert svc.cluster.expected == {
        "edc1-release": ["edc1-controlplane", "edc1-dataplane"]}


@pytest.mark.asyncio
async def test_a_release_helm_cannot_describe_is_judged_on_replicas_alone(scope):
    """An empty manifest read is no expectation, which is how this behaved
    before Helm was consulted - a hiccup costs precision, never the status."""
    database = FakeDatabase([row("edc1")])
    svc = service(database, FakeEdcService(workloads=[]))
    await svc.list_components(scope)
    assert svc.cluster.expected == {}


@pytest.mark.asyncio
async def test_a_pruned_row_is_not_asked_about(scope):
    """Reading the manifest of a release that has just been reconciled away
    would be a Helm call per refresh for a component that no longer exists."""
    database = FakeDatabase([row("edc1")])
    svc = service(database, FakeEdcService(exists=False, workloads=["edc1-controlplane"]))
    assert await svc.list_components(scope) == []
    assert svc.cluster.expected == {}
