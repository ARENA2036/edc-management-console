import { AlertTriangle, CheckCircle2, LoaderCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '../i18n';
import { useLockBodyScroll } from '../useLockBodyScroll';

type DeploymentStatus = 'deploying' | 'success' | 'error';
type DeploymentResource = 'connector' | 'component';

interface Props {
  open: boolean;
  status: DeploymentStatus;
  resource: DeploymentResource;
  itemCount?: number;
  onClose: () => void;
}

export default function DeploymentStatusModal({
  open,
  status,
  resource,
  itemCount = 1,
  onClose,
}: Props) {
  const { t } = useI18n();
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open || status !== 'success') {
      return;
    }

    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [onClose, open, status]);

  if (!open) {
    return null;
  }

  const resourceLabel =
    resource === 'connector'
      ? t('deploymentStatusConnectorLabel', { count: String(itemCount) })
      : t('deploymentStatusComponentLabel', { count: String(itemCount) });

  const title =
    status === 'deploying'
      ? t('deploymentStatusDeployingTitle')
      : status === 'success'
      ? t('deploymentStatusSuccessTitle')
      : t('deploymentStatusErrorTitle');

  const body =
    status === 'deploying'
      ? resource === 'connector'
        ? t('deploymentStatusDeployingConnectorMessage', { count: String(itemCount) })
        : t('deploymentStatusDeployingComponentMessage', { count: String(itemCount) })
      : status === 'success'
      ? resource === 'connector'
        ? t('deploymentStatusSuccessConnectorMessage', { count: String(itemCount) })
        : t('deploymentStatusSuccessComponentMessage', { count: String(itemCount) })
      : resource === 'connector'
      ? t('deploymentStatusErrorConnectorMessage')
      : t('deploymentStatusErrorComponentMessage');

  const Icon =
    status === 'deploying'
      ? LoaderCircle
      : status === 'success'
      ? CheckCircle2
      : AlertTriangle;

  const iconClass =
    status === 'deploying'
      ? 'text-blue-500'
      : status === 'success'
      ? 'text-emerald-500'
      : 'text-red-500';

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-2xl bg-gray-50 p-3 dark:bg-slate-800 ${iconClass}`}>
                <Icon
                  size={24}
                  className={status === 'deploying' ? 'animate-spin' : undefined}
                />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {resourceLabel}
                </p>
              </div>
            </div>
            {status !== 'deploying' && (
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={t('close')}
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-7 text-gray-700 dark:text-slate-300">
              {body}
            </p>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
              {t('deploymentStatusDashboardHint')}
            </div>
          </div>

          {status !== 'deploying' && (
            <div className="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-slate-800">
              <button
                onClick={onClose}
                className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
              >
                {t('done')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
