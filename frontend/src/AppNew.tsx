/********************************************************************************
# Tractus-X - EDC Management Console
#
# Copyright (c) 2026 ARENA2036 e.V.
# Copyright (c) 2026 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
********************************************************************************/
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Database,
  Layers,
  Plus,
  Server,
  SquareActivity,
} from 'lucide-react';
import { activityApi, componentApi, dataspaceApi } from './api/client';
import { isHealthy, needsAttention, statusLabel, statusTone } from './utils/status';
import { ApiError, toApiError } from './api/errors';
import type { ActivityLog, DashboardConnector, ManagedComponent } from './types';
import { useI18n } from './i18n';
import { getRuntimeConfigValue } from './runtime-config';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsCard from './components/StatsCard';
import DeploymentWizard from './components/DeploymentWizard';
import AddComponentDialog from './components/AddComponentDialog';
import ComponentWizard from './components/ComponentWizard';
import type { ComponentType } from './components/ComponentWizard';
import ConnectorsManager from './components/ConnectorsManager';
import ComponentsManager from './components/ComponentsManager';
import DeploymentStatusModal from './components/DeploymentStatusModal';
import { ErrorBanner } from './components/ErrorDetails';
import OnboardingGuide from './components/OnboardingGuide';
import Tooltip from './components/Tooltip';
import keycloak, { isAuthDisabled } from './auth/keycloak';
import { useSessionIdentity, type SessionIdentity } from './auth/session';
import { resolveComponentLimit } from './utils/nameRules';

const CONNECTORS_STORAGE_KEY = 'connectors';
const COMPONENTS_STORAGE_KEY = 'components';
const WELCOME_STORAGE_KEY = 'hasSeenWelcome';
const THEME_STORAGE_KEY = 'dashboard_theme';
const DEFAULT_COMPONENT_HOST_SUFFIX = getRuntimeConfigValue(
  import.meta.env.VITE_EDC_HOSTNAME,
  window.__RUNTIME_CONFIG__?.edcHost,
  '',
);

type ThemeMode = 'light' | 'dark';
type DeploymentFeedback = {
  open: boolean;
  status: 'deploying' | 'success' | 'error';
  resource: 'connector' | 'component';
  itemCount: number;
  /** Set when status is 'error', so the modal can name the cause and stage. */
  error?: ApiError | null;
};

interface DataspaceSettingsPayload {
  name?: string;
  authority_bpn?: string;
  bpn?: string;
  realm?: string;
  username?: string;
  readonly?: boolean;
  centralidp?: {
    url?: string;
    realm?: string;
  };
  ssi_wallet?: {
    url?: string;
  };
  portal?: {
    url?: string;
  };
  sde?: {
    url?: string;
    client_id?: string;
    manufacturerId?: string;
    providerEDC?: string;
    consumerEDC?: string;
    registryUrl?: string;
  };
  discovery?: {
    semantics_url?: string;
    discovery_finder?: string;
    bpn_discovery?: string;
  };
  edc?: {
    default_url?: string;
    controlplane_url?: string;
    dataplane_url?: string;
    controlplane_host_suffix?: string;
    dataplane_host_suffix?: string;
    cluster_context?: string;
  };
  deployment?: {
    connector?: {
      defaultVersion?: string;
      availableVersions?: string[];
      maxInstances?: number;
    };
    digitalTwinRegistry?: {
      defaultVersion?: string;
      availableVersions?: string[];
      maxInstances?: number;
    };
    submodelServer?: {
      defaultVersion?: string;
      availableVersions?: string[];
      maxInstances?: number;
    };
  };
}

interface DataspaceSummary {
  name: string;
  authorityBpn: string;
  details: DataspaceSettingsPayload | null;
}

