import { useState } from 'react';
import { Trash2, Edit, FileText, Info } from 'lucide-react';
import type { Connector } from '../types';
import { connectorApi } from '../api/client';
import DeleteModal from './DeleteModal';
import EditModal from './EditModal';
import YamlViewModal from './YamlViewModal';
import DetailsModal from './DetailsModal';

interface Props {
  connectors: Connector[];
  onConnectorDeleted: () => void;
  onConnectorUpdated: () => void;
}

export default function ConnectorTable({ connectors, onConnectorDeleted, onConnectorUpdated }: Props) {
  const [deleteConnector, setDeleteConnector] = useState<Connector | null>(null);
  const [editConnector, setEditConnector] = useState<Connector | null>(null);
  const [yamlConnector, setYamlConnector] = useState<Connector | null>(null);
  const [detailsConnector, setDetailsConnector] = useState<Connector | null>(null);

  const handleDelete = async () => {
    if (!deleteConnector) return;
    try {
      await connectorApi.delete(deleteConnector.id);
      onConnectorDeleted();
      setDeleteConnector(null);
    } catch (error) {
      console.error('Failed to delete connector:', error);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                BPN
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {connectors.map((connector) => (
              <tr key={connector.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {connector.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {connector.url}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      connector.status === 'healthy'
                        ? 'bg-green-100 text-green-800'
                        : connector.status === 'unhealthy'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {connector.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {connector.bpn || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setDetailsConnector(connector)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                    title="Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setYamlConnector(connector)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                    title="View YAML"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditConnector(connector)}
                    className="text-green-600 hover:text-green-900 mr-3"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConnector(connector)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteConnector && (
        <DeleteModal
          connector={deleteConnector}
          onClose={() => setDeleteConnector(null)}
          onConfirm={handleDelete}
        />
      )}

      {editConnector && (
        <EditModal
          connector={editConnector}
          onClose={() => setEditConnector(null)}
          onUpdated={() => {
            onConnectorUpdated();
            setEditConnector(null);
          }}
        />
      )}

      {yamlConnector && (
        <YamlViewModal
          connector={yamlConnector}
          onClose={() => setYamlConnector(null)}
        />
      )}

      {detailsConnector && (
        <DetailsModal
          connector={detailsConnector}
          onClose={() => setDetailsConnector(null)}
        />
      )}
    </>
  );
}
