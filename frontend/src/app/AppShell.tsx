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
import { BrowserRouter } from 'react-router-dom';

import keycloak from '../auth/keycloak';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import OnboardingGuide from '../features/onboarding/OnboardingGuide';
import { useI18n } from '../i18n';

import { useExternalApps } from './externalApps';
import AppRoutes from './routes/AppRoutes';
import { useCurrentUser } from './useCurrentUser';
import { useOnboarding } from './useOnboarding';
import { useTheme } from './useTheme';

export default function AppShell() {
  const { t } = useI18n();
  const { identity, displayName } = useCurrentUser();
  const externalApps = useExternalApps();
  const { theme, toggleTheme } = useTheme();
  const { guideOpen, openGuide, closeGuide } = useOnboarding();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <BrowserRouter>
        <div className="flex h-[100dvh] overflow-hidden bg-gray-50 dark:bg-slate-950">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onHelpClick={openGuide}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header
              user={{ name: displayName, role: t('userAdministrator') }}
              onLogout={() => keycloak.logout()}
              onMenuToggle={() => setIsSidebarOpen((current) => !current)}
              onHelpClick={openGuide}
              theme={theme}
              onThemeToggle={toggleTheme}
            />
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
              <div className="flex min-h-full flex-col">
                <div className="flex-1">
                  <AppRoutes
                    identity={identity}
                    externalApps={externalApps}
                    onOpenGuide={openGuide}
                  />
                </div>
                <footer className="mt-8 border-t border-gray-200 bg-gray-100 px-6 py-4 text-center text-sm text-black dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                  {t('footerCopyright')}
                </footer>
              </div>
            </main>
          </div>
        </div>
      </BrowserRouter>

      <OnboardingGuide open={guideOpen} onClose={closeGuide} />
    </>
  );
}
