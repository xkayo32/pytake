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
  max_queue_size?: number;
  overflow_queue_id?: string | null;

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
  max_queue_size?: number;
  overflow_queue_id?: string;
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
  max_queue_size?: number;
  overflow_queue_id?: string;
  settings?: Record<string, any>;
}

// Queue metrics types matching backend schema
export interface QueueVolumeMetrics {
  hour: number;
  count: number;
}

export interface QueueOccupancyTrend {
  day: string;
  queued: number;
  capacity: number;
  occupancy_percent: number;
}

export interface QueueMetrics {
  // Volume metrics
  total_conversations: number;
  conversations_today: number;
  conversations_7d: number;
  conversations_30d: number;
  queued_now: number;
  active_now: number;
  closed_today: number;
  
  // Time metrics (in seconds)
  avg_wait_time: number | null;
  avg_response_time: number | null;
  avg_resolution_time: number | null;
  
  // SLA metrics
  sla_violations_today: number;
  sla_violations_7d: number;
  sla_compliance_rate: number | null;
  
  // Quality metrics
  resolution_rate: number | null;
  csat_score: number | null;
  
  // Volume by hour (last 24h)
  volume_by_hour: QueueVolumeMetrics[];
  
  // Overflow metrics
  overflow_events: number;
  overflow_rate: number | null;
  occupancy_trend: QueueOccupancyTrend[];
}
