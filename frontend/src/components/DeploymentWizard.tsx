import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardConnector, ManagedComponent } from '../types';
import { useI18n } from '../i18n';
import {
  getDefaultComponentDraft,
  type ComponentDraft,
  type DeploymentDraft,
} from '../utils/deployment';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: DeploymentDraft) => Promise<void> | void;
  initialConnector?: DashboardConnector | null;
  initialComponents?: ManagedComponent[];
  prefilledBpn?: string;
}

const connectorVersions = ['0.12.1', '0.11.2'] as const;

function DeploymentProgress({ step }: { step: 'installing' | 'health' | 'ready' }) {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          Deploying components
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Deployment usually takes around 1–2 minutes.
        </p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-orange-500" />
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-slate-700">
        <ProgressRow done text="Deployment request accepted" />
        <ProgressRow
          done={step !== 'installing'}
          loading={step === 'installing'}
          text="Installing Helm release"
        />
        <ProgressRow
          done={step === 'ready'}
          loading={step === 'health'}
          text="Waiting for health check"
        />
        <ProgressRow done={step === 'ready'} text="Deployment complete" />
      </div>
    </div>
  );
}

function ProgressRow({
  done,
  loading,
  text,
}: {
  done?: boolean;
  loading?: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {done ? (
        <CheckCircle2 size={18} className="text-green-500" />
      ) : loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
      ) : (
        <div className="h-4 w-4 rounded-full border border-gray-300" />
      )}
      <span>{text}</span>
    </div>
  );
}

function toDraft(
  baseName: string,
  type: 'digitalTwinRegistry' | 'submodelServer',
  component?: ManagedComponent,
): ComponentDraft {
  const existing = component
    ? {
      enabled: true,
      name: component.name,
      version: component.version,
      url: component.endpoint || '',
      dbName: component.db_name,
      username: component.auth?.db_username || '',
      password: component.auth?.db_password || '',
    }
    : undefined;

  return getDefaultComponentDraft(baseName, type, existing);
}

function prepareDraftForInput(draft: ComponentDraft, hasExistingComponent: boolean): ComponentDraft {
  if (hasExistingComponent) {
    return draft;
  }

  return {
    ...draft,
    url: '',
  };
}

