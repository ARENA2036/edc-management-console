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

import type { SessionIdentity } from '../../auth/session';
import { useI18n } from '../../i18n';
import { getRuntimeConfigValue } from '../../runtime-config';
import { readAuthorityBpn } from '../dataspace/api';
import { useDataspaceSummary } from '../dataspace/useDataspace';

export default function Settings({
  onOpenGuide,
  identity,
}: {
  onOpenGuide: () => void;
  identity: SessionIdentity;
}) {
  const { t } = useI18n();
  const { dataspace, loaded: settingsLoaded } = useDataspaceSummary();
  const dataspaceDetails = dataspace.details;

  const ichUrlFromConfig = getRuntimeConfigValue(
    import.meta.env.VITE_ICH_URL,
    window.__RUNTIME_CONFIG__?.ichUrl,
    dataspaceDetails?.ich?.url ?? '',
  );

  const formatValue = (value?: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? t('yes') : t('no');
    }

    return value && value.trim().length > 0 ? value : t('noValue');
  };

  const sections = [
    {
      key: 'company',
      title: t('settingsSectionCompany'),
      fields: [
        { label: t('settingsLabelCompanyName'), value: identity.company },
        { label: t('settingsLabelCompanyBpn'), value: identity.bpn },
      ],
    },
    {
      key: 'dataspace',
      title: t('settingsSectionDataspace'),
      fields: [
        { label: t('settingsLabelDataspace'), value: dataspaceDetails?.name },
        { label: t('settingsLabelAuthorityBpn'), value: readAuthorityBpn(dataspaceDetails) },
        { label: t('settingsLabelIdpRealm'), value: dataspaceDetails?.realm },
      ],
    },
    {
      key: 'access',
      title: t('settingsSectionAccess'),
      fields: [
        { label: t('settingsLabelCentralIdpUrl'), value: dataspaceDetails?.centralidp?.url },
        { label: t('settingsLabelCentralIdpRealm'), value: dataspaceDetails?.centralidp?.realm },
        { label: t('settingsLabelSsiWalletUrl'), value: dataspaceDetails?.ssi_wallet?.url },
      ],
    },
    {
      key: 'apps',
      title: t('settingsSectionApps'),
      fields: [
        { label: t('settingsLabelPortalUrl'), value: dataspaceDetails?.portal?.url },
        { label: t('settingsLabelSdeUrl'), value: dataspaceDetails?.sde?.url },
        { label: t('settingsLabelIchUrl'), value: ichUrlFromConfig },
        { label: t('settingsLabelManufacturerId'), value: dataspaceDetails?.sde?.manufacturerId },
      ],
    },
    {
      key: 'discovery',
      title: t('settingsSectionDiscovery'),
      fields: [
        { label: t('settingsLabelSemanticsUrl'), value: dataspaceDetails?.discovery?.semantics_url },
        { label: t('settingsLabelDiscoveryFinder'), value: dataspaceDetails?.discovery?.discovery_finder },
        { label: t('settingsLabelBpnDiscovery'), value: dataspaceDetails?.discovery?.bpn_discovery },
      ],
    },
    {
      key: 'infrastructure',
      title: t('settingsSectionInfrastructure'),
      fields: [
        { label: t('settingsLabelDefaultEdcUrl'), value: dataspaceDetails?.edc?.default_url },
        { label: t('settingsLabelClusterContext'), value: dataspaceDetails?.edc?.cluster_context }
      ],
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('settingsTitle')}</h2>
            <p className="mt-2 max-w-3xl text-gray-500 dark:text-slate-400">{t('settingsDescription')}</p>
          </div>
          
        </div>
      </div>

      <button
        onClick={onOpenGuide}
        className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/15"
      >
        {t('reopenGuideButton')}
      </button>

      {!settingsLoaded && <p className="text-gray-500 dark:text-slate-400">{t('settingsLoading')}</p>}

      {settingsLoaded && dataspaceDetails && (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.key}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {section.title}
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {t('viewOnly')}
                </span>
              </div>

              <div className="space-y-3">
                {section.fields.map((field) => (
                  <div
                    key={field.label}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                      {field.label}
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-800 dark:text-slate-200">
                      {formatValue(field.value)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
