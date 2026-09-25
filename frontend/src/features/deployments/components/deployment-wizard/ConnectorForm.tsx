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
import { MAX_CONNECTORS, MAX_RESOURCE_NAME_LENGTH } from '../../nameRules';

import type { ConnectorDraftState } from './useConnectorDraft';

/** The connector's editable and derived values. */
export default function ConnectorForm({
  draft,
  deploying,
  bpnRequired,
}: {
  draft: ConnectorDraftState;
  deploying: boolean;
  bpnRequired: boolean;
}) {
  const { t } = useI18n();

  return (
    <>
      <Notice>
        <p className="font-medium text-gray-900 dark:text-slate-100">
          {t('deploymentPreparationWelcome')}
        </p>
        <p className="mt-2">{t('deploymentPreparationCredentials')}</p>
      </Notice>

      {draft.limitReached && (
        <Notice tone="danger">{t('connectorLimitReached', { max: String(MAX_CONNECTORS) })}</Notice>
      )}
      {draft.bpnMissing && (
        <Notice tone="warning">
          {bpnRequired ? t('bpnMissingBlocking') : t('bpnMissingWarning')}
        </Notice>
      )}

      <TextField
        id="connector-name"
        label={t('connectorNameLabel')}
        value={draft.name}
        onChange={draft.setName}
        onBlur={draft.markNameTouched}
        placeholder={t('connectorNamePlaceholder')}
        maxLength={MAX_RESOURCE_NAME_LENGTH}
        disabled={deploying}
        error={draft.visibleError('name')}
        accent="brand"
      />
      <Notice tone="brand">{t('connectorNameHelp')}</Notice>

      <SelectField
        id="connector-version"
        label={t('versionLabel')}
        value={draft.version}
        onChange={draft.setVersion}
        options={draft.versionOptions}
        emptyLabel={t('versionUnavailable')}
        renderOption={(option) =>
          option === draft.recommendedVersion
            ? t('versionOptionRecommended', { version: option })
            : option
        }
        disabled={deploying}
        help={draft.versionOptions.length === 0 ? t('versionUnavailableHelp') : t('versionHelp')}
        accent="brand"
      />

      <TextField
        id="connector-bpn"
        label={t('bpnLabel')}
        value={draft.bpn}
        readOnly
        placeholder={t('bpnUnavailablePlaceholder')}
        help={t('bpnHelp')}
      />

      <TextField
        id="connector-hostname"
        label={t('hostnameLabel')}
        value={draft.controlPlaneHostname}
        readOnly
        placeholder={t('hostnamePlaceholder')}
        help={t('hostnameHelp')}
      />
    </>
  );
}
