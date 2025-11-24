/**
 * Flow Automation Types
 * Baseado em backend/app/schemas/flow_automation.py
 */

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type TriggerType = 'manual' | 'scheduled' | 'cron' | 'webhook' | 'event';
export type AudienceType = 'all' | 'segment' | 'tags' | 'custom' | 'uploaded';
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron' | 'custom';
export type ScheduleExceptionType = 'skip' | 'reschedule' | 'modify';
export type ExecutionStatus = 'processing' | 'completed' | 'failed' | 'partial';

// ============================================
// Schedule Types
// ============================================

export interface RecurrenceConfig {
  type: RecurrenceType;
  [key: string]: any;
}

export interface FlowAutomationScheduleException {
  id: string;
  schedule_id: string;
  exception_type: ScheduleExceptionType;
  start_date: string; // ISO
  end_date?: string;
  rescheduled_to?: string;
  modified_config?: Record<string, any>;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface FlowAutomationSchedule {
  id: string;
  automation_id: string;
  recurrence_type: RecurrenceType;
  start_date: string; // ISO
  start_time: string; // HH:MM:SS
  recurrence_config: RecurrenceConfig;
  execution_window_start?: string; // HH:MM:SS
  execution_window_end?: string;
  skip_weekends?: boolean;
  skip_holidays?: boolean;
  blackout_dates?: string[];
  timezone: string;
  last_executed_at?: string;
  next_scheduled_at: string;
  exceptions: FlowAutomationScheduleException[];
  created_at: string;
  updated_at: string;
}

export interface SchedulePreviewExecution {
  scheduled_at: string;
  execution_window: {
    start: string;
    end: string;
  };
  is_skipped: boolean;
  skip_reason?: string;
}

export interface SchedulePreview {
  next_executions: SchedulePreviewExecution[];
  current_time: string;
  timezone: string;
}

export interface FlowAutomationScheduleCreate {
  recurrence_type: RecurrenceType;
  start_date: string;
  start_time: string;
  recurrence_config: RecurrenceConfig;
  execution_window_start?: string;
  execution_window_end?: string;
  skip_weekends?: boolean;
  skip_holidays?: boolean;
  blackout_dates?: string[];
  timezone?: string;
}

export interface FlowAutomationScheduleUpdate extends Partial<FlowAutomationScheduleCreate> {}

// ============================================
// Automation Types
// ============================================

export interface FlowAutomationBase {
  name: string;
  description?: string;
  chatbot_id: string;
  flow_id: string;
  whatsapp_number_id: string;
  audience_type: AudienceType;
  audience_config: Record<string, any>;
  variable_mapping?: Record<string, any>;
  rate_limit_per_hour?: number;
  max_concurrent_executions?: number;
}

export interface FlowAutomationCreate extends FlowAutomationBase {}

export interface FlowAutomationUpdate extends Partial<FlowAutomationBase> {
  status?: AutomationStatus;
  is_active?: boolean;
}

export interface FlowAutomation extends FlowAutomationBase {
  id: string;
  organization_id: string;
  status: AutomationStatus;
  is_active: boolean;
  trigger_type: TriggerType;
  total_executions: number;
  total_sent: number;
  total_delivered: number;
  total_completed: number;
  total_failed: number;
  last_executed_at?: string;
  next_scheduled_at?: string;
  schedule?: FlowAutomationSchedule;
  created_at: string;
  updated_at: string;
}

export interface FlowAutomationStats {
  total_executions: number;
  total_sent: number;
  total_delivered: number;
  total_completed: number;
  total_failed: number;
  success_rate: number;
  average_completion_time?: number;
}

export interface FlowAutomationListResponse {
  items: FlowAutomation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================
// Execution Types
// ============================================

export interface FlowAutomationExecutionRecipient {
  id: string;
  execution_id: string;
  contact_id: string;
  phone_number: string;
  contact_name?: string;
  status: 'pending' | 'processing' | 'sent' | 'delivered' | 'completed' | 'failed';
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  completed_at?: string;
}

export interface FlowAutomationExecution {
  id: string;
  automation_id: string;
  status: ExecutionStatus;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  completed_count: number;
  failed_count: number;
  started_at: string;
  completed_at?: string;
  triggered_by: 'manual' | 'scheduled' | 'webhook';
  recipients: FlowAutomationExecutionRecipient[];
}
