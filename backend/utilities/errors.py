###############################################################
# Tractus-X - EDC Management Console
#
# Copyright (c) 2025 ARENA2036 e.V.
# Copyright (c) 2025 Contributors to the Eclipse Foundation
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
"""Error taxonomy: what failed, whose fault it is, and where it broke.

Every deliberate failure is an :class:`EmcError` carrying four things:

``status``  the HTTP status the caller should see
``code``    a stable identifier clients switch on (never the message text)
``stage``   *where* it broke - see :class:`Stage`
``detail``  the raw underlying text, redacted and truncated

:func:`classify` maps third-party failures (Helm, Kubernetes, requests,
SQLAlchemy) onto that model. It is deliberately conservative: anything it does
not positively recognise stays 500/``INTERNAL_ERROR``, because downgrading an
unknown server fault to a 4xx would disguise a real bug as user error.
"""

import re
import uuid

MAX_DETAIL_CHARS = 2000

_SECRET_HINTS = (r"passw(?:or)?d", "secret", "token", r"api[_\-]?key",
                 "credential", r"private[_\-]?key")

_SECRET_RE = tuple(
    re.compile(r'(?i)([\w.\-]*' + hint + r'[\w.\-]*["\']?\s*[:=]\s*["\']?)([^\s,;"\'}\]]+)')
    for hint in _SECRET_HINTS
)

# Credentials embedded in a URL userinfo section: scheme://user:secret@host
_URL_CREDENTIALS_RE = re.compile(r"(?i)\b([a-z][a-z0-9+.\-]*://[^\s:/@]+:)([^\s@]+)(@)")

REDACTED = "***"


class Stage:
    """Where in the pipeline a failure happened.

    Rendered to the user as the "where" line of an error, so these values are
    part of the API contract.
    """

    REQUEST = "request"        # the payload the caller sent
    AUTH = "auth"              # authentication/authorisation against this console
    CONFIG = "config"          # configuration.yml / environment of this console
    DATABASE = "database"      # this console's own state store
    HELM = "helm"              # chart resolution, templating, release state
    CLUSTER = "cluster"        # the Kubernetes API behind Helm
    UPSTREAM = "upstream"      # another HTTP dependency (IdP, wallet, ...)
    INTERNAL = "internal"      # unclassified - a bug in this backend


class EmcError(Exception):
    """Base class for failures this backend reports deliberately."""

    status = 500
    code = "INTERNAL_ERROR"
    stage = Stage.INTERNAL

    def __init__(self, message, *, detail=None, hint=None,
                 status=None, code=None, stage=None):
        super().__init__(message)
        self.message = message
        self.detail = detail
        self.hint = hint
        if status is not None:
            self.status = status
        if code is not None:
            self.code = code
        if stage is not None:
            self.stage = stage

    @property
    def is_server_fault(self):
        """Drives whether the caller gets a stack trace in the log. A 409 for
        "you already have three connectors" is not worth a traceback."""
        return self.status >= 500


class BadRequest(EmcError):
    status, code, stage = 400, "BAD_REQUEST", Stage.REQUEST

class NotAuthorized(EmcError):
    status, code, stage = 401, "NOT_AUTHORIZED", Stage.AUTH

class NotFound(EmcError):
    status, code, stage = 404, "NOT_FOUND", Stage.REQUEST

class Conflict(EmcError):
    status, code, stage = 409, "CONFLICT", Stage.REQUEST

class ComponentLimitExceeded(Conflict):
    """Deploying would exceed a component type's configured cap.

    409 rather than 400: the request is well-formed and conflicts with current
    state - the same request succeeds once an instance is deleted.
    """
    code = "COMPONENT_LIMIT_REACHED"

class DuplicateComponentName(BadRequest):
    """Two components in one payload claim the same name. Raised before any
    Helm work, so nothing has been deployed when the caller sees it."""
    code = "DUPLICATE_COMPONENT_NAME"

class UnsupportedVersion(BadRequest):
    """Requested a chart version outside the component's published list, which
    /api/dataspace advertises - so this is the caller asking for something that
    was never on offer."""
    code = "VERSION_UNSUPPORTED"

