import axios from 'axios';

// NÃO DEFINE BASEURL AQUI - APENAS NO INTERCEPTOR!
export const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// INTERCEPTOR QUE MONTA A URL COMPLETA - SEM BACKEND:8000 EM LUGAR NENHUM!
api.interceptors.request.use(
  (config) => {
    // SEMPRE FORÇA /api/v1 - BROWSER OU SSR
    // Se a URL começa com /, adiciona /api/v1 na frente
    if (config.url && config.url.startsWith('/')) {
      config.url = `/api/v1${config.url}`;
    } else if (config.url && !config.url.startsWith('http')) {
      config.url = `/api/v1/${config.url}`;
    }
    // REMOVE baseURL completamente
    delete config.baseURL;

    console.log('🚀 FINAL URL:', config.url);

    // Add auth token
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
  list: (params?: { skip?: number; limit?: number; query?: string; assigned_agent_id?: string; is_blocked?: boolean }) =>
    api.get('/contacts/', { params }),

  get: (id: string) => api.get(`/contacts/${id}`),

  getStats: (id: string) => api.get(`/contacts/${id}/stats`),

  getOrganizationStats: () => api.get('/contacts/stats'),

  create: (data: any) => api.post('/contacts/', data),

  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),

  delete: (id: string) => api.delete(`/contacts/${id}`),

  block: (id: string, reason?: string) =>
    api.post(`/contacts/${id}/block`, null, { params: { reason } }),

  unblock: (id: string) =>
    api.post(`/contacts/${id}/unblock`),

  updateTags: (id: string, tag_names: string[]) =>
    api.put(`/contacts/${id}/tags`, tag_names),

  addTags: (id: string, tag_ids: string[]) =>
    api.post(`/contacts/${id}/tags`, { tag_ids }),

  removeTags: (id: string, tag_ids: string[]) =>
    api.delete(`/contacts/${id}/tags`, { data: { tag_ids } }),
};

// Tags API
export const tagsAPI = {
  list: () => api.get('/contacts/tags/'),

  get: (id: string) => api.get(`/contacts/tags/${id}`),

  create: (data: { name: string; color?: string }) =>
    api.post('/contacts/tags/', data),

  update: (id: string, data: { name?: string; color?: string }) =>
    api.put(`/contacts/tags/${id}`, data),

  delete: (id: string) => api.delete(`/contacts/tags/${id}`),
};

// Conversations API
export const conversationsAPI = {
  list: (params?: { skip?: number; limit?: number; status?: string; assigned_to_me?: boolean }) =>
    api.get('/conversations/', { params }),

  get: (id: string) => api.get(`/conversations/${id}`),

  create: (data: any) => api.post('/conversations/', data),

  update: (id: string, data: any) => api.put(`/conversations/${id}`, data),

  getMessages: (conversationId: string, params?: { skip?: number; limit?: number }) =>
    api.get(`/conversations/${conversationId}/messages`, { params }),

  sendMessage: (conversationId: string, data: any) =>
    api.post(`/conversations/${conversationId}/messages`, data),

  markAsRead: (conversationId: string) =>
    api.post(`/conversations/${conversationId}/read`),
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

// WhatsApp API
export const whatsappAPI = {
  list: () => api.get('/whatsapp/'),

  get: (id: string) => api.get(`/whatsapp/${id}`),

  create: (data: any) => api.post('/whatsapp/', data),

  update: (id: string, data: any) => api.put(`/whatsapp/${id}`, data),

  delete: (id: string) => api.delete(`/whatsapp/${id}`),

  listTemplates: (numberId: string, status: string = 'APPROVED') =>
    api.get(`/whatsapp/${numberId}/templates`, { params: { status } }),

  generateQRCode: (numberId: string) =>
    api.post(`/whatsapp/${numberId}/qrcode`),

  getQRCodeStatus: (numberId: string) =>
    api.get(`/whatsapp/${numberId}/qrcode/status`),

  disconnect: (numberId: string) =>
    api.post(`/whatsapp/${numberId}/disconnect`),
};

// Queue API
export const queueAPI = {
  list: (params?: { skip?: number; limit?: number; department_id?: string }) =>
    api.get('/queue/', { params }),

  pull: (params?: { department_id?: string }) =>
    api.post('/queue/pull', params),
};

// Departments API
export const departmentsAPI = {
  list: (params?: { skip?: number; limit?: number; is_active?: boolean }) =>
    api.get('/departments/', { params }),

  listActive: () => api.get('/departments/active'),

  getStats: () => api.get('/departments/stats'),

  get: (id: string) => api.get(`/departments/${id}`),

  create: (data: any) => api.post('/departments/', data),

  update: (id: string, data: any) => api.put(`/departments/${id}`, data),

  delete: (id: string) => api.delete(`/departments/${id}`),

  addAgent: (departmentId: string, agentId: string) =>
    api.post(`/departments/${departmentId}/agents/${agentId}`),

  removeAgent: (departmentId: string, agentId: string) =>
    api.delete(`/departments/${departmentId}/agents/${agentId}`),
};

// Users API
export const usersAPI = {
  list: (params?: { skip?: number; limit?: number; role?: string; is_active?: boolean }) =>
    api.get('/users/', { params }),

  get: (id: string) => api.get(`/users/${id}`),

  getStats: (id: string) => api.get(`/users/${id}/stats`),

  getMe: () => api.get('/users/me'),

  getMyStats: () => api.get('/users/me/stats'),

  create: (data: any) => api.post('/users/', data),

  update: (id: string, data: any) => api.put(`/users/${id}`, data),

  updateMe: (data: any) => api.put('/users/me', data),

  activate: (id: string) => api.post(`/users/${id}/activate`),

  deactivate: (id: string) => api.post(`/users/${id}/deactivate`),

  delete: (id: string) => api.delete(`/users/${id}`),
};

export default api;
