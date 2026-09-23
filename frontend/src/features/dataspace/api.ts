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

import { dataspaceApi } from '../../api/client';
import { toApiError } from '../../api/errors';

import type { DataspaceSettingsPayload, DataspaceSummary } from './types';

export function readAuthorityBpn(details: DataspaceSettingsPayload | null | undefined) {
  const authorityBpn = details?.authority_bpn?.trim().toUpperCase();
  if (authorityBpn) {
    return authorityBpn;
  }

  return details?.bpn?.trim().toUpperCase() ?? '';
}

export async function fetchDataspaceSummary(
  fallbackName: string,
): Promise<DataspaceSummary> {
  try {
    const response = await dataspaceApi.getDataspace();
    const data = (response.data?.data as DataspaceSettingsPayload | undefined) ?? null;
    return {
      name: data?.name || fallbackName,
      authorityBpn: readAuthorityBpn(data),
      details: data,
    };
  } catch (error) {
    console.error('Failed to load dataspace:', toApiError(error));
    return {
      name: fallbackName,
      authorityBpn: '',
      details: null,
    };
  }
}
