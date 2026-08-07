import { AlertTriangle, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import type { ApiError, ApiErrorStage } from '../api/errors';
import { useI18n } from '../i18n';

const STAGE_KEYS = {
  request: 'errorStageRequest',
  auth: 'errorStageAuth',
  config: 'errorStageConfig',
  database: 'errorStageDatabase',
  helm: 'errorStageHelm',
  cluster: 'errorStageCluster',
  upstream: 'errorStageUpstream',
  internal: 'errorStageInternal',
  network: 'errorStageNetwork',
  client: 'errorStageClient',
} as const satisfies Record<ApiErrorStage, string>;

const MESSAGE_KEYS: Record<string, string> = {
  BACKEND_UNREACHABLE: 'errorMsgBackendUnreachable',
  REQUEST_TIMEOUT: 'errorMsgRequestTimeout',
  NOT_AUTHORIZED: 'errorMsgNotAuthorized',
  CLUSTER_UNREACHABLE: 'errorMsgClusterUnreachable',
  DEPLOYMENT_TIMEOUT: 'errorMsgDeploymentTimeout',
  COMPONENT_LIMIT_REACHED: 'errorMsgComponentLimit',
  VERSION_UNSUPPORTED: 'errorMsgVersionUnsupported',
  DUPLICATE_COMPONENT_NAME: 'errorMsgDuplicateName',
};

type TranslateKey = Parameters<ReturnType<typeof useI18n>['t']>[0];

interface Props {
  error: ApiError;
  intro?: string;
  className?: string;
}

export default function ErrorDetails({ error, intro, className }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const messageKey = MESSAGE_KEYS[error.code];
  const message = messageKey ? t(messageKey as TranslateKey) : error.message;

  const rows: Array<[string, string]> = [
    [t('errorFieldCode'), error.code],
    [t('errorFieldStatus'), error.status === null ? t('errorNoResponse') : String(error.status)],
  ];
  if (error.endpoint) rows.push([t('errorFieldEndpoint'), error.endpoint]);
  if (error.errorId) rows.push([t('errorFieldErrorId'), error.errorId]);

  return (
    <div className={className}>
      {intro ? <p className="text-sm leading-6 text-gray-700 dark:text-slate-300">{intro}</p> : null}

      <p className="mt-1 text-sm font-medium leading-6 text-gray-900 dark:text-slate-100">
        {message}
      </p>

      <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
        <span className="font-semibold">{t('errorWhereLabel')}:</span>{' '}
        {t(STAGE_KEYS[error.stage] as TranslateKey)}
      </p>

      {error.hint ? (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {error.hint}
        </p>
      ) : null}

      <div className="mt-3 rounded-xl border border-gray-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t('errorTechnicalDetails')}
          <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>

        {expanded ? (
          <div className="border-t border-gray-200 px-3 py-3 dark:border-slate-700">
            <dl className="space-y-1 text-xs">
              {rows.map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-500 dark:text-slate-500">{label}</dt>
                  <dd className="break-all font-mono text-gray-800 dark:text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
            {error.detail ? (
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-gray-50 p-3 font-mono text-[11px] leading-5 text-gray-700 dark:bg-slate-950 dark:text-slate-300">
                {error.detail}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface BannerProps {
  error: ApiError | null;
  title: string;
  onDismiss?: () => void;
  tone?: 'error' | 'warning';
}

export function ErrorBanner({ error, title, onDismiss, tone = 'error' }: BannerProps) {
  const { t } = useI18n();
  if (!error) return null;

  const palette = tone === 'warning'
    ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
    : 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10';

  return (
    <div className={`mb-6 rounded-2xl border px-4 py-3 ${palette}`} role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={18}
          className={`mt-0.5 shrink-0 ${tone === 'warning' ? 'text-amber-600' : 'text-red-600'}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
          <ErrorDetails error={error} className="mt-1" />
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('errorDismiss')}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/60 hover:text-gray-600 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
