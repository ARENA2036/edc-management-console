```mermaid
flowchart LR
    %% Runtime processes
    UserProc[User Process]
    FEProc[Frontend Web Process]
    BEProc[Backend API Process]
    DeployProc[EDC Deployment Process]
    DBProc[Database Process]
    K8sProc[Kubernetes Cluster Process]

    %% Interaction flow
    UserProc --> FEProc
    FEProc --> BEProc

    BEProc --> DBProc
    BEProc --> DeployProc

    DeployProc --> K8sProc
    K8sProc --> DeployProc

    DeployProc --> BEProc
    BEProc --> FEProc
```

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2025 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2024 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console