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
  const { language, t } = useI18n();
  const [appsOpen, setAppsOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(true);

  const primaryItems = [
    {
      icon: Home,
      label: t('dashboard'),
      path: '/',
      title: language === 'de' ? 'Dashboard öffnen' : 'Open dashboard',
      content:
        language === 'de'
          ? 'Hier sehen Nutzer Kennzahlen, Connectoren, Komponenten und den schnellsten Einstieg zum Hinzufügen neuer Elemente.'
          : 'This is the main workspace where users review status cards, connectors, components and the fastest path to create new items.',
      footer:
        language === 'de'
          ? 'Starten Sie hier, wenn Sie den nächsten sinnvollen Schritt im System suchen.'
          : 'Start here when you want the clearest overview of the system.',
    },
    {
      icon: Monitor,
      label: t('sidebarMonitor'),
      path: '/monitor',
      title: language === 'de' ? 'Monitoring anzeigen' : 'Open monitoring',
      content:
        language === 'de'
          ? 'Dieser Bereich ist für Zustände, Betriebsüberwachung und spätere Live-Sicht auf Integrationen gedacht.'
          : 'This area is intended for operational visibility, health checks and live system tracking.',
      footer:
        language === 'de'
          ? 'Hilfreich, wenn Sie nach dem Deployment Systemzustände prüfen möchten.'
          : 'Useful after deployment when you want to verify that integrations remain healthy.',
    },
  ];

  const appItems =
    language === 'de'
      ? [
          {
            icon: ExternalLink,
            label: 'SDE',
            path: '/sde',
            title: 'Simple Data Exchanger',
            content:
              'Öffnet die angebundene SDE-Anwendung. Nutzen Sie diesen Eintrag, wenn Sie nach der Einrichtung in den eigentlichen Datenaustausch wechseln möchten.',
            footer:
              'Falls nichts geöffnet wird, prüfen Sie zuerst die SDE-URL in den Datasource Settings.',
          },
          {
            icon: PanelsTopLeft,
            label: 'Portal',
            path: '/portal',
            title: 'Portal Einstieg',
            content:
              'Reservierter Einstiegspunkt für ein Portal oder eine fachliche Oberfläche rund um Ihren Dataspace.',
            footer:
              'Die Struktur ist bereits da und kann später mit einer echten Portal-Integration verbunden werden.',
          },
          {
            icon: SquareTerminal,
            label: 'Dataspace OS',
            path: '/dataspace-os',
            title: 'Dataspace OS',
            content:
              'Platzhalter für eine betriebsnahe oder plattformbezogene Anwendung im Dataspace-Kontext.',
            footer:
              'Nützlich, wenn Teams mehrere Werkzeuge aus derselben Navigation heraus erreichen sollen.',
          },
        ]
      : [
          {
            icon: ExternalLink,
            label: 'SDE',
            path: '/sde',
            title: 'Simple Data Exchanger',
            content:
              'Opens the connected SDE application when users want to continue from the console into an exchange workflow.',
            footer:
              'If this does not open, check the SDE URL in Datasource Settings first.',
          },
          {
            icon: PanelsTopLeft,
            label: 'Portal',
            path: '/portal',
            title: 'Portal entry',
            content:
              'Reserved navigation entry for a portal or broader business-facing application around the dataspace.',
            footer:
              'This can later point to a real portal without changing the navigation pattern.',
          },
          {
            icon: SquareTerminal,
            label: 'Dataspace OS',
            path: '/dataspace-os',
            title: 'Dataspace OS',
            content:
              'Placeholder entry for operations or platform-oriented workflows related to the dataspace environment.',
            footer:
              'Useful when teams need access to several companion applications from one console.',
          },
        ];

  const helpItems =
    language === 'de'
      ? [
          {
            icon: HelpCircle,
            label: t('reopenGuideButton'),
            action: onHelpClick,
            title: 'Guide erneut öffnen',
            content:
              'Öffnet den Einführungs-Guide erneut, damit Nutzer jederzeit Schritt-für-Schritt-Hilfe bekommen können.',
          },
          {
            icon: BookOpen,
            label: 'Documentation',
            href: 'https://github.com/ARENA2036/edc-management-console',
            title: 'Repository & Dokumentation',
            content:
              'Öffnet das Git-Repository der Anwendung mit README, Projektkontext und weiterführenden Informationen.',
          },
          {
            icon: Bug,
            label: 'Troubleshooting',
            href: 'https://github.com/ARENA2036/edc-management-console/issues',
            title: 'Fehlerbehebung',
            content:
              'Öffnet die Issues des Repositories, um bekannte Probleme und Lösungswege nachzuschlagen.',
          },
          {
            icon: HelpCircle,
            label: 'Contact Support',
            href: 'mailto:support@arena2036.de',
            title: 'Support kontaktieren',
            content:
              'Erstellt eine Support-Anfrage per E-Mail, wenn direkte Hilfe vom Team benötigt wird.',
          },
        ]
      : [
          {
            icon: HelpCircle,
            label: t('reopenGuideButton'),
            action: onHelpClick,
            title: 'Reopen the guide',
            content:
              'Opens the onboarding guide again so users can get step-by-step help whenever they need it.',
          },
          {
            icon: BookOpen,
            label: 'Documentation',
            href: 'https://github.com/ARENA2036/edc-management-console',
            title: 'Repository & documentation',
            content:
              'Opens the application repository with the README, project context and supporting information.',
          },
          {
            icon: Bug,
            label: 'Troubleshooting',
            href: 'https://github.com/ARENA2036/edc-management-console/issues',
            title: 'Troubleshooting',
            content:
              'Opens the repository issues page to review known problems and possible fixes.',
          },
          {
            icon: HelpCircle,
            label: 'Contact Support',
            href: 'mailto:support@arena2036.de',
            title: 'Contact support',
            content:
              'Starts an email support request when the user needs direct help from the responsible team.',
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
            title={language === 'de' ? 'Datasource Settings' : 'Datasource Settings'}
            content={
              language === 'de'
                ? 'Hier finden Sie synchronisierte Dataspace- und Plattforminformationen, die oft als Referenz für URLs, Umgebungen und Systemwerte dienen.'
                : 'This page shows synchronized dataspace and platform information that often serves as a reference for URLs, environments and system values.'
            }
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
                  {language === 'de' ? 'Nur anzeigen, nicht bearbeiten' : 'View only'}
                </span>
              </div>
            </Link>
          </Tooltip>
        </div>
      </div>
    </>
  );
}
