// Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'supervisor';
  created_at: string;
  updated_at: string;
  profile_picture?: string;
  status: 'active' | 'inactive';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  expires_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// WhatsApp Types
export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document';
  content: string;
  media_url?: string;
  media_type?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  whatsapp_message_id: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageRequest {
  phone_number: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document';
  content: string;
  media_url?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message_id: string;
  whatsapp_message_id: string;
  message: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  phone_number: string;
  contact_name?: string;
  status: 'active' | 'closed' | 'pending';
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface ConversationState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: WhatsAppMessage[];
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
}

// Dashboard Types
export interface DashboardMetrics {
  total_conversations: number;
  active_conversations: number;
  total_messages_today: number;
  response_time_avg: number;
  satisfaction_rate: number;
  agents_online: number;
  messages_per_hour: Array<{
    hour: string;
    count: number;
  }>;
  conversation_status_breakdown: {
    active: number;
    closed: number;
    pending: number;
  };
  top_agents: Array<{
    agent_name: string;
    conversations_handled: number;
    avg_response_time: number;
  }>;
  recent_activity: Array<{
    id: string;
    type: 'message_sent' | 'conversation_assigned' | 'conversation_closed';
    description: string;
    timestamp: string;
    agent_name?: string;
  }>;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'new_message' | 'conversation_update' | 'agent_status' | 'metrics_update';
  payload: any;
  timestamp: string;
}

export interface WebSocketState {
  isConnected: boolean;
  connectionId: string | null;
  error: string | null;
  retryCount: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Form Types
export interface FormState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

// WhatsApp Health Status
export interface WhatsAppHealth {
  status: 'connected' | 'disconnected' | 'error';
  phone_number: string;
  last_check: string;
  message?: string;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'busy';
  active_conversations: number;
  total_conversations_today: number;
  avg_response_time: number;
  last_activity: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

// Theme Types
export interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: string;
}

// Filter and Search Types
export interface ConversationFilters {
  status?: 'active' | 'closed' | 'pending';
  agent_id?: string;
  priority?: 'low' | 'medium' | 'high';
  date_from?: string;
  date_to?: string;
  search_term?: string;
}

export interface MessageFilters {
  conversation_id?: string;
  message_type?: 'text' | 'image' | 'audio' | 'video' | 'document';
  direction?: 'inbound' | 'outbound';
  date_from?: string;
  date_to?: string;
}

// Route Types
export interface RouteConfig {
  path: string;
  title: string;
  icon: string;
  protected: boolean;
  roles?: string[];
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
}

export interface EmptyState {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Export utility types
export type MessageType = WhatsAppMessage['message_type'];
export type MessageDirection = WhatsAppMessage['direction'];
export type ConversationStatus = Conversation['status'];
export type UserRole = User['role'];
export type NotificationType = Notification['type'];