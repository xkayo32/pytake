// API helper to get the correct API URL
export function getApiUrl(): string {
  // Use environment variable if available
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Browser-side detection
  if (typeof window !== 'undefined') {
    // Get current origin and build API URL based on environment
    const origin = window.location.origin
    
    if (origin.includes('app-dev.pytake.net')) {
      return 'https://api-dev.pytake.net'
    }
    if (origin.includes('app-staging.pytake.net')) {
      return 'https://api-staging.pytake.net'
    }
    if (origin.includes('app.pytake.net') || origin.includes('pytake.net')) {
      return 'https://api.pytake.net'
    }
    if (origin.includes('localhost:3001') || origin.includes('127.0.0.1:3001')) {
      return 'http://localhost:8000'
    }
  }

  // Default fallback
  return 'https://api-dev.pytake.net'
}

// Get WebSocket URL from API URL
export function getWebSocketUrl(): string {
  const apiUrl = getApiUrl()
  return apiUrl.replace('https', 'wss').replace('http', 'ws') + '/ws'
}
