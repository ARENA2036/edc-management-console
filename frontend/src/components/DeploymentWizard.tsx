import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardConnector } from '../types';
import { useI18n } from '../i18n';
import { useLockBodyScroll } from '../useLockBodyScroll';
import {
  buildResourceNamePreview,
  buildGeneratedHostname,
  isValidResourceName,
  MAX_CONNECTORS,
  MAX_RESOURCE_NAME_LENGTH,
  MIN_RESOURCE_NAME_LENGTH,
  normalizeResourceName,
} from '../utils/nameRules';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (connector: DashboardConnector) => Promise<void> | void;
  connectorCount: number;
  deploying?: boolean;
  existingConnectorNames: string[];
  defaultVersion?: string;
  availableVersions?: string[];
  prefilledBpn?: string;
  defaultApiEndpoint?: string;
  defaultDataPlaneUrl?: string;
  controlPlaneHostSuffix?: string;
  dataPlaneHostSuffix?: string;
}

type DeploymentField = 'name';

function getHostnameSuffix(value?: string) {
  if (!value) {
    return '';
  }

  try {
    const host = new URL(value).hostname;
    const firstDashIndex = host.indexOf('-');
    return firstDashIndex >= 0 ? host.slice(firstDashIndex + 1) : host;
  } catch {
    return '';
  }
}

