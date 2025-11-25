#!/bin/bash
set -e

# Ensure environment variables are set
if [ -z "$AZURE_CLIENT_ID" ] || [ -z "$AZURE_CLIENT_SECRET" ] || [ -z "$AZURE_TENANT_ID" ] || [ -z "$AKS_CLUSTER_NAME" ] || [ -z "$AKS_RESOURCE_GROUP" ]; then
  echo "One or more environment variables are missing!"
  exit 1
fi

# Check if the Azure CLI is installed
if ! command -v az &> /dev/null; then
  echo "Azure CLI (az) could not be found, please install it."
  exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
  echo "kubectl could not be found, please install it."
  exit 1
fi

# Login to Azure using Service Principal
echo "Logging into Azure..."
az login --service-principal \
  -u "$AZURE_CLIENT_ID" \
  -p "$AZURE_CLIENT_SECRET" \
  --tenant "$AZURE_TENANT_ID"

# Fetch kubeconfig inside container (put in non-root home)
echo "Fetching kubeconfig for AKS cluster..."
mkdir -p /home/nonroot/.kube
az aks get-credentials \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --file /home/nonroot/.kube/config \
  --overwrite-existing

# Persist KUBECONFIG for all future shells
echo 'export KUBECONFIG=/home/nonroot/.kube/config' >> /home/nonroot/.bashrc
export KUBECONFIG=/home/nonroot/.kube/config

# List available contexts (for debugging)
echo "Available contexts:"
kubectl config get-contexts

# Check if the context exists
if ! kubectl config get-contexts | grep -q "$AKS_CLUSTER_NAME"; then
  echo "Context '$AKS_CLUSTER_NAME' not found!"
  exit 1
fi

# Set the current context to the dynamically passed AKS_CLUSTER_NAME
echo "Setting current context to '$AKS_CLUSTER_NAME'..."
kubectl config use-context "$AKS_CLUSTER_NAME" || { echo "Failed to set context!"; exit 1; }

# Verify the current context
echo "Current kubectl context:"
kubectl config current-context

# Finally, run CMD passed by Docker (Python app)
exec "$@"
