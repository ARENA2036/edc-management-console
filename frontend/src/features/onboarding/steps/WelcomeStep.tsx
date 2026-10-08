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

import { Check } from 'lucide-react';

import { useI18n } from '../../../i18n';

export default function WelcomeStep() {
  const { t } = useI18n();
  const capabilities = [
    t('onboardingCanDoItem1'),
    t('onboardingCanDoItem2'),
    t('onboardingCanDoItem3'),
    t('onboardingCanDoItem4'),
  ];

  return (
    <div className="space-y-8">
      <p className="text-lg leading-8 text-gray-600 dark:text-slate-300">
        {t('onboardingWelcomeIntro')}
      </p>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-5 dark:border-blue-500/30 dark:bg-blue-500/10">
        <h3 className="text-2xl font-semibold text-blue-900 dark:text-blue-100">
          {t('onboardingCanDoTitle')}
        </h3>
        <ul className="mt-4 space-y-4 text-lg leading-8 text-blue-800 dark:text-blue-100">
          {capabilities.map((item) => (
            <li key={item} className="flex gap-3">
              <Check size={20} className="mt-1 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
