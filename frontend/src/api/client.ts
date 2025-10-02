import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || 'default-api-key-change-in-production';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': API_KEY,
  },
});

export const connectorApi = {
  getAll: () => apiClient.get('/connectors'),
  getById: (id: number) => apiClient.get(`/connectors/${id}`),
  create: (data: any) => apiClient.post('/connectors', data),
  update: (id: number, data: any) => apiClient.put(`/connectors/${id}`, data),
  delete: (id: number) => apiClient.delete(`/connectors/${id}`),
  checkHealth: (id: number) => apiClient.get(`/connectors/${id}/health`),
};

export const healthApi = {
  checkHealth: () => apiClient.get('/health'),
  checkEdcHealth: () => apiClient.get('/edc/health'),
};

export const activityApi = {
  getRecentLogs: (limit = 50) => apiClient.get(`/activity-logs?limit=${limit}`),
};

export const configApi = {
  getConfig: () => apiClient.get('/config'),
};
