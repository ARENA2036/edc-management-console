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

export default function MonitorRecommendations({ recommendations }: { recommendations: string[] }) {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
        {t('recommendationsTitle')}
      </h3>
      <div className="mt-4 space-y-3">
        {recommendations.map((item) => (
          <div
            key={item}
            className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
