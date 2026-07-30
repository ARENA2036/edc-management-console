import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {
  Activity,
  Database,
  Plus,
  Server,
  SquareActivity,
} from 'lucide-react';
import { activityApi, connectorApi, dataspaceApi } from './api/client';
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
import OnboardingGuide from './components/OnboardingGuide';
import Tooltip from './components/Tooltip';
import keycloak, { isAuthDisabled } from './auth/keycloak';
import { MAX_CONNECTORS } from './utils/nameRules';

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
};

interface DataspaceSettingsPayload {
  name?: string;
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
    cluster_context?: string;
  };
  deployment?: {
    connector?: {
      defaultVersion?: string;
      availableVersions?: string[];
    };
    digitalTwinRegistry?: {
      defaultVersion?: string;
      availableVersions?: string[];
    };
    submodelServer?: {
      defaultVersion?: string;
      availableVersions?: string[];
    };
  };
}

interface DataspaceSummary {
  name: string;
  bpn: string;
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

interface BpnCandidate {
  path: string;
  value: string;
}

function collectBpnCandidates(
  value: unknown,
  path: string,
  seen = new Set<unknown>(),
): BpnCandidate[] {
  if (!value || seen.has(value)) {
    return [];
  }

  if (typeof value === 'string') {
    const matches = value.toUpperCase().match(/BPNL[A-Z0-9]{12}/g) ?? [];
    return matches.map((match) => ({ path, value: match }));
  }

  if (Array.isArray(value)) {
    seen.add(value);
    return value.flatMap((entry, index) =>
      collectBpnCandidates(entry, `${path}[${index}]`, seen),
    );
  }

  if (typeof value !== 'object') {
    return [];
  }

  seen.add(value);
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) =>
    collectBpnCandidates(nestedValue, `${path}.${key}`, seen),
  );
}

function decodeJwtPayload(token?: string) {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = atob(normalized);
    return JSON.parse(payload) as unknown;
  } catch (error) {
    console.error('Failed to decode JWT payload', error);
    return null;
  }
}

function getSessionBpnCandidates(tokenParsed: unknown, rawToken?: string) {
  const candidates = [
    ...collectBpnCandidates(tokenParsed, 'tokenParsed'),
    ...collectBpnCandidates(decodeJwtPayload(rawToken), 'token'),
  ];

  const unique = new Map<string, BpnCandidate>();
  for (const candidate of candidates) {
    unique.set(`${candidate.path}:${candidate.value}`, candidate);
  }

  return Array.from(unique.values());
}

function readSessionBpn(tokenParsed: unknown, rawToken?: string) {
  return getSessionBpnCandidates(tokenParsed, rawToken)[0]?.value ?? '';
}

