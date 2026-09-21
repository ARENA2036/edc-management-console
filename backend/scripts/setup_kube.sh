#!/bin/bash
###############################################################
# Tractus-X - EDC Management Console
#
# Copyright (c) 2026 ARENA2036 e.V.
# Copyright (c) 2026 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
###############################################################

set -e
 
# ---- CONFIG ----
# These must come from environment variables in the pod/Helm values.
VAULT_ADDR="${VAULT_ADDR:-}"
VAULT_TOKEN="${VAULT_TOKEN:-}"

# Example paths:
# staging/data/cluster
# prod/data/cluster
# ap6/data/cluster
VAULT_ENV="${VAULT_ENV:-staging}"
CLUSTER_SECRET="${CLUSTER_SECRET:-cluster}"
SECRET_PATH="${SECRET_PATH:-${VAULT_ENV}/infra/${CLUSTER_SECRET}}"
SECRET_KEY="${SECRET_KEY:-config}"

# Optional. If empty, the script uses kubeconfig current-context automatically.
CLUSTER_NAME="${CLUSTER_NAME:-}"

KUBECONFIG_PATH="/home/nonroot/.kube/config"

# Check if kubectl is installed
if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl could not be found, please install it."
  exit 1
fi

# Check if vault is installed
if ! command -v vault >/dev/null 2>&1; then
  echo "vault could not be found, please install it."
  exit 1
fi

# Validate required Vault env vars
if [ -z "$VAULT_ADDR" ]; then
  echo "ERROR: VAULT_ADDR is not set"
  exit 1
fi

if [ -z "$VAULT_TOKEN" ]; then
  echo "ERROR: VAULT_TOKEN is not set"
  exit 1
fi

echo "Fetching kubeconfig for the cluster..."
mkdir -p "$(dirname "$KUBECONFIG_PATH")"

# Non-interactive Vault auth.
# Do NOT run 'vault login' inside the pod.
export VAULT_ADDR
export VAULT_TOKEN

vault kv get -field="$SECRET_KEY" "$SECRET_PATH" > "$KUBECONFIG_PATH"

chmod 600 "$KUBECONFIG_PATH"

export KUBECONFIG="$KUBECONFIG_PATH"

# Persist KUBECONFIG for future shells
if [ -f /home/nonroot/.bashrc ]; then
  if ! grep -q "export KUBECONFIG=$KUBECONFIG_PATH" /home/nonroot/.bashrc; then
    echo "export KUBECONFIG=$KUBECONFIG_PATH" >> /home/nonroot/.bashrc
  fi
else
  echo "export KUBECONFIG=$KUBECONFIG_PATH" > /home/nonroot/.bashrc
fi

echo "Available contexts:"
kubectl config get-contexts

# Auto-detect current context if CLUSTER_NAME is not set
if [ -z "$CLUSTER_NAME" ]; then
  CLUSTER_NAME="$(kubectl config current-context)"
fi

if [ -z "$CLUSTER_NAME" ]; then
  echo "ERROR: No Kubernetes context found in kubeconfig"
  exit 1
fi

# Verify context exists
if ! kubectl config get-contexts -o name | grep -Fxq "$CLUSTER_NAME"; then
  echo "ERROR: Context '$CLUSTER_NAME' not found!"
  exit 1
fi

echo "Setting current context to '$CLUSTER_NAME'..."
kubectl config use-context "$CLUSTER_NAME"

echo "Current kubectl context:"
kubectl config current-context

# Finally, run CMD passed by Docker
exec "$@"