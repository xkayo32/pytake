/**
 * Contact Types
 * Baseado em backend/app/schemas/contact.py
 */

export interface ContactBase {
  name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  company?: string;
  job_title?: string;
  notes?: string;
}

export interface ContactCreate extends ContactBase {
  whatsapp_id: string; // WhatsApp ID com código do país
}

export interface ContactUpdate extends ContactBase {
  lifecycle_stage?: string;
  opt_in?: boolean;
  is_blocked?: boolean;
  blocked_reason?: string;
  assigned_agent_id?: string;
  assigned_department_id?: string;
}

export interface Contact extends ContactBase {
  id: string;
  organization_id: string;
  whatsapp_id: string;
  whatsapp_name?: string;
  whatsapp_profile_pic?: string;

  // Address
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  address_postal_code?: string;

  // Marketing
  source?: string;
  lifecycle_stage?: string;
  opt_in: boolean;
  opt_in_date?: string;
  opt_out_date?: string;

  // Blocking
  is_blocked: boolean;
  blocked_at?: string;
  blocked_reason?: string;

  // Activity
  last_message_at?: string;
  last_message_received_at?: string;
  last_message_sent_at?: string;

  // Counts
  total_messages_sent: number;
  total_messages_received: number;
  total_conversations: number;

  // Assignment
  assigned_agent_id?: string;
  assigned_department_id?: string;

  // Tags
  tags: string[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ContactWithTags extends Contact {
  tag_names: string[];
}

export interface ContactStats {
  total_conversations: number;
  total_messages: number;
  avg_response_time_minutes?: number;
  last_interaction?: string;
}

// Tag Types
export interface TagBase {
  name: string;
  color?: string; // Hex color (#RRGGBB)
}

export interface TagCreate extends TagBase {}

export interface TagUpdate {
  name?: string;
  color?: string;
}

export interface Tag extends TagBase {
  id: string;
  organization_id: string;
  created_at: string;
}

// Bulk Operations
export interface ContactBulkTag {
  contact_ids: string[];
  tag_ids: string[];
}

export interface ContactBulkUpdate {
  contact_ids: string[];
  update_data: ContactUpdate;
}
