import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DashboardConnector } from '../types';
import { useI18n } from '../i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (connector: DashboardConnector) => Promise<void> | void;
  onDeployAndAddComponent?: (connector: DashboardConnector) => Promise<void> | void;
  prefilledBpn?: string;
}

const connectorVersions = ['0.9.0', '0.10.0', '0.10.2', '0.11.0'] as const;

export default function DeploymentWizard({
  open,
  onOpenChange,
  onDeploy,
  onDeployAndAddComponent,
  prefilledBpn,
}: Props) {
  const { language, t } = useI18n();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [bpn, setBpn] = useState('');
  const [version, setVersion] =
    useState<(typeof connectorVersions)[number]>('0.11.0');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [dataPlaneUrl, setDataPlaneUrl] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setBpn(prefilledBpn?.toUpperCase() ?? '');
  }, [open, prefilledBpn]);

  const resetState = () => {
    setStep(1);
    setName('');
    setBpn(prefilledBpn?.toUpperCase() ?? '');
    setVersion('0.11.0');
    setApiEndpoint('');
    setDataPlaneUrl('');
  };

  const closeDialog = () => {
    onOpenChange(false);
    resetState();
  };

  const canContinue =
    (step === 1 && name.trim().length > 0 && /^BPNL[A-Z0-9]{12}$/.test(bpn.trim())) ||
    (step === 2 && apiEndpoint.trim().length > 0 && dataPlaneUrl.trim().length > 0);

  const buildConnector = (): DashboardConnector => ({
      id: Date.now(),
      name: name.trim(),
      url: apiEndpoint.trim(),
      bpn: bpn.trim(),
      version,
      status: 'healthy',
      created_at: new Date().toISOString(),
      urls: [apiEndpoint.trim(), dataPlaneUrl.trim()],
      created_by: 'dashboard',
      db_username: '',
      db_password: '',
      cp_hostname: apiEndpoint.trim(),
      dp_hostname: dataPlaneUrl.trim(),
      config: {
        connectorType: 'EDC Connector',
        endpoint: apiEndpoint.trim(),
        dataPlaneUrl: dataPlaneUrl.trim(),
        bpn: bpn.trim(),
        version,
      },
      source: 'local',
    });

  const handleDeploy = async () => {
    const connector = buildConnector();
    await onDeploy(connector);
    closeDialog();
  };

  const handleDeployAndAddComponent = async () => {
    if (!onDeployAndAddComponent) {
      return;
    }

    const connector = buildConnector();
    await onDeployAndAddComponent(connector);
    closeDialog();
  };

  if (!open) {
    return null;
  }

  const preparationNote =
    language === 'de'
      ? {
          welcome:
            'Bevor Sie starten: Halten Sie idealerweise den gewünschten Connector-Namen, die BPNL und die technischen Endpoints bereit.',
          credentials:
            'Benötigte Informationen finden Sie oft bei Ihrem Plattform-Team, im Dataspace-Onboarding, in Kubernetes-/Ingress-Konfigurationen oder in bestehenden Betriebsdokumenten.',
          example:
            'Beispiel: Für einen EDC Connector benötigen Sie meist die öffentliche API-Adresse und die Data-Plane-Adresse, die Ihr Infrastruktur- oder DevOps-Team bereitstellt.',
        }
      : {
          welcome:
            'Before you start, it helps to have the connector name, BPNL and technical endpoints ready.',
          credentials:
            'Users usually get these values from the platform team, dataspace onboarding docs, Kubernetes or ingress configuration, or existing operations documentation.',
          example:
            'Example: for an EDC connector, you will usually need the public API endpoint and the data plane address maintained by your infrastructure or DevOps team.',
        };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {t('deployConnector')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {step === 1
                ? t('connectorNameStep')
                : language === 'de'
                ? 'Endpoints & technische Optionen'
                : 'Endpoints & technical options'}
            </p>
          </div>
          <button
            onClick={closeDialog}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {step === 1 && (
            <>
              <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900">
                {t('connectorNameHelp')}
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700">
                <p className="font-medium text-gray-900">{preparationNote.welcome}</p>
                <p className="mt-2">{preparationNote.credentials}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t('connectorNameLabel')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('connectorNamePlaceholder')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-colors focus:border-orange-400"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    BPNL
                  </label>
                  <input
                    type="text"
                    value={bpn}
                    onChange={(event) => setBpn(event.target.value.toUpperCase())}
                    placeholder="BPNL000000000000"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 uppercase outline-none transition-colors focus:border-orange-400"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {language === 'de'
                      ? 'Verwenden Sie eine gueltige Business Partner Number im BPNL-Format.'
                      : 'Use a valid business partner number in BPNL format.'}
                  </p>
                  {prefilledBpn && (
                    <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
                      {language === 'de'
                        ? 'Diese BPNL wurde automatisch aus Ihrem Login oder den Dataspace-Informationen übernommen. Sie können sie bei Bedarf anpassen.'
                        : 'This BPNL was detected automatically from your login or dataspace information. You can still adjust it if needed.'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {language === 'de' ? 'Version' : 'Version'}
                  </label>
                  <select
                    value={version}
                    onChange={(event) =>
                      setVersion(event.target.value as (typeof connectorVersions)[number])
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-colors focus:border-orange-400"
                  >
                    {connectorVersions.map((connectorVersion) => (
                      <option key={connectorVersion} value={connectorVersion}>
                        {connectorVersion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900">
                {t('endpointHelp')}
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700">
                <p className="font-medium text-gray-900">{preparationNote.example}</p>
                <p className="mt-2">
                  {language === 'de'
                  ? 'Wenn Sie diese URLs nicht kennen, fragen Sie nach Ingress-, Gateway- oder Service-Adressen für Control Plane und Data Plane.'
                    : 'If you do not know these URLs yet, ask for the ingress, gateway or service addresses for the control plane and the data plane.'}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900">
                {language === 'de'
                  ? 'Sie deployen hier nur den EDC Connector. DTR oder Submodel Services können Sie danach gezielt als Komponente hinzufügen oder mit bestehenden Services verbinden.'
                  : 'You are deploying only the EDC connector here. DTR or Submodel Services can be added afterwards as components or connected as existing services.'}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t('apiEndpointLabel')}
                  </label>
                  <input
                    type="url"
                    value={apiEndpoint}
                    onChange={(event) => setApiEndpoint(event.target.value)}
                    placeholder={t('apiEndpointPlaceholder')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-colors focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t('dataPlaneLabel')}
                  </label>
                  <input
                    type="url"
                    value={dataPlaneUrl}
                    onChange={(event) => setDataPlaneUrl(event.target.value)}
                    placeholder={t('dataPlanePlaceholder')}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-colors focus:border-orange-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <div className="mb-4 flex justify-center gap-2">
            {[1, 2].map((index) => (
              <span
                key={index}
                className={`h-2.5 w-2.5 rounded-full ${
                  index === step ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={step === 1 ? closeDialog : () => setStep((current) => current - 1)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              {step === 1 ? t('cancel') : t('back')}
            </button>
            <div className="flex items-center gap-3">
              {step === 2 && onDeployAndAddComponent && (
                <button
                  onClick={handleDeployAndAddComponent}
                  disabled={!canContinue}
                  className="inline-flex rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus size={16} />
                    {language === 'de'
                      ? 'Deployen & Komponente hinzufügen'
                      : 'Deploy & add component'}
                  </span>
                </button>
              )}
              <button
                onClick={step < 2 ? () => setStep((current) => current + 1) : handleDeploy}
                disabled={!canContinue}
                className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {step < 2 ? t('continue') : t('deployNow')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
