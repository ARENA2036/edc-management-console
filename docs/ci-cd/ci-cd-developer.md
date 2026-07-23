# Developer Preview Environment

```mermaid
flowchart TD

    A[Developer 1<br/>feature/user-login] --> G[GitHub Actions CI/CD]
    B[Developer 2<br/>feature/dashboard] --> G
    C[Developer 3<br/>feature/api-integration] --> G

    G --> H[Verify<br/>Helm Lint<br/>Security Scans]
    H --> I[Build Backend & Frontend<br/>Docker Images]
    I --> J[Push Images to<br/>Harbor Registry]
    J --> K[Trivy<br/>Image Scan]

    K --> T{Image Tag}

    T -->|Manual tag provided| T1[Use Manual Image Tag]
    T -->|No manual tag| T2[Use Git SHA]

    T1 --> U[Update values-dev.yaml]
    T2 --> U

    U --> L[Generate Preview Environment]

    L --> M{Developer Branch}

    M -->|feature/user-login| M1[Argo CD App<br/>emc-feature-user-login-HASH<br/>Namespace: emc-feature-user-login-HASH]

    M -->|feature/dashboard| M2[Argo CD App<br/>emc-feature-dashboard-HASH<br/>Namespace: emc-feature-dashboard-HASH]

    M -->|feature/api-integration| M3[Argo CD App<br/>emc-feature-api-integration-HASH<br/>Namespace: emc-feature-api-integration-HASH]

    M1 --> N1[Frontend URL<br/>feature-user-login-HASH.dev.arena2036-x.de]
    M2 --> N2[Frontend URL<br/>feature-dashboard-HASH.dev.arena2036-x.de]
    M3 --> N3[Frontend URL<br/>feature-api-integration-HASH.dev.arena2036-x.de]

    N1 --> P1[Backend URL<br/>feature-user-login-HASH-backend.dev.arena2036-x.de]
    N2 --> P2[Backend URL<br/>feature-dashboard-HASH-backend.dev.arena2036-x.de]
    N3 --> P3[Backend URL<br/>feature-api-integration-HASH-backend.dev.arena2036-x.de]

    P1 --> O1[Grafana URL<br/>feature-user-login-HASH-grafana.dev.arena2036-x.de]
    P2 --> O2[Grafana URL<br/>feature-dashboard-HASH-grafana.dev.arena2036-x.de]
    P3 --> O3[Grafana URL<br/>feature-api-integration-HASH-grafana.dev.arena2036-x.de]

    X["📝 One Argo CD Application<br/>per Developer Preview"] -.-> M
    Y["📝 One Kubernetes Namespace<br/>per Developer Preview"] -.-> M
    Z["📝 Frontend uses its own<br/>preview Backend URL"] -.-> P2
    AA["📝 Developers can test<br/>independently"] -.-> O2
```

## How It Works

1. A developer creates a branch such as `feature/user-login`, `bugfix/...`, or `hotfix/...`.
2. A push to the developer branch automatically starts the GitHub Actions CI/CD pipeline.
3. The pipeline:

   * Verifies the code.
   * Runs Helm lint and security checks.
   * Builds backend and frontend Docker images.
   * Pushes the images to the Harbor registry.
   * Runs a Trivy vulnerability scan.
4. The pipeline selects the Docker image tag:

   * If a manual `image_tag` is provided, that tag is used.
   * If no manual `image_tag` is provided, the current Git SHA is used automatically.
5. The backend and frontend image tags are updated in `values-dev.yaml`.
6. GitHub Actions generates a unique preview name using the branch name and a short branch hash.
7. A dedicated Argo CD Application and Kubernetes namespace are created.
8. Preview-specific Helm parameters override the base configuration from `values-dev.yaml`.
9. Argo CD deploys the preview environment to the AP6 development cluster.
10. The frontend uses the backend URL belonging to the same preview environment.
11. Grafana connects to the Prometheus and Loki services belonging to the same preview environment.

## Deployment Example

| Developer   | Feature Branch            | Argo CD Application                | Kubernetes Namespace               |
| ----------- | ------------------------- | ---------------------------------- | ---------------------------------- |
| Developer 1 | `feature/user-login`      | `emc-feature-user-login-HASH`      | `emc-feature-user-login-HASH`      |
| Developer 2 | `feature/dashboard`       | `emc-feature-dashboard-HASH`       | `emc-feature-dashboard-HASH`       |
| Developer 3 | `feature/api-integration` | `emc-feature-api-integration-HASH` | `emc-feature-api-integration-HASH` |

The short `HASH` is generated from the complete branch name. This helps prevent similarly named branches from using the same Argo CD Application or Kubernetes namespace.

## How the Deployment Works

The CI/CD pipeline uses `values-dev.yaml` as the base development configuration.

The selected image tag is:

* The manually provided `image_tag`, when one is provided.
* Otherwise, the current Git SHA.

For example:

```yaml
backend:
  image:
    tag: <manual-image-tag-or-git-sha>

frontend:
  image:
    tag: <manual-image-tag-or-git-sha>
```

GitHub Actions then generates the developer-specific Argo CD Application from:

```text
.github/argocd/emc-dev-preview-app.yaml
```

Helm combines `values-dev.yaml` with preview-specific Argo CD parameters.

Each developer preview receives:

* A unique Argo CD Application.
* A unique Kubernetes namespace.
* A unique Helm release name.
* A unique backend and frontend image tag.
* A unique frontend ingress host.
* A unique backend ingress host.
* A unique Grafana ingress host.
* A preview-specific frontend backend URL.
* Preview-specific Prometheus and Loki datasource URLs.

## Frontend and Backend Configuration

The frontend must communicate with the backend from the same preview environment.

For example:

```text
Preview:
emc-feature-user-login-451936f
```

Frontend:

```text
https://feature-user-login-451936f.dev.arena2036-x.de
```

Backend:

```text
https://feature-user-login-451936f-backend.dev.arena2036-x.de
```

The frontend configuration should therefore use the preview backend URL instead of the fixed shared backend URL.

Conceptually:

```text
Developer Preview Frontend
          ↓
VITE_BACKEND_URL
          ↓
Developer Preview Backend
```

This prevents a developer preview frontend from accidentally calling the shared Dev backend.

## Observability

Each preview environment has its own observability services.

For example:

```text
Prometheus:
emc-feature-user-login-451936f-prometheus-server

Loki:
emc-feature-user-login-451936f-loki-gateway

Grafana:
emc-feature-user-login-451936f-grafana
```

Grafana connects to:

```text
http://emc-feature-user-login-451936f-prometheus-server

http://emc-feature-user-login-451936f-loki-gateway
```

The Grafana dashboard sidecar also searches the preview namespace for dashboard ConfigMaps.

## Benefits

* Isolated preview environment for every developer branch.
* Supports `feature/*`, `bugfix/*`, and `hotfix/*`.
* Developer branches run automatically on push.
* Multiple developers can test simultaneously.
* No deployment conflicts between developers.
* Manual Docker image tag support.
* Git SHA is used automatically when no manual tag is provided.
* Frontend communicates with the correct preview backend.
* Unique frontend, backend, and Grafana endpoints.
* Each preview uses its own Prometheus and Loki services.
* The same Helm chart and `values-dev.yaml` are reused.
* Developer previews are deployed to the AP6 development cluster.
* Shared Dev and Production remain separate from developer preview deployments.
