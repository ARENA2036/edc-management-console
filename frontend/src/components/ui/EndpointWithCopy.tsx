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
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '../../i18n';

import Tooltip from './Tooltip';


interface Props {
  endpoint?: string;
  fallback: string;
}

// Wraps rather than truncates: a cropped endpoint can't be read or copied in
// full, which is exactly the value this cell exists to show.
export default function EndpointWithCopy({ endpoint, fallback }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!endpoint) {
    return <>{fallback}</>;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="break-all">{endpoint}</span>
      <Tooltip content={copied ? t('copiedToClipboard') : t('copyEndpointTooltip')}>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
      </Tooltip>
    </div>
  );
}
