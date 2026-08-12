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
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: {
      apiUrl?: string;
      apiKey?: string;
      edcHost?: string;
      keycloakUrl?: string;
      realm?: string;
      clientId?: string;
      sdeUrl?: string;
      portalUrl?: string;
      disableAuth?: boolean;
    };
  }
}

function isUsableValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  return !(
    value.startsWith('__') ||
    (value.startsWith('${') && value.endsWith('}'))
  );
}

export function getRuntimeConfigValue(
  envValue: string | undefined,
  runtimeValue: string | undefined,
  fallback = '',
): string {
  if (isUsableValue(envValue)) {
    return envValue as string;
  }

  if (isUsableValue(runtimeValue)) {
    return runtimeValue as string;
  }

  return fallback;
}

function parseBoolean(value: boolean | string | undefined) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

export function getRuntimeConfigBoolean(
  envValue: string | undefined,
  runtimeValue: boolean | string | undefined,
  fallback = false,
) {
  const envBoolean = parseBoolean(envValue);
  if (envBoolean !== undefined) {
    return envBoolean;
  }

  const runtimeBoolean = parseBoolean(runtimeValue);
  if (runtimeBoolean !== undefined) {
    return runtimeBoolean;
  }

  return fallback;
}
