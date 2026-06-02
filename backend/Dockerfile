#################################################################################
# Tractus-X - EDC Management Console
#
# Copyright (c) 2025 ARENA2036 e.V.
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
ENV PRODUCT="vault"
ENV VERSION="2.0.0"

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

## Install Python and build dependencies
RUN apk add --no-cache \
    py3-pip \
    libpq \
    curl \
    bash \
    ca-certificates \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    make \
    git \
    jq


RUN pip3 install --upgrade pip 
# RUN pip3 install --upgrade pip \
#     && pip3 install hvac

# Install HC Vault
RUN apk add --update --virtual .deps --no-cache gnupg && \
    cd /tmp && \
    wget https://releases.hashicorp.com/${PRODUCT}/${VERSION}/${PRODUCT}_${VERSION}_linux_amd64.zip && \
    wget https://releases.hashicorp.com/${PRODUCT}/${VERSION}/${PRODUCT}_${VERSION}_SHA256SUMS && \
    wget https://releases.hashicorp.com/${PRODUCT}/${VERSION}/${PRODUCT}_${VERSION}_SHA256SUMS.sig && \
    wget -qO- https://www.hashicorp.com/.well-known/pgp-key.txt | gpg --import && \
    gpg --verify ${PRODUCT}_${VERSION}_SHA256SUMS.sig ${PRODUCT}_${VERSION}_SHA256SUMS && \
    grep ${PRODUCT}_${VERSION}_linux_amd64.zip ${PRODUCT}_${VERSION}_SHA256SUMS | sha256sum -c && \
    unzip /tmp/${PRODUCT}_${VERSION}_linux_amd64.zip -d /tmp && \
    mv /tmp/${PRODUCT} /usr/local/bin/${PRODUCT} && \
    rm -f /tmp/${PRODUCT}_${VERSION}_linux_amd64.zip ${PRODUCT}_${VERSION}_SHA256SUMS ${VERSION}/${PRODUCT}_${VERSION}_SHA256SUMS.sig && \
    apk del .deps
# RUN apk add --update --virtual .deps --no-cache gnupg && \
#     cd /tmp && \
#     wget https://releases.hashicorp.com/vault/2.0.0/vault_2.0.0_linux_amd64.zip && \
#     wget https://releases.hashicorp.com/vault/2.0.0/vault_2.0.0_SHA256SUMS && \
#     wget https://releases.hashicorp.com/vault/2.0.0/vault_2.0.0_SHA256SUMS.sig && \
#     wget -qO- https://www.hashicorp.com/.well-known/pgp-key.txt | gpg --import && \
#     gpg --verify vault_2.0.0_SHA256SUMS.sig ${PRODUCT}_${VERSION}_SHA256SUMS && \
#     grep vault_2.0.0_linux_amd64.zip ${PRODUCT}_${VERSION}_SHA256SUMS | sha256sum -c && \
#     unzip /tmp/vault_2.0.0_linux_amd64.zip -d /tmp && \
#     mv /tmp/vault /usr/local/bin/vault && \
#     rm -f /tmp/vault_2.0.0_linux_amd64.zip vault_2.0.0_SHA256SUMS 2.0.0/vault_2.0.0_SHA256SUMS.sig && \
#     apk del .deps



# Verify installation
RUN kubectl version --client && helm version

## Install application requirements
RUN pip3 install --break-system-packages --no-cache-dir --upgrade -r ./requirements.txt

## Create user groups
RUN adduser -u 1000 -g 3000 -h /home/nonroot -D nonroot

# Create Kubernetes config directory and ensure it's accessible by nonroot
RUN mkdir -p /home/nonroot/.kube && \
    chown -R nonroot:nonroot /home/nonroot/.kube

# Make setup script executable
COPY ./scripts/setup_kube.sh /backend/setup_kube.sh
RUN chmod +x /backend/setup_kube.sh

## Specify the volumes
VOLUME ./data ./logs

## Create the directories
RUN mkdir -p ./logs
RUN mkdir -p ./data

## Update user permissions
RUN chown -R 1000:3000 /backend && chmod -R 775 /backend/ \
    && chown -R 1000:3000 /backend && chmod -R 775 /backend/

## Expose default port
EXPOSE 8001

# Set PYTHONPATH so Python can find the backend module
ENV PYTHONPATH=/backend

USER 1000:3000

# ENTRYPOINT: run the setup script
ENTRYPOINT ["/backend/setup_kube.sh"]

## Execute the application
CMD ["python3", "./init.py", "--host", "0.0.0.0", "--port", "8001"]