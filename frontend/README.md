# EMC Frontend

The browser application of the EDC Management Console: deployment wizards, the
dashboard, the monitor and the read-only dataspace settings. It talks only to
the EMC backend.

React 19 + TypeScript, built with Vite, styled with Tailwind CSS, authenticated
through Keycloak (`keycloak-js`), routed with React Router.

## Getting started

```bash
cp .env.example .env     # then fill in the values below
npm install
npm run dev              # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload. |
| `npm run build` | Type-check (`tsc -b`) and produce the production bundle. |
| `npm run lint` | ESLint over the whole source tree. |
| `npm run preview` | Serve the built bundle locally. |

## Configuration

Values come from `import.meta.env` at build time, or from
`window.__RUNTIME_CONFIG__` at container start (`entrypoint.sh` writes it), so
one image can serve several environments. `getRuntimeConfigValue()` applies the
precedence: build-time value, then runtime config, then the fallback.

| Variable | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | Base URL of the EMC backend. |
| `VITE_API_KEY` | API key sent with backend requests. |
| `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID` | Central IDP connection. |
| `VITE_EDC_HOSTNAME` | Host suffix used to build default component endpoints. |
| `VITE_SDE_URL`, `VITE_PORTAL_URL`, `VITE_ICH_URL` | External applications in the sidebar. Empty means the route shows a placeholder. |

## Project structure

Organized by feature. A feature owns its data access, its React state and its
components; anything two features need moves up into `components/`, `hooks/`
or `app/`.

```
src/
  App.tsx                       entry point, wrapped in the dataspace provider
  app/                          the shell: routes, navigation, theme, onboarding
    AppShell.tsx                arranges sidebar, header, routes and footer
    routes/                     AppRoutes + the placeholder and redirect views
    externalApps.ts             one definition per linked application
    useTheme / useOnboarding / useCurrentUser
    constants.ts                storage keys, monitoring interval
  features/
    deployments/                the shared domain
      model.ts                  API rows -> UI models, component limits  (pure)
      payloads.ts               request bodies                           (pure)
      nameRules.ts endpoints.ts connectorYaml.ts                         (pure)
      api.ts                    fetch + localStorage cache of the last good state
      useDeploymentState.ts     the one-minute polling hook
      useDeploymentActions.ts   deploy and delete
      components/
        connector-list/         table, row, details dialog
        component-list/         table, row, details dialog
        deployment-wizard/      dialog, form, useConnectorDraft
        component-wizard/       dialog, two steps, useComponentWizard
    dataspace/                  configuration: types, api, provider + context
    dashboard/                  page, stats, dialogs, useDeploymentDialogs
    monitor/                    page, summary, tables, events, useMonitorInsights
    onboarding/                 the first-run guide and its steps
    settings/                   read-only dataspace settings
  components/
    ui/                         Modal, ConfirmDialog, Button, Notice, fields,
                                DataTable, SectionCard, EmptyState, DetailList,
                                StatsCard, StatusBadge, Tooltip, ErrorDetails
    layout/                     Header, Sidebar (+ sidebar/ navigation data)
  hooks/                        cross-feature React hooks
  utils/                        pure helpers: status, format, storage
  api/                          axios client and ApiError normalization
  auth/                         Keycloak and session identity
  locales/                      en.json (source of truth) and de.json
  types/                        shared domain types
```

Dependency direction is one-way: `app/` -> `features/` -> `components/` +
`utils/`. `utils/` imports nothing from React, and no component imports from
another feature.

## Conventions

- **Single responsibility per file.** A page arranges; a hook decides; a
  component renders what it is given. When a component grows a state machine
  (the wizards, the dialogs), that machine moves into a `use*` hook beside it
  and the component keeps only the markup.
- **Pure logic lives in `utils/` or a feature's `model.ts`.** It takes data and
  returns data, so it can be reasoned about - and tested - without a React tree.
- **One source per fact.** Status and health are derived by
  `computeSystemHealth()` in `utils/status.ts` and used by every screen that
  shows them. Never place a constant in a status position - a card that always
  reads "Healthy" is worse than no card. The model is documented in
  [Concepts](../docs/architecture/08_concepts.md#status-and-health-model).
- **Chrome comes from `components/ui`.** Dialogs use `Modal` / `ConfirmDialog`,
  forms use `TextField` / `SelectField`, sections use `SectionCard`,
  `DataTable` and `EmptyState`. New markup that repeats one of those belongs in
  `components/ui` instead.
- **All user-facing text goes through `useI18n()`** and exists in both
  `en.json` and `de.json`. English is the source of truth: its keys form the
  `TranslationKey` type, so a missing German key fails the build. No literal
  user-facing string in a component, and no language checks in markup.
- **Describe a set once.** The linked applications (SDE, Portal, Industry Core
  Hub) live in `app/externalApps.ts`, which drives the sidebar entries, the
  routes and the redirect pages. Adding one is a single entry, not three edits.
- **Server state belongs in a hook**, not in a component, and configuration is
  fetched once by `DataspaceProvider` rather than per screen.
- **`localStorage` is a cache, not a store.** It holds the last good deployment
  list, the theme and the onboarding flag - nothing that cannot be rebuilt from
  the backend.
- **Errors** are normalized to `ApiError` and shown through `ErrorBanner` or
  `DeploymentStatusModal`; see [ERROR_HANDLING.md](../docs/ERROR_HANDLING.md).
- **Lint is part of the definition of done.** `npm run lint` enforces import
  order and grouping, no duplicate imports, explicit `type` imports and no
  unused symbols. `npm run build` type-checks before it bundles.

> Tests: the frontend has no test setup yet. The pure modules
> (`utils/status.ts`, `features/deployments/model.ts`, `nameRules.ts`,
> `payloads.ts`) and the hooks are written to be testable without a DOM and are
> the place to start.

## Further reading

- [User guide](../docs/user-guide/README.md), including the
  [status reference](../docs/user-guide/README.md#status-reference).
- [Architecture documentation (arc42)](../docs/architecture/README.md).

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2026 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console
