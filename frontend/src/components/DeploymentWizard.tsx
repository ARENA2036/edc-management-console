import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type {
  DashboardConnector, DeployComponent,
  DeployRequest,
} from '../types';
import { useI18n } from '../i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (connector: DashboardConnector) => Promise<void> | void;
  onDeployAndAddComponent?: (
    request: DeployRequest
  ) => Promise<void> | void;
  prefilledBpn?: string;
}

const connectorVersions = ['0.12.1', '0.11.2'] as const;

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
  // const [dbName, setDbName] = useState("");
  // const [dbUsername, setDbUsername] = useState("");
  // const [dbPassword, setDbPassword] = useState("");
  const [version, setVersion] =
    useState<(typeof connectorVersions)[number]>(connectorVersions[0]);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [dataPlaneUrl, setDataPlaneUrl] = useState('');
  const [deployDtr, setDeployDtr] = useState(false);
  const [deploySubmodel, setDeploySubmodel] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState<
    "installing" | "starting" | "health" | "ready"
  >("installing");

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
    setVersion(connectorVersions[0]);
    setApiEndpoint('');
    setDataPlaneUrl('');
    setDeployDtr(false);
    setDeploySubmodel(false);
    //   setDbName('');
    // setDbUsername('');
    // setDbPassword('');
  };

  const closeDialog = () => {
    onOpenChange(false);
    resetState();
  };

  const canContinue =
    (step === 1 && name.trim().length > 0 && /^BPNL[A-Z0-9]{12}$/.test(bpn.trim())) ||
    (step === 2 && apiEndpoint.trim().length > 0 && dataPlaneUrl.trim().length > 0);
  // dbName.trim().length > 0 &&
  // dbUsername.trim().length > 0 &&
  // dbPassword.trim().length > 0

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
    db_username: `${name.trim()}-username`,
    db_password: `${name.trim()}-password`,
    cp_hostname: apiEndpoint.trim(),
    dp_hostname: dataPlaneUrl.trim(),
    config: {
      connectorType: 'EDC Connector',
      endpoint: apiEndpoint.trim(),
      dataPlaneUrl: dataPlaneUrl.trim(),
      bpn: bpn.trim(),
      version,
      dbName: `${name.trim()}-db`,
    },
    source: 'local',
  });

  const handleDeploy = async () => {
    setDeploying(true);
    setDeploymentStep("installing");

    try {
      const connector = buildConnector();

      await onDeploy(connector);

      setDeploymentStep("health");

      // Later this will poll
      // await waitUntilHealthy(connector.name);

      setDeploymentStep("ready");

      closeDialog();
    } finally {
      setDeploying(false);
    }
  };

  const handleDeployAndAddComponent = async () => {
    if (!onDeployAndAddComponent) {
      return;
    }

    const connector = buildConnector();

    const components: DeployComponent[] = [
      {
        type: "connector",
        name: connector.name,
        version: connector.version!,
        url: connector.url,
        bpn: connector.bpn,
        db_name: `${connector.name}-db`,
        auth: {
          db_username: `${connector.name}-username`,
          db_password: `${connector.name}-password`,
        },
      },
    ];
    console.log("deployDtr =", deployDtr);
    console.log("deploySubmodel =", deploySubmodel);
    if (deployDtr) {
      components.push({
        type: "digitalTwinRegistry",
        name: `${connector.name}-dtr`,
        version: "0.12.0",
        url: `${connector.name}.txcd.arena2036-x.de`,
        db_name: `${connector.name}-dtr-db`,
        auth: {
          db_username: connector.db_username,
          db_password: connector.db_password,
        },
      });
    }

    if (deploySubmodel) {
      components.push({
        type: "submodelServer",
        name: `${connector.name}-sms`,
        version: "0.1.0",
        url: `${connector.name}.txcd.arena2036-x.de`,
        db_name: `${connector.name}-sb-db`,
        auth: {
          db_username: connector.db_username,
          db_password: connector.db_password,
        },
      });
    }

    const request: DeployRequest = {
      components,
    };
    console.log("components length =", components.length);
    console.log(components);
    console.log("POST /api/connector request payload:");
    console.log(JSON.stringify(request, null, 2));

    await onDeployAndAddComponent(request);

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
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {t('deployConnector')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {step === 1
                ? t('connectorNameStep')
                : language === 'de'
                  ? 'Endpoints & technische Optionen'
                  : 'Endpoints & technical options'}
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
          {deploying ? (
            <div className="space-y-6 py-6">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />

                <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
                  Deploying Connector
                </h3>

                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  Deployment usually takes around 1–2 minutes.
                </p>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-orange-500" />
              </div>

              <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-slate-700">

                <div className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span>Deployment request accepted</span>
                </div>

                <div className="flex items-center gap-3">
                  {deploymentStep === "installing" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
                  ) : (
                    <span className="text-green-500">✓</span>
                  )}
                  <span>Installing Helm release</span>
                </div>

                <div className="flex items-center gap-3">
                  {deploymentStep === "health" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
                  ) : deploymentStep === "ready" ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-gray-300">○</span>
                  )}

                  <span>Waiting for connector health check</span>
                </div>

                <div className="flex items-center gap-3">
                  {deploymentStep === "ready" ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-gray-300">○</span>
                  )}

                  <span>Connector is ready</span>
                </div>

              </div>
            </div>
          ) : (
            <>
              {step === 1 && (
                <>
                  <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
                    {t('connectorNameHelp')}
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{preparationNote.welcome}</p>
                    <p className="mt-2">{preparationNote.credentials}</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {t('connectorNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t('connectorNamePlaceholder')}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        BPNL
                      </label>
                      <input
                        type="text"
                        value={bpn}
                        onChange={(event) => setBpn(event.target.value.toUpperCase())}
                        placeholder="BPNL000000000000"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 uppercase text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        {language === 'de'
                          ? 'Verwenden Sie eine gueltige Business Partner Number im BPNL-Format.'
                          : 'Use a valid business partner number in BPNL format.'}
                      </p>
                      {prefilledBpn && (
                        <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                          {language === 'de'
                            ? 'Diese BPNL wurde automatisch aus Ihrem Login oder den Dataspace-Informationen übernommen. Sie können sie bei Bedarf anpassen.'
                            : 'This BPNL was detected automatically from your login or dataspace information. You can still adjust it if needed.'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        {language === 'de' ? 'Version' : 'Version'}
                      </label>
                      <select
                        value={version}
                        onChange={(event) =>
                          setVersion(event.target.value as (typeof connectorVersions)[number])
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
                  <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
                    {t('endpointHelp')}
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{preparationNote.example}</p>
                    <p className="mt-2">
                      {language === 'de'
                        ? 'Wenn Sie diese URLs nicht kennen, fragen Sie nach Ingress-, Gateway- oder Service-Adressen für Control Plane und Data Plane.'
                        : 'If you do not know these URLs yet, ask for the ingress, gateway or service addresses for the control plane and the data plane.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-medium">
                        Optional Components
                      </p>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={deployDtr}
                          onChange={(e) => setDeployDtr(e.target.checked)}
                        />
                        <span>Deploy Digital Twin Registry</span>
                      </label>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={deploySubmodel}
                          onChange={(e) => setDeploySubmodel(e.target.checked)}
                        />
                        <span>Deploy Submodel Server</span>
                      </label>
                    </div>
                    {language === 'de'
                      ? 'Sie deployen hier nur den EDC Connector. DTR oder Submodel Services können Sie danach gezielt als Komponente hinzufügen oder mit bestehenden Services verbinden.'
                      : 'You are deploying only the EDC connector here. DTR or Submodel Services can be added afterwards as components or connected as existing services.'}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        {t('apiEndpointLabel')}
                      </label>
                      <input
                        type="url"
                        value={apiEndpoint}
                        onChange={(event) => setApiEndpoint(event.target.value)}
                        placeholder={t('apiEndpointPlaceholder')}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        {t('dataPlaneLabel')}
                      </label>

                      <input
                        type="url"
                        value={dataPlaneUrl}
                        onChange={(event) => setDataPlaneUrl(event.target.value)}
                        placeholder={t('dataPlanePlaceholder')}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
        {!deploying && (
          <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-800">
            <div className="mb-4 flex justify-center gap-2">
              {[1, 2].map((index) => (
                <span
                  key={index}
                  className={`h-2.5 w-2.5 rounded-full ${index === step ? 'bg-orange-500' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={step === 1 ? closeDialog : () => setStep((current) => current - 1)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {step === 1 ? t('cancel') : t('back')}
              </button>
              <div className="flex items-center gap-3">
                {step === 2 && onDeployAndAddComponent && (
                  <button
                    onClick={handleDeployAndAddComponent}
                    disabled={!canContinue}
                    className="inline-flex rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100 dark:hover:bg-orange-500/20 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
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
                  className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                >
                  {step < 2 ? t('continue') : t('deployNow')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
