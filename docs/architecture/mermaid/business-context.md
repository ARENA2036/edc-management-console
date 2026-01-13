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