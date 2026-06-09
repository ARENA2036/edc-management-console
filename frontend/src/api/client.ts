import axios from 'axios';
import { getRuntimeConfigValue } from '../runtime-config';

const backendUrl = getRuntimeConfigValue(
  import.meta.env.VITE_BACKEND_URL,
  window.__RUNTIME_CONFIG__?.apiUrl,
  '',
);
const apiKey = getRuntimeConfigValue(
  import.meta.env.VITE_API_KEY,
  window.__RUNTIME_CONFIG__?.apiKey,
  'DEFAULT',
);
const edcHost = getRuntimeConfigValue(
  import.meta.env.VITE_EDC_HOST,
  window.__RUNTIME_CONFIG__?.edcHost,
  '__EDC_HOST__',
);
const API_BASE_URL = backendUrl ? `${backendUrl}/api` : '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey,
  },
});


export const edcClient = (name: string) => {
  const baseURL = `https://${name}-controlplane.${edcHost}`;
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Header': '*',
      'Access-Control-Allow-Origin': '*'
      },
  }).get('/api/check/liveness')
}

export const connectorApi = {
  getAll: () => apiClient.get('/connectors'),
  getById: (id: number) => apiClient.get(`/connectors/${id}`),
  create: (data: any) => apiClient.post('/connector', data),
  update: (id: number, data: any) => apiClient.put(`/connectors/${id}`, data),
  delete: (name: string) => apiClient.delete(`/connectors/${name}`),
  checkHealth: (id: number) => apiClient.get(`/connector/${id}/health`),
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
