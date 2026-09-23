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

import { useDataspaceSummary } from '../features/dataspace/DataspaceContext';
import { useI18n } from '../i18n';
import { getRuntimeConfigValue } from '../runtime-config';

export type ExternalAppKey = 'sde' | 'portal' | 'ich';

export interface ExternalApp {
  key: ExternalAppKey;
  path: string;
  url: string;
  navLabel: string;
  redirectTitle: string;
  redirectDescription: string;
  placeholderDescription: string;
  tooltip: { title: string; content: string; footer: string };
}

export function useExternalApps(): ExternalApp[] {
  const { t } = useI18n();
  const { dataspace } = useDataspaceSummary();
  const details = dataspace.details;

  const configuredUrls: Record<ExternalAppKey, string> = {
    sde: getRuntimeConfigValue(
      import.meta.env.VITE_SDE_URL,
      window.__RUNTIME_CONFIG__?.sdeUrl,
      details?.sde?.url ?? '',
    ),
    portal: getRuntimeConfigValue(
      import.meta.env.VITE_PORTAL_URL,
      window.__RUNTIME_CONFIG__?.portalUrl,
      details?.portal?.url ?? '',
    ),
    ich: getRuntimeConfigValue(
      import.meta.env.VITE_ICH_URL,
      window.__RUNTIME_CONFIG__?.ichUrl,
      details?.ich?.url ?? '',
    ),
  };

  return [
    {
      key: 'sde',
      path: '/sde',
      url: configuredUrls.sde,
      navLabel: t('sdeNavLabel'),
      redirectTitle: t('sdeRedirectTitle'),
      redirectDescription: t('sdeRedirectDescription'),
      placeholderDescription: t('sdePlaceholderDescription'),
      tooltip: { title: t('sdeNavTitle'), content: t('sdeNavContent'), footer: t('sdeNavFooter') },
    },
    {
      key: 'portal',
      path: '/portal',
      url: configuredUrls.portal,
      navLabel: t('portalNavLabel'),
      redirectTitle: t('portalRedirectTitle'),
      redirectDescription: t('portalRedirectDescription'),
      placeholderDescription: t('portalPlaceholderDescription'),
      tooltip: {
        title: t('portalNavTitle'),
        content: t('portalNavContent'),
        footer: t('portalNavFooter'),
      },
    },
    {
      key: 'ich',
      path: '/ich',
      url: configuredUrls.ich,
      navLabel: t('ichNavLabel'),
      redirectTitle: t('ichRedirectTitle'),
      redirectDescription: t('ichRedirectDescription'),
      placeholderDescription: t('ichPlaceholderDescription'),
      tooltip: { title: t('ichNavTitle'), content: t('ichNavContent'), footer: t('ichNavFooter') },
    },
  ];
}
