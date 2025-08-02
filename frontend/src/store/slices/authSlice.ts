import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authApi } from '@/services/api/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  token: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  getCurrentUser: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<boolean>
  clearError: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authApi.login({ email, password })
          
          if (response.success && response.data) {
            set({
              user: response.data.user,
              token: response.data.tokens.accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            return true
          } else {
            set({
              error: response.error || 'Login failed',
              isLoading: false
            })
            return false
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          })
          return false
        }
      },

      logout: async () => {
        set({ isLoading: true })
        
        try {
          await authApi.logout()
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          })
        }
      },

      getCurrentUser: async () => {
        set({ isLoading: true })
        
        try {
          const response = await authApi.getCurrentUser()
          
          if (response.success && response.data) {
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: response.error || null
            })
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to get user'
          })
        }
      },

      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authApi.updateProfile(data)
          
          if (response.success && response.data) {
            set({
              user: response.data,
              isLoading: false,
              error: null
            })
            return true
          } else {
            set({
              error: response.error || 'Update failed',
              isLoading: false
            })
            return false
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Update failed',
            isLoading: false
          })
          return false
        }
      },

      clearError: () => set({ error: null }),
      
      setLoading: (loading: boolean) => set({ isLoading: loading })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
)