class UnknownComponentType(BadRequest):
    """No ``components.<type>`` block is configured for this type."""
    code = "COMPONENT_TYPE_UNKNOWN"

class ComponentMisconfigured(EmcError):
    """The component exists in configuration but its block is unusable. The
    caller cannot fix this; an operator must - hence 500 with stage ``config``
    so the UI says so rather than blaming the request."""
    status, code, stage = 500, "COMPONENT_CONFIG_INVALID", Stage.CONFIG

_RULES = (
    (re.compile(r"(?i)executable file not found|no such file or directory: ?'?helm"),
     503, "HELM_BINARY_MISSING", Stage.HELM,
     "The helm executable is not available to the backend."),

    (re.compile(r"(?i)kubernetes cluster unreachable|connection refused|dial tcp|"
                r"no such host|i/o timeout|tls handshake timeout"),
     503, "CLUSTER_UNREACHABLE", Stage.CLUSTER,
     "The Kubernetes cluster could not be reached."),

    (re.compile(r'(?i)context ".*" does not exist|current-context is not set|'
                r"could not read kubeconfig"),
     503, "KUBECONFIG_INVALID", Stage.CLUSTER,
     "The backend has no usable kubeconfig or kube-context."),

    (re.compile(r"(?i)is forbidden: user|cannot (?:create|get|list|delete|patch|update) resource"),
     502, "CLUSTER_FORBIDDEN", Stage.CLUSTER,
     "The backend's service account may not perform this operation in the cluster."),

    (re.compile(r'(?i)namespaces? "?[^"\s]+"? not found'),
     422, "NAMESPACE_NOT_FOUND", Stage.CLUSTER,
     "The target namespace does not exist in the cluster."),

    (re.compile(r"(?i)exceeded quota|insufficient (?:cpu|memory)"),
     503, "CLUSTER_RESOURCE_EXHAUSTED", Stage.CLUSTER,
     "The cluster has insufficient free resources or quota for this deployment."),

    (re.compile(r"(?i)imagepullbackoff|errimagepull|failed to pull image"),
     502, "IMAGE_PULL_FAILED", Stage.CLUSTER,
     "The cluster could not pull the container image for this component."),

    (re.compile(r"(?i)another operation \([^)]*\) is in progress"),
     409, "RELEASE_LOCKED", Stage.HELM,
     "Another Helm operation is still running for this release."),

    (re.compile(r"(?i)cannot re-?use a name that is still in use"),
     409, "RELEASE_NAME_IN_USE", Stage.HELM,
     "A different Helm release already uses this name."),

    (re.compile(r"(?i)has no deployed releases"),
     409, "RELEASE_NOT_DEPLOYED", Stage.HELM,
     "The release exists but has no deployed revision to upgrade from."),

    (re.compile(r"(?i)release: ?not found"),
     404, "RELEASE_NOT_FOUND", Stage.HELM,
     "No such Helm release in this namespace."),

    (re.compile(r"(?i)chart .* not found|no chart name found|failed to fetch"),
     502, "CHART_NOT_FOUND", Stage.HELM,
     "The chart could not be pulled at the requested version."),

    (re.compile(r"(?i)no cached repo found|repo .* not found"),
     502, "HELM_REPO_UNAVAILABLE", Stage.HELM,
     "A configured Helm repository is unavailable or was never registered."),

    (re.compile(r"(?i)values don'?t meet the specifications of the schema|"
                r"error validating|yaml: |execution error at|error converting yaml"),
     422, "CHART_VALUES_INVALID", Stage.HELM,
     "The rendered Helm values were rejected by the chart."),

    (re.compile(r"(?i)timed out waiting for the condition|context deadline exceeded"),
     504, "DEPLOYMENT_TIMEOUT", Stage.HELM,
     "The deployment did not become ready before the timeout."),
)

def new_error_id():
    """Short correlation id, minted when an error is reported.

    It is written to the log line and returned to the client, so a user can
    quote one string and an operator can grep the exact entry. Generated here
    rather than per request because only errors need correlating.
    """
    return uuid.uuid4().hex[:12]

