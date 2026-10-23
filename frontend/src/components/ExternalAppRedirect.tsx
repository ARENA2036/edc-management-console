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

import { useEffect } from 'react';

import { useI18n } from '../i18n';

export default function ExternalAppRedirect({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [url]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            {description}
          </p>
          <p className="mt-4 text-sm text-gray-400 dark:text-slate-500">
            {t('sdeRedirectLinkPrefix')}{' '}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:underline"
            >
              {t('sdeRedirectLinkLabel')}
            </a>
            {t('sdeRedirectLinkSuffix')}
          </p>
        </div>
      </div>
    </div>
  );
}