function readLocalStorage<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage item "${key}"`, error);
    return fallback;
  }
}

function saveLocalStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readAuthorityBpn(details: DataspaceSettingsPayload | null | undefined) {
  const authorityBpn = details?.authority_bpn?.trim().toUpperCase();
  if (authorityBpn) {
    return authorityBpn;
  }

  return details?.bpn?.trim().toUpperCase() ?? '';
}

function getConnectorType(connector: DashboardConnector) {
  const connectorType = connector.config?.connectorType;
  return typeof connectorType === 'string' ? connectorType : 'EDC Connector';
}

function getConnectorEndpoint(connector: DashboardConnector) {
  if (connector.url) {
    return connector.url;
  }

  if (connector.urls.length > 0) {
    return connector.urls[0];
  }

  return '';
}

function getManagedComponentLabel(
  type: ManagedComponent['type'],
  t: ReturnType<typeof useI18n>['t'],
) {
  return type === 'digitalTwinRegistry' ? t('componentTypeTwin') : t('componentTypeSubmodel');
}

function getCachedDeployments() {
  const cachedConnectors = readLocalStorage<DashboardConnector[]>(
    CONNECTORS_STORAGE_KEY,
    [],
  );
  const cachedComponents = readLocalStorage<ManagedComponent[]>(
    COMPONENTS_STORAGE_KEY,
    [],
  );

  return {
    connectors: cachedConnectors,
    components: cachedComponents,
  };
}

function getRecordType(record: DashboardConnector) {
  const configuredType = record.config?.type;
  return typeof configuredType === 'string' ? configuredType : 'connector';
}

function isManagedComponentType(
  value: string,
): value is ManagedComponent['type'] {
  return value === 'digitalTwinRegistry' || value === 'submodelServer';
}

function mapApiComponent(record: DashboardConnector): ManagedComponent | null {
  const recordType = getRecordType(record);
  if (!isManagedComponentType(recordType)) {
    return null;
  }

  return {
    id: String(record.id),
    name: record.name,
    type: recordType,
    version: record.version || '',
    status: statusLabel(record.status) as ManagedComponent['status'],
    deployedAt: record.updated_at || record.created_at || new Date().toISOString(),
    endpoint: record.url,
    db_name: '',
    auth: {
      db_username: '',
      db_password: '',
    },
    source: 'api',
  };
}

function mapApiConnector(record: DashboardConnector): DashboardConnector {
  return {
    ...record,
    source: 'api',
  };
}

async function fetchDeploymentState(): Promise<{
  connectors: DashboardConnector[];
  components: ManagedComponent[];
  error?: ApiError | null;
}> {
  const cached = getCachedDeployments();

  try {
    const response = await componentApi.getAll();
    const apiRows = Array.isArray(response.data.data)
      ? (response.data.data as DashboardConnector[])
      : [];
    const connectors = apiRows
      .filter((record) => getRecordType(record) === 'connector')
      .map(mapApiConnector);
    const components = apiRows
      .filter((record) => getRecordType(record) !== 'connector')
      .map(mapApiComponent)
      .filter((component): component is ManagedComponent => component !== null);

    saveLocalStorage(CONNECTORS_STORAGE_KEY, connectors);
    saveLocalStorage(COMPONENTS_STORAGE_KEY, components);
    return { connectors, components, error: null };
  } catch (error) {
    const apiError = toApiError(error, 'The list of deployed components could not be loaded.');
    console.error('Failed to load deployments:', apiError);
    return { ...cached, error: apiError };
  }
}

async function fetchActivityLogs() {
  try {
    const response = await activityApi.getRecentLogs(20);
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to load activity logs:', toApiError(error));
    return [];
  }
}

async function fetchDataspaceSummary(
  fallbackName: string,
): Promise<DataspaceSummary> {
  try {
    const response = await dataspaceApi.getDataspace();
    const data = (response.data?.data as DataspaceSettingsPayload | undefined) ?? null;
    return {
      name: data?.name || fallbackName,
      authorityBpn: readAuthorityBpn(data),
      details: data,
    };
  } catch (error) {
    console.error('Failed to load dataspace:', toApiError(error));
    return {
      name: fallbackName,
      authorityBpn: '',
      details: null,
    };
  }
}

function formatTimestamp(
  value: string | undefined,
  language: 'de' | 'en',
  fallbackLabel: string,
) {
  if (!value) {
    return fallbackLabel;
  }

  try {
    return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getHealthTone(
  status: string,
  labels: {
    healthy: string;
    warning: string;
    critical: string;
    unknown: string;
  },
) {
  const tone = statusTone(status);

  if (tone === 'ok') {
    return {
      label: labels.healthy,
      badge:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    };
  }

  if (tone === 'progress') {
    return {
      label: statusLabel(status),
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    };
  }

  if (tone === 'warn') {
    return {
      label: labels.warning,
      badge:
        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    };
  }

  if (tone === 'error') {
    return {
      label: labels.critical,
      badge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    };
  }

  return {
    label: labels.unknown,
    badge:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
}

function resolveComponentLimits(details: DataspaceSettingsPayload | null) {
  return {
    connector: resolveComponentLimit('connector', details?.deployment?.connector?.maxInstances),
    digitalTwinRegistry: resolveComponentLimit(
      'digitalTwinRegistry',
      details?.deployment?.digitalTwinRegistry?.maxInstances,
    ),
    submodelServer: resolveComponentLimit(
      'submodelServer',
      details?.deployment?.submodelServer?.maxInstances,
    ),
  };
}

function countComponentsByType(components: ManagedComponent[]) {
  return {
    digitalTwinRegistry: components.filter(
      (component) => component.type === 'digitalTwinRegistry',
    ).length,
    submodelServer: components.filter(
      (component) => component.type === 'submodelServer',
    ).length,
  };
}

function Dashboard({ identity }: { identity: SessionIdentity }) {
  const { t } = useI18n();
  const [connectors, setConnectors] = useState<DashboardConnector[]>([]);
  const [components, setComponents] = useState<ManagedComponent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dataspaceName, setDataspaceName] = useState(t('dataspaceFallback'));
  const [authorityBpn, setAuthorityBpn] = useState('');
  const [dataspaceDetails, setDataspaceDetails] = useState<DataspaceSettingsPayload | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeploymentWizard, setShowDeploymentWizard] = useState(false);
  const [showComponentWizard, setShowComponentWizard] = useState(false);
  const [connectorDeploymentInFlight, setConnectorDeploymentInFlight] = useState(false);
  const [componentDeploymentInFlight, setComponentDeploymentInFlight] = useState(false);
  const [deploymentFeedback, setDeploymentFeedback] = useState<DeploymentFeedback>({
    open: false,
    status: 'deploying',
    resource: 'connector',
    itemCount: 1,
  });
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  const [componentWizardDefaults, setComponentWizardDefaults] = useState<{
    allowMultipleTypes?: boolean;
    initialSelectedTypes?: ComponentType[];
    startAtConfiguration?: boolean;
  }>({});
  const componentLimits = useMemo(
    () => resolveComponentLimits(dataspaceDetails),
    [dataspaceDetails],
  );
  const componentCounts = useMemo(() => countComponentsByType(components), [components]);
  const connectorLimitReached = connectors.length >= componentLimits.connector;

  const loadDeployments = useCallback(async () => {
    const deploymentState = await fetchDeploymentState();
    setConnectors(deploymentState.connectors);
    setComponents(deploymentState.components);
    setLoadError(deploymentState.error ?? null);
  }, []);

  const loadActivityLogs = async () => {
    const logs = await fetchActivityLogs();
    setActivityLogs(logs);
  };

  const loadDataspace = useCallback(async () => {
    const summary = await fetchDataspaceSummary(t('dataspaceFallback'));
    setDataspaceName(summary.name);
    setAuthorityBpn(summary.authorityBpn);
    setDataspaceDetails(summary.details);
  }, [t]);

  useEffect(() => {
    loadDeployments();
    loadActivityLogs();
    loadDataspace();

    const interval = setInterval(() => {
      loadDeployments();
      loadActivityLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDataspace, loadDeployments, t]);

  const persistConnector = async (connector: DashboardConnector) => {
    if (connectors.some((current) => current.name === connector.name)) {
      return false;
    }

    if (connectors.length >= componentLimits.connector) {
      return false;
    }

    const deployingConnector = {
      ...connector,
      status: 'deploying',
      source: 'local' as const,
    } satisfies DashboardConnector;
    const updatedConnectors = [...connectors, deployingConnector];
    saveLocalStorage(CONNECTORS_STORAGE_KEY, updatedConnectors);
    setConnectors(updatedConnectors);

    try {
      await componentApi.create({
        components: [
          {
            type: 'connector',
            name: connector.name,
            url: connector.url,
            bpn: connector.bpn,
            version: connector.version || '',
            db_name: `${connector.name}-db`,
            auth: {
              db_username: connector.db_username || `${connector.name}-username`,
              db_password: '',
            },
          },
        ],
      });

      const synced = await fetchDeploymentState();
      setConnectors(synced.connectors);
      setComponents(synced.components);
      if (!synced.connectors.some((current) => current.name === connector.name)) {
        throw new Error(`Connector '${connector.name}' was not returned by the backend after deployment.`);
      }
    } catch (error) {
      const synced = await fetchDeploymentState();
      setConnectors(synced.connectors);
      setComponents(synced.components);
      console.error('Failed to deploy connector:', error);
      throw error;
    }
    return true;
  };

  const handleDeployConnector = async (connector: DashboardConnector) => {
    setConnectorDeploymentInFlight(true);
    setDeploymentFeedback({
      open: true,
      status: 'deploying',
      resource: 'connector',
      itemCount: 1,
    });

    try {
      const deployed = await persistConnector(connector);
      if (deployed) {
        setShowDeploymentWizard(false);
        setDeploymentFeedback({
          open: true,
          status: 'success',
          resource: 'connector',
          itemCount: 1,
        });
      }
    } catch (error) {
      setDeploymentFeedback({
        open: true,
        status: 'error',
        resource: 'connector',
        itemCount: 1,
        error: toApiError(error, 'The connector could not be deployed.'),
      });
    } finally {
      setConnectorDeploymentInFlight(false);
    }
  };

  const handleDeleteConnector = async (connector: DashboardConnector) => {
    setActionError(null);
    try {
      await componentApi.delete(connector.name);
      const synced = await fetchDeploymentState();
      setConnectors(synced.connectors);
      setComponents(synced.components);
      setLoadError(synced.error ?? null);
    } catch (error) {
      const apiError = toApiError(error, `'${connector.name}' could not be deleted.`);
      console.error('Failed to delete connector:', apiError);
      setActionError(apiError);
    }
  };

  const handleDeployComponent = async (component: ManagedComponent) => {
    if (componentCounts[component.type] >= componentLimits[component.type]) {
      throw new ApiError({
        status: 409,
        code: 'COMPONENT_LIMIT_REACHED',
        stage: 'request',
        message:
          `Cannot deploy '${component.name}': the limit of `
          + `${componentLimits[component.type]} '${component.type}' components is already reached.`,
        hint: 'Delete an existing component of this type, then deploy again.',
      });
    }

    const generatedEndpoint = component.endpoint?.trim()
      || (DEFAULT_COMPONENT_HOST_SUFFIX
        ? `${component.name}.${DEFAULT_COMPONENT_HOST_SUFFIX}`
        : component.name);

    const deployingComponent = {
      ...component,
      endpoint: generatedEndpoint,
      status: 'Deploying',
      source: 'local' as const,
    } satisfies ManagedComponent;

    setComponents((current) => {
      const updated = [deployingComponent, ...current];
      saveLocalStorage(COMPONENTS_STORAGE_KEY, updated);
      return updated;
    });

    try {
      await componentApi.create({
        components: [
          {
            type: component.type,
            name: component.name,
            version: component.version,
            url: generatedEndpoint,
            db_name: component.db_name,
            auth: component.auth,
          },
        ],
      });
      const synced = await fetchDeploymentState();
      setConnectors(synced.connectors);
      setComponents(synced.components);
      if (!synced.components.some((current) => current.name === component.name)) {
        throw new Error(`Component '${component.name}' was not returned by the backend after deployment.`);
      }
    } catch (error) {
      const synced = await fetchDeploymentState();
      setConnectors(synced.connectors);
      setComponents(synced.components);
      console.error('Failed to deploy component:', error);
      throw error;
    }
  };

  const handleDeleteComponent = async (componentToDelete: ManagedComponent) => {
    setActionError(null);
    try {
      await componentApi.delete(componentToDelete.name);
      const synced = await fetchDeploymentState();
      setConnectors(synced.connectors);
      setComponents(synced.components);
      setLoadError(synced.error ?? null);
    } catch (error) {
      const apiError = toApiError(error, `'${componentToDelete.name}' could not be deleted.`);
      console.error('Failed to delete component:', apiError);
      setActionError(apiError);
    }
  };

  const openComponentWizard = () => {
    setComponentWizardDefaults({
      allowMultipleTypes: true,
    });
    setShowComponentWizard(true);
  };

  const activeConnectors = useMemo(
    () =>
      connectors.filter((connector) => isHealthy(connector.status)).length,
    [connectors],
  );

  const activeComponentCounts = useMemo(() => {
    // Counts every deployed component of the type, matching the backend cap,
    // which counts rows irrespective of their current phase.
    return {
      digitalTwinRegistry: components.filter(
        (component) => component.type === 'digitalTwinRegistry',
      ).length,
      submodelServer: components.filter(
        (component) => component.type === 'submodelServer',
      ).length,
    };
  }, [components]);

  const activityValue = activityLogs.length > 0 ? t('statusActive') : t('statusHealthy');
  const statsGuidance = {
    dataSpace: {
      title: t('statsDataSpaceTitle'),
      content: t('statsDataSpaceContent'),
      footer: t('statsDataSpaceFooter'),
    },
    health: {
      title: t('statsHealthTitle'),
      content: t('statsHealthContent'),
      footer: t('statsHealthFooter'),
    },
    activity: {
      title: t('statsActivityTitle'),
      content: t('statsActivityContent'),
      footer: t('statsActivityFooter'),
    },
    connectors: {
      title: t('statsConnectorsTitle'),
      content: t('statsConnectorsContent'),
      footer: t('statsConnectorsFooter'),
    },
    digitalTwinRegistries: {
      title: t('statsDigitalTwinRegistriesTitle'),
      content: t('statsDigitalTwinRegistriesContent', {
        max: String(componentLimits.digitalTwinRegistry),
      }),
      footer: t('statsDigitalTwinRegistriesFooter'),
    },
    submodelServices: {
      title: t('statsSubmodelServicesTitle'),
      content: t('statsSubmodelServicesContent', {
        max: String(componentLimits.submodelServer),
      }),
      footer: t('statsSubmodelServicesFooter'),
    },
    add: {
      title: t('statsAddTitle'),
      content: t('statsAddContent'),
      items: [
        t('statsAddItemConnector'),
        t('statsAddItemComponent'),
        t('statsAddItemValues'),
      ],
      footer: t('statsAddFooter'),
    },
  };

  return (
    <>
      <div className="px-4 pb-12 pt-4 md:px-6 md:pb-16 md:pt-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t('dashboard')}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('welcome')}</p>
        </div>

        <ErrorBanner
          error={actionError}
          title={t('errorActionFailedTitle')}
          onDismiss={() => setActionError(null)}
        />
        <ErrorBanner
          error={loadError}
          tone="warning"
          title={t('errorStaleDataTitle')}
          onDismiss={() => setLoadError(null)}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatsCard
            icon={<Database size={22} />}
            title={t('dataSpace')}
            value={dataspaceName}
            subtitle={authorityBpn || t('allSourcesMonitored')}
            tooltipTitle={statsGuidance.dataSpace.title}
            tooltipContent={statsGuidance.dataSpace.content}
            tooltipFooter={statsGuidance.dataSpace.footer}
          />
          <StatsCard
            icon={<SquareActivity size={22} />}
            title={t('systemHealth')}
            value={t('statusHealthy')}
            subtitle={t('allSystemsOperational')}
            variant="success"
            tooltipTitle={statsGuidance.health.title}
            tooltipContent={statsGuidance.health.content}
            tooltipFooter={statsGuidance.health.footer}
          />
          <StatsCard
            icon={<Activity size={22} />}
            title={t('activity')}
            value={activityValue}
            subtitle={t('syncRunning')}
            variant="info"
            tooltipTitle={statsGuidance.activity.title}
            tooltipContent={statsGuidance.activity.content}
            tooltipFooter={statsGuidance.activity.footer}
          />
          <StatsCard
            icon={<Server size={22} />}
            title={t('edcConnectors')}
            value={`${connectors.length}/${componentLimits.connector}`}
            subtitle={`${activeConnectors} ${t('activeShort')}`}
            variant="info"
            tooltipTitle={statsGuidance.connectors.title}
            tooltipContent={statsGuidance.connectors.content}
            tooltipFooter={statsGuidance.connectors.footer}
          />
          <StatsCard
            icon={<Boxes size={22} />}
            title={t('digitalTwinRegistries')}
            value={`${componentCounts.digitalTwinRegistry}/${componentLimits.digitalTwinRegistry}`}
            subtitle={`${activeComponentCounts.digitalTwinRegistry} ${t('activeShort')}`}
            variant="info"
            tooltipTitle={statsGuidance.digitalTwinRegistries.title}
            tooltipContent={statsGuidance.digitalTwinRegistries.content}
            tooltipFooter={statsGuidance.digitalTwinRegistries.footer}
          />
          <StatsCard
            icon={<Layers size={22} />}
            title={t('submodelServices')}
            value={`${componentCounts.submodelServer}/${componentLimits.submodelServer}`}
            subtitle={`${activeComponentCounts.submodelServer} ${t('activeShort')}`}
            variant="info"
            tooltipTitle={statsGuidance.submodelServices.title}
            tooltipContent={statsGuidance.submodelServices.content}
            tooltipFooter={statsGuidance.submodelServices.footer}
          />
        </div>

        {identity.isAdmin ? (
        <div className="mb-6 flex flex-wrap justify-end gap-3">
          <Tooltip
            title={statsGuidance.add.title}
            content={statsGuidance.add.content}
            items={statsGuidance.add.items}
            footer={statsGuidance.add.footer}
            position="left"
          >
            <button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-orange-600"
            >
              <Plus size={18} />
              {t('addButtonLabel')}
            </button>
          </Tooltip>
        </div>
        ) : null}

        <div className="space-y-6">
          <ConnectorsManager
            connectors={connectors}
            onDelete={handleDeleteConnector}
            onAddComponent={() => openComponentWizard()}
            canManage={identity.isAdmin}
          />
          <ComponentsManager
            components={components}
            onDelete={handleDeleteComponent}
            canManage={identity.isAdmin}
          />
        </div>
      </div>

      <AddComponentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        connectorCount={connectors.length}
        connectorLimit={componentLimits.connector}
        digitalTwinRegistryCount={componentCounts.digitalTwinRegistry}
        digitalTwinRegistryLimit={componentLimits.digitalTwinRegistry}
        submodelServiceCount={componentCounts.submodelServer}
        submodelServiceLimit={componentLimits.submodelServer}
        onSelectEDC={() => {
          setShowAddDialog(false);
          if (!connectorLimitReached) {
            setShowDeploymentWizard(true);
          }
        }}
        onSelectComponent={() => {
          setShowAddDialog(false);
          openComponentWizard();
        }}
      />

      <DeploymentWizard
        open={showDeploymentWizard}
        onOpenChange={setShowDeploymentWizard}
        onDeploy={handleDeployConnector}
        connectorCount={connectors.length}
        deploying={connectorDeploymentInFlight}
        existingConnectorNames={connectors.map((connector) => connector.name)}
        defaultVersion={dataspaceDetails?.deployment?.connector?.defaultVersion}
        availableVersions={dataspaceDetails?.deployment?.connector?.availableVersions}
        prefilledBpn={identity.bpn}
        defaultApiEndpoint={
          dataspaceDetails?.edc?.controlplane_url || dataspaceDetails?.edc?.default_url
        }
        defaultDataPlaneUrl={dataspaceDetails?.edc?.dataplane_url}
        controlPlaneHostSuffix={dataspaceDetails?.edc?.controlplane_host_suffix}
        dataPlaneHostSuffix={dataspaceDetails?.edc?.dataplane_host_suffix}
      />

      <ComponentWizard
        open={showComponentWizard}
        onOpenChange={(open) => {
          setShowComponentWizard(open);
          if (!open) {
            setComponentWizardDefaults({});
          }
        }}
        onDeploy={async (component) => {
          setComponentDeploymentInFlight(true);
          setDeploymentFeedback({
            open: true,
            status: 'deploying',
            resource: 'component',
            itemCount: 1,
          });
          try {
            await handleDeployComponent(component);
            setShowComponentWizard(false);
            setDeploymentFeedback({
              open: true,
              status: 'success',
              resource: 'component',
              itemCount: 1,
            });
          } catch (error) {
            setDeploymentFeedback({
              open: true,
              status: 'error',
              resource: 'component',
              itemCount: 1,
              error: toApiError(error, 'The component could not be deployed.'),
            });
          } finally {
            setComponentDeploymentInFlight(false);
          }
        }}
        deploying={componentDeploymentInFlight}
        existingNames={[
          ...connectors.map((connector) => connector.name),
          ...components.map((component) => component.name),
        ]}
        defaultVersions={{
          connector: dataspaceDetails?.deployment?.connector?.defaultVersion,
          digitalTwinRegistry: dataspaceDetails?.deployment?.digitalTwinRegistry?.defaultVersion,
          submodelServer: dataspaceDetails?.deployment?.submodelServer?.defaultVersion,
        }}
        availableVersions={{
          connector: dataspaceDetails?.deployment?.connector?.availableVersions,
          digitalTwinRegistry:
            dataspaceDetails?.deployment?.digitalTwinRegistry?.availableVersions,
          submodelServer: dataspaceDetails?.deployment?.submodelServer?.availableVersions,
        }}
        allowMultipleTypes={componentWizardDefaults.allowMultipleTypes}
        initialSelectedTypes={componentWizardDefaults.initialSelectedTypes}
        startAtConfiguration={componentWizardDefaults.startAtConfiguration}
        typeCounts={{
          digitalTwinRegistry: componentCounts.digitalTwinRegistry,
          submodelServer: componentCounts.submodelServer,
        }}
        typeLimits={{
          digitalTwinRegistry: componentLimits.digitalTwinRegistry,
          submodelServer: componentLimits.submodelServer,
        }}
      />

      <DeploymentStatusModal
        open={deploymentFeedback.open}
        status={deploymentFeedback.status}
        resource={deploymentFeedback.resource}
        itemCount={deploymentFeedback.itemCount}
        error={deploymentFeedback.error}
        onClose={() =>
          setDeploymentFeedback((current) => ({
            ...current,
            open: false,
          }))
        }
      />
    </>
  );
}

function Monitor() {
  const { language, t } = useI18n();
  const [connectors, setConnectors] = useState<DashboardConnector[]>([]);
  const [components, setComponents] = useState<ManagedComponent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dataspace, setDataspace] = useState<DataspaceSummary>({
    name: t('dataspaceFallback'),
    authorityBpn: '',
    details: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [loadedConnectors, loadedActivityLogs, loadedDataspace] = await Promise.all([
        fetchDeploymentState(),
        fetchActivityLogs(),
        fetchDataspaceSummary(t('dataspaceFallback')),
      ]);

      if (!active) {
        return;
      }

      setConnectors(loadedConnectors.connectors);
      setComponents(loadedConnectors.components);
      setActivityLogs(loadedActivityLogs);
      setDataspace(loadedDataspace);
    };

    load();
    const interval = setInterval(load, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [t]);

  const healthLabels = useMemo(
    () => ({
      healthy: t('statusHealthy'),
      warning: t('statusWarning'),
      critical: t('statusCritical'),
      unknown: t('statusUnknown'),
    }),
    [t],
  );

  const connectorRows = useMemo(
    () =>
      connectors.map((connector) => {
        const tone = getHealthTone(connector.status, healthLabels);
        return {
          ...connector,
          connectorType:
            getConnectorType(connector) === 'EDC Connector'
              ? t('connectorTypeDefault')
              : getConnectorType(connector),
          endpoint: getConnectorEndpoint(connector),
          tone,
        };
      }),
    [connectors, healthLabels, t],
  );

  const componentRows = useMemo(
    () =>
      components.map((component) => ({
        ...component,
        endpointLabel: component.endpoint || t('standaloneDeployment'),
        statusCode: 'healthy' as const,
        tone: getHealthTone('healthy', healthLabels),
        statusLabel: t('standaloneReady'),
      })),
    [components, healthLabels, t],
  );

  const derivedEvents = useMemo(() => {
    if (activityLogs.length > 0) {
      return activityLogs
        .slice(0, 8)
        .map((log) => ({
          id: `log-${log.id}`,
          title: log.action || t('eventActivityTitle'),
          body:
            log.details ||
            log.connector_name ||
            t('eventBackendActivityRecorded'),
          timestamp: log.timestamp,
          severity:
            log.status === 'error' || log.status === 'failed'
              ? 'critical'
              : log.status === 'warning'
              ? 'warning'
              : 'healthy',
        }));
    }

    const connectorEvents = connectors.slice(0, 4).map((connector) => ({
      id: `connector-${connector.id}`,
      title: t('eventConnectorAvailable', { name: connector.name }),
      body: needsAttention(connector.status)
        ? t('eventConnectorAvailableUnhealthy')
        : t('eventConnectorAvailableHealthy'),
      timestamp: connector.created_at,
      severity: needsAttention(connector.status) ? 'critical' : 'healthy',
    }));

    const componentEvents = components.slice(0, 4).map((component) => ({
      id: `component-${component.id}`,
      title: t('eventComponentDeployed', { name: component.name }),
      body: t('eventComponentDeployedBody', {
        type: getManagedComponentLabel(component.type, t),
      }),
      timestamp: component.deployedAt,
      severity: 'healthy',
    }));

    return [...connectorEvents, ...componentEvents]
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 8);
  }, [activityLogs, components, connectors, t]);

  const recommendations = useMemo(() => {
    const items: string[] = [];
    const unhealthyConnectors = connectorRows.filter((connector) =>
      needsAttention(connector.status),
    );
    if (unhealthyConnectors.length > 0) {
      items.push(
        t('recommendationUnhealthyConnectors', {
          count: String(unhealthyConnectors.length),
        }),
      );
    }

    if (connectorRows.length === 0) {
      items.push(t('recommendationNoConnectors'));
    }

    if (items.length === 0) {
      items.push(t('recommendationStable'));
    }

    return items;
  }, [connectorRows, t]);

  const componentLimits = useMemo(
    () => resolveComponentLimits(dataspace.details),
    [dataspace.details],
  );
  const componentCounts = useMemo(() => countComponentsByType(components), [components]);
  // Total capacity across the non-connector types, so the Services card reads
  // "deployed / total slots" rather than "healthy / deployed".
  const componentCapacity =
    componentLimits.digitalTwinRegistry + componentLimits.submodelServer;
  const serviceCapacityBadges = [
    {
      key: 'digitalTwinRegistry' as const,
      label: t('componentTypeTwin'),
      count: componentCounts.digitalTwinRegistry,
      limit: componentLimits.digitalTwinRegistry,
    },
    {
      key: 'submodelServer' as const,
      label: t('componentTypeSubmodel'),
      count: componentCounts.submodelServer,
      limit: componentLimits.submodelServer,
    },
  ];

  const healthyConnectors = connectorRows.filter((connector) =>
    isHealthy(connector.status),
  ).length;
  const overallHealth =
    connectorRows.some((connector) => needsAttention(connector.status))
      ? getHealthTone('critical', healthLabels)
      : recommendations.length > 1 || connectorRows.length === 0
      ? getHealthTone('warning', healthLabels)
      : getHealthTone('healthy', healthLabels);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t('monitorTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-gray-500 dark:text-slate-400">
            {t('monitorDescription')}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold text-gray-900 dark:text-slate-100">
            {dataspace.name}
          </p>
          <p className="mt-1 text-gray-500 dark:text-slate-400">
            {dataspace.authorityBpn || t('allSourcesMonitored')}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: t('statusOverallHealthTitle'),
            value: overallHealth.label,
            subtitle: t('statusOverallHealthSubtitle'),
            tone: overallHealth.badge,
          },
          {
            title: t('statusHealthyConnectorsTitle'),
            value: `${healthyConnectors}/${connectorRows.length}`,
            subtitle: t('statusHealthyConnectorsSubtitle'),
            tone: getHealthTone('healthy', healthLabels).badge,
          },
          {
            title: t('statusLinkedServicesTitle'),
            value: `${componentRows.length}/${componentCapacity}`,
            subtitle: serviceCapacityBadges
              .map((badge) => `${badge.label} ${badge.count}/${badge.limit}`)
              .join(' · '),
            tone: getHealthTone(
              componentRows.length === 0 ? 'warning' : 'healthy',
              healthLabels,
            ).badge,
          },
          {
            title: t('statusRecentEventsTitle'),
            value: `${derivedEvents.length}`,
            subtitle:
              activityLogs.length > 0
                ? t('statusRecentEventsSubtitleBackend')
                : t('statusRecentEventsSubtitleDerived'),
            tone: getHealthTone(
              activityLogs.length > 0 ? 'healthy' : 'warning',
              healthLabels,
            ).badge,
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm text-gray-500 dark:text-slate-400">{card.title}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${card.tone}`}>
                {card.value}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-slate-400">
              {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {t('monitorConnectorHealthTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {t('monitorConnectorHealthDescription')}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t('tableName')}</th>
                    <th className="px-5 py-3">{t('tableType')}</th>
                    <th className="px-5 py-3">{t('tableStatus')}</th>
                    <th className="px-5 py-3">{t('tableLastCheck')}</th>
                    <th className="px-5 py-3">{t('tableEndpoint')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {connectorRows.map((connector) => (
                    <tr key={connector.id} className="align-top">
                      <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                        {connector.name}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {connector.connectorType}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connector.tone.badge}`}>
                          {connector.tone.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {formatTimestamp(
                          connector.updated_at || connector.created_at,
                          language,
                          t('statusNoCheckYet'),
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        <span className="block max-w-[260px] truncate">
                          {connector.endpoint || t('noValue')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {connectorRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-sm text-gray-500 dark:text-slate-400"
                      >
                        {t('tableNoConnectors')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                {t('monitorServiceHealthTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {t('monitorServiceHealthDescription')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                  {t('monitorServiceCapacityLabel')}
                </span>
                {serviceCapacityBadges.map((badge) => {
                  const full = badge.count >= badge.limit;
                  return (
                    <span
                      key={badge.key}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        getHealthTone(full ? 'warning' : 'healthy', healthLabels).badge
                      }`}
                    >
                      {badge.label} {badge.count}/{badge.limit}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t('tableName')}</th>
                    <th className="px-5 py-3">{t('tableType')}</th>
                    <th className="px-5 py-3">{t('tableStatus')}</th>
                    <th className="px-5 py-3">{t('tableEndpoint')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {componentRows.map((component) => (
                    <tr key={component.id}>
                      <td className="px-5 py-4 font-medium text-gray-900 dark:text-slate-100">
                        {component.name}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {getManagedComponentLabel(component.type, t)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${component.tone.badge}`}>
                          {component.statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        <span className="block max-w-[260px] truncate">
                          {component.endpointLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {componentRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-sm text-gray-500 dark:text-slate-400"
                      >
                        {t('tableNoServices')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {t('recommendationsTitle')}
            </h3>
            <div className="mt-4 space-y-3">
              {recommendations.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              {t('recentActivityTitle')}
            </h3>
            <div className="mt-4 space-y-4">
              {derivedEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {event.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-slate-300">
                        {event.body}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        getHealthTone(event.severity, healthLabels).badge
                      }`}
                    >
                      {event.severity === 'critical'
                        ? t('statusCritical')
                        : event.severity === 'warning'
                        ? t('statusNotice')
                        : t('statusOkay')}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                    {formatTimestamp(event.timestamp, language, t('statusNoCheckYet'))}
                  </p>
                </div>
              ))}
              {derivedEvents.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {t('monitorNoActivity')}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AppPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{title}</h2>
      <p className="mt-2 max-w-2xl text-gray-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function ExternalAppRedirect({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [url]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            {description}
          </p>
          <p className="mt-4 text-sm text-gray-400 dark:text-slate-500">
            {t('sdeRedirectLinkPrefix')}{' '}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:underline"
            >
              {t('sdeRedirectLinkLabel')}
            </a>
            {t('sdeRedirectLinkSuffix')}
          </p>
        </div>
      </div>
    </div>
  );
}

function Settings({
  onOpenGuide,
  identity,
}: {
  onOpenGuide: () => void;
  identity: SessionIdentity;
}) {
  const { t } = useI18n();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dataspaceDetails, setDataspaceDetails] = useState<DataspaceSettingsPayload | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await dataspaceApi.getDataspace();
        setDataspaceDetails(
          (response.data?.data as DataspaceSettingsPayload | undefined) ?? null,
        );
      } catch (error) {
        console.error('Failed to load dataspace settings:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const formatValue = (value?: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? t('yes') : t('no');
    }

    return value && value.trim().length > 0 ? value : t('noValue');
  };

  const sections = [
    {
      key: 'company',
      title: t('settingsSectionCompany'),
      fields: [
        { label: t('settingsLabelCompanyName'), value: identity.company },
        { label: t('settingsLabelCompanyBpn'), value: identity.bpn },
      ],
    },
    {
      key: 'dataspace',
      title: t('settingsSectionDataspace'),
      fields: [
        { label: t('settingsLabelDataspace'), value: dataspaceDetails?.name },
        { label: t('settingsLabelAuthorityBpn'), value: readAuthorityBpn(dataspaceDetails) },
        { label: t('settingsLabelIdpRealm'), value: dataspaceDetails?.realm },
      ],
    },
    {
      key: 'access',
      title: t('settingsSectionAccess'),
      fields: [
        { label: t('settingsLabelCentralIdpUrl'), value: dataspaceDetails?.centralidp?.url },
        { label: t('settingsLabelCentralIdpRealm'), value: dataspaceDetails?.centralidp?.realm },
        { label: t('settingsLabelSsiWalletUrl'), value: dataspaceDetails?.ssi_wallet?.url },
      ],
    },
    {
      key: 'apps',
      title: t('settingsSectionApps'),
      fields: [
        { label: t('settingsLabelPortalUrl'), value: dataspaceDetails?.portal?.url },
        { label: t('settingsLabelSdeUrl'), value: dataspaceDetails?.sde?.url },
        { label: t('settingsLabelManufacturerId'), value: dataspaceDetails?.sde?.manufacturerId },
      ],
    },
    {
      key: 'discovery',
      title: t('settingsSectionDiscovery'),
      fields: [
        { label: t('settingsLabelSemanticsUrl'), value: dataspaceDetails?.discovery?.semantics_url },
        { label: t('settingsLabelDiscoveryFinder'), value: dataspaceDetails?.discovery?.discovery_finder },
        { label: t('settingsLabelBpnDiscovery'), value: dataspaceDetails?.discovery?.bpn_discovery },
      ],
    },
    {
      key: 'infrastructure',
      title: t('settingsSectionInfrastructure'),
      fields: [
        { label: t('settingsLabelDefaultEdcUrl'), value: dataspaceDetails?.edc?.default_url },
        { label: t('settingsLabelClusterContext'), value: dataspaceDetails?.edc?.cluster_context }
      ],
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('settingsTitle')}</h2>
            <p className="mt-2 max-w-3xl text-gray-500 dark:text-slate-400">{t('settingsDescription')}</p>
          </div>
          
        </div>
      </div>

      <button
        onClick={onOpenGuide}
        className="mb-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/15"
      >
        {t('reopenGuideButton')}
      </button>

      {!settingsLoaded && <p className="text-gray-500 dark:text-slate-400">{t('settingsLoading')}</p>}

      {settingsLoaded && dataspaceDetails && (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.key}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {section.title}
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {t('viewOnly')}
                </span>
              </div>

              <div className="space-y-3">
                {section.fields.map((field) => (
                  <div
                    key={field.label}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">
                      {field.label}
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-800 dark:text-slate-200">
                      {formatValue(field.value)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AppShell() {
  const { t } = useI18n();
  const authDisabled = isAuthDisabled();
  const { identity } = useSessionIdentity();
  const firstName = keycloak.tokenParsed?.given_name || '';
  const lastName = keycloak.tokenParsed?.family_name || '';
  const fullName =
    identity.name ||
    `${firstName} ${lastName}`.trim() ||
    identity.username ||
    keycloak.tokenParsed?.preferred_username ||
    t('userFallback');

  // Explicit env / runtime-config values take precedence over the dataspace
  // config, so a deployment can point these entries somewhere else without
  // changing backend configuration.yml. Backend values are the fallback for
  // when nothing is set here.
  const envSdeUrl = getRuntimeConfigValue(
    import.meta.env.VITE_SDE_URL,
    window.__RUNTIME_CONFIG__?.sdeUrl,
    '',
  );
  const envPortalUrl = getRuntimeConfigValue(
    import.meta.env.VITE_PORTAL_URL,
    window.__RUNTIME_CONFIG__?.portalUrl,
    '',
  );

  const [sdeUrl, setSdeUrl] = useState(envSdeUrl);
  const [portalUrl, setPortalUrl] = useState(envPortalUrl);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === 'dark' ? 'dark' : 'light';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const loadAppUrls = async () => {
      try {
        const response = await dataspaceApi.getDataspace();
        if (!envSdeUrl && response.data?.data?.sde?.url) {
          setSdeUrl(response.data.data.sde.url);
        }
        if (!envPortalUrl && response.data?.data?.portal?.url) {
          setPortalUrl(response.data.data.portal.url);
        }
      } catch (error) {
        console.error('Failed to load external app URLs:', error);
      }
    };

    loadAppUrls();

    const hasSeenWelcome = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!hasSeenWelcome) {
      setShowGuide(true);
    }
  }, []);

  const closeGuide = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    setShowGuide(false);
  };

  return (
    <>
      <BrowserRouter>
        <div className="flex h-[100dvh] overflow-hidden bg-gray-50 dark:bg-slate-950">
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onHelpClick={() => setShowGuide(true)}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header
              user={{
                name: fullName,
                role: t('userAdministrator'),
              }}
              onLogout={authDisabled ? undefined : () => keycloak.logout()}
              onMenuToggle={() => setIsSidebarOpen((current) => !current)}
              onHelpClick={() => setShowGuide(true)}
              theme={theme}
              onThemeToggle={() =>
                setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
              }
            />
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
              <div className="flex min-h-full flex-col">
                <div className="flex-1">
                  <Routes>
                    <Route path="/" element={<Dashboard identity={identity} />} />
                    <Route path="/monitor" element={<Monitor />} />
                    <Route
                      path="/sde"
                      element={(
                        <ExternalAppRedirect
                          url={sdeUrl}
                          title={t('sdeRedirectTitle')}
                          description={t('sdeRedirectDescription')}
                        />
                      )}
                    />
                    <Route
                      path="/portal"
                      element={
                        portalUrl ? (
                          <ExternalAppRedirect
                            url={portalUrl}
                            title={t('portalRedirectTitle')}
                            description={t('portalRedirectDescription')}
                          />
                        ) : (
                          <AppPlaceholder
                            title={t('portalNavLabel')}
                            description={t('portalPlaceholderDescription')}
                          />
                        )
                      }
                    />
                    <Route
                      path="/ich"
                      element={
                        <AppPlaceholder
                          title={t('ichNavLabel')}
                          description={t('ichPlaceholderDescription')}
                        />
                      }
                    />
                    <Route
                      path="/settings"
                      element={(
                        <Settings
                          onOpenGuide={() => setShowGuide(true)}
                          identity={identity}
                        />
                      )}
                    />
                  </Routes>
                </div>
                <footer className="mt-8 bg-black px-6 py-4 text-center text-sm text-white dark:border-t dark:border-slate-800 dark:bg-slate-950">
                  {t('footerCopyright')}
                </footer>
              </div>
            </main>
          </div>
        </div>
      </BrowserRouter>

      <OnboardingGuide open={showGuide} onClose={closeGuide} />
    </>
  );
}

export default function AppNew() {
  return <AppShell />;
}