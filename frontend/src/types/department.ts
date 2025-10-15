/**
 * Department Types
 * Baseado em backend/app/schemas/department.py
 */

export type RoutingMode = 'round_robin' | 'load_balance' | 'manual';

export interface BusinessHoursDay {
  enabled: boolean;
  start?: string; // HH:MM format
  end?: string; // HH:MM format
}

export interface BusinessHours {
  monday?: BusinessHoursDay;
  tuesday?: BusinessHoursDay;
  wednesday?: BusinessHoursDay;
  thursday?: BusinessHoursDay;
  friday?: BusinessHoursDay;
  saturday?: BusinessHoursDay;
  sunday?: BusinessHoursDay;
}

export interface DepartmentBase {
  name: string;
  description?: string;
  color: string; // Hex color (e.g., "#3B82F6")
  icon?: string;
}

export interface DepartmentCreate extends DepartmentBase {
  slug?: string;
  is_active?: boolean;
  business_hours?: BusinessHours;
  offline_message?: string;
  routing_mode?: RoutingMode;
  auto_assign_conversations?: boolean;
  max_conversations_per_agent?: number;
}

export interface DepartmentUpdate {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
  business_hours?: BusinessHours;
  offline_message?: string;
  routing_mode?: RoutingMode;
  auto_assign_conversations?: boolean;
  max_conversations_per_agent?: number;
}

export interface Department extends DepartmentBase {
  id: string;
  organization_id: string;
  slug: string;
  is_active: boolean;
  business_hours: BusinessHours;
  offline_message?: string;
  routing_mode: RoutingMode;
  auto_assign_conversations: boolean;
  max_conversations_per_agent: number;
  agent_ids: string[];

  // Statistics
  total_agents: number;
  total_conversations: number;
  active_conversations: number;
  queued_conversations: number;

  // Performance Metrics
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

export interface DepartmentWithStats extends Department {
  agents_online: number;
  agents_available: number;
  average_wait_time_seconds?: number;
  is_within_business_hours: boolean;
}

export interface DepartmentStats {
  total_departments: number;
  active_departments: number;
  total_agents: number;
  total_queued_conversations: number;
}
