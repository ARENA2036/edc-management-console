# EMC CI/CD Flow

```mermaid
flowchart TD

    A[Developer Push<br/>Workflow Dispatch]

    subgraph CI["GitHub Actions (CI)"]
        B[Verify<br/>Helm Lint<br/>Security Scans]
        C[Build Backend & Frontend<br/>Docker Images]
        D[Push Images to<br/>Harbor Registry]
        E[Trivy<br/>Image Scan]
        F[Update Helm Image Tag<br/>using Git SHA]

        B --> C
        C --> D
        D --> E
        E --> F
    end

    A --> B

    F --> G{Select<br/>Values File}

    G -->|Feature Branch<br/>Manual Dev| G1[values-dev.yaml]
    G -->|Develop Branch| G2[values-staging.yaml]
    G -->|Release Branch| G3[values-prod.yaml]

    G1 --> H[Commit Updated<br/>Helm Values]
    G2 --> H
    G3 --> H

    H --> I

    subgraph CD["Argo CD (CD)"]
        I{Deployment<br/>Target}

        I -->|Dev| J[Apply<br/>emc-dev-app.yaml]
        I -->|Staging| K[Apply<br/>emc-staging-app.yaml]
        I -->|Production| L[Apply<br/>emc-prod-app.yaml]

        J --> M[Dev<br/>Argo CD]
        K --> N[Staging<br/>Argo CD]
        L --> O[Production<br/>Argo CD]

        M --> P[Deploy EMC<br/>Application]

        N --> Q[Deploy EMC<br/>Application<br/>+ Grafana<br/>+ Prometheus<br/>+ Loki]

        O --> R[Deploy EMC<br/>Application<br/>+ Grafana<br/>+ Prometheus<br/>+ Loki]
    end
```

## Overview

The EMC CI/CD pipeline automates the build, security scanning, and deployment of the EDC Management Console using GitHub Actions and Argo CD.

The pipeline is divided into two stages:

- **Continuous Integration (CI)** – GitHub Actions
- **Continuous Deployment (CD)** – Argo CD

---

## Continuous Integration (GitHub Actions)

When a developer pushes code or manually triggers the workflow, GitHub Actions performs the following steps:

1. Verify the project.
2. Run Helm lint and security checks.
3. Build backend and frontend Docker images.
4. Push the Docker images to the Harbor registry.
5. Scan the images using Trivy.
6. Update the Helm image tag using the current Git commit SHA.

---

## Environment Selection

After the images are built and scanned, the pipeline selects the appropriate Helm values file based on the branch.

| Branch | Values File | Environment |
|---------|-------------|-------------|
| Feature Branch / Manual Dev | `values-dev.yaml` | Development |
| `develop` | `values-staging.yaml` | Staging |
| Release Branch | `values-prod.yaml` | Production |

The updated Helm configuration is committed to the Git repository.

---

## Continuous Deployment (Argo CD)

Argo CD continuously monitors the Git repository.

When it detects a change, it synchronizes the Kubernetes cluster and deploys the application to the appropriate environment.

| Environment | Argo CD Application | Components |
|-------------|---------------------|------------|
| Development | `emc-dev-app.yaml` | EMC Application |
| Staging | `emc-staging-app.yaml` | EMC + Grafana + Prometheus + Loki |
| Production | `emc-prod-app.yaml` | EMC + Grafana + Prometheus + Loki |

---

## Deployment Flow

1. Developer pushes code or manually starts the workflow.
2. GitHub Actions builds and validates the application.
3. Docker images are pushed to Harbor.
4. Trivy scans the images for vulnerabilities.
5. The Helm image tag is updated using the Git SHA.
6. The appropriate values file is selected.
7. The Helm configuration is committed to Git.
8. Argo CD detects the change.
9. Argo CD synchronizes Kubernetes.
10. The application is deployed to the selected environment.

---

## Benefits

- Fully automated CI/CD pipeline.
- GitOps-based deployment using Argo CD.
- Automated Docker image build and publishing.
- Integrated Trivy security scanning.
- Environment-specific Helm configuration.
- Automatic synchronization with Kubernetes.
- Integrated observability stack (Grafana, Prometheus, and Loki) for Staging and Production.