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

import type { ReactNode } from 'react';

export type NoticeTone = 'neutral' | 'brand' | 'warning' | 'danger';

const TONE_CLASSES: Record<NoticeTone, string> = {
  neutral:
    'border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  brand:
    'border-orange-100 bg-orange-50 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
  danger:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
};

export default function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: NoticeTone;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${TONE_CLASSES[tone]}`}>
      {children}
    </div>
  );
}
