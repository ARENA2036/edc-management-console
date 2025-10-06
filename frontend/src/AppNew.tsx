import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Database, Activity, Server } from 'lucide-react';
import { connectorApi, activityApi } from './api/client';
import type { Connector, ActivityLog } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsCard from './components/StatsCard';
import ConnectorTableNew from './components/ConnectorTableNew';
import DeploymentWizard from './components/DeploymentWizard';
import keycloak from './auth/keycloak';

function Dashboard() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const loadConnectors = async () => {
    try {
      const response = await connectorApi.getAll();
      setConnectors(response.data.data || []);
    } catch (error) {
      console.error('Failed to load connectors:', error);
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

  const handleDeploy = async (connector: Connector) => {
    try {
      await connectorApi.create({
        name: connector.name,
        url: connector.url,
        bpn: connector.bpn,
        config: { 
          version: connector.version || '0.6.0'
        }
      });
      loadConnectors();
      loadActivityLogs();
    } catch (error) {
      console.error('Failed to deploy connector:', error);
      alert('Failed to deploy connector. Please check the console for details.');
    }
  };

  const activeConnectors = connectors.filter(c => c.status === 'connected').length;

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500">Welcome to your EDC Management Console</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={<Database size={24} />}
            title="Data Space"
            value="Catena-X"
            subtitle="All systems operational"
          />
          <StatsCard
            icon={<Activity size={24} />}
            title="System Health"
            value="Healthy"
            subtitle="All systems operational"
            variant="success"
          />
          <StatsCard
            icon={<Server size={24} />}
            title="Activity"
            value="Active"
            subtitle={`${activityLogs.length} logs running`}
            variant="info"
          />
          <StatsCard
            icon={<Server size={24} />}
            title="EDC Connectors"
            value={connectors.length.toString()}
            subtitle={`${activeConnectors} active`}
            variant="info"
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center">
                <Server size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Your Connectors</h3>
                <p className="text-sm text-gray-500">Manage your EDC instances and connections</p>
              </div>
            </div>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              Add EDC
            </button>
          </div>

          <ConnectorTableNew
            connectors={connectors}
            onConnectorDeleted={loadConnectors}
            onConnectorUpdated={loadConnectors}
          />
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          Copyright © ARENA2036-X Network
        </div>
      </div>

      {isWizardOpen && (
        <DeploymentWizard
          onClose={() => setIsWizardOpen(false)}
          onDeploy={handleDeploy}
        />
      )}
    </>
  );
}

function Monitor() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900">Monitor</h2>
      <p className="text-gray-500 mt-2">System monitoring coming soon...</p>
    </div>
  );
}

function Settings() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900">Dataspace Settings</h2>
      <p className="text-gray-500 mt-2">Configuration settings coming soon...</p>
    </div>
  );
}

function AppNew() {
  const username = keycloak.tokenParsed?.preferred_username || 'User';
  const user = {
    name: username,
    role: 'Administrator'
  };

  const handleLogout = () => {
    keycloak.logout();
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/monitor" element={<Monitor />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default AppNew;
