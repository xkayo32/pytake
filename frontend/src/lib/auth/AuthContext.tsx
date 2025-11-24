import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  organization_id: string
}

interface Token {
  access_token: string
  refresh_token: string
  token_type: string
}

interface AuthContextType {
  user: User | null
  token: Token | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, organizationName: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<Token | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Validar token ao carregar
  useEffect(() => {
    const accessToken = localStorage.getItem(TOKEN_KEY)
    if (accessToken) {
      validateToken(accessToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async (accessToken: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
        headers: getAuthHeaders(accessToken),
      })

      if (!response.ok) {
        throw new Error('Token validation failed')
      }

      const userData = await response.json()
      setUser(userData)
      setToken({
        access_token: accessToken,
        refresh_token: localStorage.getItem(REFRESH_TOKEN_KEY) || '',
        token_type: 'bearer',
      })
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      setUser(null)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      const response = await fetch(`${getApiUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Login failed')
      }

      const data = await response.json()
      
      // Salvar tokens
      localStorage.setItem(TOKEN_KEY, data.token.access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.token.refresh_token)

      // Atualizar estado
      setToken(data.token)
      setUser(data.user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    }
  }

  const register = async (
    email: string,
    password: string,
    fullName: string,
    organizationName: string
  ) => {
    try {
      setError(null)
      const response = await fetch(`${getApiUrl()}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          organization_name: organizationName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Registration failed')
      }

      const data = await response.json()

      // Salvar tokens
      localStorage.setItem(TOKEN_KEY, data.token.access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.token.refresh_token)

      // Atualizar estado
      setToken(data.token)
      setUser(data.user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    }
  }

  const logout = async () => {
    try {
      const accessToken = localStorage.getItem(TOKEN_KEY)
      if (accessToken) {
        await fetch(`${getApiUrl()}/api/v1/auth/logout`, {
          method: 'POST',
          headers: getAuthHeaders(accessToken),
        })
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      setUser(null)
      setToken(null)
      setError(null)
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
