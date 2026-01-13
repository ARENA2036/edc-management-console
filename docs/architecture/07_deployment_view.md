# Deployment View

## Local Deployment
Local deployment requires the backend to be configured to deploy a local cluster (minikube). This process is not yet tested.

## Kubernetes Deployment
The very basic EMC application deployment model looks as follows:

![Kubernetes deployment model](img/deployment_view-1.svg)

The keycloak may be configured to be used. Also, a decentral instance may be connected to the frontend.

The chart allows also to either install the database as a dependency or bring your own.

## NOTICE

This work is licensed under the [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).

- SPDX-License-Identifier: Apache-2.0
- SPDX-FileCopyrightText: 2024 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/puris
