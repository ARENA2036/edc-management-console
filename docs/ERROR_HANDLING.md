# Error handling

Every failure answers four questions instead of one: **what** went wrong,
**whose** problem it is (HTTP status), **where** it broke (`stage`), and
**which** failure it was (`code`).

## Envelope

Additive — `error` and `status` are unchanged, so existing clients keep working.

```jsonc
{
  "error":  "The target namespace does not exist in the cluster.",
  "status": 422,
  "code":   "NAMESPACE_NOT_FOUND",   // clients switch on this, never on the text
  "stage":  "cluster",               // WHERE it broke
  "detail": "Error: namespaces \"dataspace\" not found",   // redacted, truncated
  "hint":   "Refresh the dashboard - the component list has changed.",
  "errorId": "a3f91c72b0d4"          // also in the backend log line
}
```

`errorId` is minted when an error is reported and written to both the response
and `backend/logs/<date>/*.log`, so a user can quote one string and an operator
can grep the exact entry.

**Redaction is best effort.** `errors.redact` masks `key: value` / `key=value`
shapes and URL userinfo — what Helm and SQLAlchemy actually emit. It cannot
recognise a secret that looks like ordinary text (opaque base64, multi-line YAML
block scalars). Treat `detail` as sanitised, not safe by construction, and gate
it behind an operator role before exposing the console to non-operators.

## `stage` — where the error is

| `stage` | Meaning | Who fixes it |
|---|---|---|
| `request` | The payload that was sent | The user |
| `auth` | Authentication against this console | The user |
| `config` | `configuration.yml` / environment | Console operator |
| `database` | The console's own store | Console operator |
| `helm` | Chart, values, release state | Console operator |
| `cluster` | Kubernetes API: reachability, RBAC, namespace, quota | Cluster admin |
| `upstream` | Another HTTP dependency (IdP, wallet, component probe) | That service |
| `internal` | Unclassified — a bug here | Console developer |
| `network` * | The request never reached the backend | Network / ingress |
| `client` * | Request succeeded, browser-side code rejected the outcome | Console developer |

\* frontend only — the backend cannot report these.

## Status map

`errors.classify` matches Helm / kubectl / `requests` / SQLAlchemy failures
against an ordered rule table. **Every rule is pinned by a test** in
`backend/tests/test_errors.py`, including the ordering-sensitive pairs.

| Code | Status | Stage |
|---|---|---|
| `CLUSTER_UNREACHABLE` | 503 | cluster |
| `KUBECONFIG_INVALID` | 503 | cluster |
| `CLUSTER_FORBIDDEN` | 502 | cluster |
| `NAMESPACE_NOT_FOUND` | 422 | cluster |
| `CLUSTER_RESOURCE_EXHAUSTED` | 503 | cluster |
| `IMAGE_PULL_FAILED` | 502 | cluster |
| `HELM_BINARY_MISSING` | 503 | helm |
| `RELEASE_LOCKED` / `RELEASE_NAME_IN_USE` / `RELEASE_NOT_DEPLOYED` | 409 | helm |
| `RELEASE_NOT_FOUND` | 404 | helm |
| `CHART_NOT_FOUND` / `HELM_REPO_UNAVAILABLE` | 502 | helm |
| `CHART_VALUES_INVALID` | 422 | helm |
| `DEPLOYMENT_TIMEOUT` | 504 | helm |
| `DATABASE_UNAVAILABLE` | 503 | database |
| `DB_CONSTRAINT_VIOLATION` | 409 | database |
| `UPSTREAM_UNREACHABLE` / `UPSTREAM_TLS_ERROR` / `UPSTREAM_TIMEOUT` | 503 / 502 / 504 | upstream |
| `VALIDATION_FAILED` | 422 | request |
| `MISSING_REQUIRED_FIELD` / `DUPLICATE_COMPONENT_NAME` / `VERSION_UNSUPPORTED` / `COMPONENT_TYPE_UNKNOWN` | 400 | request |
| `COMPONENT_LIMIT_REACHED` | 409 | request |
| `COMPONENT_NOT_FOUND` | 404 | request |
| `NOT_AUTHORIZED` | 401 | auth |
| `COMPONENT_CONFIG_INVALID` | 500 | config |
| `INTERNAL_ERROR` | 500 | internal |

> Anything `classify` does not positively recognise stays **500 /
> `INTERNAL_ERROR`**. Guessing a 4xx for an unknown fault would disguise a
> backend bug as user error.

## Verifying

```bash
cd backend && python3 -m pytest tests/          # 64 tests
cd frontend && npx tsc -p tsconfig.app.json --noEmit
```

| To reproduce | Do this |
|---|---|
| `CLUSTER_UNREACHABLE` 503 | point `KUBECONFIG` at a dead cluster and deploy |
| `NAMESPACE_NOT_FOUND` 422 | set `clusterConfig.namespace` to a missing namespace |
| `VERSION_UNSUPPORTED` 400 | POST a version not in `components.<type>.versions` |
| `COMPONENT_LIMIT_REACHED` 409 | deploy past `maxInstances` |
| `DUPLICATE_COMPONENT_NAME` 400 | two components with the same `name` in one payload |
| `VALIDATION_FAILED` 422 | omit `type` from a component entry |
| `BACKEND_UNREACHABLE` (frontend) | stop the backend, click deploy |

## Known defects, found but deliberately not fixed

Out of scope for this change (exception handling only), listed by impact.

1. **`database_manager` is undefined** in both `/api/submodel` routes
   (`init.py`) — the instance is `databaseManager`. Every call raises
   `NameError`. It now returns a clean 500 with an `errorId` instead of an
   unformatted traceback, but the endpoints remain non-functional.
2. **`DatabaseManager` never rolls back** — all five methods use `try/finally`
   with no `except`; the comment on line 32 says *"Add exception catch and
   session rollback"*.
3. **JWT signatures are not verified** — `auth/keycloak_config.py` passes
   `options={"verify_signature": False}`.
4. **`StatusBadge` shows a dead connector as "Active"** —
   `components/ConnectorsManager.tsx`, the `unhealthy | inactive | critical`
   branch returns the same green badge as the healthy branch.
5. **`/api/logs` is commented out** but the frontend polls it every 30 s. Its
   failures are intentionally not surfaced in the UI for that reason.
6. **Three different auth schemes** across the API, and `/api/dataspace` has
   none.
7. **`get_oauth2_token`** (`utilities/auth_utils.py`) has no status check and no
   timeout — an IdP 401 raises `KeyError`.
