import apiClient from './client'
import type { LoginRequest, LoginResponse, User } from '@/types'

export const authApi = {
  async login(credentials: LoginRequest) {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    
    if (response.success && response.data) {
      apiClient.setToken(response.data.tokens.accessToken)
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken)
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
      apiClient.setToken(response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
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