import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  name: string
  role: string
  organization_id: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = import.meta.env.VITE_API_URL || 'https://api-dev.pytake.net'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar token ao carregar
    const token = localStorage.getItem('access_token')
    if (token) {
      validateToken(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const validateToken = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(response.data)
    } catch {
      localStorage.removeItem('access_token')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
      email,
      password,
    })
    localStorage.setItem('access_token', response.data.access_token)
    setUser(response.data.user)
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await axios.post(`${API_URL}/api/v1/auth/register`, {
      email,
      password,
      name,
    })
    localStorage.setItem('access_token', response.data.access_token)
    setUser(response.data.user)
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        await axios.post(
          `${API_URL}/api/v1/auth/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      }
    } finally {
      localStorage.removeItem('access_token')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
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
