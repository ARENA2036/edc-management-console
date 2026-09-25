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

/** The first three things to do in the console. */
export default function GettingStartedStep() {
  const { t } = useI18n();
  const steps = [
    { number: '1', title: t('onboardingStep1Title'), body: t('onboardingStep1Body') },
    { number: '2', title: t('onboardingStep2Title'), body: t('onboardingStep2Body') },
    { number: '3', title: t('onboardingStep3Title'), body: t('onboardingStep3Body') },
  ];

  return (
    <div className="space-y-6">
      {steps.map((step) => (
        <div key={step.number} className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-semibold text-white shadow-sm">
            {step.number}
          </div>
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {step.title}
            </h3>
            <p className="mt-1 text-lg leading-8 text-gray-600 dark:text-slate-300">{step.body}</p>
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-lg leading-8 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <span className="font-semibold">{t('tipLabel')}:</span> {t('onboardingTipBody')}
      </div>
    </div>
  );
}
