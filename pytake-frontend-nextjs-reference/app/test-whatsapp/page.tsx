'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WhatsAppConfig {
  id: string
  phone_number_id: string
  access_token: string
  business_account_id: string
  webhook_verify_token: string
  status: string
  created_at: string
  updated_at: string
}

export default function TestWhatsAppPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      console.log('🔄 Iniciando chamada para API...')
      
      const url = '/api/v1/whatsapp-configs'
      console.log('🌐 URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Dados recebidos:', data)
        setConfig(data)
        setError(null)
      } else {
        const errorText = await response.text()
        console.error('❌ Erro HTTP:', response.status, errorText)
        setError(`Erro HTTP: ${response.status} - ${errorText}`)
      }
    } catch (err) {
      console.error('❌ Erro de conexão:', err)
      setError(`Erro de conexão: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teste - Configurações WhatsApp</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Status da Conexão Backend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-muted-foreground">Carregando...</div>
            )}
            
            {error && (
              <div className="text-red-600 bg-red-50 p-4 rounded">
                <strong>Erro:</strong> {error}
              </div>
            )}
            
            {config && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded">
                    <strong className="text-green-800">✅ Conectado com sucesso!</strong>
                  </div>
                  <div className="bg-blue-50 p-4 rounded">
                    <strong>Status:</strong> {config.status}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div><strong>ID:</strong> {config.id}</div>
                  <div><strong>Phone Number ID:</strong> {config.phone_number_id}</div>
                  <div><strong>Business Account ID:</strong> {config.business_account_id}</div>
                  <div><strong>Webhook Verify Token:</strong> {config.webhook_verify_token}</div>
                  <div><strong>Access Token:</strong> {config.access_token ? `${config.access_token.substring(0, 20)}...` : 'Não configurado'}</div>
                  <div><strong>Criado em:</strong> {new Date(config.created_at).toLocaleString()}</div>
                  <div><strong>Atualizado em:</strong> {new Date(config.updated_at).toLocaleString()}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8">
          <button 
            onClick={loadConfig}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
          >
            Recarregar Dados
          </button>
        </div>
      </div>
    </div>
  )
}