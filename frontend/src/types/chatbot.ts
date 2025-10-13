/**
 * Chatbot, Flow, and Node TypeScript types
 * Matches backend schemas in app/schemas/chatbot.py
 */

export interface NodeData {
  [key: string]: any;
}

export interface Node {
  id: string;
  organization_id: string;
  flow_id: string;
  node_id: string; // React Flow node ID
  node_type: 'start' | 'message' | 'question' | 'condition' | 'action' | 'api_call' | 'ai_prompt' | 'jump' | 'end' | 'handoff';
  label?: string;
  position_x: number;
  position_y: number;
  data: NodeData;
  order?: number;
  created_at: string;
  updated_at: string;
}

export interface NodeCreate {
  node_id: string;
  node_type: string;
  label?: string;
  position_x?: number;
  position_y?: number;
  data?: NodeData;
  order?: number;
}

export interface NodeUpdate {
  node_id?: string;
  node_type?: string;
  label?: string;
  position_x?: number;
  position_y?: number;
  data?: NodeData;
  order?: number;
}

export interface Flow {
  id: string;
  organization_id: string;
  chatbot_id: string;
  name: string;
  description?: string;
  is_main: boolean;
  is_fallback: boolean;
  canvas_data: {
    nodes: any[];
    edges: any[];
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  };
  variables: Record<string, any>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FlowWithNodes extends Flow {
  nodes: Node[];
}

export interface FlowCreate {
  chatbot_id: string;
  name: string;
  description?: string;
  is_main?: boolean;
  is_fallback?: boolean;
  canvas_data?: {
    nodes: any[];
    edges: any[];
  };
  variables?: Record<string, any>;
  is_active?: boolean;
}

export interface FlowUpdate {
  name?: string;
  description?: string;
  is_main?: boolean;
  is_fallback?: boolean;
  canvas_data?: {
    nodes: any[];
    edges: any[];
  };
  variables?: Record<string, any>;
  is_active?: boolean;
}

export interface Chatbot {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  whatsapp_number_id?: string; // WhatsApp number linked to this chatbot
  is_active: boolean;
  is_published: boolean;
  global_variables: Record<string, any>;
  settings: Record<string, any>;
  total_conversations: number;
  total_messages_sent: number;
  total_messages_received: number;
  version: number;
  published_version?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ChatbotWithFlows extends Chatbot {
  flows: Flow[];
}

export interface ChatbotCreate {
  name: string;
  description?: string;
  avatar_url?: string;
  whatsapp_number_id?: string | null;
  is_active?: boolean;
  is_published?: boolean;
  global_variables?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface ChatbotUpdate {
  name?: string;
  description?: string;
  avatar_url?: string;
  whatsapp_number_id?: string | null;
  is_active?: boolean;
  is_published?: boolean;
  global_variables?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface ChatbotStats {
  total_conversations: number;
  total_messages_sent: number;
  total_messages_received: number;
  total_flows: number;
  total_nodes: number;
  is_active: boolean;
  is_published: boolean;
}

export interface ChatbotListResponse {
  total: number;
  items: Chatbot[];
}

export interface FlowListResponse {
  total: number;
  items: Flow[];
}

export interface NodeListResponse {
  total: number;
  items: Node[];
}

// React Flow types for custom nodes
export interface CustomNodeData {
  label: string;
  nodeType: string;
  config: NodeData;
  onEdit?: () => void;
  onDelete?: () => void;
}
