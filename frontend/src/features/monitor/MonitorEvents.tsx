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
import { formatTimestamp } from '../../utils/format';
import { statusBadgeClass } from '../../utils/status';

import type { MonitorEvent } from './types';

export default function MonitorEvents({ events }: { events: MonitorEvent[] }) {
  const { language, t } = useI18n();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
        {t('recentActivityTitle')}
      </h3>
      <div className="mt-4 space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {event.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-slate-300">
                  {event.body}
                </p>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                  statusBadgeClass(event.severity)
                }`}
              >
                {event.severity === 'critical'
                  ? t('statusCritical')
                  : event.severity === 'warning'
                  ? t('statusNotice')
                  : t('statusOkay')}
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
              {formatTimestamp(event.timestamp, language, t('statusNoCheckYet'))}
            </p>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {t('monitorNoActivity')}
          </p>
        )}
      </div>
    </section>
  );
}
