# EDC Management Console:  

## Application Deployment: Dockerfiles and Helm Charts

### Prerequisites 

Before working with the EDC Management Console deployment, ensure the following are installed and configured: 

1. Docker (latest stable version)() 
-   [Install Docker](https://docs.docker.com/get-started/get-docker/) 

2. Kubernetes CLI (kubectl) 
-   [Install kubectl](https://kubernetes.io/docs/tasks/tools/)
 
3. Helm v3+ 
-   [Install Helm](https://helm.sh/docs/intro/install/)

4. Azure CLI (if deploying to AKS) 
-   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash 
-   or follow Azure CLI installation guide. 
 
5. Access to container registry  
-   (e.g., ghcr.io, Docker Hub, ACR) 

 6. EDC Backend environment variables  
-   (client IDs, tenant info, datasource config) 

### Kubernetes Cluster 
-   Any cluster will work (local or cloud): Minikube, Kind, AKS, EKS, GKE, etc. 
-   Ensure the cluster is accessible via kubectl. 
 

### 📘 Overview 
The EDC Management Console project consists of backend and frontend components packaged and deployed using Docker and Helm charts on Kubernetes. This document provides: 

-   A high-level overview of the architecture 
-   Detailed documentation of the Helm charts 
-   Backend & frontend Dockerfiles 
-   Deployment instructions for Kubernetes environments 

### 🧩 Helm Charts 
This project includes a primary Helm chart that deploys both the backend and frontend services of the EDC Management Console. 

### Chart.yaml 
-   apiVersion: v2 
-   name: edc-management-console 
[... (full content)](https://github.com/ARENA2036/edc-management-console/blob/main/charts/edc-management-console/Chart.yaml)

### values.yaml 
-   Default values for edc-management-console 
[... (full content)](https://github.com/ARENA2036/edc-management-console/blob/main/charts/edc-management-console/values.yaml)
 

The Helm charts define Kubernetes resources such as: 

-   Deployments 
-   Services 
-   Ingress controllers 
-   ConfigMaps 
-   PersistentVolumeClaims 

The chart supports enabling/disabling backend and frontend independently, as well as configuring network, resources, autoscaling, policies, discovery, and EDC integration parameters. 

### 🐳 Dockerfiles 
The project contains Dockerfiles for both backend services. 

### Backend Dockerfile 

FROM python:3.13-alpine 
[... (full content)](https://github.com/ARENA2036/edc-management-console/blob/main/backend/Dockerfile)

This backend image includes: 

-   Python runtime 
-   Helm CLI 
-   kubectl 
-   Azure CLI 
-   Application dependencies 
-   setup_kube.sh entrypoint 

### Frontend Dockerfile 

FROM node:lts-alpine as builder
[... (full content)](https://github.com/ARENA2036/edc-management-console/blob/feature/frontend/frontend/Dockerfile)

### 🚀 Deployment Using Helm Chart 

Below are the basic steps to deploy the EDC Management Console using Helm. 

1. Build and Push Docker Images 

-   docker build -t your-registry/emc-backend:latest backend/ 
-   docker build -t your-registry/emc-frontend:latest frontend/ 
 
-   docker push your-registry/emc-backend:latest 
-   docker push your-registry/emc-frontend:latest 
  
2. Deploy with Helm 

-  Deploy release 
-  helm upgrade --install edc-management-console ./charts/edc-management-console -n your-namespace -f values.yaml 

3. Remove the Deployment

-  helm uninstall your-release-name -n your-namespace   

4. Verify Deployment 

-  kubectl get pods -n your-namespace 
-  kubectl get svc -n your-namespace 
-  kubectl get ingress -n your-namespace 

 

 