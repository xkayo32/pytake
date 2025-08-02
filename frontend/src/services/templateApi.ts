// Template API service

import { apiClient } from './api/client';
import type {
  Template,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateFilters,
  TemplateWithStats,
  UseTemplateRequest,
  UseTemplateResponse,
  CloneTemplateRequest,
  TemplateCategory
} from '@/types/template';

interface PaginatedResponse<T> {
  templates: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export class TemplateApiService {
  /**
   * Create a new template
   */
  static async createTemplate(data: CreateTemplateInput): Promise<Template> {
    const response = await apiClient.post<Template>('/v1/templates', data);
    return response.data!;
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(id: number, data: UpdateTemplateInput): Promise<Template> {
    const response = await apiClient.put<Template>(`/v1/templates/${id}`, data);
    return response.data!;
  }

  /**
   * Get a template by ID
   */
  static async getTemplate(id: number): Promise<Template> {
    const response = await apiClient.get<Template>(`/v1/templates/${id}`);
    return response.data!;
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(id: number): Promise<void> {
    await apiClient.delete(`/v1/templates/${id}`);
  }

  /**
   * List templates with filters
   */
  static async listTemplates(
    filters?: TemplateFilters & { page?: number; page_size?: number }
  ): Promise<Template[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.set(key, String(value));
          }
        }
      });
    }

    const response = await apiClient.get<PaginatedResponse<Template>>(`/v1/templates?${params}`);
    return response.data?.templates || [];
  }

  /**
   * Search templates
   */
  static async searchTemplates(query: string, limit: number = 10): Promise<Template[]> {
    const response = await apiClient.get<Template[]>(
      `/v1/templates/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data || [];
  }

  /**
   * Get templates by category
   */
  static async getTemplatesByCategory(category: string): Promise<Template[]> {
    const response = await apiClient.get<Template[]>(`/v1/templates/category/${category}`);
    return response.data || [];
  }

  /**
   * Get user's favorite templates
   */
  static async getUserFavorites(): Promise<Template[]> {
    const response = await apiClient.get<Template[]>('/v1/templates/favorites');
    return response.data || [];
  }

  /**
   * Get templates with usage statistics
   */
  static async getTemplatesWithStats(): Promise<TemplateWithStats[]> {
    const response = await apiClient.get<TemplateWithStats[]>('/v1/templates/stats');
    return response.data || [];
  }

  /**
   * Use a template (apply variables and increment usage)
   */
  static async useTemplate(
    id: number,
    variables: Record<string, string>
  ): Promise<UseTemplateResponse> {
    const request: UseTemplateRequest = { variables };
    const response = await apiClient.post<UseTemplateResponse>(
      `/v1/templates/${id}/use`,
      request
    );
    return response.data!;
  }

  /**
   * Clone a template
   */
  static async cloneTemplate(id: number, newName: string): Promise<Template> {
    const request: CloneTemplateRequest = { new_name: newName };
    const response = await apiClient.post<Template>(`/v1/templates/${id}/clone`, request);
    return response.data!;
  }

  /**
   * Get template by shortcut
   */
  static async getTemplateByShortcut(shortcut: string): Promise<Template> {
    const response = await apiClient.get<Template>(
      `/v1/templates/shortcut/${encodeURIComponent(shortcut)}`
    );
    return response.data!;
  }

  /**
   * Get available template categories
   */
  static async getTemplateCategories(): Promise<TemplateCategory[]> {
    const response = await apiClient.get<TemplateCategory[]>('/v1/templates/categories');
    return response.data || [];
  }
}

// React Query keys for template data
export const templateQueryKeys = {
  all: ['templates'] as const,
  lists: () => [...templateQueryKeys.all, 'list'] as const,
  list: (filters?: TemplateFilters) => [...templateQueryKeys.lists(), filters] as const,
  details: () => [...templateQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...templateQueryKeys.details(), id] as const,
  search: (query: string) => [...templateQueryKeys.all, 'search', query] as const,
  category: (category: string) => [...templateQueryKeys.all, 'category', category] as const,
  favorites: () => [...templateQueryKeys.all, 'favorites'] as const,
  stats: () => [...templateQueryKeys.all, 'stats'] as const,
  categories: () => [...templateQueryKeys.all, 'categories'] as const,
};

// Helper functions
export const parseTemplateVariables = (content: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = Array.from(content.matchAll(regex));
  return [...new Set(matches.map(match => match[1]))];
};

export const applyVariablesToTemplate = (
  content: string,
  variables: Record<string, string>
): string => {
  let processed = content;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    processed = processed.replace(regex, value);
  });
  return processed;
};

export const templateApi = TemplateApiService;