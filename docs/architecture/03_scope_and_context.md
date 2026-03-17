# System Scope and Context
The application scope is to enable the creation and operational management of EDCs via a user interface. The application allows the user to register the digital twin registry and submodel server along with the EDC deployment configuration. 

## Business Context

![Business Context](img/business-context-1.svg)

## Technical Context

### Tractus-X Connector

The [Tractus-X Connector](https://github.com/eclipse-tractusx/tractusx-edc) (abbreviated and simplified as EDC) is a
Catena-X specific implementation of
the [Eclipse Dataspace Components Connector (EDC)](https://github.com/eclipse-edc/Connector) is an open-source framework
which can be used to participate within an International Data Space (IDS).

### Digital Twins & Industry Core

The Industry Core defines a layer on top of the combination of IDS and Digital Twin platform capabilities. It defines
the Part Type Twin as a "catalog item" representing a material that has not yet been built (serialized) but sourced. The
[Digital Twin KIT](https://eclipse-tractusx.github.io/docs-kits/kits/Digital%20Twin%20Kit/Adoption%20View%20Digital%20Twin%20Kit)
describes the shared asset pattern used by puris to distribute Digital Twins between the two partners.
For more information refer to the [concepts section](./08_concepts.md)..

## NOTICE

This work is licensed under the [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).

- Copyright (c) 2025 ARENA2036 e.V.
- SPDX-License-Identifier: Apache-2.0
- SPDX-FileCopyrightText: 2024 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/puris