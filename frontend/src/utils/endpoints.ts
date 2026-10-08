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

import type { Connector } from '../types';

export type PlaneKey = 'controlPlane' | 'dataPlane';

export interface PlaneEndpoints {
  controlPlane?: string;
  dataPlane?: string;
}

export const PLANE_ORDER: PlaneKey[] = ['controlPlane', 'dataPlane'];

function withScheme(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function planeEndpoints(connector: Connector): PlaneEndpoints {
  const endpoints: PlaneEndpoints = {};

  const controlPlane =
    withScheme(connector.endpoints?.controlPlane) ??
    withScheme(connector.cp_hostname) ??
    withScheme(connector.url);
  if (controlPlane) {
    endpoints.controlPlane = controlPlane;
  }

  const dataPlane =
    withScheme(connector.endpoints?.dataPlane) ?? withScheme(connector.dp_hostname);
  if (dataPlane) {
    endpoints.dataPlane = dataPlane;
  }

  return endpoints;
}
