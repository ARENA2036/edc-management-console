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

import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { dataspaceApi } from '../api/client';
import keycloak from '../auth/keycloak';
import { useSessionIdentity } from '../auth/session';
import AppPlaceholder from '../components/AppPlaceholder';
import ExternalAppRedirect from '../components/ExternalAppRedirect';
import Header from '../components/Header';
import OnboardingGuide from '../components/OnboardingGuide';
import Sidebar from '../components/Sidebar';
import Dashboard from '../features/dashboard/Dashboard';
import Monitor from '../features/monitor/Monitor';
import Settings from '../features/settings/Settings';
import { useI18n } from '../i18n';
import { getRuntimeConfigValue } from '../runtime-config';
import { THEME_STORAGE_KEY, WELCOME_STORAGE_KEY } from './constants';

type ThemeMode = 'light' | 'dark';

export default function AppShell() {
  const { t } = useI18n();
  const { identity } = useSessionIdentity();
  const firstName = keycloak.tokenParsed?.given_name || '';
  const lastName = keycloak.tokenParsed?.family_name || '';
  const fullName =
    identity.name ||
    `${firstName} ${lastName}`.trim() ||
    identity.username ||
    keycloak.tokenParsed?.preferred_username ||
    t('userFallback');

  const envSdeUrl = getRuntimeConfigValue(
    import.meta.env.VITE_SDE_URL,
    window.__RUNTIME_CONFIG__?.sdeUrl,
    '',
  );
  const envPortalUrl = getRuntimeConfigValue(
    import.meta.env.VITE_PORTAL_URL,
    window.__RUNTIME_CONFIG__?.portalUrl,
    '',
  );
  const envIchUrl = getRuntimeConfigValue(
    import.meta.env.VITE_ICH_URL,
    window.__RUNTIME_CONFIG__?.ichUrl,
    '',
  );

  const [sdeUrl, setSdeUrl] = useState(envSdeUrl);
  const [portalUrl, setPortalUrl] = useState(envPortalUrl);
  const [ichUrl, setIchUrl] = useState(envIchUrl);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'dark' ? 'dark' : 'light';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const loadAppUrls = async () => {
      try {
        const response = await dataspaceApi.getDataspace();
        if (!envSdeUrl && response.data?.data?.sde?.url) {
          setSdeUrl(response.data.data.sde.url);
        }
        if (!envPortalUrl && response.data?.data?.portal?.url) {
          setPortalUrl(response.data.data.portal.url);
        }
        if (!envIchUrl && response.data?.data?.ich?.url) {
          setIchUrl(response.data.data.ich.url);
        }
      } catch (error) {
        console.error('Failed to load external app URLs:', error);
      }
    };

    loadAppUrls();

    const hasSeenWelcome = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!hasSeenWelcome) {
      setShowGuide(true);
    }
  }, []);

  const closeGuide = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    setShowGuide(false);
  };

  return (
    <>
      <BrowserRouter>
        <div className="flex h-[100dvh] overflow-hidden bg-gray-50 dark:bg-slate-950">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onHelpClick={() => setShowGuide(true)}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header
              user={{
                name: fullName,
                role: t('userAdministrator'),
              }}
              onLogout={() => keycloak.logout()}
              onMenuToggle={() => setIsSidebarOpen((current) => !current)}
              onHelpClick={() => setShowGuide(true)}
              theme={theme}
              onThemeToggle={() =>
                setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
              }
            />
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
              <div className="flex min-h-full flex-col">
                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Dashboard identity={identity} />} />
                    <Route path="/monitor" element={<Monitor />} />
                    <Route
                      path="/sde"
                      element={(
                        <ExternalAppRedirect
                          url={sdeUrl}
                          title={t('sdeRedirectTitle')}
                          description={t('sdeRedirectDescription')}
                        />
                      )}
                    />
                    <Route
                      path="/portal"
                      element={
                        portalUrl ? (
                          <ExternalAppRedirect
                            url={portalUrl}
                            title={t('portalRedirectTitle')}
                            description={t('portalRedirectDescription')}
                          />
                        ) : (
                          <AppPlaceholder
                            title={t('portalNavLabel')}
                            description={t('portalPlaceholderDescription')}
                          />
                        )
                      }
                    />
                    <Route
                      path="/ich"
                      element={
                        ichUrl ? (
                          <ExternalAppRedirect
                            url={ichUrl}
                            title={t('ichRedirectTitle')}
                            description={t('ichRedirectDescription')}
                          />
                        ) : (
                          <AppPlaceholder
                            title={t('ichNavLabel')}
                            description={t('ichPlaceholderDescription')}
                          />
                        )
                      }
                    />
                    <Route
                      path="/settings"
                      element={(
                        <Settings
                          onOpenGuide={() => setShowGuide(true)}
                          identity={identity}
                        />
                      )}
                    />
                  </Routes>
                </div>
                <footer className="mt-8 border-t border-gray-200 bg-gray-100 px-6 py-4 text-center text-sm text-black dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                  {t('footerCopyright')}
                </footer>
              </div>
            </main>
          </div>
        </div>
      </BrowserRouter>

      <OnboardingGuide open={showGuide} onClose={closeGuide} />
    </>
  );
}
