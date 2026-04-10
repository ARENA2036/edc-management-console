import { useEffect, useMemo, useState } from 'react';
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
import ConnectorsManager from './components/ConnectorsManager';
import ComponentsManager from './components/ComponentsManager';
import OnboardingGuide from './components/OnboardingGuide';
import Tooltip from './components/Tooltip';
import keycloak from './auth/keycloak';

const CONNECTORS_STORAGE_KEY = 'connectors';
const COMPONENTS_STORAGE_KEY = 'components';
const WELCOME_STORAGE_KEY = 'hasSeenWelcome';
const THEME_STORAGE_KEY = 'dashboard_theme';

type ThemeMode = 'light' | 'dark';

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
    cluster_context?: string;
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

async function fetchConnectors() {
  const cachedConnectors = readLocalStorage<DashboardConnector[]>(
    CONNECTORS_STORAGE_KEY,
    [],
  );

  try {
    const response = await connectorApi.getAll();
    const apiConnectors = Array.isArray(response.data.data)
      ? (response.data.data as DashboardConnector[])
      : [];
    const merged = mergeConnectors(
      apiConnectors.map((connector) => ({
        ...connector,
        source: 'api' as const,
      })),
      cachedConnectors,
    );
    saveLocalStorage(CONNECTORS_STORAGE_KEY, merged);
    return merged;
  } catch (error) {
    console.error('Failed to load connectors:', error);
    return cachedConnectors;
  }
}

