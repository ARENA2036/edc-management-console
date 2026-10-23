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

import { useI18n } from '../../i18n';
import {
  emptyBadgeClass,
  statusBadgeClass,
  systemHealthBadgeClass,
  systemHealthLabel,
  type SystemHealth,
} from '../../utils/status';

interface Props {
  overallHealth: SystemHealth;
  healthyConnectors: number;
  connectorCount: number;
  serviceCount: number;
  serviceCapacity: number;
  serviceCapacityLabel: string;
  eventCount: number;
}

export default function MonitorSummary({
  overallHealth,
  healthyConnectors,
  connectorCount,
  serviceCount,
  serviceCapacity,
  serviceCapacityLabel,
  eventCount,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {
          title: t('statusOverallHealthTitle'),
          value: systemHealthLabel(overallHealth, t),
          subtitle: t('statusOverallHealthSubtitle'),
          tone: systemHealthBadgeClass(overallHealth),
        },
        {
          title: t('statusHealthyConnectorsTitle'),
          value: `${healthyConnectors}/${connectorCount}`,
          subtitle: t('statusHealthyConnectorsSubtitle'),
          tone: statusBadgeClass('healthy'),
        },
        {
          title: t('statusLinkedServicesTitle'),
          value: `${serviceCount}/${serviceCapacity}`,
          subtitle: serviceCapacityLabel,
          tone:
            serviceCount === 0
              ? emptyBadgeClass()
              : statusBadgeClass('healthy'),
        },
        {
          title: t('statusRecentEventsTitle'),
          value: `${eventCount}`,
          subtitle: t('statusRecentEventsSubtitleDerived'),
          // Having no events to show is not a fault either; where they came
          // from is what the subtitle is for.
          tone:
            eventCount === 0
              ? emptyBadgeClass()
              : statusBadgeClass('healthy'),
        },
      ].map((card) => (
        <div
          key={card.title}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="text-sm text-gray-500 dark:text-slate-400">{card.title}</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${card.tone}`}
            >
              {card.value}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-slate-400">
            {card.subtitle}
          </p>
        </div>
      ))}
    </div>
  );
}
