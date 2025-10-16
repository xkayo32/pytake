/**
 * Chatbots API Client
 * Complete API for chatbots, flows, and nodes management
 */

import { api } from '../api';
import type {
  Chatbot,
  ChatbotCreate,
  ChatbotUpdate,
  ChatbotListResponse,
  ChatbotStats,
  ChatbotWithFlows,
  Flow,
  FlowCreate,
  FlowUpdate,
  FlowListResponse,
  FlowWithNodes,
  Node,
  NodeCreate,
  NodeUpdate,
  NodeListResponse,
} from '@/types/chatbot';

// ============================================
// CHATBOT ENDPOINTS
// ============================================

export const chatbotsAPI = {
  /**
   * List all chatbots for current organization
   */
  list: async (params?: { skip?: number; limit?: number }): Promise<ChatbotListResponse> => {
    const response = await api.get('/chatbots/', { params });
    return response.data;
  },

  /**
   * Get chatbot by ID
   */
  get: async (id: string): Promise<Chatbot> => {
    const response = await api.get(`/chatbots/${id}`);
    return response.data;
  },

  /**
   * Get chatbot with all flows loaded
   */
  getFull: async (id: string): Promise<ChatbotWithFlows> => {
    const response = await api.get(`/chatbots/${id}/full`);
    return response.data;
  },

  /**
   * Get chatbot statistics
   */
  getStats: async (id: string): Promise<ChatbotStats> => {
    const response = await api.get(`/chatbots/${id}/stats`);
    return response.data;
  },

  /**
   * Create a new chatbot
   */
  create: async (data: ChatbotCreate): Promise<Chatbot> => {
    const response = await api.post('/chatbots/', data);
    return response.data;
  },

  /**
   * Update chatbot
   */
  update: async (id: string, data: ChatbotUpdate): Promise<Chatbot> => {
    const response = await api.patch(`/chatbots/${id}`, data);
    return response.data;
  },

  /**
   * Activate chatbot (validates flow structure)
   */
  activate: async (id: string): Promise<Chatbot> => {
    const response = await api.post(`/chatbots/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate chatbot
   */
  deactivate: async (id: string): Promise<Chatbot> => {
    const response = await api.post(`/chatbots/${id}/deactivate`);
    return response.data;
  },

  /**
   * Soft delete chatbot
   */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/chatbots/${id}`);
  },
};

// ============================================
// FLOW ENDPOINTS
// ============================================

export const flowsAPI = {
  /**
   * Create a new flow for chatbot
   */
  create: async (chatbotId: string, data: FlowCreate): Promise<Flow> => {
    const response = await api.post(`/chatbots/${chatbotId}/flows`, data);
    return response.data;
  },

  /**
   * List all flows for chatbot
   */
  list: async (chatbotId: string): Promise<FlowListResponse> => {
    const response = await api.get(`/chatbots/${chatbotId}/flows`);
    return response.data;
  },

  /**
   * Get flow by ID
   */
  get: async (flowId: string): Promise<Flow> => {
    const response = await api.get(`/chatbots/flows/${flowId}`);
    return response.data;
  },

  /**
   * Get flow with all nodes loaded
   */
  getFull: async (flowId: string): Promise<FlowWithNodes> => {
    const response = await api.get(`/chatbots/flows/${flowId}/full`);
    return response.data;
  },

  /**
   * Update flow
   */
  update: async (flowId: string, data: FlowUpdate): Promise<Flow> => {
    const response = await api.patch(`/chatbots/flows/${flowId}`, data);
    return response.data;
  },

  /**
   * Soft delete flow
   */
  delete: async (flowId: string): Promise<void> => {
    await api.delete(`/chatbots/flows/${flowId}`);
  },
};

// ============================================
// NODE ENDPOINTS
// ============================================

export const nodesAPI = {
  /**
   * Create a new node for flow
   */
  create: async (flowId: string, data: NodeCreate): Promise<Node> => {
    const response = await api.post(`/chatbots/flows/${flowId}/nodes`, data);
    return response.data;
  },

  /**
   * List all nodes for flow
   */
  list: async (flowId: string): Promise<NodeListResponse> => {
    const response = await api.get(`/chatbots/flows/${flowId}/nodes`);
    return response.data;
  },

  /**
   * Update node
   */
  update: async (nodeId: string, data: NodeUpdate): Promise<Node> => {
    const response = await api.patch(`/chatbots/nodes/${nodeId}`, data);
    return response.data;
  },

  /**
   * Delete node
   */
  delete: async (nodeId: string): Promise<void> => {
    await api.delete(`/chatbots/nodes/${nodeId}`);
  },
};

// ============================================
// AI FLOW ASSISTANT ENDPOINTS
// ============================================

export const aiFlowAssistantAPI = {
  /**
   * Generate flow from natural language description
   */
  generateFlow: async (data: {
    description: string;
    industry?: string;
    language: string;
    chatbot_id?: string;
  }): Promise<{
    status: 'success' | 'needs_clarification' | 'error';
    flow_data?: {
      name: string;
      description: string;
      canvas_data: {
        nodes: any[];
        edges: any[];
      };
    };
    clarification_questions?: Array<{
      question: string;
      options?: string[];
      field: string;
    }>;
    error_message?: string;
  }> => {
    const response = await api.post('/ai-assistant/generate-flow', data);
    return response.data;
  },

  /**
   * Check if AI Assistant is enabled and configured
   */
  checkEnabled: async (): Promise<{
    enabled: boolean;
    configured: boolean;
    provider?: 'openai' | 'anthropic';
  }> => {
    const response = await api.get('/ai-assistant/settings');
    return {
      enabled: response.data.enabled || false,
      configured: !!(response.data.api_key),
      provider: response.data.provider,
    };
  },
};

export default { chatbotsAPI, flowsAPI, nodesAPI, aiFlowAssistantAPI };
