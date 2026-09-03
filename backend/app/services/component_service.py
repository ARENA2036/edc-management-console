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
"""What the console does with components, independent of HTTP.

Ownership, the per-type instance cap, name availability, deployment and status
derivation all live here. The routers below `app/api` decide status codes and
payload shape; nothing in this module knows either.
"""
import logging
import secrets
import uuid
from typing import Optional

from app.core import config
from app.managers.cluster_manager import ClusterManager, Phase
from app.managers.edc_manager import URL_SCHEME
from app.models.database import ConnectorDB
from app.utils.errors import (ComponentLimitExceeded, ComponentMisconfigured,
                              ComponentNameTaken, DuplicateComponentName, EmcError,
                              NotFound, Stage, UnknownComponentType,
                              UnsupportedVersion, classify)
from app.utils.ownership import ComponentScope, normalize_bpn

logger = logging.getLogger(__name__)

_PLAN_ERRORS = {
    "VERSION_UNSUPPORTED": (
        UnsupportedVersion,
        "Choose one of the versions published on /api/dataspace for this component type."),
    "COMPONENT_TYPE_UNKNOWN": (
        UnknownComponentType,
        "Only types configured under `components` in configuration.yml can be deployed."),
    "COMPONENT_CONFIG_INVALID": (
        ComponentMisconfigured,
        "An operator must fix this component's `chart` block in configuration.yml."),
}


def record_type(record: ConnectorDB) -> str:
    config_type = (record.config or {}).get("type")
    if isinstance(config_type, str) and config_type:
        return config_type
    if record.cp_hostname:
        return "connector"
    return ""


