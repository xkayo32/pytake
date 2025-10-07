import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Debug: Log API URL on client side
if (typeof window !== 'undefined') {
  console.log('🌐 [API] Using API URL:', API_URL);
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error adding auth token to request:', error);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    // Validações de segurança
    if (!error || !originalRequest) {
      return Promise.reject(error || new Error('Unknown error'));
    }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // NÃO tentar refresh se for requisição de login/register
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                            originalRequest.url?.includes('/auth/register');

      if (isAuthEndpoint) {
        console.log('🔴 401 on auth endpoint, not attempting refresh');
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          console.log('🔴 No refresh token available, skipping refresh');
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        if (!response?.data?.access_token) {
          throw new Error('Invalid refresh response');
        }

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);

        // Refresh failed, clean up and redirect to login
        try {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        } catch (storageError) {
          console.error('Error clearing storage:', storageError);
        }

        // Só redireciona se estiver no browser E NÃO estiver já na página de login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          console.log('Redirecting to /login due to auth failure');
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; full_name: string; organization_name: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),

  me: () => api.get('/auth/me'),
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),

  getConversations: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/analytics/conversations', { params }),

  getAgents: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/analytics/agents', { params }),

  getCampaigns: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/analytics/campaigns', { params }),

  getContacts: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/analytics/contacts', { params }),

  getChatbots: () => api.get('/analytics/chatbots'),

  getMessages: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/analytics/messages', { params }),

  getFullReport: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/analytics/reports/full', { params }),
};

// Contacts API
export const contactsAPI = {
  list: (params?: { skip?: number; limit?: number; search?: string }) =>
    api.get('/contacts/', { params }),

  get: (id: string) => api.get(`/contacts/${id}`),

  create: (data: any) => api.post('/contacts/', data),

  update: (id: string, data: any) => api.patch(`/contacts/${id}`, data),

  delete: (id: string) => api.delete(`/contacts/${id}`),
};

// Conversations API
export const conversationsAPI = {
  list: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.get('/conversations/', { params }),

  get: (id: string) => api.get(`/conversations/${id}`),

  create: (data: any) => api.post('/conversations/', data),

  update: (id: string, data: any) => api.patch(`/conversations/${id}`, data),

  sendMessage: (conversationId: string, data: any) =>
    api.post(`/conversations/${conversationId}/messages`, data),
};

// Campaigns API
export const campaignsAPI = {
  list: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.get('/campaigns/', { params }),

  get: (id: string) => api.get(`/campaigns/${id}`),

  create: (data: any) => api.post('/campaigns/', data),

  update: (id: string, data: any) => api.patch(`/campaigns/${id}`, data),

  delete: (id: string) => api.delete(`/campaigns/${id}`),

  start: (id: string) => api.post(`/campaigns/${id}/start`),

  pause: (id: string) => api.post(`/campaigns/${id}/pause`),

  resume: (id: string) => api.post(`/campaigns/${id}/resume`),

  cancel: (id: string) => api.post(`/campaigns/${id}/cancel`),

  getStats: (id: string) => api.get(`/campaigns/${id}/stats`),

  getProgress: (id: string) => api.get(`/campaigns/${id}/progress`),
};

// Chatbots API
export const chatbotsAPI = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get('/chatbots/', { params }),

  get: (id: string) => api.get(`/chatbots/${id}`),

  create: (data: any) => api.post('/chatbots/', data),

  update: (id: string, data: any) => api.patch(`/chatbots/${id}`, data),

  delete: (id: string) => api.delete(`/chatbots/${id}`),

  activate: (id: string) => api.post(`/chatbots/${id}/activate`),

  deactivate: (id: string) => api.post(`/chatbots/${id}/deactivate`),

  getStats: (id: string) => api.get(`/chatbots/${id}/stats`),
};

export default api;
