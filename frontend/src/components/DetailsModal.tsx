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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Connector Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="border-b pb-2">
            <label className="block text-sm font-medium text-gray-500">Name</label>
            <div className="flex items-center justify-between">
              <p className="text-lg">{connector.name}</p>
              <button
                onClick={() => copyToClipboard(connector.name)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="border-b pb-2">
            <label className="block text-sm font-medium text-gray-500">EDC URL</label>
            <div className="flex items-center justify-between">
              <p className="text-sm break-all">{connector.url}</p>
              <button
                onClick={() => copyToClipboard(connector.url)}
                className="text-blue-600 hover:text-blue-700 ml-2"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="border-b pb-2">
            <label className="block text-sm font-medium text-gray-500">BPN</label>
            <div className="flex items-center justify-between">
              <p className="text-lg">{connector.bpn || 'N/A'}</p>
              {connector.bpn && (
                <button
                  onClick={() => copyToClipboard(connector.bpn!)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="border-b pb-2">
            <label className="block text-sm font-medium text-gray-500">Status</label>
            <p className={`text-lg font-semibold ${
              connector.status === 'healthy' ? 'text-green-600' : 
              connector.status === 'unhealthy' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {connector.status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
