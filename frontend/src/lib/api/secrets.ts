/**
 * Secrets API Client
 * 
 * Handles encrypted secrets management (API keys, passwords, tokens, etc.)
 * Provides CRUD operations and validation for secure secret storage
 */

import { api } from '@/lib/api';
// Tipos provisórios (definir em '@/types/secret' futuramente)
export interface Secret {
  id: string
  name: string
  description?: string
  status?: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

export interface SecretCreate { name: string; value: string; description?: string }
export interface SecretUpdate { name?: string; value?: string; description?: string }
export interface SecretRotateKey { provider?: string }
export interface SecretListFilters { status?: string; name?: string }
export interface SecretListResponse { items: Secret[] }
export interface SecretValidationResponse { valid: boolean; message?: string }
export interface SecretUsageStats { id: string; usages: number; lastUsedAt?: string }

export const secretsAPI = {
  /**
   * List all secrets with optional filters
   */
  list: (params?: SecretListFilters & { skip?: number; limit?: number }) =>
    api.get<Secret[]>('/secrets/', { params }),

  /**
   * Get a single secret by ID
   * Note: This returns metadata only, not the decrypted value
   */
  get: (id: string) =>
    api.get<Secret>(`/secrets/${id}`),

  /**
   * Create a new secret
   * The value will be encrypted server-side
   */
  create: (data: SecretCreate) =>
    api.post<Secret>('/secrets/', data),

  /**
   * Update an existing secret
   * If value is provided, it will be re-encrypted
   */
  update: (id: string, data: SecretUpdate) =>
    api.put<Secret>(`/secrets/${id}`, data),

  /**
   * Delete a secret permanently
   * Warning: This cannot be undone!
   */
  delete: (id: string) =>
    api.delete(`/secrets/${id}`),

  /**
   * Activate a secret (make it available for use)
   */
  activate: (id: string) =>
    api.post<Secret>(`/secrets/${id}/activate`),

  /**
   * Deactivate a secret (prevent usage without deleting)
   */
  deactivate: (id: string) =>
    api.post<Secret>(`/secrets/${id}/deactivate`),

  /**
   * Rotate encryption key for a secret
   * Re-encrypts the secret with a new key/provider
   */
  rotateKey: (id: string, data: SecretRotateKey) =>
    api.post<Secret>(`/secrets/${id}/rotate-key`, data),

  /**
   * Test connection/validation for a secret
   * Useful for API keys, database credentials, etc.
   */
  testConnection: (id: string, testType?: string) =>
    api.post<SecretValidationResponse>(`/secrets/${id}/test`, { test_type: testType }),

  /**
   * Validate a secret (alias for testConnection for backwards compatibility)
   */
  validate: (id: string) =>
    api.post<SecretValidationResponse>(`/secrets/${id}/test`, {}),

  /**
   * Get usage statistics for a secret
   */
  getUsageStats: (id: string) =>
    api.get<SecretUsageStats>(`/secrets/${id}/usage`),

  /**
   * Get usage statistics for all secrets (optional: filter by chatbot)
   */
  getOrganizationUsageStats: (params?: { chatbot_id?: string }) =>
    api.get<SecretUsageStats[]>('/secrets/usage/organization', { params }),

  /**
   * Get the decrypted value of a secret
   * SECURITY WARNING: Use this only when absolutely necessary!
   * Consider using reference-based access in backend instead
   */
  getValue: (id: string) =>
    api.get<{ value: string }>(`/secrets/${id}/value`),
};
