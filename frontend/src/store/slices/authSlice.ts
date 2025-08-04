import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import type { AuthUser, Role, Permission } from '@/types/auth'
import { authApi } from '@/services/api/auth'
import { ROLE_PERMISSIONS, hasPermission, hasRole } from '@/utils/permissions'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  token: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  getCurrentUser: () => Promise<void>
  updateProfile: (data: Partial<AuthUser>) => Promise<boolean>
  clearError: () => void
  setLoading: (loading: boolean) => void
  hasPermission: (permission: Permission) => boolean
  hasRole: (role: Role) => boolean
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
        // Don't clear error immediately to prevent flash
        set({ isLoading: true })
        
        try {
          const response = await authApi.login({ email, password })
          console.log('Login response:', response) // Debug log
          
          if (response.success && response.data) {
            const accessToken = response.data.tokens?.accessToken || response.data.access_token
            const user = response.data.user
            
            if (!accessToken) {
              console.error('No access token in response:', response.data)
              throw new Error('Invalid response format')
            }
            
            set({
              user: user,
              token: accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            return true
          } else {
            const errorMessage = response.error || 'Email ou senha incorretos'
            set({
              error: errorMessage,
              isLoading: false,
              isAuthenticated: false,
              user: null,
              token: null
            })
            
            // Keep error visible for at least 5 seconds
            setTimeout(() => {
              const state = get()
              if (state.error === errorMessage && !state.isLoading) {
                set({ error: null })
              }
            }, 5000)
            
            return false
          }
        } catch (error) {
          console.error('Login error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar com servidor'
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null
          })
          
          // Keep error visible for at least 5 seconds
          setTimeout(() => {
            const state = get()
            if (state.error === errorMessage && !state.isLoading) {
              set({ error: null })
            }
          }, 5000)
          
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
      
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      hasPermission: (permission: Permission) => {
        const { user } = get()
        if (!user) return false
        return hasPermission(user.role, permission)
      },

      hasRole: (role: Role) => {
        const { user } = get()
        if (!user) return false
        return hasRole(user.role, role)
      }
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