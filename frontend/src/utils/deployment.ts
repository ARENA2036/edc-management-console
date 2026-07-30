import type {
  DeployComponent,
  DeployRequest,
  DashboardConnector,
  ManagedComponent,
} from '../types';
import { getRuntimeConfigValue } from '../runtime-config';

export type ComponentKind = 'connector' | 'digitalTwinRegistry' | 'submodelServer';

const edcHost = getRuntimeConfigValue(
  import.meta.env.VITE_EDC_HOST,
  window.__RUNTIME_CONFIG__?.edcHost,
  'txcd.arena2036-x.de',
);
const urlScheme = getRuntimeConfigValue(
  import.meta.env.VITE_URL_SCHEME,
  window.__RUNTIME_CONFIG__?.urlScheme,
  'https',
);

export function buildConnectorEndpoints(name: string): {
  apiEndpoint: string;
  dataPlaneUrl: string;
} {
  const trimmedName = trimOrEmpty(name);
  if (!trimmedName) {
    return { apiEndpoint: '', dataPlaneUrl: '' };
  }

  return {
    apiEndpoint: `${urlScheme}://${trimmedName}-controlplane.${edcHost}`,
    dataPlaneUrl: `${urlScheme}://${trimmedName}-dataplane.${edcHost}`,
  };
}

export interface ComponentDraft {
  enabled: boolean;
  name: string;
  version: string;
  url: string;
  dbName: string;
  username: string;
  password: string;
}

export interface DeploymentDraft {
  connector: {
    name: string;
    version: string;
    url: string;
    bpn: string;
    dataPlaneUrl: string;
  };
  digitalTwinRegistry: ComponentDraft;
  submodelServer: ComponentDraft;
}

function trimOrEmpty(value: string | undefined | null): string {
  return (value ?? '').trim();
}

export function buildComponentPayload(
  type: ComponentKind,
  draft: {
    name: string;
    version: string;
    url: string;
    dbName: string;
    username: string;
    password: string;
    bpn?: string;
  },
): DeployComponent {
  const payload: DeployComponent = {
    type,
    name: trimOrEmpty(draft.name),
    version: trimOrEmpty(draft.version),
    url: trimOrEmpty(draft.url),
    db_name: trimOrEmpty(draft.dbName),
    auth: {
      db_username: trimOrEmpty(draft.username),
      db_password: trimOrEmpty(draft.password),
    },
  };

  if (type === 'connector' && draft.bpn) {
    payload.bpn = trimOrEmpty(draft.bpn);
  }

  return payload;
}

export function buildDeployRequest(draft: DeploymentDraft): DeployRequest {
  const connectorName = trimOrEmpty(draft.connector.name);
  const components: DeployComponent[] = [
    buildComponentPayload('connector', {
      name: connectorName,
      version: draft.connector.version,
      url: draft.connector.url,
      dbName: `${connectorName}-db`,
      username: `${connectorName}-username`,
      password: `${connectorName}-password`,
      bpn: draft.connector.bpn,
    }),
  ];

  if (draft.submodelServer.enabled) {
    components.push(buildComponentPayload('submodelServer', draft.submodelServer));
  }

  if (draft.digitalTwinRegistry.enabled) {
    components.push(buildComponentPayload('digitalTwinRegistry', draft.digitalTwinRegistry));
  }

  return { components };
}

export function buildStandaloneConnector(
  draft: DeploymentDraft['connector'],
): DashboardConnector {
  return {
    id: Date.now(),
    name: trimOrEmpty(draft.name),
    url: trimOrEmpty(draft.url),
    bpn: trimOrEmpty(draft.bpn),
    version: trimOrEmpty(draft.version),
    status: 'healthy',
    created_at: new Date().toISOString(),
    urls: [trimOrEmpty(draft.url), trimOrEmpty(draft.dataPlaneUrl)].filter(Boolean),
    created_by: 'dashboard',
    db_username: `${trimOrEmpty(draft.name)}-username`,
    db_password: `${trimOrEmpty(draft.name)}-password`,
    cp_hostname: trimOrEmpty(draft.url),
    dp_hostname: trimOrEmpty(draft.dataPlaneUrl),
    config: {
      connectorType: 'EDC Connector',
      endpoint: trimOrEmpty(draft.url),
      dataPlaneUrl: trimOrEmpty(draft.dataPlaneUrl),
      bpn: trimOrEmpty(draft.bpn),
      version: trimOrEmpty(draft.version),
      dbName: `${trimOrEmpty(draft.name)}-db`,
    },
    source: 'local',
  };
}

export function buildManagedComponentFromDraft(
  type: 'digitalTwinRegistry' | 'submodelServer',
  draft: ComponentDraft,
  linkedConnector: string,
): ManagedComponent {
  return {
    id: `${type}-${draft.name}-${Date.now()}`,
    type,
    name: trimOrEmpty(draft.name),
    version: trimOrEmpty(draft.version),
    status: 'Active',
    linkedConnector,
    deployedAt: new Date().toISOString(),
    connectionMode: 'new',
    endpoint: trimOrEmpty(draft.url),
    credentials: undefined,
    db_name: trimOrEmpty(draft.dbName),
    auth: {
      db_username: trimOrEmpty(draft.username),
      db_password: trimOrEmpty(draft.password),
    },
  };
}

export function getDefaultComponentDraft(
  baseName: string,
  kind: 'digitalTwinRegistry' | 'submodelServer',
  existing?: Partial<ComponentDraft>,
): ComponentDraft {
  const trimmedBase = trimOrEmpty(baseName);
  const isDtr = kind === 'digitalTwinRegistry';
  const defaultName = isDtr ? `${trimmedBase}-dtr` : `${trimmedBase}-sms`;
  const defaultUrl = isDtr
    ? `${trimmedBase}.txcd.arena2036-x.de`
    : `${trimmedBase}.txcd.arena2036-x.de`;
  const defaultUsername = `${defaultName}-user`;
  const defaultPassword = `${defaultName}-password`;

  return {
    enabled: existing?.enabled ?? false,
    name: trimOrEmpty(existing?.name) || defaultName,
    version: trimOrEmpty(existing?.version) || (isDtr ? '0.12.0' : '0.1.0'),
    url: trimOrEmpty(existing?.url) || defaultUrl,
    dbName: trimOrEmpty(existing?.dbName) || `${defaultName}-db`,
    username: trimOrEmpty(existing?.username) || defaultUsername,
    password: trimOrEmpty(existing?.password) || defaultPassword,
  };
}
