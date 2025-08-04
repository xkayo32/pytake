import type { ApiResponse } from '@/types'

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL = '/api/v1') {
    this.baseURL = baseURL
    this.token = localStorage.getItem('accessToken')
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('accessToken', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken()
          if (refreshed) {
            // Retry request with new token
            return this.request(endpoint, options)
          } else {
            this.clearToken()
            window.location.href = '/login'
          }
        }
        
        return {
          success: false,
          error: data.message || data.error || 'Request failed'
        }
      }

      return {
        success: true,
        data: data,
        message: data.message
      }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return false

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      })

      if (response.ok) {
        const data = await response.json()
        const accessToken = data.access_token || data.accessToken
        const refreshToken = data.refresh_token || data.refreshToken
        
        if (accessToken) {
          this.setToken(accessToken)
        }
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken)
        }
        return true
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
    }

    return false
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Upload file
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
    }

    const headers: HeadersInit = {}
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Upload failed'
        }
      }

      return {
        success: true,
        data: data,
        message: data.message
      }
    } catch (error) {
      console.error('Upload failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload error'
      }
    }
  }
}

export const apiClient = new ApiClient()
export default apiClient
