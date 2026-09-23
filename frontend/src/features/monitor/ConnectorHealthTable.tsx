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

import PlaneEndpoints from '../../components/PlaneEndpoints';
import StatusBadge from '../../components/StatusBadge';
import { useI18n } from '../../i18n';
import { formatTimestamp } from '../../utils/format';
import type { ConnectorRow } from './types';

export default function ConnectorHealthTable({ connectors }: { connectors: ConnectorRow[] }) {
  const { language, t } = useI18n();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          {t('monitorConnectorHealthTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {t('monitorConnectorHealthDescription')}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-500">
            <tr>
              <th className="px-5 py-3">{t('tableName')}</th>
              <th className="px-5 py-3">{t('tableType')}</th>
              <th className="px-5 py-3">{t('tableStatus')}</th>
              <th className="px-5 py-3">{t('tableLastCheck')}</th>
              <th className="px-5 py-3">{t('tableEndpoint')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {connectors.map((connector) => (
              <tr key={connector.id} className="align-top">
                <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                  {connector.name}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                  {connector.connectorType}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                  <StatusBadge
                    status={connector.status}
                    detail={connector.health?.detail}
                  />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                  {formatTimestamp(
                    connector.updated_at || connector.created_at,
                    language,
                    t('statusNoCheckYet'),
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                  <PlaneEndpoints connector={connector} />
                </td>
              </tr>
            ))}
            {connectors.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-sm text-gray-500 dark:text-slate-400"
                >
                  {t('tableNoConnectors')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
