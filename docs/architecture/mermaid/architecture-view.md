```mermaid
flowchart LR
    User[User]
    Frontend[Frontend]
    Backend[Backend API]
    DB[(Database)]
    Helm[Helm CLI]
    EDCCluster[EDC Deployment Cluster]
    IDP[Central IDP]

    User -->|UI Actions| Frontend
    Frontend -->|REST API| Backend
    Frontend -->|Authenticate| IDP
    Backend -->|Persist Metadata| DB
    Backend -->|Execute| Helm
    Backend --> Frontend
    
    DB --> Backend
    Helm -->|Deploy Charts| EDCCluster

    EDCCluster --> Backend
```

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2025 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2024 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console