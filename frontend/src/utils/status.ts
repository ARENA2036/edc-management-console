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

export type ComponentPhase =
  | 'active'
  | 'deploying'
  | 'degraded'
  | 'failed'
  | 'not_found'
  | 'unknown';

const ALIASES: Record<string, ComponentPhase> = {
  active: 'active',
  healthy: 'active',
  running: 'active',
  deploying: 'deploying',
  pending: 'deploying',
  degraded: 'degraded',
  warning: 'degraded',
  unreachable: 'degraded',
  unhealthy: 'failed',
  critical: 'failed',
  failed: 'failed',
  error: 'failed',
  inactive: 'failed',
  not_found: 'not_found',
  notfound: 'not_found',
  missing: 'not_found',
};

export function normalizeStatus(raw?: string | null): ComponentPhase {
  if (!raw) {
    return 'unknown';
  }

  return ALIASES[raw.trim().toLowerCase()] ?? 'unknown';
}

export type StatusTone = 'ok' | 'progress' | 'warn' | 'error' | 'muted';

const TONES: Record<ComponentPhase, StatusTone> = {
  active: 'ok',
  deploying: 'progress',
  degraded: 'warn',
  failed: 'error',
  not_found: 'error',
  unknown: 'muted',
};

export function statusTone(raw?: string | null): StatusTone {
  return TONES[normalizeStatus(raw)];
}

const LABELS: Record<ComponentPhase, string> = {
  active: 'Active',
  deploying: 'Deploying',
  degraded: 'Degraded',
  failed: 'Failed',
  not_found: 'Not found',
  unknown: 'Unknown',
};

export function statusLabel(raw?: string | null): string {
  return LABELS[normalizeStatus(raw)];
}

const BADGE_CLASSES: Record<StatusTone, string> = {
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  progress: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  error: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  muted: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function statusBadgeClass(raw?: string | null): string {
  return BADGE_CLASSES[statusTone(raw)];
}

export function isHealthy(raw?: string | null): boolean {
  return statusTone(raw) === 'ok';
}

export function needsAttention(raw?: string | null): boolean {
  const tone = statusTone(raw);
  return tone === 'error' || tone === 'warn';
}
