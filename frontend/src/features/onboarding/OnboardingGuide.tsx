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

import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';

import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useI18n } from '../../i18n';

import { useOnboardingSteps } from './steps';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * The first-run guide. This component owns only the frame and the step
 * navigation; each step's content is its own component.
 */
export default function OnboardingGuide({ open, onClose }: Props) {
  const { t } = useI18n();
  useLockBodyScroll(open);
  const steps = useOnboardingSteps();
  const [index, setIndex] = useState(0);

  if (!open) {
    return null;
  }

  const current = steps[index];
  const isLast = index === steps.length - 1;

  const close = () => {
    setIndex(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden overscroll-contain rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
          <div className="pr-4">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-slate-100 sm:text-4xl">
              {current.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-500 dark:text-slate-400 sm:text-[1.15rem]">
              {current.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('close')}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-7">
          <current.Body />
        </div>

        <div className="border-t border-gray-100 px-5 py-4 dark:border-slate-800 sm:px-7">
          <div className="mb-4 flex justify-center gap-2">
            {steps.map((step, stepIndex) => (
              <span
                key={step.key}
                className={`h-2.5 rounded-full transition-all ${
                  stepIndex === index ? 'w-10 bg-orange-500' : 'w-2.5 bg-orange-200'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="order-2 flex items-center gap-3 sm:order-1">
              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => setIndex((current) => Math.max(0, current - 1))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ArrowLeft size={18} />
                  {t('back')}
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="order-3 text-center text-base font-medium text-gray-400 sm:order-2">
              {t('onboardingStepCounter', {
                current: String(index + 1),
                total: String(steps.length),
              })}
            </div>

            <div className="order-1 flex items-center justify-between gap-3 sm:order-3 sm:justify-end">
              <button
                type="button"
                onClick={close}
                className="px-2 py-2 text-base font-semibold text-gray-700 transition-colors hover:text-gray-900 dark:text-slate-200 dark:hover:text-white"
              >
                {t('skip')}
              </button>
              <button
                type="button"
                onClick={() => (isLast ? close() : setIndex((current) => current + 1))}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-orange-600"
              >
                {isLast ? t('done') : t('next')}
                {!isLast && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
