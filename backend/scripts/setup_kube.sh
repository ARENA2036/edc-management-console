#!/bin/bash
set -e

# ---- CONFIG ----
VAULT_ADDR=""
VAULT_TOKEN=""   # export VAULT_TOKEN before running
SECRET_PATH="staging/data/cluster-prod"  # KV v2 path
SECRET_KEY="config"
CLUSTER_NAME="prod"



# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
  echo "kubectl could not be found, please install it."
  exit 1
fi

# Fetch kubeconfig inside container (put in non-root home)
echo "Fetching kubeconfig for the cluster..."
mkdir -p /home/nonroot/.kube
vault login -address=$VAULT_ADDR -method=token $VAULT_TOKEN
vault kv get -field=config $SECRET_PATH > /home/nonroot/.kube/config

# vault kv get -field=json $SECRET_PATH | jq -r ".data.data.$SECRET_KEY" > /home/nonroot/.kube/config


# Persist KUBECONFIG for all future shells
echo 'export KUBECONFIG=/home/nonroot/.kube/config' >> /home/nonroot/.bashrc
export KUBECONFIG=/home/nonroot/.kube/config

# List available contexts (for debugging)
echo "Available contexts:"
kubectl config get-contexts

# Check if the context exists
if ! kubectl config get-contexts | grep -q "$CLUSTER_NAME"; then
  echo "Context '$CLUSTER_NAME' not found!"
  exit 1
fi

# Set the current context to the dynamically passed AKS_CLUSTER_NAME
echo "Setting current context to '$CLUSTER_NAME'..."
kubectl config use-context "$CLUSTER_NAME" || { echo "Failed to set context!"; exit 1; }

# Verify the current context
echo "Current kubectl context:"
kubectl config current-context

# Finally, run CMD passed by Docker (Python app)
exec "$@"
