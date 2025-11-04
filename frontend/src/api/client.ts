import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL + '/api' || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'emc-api-key',
  },
});

// apiClient.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

export const connectorApi = {
  getAll: () => apiClient.get('/connectors'),
  getById: (id: number) => apiClient.get(`/connectors/${id}`),
  create: (data: any) => apiClient.post('/connector', data),
  update: (id: number, data: any) => apiClient.put(`/connectors/${id}`, data),
  delete: (id: number) => apiClient.delete(`/connectors/${id}`),
  checkHealth: (id: number) => apiClient.get(`/connector/${id}/health`),
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
