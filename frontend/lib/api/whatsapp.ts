import { getApiUrl, getAuthHeaders } from '../api-client';

export type ConnectionType = 'official' | 'qrcode';

export interface WhatsAppNumber {
  id: string;
  phone_number: string;
  display_name?: string;
  connection_type: ConnectionType;
  phone_number_id?: string;
  whatsapp_business_account_id?: string;
  access_token?: string;
  webhook_verify_token?: string;
  webhook_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppNumberCreate {
  phone_number: string;
  display_name?: string;
  connection_type: ConnectionType;
  phone_number_id?: string;
  whatsapp_business_account_id?: string;
  access_token?: string;
  app_secret?: string;
  webhook_url?: string;
  webhook_verify_token?: string;
  evolution_instance_name?: string;
  evolution_api_url?: string;
  evolution_api_key?: string;
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
    const response = await fetch(`${getApiUrl()}/whatsapp/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch WhatsApp numbers');
    return response.json() as Promise<WhatsAppNumber[]>;
  },

  // Get WhatsApp number by ID
  getById: async (id: string) => {
    const response = await fetch(`${getApiUrl()}/whatsapp/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch WhatsApp number');
    return response.json() as Promise<WhatsAppNumber>;
  },

  // Create new WhatsApp number
  create: async (data: WhatsAppNumberCreate) => {
    const response = await fetch(`${getApiUrl()}/whatsapp/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create WhatsApp number');
    }
    return response.json() as Promise<WhatsAppNumber>;
  },

  // Update WhatsApp number
  update: async (id: string, data: WhatsAppNumberUpdate) => {
    const response = await fetch(`${getApiUrl()}/whatsapp/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update WhatsApp number');
    return response.json() as Promise<WhatsAppNumber>;
  },

  // Delete WhatsApp number
  delete: async (id: string) => {
    const response = await fetch(`${getApiUrl()}/whatsapp/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete WhatsApp number');
  },

  // Generate QR Code (Evolution API only)
  generateQRCode: async (id: string) => {
    const response = await fetch(`${getApiUrl()}/whatsapp/${id}/qrcode`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to generate QR code');
    return response.json() as Promise<{
      qr_code: string | null;
      status: string;
      message: string;
    }>;
  },

  // Get QR Code status
  getQRCodeStatus: async (id: string) => {
    const response = await fetch(`${getApiUrl()}/whatsapp/${id}/qrcode/status`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to get QR code status');
    return response.json() as Promise<{
      qr_code: string | null;
      status: string;
      message: string;
    }>;
  },
};