export default function DeploymentWizard({
  open,
  onOpenChange,
  onSubmit,
  initialConnector,
  initialComponents = [],
  prefilledBpn,
}: Props) {
  const { language, t } = useI18n();
  const [step, setStep] = useState(1);
  const [deploying, setDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState<'installing' | 'health' | 'ready'>('installing');

  const [name, setName] = useState('');

  const [bpn, setBpn] = useState('');

  const handleBpnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();


    if (/^[A-Z0-9]*$/.test(value) && value.length <= 16) {
      setBpn(value);
    }
  };
  const [version, setVersion] = useState<(typeof connectorVersions)[number]>(connectorVersions[0]);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [dataPlaneUrl, setDataPlaneUrl] = useState('');
  const [submodelDraft, setSubmodelDraft] = useState<ComponentDraft>(
    getDefaultComponentDraft('', 'submodelServer'),
  );
  const [dtrDraft, setDtrDraft] = useState<ComponentDraft>(
    getDefaultComponentDraft('', 'digitalTwinRegistry'),
  );

  // Confirmation state when user unchecks a component that was previously deployed.
  const [removeConfirm, setRemoveConfirm] = useState<{
    kind: 'submodelServer' | 'digitalTwinRegistry';
    label: string;
  } | null>(null);

  const initialSubmodel = useMemo(
    () => initialComponents.find((component) => component.type === 'submodelServer'),
    [initialComponents],
  );
  const initialDtr = useMemo(
    () => initialComponents.find((component) => component.type === 'digitalTwinRegistry'),
    [initialComponents],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const connectorName = initialConnector?.name || '';
    setName(connectorName);
    setBpn(initialConnector?.bpn || '');
    setVersion((initialConnector?.version as (typeof connectorVersions)[number]) || connectorVersions[0]);
    setApiEndpoint(initialConnector?.url || '');
    setDataPlaneUrl((initialConnector?.config as { dataPlaneUrl?: string } | undefined)?.dataPlaneUrl || initialConnector?.dp_hostname || '');
    setSubmodelDraft(
      prepareDraftForInput(
        toDraft(connectorName, 'submodelServer', initialSubmodel),
        Boolean(initialSubmodel),
      ),
    );
    setDtrDraft(
      prepareDraftForInput(
        toDraft(connectorName, 'digitalTwinRegistry', initialDtr),
        Boolean(initialDtr),
      ),
    );
    setStep(1);
    setRemoveConfirm(null);
  }, [initialConnector, initialDtr, initialSubmodel, open, prefilledBpn]);

  const resetState = () => {
    setStep(1);
    setName('');
    setBpn('');
    setVersion(connectorVersions[0]);
    setApiEndpoint('');
    setDataPlaneUrl('');
    setSubmodelDraft(getDefaultComponentDraft('', 'submodelServer'));
    setDtrDraft(getDefaultComponentDraft('', 'digitalTwinRegistry'));
    setRemoveConfirm(null);
  };

  /**
   * Handles toggling a component checkbox. If the component was part of the
   * initial deployed state and the user is trying to disable it, show a
   * confirmation dialog first.
   */
  const handleSubmodelToggle = (checked: boolean) => {
    if (!checked && initialSubmodel) {
      setRemoveConfirm({
        kind: 'submodelServer',
        label: language === 'de' ? 'Submodel Server' : 'Submodel Server',
      });
    } else {
      setSubmodelDraft({ ...submodelDraft, enabled: checked });
    }
  };

  const handleDtrToggle = (checked: boolean) => {
    if (!checked && initialDtr) {
      setRemoveConfirm({
        kind: 'digitalTwinRegistry',
        label: language === 'de' ? 'Digital Twin Registry' : 'Digital Twin Registry',
      });
    } else {
      setDtrDraft({ ...dtrDraft, enabled: checked });
    }
  };

  const confirmRemoveComponent = () => {
    if (removeConfirm?.kind === 'submodelServer') {
      setSubmodelDraft({ ...submodelDraft, enabled: false });
    } else if (removeConfirm?.kind === 'digitalTwinRegistry') {
      setDtrDraft({ ...dtrDraft, enabled: false });
    }
    setRemoveConfirm(null);
  };

  const closeDialog = () => {
    onOpenChange(false);
    resetState();
  };

  const canProceedStep1 =
    name.trim().length > 0 &&
    /^BPNL[A-Z0-9]{12}$/.test(bpn.trim().toUpperCase());

  const submodelNameConflict =
    submodelDraft.enabled &&
    submodelDraft.name.trim().length > 0 &&
    submodelDraft.name.trim() === name.trim();

  const dtrNameConflict =
    dtrDraft.enabled &&
    dtrDraft.name.trim().length > 0 &&
    (dtrDraft.name.trim() === name.trim() ||
      (submodelDraft.enabled && dtrDraft.name.trim() === submodelDraft.name.trim()));

  const canProceedStep2 =
    !submodelDraft.enabled ||
    (submodelDraft.name.trim().length > 0 &&
      submodelDraft.url.trim().length > 0 &&
      !submodelNameConflict);

  const canProceedStep3 =
    !dtrDraft.enabled ||
    (dtrDraft.name.trim().length > 0 &&
      dtrDraft.url.trim().length > 0 &&
      !dtrNameConflict);

  const canContinue =
    (step === 1 && canProceedStep1) ||
    (step === 2 && canProceedStep2) ||
    (step === 3 && canProceedStep3);

  const buildDraft = (): DeploymentDraft => ({
    connector: {
      name: name.trim(),
      version,
      url: apiEndpoint.trim(),
      bpn: bpn.trim(),
      dataPlaneUrl: dataPlaneUrl.trim(),
    },
    submodelServer: submodelDraft,
    digitalTwinRegistry: dtrDraft,
  });

  const handleDeploy = async () => {
    setDeploying(true);
    setDeploymentStep('installing');
    try {
      await Promise.resolve(onSubmit(buildDraft()));
      setDeploymentStep('health');
      setDeploymentStep('ready');
      closeDialog();
    } finally {
      setDeploying(false);
    }
  };

  if (!open) {
    return null;
  }

  const guidance =
    language === 'de'
      ? {
        connector: 'Erfassen Sie zuerst die Basisdaten des EDC. Danach können Sie optionale Komponenten hinzufügen oder überspringen.',
        submodel: 'Fügen Sie hier einen Submodel Server hinzu oder überspringen Sie diesen Schritt.',
        dtr: 'Fügen Sie hier eine Digital Twin Registry hinzu oder überspringen Sie diesen Schritt.',
      }
      : {
        connector: 'First capture the base EDC details. Then you can add optional components or skip them.',
        submodel: 'Add a submodel server here or skip this step.',
        dtr: 'Add a digital twin registry here or skip this step.',
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {initialConnector ? 'Edit EDC deployment' : t('deployConnector')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {step === 1
                ? t('connectorNameStep')
                : step === 2
                  ? (language === 'de' ? 'Submodel Server' : 'Submodel server')
                  : (language === 'de' ? 'Digital Twin Registry' : 'Digital Twin registry')}
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
            <DeploymentProgress step={deploymentStep} />
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
                    {guidance.connector}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        {t('connectorNameLabel')}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder={t('connectorNamePlaceholder')}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        BPNL
                      </label>

                      <input
                        type="text"
                        name="bpn-input"
                        autoComplete="new-password"
                        value={bpn}
                        onChange={handleBpnChange}
                        maxLength={16}
                        placeholder="BPNL000000000000"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 uppercase text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  {/* <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        {t('apiEndpointLabel')}
                      </label>
                      <input
                        type="url"
                        value={apiEndpoint}
                        onChange={(event) => setApiEndpoint(event.target.value)}
                        placeholder={t('apiEndpointPlaceholder')}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </div>
                  </div> */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {language === 'de' ? 'Version' : 'Version'}
                    </label>
                    <select
                      value={version}
                      onChange={(event) => setVersion(event.target.value as (typeof connectorVersions)[number])}
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
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                    {guidance.submodel}
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={submodelDraft.enabled}
                      onChange={(event) => handleSubmodelToggle(event.target.checked)}
                    />
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {language === 'de' ? 'Submodel Server hinzufügen' : 'Add submodel server'}
                    </span>
                  </label>
                  {submodelDraft.enabled && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {t("submodelNamePlaceholder")}
                        </label>
                        <input
                          type="text"
                          value={submodelDraft.name}
                          placeholder={t("submodelNamePlaceholder")}
                          onChange={(event) => {
                            const name = event.target.value.trim();

                            setSubmodelDraft({
                              ...submodelDraft,
                              name,
                              dbName: `${name}-db`,
                              username: `${name}-user`,
                              password: `${name}-password`,
                            });
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                        {submodelNameConflict && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {language === 'de'
                              ? 'Der Name muss sich vom EDC-Namen unterscheiden.'
                              : 'Name must be different from the EDC connector name.'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {language === 'de' ? 'Endpoint URL' : 'Endpoint URL'}
                        </label>
                        <input
                          type="url"
                          value={submodelDraft.url}
                          placeholder={t("submodelEndpointPlaceholder")}
                          onChange={(event) => setSubmodelDraft({ ...submodelDraft, url: event.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {language === 'de' ? 'Datenbankname' : 'Database name'}
                        </label>
                        <input
                          type="text"
                          value={submodelDraft.dbName}
                          placeholder={t("submodelDbPlaceholder")}
                          onChange={(event) => setSubmodelDraft({ ...submodelDraft, dbName: event.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {language === 'de' ? 'Version' : 'Version'}
                        </label>
                        <select
                          value={submodelDraft.version}
                          onChange={(event) =>
                            setSubmodelDraft({
                              ...submodelDraft,
                              version: event.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        >
                          <option value="0.1.0">0.1.0</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                    {guidance.dtr}
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={dtrDraft.enabled}
                      onChange={(event) => handleDtrToggle(event.target.checked)}
                    />
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {language === 'de' ? 'Digital Twin Registry hinzufügen' : 'Add digital twin registry'}
                    </span>
                  </label>
                  {dtrDraft.enabled && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {t("dtrNamePlaceholder")}
                        </label>
                        <input
                          type="text"
                          value={dtrDraft.name}
                          placeholder={t("dtrNamePlaceholder")}
                          onChange={(event) => {
                            const name = event.target.value.trim();

                            setDtrDraft({
                              ...dtrDraft,
                              name,
                              dbName: `${name}-db`,
                              username: `${name}-user`,
                              password: `${name}-password`,
                            });
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                        {dtrNameConflict && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {language === 'de'
                              ? 'Der Name muss sich vom EDC- und Submodel-Server-Namen unterscheiden.'
                              : 'Name must be different from the EDC connector and submodel server names.'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {language === 'de' ? 'Endpoint URL' : 'Endpoint URL'}
                        </label>
                        <input
                          type="url"
                          value={dtrDraft.url}
                          placeholder={t("dtrEndpointPlaceholder")}
                          onChange={(event) => setDtrDraft({ ...dtrDraft, url: event.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {language === 'de' ? 'Datenbankname' : 'Database name'}
                        </label>
                        <input
                          type="text"
                          value={dtrDraft.dbName}
                          placeholder={t("dtrDbPlaceholder")}
                          onChange={(event) => setDtrDraft({ ...dtrDraft, dbName: event.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {language === 'de' ? 'Version' : 'Version'}
                        </label>
                        <select
                          value={dtrDraft.version}
                          onChange={(event) =>
                            setDtrDraft({
                              ...dtrDraft,
                              version: event.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        >
                          <option value="0.12.0">0.12.0</option>
                          <option value="0.11.0">0.11.0</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {!deploying && (
          <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-800">
            <div className="mb-4 flex justify-center gap-2">
              {[1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={`h-2.5 w-2.5 rounded-full ${index === step ? 'bg-orange-500' : 'bg-gray-200 dark:bg-slate-700'}`}
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
              <button
                onClick={step < 3 ? () => setStep((current) => current + 1) : handleDeploy}
                disabled={!canContinue}
                className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              >
                {step < 3 ? t('continue') : t('deployNow')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove component confirmation dialog */}
      {removeConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="border-b border-gray-100 px-6 py-5 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-red-600">
                {language === 'de' ? 'Komponente entfernen?' : 'Remove component?'}
              </h3>
            </div>
            <div className="px-6 py-5 text-sm leading-6 text-gray-600 dark:text-slate-300">
              {language === 'de'
                ? `Möchten Sie ${removeConfirm.label} wirklich entfernen? Die bestehende Deployment-Konfiguration wird beim nächsten Update deaktiviert.`
                : `Do you want to remove the ${removeConfirm.label}? The existing deployment configuration will be disabled on the next update.`}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-800">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmRemoveComponent}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                {language === 'de' ? 'Ja, entfernen' : 'Yes, remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
