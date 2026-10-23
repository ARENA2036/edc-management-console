# Concepts

Cross-cutting concepts that apply to more than one building block.

- [Status and health model](#status-and-health-model)
- [Monitoring loop](#monitoring-loop)
- [Error handling](#error-handling)
- [Internationalization](#internationalization)
- [Authentication and scope](#authentication-and-scope)
- [Frontend structure](#frontend-structure)

## Status and health model

Everything the console says about the state of a deployment comes from one
place: the phase the backend reports per component. There is no second,
independently maintained notion of "health" anywhere in the UI.

### 1. Phase: the state of one component

`app/managers/cluster_manager.py` derives the phase from Kubernetes, and the
phase is part of the API contract:

| Phase | Meaning | How it is reached |
| --- | --- | --- |
| `active` | Running and serving. | Every workload of the release has all replicas ready, and - when it could be probed - the component's own API answered. |
| `deploying` | Rolling out. | Workloads exist, nothing is ready yet, nothing has failed. |
| `degraded` | Partly usable. | Some replicas are ready and some are not, or all replicas are ready but the component's own API did not answer. The `detail` field names which. |
| `failed` | Not usable. | A container cannot start, or the rollout exceeded its progress deadline. |
| `not_found` | Nothing is deployed under this release label. | The database still has the row, the cluster has no workloads for it. |
| `unknown` | The cluster could not be asked. | Missing or rejected Kubernetes credentials, or an API error. It says nothing about the component itself. |

Two points worth remembering:

- Kubernetes is the primary source. The reachability probe only runs once the
  workloads report ready, and it can only downgrade `active` to `degraded` -
  an inconclusive probe never contradicts Kubernetes.
- `unknown` is a statement about the console's view, not about the component.
  A component that runs perfectly well shows `unknown` if the console lost its
  cluster credentials.

The frontend normalizes incoming values (`utils/status.ts`) so historical
spellings such as `healthy`, `running`, `unreachable`, `error` or `inactive`
map onto the six phases above. Each phase has a fixed colour tone: green for
`active`, blue for `deploying`, amber for `degraded`, red for `failed` and
`not_found`, grey for `unknown`.

### 2. Aggregated health: the state of everything

`computeSystemHealth()` in `utils/status.ts` folds all connector and component
phases into one value. It is severity-ordered - the first row that matches
wins:

| Value | Matches when | Tone |
| --- | --- | --- |
| `Nothing deployed` | No connectors and no components exist. | grey |
| `Critical` | Any deployment is `failed` or `not_found`. | red |
| `Warning` | Any deployment is `degraded`, or its phase is `unknown`. | amber |
| `Deploying` | Any deployment is `deploying`, and nothing worse applies. | blue |
| `Healthy` | Every deployment is `active`. | green |

The dashboard's **System health** card and the monitor's **Overall health**
card both call this function over the same data, so the two screens cannot
disagree. Nothing is hard-coded: with a failing connector the dashboard says
`Critical`, not `Healthy`.

### 3. Activity: is work in flight, and is the view current

The dashboard's **Activity** card answers a different question from health:

| Part of the card | Value | Meaning |
| --- | --- | --- |
| Value | `N deploying` | `N` connectors or components are in a `deploying` phase. |
| Value | `Idle` | Nothing is rolling out. It says nothing about health - a `not_found` connector is still "Idle". |
| Subtitle | `Last sync HH:MM:SS` | When the last poll actually reached the API. |
| Subtitle | `Waiting for first sync` | No poll has succeeded yet in this session. |

The sync stamp is only written when the request succeeded, so a stamp that
stops advancing is the signal that the backend has stopped answering - the
stale-data banner appears alongside it.

## Monitoring loop

There is no scheduler in the backend and no push channel to the browser.
Health is computed on request, and the frontend polls:

- `useDeploymentState()` calls `GET /api/components` on mount and then every
  `MONITORING_INTERVAL_MS` (60 s, `app/constants.ts`). Both the dashboard and
  the monitor use it, so both refresh on the same cadence.
- Every successful answer is cached in `localStorage`. A failing poll keeps the
  last good list on screen and raises the stale-data banner instead of emptying
  the tables. An authentication failure clears the cache, because showing
  another user's deployments would be worse than showing none.
- Deploy and delete actions refresh immediately rather than waiting for the
  next tick, and the backend's answer overrides the optimistic row.

## Error handling

API errors are normalized into `ApiError` (status, code, stage, message, hint)
and rendered by `ErrorBanner` / `DeploymentStatusModal`. The stages and codes
are documented in [ERROR_HANDLING.md](../ERROR_HANDLING.md).

## Internationalization

All user-facing text goes through `useI18n()` and lives in
`src/locales/en.json` and `src/locales/de.json`. The English file is the source
of truth: its keys are the `TranslationKey` type, so a missing German key is a
compile error rather than a blank label. No status label is built by string
concatenation in a component.

## Authentication and scope

Keycloak issues the session; the backend derives a `ComponentScope` from the
token and every component route is filtered by it. Administrative actions
(deploy, delete) additionally require the admin scope, and the frontend hides
the corresponding controls when `identity.isAdmin` is false.

## Frontend structure

The frontend is organized by feature, not by technical layer - see
[Building Block View](05_building_block_view.md#level-2-frontend). The rule of
thumb: pure domain logic in `utils/` and `features/*/model.ts`, data access in
`features/*/api.ts`, React state in `features/*/use*.ts`, and components that
only render what they are given.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2026 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console
