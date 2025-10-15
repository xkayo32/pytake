/**
 * Campaign Types
 * Baseado em backend/app/schemas/campaign.py
 */

export type CampaignType = 'broadcast' | 'drip' | 'trigger';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
export type AudienceType = 'all_contacts' | 'segment' | 'tags' | 'custom_list';
export type MessageType = 'text' | 'template' | 'image' | 'document';

export interface CampaignBase {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  whatsapp_number_id?: string;
  template_id?: string;
  message_type: MessageType;
  message_content: Record<string, any>;
  template_variables: Record<string, any>;
  audience_type: AudienceType;
  target_tag_ids: string[];
  target_contact_ids: string[];
  segment_filters: Record<string, any>;
  messages_per_hour: number;
  delay_between_messages_seconds: number;
  respect_opt_out: boolean;
  skip_active_conversations: boolean;
  scheduled_at?: string;
  settings: Record<string, any>;
}

export interface CampaignCreate extends CampaignBase {}

export interface CampaignUpdate {
  name?: string;
  description?: string;
  campaign_type?: CampaignType;
  whatsapp_number_id?: string;
  template_id?: string;
  message_type?: MessageType;
  message_content?: Record<string, any>;
  template_variables?: Record<string, any>;
  audience_type?: AudienceType;
  target_tag_ids?: string[];
  target_contact_ids?: string[];
  segment_filters?: Record<string, any>;
  messages_per_hour?: number;
  delay_between_messages_seconds?: number;
  respect_opt_out?: boolean;
  skip_active_conversations?: boolean;
  scheduled_at?: string;
  settings?: Record<string, any>;
}

export interface Campaign extends CampaignBase {
  id: string;
  organization_id: string;
  created_by_user_id?: string;
  status: CampaignStatus;
  started_at?: string;
  completed_at?: string;
  paused_at?: string;
  cancelled_at?: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  messages_pending: number;
  replies_count: number;
  unique_replies_count: number;
  opt_outs_count: number;
  delivery_rate?: number;
  read_rate?: number;
  reply_rate?: number;
  estimated_cost?: number;
  actual_cost?: number;
  error_count: number;
  last_error_message?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CampaignStats {
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  messages_pending: number;
  replies_count: number;
  unique_replies_count: number;
  opt_outs_count: number;
  delivery_rate: number;
  read_rate: number;
  reply_rate: number;
  progress_percentage: number;
  success_rate: number;
}

export interface CampaignProgress {
  status: CampaignStatus;
  total_recipients: number;
  messages_sent: number;
  messages_pending: number;
  messages_failed: number;
  progress_percentage: number;
  estimated_completion_time?: string;
}

export interface CampaignListResponse {
  total: number;
  items: Campaign[];
}
