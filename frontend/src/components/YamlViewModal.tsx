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
