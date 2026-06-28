import { X, Copy } from 'lucide-react';
import type { Connector, ManagedComponent } from '../types';
import yaml from 'js-yaml';

interface Props {
  connector: Connector;
  components: ManagedComponent[];
  onClose: () => void;
}

export default function YamlViewModal({ connector, components, onClose }: Props) {
  const submodel = components.find((c) => c.type === 'submodelServer');
  const registry = components.find((c) => c.type === 'digitalTwinRegistry');

  // Build the YAML object, augmenting registry/submodel with linked component URLs.
  const yamlData = {
    ...connector,
    registry: registry?.endpoint || connector.registry || '',
    submodel: submodel?.endpoint || connector.submodel || '',
  };

  const yamlContent = yaml.dump(yamlData, { indent: 2 });

  const handleCopy = () => {
    navigator.clipboard.writeText(yamlContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            YAML View: {connector.name}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <pre className="max-h-[60vh] overflow-auto rounded-xl bg-gray-900 p-4 text-sm leading-relaxed text-green-400">
            {yamlContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
