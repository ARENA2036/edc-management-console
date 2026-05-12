```mermaid
flowchart LR
    User[User - Operator]

    subgraph CX_Cluster
        IDP[Central_IDP]
    end

    subgraph EMC_Cluster
        subgraph EMC_Namespace
            FE[Frontend]
            BE[Backend_API]
            DB[(Database)]
            FE --> BE
            BE --> DB
            DB --> BE
            BE --> FE
        end
    end

    %% Target Clusters
    subgraph Target_Clusters
        ClusterAPI[Cluster API]
        EDC1[EDC Control Plane]
        EDC2[EDC Data Plane]
        DTR[Digital Twin Registry]
        SBS[Submodel Server]
        ClusterAPI --> EDC1
        ClusterAPI --> EDC2
        ClusterAPI --> DTR
        ClusterAPI --> SBS
    end

    %% Connections
    User --> FE
    FE --> IDP
    BE --> ClusterAPI



```

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2025 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2024 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console