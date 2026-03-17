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
import { X, Copy } from 'lucide-react';
import type { Connector } from '../types';
import yaml from 'js-yaml';

interface Props {
  connector: Connector;
  onClose: () => void;
}

export default function YamlViewModal({ connector, onClose }: Props) {
  
  const yamlContent = yaml.dump(connector, { indent: 2 });

  const handleCopy = () => {
    navigator.clipboard.writeText(yamlContent);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">YAML View: {connector.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-auto max-h-96 text-sm">
          {yamlContent}
        </pre>
      </div>
    </div>
  );
}
