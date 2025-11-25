import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getApiUrl, getAuthHeaders, apiFetch } from '@lib/api'

describe('API Utilities', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    process.env.VITE_API_URL = undefined
  })

  describe('getApiUrl', () => {
    it('deve retornar URL padrão da API em desenvolvimento', () => {
      const url = getApiUrl()
      expect(url).toBeDefined()
      expect(typeof url).toBe('string')
      expect(url.length).toBeGreaterThan(0)
    })

    it('deve usar VITE_API_URL se definida', () => {
      process.env.VITE_API_URL = 'https://custom-api.example.com'
      const url = getApiUrl()
      expect(url).toBe('https://custom-api.example.com')
    })
  })

  describe('getAuthHeaders', () => {
    it('deve retornar headers vazios sem token', () => {
      const headers = getAuthHeaders()
      expect(headers).toEqual(
        expect.objectContaining({
          'Content-Type': 'application/json'
        })
      )
    })

    it('deve adicionar Authorization header com token válido', () => {
      const token = 'test-token-123'
      const headers = getAuthHeaders(token)

      expect(headers).toEqual(
        expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        })
      )
    })

    it('deve usar token do localStorage se não fornecido', () => {
      localStorage.setItem('access_token', 'stored-token')
      const headers = getAuthHeaders()

      expect(headers.Authorization).toBe('Bearer stored-token')
    })
  })

  describe('apiFetch', () => {
    it('deve fazer requisição GET com sucesso', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' })
      })

      const result = await apiFetch('/test-endpoint')
      const data = await result.json()

      expect(result.ok).toBe(true)
      expect(data).toEqual({ data: 'test' })
    })

    it('deve fazer requisição POST com dados', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 })
      })

      const result = await apiFetch('/test-endpoint', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' })
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Object)
        })
      )
    })

    it('deve tratar erro de resposta não-ok', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      const result = await apiFetch('/test-endpoint')
      expect(result.ok).toBe(false)
      expect(result.status).toBe(401)
    })

    it('deve repassar headers de autorização', async () => {
      localStorage.setItem('access_token', 'auth-token')

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      })

      await apiFetch('/protected-endpoint')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token'
          })
        })
      )
    })
  })
})
