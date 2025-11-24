/**
 * API utilities and configuration
 * Fornece funções para construir URLs de API e headers de autenticação
 */

/**
 * Get the API base URL
 * Usa VITE_API_URL ou defaults para https://api-dev.pytake.net
 */
export function getApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    return apiUrl
  }
  
  // Default para desenvolvimento com Nginx
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8002'
  }
  
  // Default para produção/staging
  return 'https://api-dev.pytake.net'
}

/**
 * Get authorization headers for API requests
 * @param token - Access token (optional, usa localStorage se não fornecido)
 */
export function getAuthHeaders(token?: string): Record<string, string> {
  const accessToken = token || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null)
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  return headers
}

/**
 * Fetch wrapper com suporte a autenticação
 */
export async function apiFetch(
  endpoint: string,
  options?: RequestInit & { token?: string }
): Promise<Response> {
  const { token, ...fetchOptions } = options || {}
  
  const url = `${getApiUrl()}${endpoint}`
  const headers = {
    ...getAuthHeaders(token),
    ...(fetchOptions.headers as Record<string, string>),
  }

  return fetch(url, {
    ...fetchOptions,
    headers,
  })
}

/**
 * Typed API fetch wrapper
 */
export async function apiJson<T>(
  endpoint: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const response = await apiFetch(endpoint, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || response.statusText)
  }

  return response.json()
}
