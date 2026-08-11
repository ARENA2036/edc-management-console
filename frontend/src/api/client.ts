import axios from 'axios';
import { getRuntimeConfigValue } from '../runtime-config';
import keycloak, { isAuthDisabled } from '../auth/keycloak';
import type { DeployRequest } from '../types';

const backendUrl = getRuntimeConfigValue(
  import.meta.env.VITE_BACKEND_URL,
  window.__RUNTIME_CONFIG__?.apiUrl,
  '',
);
const apiKey = getRuntimeConfigValue(
  import.meta.env.VITE_API_KEY,
  window.__RUNTIME_CONFIG__?.apiKey,
  '',
);
const edcHost = getRuntimeConfigValue(
  import.meta.env.VITE_EDC_HOSTNAME,
  window.__RUNTIME_CONFIG__?.edcHost,
  '',
);
const API_BASE_URL = backendUrl ? `${backendUrl}/api` : '/api';

const apiClientHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

if (apiKey) {
  apiClientHeaders['X-Api-Key'] = apiKey;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: apiClientHeaders,
});

apiClient.interceptors.request.use(async (config) => {
  if (isAuthDisabled()) {
    return config;
  }

  if (keycloak.authenticated) {
    try {
      const refreshed = await keycloak.updateToken(30);
      if (refreshed) {
        localStorage.setItem('token', keycloak.token || '');
      }
    } catch (error) {

      console.warn('Failed to refresh the Keycloak token', error);
    }
  }

  const token = keycloak.token || localStorage.getItem('token') || '';
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});


export const edcClient = (name: string) => {
  const baseURL = edcHost ? `https://${name}-controlplane.${edcHost}` : '';
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Header': '*',
      'Access-Control-Allow-Origin': '*'
      },
  }).get('/api/check/liveness')
}

// Deployable components (connector, digital twin registry, submodel server, ...).
// The backend endpoints are component-generic — they are not connector-specific.
export const componentApi = {
  getAll: () => apiClient.get('/components'),
  getById: (id: string | number) => apiClient.get(`/components/${id}`),
  create: (data: DeployRequest) => apiClient.post('/component', data),
  update: (id: string | number, data: DeployRequest) => apiClient.put(`/components/${id}`, data),
  delete: (name: string) => apiClient.delete(`/components/${name}`),
  // Single-component health is keyed by name, matching the backend route.
  checkHealth: (name: string) => apiClient.get(`/components/${name}/health`),
  getComponentsHealth: () => apiClient.get('/components/health'),
};

export const healthApi = {
  checkHealth: () => apiClient.get('/health'),
  checkEdcHealth: () => apiClient.get('/edc/health'),
};

export const activityApi = {
  getRecentLogs: (limit = 50) => apiClient.get(`/logs?limit=${limit}`),
};

export const configApi = {
  getConfig: () => apiClient.get('/config'),
};

export const dataspaceApi = {
  getDataspace: () => apiClient.get('/dataspace'),
};

export const edcAPI = {
  getHealth: (name: string) => edcClient(name), 
};
