#################################################################################
# Tractus-X - Industry Flag Service
#
# Copyright (c) 2025 CGI Deutschland B.V. & Co. KG
# Copyright (c) 2025 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

FROM python:3.13-alpine

ENV HELM_VERSION="v3.18.4"
ENV KUBECTL_VERSION="v1.33.3"


USER root

## Move all the files from the project to the metareg directory
COPY ./ /backend

WORKDIR /backend

## List the contents of the /backend directory
RUN ls -la

## Install Python
RUN apk add py3-pip libpq curl bash ca-certificates --no-cache


# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl

# Install Helm
RUN curl -LO "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz" \
    && tar -zxvf helm-${HELM_VERSION}-linux-amd64.tar.gz \
    && mv linux-amd64/helm /usr/local/bin/helm \
    && rm -rf linux-amd64 helm-${HELM_VERSION}-linux-amd64.tar.gz

# Verify installation
RUN kubectl version --client && helm version

## Install application requirements
RUN pip3 install --break-system-packages --no-cache-dir --upgrade -r ./requirements.txt

## Create user groups
RUN addgroup -g 3000 appgroup \
	&& adduser -u 1000 -g 3000 -h /home/nonroot -D nonroot

## Specify the volumes
VOLUME ./data ./logs

## Create the directories
RUN mkdir -p ./logs
RUN mkdir -p ./data

## Update user permissions
RUN chown -R 1000:3000 /backend && chmod -R 775 /backend/ \
    && chown -R 1000:3000 /backend && chmod -R 775 /backend/

## Choose the user
USER 1000:3000

## Expose default port
EXPOSE 8000

## Execute the application
CMD ["python3","./init.py", "--host", "0.0.0.0", "--port", "8000"]
