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
import { User } from 'lucide-react';

interface Props {
  user?: {
    name: string;
    role: string;
  };
  onLogout?: () => void;
}

export default function Header({ user, onLogout }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/arena2036-logo.png" 
            alt="ARENA2036 Logo" 
            className="h-10 object-contain"
          />
          <h1 className="text-xl font-semibold">ARENA2036 EDC Management Console</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              EN
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
              DE
            </button>
          </div>
          
          {user && (
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
