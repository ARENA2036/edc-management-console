import { useState } from 'react';
import { FileText, Edit, Trash2 } from 'lucide-react';
import type { Connector } from '../types';
import DeleteModal from './DeleteModal';
import EditModal from './EditModal';
import YamlViewModal from './YamlViewModal';
import { connectorApi } from '../api/client';

interface Props {
  connectors: Connector[];
  onConnectorDeleted: () => void;
  onConnectorUpdated: () => void;
}



export default function ConnectorTableNew({ connectors, onConnectorDeleted, onConnectorUpdated }: Props) {
  const [deleteModalConnector, setDeleteModalConnector] = useState<Connector | null>(null);
  const [editModalConnector, setEditModalConnector] = useState<Connector | null>(null);
  const [yamlModalConnector, setYamlModalConnector] = useState<Connector | null>(null);

  const handleDelete = async () => {
    if (!deleteModalConnector) return;
    try {
      await connectorApi.delete(deleteModalConnector.name);
    } catch (error) {
      console.error('Failed to delete connector:', error);
    }
  };
  const renderMobileCards = () => (
    <div className="space-y-4 md:hidden">
      {connectors.map((connector) => (
        <div key={connector.id} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-orange-500 font-medium text-base">{connector.name}</span>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${connector.status === 'healthy'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
              }`}>
              {connector.status === 'healthy' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="text-gray-700">{connector.version || '0.6.0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">BPN</span>
              <span className="text-gray-700 text-right break-all">{connector.bpn}</span>
            </div>
            <div>
              <span className="text-gray-500">Endpoints</span>
              <ul className="mt-1 space-y-1">
                {connector.urls.map((url) => (
                  <li key={url} className="text-gray-700 text-xs break-all bg-gray-50 px-2 py-1 rounded">
                    {url}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => setYamlModalConnector(connector)}
              className="flex-1 flex items-center justify-center gap-1 p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors text-sm"
              title="View YAML"
            >
              <FileText size={16} />
              <span>YAML</span>
            </button>
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-1 p-2 text-gray-400 rounded-lg cursor-not-allowed opacity-50 text-sm"
              title="Edit"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setDeleteModalConnector(connector)}
              className="flex-1 flex items-center justify-center gap-1 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm"
              title="Delete"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BPN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {connectors.map((connector) => (
                <tr key={connector.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-orange-500 font-medium">{connector.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {connector.version || '0.6.0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {connector.bpn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${connector.status === 'healthy'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                      {connector.status === 'healthy' ? 'Connected' : 'Disconnected'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 align-top">
                    <ul className="space-y-1">
                      {connector.urls.map((url) => (
                        <li key={url} className="break-all">
                          {url}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setYamlModalConnector(connector)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View YAML"
                      >
                        <FileText size={16} />
                        <span className="text-xs ml-1">YAML</span>
                      </button>
                      <button
                        disabled
                        onClick={() => setEditModalConnector(connector)}
                        className="
                          p-2 
                          text-gray-400
                          rounded-lg 
                          transition-colors 
                          cursor-not-allowed 
                          opacity-50
                          disabled:hover:bg-transparent
                        "
                        title="Edit"
                      >
                        <Edit size={16} />
                        <span className="text-xs ml-1">Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteModalConnector(connector)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                        <span className="text-xs ml-1">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {connectors.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No connectors deployed yet. Click "Add EDC" to get started.
            </div>
          )}
        </div>
      </div>

      {deleteModalConnector && (
        <DeleteModal
          connector={deleteModalConnector}
          onClose={() => setDeleteModalConnector(null)}
          onConfirm={async () => {
            await handleDelete();
            setDeleteModalConnector(null);
            onConnectorDeleted();
          }}
        />
      )}

      {editModalConnector && (
        <EditModal
          connector={editModalConnector}
          onClose={() => setEditModalConnector(null)}
          onUpdated={() => {
            setEditModalConnector(null);
            onConnectorUpdated();
          }}
        />
      )}

      {yamlModalConnector && (
        <YamlViewModal
          connector={yamlModalConnector}
          onClose={() => setYamlModalConnector(null)}
        />
      )}
    </>
  );
}
