# Glossary

| Term | Definition |
| --- | --- |
| BPNL | Business Partner Number Legal Entity. The Catena-X identifier of a legal entity. |
| Catena-X | The automotive dataspace whose standards this console follows. |
| Central IDP | The federated Keycloak instance that issues user tokens for the dataspace. |
| Component | Anything the console deploys and tracks: a connector, a Digital Twin Registry or a Submodel Server. |
| Connector (EDC) | Eclipse Dataspace Connector instance, consisting of a control plane and a data plane. |
| Dataspace | The federated environment the console operates in, described by the backend's dataspace configuration. |
| Degraded | Phase: some replicas ready and some not, or ready replicas whose own API does not answer. |
| DTR | Digital Twin Registry. Holds the digital twins that point at submodel data. |
| EMC | EDC Management Console - this application. |
| Helm release | The unit the backend deploys and later identifies workloads by. |
| Overall health / System health | The aggregated state shown on the monitor and the dashboard. See [Concepts](08_concepts.md#status-and-health-model). |
| Phase | The state of one component: `active`, `deploying`, `degraded`, `failed`, `not_found`, `unknown`. |
| Probe | The in-cluster request to a ready component's own API that separates "running" from "serving". |
| Scope | What a caller is allowed to see or change, derived from the Keycloak token. |
| SDE | Simple Data Exchanger. The application used for the actual data exchange. |
| SMS | Submodel Server (also Submodel Service). Serves the payload behind a digital twin. |
| Tractus-X | The Eclipse project providing the open-source reference implementation of Catena-X. |

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2026 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console
