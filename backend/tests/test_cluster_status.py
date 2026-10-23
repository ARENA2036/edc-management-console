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

from app.managers.cluster_manager import (ClusterManager, Phase, Workload,
                                          _ReleaseFacts, _Snapshot)


def workload(name, desired=1, ready=1):
    return Workload(name=name, kind="Deployment", desired=desired, ready=ready)


def by_name(*workloads):
    return {w.name: w for w in workloads}


def phase(expected, *workloads, labelled=None, failures=(), progress_failures=()):
    """The verdict on a release, given what exists in the namespace.

    `labelled` narrows which of those workloads carry the release label;
    everything exists either way, which is the distinction that matters.
    """
    carry_label = workloads if labelled is None else labelled
    facts = _ReleaseFacts(workloads=list(carry_label), failures=list(failures),
                          progress_failures=list(progress_failures))
    return ClusterManager._phase_of(facts, expected, by_name(*workloads))

CONNECTOR = ("edc1-controlplane", "edc1-dataplane")


def test_a_release_whose_planes_do_not_exist_yet_is_still_deploying():
    """Vault and Postgres come up first. Every workload of the release is ready
    at that point, which used to read as active for a connector whose two planes
    had not been created."""
    status = phase(CONNECTOR, workload("edc1-vault"), workload("edc1-postgresql"))
    assert status.phase == Phase.DEPLOYING
    assert "edc1-controlplane" in status.detail and "edc1-dataplane" in status.detail


def test_a_release_missing_only_its_data_plane_is_not_active():
    status = phase(CONNECTOR, workload("edc1-controlplane"), workload("edc1-vault"))
    assert status.phase == Phase.DEPLOYING
    assert "edc1-dataplane" in status.detail


def test_a_release_is_active_once_every_workload_including_both_planes_is_ready():
    status = phase(CONNECTOR, workload("edc1-controlplane"), workload("edc1-dataplane"),
                   workload("edc1-vault"), workload("edc1-postgresql"))
    assert status.phase == Phase.ACTIVE


def test_a_workload_the_chart_left_unlabelled_still_counts_as_the_releases_own():
    """The release names it, so it is the release's. Requiring the label as well
    reports a perfectly healthy workload missing for as long as it runs - which
    is what left a fully rolled-out connector stuck on "Deploying"."""
    cp, dp = workload("edc1-controlplane"), workload("edc1-dataplane")
    status = phase(CONNECTOR, cp, dp, labelled=[cp])
    assert status.phase == Phase.ACTIVE


def test_whatever_the_chart_names_its_workloads_is_what_is_expected():
    """Helm names a chart's workloads `<release>-<chart>-<part>` unless the
    release name already contains the chart name. Nothing here guesses which:
    the names come from the manifest, so both spellings just work."""
    named = ("edc1-tractusx-connector-controlplane", "edc1-tractusx-connector-dataplane")
    status = phase(named, *(workload(name) for name in named))
    assert status.phase == Phase.ACTIVE


def test_a_plane_that_exists_but_has_no_ready_replica_is_not_active():
    status = phase(CONNECTOR, workload("edc1-controlplane"),
                   workload("edc1-dataplane", ready=0))
    assert status.phase == Phase.DEGRADED


def test_a_crash_looping_container_outranks_a_missing_plane():
    """A component that cannot start is failed, not "still deploying" - saying
    it is rolling out invites waiting for something that will never arrive."""
    status = phase(CONNECTOR, workload("edc1-controlplane", ready=0),
                   failures=["edc1-controlplane-0: CrashLoopBackOff"])
    assert status.phase == Phase.FAILED


def test_a_release_with_no_expectation_is_judged_on_replicas():
    """Helm could not be asked, so the replica counts are all there is."""
    assert phase((), workload("dtr1")).phase == Phase.ACTIVE


def test_a_release_with_nothing_in_the_namespace_is_not_found():
    assert phase(CONNECTOR).phase == Phase.NOT_FOUND


def test_statuses_only_apply_an_expectation_to_the_release_it_belongs_to():
    manager = ClusterManager(namespace="ns", apps_api=object(), core_api=object())
    vault, dtr = workload("edc1-vault"), workload("dtr1")
    statuses = manager.statuses_from(
        _Snapshot(releases={"edc1": _ReleaseFacts(workloads=[vault]),
                            "dtr1": _ReleaseFacts(workloads=[dtr])},
                  workloads=by_name(vault, dtr)),
        {"edc1": CONNECTOR})
    assert statuses["edc1"].phase == Phase.DEPLOYING
    assert statuses["dtr1"].phase == Phase.ACTIVE


def test_a_release_whose_workloads_are_all_unlabelled_is_still_reported():
    """Nothing carries the label, so grouping by label alone would not know the
    release exists at all."""
    cp, dp = workload("edc1-controlplane"), workload("edc1-dataplane")
    manager = ClusterManager(namespace="ns", apps_api=object(), core_api=object())
    statuses = manager.statuses_from(_Snapshot(releases={}, workloads=by_name(cp, dp)),
                                     {"edc1": CONNECTOR})
    assert statuses["edc1"].phase == Phase.ACTIVE
