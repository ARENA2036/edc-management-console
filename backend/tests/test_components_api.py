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
"""The components routes: what URL reaches which call, and what comes back.

The handlers hold no logic now, so what is worth testing is the wiring - route
order, the dependency graph, and that a raised error becomes the envelope
without any handler catching it.
"""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import main
from app.api.dependencies import (get_admin_scope, get_component_service,
                                  get_current_user, get_scope)
from app.utils.errors import NotFound
from app.utils.ownership import ComponentScope

USER = {"preferred_username": "tester", "bpn": "BPNL0000000TEST", "roles": ("Admin",)}


class FakeService:
    def __init__(self, get_raises=None):
        self.calls = []
        self.get_raises = get_raises

    async def list_components(self, scope):
        self.calls.append("list_components")
        return [{"name": "edc1"}]

    async def health_of_all(self, scope):
        self.calls.append("health_of_all")
        return [{"name": "edc1", "phase": "active"}]

    async def health_of(self, name, scope):
        self.calls.append(("health_of", name))
        return {"name": name, "phase": "active"}

    def get(self, component_id, scope):
        self.calls.append(("get", component_id))
        if self.get_raises is not None:
            raise self.get_raises
        return SimpleNamespace(to_dict=lambda: {"id": component_id})

    async def deploy(self, components, scope):
        self.calls.append(("deploy", [c.name for c in components]))
        return [{"name": c.name} for c in components]

    async def delete(self, name, scope):
        self.calls.append(("delete", name))
        return name


@pytest.fixture
def service():
    return FakeService()


@pytest.fixture
def client(service):
    scope = ComponentScope("BPNL0000000TEST")
    main.app.dependency_overrides.update({
        get_component_service: lambda: service,
        get_scope: lambda: scope,
        get_admin_scope: lambda: scope,
        get_current_user: lambda: USER,
    })
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_the_health_listing_is_not_captured_by_the_id_route(client, service):
    """/components/health has to be declared before /components/{component_id};
    swap them and this URL silently becomes a lookup for a component called
    "health"."""
    assert client.get("/api/components/health").status_code == 200
    assert service.calls == ["health_of_all"]


def test_a_named_component_reaches_the_single_health_route(client, service):
    assert client.get("/api/components/edc1/health").status_code == 200
    assert service.calls == [("health_of", "edc1")]


def test_listing_components_returns_the_data_envelope(client):
    response = client.get("/api/components")
    assert response.status_code == 200
    assert response.json() == {"data": [{"name": "edc1"}]}


def test_a_component_lookup_reaches_the_id_route(client, service):
    response = client.get("/api/components/abc-123")
    assert response.status_code == 200
    assert response.json() == {"user": "tester", "data": {"id": "abc-123"}}
    assert service.calls == [("get", "abc-123")]


def test_a_not_found_raised_by_the_service_becomes_the_error_envelope(client):
    """Nothing in the router catches this. The registered EmcError handler turns
    it into the envelope, with a correlation id."""
    main.app.dependency_overrides[get_component_service] = lambda: FakeService(
        get_raises=NotFound("No component with id 'nope' is known to this console.",
                            code="COMPONENT_NOT_FOUND"))

    response = client.get("/api/components/nope")
    body = response.json()
    assert response.status_code == 404
    assert body["code"] == "COMPONENT_NOT_FOUND"
    assert body["stage"] == "request"
    assert body["errorId"]


def test_deploying_passes_the_payload_through(client, service):
    response = client.post("/api/component", json={
        "components": [{"type": "connector", "name": "edc1"}]})
    assert response.status_code == 200
    assert response.json()["data"] == {"deployed": [{"name": "edc1"}]}
    assert service.calls == [("deploy", ["edc1"])]


def test_deleting_reports_the_name_it_removed(client, service):
    response = client.delete("/api/components/edc1")
    assert response.status_code == 200
    assert response.json()["message"] == "Deleted 'edc1'"
    assert service.calls == [("delete", "edc1")]


def test_a_malformed_deploy_payload_is_a_422_naming_the_field(client):
    response = client.post("/api/component", json={"components": [{"name": "edc1"}]})
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_FAILED"
    assert "type" in response.json()["detail"]


def test_the_runtime_is_required_before_a_request_can_be_served():
    """Nothing is built at import; the lifespan builds it. Without that, a route
    that needs the runtime says so rather than failing on a missing global."""
    main.app.dependency_overrides[get_scope] = lambda: ComponentScope("BPNL0000000TEST")
    try:
        response = TestClient(main.app).get("/api/components")
        assert response.status_code == 503
        assert response.json()["code"] == "NOT_READY"
    finally:
        main.app.dependency_overrides.clear()
