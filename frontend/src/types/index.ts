export interface Connector {
  id: number;
  name: string;
  url: string;
  bpn?: string;
  version?: string;
  status: string;
  config?: any;
  created_at?: string;
  updated_at?: string;
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
  config?: any;
}

export interface ConnectorUpdate {
  name?: string;
  url?: string;
  bpn?: string;
  config?: any;
  status?: string;
}
