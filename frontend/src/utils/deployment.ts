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
import type {
  DeployComponent,
  DeployRequest,
  DashboardConnector,
  ManagedComponent,
} from '../types';
import { getRuntimeConfigValue } from '../runtime-config';

export type ComponentKind = 'connector' | 'digitalTwinRegistry' | 'submodelServer';

export interface ComponentDraft {
  enabled: boolean;
  name: string;
  version: string;
  url: string;
  dbName: string;
  username: string;
  password: string;
}

export interface DeploymentDraft {
  connector: {
    name: string;
    version: string;
    url: string;
    bpn: string;
    dataPlaneUrl: string;
  };
  digitalTwinRegistry: ComponentDraft;
  submodelServer: ComponentDraft;
}

function trimOrEmpty(value: string | undefined | null): string {
  return (value ?? '').trim();
}

export function buildComponentPayload(
  type: ComponentKind,
  draft: {
    name: string;
    version: string;
    url: string;
    dbName: string;
    username: string;
    password: string;
    bpn?: string;
  },
): DeployComponent {
  const payload: DeployComponent = {
    type,
    name: trimOrEmpty(draft.name),
    version: trimOrEmpty(draft.version),
    url: trimOrEmpty(draft.url),
    db_name: trimOrEmpty(draft.dbName),
    auth: {
      db_username: trimOrEmpty(draft.username),
      db_password: trimOrEmpty(draft.password),
    },
  };

  if (type === 'connector' && draft.bpn) {
    payload.bpn = trimOrEmpty(draft.bpn);
  }

  return payload;
}

export function buildDeployRequest(draft: DeploymentDraft): DeployRequest {
  const components: DeployComponent[] = [
    buildComponentPayload('connector', {
      name: draft.connector.name,
      version: draft.connector.version,
      url: draft.connector.url,
      dbName: `${draft.connector.name}-db`,
      username: `${draft.connector.name}-username`,
      password: '',
      bpn: draft.connector.bpn,
    }),
  ];

  if (draft.submodelServer.enabled) {
    components.push(buildComponentPayload('submodelServer', draft.submodelServer));
  }

  if (draft.digitalTwinRegistry.enabled) {
    components.push(buildComponentPayload('digitalTwinRegistry', draft.digitalTwinRegistry));
  }

  return { components };
}

export function buildStandaloneConnector(
  draft: DeploymentDraft['connector'],
): DashboardConnector {
  return {
    id: Date.now(),
    name: trimOrEmpty(draft.name),
    url: trimOrEmpty(draft.url),
    bpn: trimOrEmpty(draft.bpn),
    version: trimOrEmpty(draft.version),
    status: 'healthy',
    created_at: new Date().toISOString(),
    urls: [trimOrEmpty(draft.url), trimOrEmpty(draft.dataPlaneUrl)].filter(Boolean),
    created_by: 'dashboard',
    db_username: `${trimOrEmpty(draft.name)}-username`,
    db_password: '',
    cp_hostname: trimOrEmpty(draft.url),
    dp_hostname: trimOrEmpty(draft.dataPlaneUrl),
    config: {
      connectorType: 'EDC Connector',
      endpoint: trimOrEmpty(draft.url),
      dataPlaneUrl: trimOrEmpty(draft.dataPlaneUrl),
      bpn: trimOrEmpty(draft.bpn),
      version: trimOrEmpty(draft.version),
      dbName: `${trimOrEmpty(draft.name)}-db`,
    },
    source: 'local',
  };
}

export function buildManagedComponentFromDraft(
  type: 'digitalTwinRegistry' | 'submodelServer',
  draft: ComponentDraft,
): ManagedComponent {
  return {
    id: `${type}-${draft.name}-${Date.now()}`,
    type,
    name: trimOrEmpty(draft.name),
    version: trimOrEmpty(draft.version),
    status: 'Active',
    deployedAt: new Date().toISOString(),
    endpoint: trimOrEmpty(draft.url),
    credentials: undefined,
    db_name: trimOrEmpty(draft.dbName),
    auth: {
      db_username: trimOrEmpty(draft.username),
      db_password: trimOrEmpty(draft.password),
    },
  };
}

export function getDefaultComponentDraft(
  baseName: string,
  kind: 'digitalTwinRegistry' | 'submodelServer',
  existing?: Partial<ComponentDraft>,
): ComponentDraft {
  const trimmedBase = trimOrEmpty(baseName);
  const isDtr = kind === 'digitalTwinRegistry';
  const defaultName = isDtr ? `${trimmedBase}-dtr` : `${trimmedBase}-sms`;
  const hostSuffix = getRuntimeConfigValue(
    import.meta.env.VITE_EDC_HOSTNAME,
    window.__RUNTIME_CONFIG__?.edcHost,
    '',
  );
  const defaultUrl = trimmedBase && hostSuffix ? `${trimmedBase}.${hostSuffix}` : '';
  const defaultUsername = `${defaultName}-user`;

  return {
    enabled: existing?.enabled ?? false,
    name: trimOrEmpty(existing?.name) || defaultName,
    version: trimOrEmpty(existing?.version),
    url: trimOrEmpty(existing?.url) || defaultUrl,
    dbName: trimOrEmpty(existing?.dbName) || `${defaultName}-db`,
    username: trimOrEmpty(existing?.username) || defaultUsername,
    password: '',
  };
}
