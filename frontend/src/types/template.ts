/**
 * Flow Template TypeScript types
 * Matches backend schemas in app/schemas/ai_assistant.py
 */

export type TemplateComplexity = 'simple' | 'medium' | 'complex';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  thumbnail_url?: string;
  preview_image_url?: string;
  tags: string[];
  complexity: TemplateComplexity;
  estimated_setup_time: string;
  node_count: number;
  features: string[];
  variables_used: string[];
  requires_integrations: string[];
  use_count: number;
  rating: number;
  language: string;
  canvas_data: {
    nodes: any[];
    edges: any[];
  };
  created_at: string;
  updated_at: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  template_count: number;
}

export interface TemplateFilters {
  category?: string;
  subcategory?: string;
  complexity?: TemplateComplexity;
  tags?: string[];
  search?: string;
  skip?: number;
  limit?: number;
}

export interface TemplateListResponse {
  total: number;
  items: FlowTemplate[];
}

export interface TemplateImportOptions {
  chatbot_id: string;
  flow_name?: string;
  set_as_main?: boolean;
}

export interface TemplateImportResult {
  flow_id: string;
  flow_name: string;
  message: string;
}
