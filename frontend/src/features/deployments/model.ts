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

import { resolveComponentLimit } from './nameRules';

import type { useI18n } from '../../i18n';
import type { DashboardConnector, ManagedComponent } from '../../types';
import type { DataspaceSettingsPayload } from '../dataspace/types';

export function getConnectorType(connector: DashboardConnector) {
  const connectorType = connector.config?.connectorType;
  return typeof connectorType === 'string' ? connectorType : 'Connector';
}

export function getManagedComponentLabel(
  type: ManagedComponent['type'],
  t: ReturnType<typeof useI18n>['t'],
) {
  return type === 'digitalTwinRegistry' ? t('componentTypeTwin') : t('componentTypeSubmodel');
}

export function getRecordType(record: DashboardConnector) {
  const configuredType = record.config?.type;
  return typeof configuredType === 'string' ? configuredType : 'connector';
}

export function isManagedComponentType(
  value: string,
): value is ManagedComponent['type'] {
  return value === 'digitalTwinRegistry' || value === 'submodelServer';
}

export function mapApiComponent(record: DashboardConnector): ManagedComponent | null {
  const recordType = getRecordType(record);
  if (!isManagedComponentType(recordType)) {
    return null;
  }

  return {
    id: String(record.id),
    name: record.name,
    type: recordType,
    version: record.version || '',
    status: record.status,
    detail: record.health?.detail,
    deployedAt: record.updated_at || record.created_at || new Date().toISOString(),
    endpoint: record.url,
    db_name: '',
    auth: {
      db_username: '',
      db_password: '',
    },
    source: 'api',
  };
}

export function mapApiConnector(record: DashboardConnector): DashboardConnector {
  return {
    ...record,
    source: 'api',
  };
}

export function resolveComponentLimits(details: DataspaceSettingsPayload | null) {
  return {
    connector: resolveComponentLimit('connector', details?.deployment?.connector?.maxInstances),
    digitalTwinRegistry: resolveComponentLimit(
      'digitalTwinRegistry',
      details?.deployment?.digitalTwinRegistry?.maxInstances,
    ),
    submodelServer: resolveComponentLimit(
      'submodelServer',
      details?.deployment?.submodelServer?.maxInstances,
    ),
  };
}

export function countComponentsByType(components: ManagedComponent[]) {
  return {
    digitalTwinRegistry: components.filter(
      (component) => component.type === 'digitalTwinRegistry',
    ).length,
    submodelServer: components.filter(
      (component) => component.type === 'submodelServer',
    ).length,
  };
}

export type ComponentLimits = ReturnType<typeof resolveComponentLimits>;
