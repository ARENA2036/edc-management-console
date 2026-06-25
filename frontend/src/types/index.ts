export interface DigitalTwinRegistry {
  url: string;
  credentials: string;
}

export interface SubmodelServer {
  url: string;
  credentials: string;
}

// Typisierung für config und urls
export interface Connector {
  id: number;
  name: string;
  url: string;
  bpn?: string;
  version?: string;
  status: string;
  config?: Record<string, unknown>; // Anstelle von any, Record gibt ein Schlüssel-Wert-Paar an
  created_at?: string;
  updated_at?: string;
  cp_hostname?: string;
  dp_hostname?: string;
  urls: string[]; // Wenn es sich um ein Array von Strings handelt
  created_by: string;
  db_username: string;
  db_password: string;
  registry?: DigitalTwinRegistry;
  submodel?: SubmodelServer;
}

export interface DashboardConnector extends Connector {
  source?: 'api' | 'local';
}

export interface ManagedComponent {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'Active' | 'Inactive';
  linkedConnector: string;
  deployedAt: string;
  connectionMode?: 'new' | 'existing';
  endpoint?: string;
  credentials?: string;
}

export interface ActivityLog {
  id: number;
  connector_id?: number;
  connector_name?: string;
  action: string;
  details?: string;
  status?: string;
  timestamp?: string;
}

export interface ConnectorCreate {
  name: string;
  url: string;
  bpn?: string;
  config?: Record<string, unknown>; // Auch hier statt any Record
}

export interface ConnectorUpdate {
  name?: string;
  url?: string;
  bpn?: string;
  config?: Record<string, unknown>; // Auch hier statt any Record
  status?: string;
}
