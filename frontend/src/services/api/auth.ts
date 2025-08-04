import apiClient from './client'
import type { LoginRequest, LoginResponse, User } from '@/types'

export const authApi = {
  async login(credentials: LoginRequest) {
    // Use the in-memory auth endpoint for development
    const response = await apiClient.post<any>('/auth/login', credentials)
    console.log('Raw API response:', response)
    
    if (response.success && response.data) {
      // Store tokens - backend returns access_token directly
      const accessToken = response.data.access_token
      const refreshToken = response.data.refresh_token
      
      apiClient.setToken(accessToken)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      
      // Transform user data to match AuthUser type
      const user = {
        id: response.data.user.id,
        email: response.data.user.email,
        name: response.data.user.name,
        role: response.data.user.role === 'admin' ? 'Admin' : 
              response.data.user.role === 'supervisor' ? 'Supervisor' : 
              response.data.user.role === 'agent' ? 'Agent' : 
              response.data.user.role === 'viewer' ? 'Viewer' : 'Agent',
        organization_id: response.data.user.organization_id || 'default',
        permissions: [], // Will be populated based on role
        status: 'Active' as const
      }
      
      // Transform response to match expected format
      return {
        success: true,
        data: {
          user: user,
          tokens: {
            accessToken: accessToken,
            refreshToken: refreshToken
          }
        }
      }
    }
    
    return response
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      apiClient.clearToken()
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  },

  async getCurrentUser() {
    return apiClient.get<User>('/auth/me')
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken
    })

    if (response.success && response.data) {
      const accessToken = response.data.access_token || response.data.accessToken
      const refreshToken = response.data.refresh_token || response.data.refreshToken
      
      if (accessToken) {
        apiClient.setToken(accessToken)
        localStorage.setItem('accessToken', accessToken)
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken)
      }
    }

    return response
  },

  async updateProfile(data: Partial<User>) {
    return apiClient.put<User>('/auth/profile', data)
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return apiClient.post('/auth/change-password', data)
  }
}