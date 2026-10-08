# Solution Strategy

The decisions that shape everything else, in one page. The building blocks they
produce are described in [Building Block View](05_building_block_view.md), the
rules that cut across them in [Concepts](08_concepts.md), and the reasoning
behind the non-obvious ones in
[Architecture Decisions](09_architecture_decisions.md).

## Technology decisions

| Decision | Motivation |
| --- | --- |
| Python / FastAPI backend | Typed request models and generated OpenAPI, and direct access to the official Kubernetes and Helm tooling the console drives. |
| Helm as the deployment mechanism | Connectors, Digital Twin Registries and Submodel Servers already ship as Tractus-X charts; the console configures and installs those rather than templating Kubernetes resources of its own. |
| The Kubernetes API as the source of truth for state | The console does not track what it deployed in its own status field: it asks the cluster. A deployment changed or removed outside the console is therefore reported correctly. |
| SQLAlchemy over a relational database | The console owns only the record of what it was asked to deploy - name, version, endpoints, ownership - which is small, relational and must outlive a pod restart. |
| React, TypeScript, Vite, Tailwind CSS | A single-page application with compile-time checking of both code and translation keys, and no design-system dependency to track. |
| Keycloak (Central IDP) | The dataspace already federates identity there; the console derives every caller's scope from that token instead of maintaining users. |
| Build once, configure at runtime | One image per release; `entrypoint.sh` substitutes the environment's URLs into a runtime configuration file, so promoting an image between environments changes no code. |

## Top-level decomposition

- **Frontend, backend, cluster.** The browser talks only to the EMC backend; only the backend talks to Helm, the Kubernetes API and the deployed components. Credentials never reach the browser.
- **Backend layering: routers, services, managers.** Routers bind a URL to a call and shape the reply, services hold the rules, managers own the outside world (Helm, Kubernetes, the EDC APIs) and fail soft. No rules live in a router.
- **Frontend by feature.** A feature owns its data access, its React state and its components; pure logic sits in modules with no React dependency, and shared chrome in a small set of UI primitives.

## How the quality goals are met

| Quality goal | Approach |
| --- | --- |
| Compatibility to Catena-X | The console deploys the official Tractus-X charts with Catena-X-conformant configuration; it adds no connector variant of its own. |
| Fast usage | A guided wizard with validated defaults derived from the dataspace configuration, so a participant deploys a connector without writing Helm values. |
| Data sovereignty | The console provisions and observes components; it never proxies or stores exchanged data. Policies and contracts stay inside the connector. |
| Trustworthy status | Every state the UI shows is derived from what the cluster reports, aggregated by one shared function - see [Concepts](08_concepts.md#status-and-health-model). |
| Operability | Health is computed on request and polled by the browser, so there is no background load when nobody is watching and no extra infrastructure to run - see [ADR-002](09_architecture_decisions.md). |

## Organizational decisions

- The project follows the [Tractus-X Release Guidelines](https://eclipse-tractusx.github.io/docs/release), including license headers on every file, declared dependencies, and DCO sign-off on contributions.
- Architecture documentation follows arc42; decisions that are not obvious from the code are recorded as numbered decision records rather than explained in review comments.
- User-facing text exists in English and German, with English as the source of truth; a missing translation is a build error rather than a blank label.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2026 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console
