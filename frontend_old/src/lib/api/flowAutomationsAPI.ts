/**
 * Flow Automations API Client
 */

import api from '@/lib/api';
import type {
  FlowAutomation,
  FlowAutomationCreate,
  FlowAutomationUpdate,
  FlowAutomationListResponse,
  FlowAutomationSchedule,
  FlowAutomationScheduleCreate,
  FlowAutomationScheduleUpdate,
  FlowAutomationScheduleException,
  SchedulePreview,
} from '@/types/flow_automation';

export const flowAutomationsAPI = {
  // ============================================
  // Automation CRUD
  // ============================================

  list: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const response = await api.get('/flow-automations', { params });
    return response.data as FlowAutomationListResponse;
  },

  get: async (id: string) => {
    const response = await api.get(`/flow-automations/${id}`);
    return response.data as FlowAutomation;
  },

  create: async (data: FlowAutomationCreate) => {
    const response = await api.post('/flow-automations', data);
    return response.data as FlowAutomation;
  },

  update: async (id: string, data: FlowAutomationUpdate) => {
    const response = await api.put(`/flow-automations/${id}`, data);
    return response.data as FlowAutomation;
  },

  delete: async (id: string) => {
    await api.delete(`/flow-automations/${id}`);
  },

  // ============================================
  // Automation Control
  // ============================================

  start: async (id: string) => {
    const response = await api.post(`/flow-automations/${id}/start`);
    return response.data;
  },

  pause: async (id: string) => {
    const response = await api.post(`/flow-automations/${id}/pause`);
    return response.data as FlowAutomation;
  },

  resume: async (id: string) => {
    const response = await api.post(`/flow-automations/${id}/resume`);
    return response.data as FlowAutomation;
  },

  // ============================================
  // Schedule Management
  // ============================================

  getSchedule: async (automationId: string) => {
    const response = await api.get(`/flow-automations/${automationId}/schedule`);
    return response.data as FlowAutomationSchedule;
  },

  createSchedule: async (automationId: string, data: FlowAutomationScheduleCreate) => {
    const response = await api.post(`/flow-automations/${automationId}/schedule`, data);
    return response.data as FlowAutomationSchedule;
  },

  updateSchedule: async (automationId: string, data: FlowAutomationScheduleUpdate) => {
    const response = await api.put(`/flow-automations/${automationId}/schedule`, data);
    return response.data as FlowAutomationSchedule;
  },

  deleteSchedule: async (automationId: string) => {
    await api.delete(`/flow-automations/${automationId}/schedule`);
  },

  // ============================================
  // Schedule Preview
  // ============================================

  getSchedulePreview: async (
    automationId: string,
    numExecutions: number = 10,
    daysAhead: number = 30
  ) => {
    const response = await api.get(
      `/flow-automations/${automationId}/schedule/preview`,
      {
        params: {
          num_executions: numExecutions,
          days_ahead: daysAhead,
        },
      }
    );
    return response.data as SchedulePreview;
  },

  // ============================================
  // Schedule Exceptions
  // ============================================

  addException: async (
    automationId: string,
    data: Partial<FlowAutomationScheduleException>
  ) => {
    const response = await api.post(
      `/flow-automations/${automationId}/schedule/exceptions`,
      data
    );
    return response.data as FlowAutomationScheduleException;
  },

  removeException: async (automationId: string, exceptionId: string) => {
    await api.delete(
      `/flow-automations/${automationId}/schedule/exceptions/${exceptionId}`
    );
  },

  listExceptions: async (automationId: string) => {
    const schedule = await flowAutomationsAPI.getSchedule(automationId);
    return schedule.exceptions || [];
  },
};
