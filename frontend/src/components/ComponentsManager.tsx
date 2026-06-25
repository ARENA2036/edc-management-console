import { Boxes, MoreHorizontal, PencilLine, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ManagedComponent } from '../types';
import { useI18n } from '../i18n';
import Tooltip from './Tooltip';

interface Props {
  components: ManagedComponent[];
  onDelete: (componentId: string) => void;
}

function ComponentDetailsModal({
  component,
  onClose,
}: {
  component: ManagedComponent;
  onClose: () => void;
}) {
  const { t, language } = useI18n();

  const deployedAt = new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(component.deployedAt));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t('details')}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5 text-sm text-gray-600 dark:text-slate-300">
          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100">{t('tableName')}</p>
            <p>{component.name}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100">{t('tableType')}</p>
            <p>{component.type}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100">{t('tableVersion')}</p>
            <p>{component.version}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100">{t('tableLinkedTo')}</p>
            <p>{component.linkedConnector}</p>
          </div>
          {component.connectionMode && (
            <div>
              <p className="font-medium text-gray-900 dark:text-slate-100">Mode</p>
              <p>{component.connectionMode === 'existing' ? 'Existing service' : 'New deployment'}</p>
            </div>
          )}
          {component.endpoint && (
            <div>
              <p className="font-medium text-gray-900 dark:text-slate-100">{t('tableEndpoint')}</p>
              <p className="break-all">{component.endpoint}</p>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100">{t('tableStatus')}</p>
            <p>{component.status}</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-slate-100">Deployed</p>
            <p>{deployedAt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteComponentModal({
  component,
  onClose,
  onConfirm,
}: {
  component: ManagedComponent;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t, language } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-red-600">
            {t('deleteComponentTitle')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 text-sm leading-6 text-gray-600 dark:text-slate-300">
          <div className="space-y-3">
            <p>{t('deleteComponentMessage', { name: component.name })}</p>
            <p>
              {language === 'de'
                ? 'Die Komponente wird aus der Dashboard-Übersicht entfernt. Falls sie bereits technisch angebunden wurde, prüfen Sie bitte anschließend die zugehörige Zielumgebung oder Service-Konfiguration.'
                : 'The component will be removed from the dashboard overview. If it was already connected technically, please review the related target environment or service configuration afterwards.'}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            {t('confirmDelete')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComponentsManager({ components, onDelete }: Props) {
  const { language, t } = useI18n();
  const [selectedComponent, setSelectedComponent] = useState<ManagedComponent | null>(null);
  const [componentToDelete, setComponentToDelete] = useState<ManagedComponent | null>(null);

  const rows = useMemo(
    () => [...components].sort((a, b) => b.deployedAt.localeCompare(a.deployedAt)),
    [components],
  );

  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white">
              <Boxes size={18} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                <span className="dark:text-slate-100">{t('componentsServices')}</span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {t('componentsSectionSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <Boxes size={28} />
            </div>
            <h4 className="text-xl font-semibold text-gray-700 dark:text-slate-200">
              {t('noComponentsTitle')}
            </h4>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              {t('noComponentsDescription')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-500">
                <tr>
                  <th className="px-5 py-3">{t('tableName')}</th>
                  <th className="px-5 py-3">{t('tableType')}</th>
                  <th className="px-5 py-3">{t('tableVersion')}</th>
                  <th className="px-5 py-3">{t('tableStatus')}</th>
                  <th className="px-5 py-3">{t('tableLinkedTo')}</th>
                  <th className="px-5 py-3">{t('tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {rows.map((component) => (
                  <tr
                    key={component.id}
                    className="transition-colors hover:bg-blue-50/40 dark:hover:bg-slate-800/70"
                  >
                    <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                      {component.name}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                        {component.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {component.version}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        {t('statusActive')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {component.linkedConnector}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Tooltip content={t('tableManage')}>
                          <button
                            onClick={() => setSelectedComponent(component)}
                            className="rounded-lg p-2 text-blue-500 transition-colors hover:bg-blue-50"
                          >
                            <PencilLine size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={
                            language === 'de'
                              ? 'Löscht diese Komponente nach Bestätigung aus der Dashboard-Übersicht.'
                              : 'Deletes this component from the dashboard overview after confirmation.'
                          }
                        >
                          <button
                            onClick={() => setComponentToDelete(component)}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip content={t('tableMore')}>
                          <button
                            onClick={() => setSelectedComponent(component)}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedComponent && (
        <ComponentDetailsModal
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}

      {componentToDelete && (
        <DeleteComponentModal
          component={componentToDelete}
          onClose={() => setComponentToDelete(null)}
          onConfirm={() => {
            onDelete(componentToDelete.id);
            setComponentToDelete(null);
          }}
        />
      )}
    </>
  );
}
