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

import { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../../i18n';
import {
  isValidResourceName,
  MAX_RESOURCE_NAME_LENGTH,
  MIN_RESOURCE_NAME_LENGTH,
  normalizeResourceName,
} from '../../nameRules';

import { COMPONENT_TYPES, toManagedComponentType, type ComponentType } from './componentTypes';

import type { ManagedComponent } from '../../../../types';

export type ComponentField = 'name';

export interface ComponentDraft {
  name: string;
  version: string;
  touched: Partial<Record<ComponentField, boolean>>;
}

export interface ComponentWizardInput {
  open: boolean;
  deploying: boolean;
  existingNames: string[];
  defaultVersions?: Partial<Record<ManagedComponent['type'] | 'connector', string>>;
  availableVersions?: Partial<Record<ManagedComponent['type'] | 'connector', string[]>>;
  allowMultipleTypes: boolean;
  initialSelectedTypes?: ComponentType[];
  startAtConfiguration: boolean;
  typeCounts: Record<ManagedComponent['type'], number>;
  typeLimits: Record<ManagedComponent['type'], number>;
  onDeploy: (component: ManagedComponent) => Promise<void> | void;
  onClose: () => void;
}

function createEmptyDraft(version = ''): ComponentDraft {
  return { name: '', version, touched: {} };
}

function buildDrafts(resolveVersion: (type: ComponentType) => string = () => '') {
  return COMPONENT_TYPES.reduce(
    (drafts, type) => ({ ...drafts, [type]: createEmptyDraft(resolveVersion(type)) }),
    {} as Record<ComponentType, ComponentDraft>,
  );
}

export function useComponentWizard(input: ComponentWizardInput) {
  const { t } = useI18n();
  const {
    open,
    deploying,
    existingNames,
    defaultVersions,
    availableVersions,
    allowMultipleTypes,
    initialSelectedTypes,
    startAtConfiguration,
    typeCounts,
    typeLimits,
    onDeploy,
    onClose,
  } = input;

  const isTypeFull = useMemo(() => {
    return (type: ComponentType) => {
      const managedType = toManagedComponentType(type);
      return typeCounts[managedType] >= typeLimits[managedType];
    };
  }, [typeCounts, typeLimits]);

  const availableTypes = useMemo(
    () => COMPONENT_TYPES.filter((type) => !isTypeFull(type)),
    [isTypeFull],
  );
  const allTypesFull = availableTypes.length === 0;

  const versionOptionsByType = useMemo(
    () =>
      COMPONENT_TYPES.reduce((options, type) => {
        const managedType = toManagedComponentType(type);
        const published = (availableVersions?.[managedType] ?? [])
          .map((value) => value.trim())
          .filter(Boolean);
        const fallback = defaultVersions?.[managedType]?.trim();
        options[type] =
          fallback && !published.includes(fallback) ? [fallback, ...published] : published;
        return options;
      }, {} as Record<ComponentType, string[]>),
    [availableVersions, defaultVersions],
  );

  const defaultVersionForType = useMemo(
    () =>
      COMPONENT_TYPES.reduce((defaults, type) => {
        const managedType = toManagedComponentType(type);
        defaults[type] =
          defaultVersions?.[managedType]?.trim() || versionOptionsByType[type][0] || '';
        return defaults;
      }, {} as Record<ComponentType, string>),
    [defaultVersions, versionOptionsByType],
  );

  const defaultSelectedTypes = useMemo<ComponentType[]>(() => {
    const requested = initialSelectedTypes?.length
      ? [...initialSelectedTypes]
      : ['Submodel Service' as ComponentType];
    const selectable = requested.filter((type) => availableTypes.includes(type));
    return selectable.length ? selectable : availableTypes.slice(0, 1);
  }, [availableTypes, initialSelectedTypes]);

  const [step, setStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<ComponentType[]>(defaultSelectedTypes);
  const [drafts, setDrafts] = useState<Record<ComponentType, ComponentDraft>>(() =>
    buildDrafts((type) => defaultVersionForType[type]),
  );
  const [typeStepSubmitted, setTypeStepSubmitted] = useState(false);
  const [configStepSubmitted, setConfigStepSubmitted] = useState(false);

  const normalizedExistingNames = useMemo(
    () => new Set(existingNames.map((value) => normalizeResourceName(value))),
    [existingNames],
  );

  // Opening the dialog starts a fresh draft; it is never a continuation.
  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(startAtConfiguration ? 2 : 1);
    setSelectedTypes(defaultSelectedTypes);
    setDrafts(buildDrafts((type) => defaultVersionForType[type]));
    setTypeStepSubmitted(false);
    setConfigStepSubmitted(false);
  }, [defaultSelectedTypes, defaultVersionForType, open, startAtConfiguration]);

  const getDraft = (type: ComponentType) =>
    drafts[type] ?? createEmptyDraft(defaultVersionForType[type]);

  const getErrors = (type: ComponentType) => {
    const draft = getDraft(type);
    const errors: Partial<Record<ComponentField, string>> = {};
    const normalizedName = normalizeResourceName(draft.name);
    const duplicateInSelection = selectedTypes.some(
      (selectedType) =>
        selectedType !== type
        && normalizeResourceName(getDraft(selectedType).name) === normalizedName
        && normalizedName.length > 0,
    );

    if (!draft.name.trim()) {
      errors.name = t('validationRequired', { field: t('componentNameLabel') });
    } else if (!isValidResourceName(draft.name)) {
      errors.name = t('validationInvalidResourceName', {
        min: String(MIN_RESOURCE_NAME_LENGTH),
        max: String(MAX_RESOURCE_NAME_LENGTH),
      });
    } else if (normalizedExistingNames.has(normalizedName) || duplicateInSelection) {
      errors.name = t('validationDuplicateName');
    }

    return errors;
  };

  /** An error is only shown once the user has left the field or tried to submit. */
  const visibleError = (type: ComponentType, field: ComponentField) => {
    if (deploying) {
      return undefined;
    }
    const error = getErrors(type)[field];
    return error && (getDraft(type).touched[field] || configStepSubmitted) ? error : undefined;
  };

  const updateDraft = (type: ComponentType, updater: (draft: ComponentDraft) => ComponentDraft) => {
    setDrafts((current) => ({ ...current, [type]: updater(current[type] ?? createEmptyDraft()) }));
  };

  const setDraftName = (type: ComponentType, name: string) =>
    updateDraft(type, (draft) => ({ ...draft, name: name.trimStart() }));

  const setDraftVersion = (type: ComponentType, version: string) =>
    updateDraft(type, (draft) => ({ ...draft, version }));

  const markTouched = (type: ComponentType, field: ComponentField) =>
    updateDraft(type, (draft) => ({ ...draft, touched: { ...draft.touched, [field]: true } }));

  const toggleType = (type: ComponentType) => {
    if (isTypeFull(type)) {
      return;
    }

    if (!allowMultipleTypes) {
      setSelectedTypes([type]);
      return;
    }

    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((currentType) => currentType !== type)
        : [...current, type],
    );
  };

  const toComponent = (type: ComponentType): ManagedComponent => {
    const draft = getDraft(type);
    const name = normalizeResourceName(draft.name);

    return {
      id: `comp-${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name,
      type: toManagedComponentType(type),
      version: draft.version.trim() || defaultVersionForType[type] || '',
      status: 'Deploying',
      deployedAt: new Date().toISOString(),
      db_name: `${name}-db`,
      auth: { db_username: `${name}-user`, db_password: '' },
    };
  };

  const submit = async () => {
    if (step === 1) {
      setTypeStepSubmitted(true);
      if (selectedTypes.length === 0 || allTypesFull) {
        return;
      }
      setStep(2);
      return;
    }

    setConfigStepSubmitted(true);
    const blocked =
      deploying
      || selectedTypes.length === 0
      || selectedTypes.some((type) => isTypeFull(type))
      || selectedTypes.some((type) => Object.keys(getErrors(type)).length > 0);

    if (blocked) {
      return;
    }

    for (const type of selectedTypes) {
      await Promise.resolve(onDeploy(toComponent(type)));
    }

    onClose();
  };

  const back = () => {
    if (deploying) {
      return;
    }
    if (step === 1) {
      onClose();
      return;
    }
    setStep(1);
  };

  return {
    step,
    selectedTypes,
    allTypesFull,
    typeStepSubmitted,
    isTypeFull,
    typeCounts,
    typeLimits,
    versionOptionsByType,
    defaultVersionForType,
    getDraft,
    setDraftName,
    setDraftVersion,
    markTouched,
    visibleError,
    toggleType,
    submit,
    back,
  };
}

export type ComponentWizardState = ReturnType<typeof useComponentWizard>;
