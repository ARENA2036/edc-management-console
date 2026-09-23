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

import { useI18n } from '../../../i18n';

/** A tour of the dashboard's parts. */
export default function OverviewStep() {
  const { t } = useI18n();
  const areas = [
    {
      accent: 'bg-blue-500',
      title: t('onboardingOverviewStatusCardsTitle'),
      body: t('onboardingOverviewStatusCardsBody'),
    },
    {
      accent: 'bg-green-500',
      title: t('onboardingOverviewConnectorTableTitle'),
      body: t('onboardingOverviewConnectorTableBody'),
    },
    {
      accent: 'bg-purple-500',
      title: t('onboardingOverviewNavigationTitle'),
      body: t('onboardingOverviewNavigationBody'),
    },
  ];

  return (
    <div className="space-y-5">
      {areas.map((area) => (
        <div key={area.title} className="flex gap-4">
          <div className={`mt-1 h-24 w-1 rounded-full ${area.accent}`} />
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {area.title}
            </h3>
            <p className="mt-1 text-lg leading-8 text-gray-600 dark:text-slate-300">{area.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
