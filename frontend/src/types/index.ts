/********************************************************************************
 * Copyright (c) 2025 ARENA2036 e.V.
 * Copyright (c) 2022,2023 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/
export interface DigitalTwinRegistry{
  url: string;
  credentials: string;
}

export interface SubmodelServer{
  url: string;
  credentials: string;
}

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
  cp_hostname?: string;
  dp_hostname?: string;
  urls: string[];
  created_by: string;
  db_username: string;
  db_password: string;
  registry?: DigitalTwinRegistry;
  submodel?: SubmodelServer;
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
