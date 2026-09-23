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

### Fixed

- Status badges no longer wrap onto two lines and break the pill shape (for example "Not found")

---
## [1.0.0] - 2025-12-09

### Added

- User interface to create and view deployed EDC and its components
- Authentication using Central IDP
- View status of deployed EDCs

### Changed


### Security
