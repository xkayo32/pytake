import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { authApi } from '../api/auth'

export interface User {
  id: string
  email: string
  name: string
  role: string
  tenant_id: string
  is_active: boolean
  permissions: string[]
  created_at: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = Cookies.get('auth-token')
      if (!token) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
        return
      }

      const user = await authApi.me()
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      })
    } catch (error) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password)
      
      if (response.token) {
        // Store tokens
        Cookies.set('auth-token', response.token, { expires: 1 })
        if (response.refresh_token) {
          Cookies.set('refresh-token', response.refresh_token, { expires: 7 })
        }

        // Update state
        setAuthState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
        })

        return { success: true, user: response.user }
      }

      return { success: false, error: 'Invalid response from server' }
    } catch (error: any) {
      let errorMessage = 'Login failed'
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      return { success: false, error: errorMessage }
    }
  }

  const register = async (data: {
    email: string
    password: string
    name: string
    tenant_name?: string
  }) => {
    try {
      const response = await authApi.register(data)
      
      if (response.token) {
        // Store tokens
        Cookies.set('auth-token', response.token, { expires: 1 })
        if (response.refresh_token) {
          Cookies.set('refresh-token', response.refresh_token, { expires: 7 })
        }

        // Update state
        setAuthState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
        })

        return { success: true, user: response.user }
      }

      return { success: false, error: 'Invalid response from server' }
    } catch (error: any) {
      let errorMessage = 'Registration failed'
      
      if (error.response?.status === 409) {
        errorMessage = 'Email already exists'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })
      router.push('/login')
    }
  }

  return {
    ...authState,
    login,
    register,
    logout,
    checkAuthStatus,
  }
}