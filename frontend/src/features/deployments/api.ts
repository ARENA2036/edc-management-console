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

import { componentApi } from '../../api/client';
import { toApiError, type ApiError } from '../../api/errors';
import { COMPONENTS_STORAGE_KEY, CONNECTORS_STORAGE_KEY } from '../../app/constants';
import { readLocalStorage, saveLocalStorage } from '../../utils/storage';

import { getRecordType, mapApiComponent, mapApiConnector } from './model';

import type { DashboardConnector, ManagedComponent } from '../../types';

export function getCachedDeployments() {
  const cachedConnectors = readLocalStorage<DashboardConnector[]>(
    CONNECTORS_STORAGE_KEY,
    [],
  );
  const cachedComponents = readLocalStorage<ManagedComponent[]>(
    COMPONENTS_STORAGE_KEY,
    [],
  );

  return {
    connectors: cachedConnectors,
    components: cachedComponents,
  };
}

export async function fetchDeploymentState(): Promise<{
  connectors: DashboardConnector[];
  components: ManagedComponent[];
  error?: ApiError | null;
}> {
  try {
    const response = await componentApi.getAll();
    const apiRows = Array.isArray(response.data.data)
      ? (response.data.data as DashboardConnector[])
      : [];
    const connectors = apiRows
      .filter((record) => getRecordType(record) === 'connector')
      .map(mapApiConnector);
    const components = apiRows
      .filter((record) => getRecordType(record) !== 'connector')
      .map(mapApiComponent)
      .filter((component): component is ManagedComponent => component !== null);

    saveLocalStorage(CONNECTORS_STORAGE_KEY, connectors);
    saveLocalStorage(COMPONENTS_STORAGE_KEY, components);
    return { connectors, components, error: null };
  } catch (error) {
    const apiError = toApiError(error, 'The list of deployed components could not be loaded.');
    console.error('Failed to load deployments:', apiError);

    if (apiError.stage === 'auth') {
      saveLocalStorage(CONNECTORS_STORAGE_KEY, []);
      saveLocalStorage(COMPONENTS_STORAGE_KEY, []);
      return { connectors: [], components: [], error: apiError };
    }

    return { ...getCachedDeployments(), error: apiError };
  }
}
