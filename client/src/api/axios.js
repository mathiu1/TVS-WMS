import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (expired/invalid token)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('wms_token');
      localStorage.removeItem('wms_user');
      // Redirect to login if token is invalid
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ===== AUTH API =====
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
};

// ===== UNLOADING API =====
export const unloadingAPI = {
  create: (formData) =>
    API.post('/unloading', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: (params) => API.get('/unloading', { params }),
  getById: (id) => API.get(`/unloading/${id}`),
  update: (id, data) => API.put(`/unloading/${id}`, data),
  delete: (id) => API.delete(`/unloading/${id}`),
};

// ===== ANALYTICS API =====
export const analyticsAPI = {
  getDailyReport: (params) => API.get('/analytics/daily-report', { params }),
  getSummary: () => API.get('/analytics/summary'),
  getEmployeeReports: (params) => API.get('/analytics/employee-reports', { params }),
};

export default API;