def redact(text):
    """Mask credential-looking values and cap length.

    Best effort, not a guarantee - it is pattern-based. It covers ``key: value``
    / ``key=value`` shapes and URL userinfo, which is what Helm and SQLAlchemy
    actually emit, but it cannot recognise a secret that looks like ordinary
    text (an opaque base64 blob, a multi-line YAML block scalar). Treat
    ``detail`` as sanitised, not as safe by construction.
    """
    if not text:
        return ""

    cleaned = str(text)
    for pattern in _SECRET_RE:
        cleaned = pattern.sub(lambda m: m.group(1) + REDACTED, cleaned)
    cleaned = _URL_CREDENTIALS_RE.sub(lambda m: m.group(1) + REDACTED + m.group(3), cleaned)

    if len(cleaned) > MAX_DETAIL_CHARS:
        cleaned = cleaned[:MAX_DETAIL_CHARS] + "... [truncated]"
    return cleaned

def describe(exc):
    """``TypeName: message``. The type matters when the message is empty - a
    bare ``KeyError('name')`` otherwise reads as just ``'name'``."""
    message = str(exc).strip()
    return f"{type(exc).__name__}: {message}" if message else type(exc).__name__

def _classify_by_type(exc, detail):
    """Exceptions identified by class rather than by message text."""
    try:
        import requests
    except ImportError:                                     # pragma: no cover
        requests = None

    if requests is not None:
        if isinstance(exc, requests.exceptions.Timeout):
            return EmcError("The upstream service did not respond in time.",
                            detail=detail, status=504, code="UPSTREAM_TIMEOUT",
                            stage=Stage.UPSTREAM)
        if isinstance(exc, requests.exceptions.SSLError):
            return EmcError("The upstream service presented an invalid TLS certificate.",
                            detail=detail, status=502, code="UPSTREAM_TLS_ERROR",
                            stage=Stage.UPSTREAM)
        if isinstance(exc, requests.exceptions.RequestException):
            return EmcError("The upstream service could not be reached.",
                            detail=detail, status=503, code="UPSTREAM_UNREACHABLE",
                            stage=Stage.UPSTREAM)

    try:
        from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
    except ImportError:                                     # pragma: no cover
        return None

    if isinstance(exc, IntegrityError):
        return Conflict("The change conflicts with a record that already exists.",
                        detail=detail, code="DB_CONSTRAINT_VIOLATION", stage=Stage.DATABASE)
    if isinstance(exc, OperationalError):
        return EmcError("The console's database is not reachable.",
                        detail=detail, status=503, code="DATABASE_UNAVAILABLE",
                        stage=Stage.DATABASE)
    if isinstance(exc, SQLAlchemyError):
        return EmcError("The console's database rejected the operation.",
                        detail=detail, status=500, code="DATABASE_ERROR",
                        stage=Stage.DATABASE)
    return None

def classify(exc, stage=Stage.INTERNAL):
    """Return an :class:`EmcError` for any exception.

    ``stage`` is the caller's hint about what it was doing. A rule that
    identifies the failure more precisely overrides it, so a cluster timeout
    raised during a Helm install reports ``cluster``, not ``helm``.
    """
    if isinstance(exc, EmcError):
        return exc

    detail = describe(exc)

    for pattern, status, code, rule_stage, message in _RULES:
        if pattern.search(detail):
            return EmcError(message, detail=detail, status=status,
                            code=code, stage=rule_stage)

    typed = _classify_by_type(exc, detail)
    if typed is not None:
        return typed

    if isinstance(exc, TimeoutError):
        return EmcError("The operation timed out.", detail=detail, status=504,
                        code="DEPLOYMENT_TIMEOUT",
                        stage=stage if stage in (Stage.HELM, Stage.CLUSTER) else Stage.UPSTREAM)

    return EmcError("An unexpected error occurred in the backend.",
                    detail=detail, status=500, code="INTERNAL_ERROR",
                    stage=Stage.INTERNAL)
