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

import { Copy } from 'lucide-react';

import { useI18n } from '../../i18n';

import type { ReactNode } from 'react';


export interface DetailItem {
  label: string;
  value: ReactNode;
  copyValue?: string;
}

/** Label / value rows, used by the detail dialogs. */
export default function DetailList({ items }: { items: DetailItem[] }) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="border-b border-gray-200 pb-4 last:border-b-0 dark:border-slate-800">
          <p className="block text-sm font-medium text-gray-500 dark:text-slate-400">{item.label}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0 text-gray-900 dark:text-slate-100">{item.value}</div>
            {item.copyValue ? (
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(item.copyValue ?? '')}
                aria-label={t('copyEndpointTooltip')}
                className="shrink-0 rounded-md p-2 text-orange-500 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10"
              >
                <Copy className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
