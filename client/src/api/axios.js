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
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Critical: If sending FormData (file uploads), let browser/axios auto-set the boundary
    if (config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
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
  create: (formData) => API.post('/unloading', formData),
  getAll: (params) => API.get('/unloading', { params }),
  getById: (id) => API.get(`/unloading/${id}`),
  update: (id, data) => API.put(`/unloading/${id}`, data),
  delete: (id) => API.delete(`/unloading/${id}`),
  getStats: (params) => API.get('/unloading/stats', { params }),
};

// ===== ANALYTICS API =====
export const analyticsAPI = {
  getDailyReport: (params) => API.get('/analytics/daily-report', { params }),
  getSummary: () => API.get('/analytics/summary'),
  getEmployeeReports: (params) => API.get('/analytics/employee-reports', { params }),
};

export default API;
