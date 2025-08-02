// Template types for quick response system

export interface TemplateVariable {
  name: string;
  description: string;
  default_value?: string;
  required: boolean;
}

export interface Template {
  id: number;
  name: string;
  content: string;
  category: string;
  shortcut?: string;
  language: string;
  variables?: TemplateVariable[];
  usage_count: number;
  is_active: boolean;
  created_by: number;
  attachments?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  content: string;
  category: string;
  shortcut?: string;
  language: string;
  variables?: TemplateVariable[];
  attachments?: string[];
  tags?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  category?: string;
  shortcut?: string;
  language?: string;
  variables?: TemplateVariable[];
  is_active?: boolean;
  attachments?: string[];
  tags?: string[];
}

export interface TemplateFilters {
  category?: string;
  language?: string;
  is_active?: boolean;
  search?: string;
  tags?: string[];
  created_by?: number;
}

export interface TemplateWithStats extends Template {
  last_used_at?: string;
  usage_last_30_days: number;
  average_response_time?: number;
}

export interface UseTemplateRequest {
  variables: Record<string, string>;
}

export interface UseTemplateResponse {
  content: string;
  template_id: number;
}

export interface CloneTemplateRequest {
  new_name: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}