/********************************************************************************
 * Copyright (c) 2025 ARENA2036 e.V.
 * Copyright (c) 2022,2023 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/
import { Activity } from 'lucide-react';
import type { ActivityLog } from '../types';

interface Props {
  logs: ActivityLog[];
}

export default function ActivityWidget({ logs }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5" />
        Recent Activity
      </h3>
      <div className="max-h-48 overflow-y-auto">
        {logs.length > 0 ? (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="text-sm border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{log.action}</span>
                  <span className="text-gray-500 text-xs">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                {log.details && <p className="text-gray-600">{log.details}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No activity logs available</p>
        )}
      </div>
    </div>
  );
}
