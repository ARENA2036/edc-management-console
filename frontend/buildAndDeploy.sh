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

CONTAINER_NAME=${1:-emc-frontend}
IMAGE_NAME="emc-frontend"
IMAGE_TAG="latest"

VITE_BACKEND_URL="${VITE_BACKEND_URL:-http://localhost:8001}"
VITE_API_KEY="${VITE_API_KEY:-emc-api-key}"
VITE_EDC_HOSTNAME="${VITE_EDC_HOSTNAME:-localhost}"
VITE_KEYCLOAK_URL="${VITE_KEYCLOAK_URL:-http://localhost:8080/auth}"
VITE_KEYCLOAK_REALM="${VITE_KEYCLOAK_REALM:-CX-Central}"
VITE_KEYCLOAK_CLIENT_ID="${VITE_KEYCLOAK_CLIENT_ID:-A36-EMC}"
VITE_SDE_URL="${VITE_SDE_URL:-}"
VITE_PORTAL_URL="${VITE_PORTAL_URL:-}"

docker rm -f "${CONTAINER_NAME}" 2>/dev/null

echo "Build docker image..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "Run docker container..."
docker run --name "${CONTAINER_NAME}" -p 8080:8080 -d \
    -e VITE_BACKEND_URL="${VITE_BACKEND_URL}" \
    -e VITE_API_KEY="${VITE_API_KEY}" \
    -e VITE_EDC_HOSTNAME="${VITE_EDC_HOSTNAME}" \
    -e VITE_KEYCLOAK_URL="${VITE_KEYCLOAK_URL}" \
    -e VITE_KEYCLOAK_REALM="${VITE_KEYCLOAK_REALM}" \
    -e VITE_KEYCLOAK_CLIENT_ID="${VITE_KEYCLOAK_CLIENT_ID}" \
    -e VITE_SDE_URL="${VITE_SDE_URL}" \
    -e VITE_PORTAL_URL="${VITE_PORTAL_URL}" \
    "${IMAGE_NAME}:${IMAGE_TAG}"

echo "Done"
