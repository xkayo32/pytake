import axios from 'axios'
import Cookies from 'js-cookie'

// Configuração base da API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.pytake.net/api/v1'

// Criar instância do axios
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      Cookies.remove('token')
      Cookies.remove('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Funções auxiliares para chamadas comuns
export const apiHelpers = {
  // WhatsApp
  sendWhatsAppMessage: (data: {
    to: string
    message?: string
    type: 'text' | 'image' | 'template' | 'document' | 'audio' | 'video'
    template?: any
    image?: any
    document?: any
    audio?: any
    video?: any
  }) => api.post('/whatsapp/send', data),
  
  // Flows
  getFlows: () => api.get('/flows'),
  getFlow: (id: string) => api.get(`/flows/${id}`),
  createFlow: (data: any) => api.post('/flows', data),
  updateFlow: (id: string, data: any) => api.put(`/flows/${id}`, data),
  deleteFlow: (id: string) => api.delete(`/flows/${id}`),
  executeFlow: (id: string, data: any) => api.post(`/flows/${id}/execute`, data),
  
  // Contacts
  getContacts: () => api.get('/contacts'),
  getContact: (id: string) => api.get(`/contacts/${id}`),
  createContact: (data: any) => api.post('/contacts', data),
  updateContact: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  deleteContact: (id: string) => api.delete(`/contacts/${id}`),
  
  // Templates
  getTemplates: () => api.get('/templates'),
  getTemplate: (id: string) => api.get(`/templates/${id}`),
  createTemplate: (data: any) => api.post('/templates', data),
  updateTemplate: (id: string, data: any) => api.put(`/templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/templates/${id}`),
  
  // Conversations
  getConversations: () => api.get('/conversations'),
  getConversation: (id: string) => api.get(`/conversations/${id}`),
  getMessages: (conversationId: string) => api.get(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: any) => api.post(`/conversations/${conversationId}/messages`, data),
  
  // Campaigns
  getCampaigns: () => api.get('/campaigns'),
  getCampaign: (id: string) => api.get(`/campaigns/${id}`),
  createCampaign: (data: any) => api.post('/campaigns', data),
  updateCampaign: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  deleteCampaign: (id: string) => api.delete(`/campaigns/${id}`),
  startCampaign: (id: string) => api.post(`/campaigns/${id}/start`),
  pauseCampaign: (id: string) => api.post(`/campaigns/${id}/pause`),
  
  // User & Auth
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.post('/auth/change-password', data),
  
  // WhatsApp Config
  getWhatsAppConfigs: () => api.get('/whatsapp-configs'),
  getWhatsAppConfig: (id: string) => api.get(`/whatsapp-configs/${id}`),
  createWhatsAppConfig: (data: any) => api.post('/whatsapp-configs', data),
  updateWhatsAppConfig: (id: string, data: any) => api.put(`/whatsapp-configs/${id}`, data),
  deleteWhatsAppConfig: (id: string) => api.delete(`/whatsapp-configs/${id}`),
  testWhatsAppConfig: (id: string) => api.post(`/whatsapp-configs/${id}/test`),
  
  // Dashboard & Analytics
  getDashboardStats: () => api.get('/dashboard/stats'),
  getAnalytics: (params?: any) => api.get('/analytics', { params }),
  
  // Webhooks
  getWebhooks: () => api.get('/webhooks'),
  createWebhook: (data: any) => api.post('/webhooks', data),
  updateWebhook: (id: string, data: any) => api.put(`/webhooks/${id}`, data),
  deleteWebhook: (id: string) => api.delete(`/webhooks/${id}`),
  testWebhook: (id: string) => api.post(`/webhooks/${id}/test`),
}

export default api