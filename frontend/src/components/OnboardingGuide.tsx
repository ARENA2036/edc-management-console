import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  MonitorSmartphone,
  SquareDashedBottomCode,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StepDefinition {
  title: string;
  subtitle: string;
  content: 'welcome' | 'overview' | 'getting-started' | 'support';
}

export default function OnboardingGuide({ open, onClose }: Props) {
  const { language, t } = useI18n();
  const [step, setStep] = useState(0);

  const steps = useMemo<StepDefinition[]>(
    () =>
      language === 'de'
        ? [
            {
              title: 'Willkommen in der EDC Management Console!',
              subtitle:
                'Verwalten Sie Ihre EDC Connectoren und überwachen Sie Ihre Datenflüsse in Echtzeit.',
              content: 'welcome',
            },
            {
              title: 'Dashboard Überblick',
              subtitle: 'Verstehen Sie die wichtigsten Bereiche Ihres Dashboards.',
              content: 'overview',
            },
            {
              title: 'Erste Schritte',
              subtitle: 'So stellen Sie Ihren ersten EDC Connector bereit.',
              content: 'getting-started',
            },
            {
              title: 'Hilfe & Support',
              subtitle: 'Wir sind hier, wenn Sie Unterstützung brauchen.',
              content: 'support',
            },
          ]
        : [
            {
              title: 'Welcome to the EDC Management Console!',
              subtitle:
                'Manage your EDC connectors and monitor your data flows in real-time.',
              content: 'welcome',
            },
            {
              title: 'Dashboard Overview',
              subtitle: 'Understand the main areas of your dashboard.',
              content: 'overview',
            },
            {
              title: 'Getting Started',
              subtitle: 'How to deploy your first EDC connector.',
              content: 'getting-started',
            },
            {
              title: 'Help & Support',
              subtitle: 'We are here to help you.',
              content: 'support',
            },
          ],
    [language],
  );

  if (!open) {
    return null;
  }

  const currentStep = steps[step];

  const closeGuide = () => {
    setStep(0);
    onClose();
  };

  const nextStep = () => {
    if (step === steps.length - 1) {
      closeGuide();
      return;
    }
    setStep((current) => current + 1);
  };

  const previousStep = () => {
    setStep((current) => Math.max(0, current - 1));
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
          <div className="pr-4">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-slate-100 sm:text-4xl">
              {currentStep.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-500 dark:text-slate-400 sm:text-[1.15rem]">
              {currentStep.subtitle}
            </p>
          </div>
          <button
            onClick={closeGuide}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('close')}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
          {currentStep.content === 'welcome' && (
            <div className="space-y-8">
              <p className="text-lg leading-8 text-gray-600 dark:text-slate-300">
                {language === 'de'
                  ? 'Dieser Guide führt Sie durch die wichtigsten Funktionen der Konsole und zeigt Ihnen, wie Sie schnell loslegen können.'
                  : 'This guide will walk you through the main features of the console and show you how to get started.'}
              </p>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-5 dark:border-blue-500/30 dark:bg-blue-500/10">
                <h3 className="text-2xl font-semibold text-blue-900">
                  {language === 'de' ? 'Was Sie hier tun können:' : 'What you can do here:'}
                </h3>
                <ul className="mt-4 space-y-4 text-lg leading-8 text-blue-800 dark:text-blue-100">
                  {(
                    language === 'de'
                      ? [
                          'EDC Connectoren erstellen, verwalten und überwachen',
                          'System-Status und Connector-Status in Echtzeit verfolgen',
                          'Synchronisierung und API-Aktivitäten im Blick behalten',
                          'Berichte und Informationen mit Ihrem Team teilen',
                        ]
                      : [
                          'Create, manage and monitor EDC connectors',
                          'Track system health and connector status in real-time',
                          'Monitor synchronization and API activities',
                          'Export reports and share updates with your team',
                        ]
                  ).map((item) => (
                    <li key={item} className="flex gap-3">
                      <Check size={20} className="mt-1 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {currentStep.content === 'overview' && (
            <div className="space-y-5">
              {[
                {
                  color: 'bg-blue-500',
                  title:
                    language === 'de' ? 'Statuskarten (oben)' : 'Status Cards (Top)',
                  body:
                    language === 'de'
                      ? 'Zeigt die wichtigsten Kennzahlen wie Data Space, System-Status, Aktivität und Connector-Anzahl mit aktuellen Updates.'
                      : 'Shows key metrics like data space, system health, activity status and connector count with real-time updates.',
                },
                {
                  color: 'bg-green-500',
                  title:
                    language === 'de'
                      ? 'Connector-Tabelle (Mitte)'
                      : 'Connectors Table (Center)',
                  body:
                    language === 'de'
                      ? 'Übersicht aller EDC Connectoren mit Status, Version, Endpoint und direkten Aktionen.'
                      : 'Overview of all EDC connectors with status, version, endpoint and quick actions.',
                },
                {
                  color: 'bg-purple-500',
                  title: language === 'de' ? 'Navigation (links)' : 'Navigation (Left)',
                  body:
                    language === 'de'
                      ? 'Schneller Zugriff auf Dashboard, Monitor, App und Datasource Settings.'
                      : 'Quick access to Dashboard, Monitor, App and Datasource Settings.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className={`mt-1 h-24 w-1 rounded-full ${item.color}`} />
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-lg leading-8 text-gray-600 dark:text-slate-300">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentStep.content === 'getting-started' && (
            <div className="space-y-6">
              {[
                {
                  number: '1',
                  title:
                    language === 'de' ? 'EDC Connector hinzufügen' : 'Add EDC Connector',
                  body:
                    language === 'de'
                      ? 'Klicken Sie auf die orangefarbene Schaltfläche "Add+", um einen neuen Connector anzulegen.'
                      : 'Click the orange "Add+" button to create a new connector.',
                },
                {
                  number: '2',
                  title:
                    language === 'de'
                      ? 'Deployment Wizard ausfüllen'
                      : 'Complete Deployment Wizard',
                  body:
                    language === 'de'
                      ? 'Folgen Sie dem geführten Wizard, um Typ und Endpoints Ihres Connectors zu konfigurieren.'
                      : 'Follow the step-by-step wizard to configure your connector with clear descriptions for each step.',
                },
                {
                  number: '3',
                  title: language === 'de' ? 'Status überwachen' : 'Monitor Status',
                  body:
                    language === 'de'
                      ? 'Verfolgen Sie den Connector-Status in der Tabelle und reagieren Sie schnell auf Änderungen.'
                      : 'Track your connector status in the table and receive notifications for any issues.',
                },
              ].map((item) => (
                <div key={item.number} className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-semibold text-white shadow-sm">
                    {item.number}
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{item.title}</h3>
                    <p className="mt-1 text-lg leading-8 text-gray-600 dark:text-slate-300">{item.body}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-lg leading-8 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <span className="font-semibold">
                  {language === 'de' ? 'Tipp:' : 'Tip:'}
                </span>{' '}
                {language === 'de'
                  ? 'Fahren Sie mit der Maus über Buttons und Icons, um zusätzliche Hinweise per Tooltip zu sehen.'
                  : 'Hover over buttons and icons to see tooltips with additional information.'}
              </div>
            </div>
          )}

          {currentStep.content === 'support' && (
            <div className="space-y-5">
              <p className="text-lg leading-8 text-gray-600">
                {language === 'de'
                  ? 'Wenn Sie Fragen bei der Nutzung der Konsole haben:'
                  : 'If you have questions while using the console:'}
              </p>
              {[
                {
                  icon: <CircleHelp size={18} />,
                  title: language === 'de' ? 'Inline-Hilfe nutzen' : 'Use Inline Help',
                  body:
                    language === 'de'
                      ? 'Tooltips und kontextbezogene Hinweise sind in der gesamten Anwendung verfügbar. Fahren Sie über Elemente, um mehr zu erfahren.'
                      : 'Tooltips and contextual help are available throughout the application. Hover over elements to learn more.',
                },
                {
                  icon: <SquareDashedBottomCode size={18} />,
                  title:
                    language === 'de'
                      ? 'Auf Bestätigungen achten'
                      : 'Pay Attention to Confirmations',
                  body:
                    language === 'de'
                      ? 'Wichtige Aktionen erfordern eine Bestätigung, damit Sie immer wissen, was vor Änderungen passiert.'
                      : 'Important actions require confirmation, so you always know what will happen before changes are made.',
                },
                {
                  icon: <MonitorSmartphone size={18} />,
                  title:
                    language === 'de'
                      ? 'Flexibel auf allen Geräten'
                      : 'Works Across Screen Sizes',
                  body:
                    language === 'de'
                      ? 'Die Oberfläche ist für Desktop, Zoomstufen und mobile Ansichten ausgelegt, damit Ihr Workflow stabil bleibt.'
                      : 'The interface is designed for desktop, zoom levels and mobile layouts so your workflow stays stable.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-gray-50 px-5 py-5 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                    <span className="text-orange-500">{item.icon}</span>
                    {item.title}
                  </div>
                  <p className="mt-3 text-lg leading-8 text-gray-600">{item.body}</p>
                </div>
              ))}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-center">
                <h3 className="text-2xl font-semibold text-emerald-800">
                  {language === 'de' ? 'Bereit loszulegen?' : 'Ready to get started?'}
                </h3>
                <p className="mt-2 text-lg leading-8 text-emerald-700">
                  {language === 'de'
                    ? 'Sie können diesen Guide jederzeit erneut über das Hilfesymbol oder die Einstellungen öffnen.'
                    : 'You can reopen this guide anytime through the help button or from settings.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4 sm:px-7">
          <div className="mb-4 flex justify-center gap-2">
            {steps.map((stepItem, index) => (
              <span
                key={stepItem.title}
                className={`h-2.5 rounded-full transition-all ${
                  index === step ? 'w-10 bg-orange-500' : 'w-2.5 bg-orange-200'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="order-2 flex items-center gap-3 sm:order-1">
              {step > 0 ? (
                <button
                  onClick={previousStep}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <ArrowLeft size={18} />
                  {t('back')}
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="order-3 text-center text-base font-medium text-gray-400 sm:order-2">
              {language === 'de'
                ? `Schritt ${step + 1} von ${steps.length}`
                : `Step ${step + 1} of ${steps.length}`}
            </div>

            <div className="order-1 flex items-center justify-between gap-3 sm:order-3 sm:justify-end">
              <button
                onClick={closeGuide}
                className="px-2 py-2 text-base font-semibold text-gray-700 transition-colors hover:text-gray-900"
              >
                {t('skip')}
              </button>
              <button
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-orange-600"
              >
                {step === steps.length - 1 ? t('done') : t('next')}
                {step !== steps.length - 1 && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
