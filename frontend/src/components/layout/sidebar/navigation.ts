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

import {
  BookOpen,
  Bug,
  ExternalLink,
  HelpCircle,
  Home,
  Monitor,
  PanelsTopLeft,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react';

import { useExternalApps, type ExternalAppKey } from '../../../app/externalApps';
import { useI18n } from '../../../i18n';

const APP_ICONS: Record<ExternalAppKey, LucideIcon> = {
  sde: ExternalLink,
  portal: PanelsTopLeft,
  ich: SquareTerminal,
};

const DOCUMENTATION_URL = 'https://github.com/eclipse-tractusx/edc-management-console';
const ISSUES_URL = 'https://github.com/eclipse-tractusx/edc-management-console/issues';
const SUPPORT_MAIL = 'mailto:support@example.com';

export interface NavItem {
  key: string;
  icon: LucideIcon;
  label: string;
  tooltip: { title: string; content: string; footer?: string };
  to?: string;
  href?: string;
  onSelect?: () => void;
}

export interface SidebarNavigation {
  primary: NavItem[];
  apps: NavItem[];
  help: NavItem[];
}

export function useSidebarNavigation(onHelpClick?: () => void): SidebarNavigation {
  const { t } = useI18n();
  const externalApps = useExternalApps();

  return {
    primary: [
      {
        key: 'dashboard',
        icon: Home,
        label: t('dashboard'),
        to: '/',
        tooltip: {
          title: t('dashboardTooltipTitle'),
          content: t('dashboardTooltipContent'),
          footer: t('dashboardTooltipFooter'),
        },
      },
      {
        key: 'monitor',
        icon: Monitor,
        label: t('sidebarMonitor'),
        to: '/monitor',
        tooltip: {
          title: t('monitorTooltipTitle'),
          content: t('monitorTooltipContent'),
          footer: t('monitorTooltipFooter'),
        },
      },
    ],
    apps: externalApps.map((app) => ({
      key: app.key,
      icon: APP_ICONS[app.key],
      label: app.navLabel,
      to: app.path,
      tooltip: app.tooltip,
    })),
    help: [
      {
        key: 'guide',
        icon: HelpCircle,
        label: t('reopenGuideButton'),
        onSelect: onHelpClick,
        tooltip: { title: t('guideReopenTitle'), content: t('guideReopenContent') },
      },
      {
        key: 'documentation',
        icon: BookOpen,
        label: t('documentationLabel'),
        href: DOCUMENTATION_URL,
        tooltip: { title: t('documentationTitle'), content: t('documentationContent') },
      },
      {
        key: 'troubleshooting',
        icon: Bug,
        label: t('troubleshootingLabel'),
        href: ISSUES_URL,
        tooltip: { title: t('troubleshootingTitle'), content: t('troubleshootingContent') },
      },
      {
        key: 'support',
        icon: HelpCircle,
        label: t('contactSupportLabel'),
        href: SUPPORT_MAIL,
        tooltip: { title: t('contactSupportTitle'), content: t('contactSupportContent') },
      },
    ],
  };
}
