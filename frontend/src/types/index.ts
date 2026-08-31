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
  id: string | number;
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

export interface DeployComponent {
  type: "connector" | "digitalTwinRegistry" | "submodelServer";

  name: string;
  version: string;
  url: string;

  bpn?: string;
  db_name?: string;

  auth?: {
    db_username: string;
    db_password: string;
  };
}

export interface DeployRequest {
  components: DeployComponent[];
}

export interface DeploymentState {
  open: boolean;
  mode: 'create' | 'edit';
}

export interface ManagedComponent {
  id: string;

  type: "digitalTwinRegistry" | "submodelServer";

  name: string;
  version: string;

  status: "Active" | "Deploying" | "Degraded" | "Failed" | "Not found" | "Unknown";

  deployedAt: string;

  endpoint?: string;
  credentials?: string;
  source?: 'api' | 'local';

  db_name: string;

  auth: {
    db_username: string;
    db_password: string;
  };
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
  version?: string;
  db_username?: string;
  db_password?: string;
  registry?: DigitalTwinRegistry;
  submodel?: SubmodelServer;
  config?: Record<string, unknown>; // Auch hier statt any Record
}

export interface ConnectorUpdate {
  name?: string;
  url?: string;
  bpn?: string;
  version?: string;
  db_username?: string;
  db_password?: string;
  registry?: DigitalTwinRegistry;
  submodel?: SubmodelServer;
  config?: Record<string, unknown>; // Auch hier statt any Record
  status?: string;
}
