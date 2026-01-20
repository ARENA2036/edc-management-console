/********************************************************************************
 * Copyright (c) 2025 ARENA2036 e.V.
 * Copyright (c) 2022,2023 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/
import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'CX-Central',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'CX-EDC',
};

const keycloak = new Keycloak(keycloakConfig);

export const initKeycloak = async (onAuthenticatedCallback: () => void) => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    });

    if (authenticated) {
      onAuthenticatedCallback();
    } else {
      console.warn('User is not authenticated');
      keycloak.login();
    }
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
  }
};

export const getToken = () => keycloak.token;

export const getUserInfo = () => ({
  name: keycloak.tokenParsed?.preferred_username || 'User',
  email: keycloak.tokenParsed?.email || '',
  roles: keycloak.tokenParsed?.realm_access?.roles || [],
});

export const doLogout = () => keycloak.logout();

export const updateToken = async () => {
  try {
    const refreshed = await keycloak.updateToken(30);
    if (refreshed) {
      console.log('Token was successfully refreshed');
    }
    return keycloak.token;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    keycloak.login();
  }
};

export default keycloak;
