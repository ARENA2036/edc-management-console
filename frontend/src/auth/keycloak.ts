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
import Keycloak, { type KeycloakConfig } from 'keycloak-js';
import { getRuntimeConfigBoolean, getRuntimeConfigValue } from '../runtime-config';

export function getKeycloakConfig(): KeycloakConfig {
  return {
    url: getRuntimeConfigValue(
      import.meta.env.VITE_KEYCLOAK_URL,
      window.__RUNTIME_CONFIG__?.keycloakUrl,
      '',
    ),
    realm: getRuntimeConfigValue(
      import.meta.env.VITE_KEYCLOAK_REALM,
      window.__RUNTIME_CONFIG__?.realm,
      '',
    ),
    clientId: getRuntimeConfigValue(
      import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
      window.__RUNTIME_CONFIG__?.clientId,
      '',
    ),
  };
}

export function validateKeycloakConfig(config: KeycloakConfig) {
  const missingFields = [
    ['url', config.url],
    ['realm', config.realm],
    ['clientId', config.clientId],
  ].filter(([, value]) => !value);

  return {
    valid: missingFields.length === 0,
    missingFields: missingFields.map(([field]) => field),
  };
}

const keycloak = new Keycloak(getKeycloakConfig());

export const isAuthDisabled = () =>
  getRuntimeConfigBoolean(
    import.meta.env.VITE_DISABLE_AUTH,
    window.__RUNTIME_CONFIG__?.disableAuth,
    false,
  );

export default keycloak;