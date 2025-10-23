/**
 * User Types
 * Baseado em backend/app/schemas/user.py
 */

export type UserRole = 'super_admin' | 'org_admin' | 'agent' | 'viewer';

export interface UserBase {
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  job_title?: string;
}

export interface UserCreate extends UserBase {
  password: string;
  role: UserRole;
  assigned_department_ids?: string[];
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  job_title?: string;
  role?: UserRole;
  is_active?: boolean;
  assigned_department_ids?: string[];
}

export interface User extends UserBase {
  id: string;
  organization_id: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  total_conversations: number;
  total_messages_sent: number;
  avg_response_time_minutes?: number;
  conversations_resolved: number;
  conversations_active: number;
}

// Agent Skill Types (match backend schemas)
export interface AgentSkill {
  id: string;
  organization_id: string;
  user_id: string;
  skill_name: string;
  proficiency_level: number; // 1..5
}
