import Cookies from 'js-cookie'

// API helper to get the correct API URL
export function getApiUrl(): string {
  // Browser-side detection
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    
    // Match based on current hostname
    if (origin.includes('app-dev.pytake.net')) {
      return 'https://api-dev.pytake.net/api/v1'
    }
    if (origin.includes('app-staging.pytake.net')) {
      return 'https://api-staging.pytake.net/api/v1'
    }
    if (origin.includes('app.pytake.net') || origin.includes('pytake.net')) {
      return 'https://api.pytake.net/api/v1'
    }
    if (origin.includes('localhost:3001') || origin.includes('127.0.0.1:3001') || origin.includes('localhost:3000') || origin.includes('127.0.0.1:3000')) {
      return 'http://localhost:8000/api/v1'
    }
  }

  // Use environment variable if available (server-side or build time)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Default fallback
  return 'https://api-dev.pytake.net/api/v1'
}

// Get WebSocket URL from API URL
export function getWebSocketUrl(): string {
  const apiUrl = getApiUrl()
  
  // Convert HTTP(S) to WS(S)
  if (apiUrl.startsWith('https://')) {
    return apiUrl.replace('https://', 'wss://') + '/ws'
  }
  if (apiUrl.startsWith('http://')) {
    return apiUrl.replace('http://', 'ws://') + '/ws'
  }
  
  // Fallback
  return `wss://api-dev.pytake.net/ws`
}

// Get auth headers with Bearer token
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = Cookies.get('auth-token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}
