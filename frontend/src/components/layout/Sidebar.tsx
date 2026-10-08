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

import { ExternalLink, HelpCircle, Home, Settings, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { useI18n } from '../../i18n';
import Tooltip from '../ui/Tooltip';

import { useSidebarNavigation } from './sidebar/navigation';
import SidebarGroup from './sidebar/SidebarGroup';
import SidebarItem from './sidebar/SidebarItem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onHelpClick?: () => void;
}

/** Application navigation: primary routes, linked applications and help. */
export default function Sidebar({ isOpen, onClose, onHelpClick }: Props) {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const navigation = useSidebarNavigation(onHelpClick);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 transform flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950 md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-gray-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-white">
              <Home size={20} />
              <span className="font-medium">{t('dashboard')}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 md:hidden"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navigation.primary.map((item) => (
              <SidebarItem
                key={item.key}
                item={item}
                active={pathname === item.to}
                onNavigate={onClose}
              />
            ))}
          </div>

          <SidebarGroup icon={ExternalLink} label={t('sidebarApp')}>
            {navigation.apps.map((item) => (
              <SidebarItem
                key={item.key}
                item={item}
                nested
                active={pathname === item.to}
                onNavigate={onClose}
              />
            ))}
          </SidebarGroup>

          <SidebarGroup icon={HelpCircle} label={t('help')}>
            {navigation.help.map((item) => (
              <SidebarItem key={item.key} item={item} nested onNavigate={onClose} />
            ))}
          </SidebarGroup>
        </nav>

        <div className="border-t border-gray-200 p-4 dark:border-slate-800">
          <Tooltip
            title={t('settingsTooltipTitle')}
            content={t('settingsTooltipContent')}
            footer={t('settingsTooltipFooter')}
            position="right"
            fullWidth
          >
            <Link
              to="/settings"
              onClick={onClose}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 shadow-sm transition-all ${
                pathname === '/settings'
                  ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/60 dark:bg-orange-500/10 dark:text-orange-300'
                  : 'border-orange-100 bg-orange-50/70 text-orange-700 hover:bg-orange-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings size={20} />
              <div className="flex flex-col">
                <span className="font-medium">{t('datasourceSettings')}</span>
                <span className="text-xs text-orange-600/80 dark:text-slate-400">
                  {t('viewOnly')}
                </span>
              </div>
            </Link>
          </Tooltip>
        </div>
      </div>
    </>
  );
}
