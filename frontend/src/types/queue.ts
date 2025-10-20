/**
 * Queue types for TypeScript
 */

export type RoutingMode = 'round_robin' | 'load_balance' | 'manual' | 'skills_based';

export interface Queue {
  id: string;
  organization_id: string;
  department_id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  is_active: boolean;
  priority: number;
  sla_minutes?: number;
  routing_mode: RoutingMode;
  auto_assign_conversations: boolean;
  max_conversations_per_agent: number;

  // Statistics
  total_conversations: number;
  active_conversations: number;
  queued_conversations: number;
  completed_conversations: number;

  // Metrics
  average_wait_time_seconds?: number;
  average_response_time_seconds?: number;
  average_resolution_time_seconds?: number;
  customer_satisfaction_score?: number;

  // Settings
  settings: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface QueueCreate {
  department_id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  priority?: number;
  sla_minutes?: number;
  routing_mode?: RoutingMode;
  auto_assign_conversations?: boolean;
  max_conversations_per_agent?: number;
  settings?: Record<string, any>;
}

export interface QueueUpdate {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  priority?: number;
  sla_minutes?: number;
  routing_mode?: RoutingMode;
  auto_assign_conversations?: boolean;
  max_conversations_per_agent?: number;
  settings?: Record<string, any>;
}
