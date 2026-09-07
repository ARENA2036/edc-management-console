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
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppNew from './AppNew.tsx'
import keycloak, {
  getKeycloakConfig,
  isAuthDisabled,
  validateKeycloakConfig,
} from './auth/keycloak'
import { I18nProvider } from './i18n'
import ErrorBoundary from './components/ErrorBoundary'

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <ErrorBoundary>
          <AppNew />
        </ErrorBoundary>
      </I18nProvider>
    </StrictMode>,
  );
};

const renderAuthStatus = (title: string, message: string, actionLabel?: string) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
              EDC Management Console
            </p>
            <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-300">{message}</p>
            {actionLabel && (
              <button
                onClick={() => void keycloak.login()}
                className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </StrictMode>,
  );
};

const initKeycloak = async () => {
  localStorage.removeItem('token');
  if (isAuthDisabled()) {
    renderApp();
    return;
  }

  renderAuthStatus(
    'Connecting to Keycloak',
    'Your login session is being prepared. If authentication is required, the application will redirect you to Keycloak automatically.',
  );

  const keycloakConfig = getKeycloakConfig();
  const keycloakConfigValidation = validateKeycloakConfig(keycloakConfig);
  if (!keycloakConfigValidation.valid) {
    renderAuthStatus(
      'Keycloak configuration incomplete',
      `The login flow cannot start because these settings are missing: ${keycloakConfigValidation.missingFields.join(', ')}.`,
    );
    return;
  }

  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    });

    if (authenticated) {
      keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).catch(() => {
          keycloak.login();
        });
      };

      renderApp();
      return;
    }

    renderAuthStatus(
      'Login required',
      'No authenticated Keycloak session was established. Start the login flow again to continue.',
      'Open Keycloak login',
    );
  } catch (error) {
    console.error('Failed to initialize Keycloak:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown Keycloak initialization error';
    renderAuthStatus(
      'Keycloak login failed',
      `The application could not complete the authentication handshake. Details: ${message}`,
      'Retry login',
    );
  }
};

initKeycloak();