class ComponentService:
    """Deploys, deletes and reports on the components of one dataspace."""

    def __init__(self, database, cluster, edc_manager, edc_service):
        self.database = database
        self.cluster = cluster
        self.edc_manager = edc_manager
        self.edc_service = edc_service

    # -- reads ---------------------------------------------------------------

    async def list_components(self, scope: ComponentScope) -> list:
        namespace = config.cluster_namespace()
        facts = self.cluster.collect()
        statuses = self.cluster.statuses_from(facts) if facts is not None else None

        listing = []
        for record in self.database.get_all_connectors(bpn=scope.bpn):
            if not await self._reconcile(record, namespace):
                continue

            health = self._status(record, facts, statuses)
            self.database.update_connector(record)

            payload = record.to_dict()
            payload["urls"] = self._urls_for(record)
            payload["health"] = health
            listing.append(payload)

        return listing

    async def health_of_all(self, scope: ComponentScope) -> list:
        namespace = config.cluster_namespace()
        facts = self.cluster.collect()
        statuses = self.cluster.statuses_from(facts) if facts is not None else None

        results = []
        for record in self.database.get_all_connectors(bpn=scope.bpn):
            if not await self._reconcile(record, namespace):
                continue
            results.append(self._status(record, facts, statuses))
            self.database.update_connector(record)

        return results

    async def health_of(self, name: str, scope: ComponentScope) -> dict:
        record = self.database.get_connector_by_name(name=name, bpn=scope.bpn)
        if not record:
            raise NotFound(f"No component named '{name}' is known to this console.",
                           code="COMPONENT_NOT_FOUND")

        if not await self._reconcile(record, config.cluster_namespace()):
            raise NotFound(f"Component '{name}' no longer exists in the cluster.",
                           code="COMPONENT_NOT_FOUND", stage=Stage.CLUSTER,
                           hint="Refresh the dashboard - the component list has changed.")

        facts = self.cluster.collect()
        statuses = self.cluster.statuses_from(facts) if facts is not None else None
        health = self._status(record, facts, statuses)
        self.database.update_connector(record)
        return health

    def get(self, component_id: str, scope: ComponentScope) -> ConnectorDB:
        record = self.database.get_connector_by_id(component_id, bpn=scope.bpn)
        if not record:
            raise NotFound(f"No component with id '{component_id}' is known to this console.",
                           code="COMPONENT_NOT_FOUND")
        return record

    # -- writes --------------------------------------------------------------

    async def deploy(self, components, scope: ComponentScope) -> list:
        """Install-or-upgrade every component in the request and persist a row
        for each. An entry with no `type`/`name` is an optional slot and is
        skipped. Create and upgrade share this path because Helm
        install-or-upgrade is the same operation either way.
        """
        self._apply_owner_bpn(components, scope)
        self._assert_names_unique(components)
        self._assert_names_available(components, scope)
        self._assert_within_limits(components, scope)

        namespace = config.cluster_namespace()
        deployed = []
        for comp in components:
            if not comp.type or not comp.name:
                continue

            self._apply_db_password(comp)
            plan = self.edc_manager.prepare_deployment(comp.type, comp)
            if "error" in plan:
                raise self._plan_error(plan)

            await self.edc_service.install_or_upgrade(
                release_name=plan["release_name"],
                chart_name=plan["chart"],
                repo=plan["repo"],
                version=plan["version"],
                values=plan["values"],
                namespace=namespace,
            )
            self._upsert_row(comp, plan, namespace, scope)
            deployed.append({"type": comp.type, "name": comp.name,
                             "release": plan["release_name"], "version": plan["version"]})

        return deployed

    async def delete(self, name: str, scope: ComponentScope) -> str:
        """Delete exactly one component and uninstall its Helm release.

        Components are independent, so deleting a connector never touches a
        digital twin registry or submodel server deployed alongside it.
        """
        record = self.database.get_connector_by_name(name=name, bpn=scope.bpn)
        if not record:
            raise NotFound(f"No component named '{name}' is known to this console.",
                           code="COMPONENT_NOT_FOUND",
                           hint="It may already have been deleted - refresh the dashboard.")

        await self.edc_service.uninstall(
            release_name=(record.config or {}).get("release") or record.name,
            namespace=record.namespace or config.cluster_namespace(),
        )
        self.database.delete_connector(connector_id=record.id)
        return record.name

    # -- state derivation ----------------------------------------------------

    async def _reconcile(self, record: ConnectorDB, default_namespace) -> Optional[str]:
        """The record's release name if it still exists in the cluster; prune the
        row and return None otherwise.

        `release_exists` returns False only on a definitive "release not found".
        Any other failure - helm unreachable, wrong kubecontext, RBAC, a network
        blip - is not the same as "confirmed gone", so the row is kept rather
        than pruned and the endpoint does not fail because the cluster was
        briefly unreachable.
        """
        release_name = (record.config or {}).get("release") or record.name
        namespace = record.namespace or default_namespace
        try:
            exists = await self.edc_service.release_exists(release_name=release_name,
                                                           namespace=namespace)
        except Exception as exception:
            error = classify(exception, stage=Stage.CLUSTER)
            logger.warning("[reconcile][%s][stage=%s] Could not verify release '%s' in "
                           "namespace '%s': %s; keeping row",
                           error.code, error.stage, release_name, namespace, error.message)
            return release_name

        if exists:
            return release_name

        logger.warning("[reconcile] Pruning stale row '%s' (release '%s' not found in "
                       "namespace '%s')", record.name, release_name, namespace)
        self.database.delete_connector(connector_id=record.id)
        return None

    def _status(self, record, facts, statuses) -> dict:
        """The component's real state, and the row status to persist.

        Kubernetes is the primary source: it knows a rollout is still in
        progress, that a container is crash-looping, or that replicas are ready.
        Only once the workloads report ready is the component's own API probed,
        which separates "running" from "actually serving".
        """
        release = (record.config or {}).get("release") or record.name
        cluster = self.cluster.resolve(statuses, release)

        result = {"name": record.name, "type": record_type(record), **cluster.to_dict()}

        if cluster.is_active:
            base_url = ClusterManager.internal_base_url_from(facts or {}, release)
            if base_url:
                probe = self.edc_manager.component_reachable(record, base_url)
                result["probe"] = probe
                # None means the probe could not be carried out at all, and an
                # inconclusive probe must not contradict Kubernetes.
                if probe["reachable"] is False:
                    result["phase"] = Phase.DEGRADED
                    result["detail"] = ("Replicas are ready but the component's own API "
                                        f"did not answer ({probe['detail']}).")

        result["healthy"] = result["phase"] == Phase.ACTIVE
        record.status = result["phase"]
        return result

    @staticmethod
    def _urls_for(record: ConnectorDB) -> list:
        urls = []
        # Only connector components carry a control-plane host to build URLs from.
        if record.cp_hostname:
            for path in config.connector_endpoints().values():
                urls.append(f"{URL_SCHEME}://{record.cp_hostname}{path}")
        if record.registry:
            urls.append(f"{URL_SCHEME}://{record.registry}/semantics/registry/")
        if record.submodel:
            urls.append(f"{URL_SCHEME}://{record.submodel}/")
        return urls

    # -- pre-flight checks ---------------------------------------------------

    @staticmethod
    def _apply_owner_bpn(components, scope: ComponentScope) -> None:
        """Stamp the caller's BPN onto every component in the request.

        The BPN on a row is the record of ownership and what every read filters
        on, so it comes from the caller's identity rather than the payload.
        """
        for comp in components:
            requested = normalize_bpn(getattr(comp, "bpn", ""))
            if requested and requested != scope.bpn:
                raise EmcError(
                    f"Component '{comp.name}' was requested with BPN {requested}, but your "
                    f"account belongs to {scope.bpn}.",
                    status=403, code="SESSION_BPN_MISMATCH", stage=Stage.AUTH,
                    hint="A component can only be deployed under your own BPN.")
            comp.bpn = scope.bpn

    @staticmethod
    def _assert_names_unique(components) -> None:
        seen = set()
        for comp in components:
            if not comp.type or not comp.name:
                continue
            if comp.name in seen:
                raise DuplicateComponentName(
                    f"Component name '{comp.name}' is used more than once in this request. "
                    "Each component (connector, submodel server, digital twin registry) "
                    "needs its own unique name.",
                    hint="Rename one of the duplicates and submit again.")
            seen.add(comp.name)

    def _assert_names_available(self, components, scope: ComponentScope) -> None:
        """Reject a request claiming a name owned by another company.

        Names become Helm release names in one shared namespace, so they cannot
        be scoped per company. Without this check a caller could name a component
        after another company's and have the deploy path treat it as an in-place
        upgrade of *their* release.
        """
        for comp in components:
            if not comp.type or not comp.name:
                continue
            record = self.database.get_connector_by_name(name=comp.name)
            if record is not None and not scope.permits(record):
                raise ComponentNameTaken(
                    f"The name '{comp.name}' is already taken by another component in "
                    "this dataspace.",
                    hint="Choose a different name and deploy again.")

    def _assert_within_limits(self, components, scope: ComponentScope) -> None:
        """Reject the whole request if it would push any type past its cap.

        A pre-flight check, so an over-limit request changes nothing rather than
        deploying the first few components and failing part-way. The cap counts
        within the caller's own BPN: one company filling its three connectors
        must not stop another from deploying any. Re-deploying an existing name
        is an in-place upgrade, not a new instance, so it is not counted -
        otherwise upgrading while at the limit would be impossible.
        """
        existing = self.database.get_all_connectors(bpn=scope.bpn)
        existing_names = {record.name for record in existing}

        counts: dict = {}
        for record in existing:
            current = record_type(record)
            if current:
                counts[current] = counts.get(current, 0) + 1

        for comp in components:
            if not comp.type or not comp.name or comp.name in existing_names:
                continue

            limit = config.component_instance_limit(comp.type)
            counts[comp.type] = counts.get(comp.type, 0) + 1
            if counts[comp.type] > limit:
                raise ComponentLimitExceeded(
                    f"Cannot deploy '{comp.name}': at most {limit} component(s) of type "
                    f"'{comp.type}' may exist at a time and that limit is already reached. "
                    "Delete an existing one before deploying another.",
                    hint="Delete an existing component of this type, then deploy again.")

    # -- persistence ---------------------------------------------------------

    def _apply_db_password(self, comp) -> None:
        """Replace any client-supplied DB password with a server-generated secret.

        The frontend sends a value derived from the component name, so it is
        guessable by anyone who can read the dashboard. An existing component
        keeps its stored password: rotating it on upgrade would leave the running
        Postgres volume unreachable.
        """
        record = self.database.get_connector_by_name(comp.name)
        auth = dict(getattr(comp, "auth", None) or {})
        auth["db_password"] = (record.db_password if record else None) or secrets.token_urlsafe(24)
        comp.auth = auth

    def _upsert_row(self, comp, plan, namespace, scope: ComponentScope):
        """Create or refresh the row for one deployed component.

        Each component is its own row keyed by `name`; `config` records its type
        and release. cp/dp hostnames are only meaningful for a connector, so they
        stay None for everything else.
        """
        hostnames = config.connector_hostnames()
        cp_host = hostnames.get("controlplane")
        dp_host = hostnames.get("dataplane")
        auth = getattr(comp, "auth", None) or {}
        row_config = {"type": comp.type, "release": plan["release_name"],
                      "chart": plan["chart"]}

        # Scoped, so a re-deploy can only ever roll forward a row the caller owns.
        record = self.database.get_connector_by_name(comp.name, bpn=scope.bpn)
        if record is None:
            record = ConnectorDB(
                id=str(uuid.uuid4()),
                name=comp.name,
                bpn=getattr(comp, "bpn", "") or "",
                url=getattr(comp, "url", "") or "",
                version=plan["version"] or "",
                namespace=namespace,
                status="active",
                config=row_config,
                cp_hostname=(f"{comp.name}-{cp_host}"
                             if comp.type == "connector" and cp_host else None),
                dp_hostname=(f"{comp.name}-{dp_host}"
                             if comp.type == "connector" and dp_host else None),
                db_name=getattr(comp, "db_name", None) or "edc",
                db_username=auth.get("db_username"),
                db_password=auth.get("db_password"),
                registry="",
                submodel="",
            )
            return self.database.create_connector(connector=record)

        record.config = row_config
        record.bpn = getattr(comp, "bpn", record.bpn) or record.bpn
        record.url = getattr(comp, "url", record.url) or record.url
        record.version = plan["version"] or record.version
        record.db_name = getattr(comp, "db_name", record.db_name) or record.db_name
        record.db_username = auth.get("db_username", record.db_username)
        record.db_password = auth.get("db_password", record.db_password)
        record.status = "active"
        return self.database.update_connector(record)

    @staticmethod
    def _plan_error(plan) -> EmcError:
        """Map a `prepare_deployment` refusal onto the right status.

        An unknown type or unsupported version is the caller's mistake; an
        incomplete chart block is this console's own misconfiguration.
        """
        message = plan.get("error", "The deployment could not be prepared.")
        error_class, hint = _PLAN_ERRORS.get(plan.get("error_code"), (None, None))
        if error_class is None:
            return EmcError(message, stage=Stage.CONFIG)
        return error_class(message, hint=hint)
