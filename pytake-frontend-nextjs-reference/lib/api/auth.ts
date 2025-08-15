import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10000,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = Cookies.get('refresh-token')
        if (refreshToken) {
          const response = await api.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken
          })

          const { token, refresh_token } = response.data
          
          // Update tokens
          Cookies.set('auth-token', token, { expires: 1 }) // 1 day
          Cookies.set('refresh-token', refresh_token, { expires: 7 }) // 7 days

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        Cookies.remove('auth-token')
        Cookies.remove('refresh-token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Auth API functions
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/v1/auth/login', {
      email,
      password,
    })
    return response.data
  },

  register: async (data: {
    email: string
    password: string
    name: string
    tenant_name?: string
  }) => {
    const response = await api.post('/api/v1/auth/register', data)
    return response.data
  },

  logout: async () => {
    try {
      await api.post('/api/v1/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      Cookies.remove('auth-token')
      Cookies.remove('refresh-token')
    }
  },

  me: async () => {
    const response = await api.get('/api/v1/auth/me')
    return response.data
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/api/v1/auth/forgot-password', {
      email,
    })
    return response.data
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/api/v1/auth/reset-password', {
      token,
      new_password: newPassword,
    })
    return response.data
  },
}

export default api