function fetchComponents() {
  return readLocalStorage<ManagedComponent[]>(COMPONENTS_STORAGE_KEY, []);
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
      bpn: data?.bpn || '',
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
) {
  if (!value) {
    return language === 'de' ? 'Noch kein Check' : 'No check yet';
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

function getHealthTone(status: string) {
  if (status === 'healthy' || status === 'Active') {
    return {
      label: 'Healthy',
      badge:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    };
  }

  if (status === 'warning') {
    return {
      label: 'Warning',
      badge:
        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    };
  }

  if (status === 'inactive' || status === 'unhealthy' || status === 'critical') {
    return {
      label: 'Critical',
      badge:
        'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    };
  }

  return {
    label: 'Unknown',
    badge:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
}

function mergeConnectors(
  apiConnectors: DashboardConnector[],
  cachedConnectors: DashboardConnector[],
) {
  const cachedByName = new Map(
    cachedConnectors.map((connector) => [connector.name, connector]),
  );

  const merged = apiConnectors.map((connector) => {
    const cached = cachedByName.get(connector.name);
    return {
      ...cached,
      ...connector,
      config: cached?.config ?? connector.config,
      urls: connector.urls.length > 0 ? connector.urls : cached?.urls ?? [],
      cp_hostname: connector.cp_hostname ?? cached?.cp_hostname,
      dp_hostname: connector.dp_hostname ?? cached?.dp_hostname,
      source: 'api' as const,
    };
  });

  const apiNames = new Set(apiConnectors.map((connector) => connector.name));
  const localOnly = cachedConnectors
    .filter((connector) => !apiNames.has(connector.name))
    .map((connector) => ({
      ...connector,
      source: 'local' as const,
    }));

  return [...merged, ...localOnly];
}

function Dashboard({ sessionBpn }: { sessionBpn: string }) {
  const { language, t } = useI18n();
  const [connectors, setConnectors] = useState<DashboardConnector[]>([]);
  const [components, setComponents] = useState<ManagedComponent[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dataspaceName, setDataspaceName] = useState(t('dataspaceFallback'));
  const [dataspaceBpn, setDataspaceBpn] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeploymentWizard, setShowDeploymentWizard] = useState(false);
  const [showComponentWizard, setShowComponentWizard] = useState(false);
  const [componentWizardDefaults, setComponentWizardDefaults] = useState<{
    linkedConnector?: string;
  }>({});

  const loadConnectors = async () => {
    const loadedConnectors = await fetchConnectors();
    setConnectors(loadedConnectors);
  };

  const loadComponents = () => {
    const storedComponents = fetchComponents();
    setComponents(storedComponents);
  };

  const loadActivityLogs = async () => {
    const logs = await fetchActivityLogs();
    setActivityLogs(logs);
  };

  const loadDataspace = async () => {
    const summary = await fetchDataspaceSummary(t('dataspaceFallback'));
    setDataspaceName(summary.name);
    setDataspaceBpn(summary.bpn);
  };

  useEffect(() => {
    loadConnectors();
    loadComponents();
    loadActivityLogs();
    loadDataspace();

    const interval = setInterval(() => {
      loadConnectors();
      loadActivityLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, [t]);

  const persistConnector = async (connector: DashboardConnector) => {
    const updatedConnectors = mergeConnectors([], [
      ...readLocalStorage<DashboardConnector[]>(CONNECTORS_STORAGE_KEY, []),
      connector,
    ]);
    saveLocalStorage(CONNECTORS_STORAGE_KEY, updatedConnectors);
    setConnectors(updatedConnectors);

    try {
      await connectorApi.create({
        name: connector.name,
        url: connector.url,
        bpn: connector.bpn,
        version: connector.version,
        db_username: connector.db_username,
        db_password: connector.db_password,
        registry: connector.registry,
        submodel: connector.submodel,
        config: connector.config,
      });
    } catch (error) {
      console.error('Failed to deploy connector:', error);
    }

    await loadConnectors();
  };

  const handleDeployConnector = async (connector: DashboardConnector) => {
    await persistConnector(connector);
    setShowDeploymentWizard(false);
  };

  const handleDeployConnectorAndAddComponent = async (
    connector: DashboardConnector,
  ) => {
    await persistConnector(connector);
    setShowDeploymentWizard(false);
    setComponentWizardDefaults({ linkedConnector: connector.name });
    setShowComponentWizard(true);
  };

  const handleDeleteConnector = async (connector: DashboardConnector) => {
    const remaining = connectors.filter((item) => item.name !== connector.name);
    const remainingComponents = components.filter(
      (component) => component.linkedConnector !== connector.name,
    );

    setConnectors(remaining);
    saveLocalStorage(CONNECTORS_STORAGE_KEY, remaining);
    setComponents(remainingComponents);
    saveLocalStorage(COMPONENTS_STORAGE_KEY, remainingComponents);

    if (connector.source !== 'local') {
      try {
        await connectorApi.delete(connector.name);
      } catch (error) {
        console.error('Failed to delete connector:', error);
      }
    }
  };

  const handleDeployComponent = (component: ManagedComponent) => {
    const updatedComponents = [component, ...components];
    setComponents(updatedComponents);
    saveLocalStorage(COMPONENTS_STORAGE_KEY, updatedComponents);
    setShowComponentWizard(false);
  };

  const handleDeleteComponent = (componentId: string) => {
    const updatedComponents = components.filter((component) => component.id !== componentId);
    setComponents(updatedComponents);
    saveLocalStorage(COMPONENTS_STORAGE_KEY, updatedComponents);
  };

  const openComponentWizard = (linkedConnector?: string) => {
    setComponentWizardDefaults(
      linkedConnector ? { linkedConnector } : {},
    );
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
  const statsGuidance =
    language === 'de'
      ? {
          dataSpace: {
            title: 'Data Space Information',
            content:
              'Diese Karte zeigt den aktuell geladenen Dataspace-Namen und oft die wichtigste Kennung für Ihre Umgebung.',
            footer:
              'Wenn hier Werte fehlen, prüfen Sie die Dataspace Settings oder die zentrale Plattform-Konfiguration.',
          },
          health: {
            title: 'System-Status verstehen',
            content:
              'Hier sehen Nutzer auf einen Blick, ob die Konsole und die verbundenen Funktionen grundsätzlich gesund erscheinen.',
            footer:
              'Nutzen Sie diese Karte als erste Orientierung, bevor Sie tiefer in Connectoren oder Services einsteigen.',
          },
          activity: {
            title: 'Aktivitäten verfolgen',
            content:
              'Diese Karte hilft zu erkennen, ob im Hintergrund Logs, Synchronisierung oder andere Prozesse stattfinden.',
            footer:
              'Wenn etwas unerwartet wirkt, vergleichen Sie die Aktivität mit den Tabellen darunter.',
          },
          connectors: {
            title: 'Connector-Übersicht',
            content:
              'Zeigt, wie viele EDC Connectoren aktuell bekannt sind und wie viele davon aktiv wirken.',
            footer:
              'Ein guter Startpunkt für Nutzer ohne Technik-Erfahrung: erst hier prüfen, dann über Add+ neue Connectoren anlegen.',
          },
          add: {
            title: 'Neue Elemente anlegen',
            content:
              'Nach dem Klick wählen Sie zwischen EDC Connector und Component/Service. Danach führt Sie ein Wizard Schritt für Schritt durch die benötigten Angaben.',
            items: [
              'EDC Connector: sinnvoll, wenn Sie eine neue Datenaustausch-Instanz bereitstellen möchten.',
              'Component / Service: sinnvoll, wenn Sie einen bestehenden Connector um einen Fachservice ergänzen möchten.',
              'Benötigte Werte wie URLs oder Zugangsdaten kommen oft aus Plattform-Dokumentation, vom DevOps-Team oder vom Service-Verantwortlichen.',
            ],
            footer:
              'Wenn Sie unsicher sind, starten Sie mit einem Connector und verknüpfen Sie Services erst danach.',
          },
        }
      : {
          dataSpace: {
            title: 'Understand the data space',
            content:
              'This card shows the loaded dataspace name and often the main identifier for the environment you are working in.',
            footer:
              'If values are missing here, check Datasource Settings or the central platform configuration.',
          },
          health: {
            title: 'Read system health',
            content:
              'Users can quickly see whether the console and its connected capabilities appear generally healthy.',
            footer:
              'Use this as a first orientation point before diving into connectors or services.',
          },
          activity: {
            title: 'Follow activity',
            content:
              'This card helps users understand whether logs, synchronization or background processes are currently active.',
            footer:
              'If something looks unusual, compare the activity state with the tables below.',
          },
          connectors: {
            title: 'Connector overview',
            content:
              'Shows how many EDC connectors are currently known and how many appear active.',
            footer:
              'A strong starting point for non-technical users: check this card first, then use Add+ if you need a new connector.',
          },
          add: {
            title: 'Create something new',
            content:
              'After clicking, the app asks whether you want an EDC connector or a component/service, then guides you step by step through the required information.',
            items: [
              'EDC Connector: use when you want to deploy a new data exchange instance.',
              'Component / Service: use when you want to attach a business or platform service to an existing connector.',
              'Values such as URLs or credentials usually come from platform docs, the DevOps team, or the service owner.',
            ],
            footer:
              'If you are unsure, start with a connector first and add components afterwards.',
          },
        };

  return (
    <>
      <div className="p-4 md:p-6">
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
            value={connectors.length.toString()}
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
              ADD
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

      <div className="bg-black px-6 py-4 text-center text-sm text-white dark:border-t dark:border-slate-800 dark:bg-slate-950">
        {t('footerCopyright')}
      </div>

      <AddComponentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSelectEDC={() => {
          setShowAddDialog(false);
          setShowDeploymentWizard(true);
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
        onDeployAndAddComponent={handleDeployConnectorAndAddComponent}
        prefilledBpn={dataspaceBpn || sessionBpn}
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
        onDeploy={handleDeployComponent}
        initialLinkedConnector={componentWizardDefaults.linkedConnector}
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
        fetchConnectors(),
        fetchActivityLogs(),
        fetchDataspaceSummary(t('dataspaceFallback')),
      ]);
      const loadedComponents = fetchComponents();

      if (!active) {
        return;
      }

      setConnectors(loadedConnectors);
      setComponents(loadedComponents);
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

  const connectorRows = useMemo(
    () =>
      connectors.map((connector) => {
        const linkedComponents = components.filter(
          (component) => component.linkedConnector === connector.name,
        );
        const tone = getHealthTone(connector.status);
        return {
          ...connector,
          connectorType: getConnectorType(connector),
          endpoint: getConnectorEndpoint(connector),
          linkedComponents,
          tone,
        };
      }),
    [components, connectors],
  );

  const componentRows = useMemo(
    () =>
      components.map((component) => {
        const linkedConnector = connectors.find(
          (connector) => connector.name === component.linkedConnector,
        );
        const hasEndpoint = component.connectionMode !== 'existing' || Boolean(component.endpoint);
        const status =
          !linkedConnector
            ? 'critical'
            : linkedConnector.status === 'unhealthy'
            ? 'warning'
            : hasEndpoint
            ? 'healthy'
            : 'warning';

        return {
          ...component,
          endpointLabel: component.endpoint || (language === 'de' ? 'Im Connector deployt' : 'Deployed inside connector'),
          tone: getHealthTone(status),
          statusLabel:
            status === 'critical'
              ? language === 'de'
                ? 'Connector fehlt'
                : 'Connector missing'
              : status === 'warning'
              ? language === 'de'
                ? 'Prüfung empfohlen'
                : 'Needs review'
              : language === 'de'
              ? 'Bereit'
              : 'Ready',
        };
      }),
    [components, connectors, language],
  );

  const derivedEvents = useMemo(() => {
    if (activityLogs.length > 0) {
      return activityLogs
        .slice(0, 8)
        .map((log) => ({
          id: `log-${log.id}`,
          title: log.action || (language === 'de' ? 'Aktivität' : 'Activity'),
          body:
            log.details ||
            log.connector_name ||
            (language === 'de'
              ? 'Backend-Aktivität wurde erfasst.'
              : 'Backend activity was recorded.'),
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
      title:
        language === 'de'
          ? `Connector bereit: ${connector.name}`
          : `Connector available: ${connector.name}`,
      body:
        connector.status === 'unhealthy'
          ? language === 'de'
            ? 'Der letzte bekannte Zustand ist kritisch. Prüfen Sie Endpoint und Plattform-Erreichbarkeit.'
            : 'The last known state is critical. Check endpoint and platform reachability.'
          : language === 'de'
          ? 'Der Connector ist im Dashboard bekannt und kann für weitere Services genutzt werden.'
          : 'The connector is known in the dashboard and can be used for additional services.',
      timestamp: connector.created_at,
      severity: connector.status === 'unhealthy' ? 'critical' : 'healthy',
    }));

    const componentEvents = components.slice(0, 4).map((component) => ({
      id: `component-${component.id}`,
      title:
        language === 'de'
          ? `Komponente verknüpft: ${component.name}`
          : `Component linked: ${component.name}`,
      body:
        language === 'de'
          ? `${component.type} ist mit ${component.linkedConnector} verbunden.`
          : `${component.type} is linked to ${component.linkedConnector}.`,
      timestamp: component.deployedAt,
      severity: 'healthy',
    }));

    return [...connectorEvents, ...componentEvents]
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 8);
  }, [activityLogs, components, connectors, language]);

  const recommendations = useMemo(() => {
    const items: string[] = [];
    const unhealthyConnectors = connectorRows.filter(
      (connector) => connector.status === 'unhealthy',
    );
    const connectorsWithoutServices = connectorRows.filter(
      (connector) => connector.linkedComponents.length === 0,
    );
    const detachedComponents = componentRows.filter(
      (component) => component.statusLabel === (language === 'de' ? 'Connector fehlt' : 'Connector missing'),
    );

    if (unhealthyConnectors.length > 0) {
      items.push(
        language === 'de'
          ? `${unhealthyConnectors.length} Connector(en) melden einen kritischen Zustand. Prüfen Sie Endpoint und Cluster-Erreichbarkeit zuerst.`
          : `${unhealthyConnectors.length} connector(s) report a critical state. Check endpoint and cluster reachability first.`,
      );
    }

    if (connectorsWithoutServices.length > 0) {
      items.push(
        language === 'de'
          ? `${connectorsWithoutServices.length} Connector(en) haben noch keinen verknüpften Service. Falls Sie mit DTR oder Submodel Service arbeiten möchten, können Sie diese jetzt als Komponente hinzufügen oder einen bestehenden Service verbinden.`
          : `${connectorsWithoutServices.length} connector(s) do not have a linked service yet. If you want to work with DTR or a Submodel Service, you can add a component now or connect an existing service.`,
      );
    }

    if (detachedComponents.length > 0) {
      items.push(
        language === 'de'
          ? `${detachedComponents.length} Komponente(n) verweisen auf einen fehlenden Connector. Bereinigen oder verknüpfen Sie diese erneut.`
          : `${detachedComponents.length} component(s) reference a missing connector. Clean them up or relink them.`,
      );
    }

    if (connectorRows.length === 0) {
      items.push(
        language === 'de'
          ? 'Es gibt noch keine Connectoren. Beginnen Sie mit ADD und deployen Sie Ihren ersten EDC Connector.'
          : 'There are no connectors yet. Start with ADD and deploy your first EDC connector.',
      );
    }

    if (items.length === 0) {
      items.push(
        language === 'de'
          ? 'Ihre überwachten Ressourcen wirken aktuell stabil. Nutzen Sie Monitoring für regelmäßige Checks und Trendbeobachtung.'
          : 'Your monitored resources currently look stable. Use monitoring for regular checks and trend observation.',
      );
    }

    return items;
  }, [componentRows, connectorRows, language]);

  const healthyConnectors = connectorRows.filter(
    (connector) => connector.status !== 'inactive' && connector.status !== 'unhealthy',
  ).length;
  const healthyComponents = componentRows.filter(
    (component) => component.statusLabel === (language === 'de' ? 'Bereit' : 'Ready'),
  ).length;
  const overallHealth =
    connectorRows.some((connector) => connector.status === 'unhealthy')
      ? getHealthTone('critical')
      : recommendations.length > 1 || connectorRows.length === 0
      ? getHealthTone('warning')
      : getHealthTone('healthy');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t('monitorTitle')}
          </h2>
          <p className="mt-2 max-w-3xl text-gray-500 dark:text-slate-400">
            {language === 'de'
              ? 'Überwachen Sie Connectoren, verknüpfte Services, letzte Aktivitäten und empfohlene nächste Schritte in einer Betriebsansicht.'
              : 'Monitor connectors, linked services, recent activity and recommended next steps in one operational view.'}
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
            title: language === 'de' ? 'Gesamtstatus' : 'Overall health',
            value: overallHealth.label,
            subtitle:
              language === 'de'
                ? 'Kombiniert Connector-, Service- und Warnungsstatus'
                : 'Combines connector, service and warning state',
            tone: overallHealth.badge,
          },
          {
            title: language === 'de' ? 'Aktive Connectoren' : 'Healthy connectors',
            value: `${healthyConnectors}/${connectorRows.length}`,
            subtitle:
              language === 'de'
                ? 'Connectoren mit gesundem oder aktivem Zustand'
                : 'Connectors in healthy or active state',
            tone: getHealthTone('healthy').badge,
          },
          {
            title: language === 'de' ? 'Verknüpfte Services' : 'Linked services',
            value: `${healthyComponents}/${componentRows.length}`,
            subtitle:
              language === 'de'
                ? 'Services mit vorhandenem Connector und nutzbarer Konfiguration'
                : 'Services with an available connector and usable setup',
            tone: getHealthTone(componentRows.length === 0 ? 'warning' : 'healthy').badge,
          },
          {
            title: language === 'de' ? 'Letzte Ereignisse' : 'Recent events',
            value: `${derivedEvents.length}`,
            subtitle:
              activityLogs.length > 0
                ? language === 'de'
                  ? 'Direkt aus dem Backend-Log geladen'
                  : 'Loaded directly from backend activity logs'
                : language === 'de'
                ? 'Aus bekannten Connector- und Komponenten-Daten abgeleitet'
                : 'Derived from known connector and component data',
            tone: getHealthTone(activityLogs.length > 0 ? 'healthy' : 'warning').badge,
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
                {language === 'de' ? 'Connector Health' : 'Connector health'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {language === 'de'
                  ? 'Status, Reaktionsfähigkeit und Abhängigkeiten Ihrer EDC Connectoren.'
                  : 'Status, responsiveness and dependencies of your EDC connectors.'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{t('tableName')}</th>
                    <th className="px-5 py-3">{t('tableType')}</th>
                    <th className="px-5 py-3">{t('tableStatus')}</th>
                    <th className="px-5 py-3">{language === 'de' ? 'Letzter Stand' : 'Last check'}</th>
                    <th className="px-5 py-3">{t('tableEndpoint')}</th>
                    <th className="px-5 py-3">{language === 'de' ? 'Services' : 'Services'}</th>
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
                            ? language === 'de'
                              ? 'Kritisch'
                              : 'Critical'
                            : language === 'de'
                            ? 'Aktiv'
                            : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {formatTimestamp(
                          connector.updated_at || connector.created_at,
                          language,
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
                        {language === 'de'
                          ? 'Noch keine Connectoren vorhanden.'
                          : 'No connectors available yet.'}
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
                {language === 'de' ? 'Service Health' : 'Service health'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {language === 'de'
                  ? 'Überblick über DTR- und Submodel-Services sowie deren Verknüpfung zum Connector.'
                  : 'Overview of DTR and submodel services and how they are linked to connectors.'}
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
                        {component.type}
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
                        {language === 'de'
                          ? 'Noch keine verknüpften Services vorhanden.'
                          : 'No linked services available yet.'}
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
              {language === 'de' ? 'Empfehlungen' : 'Recommendations'}
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
              {language === 'de' ? 'Letzte Aktivitäten' : 'Recent activity'}
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
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getHealthTone(event.severity).badge}`}>
                      {event.severity === 'critical'
                        ? language === 'de'
                          ? 'Kritisch'
                          : 'Critical'
                        : event.severity === 'warning'
                        ? language === 'de'
                          ? 'Hinweis'
                          : 'Notice'
                        : language === 'de'
                        ? 'Okay'
                        : 'OK'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                    {formatTimestamp(event.timestamp, language)}
                  </p>
                </div>
              ))}
              {derivedEvents.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {language === 'de'
                    ? 'Noch keine Aktivitätsdaten vorhanden.'
                    : 'No activity data available yet.'}
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
            Redirecting to SDE Application...
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            You will be redirected to the Simple Data Exchanger application.
          </p>
          <p className="mt-4 text-sm text-gray-400 dark:text-slate-500">
            If you are not redirected,{' '}
            <a href={sdeUrl} className="text-orange-500 hover:underline">
              click here
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function Settings({ onOpenGuide }: { onOpenGuide: () => void }) {
  const { language, t } = useI18n();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dataspaceDetails, setDataspaceDetails] = useState<DataspaceSettingsPayload | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await dataspaceApi.getDataspace();
        setDataspaceDetails((response.data?.data as DataspaceSettingsPayload) ?? null);
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
      return value
        ? language === 'de'
          ? 'Ja'
          : 'Yes'
        : language === 'de'
        ? 'Nein'
        : 'No';
    }

    return value && value.trim().length > 0 ? value : t('noValue');
  };

  const sectionTitle = (key: string) => {
    if (language === 'de') {
      return {
        dataspace: 'Dataspace Übersicht',
        access: 'Zugangs- und Identitätsdaten',
        apps: 'Verbundene Anwendungen',
        discovery: 'Discovery & Semantik',
        infrastructure: 'Infrastruktur',
      }[key];
    }

    return {
      dataspace: 'Dataspace overview',
      access: 'Access and identity',
      apps: 'Connected applications',
      discovery: 'Discovery and semantics',
      infrastructure: 'Infrastructure',
    }[key];
  };

  const sections = [
    {
      key: 'dataspace',
      fields: [
        { label: 'Dataspace', value: dataspaceDetails?.name },
        { label: 'BPNL', value: dataspaceDetails?.bpn },
        { label: 'Realm', value: dataspaceDetails?.realm },
        { label: language === 'de' ? 'Schreibgeschützt' : 'Read only', value: dataspaceDetails?.readonly },
      ],
    },
    {
      key: 'access',
      fields: [
        { label: language === 'de' ? 'Standard-Benutzer' : 'Default username', value: dataspaceDetails?.username },
        { label: language === 'de' ? 'Central IDP URL' : 'Central IDP URL', value: dataspaceDetails?.centralidp?.url },
        { label: language === 'de' ? 'Central IDP Realm' : 'Central IDP realm', value: dataspaceDetails?.centralidp?.realm },
        { label: language === 'de' ? 'SSI Wallet URL' : 'SSI wallet URL', value: dataspaceDetails?.ssi_wallet?.url },
      ],
    },
    {
      key: 'apps',
      fields: [
        { label: 'Portal URL', value: dataspaceDetails?.portal?.url },
        { label: 'SDE URL', value: dataspaceDetails?.sde?.url },
        { label: 'SDE Client ID', value: dataspaceDetails?.sde?.client_id },
        { label: language === 'de' ? 'Hersteller-ID' : 'Manufacturer ID', value: dataspaceDetails?.sde?.manufacturerId },
      ],
    },
    {
      key: 'discovery',
      fields: [
        { label: language === 'de' ? 'Semantik-URL' : 'Semantics URL', value: dataspaceDetails?.discovery?.semantics_url },
        { label: language === 'de' ? 'Discovery Finder' : 'Discovery finder', value: dataspaceDetails?.discovery?.discovery_finder },
        { label: language === 'de' ? 'BPN Discovery' : 'BPN discovery', value: dataspaceDetails?.discovery?.bpn_discovery },
      ],
    },
    {
      key: 'infrastructure',
      fields: [
        { label: language === 'de' ? 'Standard EDC URL' : 'Default EDC URL', value: dataspaceDetails?.edc?.default_url },
        { label: language === 'de' ? 'Cluster-Kontext' : 'Cluster context', value: dataspaceDetails?.edc?.cluster_context },
        { label: language === 'de' ? 'Provider EDC' : 'Provider EDC', value: dataspaceDetails?.sde?.providerEDC },
        { label: language === 'de' ? 'Consumer EDC' : 'Consumer EDC', value: dataspaceDetails?.sde?.consumerEDC },
        { label: language === 'de' ? 'Registry URL' : 'Registry URL', value: dataspaceDetails?.sde?.registryUrl },
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
            {language === 'de'
              ? 'Diese Werte dienen als Referenz für Ihren Dataspace. Die Seite ist bewusst schreibgeschützt, damit zentrale Plattform-Einstellungen nicht versehentlich geändert werden.'
              : 'These values are shown as a reference for your dataspace. The page is intentionally read-only so central platform settings cannot be changed accidentally.'}
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
                  {sectionTitle(section.key)}
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {language === 'de' ? 'Nur anzeigen' : 'Read only'}
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
  const firstName = keycloak.tokenParsed?.given_name || '';
  const lastName = keycloak.tokenParsed?.family_name || '';
  const fullName =
    `${firstName} ${lastName}`.trim() ||
    keycloak.tokenParsed?.preferred_username ||
    'User';
  const sessionBpnCandidates = useMemo(
    () => getSessionBpnCandidates(keycloak.tokenParsed, keycloak.token),
    [keycloak.token, keycloak.tokenParsed],
  );
  const sessionBpn = useMemo(
    () => readSessionBpn(keycloak.tokenParsed, keycloak.token),
    [keycloak.token, keycloak.tokenParsed],
  );

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
        <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
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
              onLogout={() => keycloak.logout()}
              onMenuToggle={() => setIsSidebarOpen((current) => !current)}
              onHelpClick={() => setShowGuide(true)}
              theme={theme}
              onThemeToggle={() =>
                setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
              }
            />
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
              <Routes>
                <Route path="/" element={<Dashboard sessionBpn={sessionBpn} />} />
                <Route path="/monitor" element={<Monitor />} />
                <Route path="/sde" element={<SDE sdeUrl={sdeUrl} />} />
                <Route
                  path="/portal"
                  element={
                    <AppPlaceholder
                      title="Portal"
                      description="This application entry is ready for a portal integration and can later be connected to a real portal URL or embedded portal experience."
                    />
                  }
                />
                <Route
                  path="/dataspace-os"
                  element={
                    <AppPlaceholder
                      title="Dataspace OS"
                      description="This application entry is reserved for future dataspace operations and platform-oriented workflows."
                    />
                  }
                />
                <Route
                  path="/settings"
                  element={<Settings onOpenGuide={() => setShowGuide(true)} />}
                />
              </Routes>
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
