```mermaid
flowchart LR
    User[User]
    EMC[EDC Management Console]
    EDC[Eclipse DataSpace Connector]
    DTR[Digital Twin Registry]
    SBS[Submodel Server]

    User --- EMC
    EMC --- EDC
    EMC --- DTR
    EMC --- SBS
```

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- Copyright (c) 2025 ARENA2036 e.V.
- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2024 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/edc-management-console