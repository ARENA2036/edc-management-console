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

import { CircleHelp, MonitorSmartphone, SquareDashedBottomCode } from 'lucide-react';

import { useI18n } from '../../../i18n';

export default function SupportStep() {
  const { t } = useI18n();
  const topics = [
    {
      icon: <CircleHelp size={18} />,
      title: t('onboardingSupportInlineTitle'),
      body: t('onboardingSupportInlineBody'),
    },
    {
      icon: <SquareDashedBottomCode size={18} />,
      title: t('onboardingSupportConfirmTitle'),
      body: t('onboardingSupportConfirmBody'),
    },
    {
      icon: <MonitorSmartphone size={18} />,
      title: t('onboardingSupportResponsiveTitle'),
      body: t('onboardingSupportResponsiveBody'),
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-lg leading-8 text-gray-600 dark:text-slate-300">
        {t('onboardingSupportIntro')}
      </p>

      {topics.map((topic) => (
        <div
          key={topic.title}
          className="rounded-2xl bg-gray-50 px-5 py-5 shadow-sm ring-1 ring-gray-100 dark:bg-slate-950 dark:ring-slate-800"
        >
          <div className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-slate-100">
            <span className="text-orange-500">{topic.icon}</span>
            {topic.title}
          </div>
          <p className="mt-3 text-lg leading-8 text-gray-600 dark:text-slate-300">{topic.body}</p>
        </div>
      ))}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <h3 className="text-2xl font-semibold text-emerald-800 dark:text-emerald-200">
          {t('onboardingReadyTitle')}
        </h3>
        <p className="mt-2 text-lg leading-8 text-emerald-700 dark:text-emerald-200/80">
          {t('onboardingReadyBody')}
        </p>
      </div>
    </div>
  );
}
