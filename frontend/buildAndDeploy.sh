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

CONTAINER_NAME=$1
IMAGE_NAME="ifs-frontend"
IMAGE_TAG="latest"
BACKEND_URL="https://TODO__XXX__YOUR_VALUE___XXX"
ENDPOINT_GET_MY_FLAGS="/flags"
ENDPOINT_SEARCH_FLAGS_BY_BPN="/flags/search"
ENDPOINT_GET_MY_FLAG_PROOF="/flags"
ENDPOINT_GET_FLAG_PROOF_BY_BPN="/flags/proof"
API_KEY="ifs-api-key"


docker rm -f ${CONTAINER_NAME}

echo "Build docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "Run docker container..."
docker run --name ${CONTAINER_NAME} -p 8080:8080 -d -e BACKEND_URL=${BACKEND_URL} -e ENDPOINT_GET_MY_FLAGS=${ENDPOINT_GET_MY_FLAGS} -e ENDPOINT_SEARCH_FLAGS_BY_BPN=${ENDPOINT_SEARCH_FLAGS_BY_BPN} \
            -e ENDPOINT_GET_MY_FLAG_PROOF=${ENDPOINT_GET_MY_FLAG_PROOF} -e ENDPOINT_GET_FLAG_PROOF_BY_BPN=${ENDPOINT_GET_FLAG_PROOF_BY_BPN} \
            -e API_KEY=${API_KEY}  ${IMAGE_NAME}:${IMAGE_TAG}

echo "Done"
