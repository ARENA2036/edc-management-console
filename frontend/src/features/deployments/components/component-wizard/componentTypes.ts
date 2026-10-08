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

import type { useI18n } from '../../../../i18n';
import type { ManagedComponent } from '../../../../types';

type Translate = ReturnType<typeof useI18n>['t'];

/** The component types this wizard can create, in display order. */
export const COMPONENT_TYPES = ['Submodel Service', 'Digital Twin Registry'] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export function toManagedComponentType(type: ComponentType): ManagedComponent['type'] {
  return type === 'Digital Twin Registry' ? 'digitalTwinRegistry' : 'submodelServer';
}

export function getComponentTypeTitle(type: ComponentType, t: Translate) {
  return type === 'Digital Twin Registry' ? t('componentTypeTwin') : t('componentTypeSubmodel');
}

export function getComponentTypeDescription(type: ComponentType, t: Translate) {
  return type === 'Digital Twin Registry'
    ? t('componentTypeTwinDescription')
    : t('componentTypeSubmodelDescription');
}

export function getComponentNamePlaceholder(type: ComponentType, t: Translate) {
  return type === 'Digital Twin Registry'
    ? t('componentNamePlaceholderTwin')
    : t('componentNamePlaceholderSubmodel');
}
