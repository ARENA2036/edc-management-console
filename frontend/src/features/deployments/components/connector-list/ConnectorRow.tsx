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

import { FileText, MoreHorizontal, Trash2 } from 'lucide-react';

import StatusBadge from '../../../../components/ui/StatusBadge';
import Tooltip from '../../../../components/ui/Tooltip';
import { useI18n } from '../../../../i18n';
import PlaneEndpoints from '../PlaneEndpoints';

import type { ConnectorRowModel } from './rows';

interface Props {
  connector: ConnectorRowModel;
  canManage: boolean;
  onShowYaml: () => void;
  onShowDetails: () => void;
  onDelete: () => void;
}

/** One connector in the dashboard table. */
export default function ConnectorRow({
  connector,
  canManage,
  onShowYaml,
  onShowDetails,
  onDelete,
}: Props) {
  const { t } = useI18n();

  return (
    <tr className="transition-colors hover:bg-orange-50/40 dark:hover:bg-slate-800/70">
      <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">{connector.name}</td>
      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
        {connector.version || t('noValue')}
      </td>
      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
          {connector.connectorType}
        </span>
      </td>
      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
        <StatusBadge status={connector.status} detail={connector.health?.detail} />
      </td>
      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
        <PlaneEndpoints connector={connector} />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Tooltip content={t('tableManage')}>
            <button
              type="button"
              onClick={onShowYaml}
              className="rounded-lg p-2 text-orange-500 transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10"
            >
              <FileText size={16} />
            </button>
          </Tooltip>
          {canManage ? (
            <Tooltip content={t('connectorDeleteTooltipWithoutComponents')}>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          ) : null}
          <Tooltip content={t('tableMore')}>
            <button
              type="button"
              onClick={onShowDetails}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <MoreHorizontal size={16} />
            </button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}
