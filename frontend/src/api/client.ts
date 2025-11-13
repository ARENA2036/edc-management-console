import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + '/api' || '/api';
const EDC_BASE_URL = import.meta.env.EDC_HOSTNAME;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'emc-api-key',
  },
});


export const edcClient = (name: string) => {
  console.log(`https://${name}-controlplane.arena2036-x.de`)
  axios.create({
    baseURL: `https://${name}-controlplane.arena2036-x.de`,
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

export const edcAPI = {
  getHealth: (name: string) => edcClient(name), 
};