function readDataspaceBpn(details: DataspaceSettingsPayload | null | undefined) {
  const explicitBpn = details?.bpn?.trim().toUpperCase();
  if (explicitBpn) {
    return explicitBpn;
  }

  return collectBpnCandidates(details, 'dataspace')[0]?.value ?? '';
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

  const linkedConnectorValue = record.config?.linkedConnector;
  return {
    id: String(record.id),
    name: record.name,
    type: recordType,
    version: record.version || '',
    status: record.status === 'inactive' ? 'Inactive' : 'Active',
    linkedConnector:
      typeof linkedConnectorValue === 'string' ? linkedConnectorValue : '',
    deployedAt: record.updated_at || record.created_at || new Date().toISOString(),
    connectionMode:
      typeof linkedConnectorValue === 'string' && linkedConnectorValue.trim().length > 0
        ? 'new'
        : 'existing',
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

async function fetchDeploymentState() {
  const cached = getCachedDeployments();

  try {
    const response = await connectorApi.getAll();
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
    return { connectors, components };
  } catch (error) {
    console.error('Failed to load deployments:', error);
    return cached;
  }
}

async function fetchActivityLogs() {
  try {
    const response = await activityApi.getRecentLogs(20);
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to load activity logs:', error);
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
      bpn: readDataspaceBpn(data),
      details: data,
    };
  } catch (error) {
    console.error('Failed to load dataspace:', error);
    return {
      name: fallbackName,
      bpn: '',
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
  if (status === 'healthy' || status === 'Active') {
    return {
      label: labels.healthy,
      badge:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    };
  }

  if (status === 'warning') {
    return {
      label: labels.warning,
      badge:
        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    };
  }

  if (status === 'inactive' || status === 'unhealthy' || status === 'critical') {
    return {
      label: labels.critical,
      badge:
        'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    };
  }

  return {
    label: labels.unknown,
    badge:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
}

function Dashboard({ sessionBpn }: { sessionBpn: string }) {
  const { t } = useI18n();
  const [connectors, setConnectors] = useState<DashboardConnector[]>([]);
  const [components, setComponents] = useState<ManagedComponent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dataspaceName, setDataspaceName] = useState(t('dataspaceFallback'));
  const [dataspaceBpn, setDataspaceBpn] = useState('');
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
  const [componentWizardDefaults, setComponentWizardDefaults] = useState<{
    linkedConnector?: string;
    allowMultipleTypes?: boolean;
    initialSelectedTypes?: ComponentType[];
    startAtConfiguration?: boolean;
  }>({});
  const connectorLimitReached = connectors.length >= MAX_CONNECTORS;

  const loadDeployments = useCallback(async () => {
    const deploymentState = await fetchDeploymentState();
    setConnectors(deploymentState.connectors);
    setComponents(deploymentState.components);
  }, []);

  const loadActivityLogs = async () => {
    const logs = await fetchActivityLogs();
    setActivityLogs(logs);
  };

  const loadDataspace = useCallback(async () => {
    const summary = await fetchDataspaceSummary(t('dataspaceFallback'));
    setDataspaceName(summary.name);
    setDataspaceBpn(summary.bpn || sessionBpn);
    setDataspaceDetails(summary.details);
  }, [sessionBpn, t]);

  useEffect(() => {
    loadDeployments();
    loadActivityLogs();
    loadDataspace();

    const interval = setInterval(() => {
      loadDeployments();
      loadActivityLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDataspace, loadDeployments, sessionBpn, t]);

  const persistConnector = async (connector: DashboardConnector) => {
    if (connectors.some((current) => current.name === connector.name)) {
      return false;
    }

    if (connectors.length >= MAX_CONNECTORS) {
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
      await connectorApi.create({
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
              db_password: connector.db_password || `${connector.name}-password`,
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
    } catch {
      setDeploymentFeedback({
        open: true,
        status: 'error',
        resource: 'connector',
        itemCount: 1,
      });
    } finally {
      setConnectorDeploymentInFlight(false);
    }
  };

  const handleDeleteConnector = async (connector: DashboardConnector) => {
    try {
      await connectorApi.delete(connector.name);
      const synced = await fetchDeploymentState();
      setConnectors(synced.connectors);
      setComponents(synced.components);
    } catch (error) {
      console.error('Failed to delete connector:', error);
    }
  };

  const handleDeployComponent = async (component: ManagedComponent) => {
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
      await connectorApi.create({
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
    try {
      await connectorApi.delete(componentToDelete.name);
      const synced = await fetchDeploymentState();
      setConnectors(synced.connectors);
      setComponents(synced.components);
    } catch (error) {
      console.error('Failed to delete component:', error);
    }
  };

  const openComponentWizard = (linkedConnector?: string) => {
    setComponentWizardDefaults({
      linkedConnector,
      allowMultipleTypes: true,
    });
    setShowComponentWizard(true);
  };

  const activeConnectors = useMemo(
    () =>
      connectors.filter(
        (connector) => connector.status !== 'inactive' && connector.status !== 'unhealthy',
      ).length,
    [connectors],
  );

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

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            icon={<Database size={22} />}
            title={t('dataSpace')}
            value={dataspaceName}
            subtitle={dataspaceBpn || t('allSourcesMonitored')}
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
            value={`${connectors.length}/${MAX_CONNECTORS}`}
            subtitle={`${activeConnectors} ${t('activeShort')}`}
            variant="info"
            tooltipTitle={statsGuidance.connectors.title}
            tooltipContent={statsGuidance.connectors.content}
            tooltipFooter={statsGuidance.connectors.footer}
          />
        </div>

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

        <div className="space-y-6">
          <ConnectorsManager
            connectors={connectors}
            components={components}
            onDelete={handleDeleteConnector}
            onAddComponent={(connector) => openComponentWizard(connector.name)}
          />
          <ComponentsManager
            components={components}
            onDelete={handleDeleteComponent}
          />
        </div>
      </div>

      <AddComponentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        connectorCount={connectors.length}
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
        prefilledBpn={dataspaceBpn || sessionBpn}
        defaultApiEndpoint={
          dataspaceDetails?.edc?.controlplane_url || dataspaceDetails?.edc?.default_url
        }
        defaultDataPlaneUrl={dataspaceDetails?.edc?.dataplane_url}
      />

      <ComponentWizard
        open={showComponentWizard}
        onOpenChange={(open) => {
          setShowComponentWizard(open);
          if (!open) {
            setComponentWizardDefaults({});
          }
        }}
        connectors={connectors}
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
          } catch {
            setDeploymentFeedback({
              open: true,
              status: 'error',
              resource: 'component',
              itemCount: 1,
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
        initialLinkedConnector={componentWizardDefaults.linkedConnector}
        allowMultipleTypes={componentWizardDefaults.allowMultipleTypes}
        initialSelectedTypes={componentWizardDefaults.initialSelectedTypes}
        startAtConfiguration={componentWizardDefaults.startAtConfiguration}
      />

      <DeploymentStatusModal
        open={deploymentFeedback.open}
        status={deploymentFeedback.status}
        resource={deploymentFeedback.resource}
        itemCount={deploymentFeedback.itemCount}
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
    bpn: '',
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
        const linkedComponents = components.filter(
          (component) => component.linkedConnector === connector.name,
        );
        const tone = getHealthTone(connector.status, healthLabels);
        return {
          ...connector,
          connectorType:
            getConnectorType(connector) === 'EDC Connector'
              ? t('connectorTypeDefault')
              : getConnectorType(connector),
          endpoint: getConnectorEndpoint(connector),
          linkedComponents,
          tone,
        };
      }),
    [components, connectors, healthLabels, t],
  );

  const componentRows = useMemo(
    () =>
      components.map((component) => {
        const linkedConnector = component.linkedConnector
          ? connectors.find((connector) => connector.name === component.linkedConnector)
          : undefined;
        const isStandalone = !component.linkedConnector;
        const status =
          isStandalone
            ? 'healthy'
            : !linkedConnector
            ? 'critical'
            : linkedConnector.status === 'unhealthy'
            ? 'warning'
            : 'healthy';

        return {
          ...component,
          endpointLabel:
            component.endpoint
            || (isStandalone ? t('standaloneDeployment') : t('deployedInsideConnector')),
          statusCode: status,
          tone: getHealthTone(status, healthLabels),
          statusLabel:
            isStandalone
              ? t('standaloneReady')
              : status === 'critical'
              ? t('connectorMissing')
              : status === 'warning'
              ? t('connectorNeedsReview')
              : t('connectorReady'),
        };
      }),
    [components, connectors, healthLabels, t],
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
      body:
        connector.status === 'unhealthy'
          ? t('eventConnectorAvailableUnhealthy')
          : t('eventConnectorAvailableHealthy'),
      timestamp: connector.created_at,
      severity: connector.status === 'unhealthy' ? 'critical' : 'healthy',
    }));

    const componentEvents = components.slice(0, 4).map((component) => ({
      id: `component-${component.id}`,
      title: t('eventComponentLinked', { name: component.name }),
      body: t('eventComponentLinkedBody', {
        type: getManagedComponentLabel(component.type, t),
        connector: component.linkedConnector || t('standaloneLabel'),
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
    const unhealthyConnectors = connectorRows.filter(
      (connector) => connector.status === 'unhealthy',
    );
    const connectorsWithoutServices = connectorRows.filter(
      (connector) => connector.linkedComponents.length === 0,
    );
    const detachedComponents = componentRows.filter(
      (component) => component.statusCode === 'critical',
    );

    if (unhealthyConnectors.length > 0) {
      items.push(
        t('recommendationUnhealthyConnectors', {
          count: String(unhealthyConnectors.length),
        }),
      );
    }

    if (connectorsWithoutServices.length > 0) {
      items.push(
        t('recommendationConnectorsWithoutServices', {
          count: String(connectorsWithoutServices.length),
        }),
      );
    }

    if (detachedComponents.length > 0) {
      items.push(
        t('recommendationDetachedComponents', {
          count: String(detachedComponents.length),
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
  }, [componentRows, connectorRows, t]);

  const healthyConnectors = connectorRows.filter(
    (connector) => connector.status !== 'inactive' && connector.status !== 'unhealthy',
  ).length;
  const healthyComponents = componentRows.filter(
    (component) => component.statusCode === 'healthy',
  ).length;
  const overallHealth =
    connectorRows.some((connector) => connector.status === 'unhealthy')
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
            {dataspace.bpn || t('allSourcesMonitored')}
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
            value: `${healthyComponents}/${componentRows.length}`,
            subtitle: t('statusLinkedServicesSubtitle'),
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
                    <th className="px-5 py-3">{t('tableServices')}</th>
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
                          {connector.status === 'unhealthy'
                            ? t('monitorConnectorCritical')
                            : t('monitorConnectorActive')}
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
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {connector.linkedComponents.length}
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
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t('tableName')}</th>
                    <th className="px-5 py-3">{t('tableType')}</th>
                    <th className="px-5 py-3">{t('tableLinkedTo')}</th>
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
                        {component.linkedConnector}
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

function SDE({ sdeUrl }: { sdeUrl: string }) {
  const { t } = useI18n();

  useEffect(() => {
    if (sdeUrl) {
      window.open(sdeUrl, '_blank');
    }
  }, [sdeUrl]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t('sdeRedirectTitle')}
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            {t('sdeRedirectDescription')}
          </p>
          <p className="mt-4 text-sm text-gray-400 dark:text-slate-500">
            {t('sdeRedirectLinkPrefix')}{' '}
            <a href={sdeUrl} className="text-orange-500 hover:underline">
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
  sessionBpn,
}: {
  onOpenGuide: () => void;
  sessionBpn: string;
}) {
  const { t } = useI18n();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dataspaceDetails, setDataspaceDetails] = useState<DataspaceSettingsPayload | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await dataspaceApi.getDataspace();
        const details =
          (response.data?.data as DataspaceSettingsPayload | undefined) ?? null;
        setDataspaceDetails(
          details
            ? {
                ...details,
                bpn: readDataspaceBpn(details) || sessionBpn,
              }
            : null,
        );
      } catch (error) {
        console.error('Failed to load dataspace settings:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, [sessionBpn]);

  const formatValue = (value?: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? t('yes') : t('no');
    }

    return value && value.trim().length > 0 ? value : t('noValue');
  };

  const sections = [
    {
      key: 'dataspace',
      title: t('settingsSectionDataspace'),
      fields: [
        { label: t('settingsLabelDataspace'), value: dataspaceDetails?.name },
        { label: t('settingsLabelBpn'), value: dataspaceDetails?.bpn },
        { label: t('settingsLabelRealm'), value: dataspaceDetails?.realm },
        { label: t('settingsLabelReadonly'), value: dataspaceDetails?.readonly },
      ],
    },
    {
      key: 'access',
      title: t('settingsSectionAccess'),
      fields: [
        { label: t('settingsLabelDefaultUsername'), value: dataspaceDetails?.username },
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
        { label: t('settingsLabelSdeClientId'), value: dataspaceDetails?.sde?.client_id },
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
        { label: t('settingsLabelClusterContext'), value: dataspaceDetails?.edc?.cluster_context },
        { label: t('settingsLabelProviderEdc'), value: dataspaceDetails?.sde?.providerEDC },
        { label: t('settingsLabelConsumerEdc'), value: dataspaceDetails?.sde?.consumerEDC },
        { label: t('settingsLabelRegistryUrl'), value: dataspaceDetails?.sde?.registryUrl },
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
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-800 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
            {t('settingsReadonlyNotice')}
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
  const firstName = keycloak.tokenParsed?.given_name || '';
  const lastName = keycloak.tokenParsed?.family_name || '';
  const fullName =
    `${firstName} ${lastName}`.trim() ||
    keycloak.tokenParsed?.preferred_username ||
    t('userFallback');
  const sessionBpnCandidates = getSessionBpnCandidates(
    keycloak.tokenParsed,
    keycloak.token,
  );
  const sessionBpn = readSessionBpn(keycloak.tokenParsed, keycloak.token);

  const [sdeUrl, setSdeUrl] = useState(
    getRuntimeConfigValue(
      import.meta.env.VITE_SDE_URL,
      window.__RUNTIME_CONFIG__?.sdeUrl,
      '',
    ),
  );
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
    if (sessionBpnCandidates.length > 0) {
      console.info(
        '[EMC] Keycloak BPNL candidates detected:',
        sessionBpnCandidates,
      );
    } else {
      console.warn(
        '[EMC] No BPNL candidate found in Keycloak token payload.',
        keycloak.tokenParsed,
      );
    }
  }, [sessionBpnCandidates]);

  useEffect(() => {
    const loadSdeUrl = async () => {
      try {
        const response = await dataspaceApi.getDataspace();
        if (response.data?.data?.sde?.url) {
          setSdeUrl(response.data.data.sde.url);
        }
      } catch (error) {
        console.error('Failed to load SDE URL:', error);
      }
    };

    loadSdeUrl();

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
                    <Route path="/" element={<Dashboard sessionBpn={sessionBpn} />} />
                    <Route path="/monitor" element={<Monitor />} />
                    <Route path="/sde" element={<SDE sdeUrl={sdeUrl} />} />
                    <Route
                      path="/portal"
                      element={
                        <AppPlaceholder
                          title={t('portalNavLabel')}
                          description={t('portalPlaceholderDescription')}
                        />
                      }
                    />
                    <Route
                      path="/dataspace-os"
                      element={
                        <AppPlaceholder
                          title={t('dataspaceOsNavLabel')}
                          description={t('dataspaceOsPlaceholderDescription')}
                        />
                      }
                    />
                    <Route
                      path="/settings"
                      element={(
                        <Settings
                          onOpenGuide={() => setShowGuide(true)}
                          sessionBpn={sessionBpn}
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
