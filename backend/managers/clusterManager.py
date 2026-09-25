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

"""What the cluster actually says about a deployed component.

The console used to infer a component's state by calling its public health
endpoint. That answers "is this reachable from the internet", which is a
different question from "is this running" - and it answered it wrongly for the
connector, whose health path is deliberately not routed by the ingress.

Kubernetes already knows the answer. Every chart labels its workloads with
``app.kubernetes.io/instance: <release>``, so the desired/ready replica counts
of the Deployments and StatefulSets carrying that label are the authoritative
state of one component, including the couple of minutes it takes to roll out.

Reads only. Nothing here mutates the cluster.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

RELEASE_LABEL = "app.kubernetes.io/instance"

TERMINAL_WAIT_REASONS = frozenset({
    "CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull", "InvalidImageName",
    "CreateContainerConfigError", "CreateContainerError",
})


def _probe_service_names(release: str):
    return (f"{release}-controlplane", release)

PROBE_PORT_NAMES = ("default", "http", "http-web")
PROBE_PORT_FALLBACK = 8080


class Phase:
    """The component states this console reports. Part of the API contract."""

    ACTIVE = "active"          # every workload has all replicas ready
    DEPLOYING = "deploying"    # rolling out; nothing ready yet, nothing failed
    DEGRADED = "degraded"      # some replicas ready, some not
    FAILED = "failed"          # a container cannot start, or the rollout gave up
    NOT_FOUND = "not_found"    # no workloads carry this release's label
    UNKNOWN = "unknown"        # the cluster could not be asked


@dataclass(frozen=True)
class Workload:
    """One Deployment or StatefulSet belonging to a release."""

    name: str
    kind: str
    desired: int
    ready: int

    def to_dict(self) -> dict:
        return {"name": self.name, "kind": self.kind,
                "desired": self.desired, "ready": self.ready}


@dataclass(frozen=True)
class ReleaseStatus:
    """The cluster's verdict on one release."""

    phase: str
    workloads: Tuple[Workload, ...] = ()
    detail: str = ""

    @property
    def is_active(self) -> bool:
        return self.phase == Phase.ACTIVE

    def to_dict(self) -> dict:
        return {
            "phase": self.phase,
            "detail": self.detail,
            "workloads": [w.to_dict() for w in self.workloads],
            "ready": sum(w.ready for w in self.workloads),
            "desired": sum(w.desired for w in self.workloads),
        }


@dataclass
class _ReleaseFacts:
    """Raw per-release data collected in one pass over the namespace."""

    workloads: List[Workload] = field(default_factory=list)
    failures: List[str] = field(default_factory=list)
    progress_failures: List[str] = field(default_factory=list)
    services: List[Tuple[str, int, str]] = field(default_factory=list)


