# Building Block View

![architecture](img/architecture-1.svg)

## Level 1: system overview

| Building block | Responsibility |
| --- | --- |
| EMC frontend | React single-page application. Deployment wizards, dashboard, monitor, read-only dataspace settings. Talks only to the EMC backend. |
| EMC backend | FastAPI service. Owns the component database, validates requests, runs Helm, and derives component health from the Kubernetes API. |
| Kubernetes cluster | Runs the deployed connectors, Digital Twin Registries and Submodel Servers. The source of truth for every phase the console reports. |
| Keycloak (Central IDP) | Issues user tokens; the backend derives the caller's scope from them. |
| External applications | Portal, SDE and Industry Core Hub, linked from the sidebar when configured. |

## Level 2: frontend

Organized by feature. A feature folder owns its data access, its React state
and its components; anything used by two features moves up into `utils/`,
`components/` or `app/`.

| Path | Contents |
| --- | --- |
| `src/App.tsx` | Entry point; renders the shell. |
| `src/app/` | `AppShell` (navigation, theme, routes, onboarding guide) and `constants.ts` (storage keys, monitoring interval). |
| `src/features/deployments/` | The shared domain: `model.ts` (API row to UI mapping, component limits), `api.ts` (fetch plus the localStorage cache), `useDeploymentState.ts` (polling), `useDeploymentActions.ts` (deploy and delete). |
| `src/features/dataspace/` | `types.ts` (configuration document), `api.ts`, `useDataspace.ts`. Configuration is loaded once per screen, not polled. |
| `src/features/dashboard/` | `Dashboard.tsx` (wizards and tables) and `DashboardStats.tsx` (the headline cards). |
| `src/features/monitor/` | `Monitor.tsx` plus `MonitorSummary`, `ConnectorHealthTable`, `ServiceHealthTable`, `MonitorRecommendations`, `MonitorEvents`, and `useMonitorInsights.ts` for the derived feed. |
| `src/features/settings/` | Read-only dataspace settings. |
| `src/components/` | Reusable presentational components: wizards, modals, tables, badges, tooltips. |
| `src/utils/` | Pure helpers with no React dependency: `status.ts` (phases, tones, aggregated health), `format.ts`, `storage.ts`, `nameRules.ts`, `deployment.ts`, `endpoints.ts`, `connectorYaml.ts`. |
| `src/api/` | Axios client and the `ApiError` normalization. |
| `src/auth/` | Keycloak setup and the session identity hook. |
| `src/locales/` | `en.json` (source of truth) and `de.json`. |

Dependency direction: `app/` to `features/` to `components/` and `utils/`.
Components never reach back into a feature, and `utils/` imports nothing from
React.

## Level 2: backend

| Path | Contents |
| --- | --- |
| `app/api/routers/` | URL to call binding, plus the response envelope. No rules. |
| `app/services/` | The rules: what may be deployed, what a caller may see, how a component's status is assembled. |
| `app/managers/` | The outside world: Helm, the Kubernetes API (`cluster_manager.py`), the EDC APIs. Every method fails soft. |
| `app/models/` | Request and database models. |
| `app/utils/` | Error envelopes, HTTP helpers, ownership and scope. |

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2026 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console
