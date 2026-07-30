import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional

import requests
from pyhelm3 import Client, Command, ReleaseNotFoundError

logger = logging.getLogger(__name__)


class EdcService:
    """Thin async wrapper around Helm 3 (via pyhelm3) for managing connector
    releases, plus the EDC dataspace HTTP calls.

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

    def _chart_lookup_args(self, chart_name: str, repo: Optional[str]) -> tuple[str, Optional[str]]:
        """Resolve how a chart should be addressed for Helm lookup/install.

        Helm accepts ``--repo <url>`` only for real repository URLs. For named
        repositories that were already registered with ``helm repo add``, Helm
        expects ``<repo-alias>/<chart-name>`` and no ``--repo`` flag.
        """
        if not repo:
            return chart_name, None
        if "://" in repo:
            return chart_name, repo
        for entry in self._repositories:
            if entry.get("name") == repo:
                return f"{repo}/{chart_name}", None
        return chart_name, repo

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
            chart_ref, chart_repo = self._chart_lookup_args(chart_name, repo)
            chart_version = version
            if chart_repo is None and "/" in chart_ref and "://" not in chart_ref:
                pulled_dir = await self._command.pull(chart_ref, version=version)
                chart_ref = str(Path(pulled_dir) / chart_name)
                chart_version = None
            chart = await self._client.get_chart(
                chart_ref, repo=chart_repo, version=chart_version,
            )
            revision = await self._client.install_or_upgrade_release(
                release_name,
                chart,
                values,
                namespace=namespace,
                create_namespace=True,
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

    # ------------------------------------------------------------------
    # EDC dataspace HTTP calls (unchanged — not Helm/CLI related).
    # ------------------------------------------------------------------
    def do_get(self, counter_party_id: str, counter_party_address: str,
               dct_type: Optional[str], path: str,
               policies: Optional[List[str]] = None,
               headers: Optional[Dict] = None):
        logger.info(f"[EdcService] Performing GET request to {counter_party_address}{path}")
        try:
            url = f"{counter_party_address}{path}"
            response = requests.get(url, headers=headers or {}, timeout=30, verify=False)
            return response
        except Exception as e:
            logger.error(f"[EdcService] GET request failed: {str(e)}")
            raise

    def do_post(self, counter_party_id: str, counter_party_address: str,
                dct_type: Optional[str], path: str,
                body: Optional[Dict] = None,
                policies: Optional[List[str]] = None,
                headers: Optional[Dict] = None,
                content_type: str = "application/json"):
        logger.info(f"[EdcService] Performing POST request to {counter_party_address}{path}")
        try:
            url = f"{counter_party_address}{path}"
            if headers is None:
                headers = {}
            headers["Content-Type"] = content_type
            response = requests.post(url, json=body, headers=headers, timeout=30, verify=False)
            return response
        except Exception as e:
            logger.error(f"[EdcService] POST request failed: {str(e)}")
            raise
