# Introduction and Goals

Many organizations struggle to perform even a basic data exchange using Tractus-X components. Essential tools — such as an accessible way to provision EDCs or a simple interface for exchanging data are often missing, making the onboarding experience unnecessarily complex. Yet hands-on experience with data exchange is crucial for understanding the core mechanics of a data space, including policies, contract negotiation, semantic models, and the overall federated interaction patterns.

The EDC Management Console is a comprehensive management platform designed to facilitate the deployment, configuration, monitoring, and interaction with Eclipse Dataspace Connector (EDC) instances. It serves as a centralized tool that enables developers, administrators, and other users to efficiently manage data exchanges, connectors, and system operations within an EDC-based environment. The console is designed to work seamlessly with Keycloak for identity and access management and provides a unified, easy-to-use interface for managing connectors, policies, data flows, and monitoring system health. 


## Requirements Overview

The following requirements shall be fulfilled:

- Deployment of EDC Connector Instances: The platform includes a wizard for the straightforward deployment of EDC connector instances, ensuring quick setup and configuration for users. 

- Connector Management (CRUD operations): The EDC Management Console enables users to perform Create, Read, Update, and Delete (CRUD) operations on EDC connectors, allowing full control over the connector lifecycle.

- Version Based EDC Connectors: The console allows users to deploy different versions of EDCs. Currently, only v0.9.0 and 0.10.2 EDC versions are supported. 

- System Health and Activity Monitoring: Users can monitor system health, activity logs, and error tracking, ensuring smooth operation and quick identification of issues in the EDC infrastructure. 

- Data Operations using EDC: The console allows GET/POST data operations with policies, providing users with the ability to interact with and manage data exchanges securely and efficiently. 

- Authentication via Keycloak: The console integrates with the federated Keycloak service for user identification (e.g., authentication and authorization), ensuring secure access control and role-based permissions. 

- Backend API: The backend API facilitates the connector logic, EDC API proxying, and storage operations, providing a robust interface for developers to extend and customize their integration with the EDC framework. 

## Quality Goals

| Quality Goal              | Motivation and Description                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Compatibility to Catena-X | EMC follows similar patterns as use cases in resiliency topics and overall Catena-X. |
| Fast usage                | EMC allows partners to exchange data with as little onboarding effort as needed      |
| Data sovereignty          | EMC follows Catena-X and GAIA-X requirements for data sovereignty                    |

## Stakeholders

Key stakehoders for EDC-Management-Console are:

<!-- | Stakeholder            | Goal or Interest                            |
| ---------------------- | ------------------------------------------- |
| Catena-X Ecosystem     | Integration of the Ecosystem concepts       |
| Politics and Companies | more resilient supply networks              |
| SME                    | less efforts for integration                |
| Disposition            | Knowledge about supply and demand situation | -->

## NOTICE

This work is licensed under the [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).

- Copyright (c) 2025 ARENA2036 e.V.
- SPDX-License-Identifier: Apache-2.0
- SPDX-FileCopyrightText: 2024 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/puris