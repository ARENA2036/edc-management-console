import { Boxes, Network, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEDC: () => void;
  onSelectComponent: () => void;
}

export default function AddComponentDialog({
  open,
  onOpenChange,
  onSelectEDC,
  onSelectComponent,
}: Props) {
  const { t } = useI18n();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {t('addSelectionTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {t('addSelectionSubtitle')}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          <button
            onClick={onSelectEDC}
            className="group rounded-2xl border border-orange-200 bg-orange-50 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg dark:border-orange-500/30 dark:bg-orange-500/10"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md">
                <Network size={24} />
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm dark:bg-slate-800 dark:text-orange-300">
                3 {t('stepCount')}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {t('edcConnectorOption')}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">
              {t('edcConnectorOptionHint')}
            </p>
          </button>

          <button
            onClick={onSelectComponent}
            className="group rounded-2xl border border-blue-200 bg-blue-50 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-blue-500/30 dark:bg-blue-500/10"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-md">
                <Boxes size={24} />
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300">
                2 {t('stepCount')}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {t('componentOption')}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">
              {t('componentOptionHint')}
            </p>
          </button>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            <span className="font-semibold text-gray-900 dark:text-slate-100">{t('tipLabel')}:</span>{' '}
            {t('addSelectionTip')}
          </p>
        </div>
      </div>
    </div>
  );
}
