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

import { useCallback, useEffect, useState } from 'react';

import { MONITORING_INTERVAL_MS } from '../../app/constants';

import { fetchDeploymentState } from './api';

import type { ApiError } from '../../api/errors';
import type { DashboardConnector, ManagedComponent } from '../../types';


export function useDeploymentState() {
  const [connectors, setConnectors] = useState<DashboardConnector[]>([]);
  const [components, setComponents] = useState<ManagedComponent[]>([]);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const apply = useCallback((state: Awaited<ReturnType<typeof fetchDeploymentState>>) => {
    setConnectors(state.connectors);
    setComponents(state.components);
    setLoadError(state.error ?? null);
    if (!state.error) {
      setLastSyncedAt(new Date().toISOString());
    }
  }, []);

  const refresh = useCallback(async () => {
    const state = await fetchDeploymentState();
    apply(state);
    return state;
  }, [apply]);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      const state = await fetchDeploymentState();
      if (active) {
        apply(state);
      }
    };

    poll();
    const interval = setInterval(poll, MONITORING_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [apply]);

  return {
    connectors,
    components,
    loadError,
    lastSyncedAt,
    refresh,
    dismissLoadError: () => setLoadError(null),
    /** Optimistic updates only; the next poll or refresh overwrites these. */
    setConnectors,
    setComponents,
  };
}

export type DeploymentState = ReturnType<typeof useDeploymentState>;
