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
import { Activity, Boxes, Database, Layers, Server, SquareActivity } from 'lucide-react';

import StatsCard from '../../components/StatsCard';
import { STATS_CARD_VARIANTS } from '../../components/statsCardVariants';
import { useI18n } from '../../i18n';
import type { DashboardConnector, ManagedComponent } from '../../types';
import { formatClockTime } from '../../utils/format';
import {
  computeSystemHealth,
  countInProgress,
  isHealthy,
  systemHealthLabel,
  systemHealthTone,
} from '../../utils/status';
import { countComponentsByType, type ComponentLimits } from '../deployments/model';

interface Props {
  dataspaceName: string;
  authorityBpn: string;
  connectors: DashboardConnector[];
  components: ManagedComponent[];
  limits: ComponentLimits;
  lastSyncedAt: string | null;
}

export default function DashboardStats({
  dataspaceName,
  authorityBpn,
  connectors,
  components,
  limits,
  lastSyncedAt,
}: Props) {
  const { language, t } = useI18n();

  const componentCounts = useMemo(() => countComponentsByType(components), [components]);
  const activeConnectors = useMemo(
    () => connectors.filter((connector) => isHealthy(connector.status)).length,
    [connectors],
  );
  // "Active" means healthy, the same as on the connector card - the plain
  // counts already sit in the card's value.
  const healthyComponentCounts = useMemo(
    () => ({
      digitalTwinRegistry: components.filter(
        (component) =>
          component.type === 'digitalTwinRegistry' && isHealthy(component.status),
      ).length,
      submodelServer: components.filter(
        (component) => component.type === 'submodelServer' && isHealthy(component.status),
      ).length,
    }),
    [components],
  );
  const deploymentStatuses = useMemo(
    () => [
      ...connectors.map((connector) => connector.status),
      ...components.map((component) => component.status),
    ],
    [components, connectors],
  );
  const systemHealth = useMemo(
    () => computeSystemHealth(deploymentStatuses),
    [deploymentStatuses],
  );
  const healthyDeployments = useMemo(
    () => deploymentStatuses.filter((status) => isHealthy(status)).length,
    [deploymentStatuses],
  );
  const inProgressDeployments = useMemo(
    () => countInProgress(deploymentStatuses),
    [deploymentStatuses],
  );
  const activityValue =
    inProgressDeployments > 0
      ? t('activityInProgress', { count: String(inProgressDeployments) })
      : t('activityIdle');
  const activitySubtitle = lastSyncedAt
    ? t('activityLastSync', { time: formatClockTime(lastSyncedAt, language) })
    : t('activityAwaitingSync');
  const statsGuidance = {
    dataSpace: {
      title: t('statsDataSpaceTitle'),
      content: t('statsDataSpaceContent'),
      footer: t('statsDataSpaceFooter'),
    },
    health: {
      title: t('statsHealthTitle'),
      content: t('statsHealthContent'),
      footer: t('statsHealthFooter'),
    },
    activity: {
      title: t('statsActivityTitle'),
      content: t('statsActivityContent'),
      footer: t('statsActivityFooter'),
    },
    connectors: {
      title: t('statsConnectorsTitle'),
      content: t('statsConnectorsContent'),
      footer: t('statsConnectorsFooter'),
    },
    digitalTwinRegistries: {
      title: t('statsDigitalTwinRegistriesTitle'),
      content: t('statsDigitalTwinRegistriesContent', {
        max: String(limits.digitalTwinRegistry),
      }),
      footer: t('statsDigitalTwinRegistriesFooter'),
    },
    submodelServices: {
      title: t('statsSubmodelServicesTitle'),
      content: t('statsSubmodelServicesContent', {
        max: String(limits.submodelServer),
      }),
      footer: t('statsSubmodelServicesFooter'),
    },
  };

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatsCard
        icon={<Database size={22} />}
        title={t('dataSpace')}
        value={dataspaceName}
        subtitle={authorityBpn || t('allSourcesMonitored')}
        tooltipTitle={statsGuidance.dataSpace.title}
        tooltipContent={statsGuidance.dataSpace.content}
        tooltipFooter={statsGuidance.dataSpace.footer}
      />
      <StatsCard
        icon={<SquareActivity size={22} />}
        title={t('systemHealth')}
        value={systemHealthLabel(systemHealth, t)}
        subtitle={
          systemHealth === 'empty'
            ? t('healthNothingDeployed')
            : t('healthHealthyOfTotal', {
                healthy: String(healthyDeployments),
                total: String(deploymentStatuses.length),
              })
        }
        variant={STATS_CARD_VARIANTS[systemHealthTone(systemHealth)]}
        tooltipTitle={statsGuidance.health.title}
        tooltipContent={statsGuidance.health.content}
        tooltipFooter={statsGuidance.health.footer}
      />
      <StatsCard
        icon={<Activity size={22} />}
        title={t('activity')}
        value={activityValue}
        subtitle={activitySubtitle}
        variant={inProgressDeployments > 0 ? 'info' : 'default'}
        tooltipTitle={statsGuidance.activity.title}
        tooltipContent={statsGuidance.activity.content}
        tooltipFooter={statsGuidance.activity.footer}
      />
      <StatsCard
        icon={<Server size={22} />}
        title={t('edcConnectors')}
        value={`${connectors.length}/${limits.connector}`}
        subtitle={`${activeConnectors} ${t('activeShort')}`}
        variant="info"
        tooltipTitle={statsGuidance.connectors.title}
        tooltipContent={statsGuidance.connectors.content}
        tooltipFooter={statsGuidance.connectors.footer}
      />
      <StatsCard
        icon={<Boxes size={22} />}
        title={t('digitalTwinRegistries')}
        value={`${componentCounts.digitalTwinRegistry}/${limits.digitalTwinRegistry}`}
        subtitle={`${healthyComponentCounts.digitalTwinRegistry} ${t('activeShort')}`}
        variant="info"
        tooltipTitle={statsGuidance.digitalTwinRegistries.title}
        tooltipContent={statsGuidance.digitalTwinRegistries.content}
        tooltipFooter={statsGuidance.digitalTwinRegistries.footer}
      />
      <StatsCard
        icon={<Layers size={22} />}
        title={t('submodelServices')}
        value={`${componentCounts.submodelServer}/${limits.submodelServer}`}
        subtitle={`${healthyComponentCounts.submodelServer} ${t('activeShort')}`}
        variant="info"
        tooltipTitle={statsGuidance.submodelServices.title}
        tooltipContent={statsGuidance.submodelServices.content}
        tooltipFooter={statsGuidance.submodelServices.footer}
      />
    </div>
  );
}
