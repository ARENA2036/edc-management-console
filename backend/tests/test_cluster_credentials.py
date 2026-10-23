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
"""Which credentials the status reader authenticates with.

Components are deployed by Helm, which runs with the kubeconfig the container
entrypoint fetches into KUBECONFIG. Reading their status must use that same
identity: when components live in a namespace other than the backend pod's own,
the pod's service account has no rights there, so the deploy succeeds while the
status read comes back 403 and the dashboard reports a perfectly healthy
component as "unknown".

In-cluster credentials always load successfully inside a pod, so preferring
them silently masks the kubeconfig. These tests pin the order, which is
otherwise invisible: every other test injects both API clients and therefore
never reaches ``_ensure_clients``.

No cluster is required - the loaders are stubbed.
"""

import logging

import pytest

from app.managers.cluster_manager import ClusterManager, Phase


class FakeConfig:
    """Stands in for ``kubernetes.config``, recording what was attempted."""

    def __init__(self, kubeconfig_error=None, incluster_error=None):
        self._kubeconfig_error = kubeconfig_error
        self._incluster_error = incluster_error
        self.attempted = []

    def load_kube_config(self):
        self.attempted.append("kubeconfig")
        if self._kubeconfig_error:
            raise self._kubeconfig_error

    def load_incluster_config(self):
        self.attempted.append("in-cluster")
        if self._incluster_error:
            raise self._incluster_error


@pytest.fixture
def manager():
    return ClusterManager(namespace="edc-management-console")


def test_the_kubeconfig_helm_uses_is_preferred(manager):
    """The regression: reading status as the pod's own service account is
    forbidden whenever components are deployed outside the pod's namespace."""
    config = FakeConfig()

    assert manager._load_credentials(config) is True
    assert config.attempted == ["kubeconfig"]
    assert manager.last_error is None


def test_in_cluster_is_the_fallback_when_there_is_no_kubeconfig(manager):
    config = FakeConfig(kubeconfig_error=RuntimeError("no kubeconfig found"))

    assert manager._load_credentials(config) is True
    assert config.attempted == ["kubeconfig", "in-cluster"]
    assert manager.last_error is None


def test_both_failing_is_reported_and_names_each_attempt(manager):
    config = FakeConfig(kubeconfig_error=RuntimeError("no kubeconfig found"),
                        incluster_error=RuntimeError("not in a cluster"))

    assert manager._load_credentials(config) is False
    assert config.attempted == ["kubeconfig", "in-cluster"]
    assert "kubeconfig: no kubeconfig found" in manager.last_error
    assert "in-cluster: not in a cluster" in manager.last_error


def test_the_chosen_credentials_are_logged(manager, caplog):
    """Which identity the reader used is the first thing to check when status
    comes back forbidden, so it belongs in the log."""
    with caplog.at_level(logging.INFO, logger="app.managers.cluster_manager"):
        assert manager._load_credentials(
            FakeConfig(kubeconfig_error=RuntimeError("none"))) is True

    assert "in-cluster" in caplog.text


def test_an_unreadable_namespace_is_unknown_and_carries_the_reason(manager):
    """Fail-soft is the contract, and UNKNOWN must not be confused with
    NOT_FOUND: a forbidden read is not a deleted component."""
    manager.last_error = "could not list deployments (403 Forbidden)"

    status = manager.resolve(None, "cx-operator-edc")

    assert status.phase == Phase.UNKNOWN
    assert "403 Forbidden" in status.detail
    assert status.to_dict()["workloads"] == []


def test_an_empty_namespace_is_not_found_rather_than_unknown(manager):
    status = manager.resolve({}, "cx-operator-edc")

    assert status.phase == Phase.NOT_FOUND