class ClusterManager:
    """Reports the real state of released workloads in one namespace.

    The Kubernetes APIs are injected, so the derivation logic can be exercised
    without a cluster, and so a caller may supply an already-authenticated
    client. Left unset, in-cluster credentials are used (the backend pod's
    service account), falling back to the developer's kubeconfig.

    Every method fails soft: an unreachable or forbidden API surfaces as
    ``Phase.UNKNOWN``, never as an exception. A component whose state cannot be
    determined must not take the dashboard down with it.
    """

    def __init__(self, namespace: str, apps_api=None, core_api=None):
        self.namespace = namespace
        self.last_error: Optional[str] = None
        self._apps_api = apps_api
        self._core_api = core_api
        self._configured = apps_api is not None and core_api is not None

    # -- client wiring -------------------------------------------------------

    def _ensure_clients(self) -> bool:
        """Create the API clients on first use. False if that is not possible."""
        if self._configured:
            return True

        try:
            from kubernetes import client, config
        except ImportError:
            self.last_error = ("the kubernetes package is not installed in the backend "
                               "environment")
            logger.error("[ClusterManager] The kubernetes package is not installed; "
                         "component status cannot be determined.")
            return False

        try:
            config.load_incluster_config()
        except Exception:
            try:
                config.load_kube_config()
            except Exception as exception:
                self.last_error = f"no usable Kubernetes credentials ({exception})"
                logger.error("[ClusterManager] No usable Kubernetes credentials: %s",
                             exception)
                return False

        self._apps_api = self._apps_api or client.AppsV1Api()
        self._core_api = self._core_api or client.CoreV1Api()
        self._configured = True
        return True

    @staticmethod
    def _release_of(item) -> str:
        labels = getattr(getattr(item, "metadata", None), "labels", None) or {}
        return labels.get(RELEASE_LABEL, "")

    def _collect(self) -> Optional[Dict[str, _ReleaseFacts]]:
        """One pass over the namespace, grouped by release. None on failure.

        Listing the namespace once and grouping locally keeps a dashboard
        refresh at a fixed four API calls regardless of how many components
        exist, rather than one call per component.
        """
        if not self._ensure_clients():
            return None

        facts: Dict[str, _ReleaseFacts] = {}

        def bucket(release: str) -> _ReleaseFacts:
            return facts.setdefault(release, _ReleaseFacts())

        workload_errors = []
        for kind, list_workloads in (
            ("Deployment", self._apps_api.list_namespaced_deployment),
            ("StatefulSet", self._apps_api.list_namespaced_stateful_set),
        ):
            try:
                listing = list_workloads(self.namespace)
            except Exception as exception:
                workload_errors.append(f"{kind.lower()}s ({exception})")
                continue
            for item in listing.items:
                release = self._release_of(item)
                if not release:
                    continue
                spec, status = item.spec, item.status
                bucket(release).workloads.append(Workload(
                    name=item.metadata.name,
                    kind=kind,
                    desired=int(getattr(spec, "replicas", 0) or 0),
                    ready=int(getattr(status, "ready_replicas", 0) or 0),
                ))
                for condition in (getattr(status, "conditions", None) or []):
                    if (condition.type == "Progressing" and condition.status == "False"
                            and condition.reason == "ProgressDeadlineExceeded"):
                        bucket(release).progress_failures.append(item.metadata.name)

        if len(workload_errors) == 2:
            self.last_error = "could not list " + " or ".join(workload_errors)
            logger.warning("[ClusterManager] Could not read workloads in '%s': %s",
                           self.namespace, self.last_error)
            return None
        if workload_errors:
            logger.warning("[ClusterManager] Partial workload read in '%s': could not list %s",
                           self.namespace, "; ".join(workload_errors))

        try:
            for pod in self._core_api.list_namespaced_pod(self.namespace).items:
                release = self._release_of(pod)
                if not release:
                    continue
                for container in (getattr(pod.status, "container_statuses", None) or []):
                    waiting = getattr(container.state, "waiting", None)
                    reason = getattr(waiting, "reason", None)
                    if reason in TERMINAL_WAIT_REASONS:
                        bucket(release).failures.append(f"{pod.metadata.name}: {reason}")
        except Exception as exception:
            logger.warning("[ClusterManager] Could not read pods in '%s': %s",
                           self.namespace, exception)

        try:
            for service in self._core_api.list_namespaced_service(self.namespace).items:
                release = self._release_of(service)
                name = getattr(service.metadata, "name", "")
                # Recording only the component's own Service keeps a sidecar
                # (Vault, Postgres) from ever becoming the probe target.
                if not release or name not in _probe_service_names(release):
                    continue
                for port in (getattr(service.spec, "ports", None) or []):
                    bucket(release).services.append(
                        (name, int(port.port), getattr(port, "name", "") or ""))
        except Exception as exception:
            logger.warning("[ClusterManager] Could not read services in '%s': %s",
                           self.namespace, exception)

        self.last_error = None
        return facts

    @staticmethod
    def _phase_of(release_facts: _ReleaseFacts) -> ReleaseStatus:
        workloads = tuple(release_facts.workloads)
        if not workloads:
            return ReleaseStatus(Phase.NOT_FOUND,
                                 detail="No workloads carry this release's label.")

        if release_facts.failures:
            return ReleaseStatus(Phase.FAILED, workloads,
                                 detail="; ".join(sorted(set(release_facts.failures))[:3]))
        if release_facts.progress_failures:
            return ReleaseStatus(
                Phase.FAILED, workloads,
                detail="Rollout exceeded its progress deadline: "
                       + ", ".join(sorted(set(release_facts.progress_failures))))

        desired = sum(w.desired for w in workloads)
        ready = sum(w.ready for w in workloads)
        if desired and ready >= desired:
            return ReleaseStatus(Phase.ACTIVE, workloads)
        if ready == 0:
            return ReleaseStatus(Phase.DEPLOYING, workloads,
                                 detail=f"0 of {desired} replica(s) ready.")
        return ReleaseStatus(Phase.DEGRADED, workloads,
                             detail=f"{ready} of {desired} replica(s) ready.")

    def statuses(self) -> Optional[Dict[str, ReleaseStatus]]:
        """Every release in the namespace, keyed by release name.

        An empty mapping means "the cluster could not be asked" — callers
        should treat a missing key as :attr:`Phase.UNKNOWN` rather than as
        "not deployed", which is why ``status`` exists.
        """
        facts = self._collect()
        return None if facts is None else self.statuses_from(facts)

    def status(self, release_name: str) -> ReleaseStatus:
        """The state of one release."""
        return self.resolve(self.statuses(), release_name)

    def resolve(self, statuses: Optional[Dict[str, ReleaseStatus]],
                release_name: str) -> ReleaseStatus:
        """Look one release up in a previously collected mapping.

        Kept separate so a listing endpoint can collect once and resolve many
        components against it. ``None`` means the cluster could not be read and
        is reported as UNKNOWN *with the reason*; an empty mapping means the
        namespace held no labelled workloads, which is NOT_FOUND. Conflating the
        two would make a network blip look like a deleted component, and invite
        the dashboard to clean up healthy releases.
        """
        if statuses is None:
            reason = self.last_error or "the cluster could not be reached"
            return ReleaseStatus(Phase.UNKNOWN, detail=f"Status unavailable: {reason}.")
        return statuses.get(release_name) or ReleaseStatus(
            Phase.NOT_FOUND, detail="No workloads carry this release's label.")

    def internal_base_url(self, release_name: str) -> Optional[str]:
        """In-cluster base URL for probing this release's own API, if any.

        Resolved from the release's Services so it needs no per-component
        configuration, and keeps the probe inside the cluster — the public
        ingress deliberately does not route health paths.
        """
        facts = self._collect()
        if not facts:
            return None
        return self.internal_base_url_from(facts, release_name)

    @staticmethod
    def internal_base_url_from(facts: Dict[str, _ReleaseFacts],
                               release_name: str) -> Optional[str]:
        candidates = (facts.get(release_name) or _ReleaseFacts()).services
        if not candidates:
            return None

        eligible = _probe_service_names(release_name)

        def identifiable(entry):
            _, port, port_name = entry
            return port_name in PROBE_PORT_NAMES or port == PROBE_PORT_FALLBACK

        usable = [entry for entry in candidates
                  if entry[0] in eligible and identifiable(entry)]
        if not usable:
            return None

        def rank(entry):
            name, port, port_name = entry
            return (eligible.index(name),
                    PROBE_PORT_NAMES.index(port_name) if port_name in PROBE_PORT_NAMES
                    else len(PROBE_PORT_NAMES),
                    port)

        name, port, _ = min(usable, key=rank)
        return f"http://{name}:{port}"

    def collect(self) -> Optional[Dict[str, _ReleaseFacts]]:
        """Raw facts for callers that need both statuses and probe URLs from a
        single pass over the namespace."""
        return self._collect()

    def statuses_from(self, facts: Dict[str, _ReleaseFacts]) -> Dict[str, ReleaseStatus]:
        return {release: self._phase_of(f) for release, f in facts.items()}
