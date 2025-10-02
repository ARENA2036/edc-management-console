import { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { connectorApi, activityApi } from './api/client';
import type { Connector, ActivityLog } from './types';
import ConnectorTable from './components/ConnectorTable';
import AddConnectorModal from './components/AddConnectorModal';
import HealthWidget from './components/HealthWidget';
import ActivityWidget from './components/ActivityWidget';

function App() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      const response = await connectorApi.getAll();
      setConnectors(response.data.data || []);
    } catch (error) {
      console.error('Failed to load connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const response = await activityApi.getRecentLogs(20);
      setActivityLogs(response.data.data || []);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    }
  };

  useEffect(() => {
    loadConnectors();
    loadActivityLogs();
    const interval = setInterval(() => {
      loadActivityLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectorAdded = () => {
    loadConnectors();
    loadActivityLogs();
  };

  const handleConnectorDeleted = () => {
    loadConnectors();
    loadActivityLogs();
  };

  const handleConnectorUpdated = () => {
    loadConnectors();
    loadActivityLogs();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              TractusX EDC Connector Manager
            </h1>
            <button
              onClick={() => loadConnectors()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <HealthWidget />
          <ActivityWidget logs={activityLogs} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">EDC Connectors</h2>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Deploy New EDC
            </button>
          </div>

          <ConnectorTable
            connectors={connectors}
            onConnectorDeleted={handleConnectorDeleted}
            onConnectorUpdated={handleConnectorUpdated}
          />
        </div>
      </main>

      <AddConnectorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConnectorAdded={handleConnectorAdded}
      />
    </div>
  );
}

export default App;
