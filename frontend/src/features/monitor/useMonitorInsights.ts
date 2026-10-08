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

import { useMemo } from 'react';

import { useI18n } from '../../i18n';
import type { DashboardConnector, ManagedComponent } from '../../types';
import { needsAttention } from '../../utils/status';
import { getManagedComponentLabel } from '../deployments/model';
import type { ConnectorRow, MonitorEvent } from './types';

export function useMonitorInsights(
  connectors: DashboardConnector[],
  components: ManagedComponent[],
  connectorRows: ConnectorRow[],
) {
  const { t } = useI18n();

  const events = useMemo(() => {
    const connectorEvents = connectors.slice(0, 4).map((connector) => ({
      id: `connector-${connector.id}`,
      title: t('eventConnectorAvailable', { name: connector.name }),
      body: needsAttention(connector.status)
        ? t('eventConnectorAvailableUnhealthy')
        : t('eventConnectorAvailableHealthy'),
      timestamp: connector.created_at,
      severity: needsAttention(connector.status) ? 'critical' : 'healthy',
    }));

    const componentEvents = components.slice(0, 4).map((component) => ({
      id: `component-${component.id}`,
      title: t('eventComponentDeployed', { name: component.name }),
      body: t('eventComponentDeployedBody', {
        type: getManagedComponentLabel(component.type, t),
      }),
      timestamp: component.deployedAt,
      severity: needsAttention(component.status) ? 'critical' : 'healthy',
    }));

    return [...connectorEvents, ...componentEvents]
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 8);
  }, [components, connectors, t]);

  const recommendations = useMemo(() => {
    const items: string[] = [];
    const unhealthyConnectors = connectorRows.filter((connector) =>
      needsAttention(connector.status),
    );
    if (unhealthyConnectors.length > 0) {
      items.push(
        t('recommendationUnhealthyConnectors', {
          count: String(unhealthyConnectors.length),
        }),
      );
    }

    if (connectorRows.length === 0) {
      items.push(t('recommendationNoConnectors'));
    }

    if (items.length === 0) {
      items.push(t('recommendationStable'));
    }

    return items;
  }, [connectorRows, t]);

  return { events: events as MonitorEvent[], recommendations };
}
