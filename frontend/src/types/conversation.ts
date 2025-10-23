/**
 * Conversation and Message Types
 */

export interface Contact {
  id: string;
  name: string | null;
  whatsapp_id: string;
  phone_number: string | null;
  profile_picture_url: string | null;
  email: string | null;
  tags: string[];
  attributes: Record<string, any>;
  is_vip?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  contact_id: string;
  whatsapp_number_id: string;
  contact: Contact;
  status: 'open' | 'pending' | 'resolved' | 'closed' | 'queued';
  current_agent_id: string | null;
  department_id: string | null;
  queue_id: string | null;
  channel: string;
  window_expires_at: string | null;
  last_message_at: string | null;
  last_message_from_agent_at: string | null;
  last_message_from_contact_at: string | null;
  messages_from_contact: number;
  messages_from_agent: number;
  messages_from_bot: number;
  total_messages: number;
  tags: string[];
  attributes: Record<string, any>;
  
  // Queue fields
  queued_at: string | null;
  queue_priority: number;
  assigned_at: string | null;
  closed_at: string | null;
  
  // Unread count
  unread_count: number;
  
  // Bot flag
  is_bot_active: boolean;
  
  created_at: string;
  updated_at: string;
}

export type MessageDirection = 'inbound' | 'outbound';
export type MessageSenderType = 'contact' | 'agent' | 'bot' | 'system';
export type MessageType = 'text' | 'image' | 'document' | 'template' | 'audio' | 'video';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender_type: MessageSenderType;
  sender_user_id: string | null;
  message_type: MessageType;
  content: Record<string, any>;
  status: MessageStatus;
  whatsapp_message_id: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  error_message: string | null;
}

export interface SendMessageRequest {
  message_type: MessageType;
  content: Record<string, any>;
}

export interface TextMessageContent {
  text: string;
  preview_url?: boolean;
}

export interface ImageMessageContent {
  url: string;
  caption?: string;
}

export interface DocumentMessageContent {
  url: string;
  filename: string;
  caption?: string;
}

export interface TemplateMessageContent {
  name: string;
  language: string;
  components: any[];
}
