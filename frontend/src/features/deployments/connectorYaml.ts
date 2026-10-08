/********************************************************************************
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
********************************************************************************/

import { planeEndpoints } from './endpoints';

import type { Connector, ManagedComponent } from '../../types';

export interface ConnectorYamlView {
  name?: string;
  type?: string;
  version?: string;
  bpn?: string;
  namespace?: string;
  status?: string;
  controlPlaneUrl?: string;
  dataPlaneUrl?: string;
  apiEndpoints?: string[];
  registry?: string;
  submodel?: string;
  createdAt?: string;
  updatedAt?: string;
}

function asText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (value && typeof value === 'object' && 'url' in value) {
    return asText((value as { url?: unknown }).url);
  }

  return undefined;
}

function connectorType(connector: Connector): string | undefined {
  const config = connector.config ?? {};
  return asText(config.type) ?? asText(config.connectorType) ?? 'connector';
}

function withoutBlanks(view: ConnectorYamlView): ConnectorYamlView {
  return Object.fromEntries(
    Object.entries(view).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : value !== undefined,
    ),
  );
}

export function toConnectorYamlView(
  connector: Connector,
  components: ManagedComponent[] = [],
): ConnectorYamlView {
  const planes = planeEndpoints(connector);
  const submodel = components.find((component) => component.type === 'submodelServer');
  const registry = components.find((component) => component.type === 'digitalTwinRegistry');

  return withoutBlanks({
    name: asText(connector.name),
    type: connectorType(connector),
    version: asText(connector.version),
    bpn: asText(connector.bpn),
    namespace: asText(connector.namespace),
    status: asText(connector.status),
    controlPlaneUrl: planes.controlPlane,
    dataPlaneUrl: planes.dataPlane,
    apiEndpoints: connector.urls?.filter(Boolean),
    registry: asText(registry?.endpoint) ?? asText(connector.registry),
    submodel: asText(submodel?.endpoint) ?? asText(connector.submodel),
    createdAt: asText(connector.created_at),
    updatedAt: asText(connector.updated_at),
  });
}
