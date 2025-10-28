/**
 * Flow Automation Types
 * Baseado em backend/app/schemas/flow_automation.py
 */

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type TriggerType = 'manual' | 'scheduled' | 'cron' | 'webhook' | 'event';
export type AudienceType = 'all' | 'segment' | 'tags' | 'custom' | 'uploaded';

export interface FlowAutomationBase {
  name: string;
  description?: string;
  chatbot_id: string;
  flow_id: string;
  whatsapp_number_id: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  audience_type: AudienceType;
  audience_config: Record<string, any>;
  variable_mapping: Record<string, any>;
  max_concurrent_executions: number;
  rate_limit_per_hour: number;
  retry_failed: boolean;
  max_retries: number;
  execution_window_start?: string; // HH:MM:SS
  execution_window_end?: string;   // HH:MM:SS
  execution_timezone: string;
}

export interface FlowAutomationCreate extends FlowAutomationBase {}

export interface FlowAutomationUpdate {
  name?: string;
  description?: string;
  chatbot_id?: string;
  flow_id?: string;
  whatsapp_number_id?: string;
  trigger_type?: TriggerType;
  trigger_config?: Record<string, any>;
  audience_type?: AudienceType;
  audience_config?: Record<string, any>;
  variable_mapping?: Record<string, any>;
  status?: AutomationStatus;
  is_active?: boolean;
  max_concurrent_executions?: number;
  rate_limit_per_hour?: number;
  retry_failed?: boolean;
  max_retries?: number;
  execution_window_start?: string;
  execution_window_end?: string;
  execution_timezone?: string;
}

export interface FlowAutomation extends FlowAutomationBase {
  id: string;
  organization_id: string;
  status: AutomationStatus;
  is_active: boolean;
  total_executions: number;
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  total_completed: number;
  total_failed: number;
  last_executed_at?: string;
  next_scheduled_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FlowAutomationStats {
  total_executions: number;
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  total_completed: number;
  total_failed: number;
  delivery_rate?: number;
  read_rate?: number;
  reply_rate?: number;
  completion_rate?: number;
  last_execution_id?: string;
  last_execution_status?: string;
  last_executed_at?: string;
  next_scheduled_at?: string;
}

export interface FlowAutomationListResponse {
  items: FlowAutomation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
