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
import { isHealthy, computeSystemHealth } from '../../utils/status';
import { useDataspaceSummary } from '../dataspace/useDataspace';
import {
  countComponentsByType,
  getConnectorType,
  resolveComponentLimits,
} from '../deployments/model';
import { useDeploymentState } from '../deployments/useDeploymentState';
import ConnectorHealthTable from './ConnectorHealthTable';
import MonitorEvents from './MonitorEvents';
import MonitorRecommendations from './MonitorRecommendations';
import MonitorSummary from './MonitorSummary';
import ServiceHealthTable, { type CapacityBadge } from './ServiceHealthTable';
import type { ComponentRow, ConnectorRow } from './types';
import { useMonitorInsights } from './useMonitorInsights';

export default function Monitor() {
  const { t } = useI18n();
  const { dataspace } = useDataspaceSummary();
  const { connectors, components } = useDeploymentState();

  const connectorRows = useMemo<ConnectorRow[]>(
    () =>
      connectors.map((connector) => ({
        ...connector,
        connectorType:
          getConnectorType(connector) === 'Connector'
            ? t('connectorTypeDefault')
            : getConnectorType(connector),
      })),
    [connectors, t],
  );

  const componentRows = useMemo<ComponentRow[]>(
    () =>
      components.map((component) => ({
        ...component,
        endpointLabel: component.endpoint || t('standaloneDeployment'),
      })),
    [components, t],
  );

  const { events, recommendations } = useMonitorInsights(connectors, components, connectorRows);

  const limits = useMemo(() => resolveComponentLimits(dataspace.details), [dataspace.details]);
  const componentCounts = useMemo(() => countComponentsByType(components), [components]);
  // Total capacity across the non-connector types, so the services card reads
  // "deployed / total slots" rather than "healthy / deployed".
  const serviceCapacity = limits.digitalTwinRegistry + limits.submodelServer;
  const capacityBadges: CapacityBadge[] = [
    {
      key: 'digitalTwinRegistry',
      label: t('componentTypeTwin'),
      count: componentCounts.digitalTwinRegistry,
      limit: limits.digitalTwinRegistry,
    },
    {
      key: 'submodelServer',
      label: t('componentTypeSubmodel'),
      count: componentCounts.submodelServer,
      limit: limits.submodelServer,
    },
  ];

  const healthyConnectors = connectorRows.filter((connector) =>
    isHealthy(connector.status),
  ).length;
  // Same derivation as the dashboard card, so the two views can never
  // disagree about the state of the deployment.
  const overallHealth = computeSystemHealth([
    ...connectors.map((connector) => connector.status),
    ...components.map((component) => component.status),
  ]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t('monitorTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-gray-500 dark:text-slate-400">
            {t('monitorDescription')}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold text-gray-900 dark:text-slate-100">
            {dataspace.name}
          </p>
          <p className="mt-1 text-gray-500 dark:text-slate-400">
            {dataspace.authorityBpn || t('allSourcesMonitored')}
          </p>
        </div>
      </div>

      <MonitorSummary
        overallHealth={overallHealth}
        healthyConnectors={healthyConnectors}
        connectorCount={connectorRows.length}
        serviceCount={componentRows.length}
        serviceCapacity={serviceCapacity}
        serviceCapacityLabel={capacityBadges
          .map((badge) => `${badge.label} ${badge.count}/${badge.limit}`)
          .join(' · ')}
        eventCount={events.length}
      />

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <ConnectorHealthTable connectors={connectorRows} />
          <ServiceHealthTable components={componentRows} capacityBadges={capacityBadges} />
        </div>

        <div className="space-y-6">
          <MonitorRecommendations recommendations={recommendations} />
          <MonitorEvents events={events} />
        </div>
      </div>
    </div>
  );
}
