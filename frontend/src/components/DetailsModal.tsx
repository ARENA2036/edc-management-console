import { X, Copy } from 'lucide-react';
import type { Connector } from '../types';

interface Props {
  connector: Connector;
  onClose: () => void;
}

export default function DetailsModal({ connector, onClose }: Props) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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
              className={`text-lg font-semibold ${
                connector.status === 'healthy' || connector.status === 'active'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : connector.status === 'unhealthy' || connector.status === 'unreachable'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-slate-300'
              }`}
            >
              {connector.status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
