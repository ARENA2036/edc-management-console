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

import { SelectField, TextField } from '../../../../components/ui/fields';
import Notice from '../../../../components/ui/Notice';
import { useI18n } from '../../../../i18n';
import { MAX_RESOURCE_NAME_LENGTH } from '../../nameRules';

import {
  getComponentNamePlaceholder,
  getComponentTypeDescription,
  getComponentTypeTitle,
  toManagedComponentType,
  type ComponentType,
} from './componentTypes';

import type { ComponentWizardState } from './useComponentWizard';

/** Step 2: name and version for each selected type. */
export default function ComponentConfigStep({
  wizard,
  deploying,
}: {
  wizard: ComponentWizardState;
  deploying: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <Notice>
        <p>{t('componentGuidanceConfig')}</p>
      </Notice>

      {wizard.selectedTypes.map((type, index) => (
        <ComponentDraftCard
          key={type}
          type={type}
          position={index + 1}
          total={wizard.selectedTypes.length}
          wizard={wizard}
          deploying={deploying}
        />
      ))}
    </div>
  );
}

interface CardProps {
  type: ComponentType;
  position: number;
  total: number;
  wizard: ComponentWizardState;
  deploying: boolean;
}

function ComponentDraftCard({ type, position, total, wizard, deploying }: CardProps) {
  const { t } = useI18n();
  const draft = wizard.getDraft(type);
  const managedType = toManagedComponentType(type);
  const versionOptions = wizard.versionOptionsByType[type] ?? [];
  const recommendedVersion = wizard.defaultVersionForType[type];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {getComponentTypeTitle(type, t)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {getComponentTypeDescription(type, t)}
          </p>
        </div>
        {total > 1 && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
            {position} / {total}
          </span>
        )}
      </div>

      <TextField
        id={`component-name-${managedType}`}
        label={t('componentNameLabel')}
        value={draft.name}
        onChange={(value) => wizard.setDraftName(type, value)}
        onBlur={() => wizard.markTouched(type, 'name')}
        placeholder={getComponentNamePlaceholder(type, t)}
        maxLength={MAX_RESOURCE_NAME_LENGTH}
        disabled={deploying}
        error={wizard.visibleError(type, 'name')}
      />

      <div className="mt-4">
        <SelectField
          id={`component-version-${managedType}`}
          label={t('versionLabel')}
          value={draft.version}
          onChange={(value) => wizard.setDraftVersion(type, value)}
          options={versionOptions}
          emptyLabel={t('versionUnavailable')}
          renderOption={(option) =>
            option === recommendedVersion
              ? t('versionOptionRecommended', { version: option })
              : option
          }
          disabled={deploying}
          help={versionOptions.length === 0 ? t('versionUnavailableHelp') : t('versionHelp')}
        />
      </div>
    </div>
  );
}