export default function DeploymentWizard({
  open,
  onOpenChange,
  onDeploy,
  connectorCount,
  deploying = false,
  existingConnectorNames,
  defaultVersion,
  availableVersions,
  prefilledBpn,
  defaultApiEndpoint,
  defaultDataPlaneUrl,
  controlPlaneHostSuffix,
  dataPlaneHostSuffix,
}: Props) {
  const { t } = useI18n();
  useLockBodyScroll(open);
  const [name, setName] = useState('');
  const [touched, setTouched] = useState<Partial<Record<DeploymentField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const versionOptions = useMemo(() => {
    const options = (availableVersions ?? [])
      .map((value) => value.trim())
      .filter(Boolean);
    const fallback = defaultVersion?.trim();
    if (fallback && !options.includes(fallback)) {
      return [fallback, ...options];
    }
    return options;
  }, [availableVersions, defaultVersion]);

  const resolvedDefaultVersion = defaultVersion?.trim() || versionOptions[0] || '';
  const [version, setVersion] = useState(resolvedDefaultVersion);

  useEffect(() => {
    if (!open) {
      return;
    }
    setVersion((current) =>
      current && versionOptions.includes(current) ? current : resolvedDefaultVersion,
    );
  }, [open, resolvedDefaultVersion, versionOptions]);

  const resetState = () => {
    setName('');
    setTouched({});
    setSubmitted(false);
    setVersion(resolvedDefaultVersion);
  };

  const closeDialog = () => {
    onOpenChange(false);
    resetState();
  };

  const normalizedConnectorName = useMemo(
    () => normalizeResourceName(name),
    [name],
  );
  const connectorNames = useMemo(
    () => new Set(existingConnectorNames.map((value) => normalizeResourceName(value))),
    [existingConnectorNames],
  );

  const stepErrors: Partial<Record<DeploymentField, string>> = {};
  if (!name.trim()) {
    stepErrors.name = t('validationRequired', {
      field: t('connectorNameLabel'),
    });
  } else if (!isValidResourceName(name)) {
    stepErrors.name = t('validationInvalidResourceName', {
      min: String(MIN_RESOURCE_NAME_LENGTH),
      max: String(MAX_RESOURCE_NAME_LENGTH),
    });
  } else if (connectorNames.has(normalizedConnectorName)) {
    stepErrors.name = t('validationDuplicateName');
  }

  const markTouched = (field: DeploymentField) => {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const showError = (field: DeploymentField) =>
    !deploying && Boolean(stepErrors[field]) && (touched[field] || submitted);

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-colors dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
      hasError
        ? 'border-red-400 focus:border-red-500 dark:border-red-500/70'
        : 'border-gray-200 focus:border-orange-400'
    }`;

  const resolvedBpn = useMemo(
    () => prefilledBpn?.toUpperCase().trim() ?? '',
    [prefilledBpn],
  );
  const resolvedApiEndpoint = useMemo(
    () => defaultApiEndpoint?.trim() ?? '',
    [defaultApiEndpoint],
  );
  const resolvedDataPlaneUrl = useMemo(
    () => defaultDataPlaneUrl?.trim() ?? '',
    [defaultDataPlaneUrl],
  );
  // Prefer the suffix the backend states outright; only fall back to splitting a
  // URL when it is absent. getHostnameSuffix assumes the host carries a leading
  // "<sample-name>-" segment, which is true of `default_url` but not of the
  // configured controlplane/dataplane hosts.
  const controlplaneHostnameSuffix = useMemo(
    () => controlPlaneHostSuffix?.trim() || getHostnameSuffix(defaultApiEndpoint),
    [controlPlaneHostSuffix, defaultApiEndpoint],
  );
  const dataplaneHostnameSuffix = useMemo(
    () => dataPlaneHostSuffix?.trim() || getHostnameSuffix(defaultDataPlaneUrl),
    [dataPlaneHostSuffix, defaultDataPlaneUrl],
  );
  const generatedHostname = useMemo(
    () =>
      buildGeneratedHostname(normalizedConnectorName, controlplaneHostnameSuffix)
      || buildResourceNamePreview(name),
    [controlplaneHostnameSuffix, name, normalizedConnectorName],
  );
  const generatedDataplaneHostname = useMemo(
    () => buildGeneratedHostname(normalizedConnectorName, dataplaneHostnameSuffix),
    [dataplaneHostnameSuffix, normalizedConnectorName],
  );
  const connectorLimitReached = connectorCount >= MAX_CONNECTORS;

  // The deployed connector lives at its own per-name host ("{name}-{suffix}"), which
  // is what the backend's cp_hostname/dp_hostname derive templates put on the Ingress.
  // Fall back to the shared dataspace endpoint only if no suffix is configured.
  const connectorApiUrl = generatedHostname
    ? `https://${generatedHostname}`
    : resolvedApiEndpoint;
  const connectorDataPlaneUrl = generatedDataplaneHostname
    ? `https://${generatedDataplaneHostname}`
    : resolvedDataPlaneUrl;

  const buildConnector = (): DashboardConnector => ({
    id: Date.now(),
    name: normalizedConnectorName,
    url: connectorApiUrl,
    bpn: resolvedBpn,
    version: version.trim() || undefined,
    status: 'healthy',
    created_at: new Date().toISOString(),
    urls: [
      connectorApiUrl,
      connectorDataPlaneUrl,
    ].filter(Boolean),
    created_by: 'dashboard',
    db_username: '',
    db_password: '',
    cp_hostname: generatedHostname,
    dp_hostname: generatedDataplaneHostname,
    config: {
      connectorType: t('connectorTypeDefault'),
      endpoint: connectorApiUrl,
      hostname: generatedHostname,
      dataPlaneUrl: connectorDataPlaneUrl,
      bpn: resolvedBpn,
      version: version.trim(),
    },
    source: 'local',
  });

  const deployConnector = async () => {
    setSubmitted(true);
    if (deploying || connectorLimitReached || Object.keys(stepErrors).length > 0) {
      return;
    }

    const connector = buildConnector();
    await onDeploy(connector);
    closeDialog();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/50 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
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

          <div className="space-y-6 overflow-y-auto overscroll-contain px-6 py-6">
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100">
              {t('connectorNameHelp')}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-medium text-gray-900 dark:text-slate-100">{t('deploymentPreparationWelcome')}</p>
              <p className="mt-2">{t('deploymentPreparationCredentials')}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
              <p className="font-medium">{t('deploymentAutoConfigTitle')}</p>
              <p className="mt-2">{t('deploymentAutoConfigDescription')}</p>
            </div>
            {connectorLimitReached && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {t('connectorLimitReached', { max: String(MAX_CONNECTORS) })}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('connectorNameLabel')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value.trimStart());
                  markTouched('name');
                }}
                onBlur={() => markTouched('name')}
                placeholder={t('connectorNamePlaceholder')}
                maxLength={MAX_RESOURCE_NAME_LENGTH}
                disabled={deploying}
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
              <label
                htmlFor="connector-version"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                {t('versionLabel')}
              </label>
              <select
                id="connector-version"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                disabled={deploying || versionOptions.length === 0}
                className={`${inputClass(false)} disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-800`}
              >
                {versionOptions.length === 0 ? (
                  <option value="">{t('versionUnavailable')}</option>
                ) : (
                  versionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === resolvedDefaultVersion
                        ? t('versionOptionRecommended', { version: option })
                        : option}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                {versionOptions.length === 0 ? t('versionUnavailableHelp') : t('versionHelp')}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                {t('hostnameLabel')}
              </label>
              <input
                type="text"
                value={generatedHostname}
                readOnly
                placeholder={t('hostnamePlaceholder')}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                {t('hostnameHelp')}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <button
                onClick={closeDialog}
                disabled={deploying}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => void deployConnector()}
                disabled={deploying || connectorLimitReached}
                className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              >
                {deploying ? t('deploymentStatusDeployingTitle') : t('deployNow')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
