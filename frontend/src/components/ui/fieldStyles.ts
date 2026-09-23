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

export type FieldAccent = 'brand' | 'info';

const FOCUS_CLASSES: Record<FieldAccent, string> = {
  brand: 'border-gray-200 focus:border-orange-400',
  info: 'border-gray-200 focus:border-blue-400',
};

const BASE_CONTROL =
  'w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-colors dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';

export const READONLY_CONTROL =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500';

export function controlClass(hasError: boolean, accent: FieldAccent = 'info') {
  return `${BASE_CONTROL} ${
    hasError
      ? 'border-red-400 focus:border-red-500 dark:border-red-500/70'
      : FOCUS_CLASSES[accent]
  }`;
}
