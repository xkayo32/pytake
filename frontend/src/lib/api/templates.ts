/**
 * Flow Templates API Client
 * API for browsing and importing flow templates
 */

import { api } from '../api';
import type {
  FlowTemplate,
  TemplateCategory,
  TemplateFilters,
  TemplateListResponse,
  TemplateImportOptions,
  TemplateImportResult,
} from '@/types/template';

export const templatesAPI = {
  /**
   * List all template categories
   */
  getCategories: async (): Promise<TemplateCategory[]> => {
    const response = await api.get('/ai-assistant/templates/categories');
    return response.data;
  },

  /**
   * List templates with optional filters
   */
  list: async (filters?: TemplateFilters): Promise<TemplateListResponse> => {
    const response = await api.get('/ai-assistant/templates', { params: filters });
    return response.data;
  },

  /**
   * Get a specific template by ID
   */
  get: async (id: string): Promise<FlowTemplate> => {
    const response = await api.get(`/ai-assistant/templates/${id}`);
    return response.data;
  },

  /**
   * Search templates by text query
   */
  search: async (query: string, filters?: Omit<TemplateFilters, 'search'>): Promise<TemplateListResponse> => {
    const response = await api.get(`/ai-assistant/templates/search/${query}`, { params: filters });
    return response.data;
  },

  /**
   * Import a template as a new flow in a chatbot
   */
  import: async (templateId: string, options: TemplateImportOptions): Promise<TemplateImportResult> => {
    const response = await api.post(`/ai-assistant/templates/${templateId}/import`, options);
    return response.data;
  },
};

export default templatesAPI;
