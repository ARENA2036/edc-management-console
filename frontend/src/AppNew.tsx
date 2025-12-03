import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Database, Activity, Server } from 'lucide-react';
import { connectorApi, activityApi, dataspaceApi } from './api/client';
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
  const [dataspaceName, setDataspaceName] = useState('Loading...');
  const [dataspaceBpn, setDataspaceBpn] = useState('');
  const connectorsRef = useRef<Connector[]>([]);

  useEffect(() => {
    connectorsRef.current = connectors;
  }, [connectors])

    const loadConnectors = async () => {
      try {
        const response = await connectorApi.getAll();
        console.log(response.data.data);
        setConnectors(Array.isArray(response.data.data) ? response.data.data : []);
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

  const loadDataspace = async () => {
    try {
      const data = await dataspaceApi.getDataspace();
      if (data.data) {
        setDataspaceName(data.data.name || 'ARENA2036-X');
        setDataspaceBpn(data.data.bpn || '');
      }
    } catch (error) {
      console.error('Failed to load dataspace:', error);
      setDataspaceName('ARENA2036-X');
    }
  };


  useEffect(() => {
    loadConnectors();
    loadActivityLogs();
    loadDataspace();
    const interval = setInterval(() => {
      loadActivityLogs();
      loadConnectors();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDeploy = async (connector: Connector) => {
    try {
      await connectorApi.create({
        name: connector.name,
        url: connector.url,
        bpn: connector.bpn,
        version: connector.version || '0.6.0',
        db_username: connector.db_username,
        db_password: connector.db_password,
        registry: connector.registry,
        submodel: connector.submodel
      });
      loadConnectors();
      loadActivityLogs();
    } catch (error) {
      console.error('Failed to deploy connector:', error);
      alert('Failed to deploy connector. Please check the console for details.');
    }
  };

  const activeConnectors = connectors.filter(c => c.status === 'healthy').length;
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
            value={dataspaceName}
            subtitle={dataspaceBpn || "All systems operational"}
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

            <div className="relative inline-block group">
              <button
                onClick={() => setIsWizardOpen(true)}
                disabled={connectors.length >=2 }
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  connectors.length >= 2
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                Add Connector
              </button>
              {connectors.length >=  2 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  More than 2 edc present, please delete existing edc to add more
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
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

function SDE({ sdeUrl }) {
  useEffect(() => {
    if (sdeUrl) {
      window.open(sdeUrl, "_blank");
    }
  }, [sdeUrl]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Redirecting to SDE Application...</h2>
          <p className="text-gray-500">
            You will be redirected to the Simple Data Exchanger application.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            If you are not redirected,{" "}
            <a href={sdeUrl} className="text-orange-500 hover:underline">
              click here
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Move this call to client.ts
        const response = await dataspaceApi.getDataspace();
        const data = response.data;
        setSettings(data.data);
      } catch (error) {
        console.error('Failed to load dataspace settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900">Dataspace Settings</h2>
        <p className="text-gray-500 mt-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dataspace Settings</h2>
        <p className="text-gray-500 mt-2">
          These settings are synchronized from Keycloak and cannot be modified here.
        </p>
      </div>

      {settings && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dataspace Name</label>
                <input
                  type="text"
                  value={settings.name || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">BPN Number</label>
                <input
                  type="text"
                  value={settings.bpn || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Realm</label>
                <input
                  type="text"
                  value={settings.realm || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={settings.username || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Central IDP URL</label>
                <input
                  type="text"
                  value={settings.centralidp?.url || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portal URL</label>
                <input
                  type="text"
                  value={settings.portal?.url || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT RECTANGLE */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Discovery Services</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semantics URL</label>
                  <input
                    type="text"
                    value={settings.discovery?.semantics_url || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discovery Finder Endpoint</label>
                  <input
                    type="text"
                    value={settings.discovery?.discovery_finder || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BPN Discovery Endpoint</label>
                  <input
                    type="text"
                    value={settings.discovery?.bpn_discovery || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT RECTANGLE */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">SDE Configuration</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SDE URL</label>
                  <input
                    type="text"
                    value={settings.sde?.url || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SDE Client ID</label>
                  <input
                    type="text"
                    value={settings.sde?.client_id || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider EDC</label>
                  <input
                    type="text"
                    value={settings.sde?.providerEDC || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">EDC Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default EDC URL</label>
                <input
                  type="text"
                  value={settings.edc?.default_url || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cluster Context</label>
                <input
                  type="text"
                  value={settings.edc?.cluster_context || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> These settings are automatically synchronized from your Keycloak configuration. 
              To modify them, please contact your system administrator or update the configuration in Keycloak.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AppNew() {
const firstName = keycloak.tokenParsed?.given_name || '';
const lastName = keycloak.tokenParsed?.family_name || '';
const fullName = `${firstName} ${lastName}`.trim() || keycloak.tokenParsed?.preferred_username || 'User';

const user = {
  name: fullName,
  role: 'Administrator'
};

  const [sdeUrl, setSDEUrl] = useState(`${import.meta.env.VITE_SDE_URL}`);

  const loadSDEUrl = async () => {
    try {
      const response = await dataspaceApi.getDataspace();

      if (response.data?.data?.sde?.url) {
        setSDEUrl(response.data.data.sde.url);
      }
    } catch (error) {
      console.error('Failed to load SDE Url:', error);
    }
  };

  useEffect(() => {
    loadSDEUrl();
  }, []);


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
              <Route path="/sde" element={<SDE sdeUrl={sdeUrl} />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default AppNew;
