import {
  BookOpen,
  Bug,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Home,
  Monitor,
  PanelsTopLeft,
  Settings,
  SquareTerminal,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import Tooltip from './Tooltip';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onHelpClick?: () => void;
}

export default function Sidebar({ isOpen, onClose, onHelpClick }: Props) {
  const location = useLocation();
  const { t } = useI18n();
  const [appsOpen, setAppsOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(true);

  const primaryItems = [
    {
      icon: Home,
      label: t('dashboard'),
      path: '/',
      title: t('dashboardTooltipTitle'),
      content: t('dashboardTooltipContent'),
      footer: t('dashboardTooltipFooter'),
    },
    {
      icon: Monitor,
      label: t('sidebarMonitor'),
      path: '/monitor',
      title: t('monitorTooltipTitle'),
      content: t('monitorTooltipContent'),
      footer: t('monitorTooltipFooter'),
    },
  ];

  const appItems = [
    {
      icon: ExternalLink,
      label: t('sdeNavLabel'),
      path: '/sde',
      title: t('sdeNavTitle'),
      content: t('sdeNavContent'),
      footer: t('sdeNavFooter'),
    },
    {
      icon: PanelsTopLeft,
      label: t('portalNavLabel'),
      path: '/portal',
      title: t('portalNavTitle'),
      content: t('portalNavContent'),
      footer: t('portalNavFooter'),
    },
    {
      icon: SquareTerminal,
      label: t('dataspaceOsNavLabel'),
      path: '/dataspace-os',
      title: t('dataspaceOsNavTitle'),
      content: t('dataspaceOsNavContent'),
      footer: t('dataspaceOsNavFooter'),
    },
  ];

  const helpItems = [
    {
      icon: HelpCircle,
      label: t('reopenGuideButton'),
      action: onHelpClick,
      title: t('guideReopenTitle'),
      content: t('guideReopenContent'),
    },
    {
      icon: BookOpen,
      label: t('documentationLabel'),
      href: 'https://github.com/eclipse-tractusx/edc-management-console',
      title: t('documentationTitle'),
      content: t('documentationContent'),
    },
    {
      icon: Bug,
      label: t('troubleshootingLabel'),
      href: 'https://github.com/eclipse-tractusx/edc-management-console/issues',
      title: t('troubleshootingTitle'),
      content: t('troubleshootingContent'),
    },
    {
      icon: HelpCircle,
      label: t('contactSupportLabel'),
      href: 'mailto:support@example.com',
      title: t('contactSupportTitle'),
      content: t('contactSupportContent'),
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-gray-200 bg-white
          dark:border-slate-800 dark:bg-slate-950
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="border-b border-gray-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-white">
              <Home size={20} />
              <span className="font-medium">{t('dashboard')}</span>
            </div>
            <button
              onClick={onClose}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 md:hidden"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Tooltip
                  key={item.path}
                  title={item.title}
                  content={item.content}
                  footer={item.footer}
                  position="right"
                  fullWidth
                >
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      isActive
                        ? 'bg-orange-50 font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-300'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </Tooltip>
              );
            })}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-slate-800">
            <button
              onClick={() => setAppsOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <span className="flex items-center gap-3">
                <ExternalLink size={20} />
                <span>{t('sidebarApp')}</span>
              </span>
              <ChevronRight
                size={16}
                className={`transition-transform ${appsOpen ? 'rotate-90' : ''}`}
              />
            </button>
            {appsOpen && (
              <div className="mt-1 space-y-1 pl-3">
                {appItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Tooltip
                      key={item.path}
                      title={item.title}
                      content={item.content}
                      footer={item.footer}
                      position="right"
                      fullWidth
                    >
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-orange-50 font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-300'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-slate-800">
            <button
              onClick={() => setHelpOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <span className="flex items-center gap-3">
                <HelpCircle size={20} />
                <span>{t('help')}</span>
              </span>
              <ChevronRight
                size={16}
                className={`transition-transform ${helpOpen ? 'rotate-90' : ''}`}
              />
            </button>
            {helpOpen && (
              <div className="mt-1 space-y-1 pl-3">
                {helpItems.map((item) => {
                  const Icon = item.icon;
                  if (item.action) {
                    return (
                      <Tooltip
                        key={item.label}
                        title={item.title}
                        content={item.content}
                        position="right"
                        fullWidth
                      >
                        <button
                          onClick={item.action}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </button>
                      </Tooltip>
                    );
                  }

                  return (
                    <Tooltip
                      key={item.label}
                      title={item.title}
                      content={item.content}
                      position="right"
                      fullWidth
                    >
                      <a
                        href={item.href}
                        target={item.href?.startsWith('http') ? '_blank' : undefined}
                        rel={item.href?.startsWith('http') ? 'noreferrer' : undefined}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </a>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
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
                location.pathname === '/settings'
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
