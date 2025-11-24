/**
 * API utilities and configuration
 * Fornece funções para construir URLs de API e headers de autenticação
 */

/**
 * Get the API base URL
 * Sempre usa https://api-dev.pytake.net (ou VITE_API_URL se definida)
 * O Nginx proxy-passa todas as requisições em desenvolvimento
 */
export function getApiUrl(): string {
  // Use VITE_API_URL se definida (production/staging)
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    return apiUrl
  }
  
  // Default: sempre https://api-dev.pytake.net
  // Em desenvolvimento, o Nginx faz proxy da porta 443 → backend:8002
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
