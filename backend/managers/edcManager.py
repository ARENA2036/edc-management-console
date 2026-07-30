import os
import requests
import logging
from typing import Dict, Optional
from urllib.parse import urlparse

from utilities.common import (render_values, render_template, render_structure,
                              resolve_version_entry, merge_value_mappings,
                              condition_met, as_context)

logger = logging.getLogger(__name__)

URL_SCHEME = os.getenv("EMC_URL_SCHEME", "https")


class EdcManager:
    """Prepares Helm values for and orchestrates deployment of the dataspace
    components (connectors today, others via the same generic path), plus the
    EDC dataspace HTTP queries (health/assets/policies/contracts).

    Deployments are described entirely in configuration under `components`:
    each entry carries its chart reference, version list, `derive` rules and
    `valueMappings`. `prepare_deployment` is component-agnostic — adding a new
    component is a config change, not a code change.
    """

    def __init__(self, connector_config: dict, dataspace_config: dict, components_config: dict):
        # Per-component deployment definitions (chart, versions, derive, mappings).
        self.components = components_config or {}
        # EDC dataspace query config (used by health/assets/policies/contracts).
        self.default_url = connector_config.get("default_url", "")
        self.endpoints = connector_config.get("endpoints", {})
        # Inputs to the derivation context shared by all components.
        self.hostname = connector_config.get("hostname", {})
        self.sts_config = connector_config.get("sts", {})
        self.bdrs_config = connector_config.get("bdrs", {})
        self.did_method = connector_config.get("didMethod", "did:web")
        self.ssi_wallet_url = dataspace_config.get("ssi_wallet", {}).get("url", None)
        self.authority_id = dataspace_config.get("authority_id", "BPNL00000003CRHK")

    def check_health(self, connector_url: Optional[str] = None) -> Dict:
        url = connector_url or self.default_url
        liveness_endpoint = url + self.endpoints.get("liveness", "/api/check/liveness")
        readiness_endpoint = url + self.endpoints.get("readiness", "/api/check/readiness")

        result = {
            "url": url,
            "liveness": "unknown",
            "readiness": "unknown",
            "healthy": False
        }
        try:
            liveness_response = requests.get(liveness_endpoint, timeout=5, verify=False)
            result["liveness"] = "healthy" if liveness_response.status_code == 200 else "unhealthy"
        except Exception as e:
            logger.error(f"[EdcManager] Liveness check failed: {str(e)}")
            result["liveness"] = "unhealthy"

        try:
            readiness_response = requests.get(readiness_endpoint, timeout=5, verify=False)
            result["readiness"] = "ready" if readiness_response.status_code == 200 else "not ready"
        except Exception as e:
            logger.error(f"[EdcManager] Readiness check failed: {str(e)}")
            result["readiness"] = "not ready"

        result["healthy"] = result["liveness"] == "healthy" and result["readiness"] == "ready"
        logger.debug("[EdcManager] Health for %s: %s", url, result)
        return result

    def _edc_query(self, connector_url: Optional[str], endpoint_key: str, default_path: str) -> Dict:
        """GET a versioned EDC management resource (assets/policies/contracts) and
        return its JSON, or ``{error}`` on failure."""
        target = (connector_url or self.default_url) + self.endpoints.get(endpoint_key, default_path)
        try:
            response = requests.get(target, timeout=10, verify=False)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("[EdcManager] Failed to query %s at %s: %s", endpoint_key, target, e)
            return {"error": str(e)}

    def _http_status(self, url: str) -> Optional[int]:
        """GET a URL and return its HTTP status code, or None if unreachable."""
        try:
            return requests.get(url, timeout=5, verify=False).status_code
        except Exception as e:
            logger.warning("[EdcManager] Health probe failed for %s: %s", url, e)
            return None

    @staticmethod
    def _with_scheme(url: str) -> str:
        return url if url.startswith(("http://", "https://")) else f"{URL_SCHEME}://" + url

    def component_health(self, record) -> Dict:
        """Health of a single deployed component (a persisted ConnectorDB row).

        Type-aware: the connector is probed via its EDC liveness/readiness
        endpoints on the control plane; every other component via a simple HTTP
        reachability check of its ingress ``url`` plus the component's configured
        ``healthPath`` (a response with status < 500 means the ingress + pod are
        serving). Returns a normalized dict ``{name, type, healthy, url, details}``
        so the frontend can poll any component the same way.
        """
        config = record.config or {}
        ctype = config.get("type") or ("connector" if record.cp_hostname else None)
        result = {"name": record.name, "type": ctype, "healthy": False, "url": None, "details": {}}

        if ctype == "connector" and record.cp_hostname:
            health = self.check_health(f"{URL_SCHEME}://" + record.cp_hostname)
            result["url"] = health["url"]
            result["healthy"] = health["healthy"]
            result["details"] = {"liveness": health["liveness"], "readiness": health["readiness"]}
            return result

        if record.url:
            health_path = self.components.get(ctype, {}).get("healthPath", "/")
            target = self._with_scheme(record.url) + health_path
            status = self._http_status(target)
            result["url"] = target
            result["healthy"] = status is not None and status < 500
            result["details"] = {"status_code": status}
        return result

    def get_assets(self, connector_url: Optional[str] = None) -> Dict:
        return self._edc_query(connector_url, "assets", "/v3/assets")

    def get_policies(self, connector_url: Optional[str] = None) -> Dict:
        return self._edc_query(connector_url, "policies", "/v3/policydefinitions")

    def get_contracts(self, connector_url: Optional[str] = None) -> Dict:
        return self._edc_query(connector_url, "contracts", "/v3/contractdefinitions")

    @staticmethod
    def _as_dict(source) -> dict:
        """The request's own fields (incl. pydantic ``extra`` fields) as a fresh,
        mutable dict — the request may be a model or a dict."""
        return dict(as_context(source))

    def _derivation_context(self, source) -> dict:
        """Flatten the request fields plus dataspace config into a single context
        that the component's `derive` templates are rendered against."""
        context = self._as_dict(source)
        context.update({
            "wallet_url": self.ssi_wallet_url or "",
            "wallet_host": urlparse(self.ssi_wallet_url or "").hostname or "",
            "authority_id": self.authority_id,
            "did_method": self.did_method,
            "sts_dim_endpoint": self.sts_config.get("dimEndpoint", "/api/sts"),
            "sts_oauth_token_endpoint": self.sts_config.get("oauthTokenEndpoint", "/oauth/token"),
            "sts_secret_alias": self.sts_config.get("secretAlias", "edc-wallet-secret"),
            "bdrs_endpoint": self.bdrs_config.get("directoryEndpoint", "/api/v1/directory"),
            "controlplane_hostname": self.hostname.get("controlplane", ""),
            "dataplane_hostname": self.hostname.get("dataplane", ""),
        })
        return context

    def _derive(self, derive_config: dict, source) -> dict:
        """Compute the component's `derive` attributes (each templated against the
        derivation context, structure-aware) and return them as a dict. Values may
        be strings, lists or maps; templated leaves are resolved. Returned rather
        than mutated onto `source` so any derived key works regardless of the
        request model's declared fields."""
        if not derive_config:
            return {}
        context = self._derivation_context(source)
        return {attr: render_structure(template, context)
                for attr, template in derive_config.items()}

    def deployments_for(self, source) -> list:
        """Return the ordered component names to deploy for a deploy request.

        Each component's `deployWhen` condition (``always`` or a dotted request
        field path, e.g. ``submodel.url``) is evaluated against `source` — so a
        new component is gated entirely from configuration. Config insertion order
        is preserved (connector first)."""
        return [name for name, cfg in self.components.items()
                if condition_met(cfg.get("deployWhen"), source)]

    def all_release_names(self, source) -> list:
        """Return the rendered Helm release name of every configured component for
        `source` (used to uninstall on delete; uninstalling a release that was
        never created is a harmless no-op)."""
        return [render_template(cfg.get("releaseName", "{name}"), source)
                for cfg in self.components.values()]

    def prepare_deployment(self, component: str, source) -> dict:
        """Render the Helm values and resolve the chart/release for a component.

        Component-agnostic: every component declares its chart, supported
        `versions` (last few stable), an optional `version` selector, `derive`
        rules, `releaseName` and `valueMappings` under `components.<name>`.

        The deployed version is chosen identically for all components:
          * `version` (a template, e.g. "{version}") if present — resolved against
            the request, then validated against `versions`; otherwise
          * the latest listed entry (`versions[0]`).
        Per-version `valuesYaml`/`valueMappings` overrides are picked up from the
        matching `versions` entry. Returns
        ``{release_name, values, chart, repo, version}`` or ``{error}``.
        """
        cfg = self.components.get(component)
        if not cfg:
            return {"error": f"No component named '{component}' is configured"}

        # A chart is either a local directory (`chart.directory`) or a named chart
        # pulled from a repo (`chart.name` + `chart.repo`).
        chart = cfg.get("chart") or {}
        chart_directory = chart.get("directory")
        if not chart_directory and not chart.get("name"):
            return {"error": f"Component '{component}' needs chart.directory or chart.name"}

        # Render source = the request's own fields overlaid with the derived ones.
        render_source = {**self._as_dict(source), **self._derive(cfg.get("derive", {}), source)}

        versions = cfg.get("versions") or []
        selector = cfg.get("version")
        if selector is not None:
            version = render_template(selector, render_source)
        elif versions:
            version = versions[0].get("version")
        else:
            version = chart.get("version")

        entry = resolve_version_entry(version, versions) if versions else None
        if versions and entry is None:
            supported = [e.get("version") for e in versions]
            return {"error": f"Unsupported {component} version '{version}'. Supported: {supported}"}

        values_yaml = (entry or cfg).get("valuesYaml", "")
        template_path = (cfg.get("templatesDir", "") + values_yaml) if values_yaml else None
        logger.debug("Preparing deployment for component = %s", component)
        mappings = (merge_value_mappings(cfg.get("valueMappings"), entry.get("valueMappings"))
                    if entry else cfg.get("valueMappings", []))

        if chart_directory:
            # Local chart: ref = the directory (kept as configured, i.e. relative to
            # the app's working dir). NOT abspath'd — pyhelm3 shells the command out
            # via shlex/cmd.exe, which mangles Windows absolute paths that contain
            # spaces (e.g. "C:\Users\Saud Khan\..."). repo/version come from Chart.yaml.
            chart_ref, repo, release_version = chart_directory, None, None
        else:
            chart_ref, repo, release_version = chart.get("name"), chart.get("repo"), version

        return {
            "release_name": render_template(cfg.get("releaseName", "{name}"), render_source),
            "values": render_values(render_source, template_path, mappings),
            "chart": chart_ref,
            "repo": repo,
            "version": release_version,
        }