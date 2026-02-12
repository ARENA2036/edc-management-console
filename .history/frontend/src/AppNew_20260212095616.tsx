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
  }, [connectors]);

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
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm md:text-base text-gray-500">Welcome to your EDC Management Console</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
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

        <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Server size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Manage Your Connectors</h3>
                <p className="text-xs md:text-sm text-gray-500">Manage your EDC instances and connections</p>
              </div>
            </div>

            <div className="relative inline-block group">
              <button
                onClick={() => setIsWizardOpen(true)}
                disabled={connectors.length >= 2}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  connectors.length >= 2
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                Add Connector
              </button>
              {connectors.length >= 2 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  More than 2 EDCs present, please delete existing EDCs to add more.
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

interface SDEProps {
  sdeUrl: string;
}
function SDE({ sdeUrl }: SDEProps) {
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
          {/* Render settings here */}
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header user={user} onLogout={handleLogout} onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
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