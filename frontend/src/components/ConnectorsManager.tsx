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
import { FileText, MoreHorizontal, PencilLine, Plus, Trash2, Zap } from 'lucide-react';
import { statusBadgeClass, statusLabel } from '../utils/status';
import { useCallback, useMemo, useState } from 'react';
import type { DashboardConnector } from '../types';
import { useI18n } from '../i18n';
import DeleteModal from './DeleteModal';
import DetailsModal from './DetailsModal';
import Tooltip from './Tooltip';
import YamlViewModal from './YamlViewModal';

interface Props {
  connectors: DashboardConnector[];
  onDelete: (connector: DashboardConnector) => Promise<void> | void;
  onAddComponent: (connector: DashboardConnector) => void;
  onEditConnector?: (connector: DashboardConnector) => void;
  canManage?: boolean;
}

function getConnectorType(connector: DashboardConnector) {
  const config = connector.config;
  if (config && typeof config.connectorType === 'string') {
    return config.connectorType;
  }

  return 'EDC Connector';
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

function getConnectorEndpoint(connector: DashboardConnector) {
  if (connector.url) {
    return connector.url;
  }

  if (connector.urls.length > 0) {
    return connector.urls[0];
  }

  return '';
}

export default function ConnectorsManager({
  connectors,
  onDelete,
  onAddComponent,
  canManage = true,
  onEditConnector,
}: Props) {
  const { language, t } = useI18n();
  const [selectedConnector, setSelectedConnector] = useState<DashboardConnector | null>(null);
  const [yamlConnector, setYamlConnector] = useState<DashboardConnector | null>(null);
  const [deleteConnector, setDeleteConnector] = useState<DashboardConnector | null>(null);
  const localizeConnectorType = useCallback(
    (type: string) => (type === 'EDC Connector' ? t('connectorTypeDefault') : type),
    [t],
  );

  const rows = useMemo(
    () =>
      connectors.map((connector) => ({
        ...connector,
        connectorType: localizeConnectorType(getConnectorType(connector)),
        endpoint: getConnectorEndpoint(connector),
      })),
    [connectors, localizeConnectorType],
  );

  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                <span className="dark:text-slate-100">{t('edcConnectors')}</span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {t('connectorsSectionSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500">
              <Zap size={28} />
            </div>
            <h4 className="text-xl font-semibold text-gray-700 dark:text-slate-200">
              {t('noConnectorsTitle')}
            </h4>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              {t('noConnectorsDescription')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-500">
                <tr>
                  <th className="px-5 py-3">{t('tableName')}</th>
                  <th className="px-5 py-3">{t('tableVersion')}</th>
                  <th className="px-5 py-3">{t('tableType')}</th>
                  <th className="px-5 py-3">{t('tableStatus')}</th>
                  <th className="px-5 py-3">{t('tableEndpoint')}</th>
                  <th className="px-5 py-3">{t('tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {rows.map((connector) => (
                  <tr
                    key={connector.id}
                    className="transition-colors hover:bg-orange-50/40 dark:hover:bg-slate-800/70"
                  >
                    <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                      {connector.name}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {connector.version || t('noValue')}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {connector.connectorType}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <StatusBadge status={connector.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <span className="block max-w-[260px] truncate">
                        {connector.endpoint || t('noValue')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {canManage ? (
                        <Tooltip content={t('connectorAddComponentTooltip')}>
                          <button
                            onClick={() => onAddComponent(connector)}
                            className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-50"
                          >
                            <Plus size={16} />
                          </button>
                        </Tooltip>
                        ) : null}
                        <Tooltip content={t('tableManage')}>
                          <button
                            onClick={() => setYamlConnector(connector)}
                            className="rounded-lg p-2 text-orange-500 transition-colors hover:bg-orange-50"
                          >
                            <FileText size={16} />
                          </button>
                        </Tooltip>
                        {canManage && onEditConnector ? (
                          <Tooltip
                            content={
                              language === 'de'
                                ? 'EDC ändern'
                                : 'Edit the EDC'
                            }
                          >
                            <button
                              onClick={() => onEditConnector(connector)}
                              className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-50"
                            >
                              <PencilLine size={16} />
                            </button>
                          </Tooltip>
                        ) : null}
                        {canManage ? (
                        <Tooltip content={t('connectorDeleteTooltipWithoutComponents')}>
                          <button
                            type="button"
                            onClick={() => setDeleteConnector(connector)}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                        ) : null}
                        <Tooltip content={t('tableMore')}>
                          <button
                            onClick={() => setSelectedConnector(connector)}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedConnector && (
        <DetailsModal
          connector={selectedConnector}
          onClose={() => setSelectedConnector(null)}
        />
      )}

      {yamlConnector && (
        <YamlViewModal
          connector={yamlConnector}
          components={[]}
          onClose={() => setYamlConnector(null)}
        />
      )}

      {deleteConnector && (
        <DeleteModal
          connector={deleteConnector}
          title={t('deleteConnectorTitle')}
          message={
            <div className="space-y-3">
              <p>{t('connectorDeleteIntro', { name: deleteConnector.name })}</p>
              <p>{t('connectorDeleteBody')}</p>
            </div>
          }
          cancelLabel={t('cancel')}
          confirmLabel={t('confirmDelete')}
          onClose={() => setDeleteConnector(null)}
          onConfirm={async () => {
            await onDelete(deleteConnector);
            setDeleteConnector(null);
          }}
        />
      )}
    </>
  );
}
