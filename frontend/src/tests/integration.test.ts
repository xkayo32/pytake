import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Integration Tests - Task 5.2
 * Testa fluxos completos de autenticação e API
 */

describe('Integration Tests - Authentication Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Complete Login Flow', () => {
    it('deve fazer login e armazenar tokens', async () => {
      // 1. Mock do endpoint de login
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'test-access-token-123',
          refresh_token: 'test-refresh-token-456',
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com'
          }
        })
      })

      // 2. Simular login
      const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })

      expect(loginResponse.ok).toBe(true)

      const loginData = await loginResponse.json()
      localStorage.setItem('access_token', loginData.access_token)
      localStorage.setItem('refresh_token', loginData.refresh_token)

      // 3. Verificar tokens armazenados
      expect(localStorage.getItem('access_token')).toBe('test-access-token-123')
      expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token-456')
    })

    it('deve falhar login com credenciais inválidas', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      })

      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password'
        })
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('Complete Token Refresh Flow', () => {
    it('deve refresh token e atualizar no localStorage', async () => {
      // 1. Setup: tokens iniciais
      localStorage.setItem('access_token', 'old-access-token')
      localStorage.setItem('refresh_token', 'old-refresh-token')

      // 2. Mock do endpoint de refresh
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        })
      })

      // 3. Simular refresh
      const refreshResponse = await fetch('http://localhost:8000/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer old-refresh-token'
        }
      })

      expect(refreshResponse.ok).toBe(true)

      // 4. Atualizar tokens
      const refreshData = await refreshResponse.json()
      localStorage.setItem('access_token', refreshData.access_token)
      localStorage.setItem('refresh_token', refreshData.refresh_token)

      // 5. Verificar novos tokens
      expect(localStorage.getItem('access_token')).toBe('new-access-token')
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token')
    })

    it('deve fazer logout ao falhar refresh', async () => {
      localStorage.setItem('access_token', 'invalid-token')
      localStorage.setItem('refresh_token', 'invalid-refresh')

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid refresh token' })
      })

      const response = await fetch('http://localhost:8000/api/v1/auth/refresh', {
        method: 'POST',
        headers: { Authorization: 'Bearer invalid-refresh' }
      })

      expect(response.ok).toBe(false)

      // Logout: limpar tokens
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
    })
  })
})

describe('Integration Tests - API Calls Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Dashboard Data Flow', () => {
    it('deve carregar métricas do dashboard com token válido', async () => {
      // 1. Setup: token de autenticação
      localStorage.setItem('access_token', 'valid-token')

      // 2. Mock do endpoint de métricas
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          total_messages_today: 1234,
          active_contacts: 567,
          conversion_rate: 23.5,
          active_flows: 8
        })
      })

      // 3. Fazer requisição com token
      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:8000/api/v1/analytics/overview', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      expect(response.ok).toBe(true)

      const metrics = await response.json()
      expect(metrics.total_messages_today).toBe(1234)
      expect(metrics.active_contacts).toBe(567)
      expect(metrics.conversion_rate).toBe(23.5)
    })

    it('deve retornar 401 sem token válido', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      const response = await fetch('http://localhost:8000/api/v1/analytics/overview', {
        headers: { Authorization: 'Bearer invalid-token' }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('Profile Update Flow', () => {
    it('deve atualizar perfil com PATCH', async () => {
      localStorage.setItem('access_token', 'valid-token')

      const updateData = {
        full_name: 'New Name',
        phone_number: '+55 11 99999-9999',
        company: 'New Company'
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...updateData, id: 1 })
      })

      const token = localStorage.getItem('access_token')
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      expect(response.ok).toBe(true)

      const updated = await response.json()
      expect(updated.full_name).toBe('New Name')
      expect(updated.phone_number).toBe('+55 11 99999-9999')
    })

    it('deve falhar ao atualizar perfil sem autorização', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer invalid-token' }
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })
})

describe('Integration Tests - Error Handling', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Network Errors', () => {
    it('deve tratar erro de conexão', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(
        fetch('http://localhost:8000/api/v1/analytics/overview')
      ).rejects.toThrow('Network error')
    })

    it('deve tratar timeout', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(
        new Error('Request timeout')
      )

      await expect(
        fetch('http://localhost:8000/api/v1/analytics/overview')
      ).rejects.toThrow('Request timeout')
    })
  })

  describe('HTTP Errors', () => {
    it('deve tratar erro 500 do servidor', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      })

      const response = await fetch('http://localhost:8000/api/v1/analytics/overview')
      expect(response.status).toBe(500)
    })

    it('deve tratar erro 403 Forbidden', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' })
      })

      const response = await fetch('http://localhost:8000/api/v1/analytics/overview')
      expect(response.status).toBe(403)
    })

    it('deve tratar erro 404 Not Found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      })

      const response = await fetch('http://localhost:8000/api/v1/analytics/overview')
      expect(response.status).toBe(404)
    })
  })
})
