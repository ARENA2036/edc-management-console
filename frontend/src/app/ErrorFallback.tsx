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

import { RefreshCw } from 'lucide-react';

import ErrorDetails from '../components/ui/ErrorDetails';
import { useI18n } from '../i18n';

import type { ApiError } from '../api/errors';

export default function ErrorFallback({ error, onReset }: { error: ApiError; onReset: () => void }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16 dark:bg-slate-950">
      <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          {t('errorBoundaryTitle')}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">
          {t('errorBoundaryDescription')}
        </p>
        <ErrorDetails error={error} className="mt-6" />
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <RefreshCw size={16} />
          {t('errorBoundaryReload')}
        </button>
      </div>
    </div>
  );
}
