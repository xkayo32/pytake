import { api } from '../api';

export type ConnectionType = 'official' | 'qrcode';

export interface WhatsAppNumber {
  id: string;
  organization_id: string;
  connection_type: ConnectionType;
  phone_number: string;
  display_name: string | null;

  // Meta Cloud API fields (Official)
  phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
  access_token: string | null;
  webhook_verify_token: string | null;
  verified: boolean;
  quality_rating: string | null;
  messaging_limit: string | null;

  // Evolution API fields (QR Code)
  evolution_instance_name: string | null;
  evolution_api_url: string | null;
  evolution_api_key: string | null;

  // Common fields
  status: 'connected' | 'disconnected' | 'pending';
  connected_at: string | null;
  last_seen_at: string | null;
  is_active: boolean;
  auto_reply_enabled: boolean;
  away_message: string | null;
  business_hours: Record<string, any> | null;
  business_profile: Record<string, any> | null;
  default_department_id: string | null;
  default_chatbot_id: string | null;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppNumberCreate {
  phone_number: string;
  display_name?: string;
  connection_type: ConnectionType;

  // Meta Cloud API fields (Official)
  phone_number_id?: string;
  whatsapp_business_account_id?: string;
  access_token?: string;
  webhook_url?: string;
  webhook_verify_token?: string;

  // Evolution API fields (QR Code)
  evolution_instance_name?: string;
  evolution_api_url?: string;
  evolution_api_key?: string;

  business_profile?: Record<string, any>;
}

export interface WhatsAppNumberUpdate {
  display_name?: string;
  business_profile?: Record<string, any>;
  webhook_url?: string;
  is_active?: boolean;
  auto_reply_enabled?: boolean;
  away_message?: string;
  default_chatbot_id?: string | null;
}

export const whatsappAPI = {
  // List all WhatsApp numbers
  list: async () => {
    const response = await api.get<WhatsAppNumber[]>('/whatsapp/');
    return response.data;
  },

  // Get WhatsApp number by ID
  getById: async (id: string) => {
    const response = await api.get<WhatsAppNumber>(`/whatsapp/${id}`);
    return response.data;
  },

  // Create new WhatsApp number
  create: async (data: WhatsAppNumberCreate) => {
    const response = await api.post<WhatsAppNumber>('/whatsapp/', data);
    return response.data;
  },

  // Update WhatsApp number
  update: async (id: string, data: WhatsAppNumberUpdate) => {
    const response = await api.put<WhatsAppNumber>(`/whatsapp/${id}`, data);
    return response.data;
  },

  // Delete WhatsApp number
  delete: async (id: string) => {
    await api.delete(`/whatsapp/${id}`);
  },

  // Test connection (if endpoint exists)
  testConnection: async (id: string) => {
    const response = await api.post(`/whatsapp/${id}/test`);
    return response.data;
  },

  // Generate QR Code (Evolution API only)
  generateQRCode: async (id: string) => {
    const response = await api.post<{
      qr_code: string | null;
      status: string;
      message: string;
    }>(`/whatsapp/${id}/qrcode`);
    return response.data;
  },

  // Get QR Code status (polling)
  getQRCodeStatus: async (id: string) => {
    const response = await api.get<{
      qr_code: string | null;
      status: string;
      message: string;
    }>(`/whatsapp/${id}/qrcode/status`);
    return response.data;
  },

  // Disconnect number
  disconnect: async (id: string) => {
    const response = await api.post<{
      status: string;
      message: string;
    }>(`/whatsapp/${id}/disconnect`);
    return response.data;
  },
};
