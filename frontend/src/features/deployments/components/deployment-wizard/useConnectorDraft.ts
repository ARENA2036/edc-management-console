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
import { deriveHostnameSuffix } from '../../endpoints';
import {
  buildGeneratedHostname,
  buildResourceNamePreview,
  isValidResourceName,
  MAX_CONNECTORS,
  MAX_RESOURCE_NAME_LENGTH,
  MIN_RESOURCE_NAME_LENGTH,
  normalizeResourceName,
} from '../../nameRules';

import type { DashboardConnector } from '../../../../types';

export type ConnectorField = 'name';

export interface ConnectorDraftInput {
  open: boolean;
  deploying: boolean;
  connectorCount: number;
  existingConnectorNames: string[];
  defaultVersion?: string;
  availableVersions?: string[];
  prefilledBpn?: string;
  bpnRequired: boolean;
  defaultApiEndpoint?: string;
  defaultDataPlaneUrl?: string;
  controlPlaneHostSuffix?: string;
  dataPlaneHostSuffix?: string;
  onDeploy: (connector: DashboardConnector) => Promise<void> | void;
  onClose: () => void;
}

export function useConnectorDraft(input: ConnectorDraftInput) {
  const { t } = useI18n();
  const {
    open,
    deploying,
    connectorCount,
    existingConnectorNames,
    defaultVersion,
    availableVersions,
    prefilledBpn,
    bpnRequired,
    defaultApiEndpoint,
    defaultDataPlaneUrl,
    controlPlaneHostSuffix,
    dataPlaneHostSuffix,
    onDeploy,
    onClose,
  } = input;

  const versionOptions = useMemo(() => {
    const options = (availableVersions ?? []).map((value) => value.trim()).filter(Boolean);
    const fallback = defaultVersion?.trim();
    return fallback && !options.includes(fallback) ? [fallback, ...options] : options;
  }, [availableVersions, defaultVersion]);

  const recommendedVersion = defaultVersion?.trim() || versionOptions[0] || '';

  const [name, setName] = useState('');
  const [version, setVersion] = useState(recommendedVersion);
  const [touched, setTouched] = useState<Partial<Record<ConnectorField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setVersion((current) =>
      current && versionOptions.includes(current) ? current : recommendedVersion,
    );
  }, [open, recommendedVersion, versionOptions]);

  const normalizedName = useMemo(() => normalizeResourceName(name), [name]);
  const takenNames = useMemo(
    () => new Set(existingConnectorNames.map((value) => normalizeResourceName(value))),
    [existingConnectorNames],
  );

  const errors: Partial<Record<ConnectorField, string>> = {};
  if (!name.trim()) {
    errors.name = t('validationRequired', { field: t('connectorNameLabel') });
  } else if (!isValidResourceName(name)) {
    errors.name = t('validationInvalidResourceName', {
      min: String(MIN_RESOURCE_NAME_LENGTH),
      max: String(MAX_RESOURCE_NAME_LENGTH),
    });
  } else if (takenNames.has(normalizedName)) {
    errors.name = t('validationDuplicateName');
  }

  const visibleError = (field: ConnectorField) =>
    !deploying && errors[field] && (touched[field] || submitted) ? errors[field] : undefined;

  const bpn = useMemo(() => prefilledBpn?.toUpperCase().trim() ?? '', [prefilledBpn]);

  // Prefer the suffix the backend states outright; only fall back to splitting a
  // URL when it is absent, because that split assumes the host carries a leading
  // "<sample-name>-" segment - true of `default_url`, not of configured hosts.
  const controlPlaneSuffix = useMemo(
    () => controlPlaneHostSuffix?.trim() || deriveHostnameSuffix(defaultApiEndpoint),
    [controlPlaneHostSuffix, defaultApiEndpoint],
  );
  const dataPlaneSuffix = useMemo(
    () => dataPlaneHostSuffix?.trim() || deriveHostnameSuffix(defaultDataPlaneUrl),
    [dataPlaneHostSuffix, defaultDataPlaneUrl],
  );

  const controlPlaneHostname = useMemo(
    () =>
      buildGeneratedHostname(normalizedName, controlPlaneSuffix) || buildResourceNamePreview(name),
    [controlPlaneSuffix, name, normalizedName],
  );
  const dataPlaneHostname = useMemo(
    () => buildGeneratedHostname(normalizedName, dataPlaneSuffix),
    [dataPlaneSuffix, normalizedName],
  );

  // The deployed connector lives at its own per-name host ("{name}-{suffix}"),
  // which is what the backend puts on the Ingress. The shared dataspace endpoint
  // is only a fallback for when no suffix is configured.
  const apiUrl = controlPlaneHostname
    ? `https://${controlPlaneHostname}`
    : defaultApiEndpoint?.trim() ?? '';
  const dataPlaneUrl = dataPlaneHostname
    ? `https://${dataPlaneHostname}`
    : defaultDataPlaneUrl?.trim() ?? '';

  const limitReached = connectorCount >= MAX_CONNECTORS;
  const bpnMissing = !bpn;
  const blockedByMissingBpn = bpnRequired && bpnMissing;

  const toConnector = (): DashboardConnector => ({
    id: Date.now(),
    name: normalizedName,
    url: apiUrl,
    bpn,
    version: version.trim() || undefined,
    status: 'healthy',
    created_at: new Date().toISOString(),
    urls: [apiUrl, dataPlaneUrl].filter(Boolean),
    created_by: 'dashboard',
    db_username: '',
    db_password: '',
    cp_hostname: controlPlaneHostname,
    dp_hostname: dataPlaneHostname,
    config: {
      connectorType: t('connectorTypeDefault'),
      endpoint: apiUrl,
      hostname: controlPlaneHostname,
      dataPlaneUrl,
      bpn,
      version: version.trim(),
    },
    source: 'local',
  });

  const reset = () => {
    setName('');
    setTouched({});
    setSubmitted(false);
    setVersion(recommendedVersion);
  };

  const close = () => {
    onClose();
    reset();
  };

  const submit = async () => {
    setSubmitted(true);
    if (deploying || limitReached || blockedByMissingBpn || Object.keys(errors).length > 0) {
      return;
    }

    await onDeploy(toConnector());
    close();
  };

  return {
    name,
    setName: (value: string) => {
      setName(value.trimStart());
      setTouched((current) => ({ ...current, name: true }));
    },
    markNameTouched: () => setTouched((current) => ({ ...current, name: true })),
    version,
    setVersion,
    versionOptions,
    recommendedVersion,
    bpn,
    controlPlaneHostname,
    visibleError,
    limitReached,
    bpnMissing,
    blockedByMissingBpn,
    submit,
    close,
  };
}

export type ConnectorDraftState = ReturnType<typeof useConnectorDraft>;
