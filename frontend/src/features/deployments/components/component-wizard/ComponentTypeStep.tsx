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

import { CheckCircle2 } from 'lucide-react';

import Notice from '../../../../components/ui/Notice';
import { useI18n } from '../../../../i18n';

import {
  COMPONENT_TYPES,
  getComponentTypeDescription,
  getComponentTypeTitle,
  toManagedComponentType,
  type ComponentType,
} from './componentTypes';

import type { ComponentWizardState } from './useComponentWizard';

/** Step 1: which component types to create. */
export default function ComponentTypeStep({ wizard }: { wizard: ComponentWizardState }) {
  const { t } = useI18n();
  const { selectedTypes, allTypesFull, typeStepSubmitted, isTypeFull, typeCounts, typeLimits } =
    wizard;

  return (
    <>
      <Notice>{t('componentGuidanceChoose')}</Notice>
      <Notice tone="warning">{t('componentGuidanceRestriction')}</Notice>
      {allTypesFull && (
        <Notice tone="danger">
          <p className="font-medium">{t('componentAllLimitsReached')}</p>
          <p className="mt-1">{t('componentLimitBlockedHint')}</p>
        </Notice>
      )}

      <div className="grid gap-3">
        {COMPONENT_TYPES.map((type) => (
          <ComponentTypeOption
            key={type}
            type={type}
            selected={selectedTypes.includes(type)}
            full={isTypeFull(type)}
            count={typeCounts[toManagedComponentType(type)]}
            limit={typeLimits[toManagedComponentType(type)]}
            onSelect={() => wizard.toggleType(type)}
          />
        ))}
      </div>

      {typeStepSubmitted && selectedTypes.length === 0 && !allTypesFull && (
        <p className="text-xs text-red-600 dark:text-red-300">
          {t('validationRequired', { field: t('componentTypeLabel') })}
        </p>
      )}
    </>
  );
}

interface OptionProps {
  type: ComponentType;
  selected: boolean;
  full: boolean;
  count: number;
  limit: number;
  onSelect: () => void;
}

function ComponentTypeOption({ type, selected, full, count, limit, onSelect }: OptionProps) {
  const { t } = useI18n();
  const title = getComponentTypeTitle(type, t);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={full}
      aria-disabled={full}
      aria-pressed={selected}
      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
        full
          ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-70 dark:border-slate-700 dark:bg-slate-800'
          : selected
          ? 'border-blue-400 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10'
          : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
            selected && !full
              ? 'border-blue-500 bg-blue-500 text-white'
              : 'border-gray-300 dark:border-slate-600'
          }`}
        >
          {selected && !full && <CheckCircle2 size={12} />}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-gray-900 dark:text-slate-100">{title}</p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                full
                  ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {count}/{limit}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {getComponentTypeDescription(type, t)}
          </p>
          {full && (
            <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">
              {t('componentTypeLimitReached', { max: String(limit), type: title })}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
