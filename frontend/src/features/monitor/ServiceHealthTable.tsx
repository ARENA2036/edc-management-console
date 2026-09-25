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

import EndpointWithCopy from '../../components/ui/EndpointWithCopy';
import StatusBadge from '../../components/ui/StatusBadge';
import { useI18n } from '../../i18n';
import { statusBadgeClass } from '../../utils/status';
import { getManagedComponentLabel } from '../deployments/model';

import type { ComponentRow } from './types';

export interface CapacityBadge {
  key: string;
  label: string;
  count: number;
  limit: number;
}

export default function ServiceHealthTable({
  components,
  capacityBadges,
}: {
  components: ComponentRow[];
  capacityBadges: CapacityBadge[];
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          {t('monitorServiceHealthTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t('monitorServiceHealthDescription')}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
            {t('monitorServiceCapacityLabel')}
          </span>
          {capacityBadges.map((badge) => {
            const full = badge.count >= badge.limit;
            return (
              <span
                key={badge.key}
                className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                  statusBadgeClass(full ? 'warning' : 'healthy')
                }`}
              >
                {badge.label} {badge.count}/{badge.limit}
              </span>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-500">
            <tr>
              <th className="px-5 py-3">{t('tableName')}</th>
              <th className="px-5 py-3">{t('tableType')}</th>
              <th className="px-5 py-3">{t('tableStatus')}</th>
              <th className="px-5 py-3">{t('tableEndpoint')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {components.map((component) => (
              <tr key={component.id}>
                <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                  {component.name}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                  {getManagedComponentLabel(component.type, t)}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                  <StatusBadge status={component.status} detail={component.detail} />
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                  <EndpointWithCopy
                    endpoint={component.endpoint}
                    fallback={t('standaloneDeployment')}
                  />
                </td>
              </tr>
            ))}
            {components.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-sm text-gray-500 dark:text-slate-400"
                >
                  {t('tableNoServices')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
