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

export interface DataspaceSettingsPayload {
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
  ich?: {
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

export interface DataspaceSummary {
  name: string;
  authorityBpn: string;
  details: DataspaceSettingsPayload | null;
}
