# Changelog

All notable changes to this project will be documented in this file.


All notable changes to this project will be documented in this file see also the overarching [`CHANGELOG.md`](https://eclipse-tractusx.github.io/blog-changelog) for Tractus-X releases.

---
## [Unreleased]

### Added

- Status reference in the user guide, explaining every connector/component phase, the aggregated health values and the activity card ([docs/user-guide](./docs/user-guide/README.md#status-reference))
- arc42 sections filled in: building block view, cross-cutting concepts, architecture decisions, glossary, and an index of the architecture documentation
- Frontend README describing the project structure, configuration and conventions

### Changed

- System health on the dashboard is now derived from the reported component phases instead of always showing "Healthy"; the dashboard and the monitor share one health function, so the two views cannot disagree
- Activity on the dashboard now shows deployments in progress and the timestamp of the last successful backend sync instead of a fixed "Sync running" label
- "Active" counts on the registry and submodel service cards now count healthy deployments rather than repeating the total
- Deployment state is re-read every minute on both the dashboard and the monitor
- Frontend reorganized by feature: the former 1771-line `AppNew.tsx` is split into `app/`, `features/` and shared `utils/`, and renamed to `App.tsx`
- Frontend restructured for maintainability: every screen and dialog now has a single responsibility, wizard state moved into hooks (`useComponentWizard`, `useConnectorDraft`, `useDeploymentDialogs`), and repeated markup became shared primitives in `components/ui` (`Modal`, `ConfirmDialog`, `Button`, `Notice`, form fields, `DataTable`, `SectionCard`, `EmptyState`, `DetailList`)
- Dataspace configuration is fetched once per session through a provider instead of separately on each screen
- ESLint now enforces import order and grouping, no duplicate imports, explicit `type` imports and unused-symbol checks

### Removed

- Unreferenced components (`ConnectorTable`, `ConnectorTableNew`, `AddConnectorModal`, `EditModal`, `HealthWidget`) and a superseded duplicate of `keycloak.ts`

### Fixed

- Status badges no longer wrap onto two lines and break the pill shape (for example "Not found")
- Connector and component detail dialogs no longer contain hard-coded English and German strings; all of their labels are translated
- The redirect page for linked applications no longer uses SDE-specific text for Portal and Industry Core Hub, and each application now has its own "not configured" description; the sidebar, the routes and the redirect pages are driven by one definition per application
- Missing license headers added to the source files that lacked them

---
## [1.0.0] - 2025-12-09

### Added

- User interface to create and view deployed EDC and its components
- Authentication using Central IDP
- View status of deployed EDCs

### Changed


### Security
