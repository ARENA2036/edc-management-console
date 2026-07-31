import { CheckCircle2, ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardConnector, ManagedComponent } from '../types';
import { useI18n } from '../i18n';
import { useLockBodyScroll } from '../useLockBodyScroll';
import {
  isValidResourceName,
  MAX_RESOURCE_NAME_LENGTH,
  MIN_RESOURCE_NAME_LENGTH,
  normalizeResourceName,
} from '../utils/nameRules';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectors: DashboardConnector[];
  onDeploy: (component: ManagedComponent) => Promise<void> | void;
  deploying?: boolean;
  existingNames: string[];
  defaultVersions?: Partial<Record<ManagedComponent['type'] | 'connector', string>>;
  initialLinkedConnector?: string;
  allowMultipleTypes?: boolean;
  initialSelectedTypes?: ComponentType[];
  startAtConfiguration?: boolean;
}

const componentTypes = [
  'Submodel Service',
  'Digital Twin Registry',
] as const;

export type ComponentType = (typeof componentTypes)[number];
type Translate = ReturnType<typeof useI18n>['t'];
type ComponentField = 'name';

interface ComponentDraft {
  name: string;
  touched: Partial<Record<ComponentField, boolean>>;
}

function getConnectorType(connector: DashboardConnector) {
  const config = connector.config;
  if (config && typeof config.connectorType === 'string') {
    return config.connectorType;
  }

  return 'EDC Connector';
}

function getComponentTypeTitle(type: ComponentType, t: Translate) {
  return type === 'Digital Twin Registry'
    ? t('componentTypeTwin')
    : t('componentTypeSubmodel');
}

function getComponentTypeDescription(type: ComponentType, t: Translate) {
  return type === 'Digital Twin Registry'
    ? t('componentTypeTwinDescription')
    : t('componentTypeSubmodelDescription');
}

function toManagedComponentType(type: ComponentType): ManagedComponent['type'] {
  return type === 'Digital Twin Registry' ? 'digitalTwinRegistry' : 'submodelServer';
}

function createEmptyDraft(): ComponentDraft {
  return {
    name: '',
    touched: {},
  };
}

function buildDrafts() {
  return componentTypes.reduce(
    (drafts, type) => ({
      ...drafts,
      [type]: createEmptyDraft(),
    }),
    {} as Record<ComponentType, ComponentDraft>,
  );
}

