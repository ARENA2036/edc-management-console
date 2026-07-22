import { Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DashboardConnector } from '../types';
import { useI18n } from '../i18n';
import { getRuntimeConfigValue } from '../runtime-config';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (connector: DashboardConnector) => Promise<void> | void;
  onDeployAndAddComponent?: (connector: DashboardConnector) => Promise<void> | void;
  prefilledBpn?: string;
  defaultApiEndpoint?: string;
}

const connectorVersions = ['0.9.0', '0.10.0', '0.10.2', '0.11.0'] as const;

type DeploymentField = 'name';

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function DeploymentWizard({
  open,
  onOpenChange,
  onDeploy,
  onDeployAndAddComponent,
  prefilledBpn,
  defaultApiEndpoint,
}: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [version, setVersion] =
    useState<(typeof connectorVersions)[number]>('0.11.0');
  const [touched, setTouched] = useState<Partial<Record<DeploymentField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const normalizeConnectorName = (value: string) =>
    value.toLowerCase().trimStart();

  const resetState = () => {
    setName('');
    setVersion('0.11.0');
    setTouched({});
    setSubmitted(false);
  };

  const closeDialog = () => {
    onOpenChange(false);
    resetState();
  };

  const stepErrors: Partial<Record<DeploymentField, string>> = {};
  if (!name.trim()) {
    stepErrors.name = t('validationRequired', {
      field: t('connectorNameLabel'),
    });
  }

  const markTouched = (field: DeploymentField) => {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const showError = (field: DeploymentField) =>
    Boolean(stepErrors[field]) && (touched[field] || submitted);

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-colors dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
      hasError
        ? 'border-red-400 focus:border-red-500 dark:border-red-500/70'
        : 'border-gray-200 focus:border-orange-400'
    }`;

  const buildAutoEndpoint = (
    connectorName: string,
    plane: 'controlplane' | 'dataplane',
  ) => {
    const normalizedName = normalizeConnectorName(connectorName).trim();
    if (!normalizedName) {
      return '';
    }

    const runtimeHost = getRuntimeConfigValue(
      import.meta.env.VITE_EDC_HOST,
      window.__RUNTIME_CONFIG__?.edcHost,
      '',
    );

    if (isValidHttpUrl(defaultApiEndpoint ?? '')) {
      try {
        const templateUrl = new URL(defaultApiEndpoint as string);
        const hostSegments = templateUrl.hostname.split('.');
        hostSegments[0] = `${normalizedName}-${plane}`;
        templateUrl.hostname = hostSegments.join('.');
        templateUrl.pathname = '';
        templateUrl.search = '';
        templateUrl.hash = '';
        return templateUrl.toString();
      } catch {
        // Fall through to runtime host fallback.
      }
    }

    if (runtimeHost) {
      return `https://${normalizedName}-${plane}.${runtimeHost}`;
    }

    return `https://${normalizedName}-${plane}.example.com`;
  };

  const resolvedBpn = useMemo(
    () => prefilledBpn?.toUpperCase().trim() ?? '',
    [prefilledBpn],
  );
  const resolvedApiEndpoint = useMemo(
    () => buildAutoEndpoint(name, 'controlplane'),
    [defaultApiEndpoint, name],
  );
  const resolvedDataPlaneUrl = useMemo(
    () => buildAutoEndpoint(name, 'dataplane'),
    [defaultApiEndpoint, name],
  );

  const buildConnector = (): DashboardConnector => ({
    id: Date.now(),
    name: normalizeConnectorName(name).trim(),
    url: resolvedApiEndpoint,
    bpn: resolvedBpn,
    version,
    status: 'healthy',
    created_at: new Date().toISOString(),
    urls: [resolvedApiEndpoint, resolvedDataPlaneUrl].filter(Boolean),
    created_by: 'dashboard',
    db_username: '',
    db_password: '',
    cp_hostname: resolvedApiEndpoint,
    dp_hostname: resolvedDataPlaneUrl,
    config: {
      connectorType: t('connectorTypeDefault'),
      endpoint: resolvedApiEndpoint,
      dataPlaneUrl: resolvedDataPlaneUrl,
      bpn: resolvedBpn,
      version,
    },
    source: 'local',
  });

  const deployConnector = async (
    callback: (connector: DashboardConnector) => Promise<void> | void,
  ) => {
    setSubmitted(true);
    if (Object.keys(stepErrors).length > 0) {
      return;
    }

    const connector = buildConnector();
    await callback(connector);
    closeDialog();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {t('deployConnector')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {t('connectorNameStep')}
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
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
            {t('connectorNameHelp')}
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <p className="font-medium text-gray-900 dark:text-slate-100">{t('deploymentPreparationWelcome')}</p>
            <p className="mt-2">{t('deploymentPreparationCredentials')}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
            <p className="font-medium">{t('deploymentAutoConfigTitle')}</p>
            <p className="mt-2">{t('deploymentAutoConfigDescription')}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('connectorNameLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(normalizeConnectorName(event.target.value))}
              onBlur={() => markTouched('name')}
              placeholder={t('connectorNamePlaceholder')}
              aria-invalid={showError('name')}
              className={inputClass(showError('name'))}
            />
            {showError('name') && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                {stepErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('versionLabel')}
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {t('bpnLabel')}
              </p>
              <p className="mt-2 text-sm text-gray-900 dark:text-slate-100">
                {resolvedBpn || t('noValue')}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {t('apiEndpointLabel')}
              </p>
              <p className="mt-2 break-all text-sm text-gray-900 dark:text-slate-100">
                {resolvedApiEndpoint || t('noValue')}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {t('dataPlaneLabel')}
              </p>
              <p className="mt-2 break-all text-sm text-gray-900 dark:text-slate-100">
                {resolvedDataPlaneUrl || t('noValue')}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <button
              onClick={closeDialog}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('cancel')}
            </button>
            <div className="flex items-center gap-3">
              {onDeployAndAddComponent && (
                <button
                  onClick={() => void deployConnector(onDeployAndAddComponent)}
                  className="inline-flex rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100 dark:hover:bg-orange-500/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus size={16} />
                    {t('deployAndAddComponent')}
                  </span>
                </button>
              )}
              <button
                onClick={() => void deployConnector(onDeploy)}
                className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                {t('deployNow')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
