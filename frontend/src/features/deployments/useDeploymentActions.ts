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

import { useState } from 'react';

import { componentApi } from '../../api/client';
import { ApiError, toApiError } from '../../api/errors';
import {
  COMPONENTS_STORAGE_KEY,
  CONNECTORS_STORAGE_KEY,
  DEFAULT_COMPONENT_HOST_SUFFIX,
} from '../../app/constants';
import { saveLocalStorage } from '../../utils/storage';

import { countComponentsByType, type ComponentLimits } from './model';

import type { DeploymentState } from './useDeploymentState';
import type { DashboardConnector, ManagedComponent } from '../../types';

export function useDeploymentActions(state: DeploymentState, limits: ComponentLimits) {
  const { connectors, components, refresh, setConnectors, setComponents } = state;
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const deployConnector = async (connector: DashboardConnector) => {
    if (connectors.some((current) => current.name === connector.name)) {
      return false;
    }

    if (connectors.length >= limits.connector) {
      return false;
    }

    const deployingConnector = {
      ...connector,
      status: 'deploying',
      source: 'local' as const,
    } satisfies DashboardConnector;
    const updatedConnectors = [...connectors, deployingConnector];
    saveLocalStorage(CONNECTORS_STORAGE_KEY, updatedConnectors);
    setConnectors(updatedConnectors);

    try {
      await componentApi.create({
        components: [
          {
            type: 'connector',
            name: connector.name,
            url: connector.url,
            bpn: connector.bpn,
            version: connector.version || '',
            db_name: `${connector.name}-db`,
            auth: {
              db_username: connector.db_username || `${connector.name}-username`,
              db_password: '',
            },
          },
        ],
      });

      const synced = await refresh();
      if (!synced.connectors.some((current) => current.name === connector.name)) {
        throw new Error(
          `Connector '${connector.name}' was not returned by the backend after deployment.`,
        );
      }
    } catch (error) {
      await refresh();
      console.error('Failed to deploy connector:', error);
      throw error;
    }

    return true;
  };

  const deployComponent = async (component: ManagedComponent) => {
    const counts = countComponentsByType(components);
    if (counts[component.type] >= limits[component.type]) {
      throw new ApiError({
        status: 409,
        code: 'COMPONENT_LIMIT_REACHED',
        stage: 'request',
        message:
          `Cannot deploy '${component.name}': the limit of `
          + `${limits[component.type]} '${component.type}' components is already reached.`,
        hint: 'Delete an existing component of this type, then deploy again.',
      });
    }

    // Without an explicit endpoint the component is reachable under its own
    // name on the configured host suffix.
    const generatedEndpoint = component.endpoint?.trim()
      || (DEFAULT_COMPONENT_HOST_SUFFIX
        ? `${component.name}.${DEFAULT_COMPONENT_HOST_SUFFIX}`
        : component.name);

    const deployingComponent = {
      ...component,
      endpoint: generatedEndpoint,
      status: 'Deploying',
      source: 'local' as const,
    } satisfies ManagedComponent;

    setComponents((current) => {
      const updated = [deployingComponent, ...current];
      saveLocalStorage(COMPONENTS_STORAGE_KEY, updated);
      return updated;
    });

    try {
      await componentApi.create({
        components: [
          {
            type: component.type,
            name: component.name,
            version: component.version,
            url: generatedEndpoint,
            db_name: component.db_name,
            auth: component.auth,
          },
        ],
      });

      const synced = await refresh();
      if (!synced.components.some((current) => current.name === component.name)) {
        throw new Error(
          `Component '${component.name}' was not returned by the backend after deployment.`,
        );
      }
    } catch (error) {
      await refresh();
      console.error('Failed to deploy component:', error);
      throw error;
    }
  };

  const remove = async (name: string) => {
    setActionError(null);
    try {
      await componentApi.delete(name);
      await refresh();
    } catch (error) {
      const apiError = toApiError(error, `'${name}' could not be deleted.`);
      console.error('Failed to delete deployment:', apiError);
      setActionError(apiError);
    }
  };

  return {
    actionError,
    dismissActionError: () => setActionError(null),
    deployConnector,
    deployComponent,
    deleteConnector: (connector: DashboardConnector) => remove(connector.name),
    deleteComponent: (component: ManagedComponent) => remove(component.name),
  };
}