export default function ComponentWizard({
  open,
  onOpenChange,
  connectors,
  onDeploy,
  deploying = false,
  existingNames,
  defaultVersions,
  initialLinkedConnector,
  allowMultipleTypes = true,
  initialSelectedTypes,
  startAtConfiguration = false,
}: Props) {
  const { t } = useI18n();
  useLockBodyScroll(open);
  const defaultSelectedTypes = useMemo<ComponentType[]>(
    () =>
      initialSelectedTypes?.length
        ? [...initialSelectedTypes]
        : ['Submodel Service'],
    [initialSelectedTypes],
  );

  const [step, setStep] = useState(1);
  const [selectedComponentTypes, setSelectedComponentTypes] =
    useState<ComponentType[]>(defaultSelectedTypes);
  const [linkedConnector, setLinkedConnector] = useState('');
  const [componentDrafts, setComponentDrafts] = useState<Record<ComponentType, ComponentDraft>>(
    buildDrafts(),
  );
  const [submittedStep1, setSubmittedStep1] = useState(false);
  const [submittedStep2, setSubmittedStep2] = useState(false);

  const eligibleConnectors = connectors;
  const localizeConnectorType = (type: string) =>
    type === 'EDC Connector' ? t('connectorTypeDefault') : type;
  const normalizedExistingNames = useMemo(
    () => new Set(existingNames.map((value) => normalizeResourceName(value))),
    [existingNames],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(startAtConfiguration ? 2 : 1);
    setSelectedComponentTypes(defaultSelectedTypes);
    setComponentDrafts(buildDrafts());
    setSubmittedStep1(false);
    setSubmittedStep2(false);
    setLinkedConnector(initialLinkedConnector ?? '');
  }, [
    defaultSelectedTypes,
    initialLinkedConnector,
    open,
    startAtConfiguration,
  ]);

  const closeDialog = () => {
    onOpenChange(false);
  };

  const getDraft = (type: ComponentType) => componentDrafts[type] ?? createEmptyDraft();

  const getComponentNamePlaceholder = (type: ComponentType) =>
    type === 'Digital Twin Registry'
      ? t('componentNamePlaceholderTwin')
      : t('componentNamePlaceholderSubmodel');

  const getStep2Errors = (type: ComponentType) => {
    const draft = getDraft(type);
    const errors: Partial<Record<ComponentField, string>> = {};
    const normalizedName = normalizeResourceName(draft.name);
    const duplicateInSelection = selectedComponentTypes.some(
      (selectedType) =>
        selectedType !== type
        && normalizeResourceName(getDraft(selectedType).name) === normalizedName
        && normalizedName.length > 0,
    );

    if (!draft.name.trim()) {
      errors.name = t('validationRequired', {
        field: t('componentNameLabel'),
      });
    } else if (!isValidResourceName(draft.name)) {
      errors.name = t('validationInvalidResourceName', {
        min: String(MIN_RESOURCE_NAME_LENGTH),
        max: String(MAX_RESOURCE_NAME_LENGTH),
      });
    } else if (normalizedExistingNames.has(normalizedName) || duplicateInSelection) {
      errors.name = t('validationDuplicateName');
    }

    return errors;
  };

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-colors dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
      hasError
        ? 'border-red-400 focus:border-red-500 dark:border-red-500/70'
        : 'border-gray-200 focus:border-blue-400'
    }`;

  const updateDraft = (
    type: ComponentType,
    updater: (draft: ComponentDraft) => ComponentDraft,
  ) => {
    setComponentDrafts((current) => ({
      ...current,
      [type]: updater(current[type] ?? createEmptyDraft()),
    }));
  };

  const markDraftTouched = (type: ComponentType, field: ComponentField) => {
    updateDraft(type, (draft) => ({
      ...draft,
      touched: {
        ...draft.touched,
        [field]: true,
      },
    }));
  };

  const showStep2Error = (type: ComponentType, field: ComponentField) => {
    if (deploying) {
      return false;
    }
    const errors = getStep2Errors(type);
    return Boolean(errors[field]) && (getDraft(type).touched[field] || submittedStep2);
  };

  const handleDeploy = async () => {
    setSubmittedStep2(true);

    if (
      deploying
      || selectedComponentTypes.some((type) => Object.keys(getStep2Errors(type)).length > 0)
    ) {
      return;
    }

    for (const type of selectedComponentTypes) {
      const draft = getDraft(type);
      const normalizedName = normalizeResourceName(draft.name);
      const managedType = toManagedComponentType(type);
      const component: ManagedComponent = {
        id: `comp-${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: normalizedName,
        type: managedType,
        version: defaultVersions?.[managedType]?.trim() || '',
        status: 'Active',
        linkedConnector,
        deployedAt: new Date().toISOString(),
        connectionMode: 'new',
        db_name: `${normalizedName}-db`,
        auth: {
          db_username: `${normalizedName}-user`,
          db_password: `${normalizedName}-password`,
        },
      };

      await Promise.resolve(onDeploy(component));
    }

    closeDialog();
  };

  const toggleComponentType = (type: ComponentType) => {
    if (!allowMultipleTypes) {
      setSelectedComponentTypes([type]);
      return;
    }

    setSelectedComponentTypes((current) =>
      current.includes(type)
        ? current.filter((currentType) => currentType !== type)
        : [...current, type],
    );
  };

  const handlePrimaryAction = async () => {
    if (step === 1) {
      setSubmittedStep1(true);
      if (selectedComponentTypes.length === 0) {
        return;
      }

      setStep(2);
      return;
    }

    await handleDeploy();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/50 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
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

          <div className="space-y-6 overflow-y-auto overscroll-contain px-6 py-6">
            {step === 1 && (
              <>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                  {t('componentHelp')}
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {t('componentGuidanceChoose')}
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  {t('componentGuidanceRestriction')}
                </div>
                <div className="grid gap-3">
                  {componentTypes.map((type) => {
                    const title = getComponentTypeTitle(type, t);
                    const description = getComponentTypeDescription(type, t);
                    const isSelected = selectedComponentTypes.includes(type);

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleComponentType(type)}
                        className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                          isSelected
                            ? 'border-blue-400 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10'
                            : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                              isSelected
                                ? 'border-blue-500 bg-blue-500 text-white'
                                : 'border-gray-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <CheckCircle2 size={12} />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-slate-100">{title}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {submittedStep1 && selectedComponentTypes.length === 0 && (
                  <p className="text-xs text-red-600 dark:text-red-300">
                    {t('validationRequired', { field: t('componentTypeLabel') })}
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                  {t('componentHelp')}
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <p>{t('componentGuidanceConfig')}</p>
                  <p className="mt-2">{t('componentGuidanceWhere')}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  {eligibleConnectors.length === 0
                    ? t('noConnectorsForComponents')
                    : t('linkedConnectorOptionalHint')}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    {t('linkedConnectorLabel')}
                  </label>
                  {initialLinkedConnector && (
                    <p className="mb-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
                      {t('initialLinkedConnectorHint', { name: initialLinkedConnector })}
                    </p>
                  )}
                  <div className="relative">
                    <select
                      value={linkedConnector}
                      onChange={(event) => setLinkedConnector(event.target.value)}
                      className={`${inputClass(false)} appearance-none pr-10`}
                    >
                      <option value="">{t('standaloneComponentOption')}</option>
                      {eligibleConnectors.map((connector) => (
                        <option key={connector.id} value={connector.name}>
                          {connector.name} ({localizeConnectorType(getConnectorType(connector))})
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                    />
                  </div>
                </div>

                {selectedComponentTypes.map((type, index) => {
                  const draft = getDraft(type);
                  const step2Errors = getStep2Errors(type);

                  return (
                    <div
                      key={type}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {getComponentTypeTitle(type, t)}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                            {getComponentTypeDescription(type, t)}
                          </p>
                        </div>
                        {selectedComponentTypes.length > 1 && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                            {index + 1} / {selectedComponentTypes.length}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                          {t('componentNameLabel')}
                        </label>
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(event) =>
                            updateDraft(type, (current) => ({
                              ...current,
                              name: event.target.value.trimStart(),
                            }))
                          }
                          onBlur={() => markDraftTouched(type, 'name')}
                          placeholder={getComponentNamePlaceholder(type)}
                          maxLength={MAX_RESOURCE_NAME_LENGTH}
                          disabled={deploying}
                          aria-invalid={showStep2Error(type, 'name')}
                          className={inputClass(showStep2Error(type, 'name'))}
                        />
                        {showStep2Error(type, 'name') && (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                            {step2Errors.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (deploying) {
                    return;
                  }
                  if (step === 1) {
                    closeDialog();
                    return;
                  }

                  setStep(1);
                }}
                disabled={deploying}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {step === 1 ? t('cancel') : t('back')}
              </button>
              <button
                onClick={() => void handlePrimaryAction()}
                disabled={deploying}
                className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              >
                {deploying
                  ? t('deploymentStatusDeployingTitle')
                  : step === 1
                  ? t('next')
                  : t('deployNow')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
