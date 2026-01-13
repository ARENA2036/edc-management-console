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