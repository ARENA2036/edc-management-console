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
import logging
from typing import Dict, List, Optional

from pyhelm3 import Client, Command, ReleaseNotFoundError

logger = logging.getLogger(__name__)


class EdcService:
    """Thin async wrapper around Helm 3 (via pyhelm3) for managing component
    releases.

    All Helm operations go through pyhelm3, which invokes the ``helm`` binary,
    passes values over stdin (no temporary values files) and never changes the
    process working directory. This removes the global ``os.chdir`` races of the
    previous ``subprocess(shell=True)`` implementation.
    """

    def __init__(self,
                 repositories: Optional[List[Dict[str, str]]] = None,
                 kubecontext: Optional[str] = None,
                 helm_executable: str = "helm",
                 default_timeout: str = "10m"):
        self._repositories = repositories or []

        # A single Command instance is shared by the Client (release operations)
        # and by repo management below. kubecontext defaults to None so Helm uses
        # the current context from KUBECONFIG (set up at container start).
        self._command = Command(
            executable=helm_executable,
            kubecontext=kubecontext or None,
            default_timeout=default_timeout,
        )
        self._client = Client(command=self._command)

        # Serialize chart pulls + installs so concurrent deploys don't race on the
        # shared Helm repository cache.
        self._install_lock = asyncio.Lock()

    def _repo_url(self, repo: Optional[str]) -> Optional[str]:
        """Resolve a repository reference to a URL: pass through an explicit URL,
        otherwise look the name up in the configured repositories."""
        if not repo:
            return None
        if "://" in repo:
            return repo
        for entry in self._repositories:
            if entry.get("name") == repo:
                return entry.get("url")
        return repo

    async def ensure_repositories(self) -> None:
        """Register the configured Helm repositories (``helm repo add``) and
        refresh their indexes. Safe to call repeatedly — ``repo add`` uses
        ``--force-update``."""
        if not self._repositories:
            return
        for repo in self._repositories:
            name, url = repo.get("name"), repo.get("url")
            if not name or not url:
                logger.warning("[EdcService] Skipping helm repo with missing name/url: %s", repo)
                continue
            logger.info("[EdcService] helm repo add %s %s", name, url)
            await self._command.repo_add(name, url)
        await self._command.repo_update()

    async def install_or_upgrade(self,
                                 release_name: str,
                                 chart_name: str,
                                 repo: Optional[str],
                                 version: Optional[str],
                                 values: Dict,
                                 namespace: str):
        """Install or upgrade any component's release by pulling the named chart
        (at `version`) from `repo` and applying `values`.

        Component-agnostic: the chart/repo/version are supplied by the caller
        (from the deployable's config), so the same path deploys connectors and
        other components. Runs atomically — on failure Helm rolls back and cleans
        up, so a failed deploy never leaves a broken release blocking the next.
        """
        async with self._install_lock:
            chart = await self._client.get_chart(
                chart_name, repo=self._repo_url(repo), version=version,
            )
            revision = await self._client.install_or_upgrade_release(
                release_name,
                chart,
                values,
                namespace=namespace,
                create_namespace=False,
                atomic=False,
                cleanup_on_fail=True,
                wait=False,
            )
            logger.info(
                "[EdcService] Release '%s' is now at revision %s (status: %s)",
                release_name, revision.revision, revision.status,
            )
            return revision

    async def uninstall(self, release_name: str, namespace: str, wait: bool = True) -> None:
        """Uninstall a connector release. No-op if it does not exist."""
        try:
            await self._client.uninstall_release(release_name, namespace=namespace, wait=wait)
        except ReleaseNotFoundError:
            logger.warning("[EdcService] Release '%s' not found in namespace '%s'; nothing to uninstall",
                           release_name, namespace)

    async def release_exists(self, release_name: str, namespace: str) -> bool:
        """Return True if a Helm release with this name exists in the namespace."""
        try:
            await self._client.get_current_revision(release_name, namespace=namespace)
            return True
        except ReleaseNotFoundError:
            return False
