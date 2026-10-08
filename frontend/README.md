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
components; anything two features need moves up into `utils/`, `components/`
or `app/`.

```
src/
  App.tsx                     entry point
  app/                        AppShell (navigation, theme, routes) + shared constants
  features/
    deployments/              the shared domain
      model.ts                API rows -> UI models, component limits   (pure)
      api.ts                  fetch + localStorage cache of the last good state
      useDeploymentState.ts   the one-minute polling hook
      useDeploymentActions.ts deploy and delete
    dataspace/                configuration document: types, api, useDataspace
    dashboard/                Dashboard + DashboardStats
    monitor/                  Monitor + summary, tables, events, recommendations
    settings/                 read-only dataspace settings
  components/                 reusable presentational components
  utils/                      pure helpers: status, format, storage, nameRules, ...
  api/                        axios client and ApiError normalization
  auth/                       Keycloak and session identity
  locales/                    en.json (source of truth) and de.json
```

Dependency direction is one-way: `app/` -> `features/` -> `components/` +
`utils/`. `utils/` imports nothing from React, and no component imports from
another feature.

## Conventions

- **Pure logic lives in `utils/` or a feature's `model.ts`.** It takes data and
  returns data, so it can be reasoned about (and later tested) without a React
  tree.
- **One source per fact.** Status and health are derived by
  `computeSystemHealth()` in `utils/status.ts` and used by every screen that
  shows them. Never place a constant in a status position - a card that always
  reads "Healthy" is worse than no card. The full model is documented in
  [Concepts](../docs/architecture/08_concepts.md#status-and-health-model).
- **All user-facing text goes through `useI18n()`** and exists in both
  `en.json` and `de.json`. English is the source of truth: its keys form the
  `TranslationKey` type, so a missing German key fails the build.
- **Server state belongs in a hook**, not in a component: components receive
  what they render.
- **`localStorage` is a cache, not a store.** It holds the last good deployment
  list, the theme and the onboarding flag - nothing that cannot be rebuilt from
  the backend.
- **Errors** are normalized to `ApiError` and shown through `ErrorBanner` or
  `DeploymentStatusModal`; see [ERROR_HANDLING.md](../docs/ERROR_HANDLING.md).

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
