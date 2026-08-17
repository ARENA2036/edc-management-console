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
import { X, Copy } from 'lucide-react';
import type { Connector } from '../types';
import { useLockBodyScroll } from '../useLockBodyScroll';

interface Props {
  connector: Connector;
  onClose: () => void;
}

export default function DetailsModal({ connector, onClose }: Props) {
  useLockBodyScroll(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Connector Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-4 dark:border-slate-800">
            <label className="block text-sm font-medium text-gray-500">Name</label>
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium text-gray-900 dark:text-slate-100">{connector.name}</p>
              <button
                onClick={() => copyToClipboard(connector.name)}
                className="rounded-md p-2 text-orange-500 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="border-b border-gray-200 pb-4 dark:border-slate-800">
            <label className="block text-sm font-medium text-gray-500">EDC URL</label>
            <div className="flex items-center justify-between">
              <p className="break-all font-mono text-sm text-gray-700 dark:text-slate-300">{connector.url}</p>
              <button
                onClick={() => copyToClipboard(connector.url)}
                className="rounded-md p-2 text-orange-500 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="border-b border-gray-200 pb-4 dark:border-slate-800">
            <label className="block text-sm font-medium text-gray-500">BPN</label>
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium text-gray-900 dark:text-slate-100">{connector.bpn || 'N/A'}</p>
              {connector.bpn && (
                <button
                  onClick={() => copyToClipboard(connector.bpn!)}
                  className="rounded-md p-2 text-orange-500 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-500/10"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="border-b border-gray-200 pb-4 dark:border-slate-800">
            <label className="block text-sm font-medium text-gray-500">Status</label>
            <p
              className={`text-lg font-semibold ${connector.status === 'healthy' || connector.status === 'unhealthy'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-600 dark:text-slate-300'
                }`}
            >
              {connector.status === 'unhealthy' ? 'Active' : connector.status}
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
