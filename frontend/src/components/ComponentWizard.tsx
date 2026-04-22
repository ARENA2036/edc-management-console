import { CheckCircle2, ChevronDown, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DashboardConnector, ManagedComponent } from '../types';
import { useI18n } from '../i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectors: DashboardConnector[];
  onDeploy: (component: ManagedComponent) => void;
  initialLinkedConnector?: string;
}

const componentTypes = [
  'Submodel Service',
  'Digital Twin Registry',

] as const;
function getConnectorType(connector: DashboardConnector) {
  const config = connector.config;
  if (config && typeof config.connectorType === 'string') {
    return config.connectorType;
  }

  return 'EDC Connector';
}

export default function ComponentWizard({
  open,
  onOpenChange,
  connectors,
  onDeploy,
  initialLinkedConnector,
}: Props) {
  const { language, t } = useI18n();
  const [step, setStep] = useState(1);
  const [componentType, setComponentType] =
    useState<(typeof componentTypes)[number]>('Submodel Service');
  const [name, setName] = useState('');
  const [linkedConnector, setLinkedConnector] = useState('');
  const [connectionMode, setConnectionMode] = useState<'new' | 'existing'>('new');
  const [existingEndpoint, setExistingEndpoint] = useState('');
  const [existingCredentials, setExistingCredentials] = useState('');

  const eligibleConnectors = connectors;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialLinkedConnector) {
      setLinkedConnector(initialLinkedConnector);
      return;
    }

    if (eligibleConnectors.length > 0 && !linkedConnector) {
      setLinkedConnector(eligibleConnectors[0].name);
    }
  }, [eligibleConnectors, initialLinkedConnector, linkedConnector, open]);

  const resetState = () => {
    setStep(1);
    setComponentType('Submodel Service');
    setName('');
    setLinkedConnector(initialLinkedConnector ?? eligibleConnectors[0]?.name ?? '');
    setConnectionMode('new');
    setExistingEndpoint('');
    setExistingCredentials('');
  };

  const closeDialog = () => {
    onOpenChange(false);
    resetState();
  };

  const canContinue =
    step === 1
      ? Boolean(componentType)
      : Boolean(
          name.trim() &&
            linkedConnector &&
            (connectionMode === 'new' || existingEndpoint.trim()),
        );

  const handleDeploy = () => {
    const component: ManagedComponent = {
      id: `comp-${Date.now()}`,
      name: name.trim(),
      type: componentType,
      version: '1.0.0',
      status: 'Active',
      linkedConnector,
      deployedAt: new Date().toISOString(),
      connectionMode,
      endpoint: connectionMode === 'existing' ? existingEndpoint.trim() : undefined,
      credentials:
        connectionMode === 'existing' ? existingCredentials.trim() : undefined,
    };

    onDeploy(component);
    closeDialog();
  };

  if (!open) {
    return null;
  }

  const componentGuidance =
    language === 'de'
      ? {
          choose:
            'Wählen Sie den Service-Typ nach seiner Aufgabe: Submodel Service für Asset-Daten oder Digital Twin Registry für Registrierungsfunktionen.',
          config:
            'Für die Verknüpfung benötigen Sie normalerweise den passenden Connector sowie den Namen oder die URL des Zielservices aus Ihrer Betriebs- oder Projekt-Dokumentation.',
          where:
            'Diese Informationen kommen häufig vom Service-Verantwortlichen, aus Helm-/Kubernetes-Werten, API-Dokumentation oder aus Ihrem Plattform-Wiki.',
          restriction:
            'Services werden erst nach dem EDC-Deployment verknüpft. Wählen Sie also zuerst einen bestehenden Connector als Basis aus.',
        }
      : {
          choose:
            'Choose the service type based on its job: Submodel Service for asset data or Digital Twin Registry for registration functions.',
          config:
            'For the setup you usually need an existing connector plus the name or service URL from your project or operations documentation.',
          where:
            'These values often come from the service owner, Helm or Kubernetes values, API documentation or your platform wiki.',
          restriction:
            'Services are linked only after the EDC deployment. Choose an existing connector first and then decide whether to deploy a new service or connect an existing one.',
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {t('addComponent')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {step === 1 ? t('componentTypeStep') : t('componentConfigStep')}
            </p>
          </div>
          <button
            onClick={closeDialog}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {step === 1 && (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                {t('componentHelp')}
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {componentGuidance.choose}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                {componentGuidance.restriction}
              </div>
              <div className="grid gap-3">
                {componentTypes.map((type) => {
                  const title =
                    type === 'Submodel Service'
                      ? t('componentTypeSubmodel')
                      : type === 'Digital Twin Registry'
                      ? t('componentTypeTwin')
                      : t('componentTypeCatalog');

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setComponentType(type)}
                      className={`rounded-xl border px-4 py-4 text-left transition-all ${
                        componentType === type
                          ? 'border-blue-400 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10'
                          : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                            componentType === type
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-gray-300 dark:border-slate-600'
                          }`}
                        >
                          {componentType === type && <CheckCircle2 size={12} />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{title}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{title}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {connectors.length === 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
                  {t('noConnectorsForComponents')}
                </div>
              )}
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                {t('componentHelp')}
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <p>{componentGuidance.config}</p>
                <p className="mt-2">{componentGuidance.where}</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('componentNameLabel')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('componentNamePlaceholder')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('linkedConnectorLabel')}
                </label>
                {initialLinkedConnector && (
                  <p className="mb-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                    {language === 'de'
                      ? `Diese Komponente wird standardmäßig mit "${initialLinkedConnector}" verknüpft. Sie können die Auswahl bei Bedarf anpassen.`
                      : `This component is pre-linked to "${initialLinkedConnector}" so you can continue faster. You can still change it if needed.`}
                  </p>
                )}
                <div className="relative">
                  <select
                    value={linkedConnector}
                    onChange={(event) => setLinkedConnector(event.target.value)}
                    disabled={eligibleConnectors.length === 0}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-gray-900 outline-none transition-colors focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
                  >
                    {eligibleConnectors.length === 0 ? (
                      <option>{t('linkedConnectorPlaceholder')}</option>
                    ) : (
                      eligibleConnectors.map((connector) => (
                        <option key={connector.id} value={connector.name}>
                          {connector.name} ({getConnectorType(connector)})
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {language === 'de' ? 'Service-Modus' : 'Service mode'}
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setConnectionMode('new')}
                    className={`rounded-xl border px-4 py-4 text-left transition-all ${
                      connectionMode === 'new'
                        ? 'border-blue-400 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {language === 'de' ? 'Neu deployen' : 'Deploy new'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                      {language === 'de'
                        ? 'Der Service wird als neue Komponente im Dashboard erfasst.'
                        : 'Register the service as a new component in the dashboard.'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectionMode('existing')}
                    className={`rounded-xl border px-4 py-4 text-left transition-all ${
                      connectionMode === 'existing'
                        ? 'border-blue-400 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-slate-100">
                      {language === 'de' ? 'Bestehenden Service verbinden' : 'Connect existing'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                      {language === 'de'
                        ? 'Nutzen Sie einen bereits laufenden DTR- oder Submodel-Service.'
                        : 'Use an already running DTR or submodel service.'}
                    </p>
                  </button>
                </div>
              </div>

              {connectionMode === 'existing' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {language === 'de' ? 'Bestehende Service-URL' : 'Existing service URL'}
                    </label>
                    <input
                      type="url"
                      value={existingEndpoint}
                      onChange={(event) => setExistingEndpoint(event.target.value)}
                      placeholder={
                        componentType === 'Digital Twin Registry'
                          ? 'https://registry.example.com'
                          : 'https://submodel.example.com'
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {language === 'de' ? 'Credentials / API Key' : 'Credentials / API Key'}
                    </label>
                    <input
                      type="text"
                      value={existingCredentials}
                      onChange={(event) => setExistingCredentials(event.target.value)}
                      placeholder={
                        language === 'de'
                          ? 'Optionaler Zugriffswert'
                          : 'Optional access value'
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-800">
          <div className="mb-4 flex justify-center gap-2">
            {[1, 2].map((index) => (
              <span
                key={index}
                className={`h-2.5 w-2.5 rounded-full ${
                  index === step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={step === 1 ? closeDialog : () => setStep(1)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {step === 1 ? t('cancel') : t('back')}
            </button>
            <button
              onClick={step === 1 ? () => setStep(2) : handleDeploy}
              disabled={!canContinue || eligibleConnectors.length === 0}
              className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
            >
              {step === 1 ? t('continue') : t('deployNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
