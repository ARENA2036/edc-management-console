import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { healthApi } from '../api/client';

export default function HealthWidget() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const response = await healthApi.checkEdcHealth();
      setHealth(response.data.data);
    } catch (error) {
      console.error('Failed to check health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          EDC Health
        </h3>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Refresh
        </button>
      </div>
      {health ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <span className={`text-sm font-semibold ${
              health.healthy ? 'text-green-600' : 'text-red-600'
            }`}>
              {health.healthy ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Liveness:</span>
            <span className="text-sm">{health.liveness}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Readiness:</span>
            <span className="text-sm">{health.readiness}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Loading...</p>
      )}
    </div>
  );
}
