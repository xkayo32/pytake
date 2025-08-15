'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Copy,
  RefreshCw,
  Phone,
  Webhook,
  Key,
  TestTube,
  Eye,
  EyeOff,
  ExternalLink,
  Settings,
  Shield,
  Zap,
  MessageSquare,
  Users,
  Globe,
  Info
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/lib/hooks/useAuth'

// Validação dos formulários
const whatsappConfigSchema = z.object({
  phone_number_id: z.string().min(1, 'Phone Number ID é obrigatório'),
  access_token: z.string().min(1, 'Access Token é obrigatório'),
  business_account_id: z.string().optional(),
  app_id: z.string().optional(),
  app_secret: z.string().optional(),
  webhook_verify_token: z.string().min(1, 'Webhook Verify Token é obrigatório'),
})

const testMessageSchema = z.object({
  phone_number: z.string().min(10, 'Número de telefone válido é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem muito longa'),
})

type WhatsappConfig = z.infer<typeof whatsappConfigSchema>
type TestMessage = z.infer<typeof testMessageSchema>

interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error' | 'testing'
  message: string
  last_test?: string
}

interface PhoneNumber {
  id: string
  display_phone_number: string
  verified_name: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  quality_rating: 'GREEN' | 'YELLOW' | 'RED'
}

export default function WhatsAppSettingsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showTokens, setShowTokens] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    message: 'Não configurado'
  })
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [testLogs, setTestLogs] = useState<string[]>([])
  const [config, setConfig] = useState({
    autoReply: true,
    saveContacts: true,
    syncMessages: true,
    encryptMessages: false,
    webhookEnabled: true
  })

  // Formulário de configuração
  const configForm = useForm<WhatsappConfig>({
    resolver: zodResolver(whatsappConfigSchema),
    defaultValues: {
      phone_number_id: '',
      access_token: '',
      business_account_id: '',
      app_id: '',
      app_secret: '',
      webhook_verify_token: '',
    }
  })

  // Formulário de teste
  const testForm = useForm<TestMessage>({
    resolver: zodResolver(testMessageSchema),
    defaultValues: {
      phone_number: '',
      message: 'Olá! Esta é uma mensagem de teste do PyTake. 🤖',
    }
  })

  // Carregar configurações existentes
  useEffect(() => {
    loadWhatsAppConfig()
    loadPhoneNumbers()
  }, [])

  const loadWhatsAppConfig = async () => {
    try {
      const response = await fetch('https://api.pytake.net/api/v1/whatsapp-configs', {
        headers: {
          'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0] || ''}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const config = await response.json()
        configForm.reset({
          phone_number_id: config.phone_number_id || '',
          access_token: config.access_token || '',
          business_account_id: config.business_account_id || '',
          app_id: config.app_id || '',
          app_secret: config.app_secret || '',
          webhook_verify_token: config.webhook_verify_token || '',
        })
        
        setConnectionStatus({
          status: config.status || 'disconnected',
          message: config.status === 'connected' ? 'Conectado' : 'Não configurado',
          last_test: config.last_test
        })
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      addLog('❌ Erro ao carregar configurações')
    }
  }

  const loadPhoneNumbers = async () => {
    try {
      const response = await fetch('https://api.pytake.net/api/v1/whatsapp/phone-numbers', {
        headers: {
          'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0] || ''}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const numbers = await response.json()
        setPhoneNumbers(numbers)
      }
      
    } catch (error) {
      console.error('Erro ao carregar números:', error)
      addLog('❌ Erro ao carregar números')
    }
  }

  const handleSaveConfig = async (data: WhatsappConfig) => {
    setIsLoading(true)
    addLog('💾 Salvando configuração...')
    
    try {
      const response = await fetch('https://api.pytake.net/api/v1/whatsapp-configs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0] || ''}`
        },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        const result = await response.json()
        
        setConnectionStatus({
          status: 'connected',
          message: 'Configuração salva com sucesso!',
          last_test: new Date().toISOString()
        })
        
        addLog('✅ Configuração salva com sucesso')
        await loadPhoneNumbers() // Recarregar números após salvar
      } else {
        throw new Error('Erro ao salvar configuração')
      }
      
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: 'Erro ao salvar configuração'
      })
      addLog('❌ Erro ao salvar configuração')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setConnectionStatus({ status: 'testing', message: 'Testando conexão...' })
    addLog('🔄 Iniciando teste de conectividade...')
    
    try {
      const response = await fetch('https://api.pytake.net/api/v1/whatsapp-configs/1/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0] || ''}`
        }
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setConnectionStatus({
          status: 'connected',
          message: 'Conexão estabelecida com sucesso!',
          last_test: new Date().toISOString()
        })
        addLog('✅ Teste de conectividade bem-sucedido')
        addLog('📞 Números WhatsApp carregados')
        
        // Carregar números retornados do teste
        if (result.data?.phone_numbers) {
          setPhoneNumbers(result.data.phone_numbers)
        }
      } else {
        setConnectionStatus({
          status: 'error',
          message: result.message || 'Falha na conexão. Verifique as credenciais.',
        })
        addLog('❌ Falha no teste de conectividade')
        addLog(`🔍 ${result.error?.message || 'Verifique Phone Number ID e Access Token'}`)
      }
      
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: 'Erro durante o teste de conexão'
      })
      addLog('❌ Erro durante o teste')
    } finally {
      setIsTesting(false)
    }
  }

  const handleSendTestMessage = async (data: TestMessage) => {
    setIsTesting(true)
    addLog(`📤 Enviando mensagem de teste para ${data.phone_number}...`)
    
    try {
      const response = await fetch('https://api.pytake.net/api/v1/whatsapp/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.split('auth-token=')[1]?.split(';')[0] || ''}`
        },
        body: JSON.stringify({
          to: data.phone_number,
          message: { text: { body: data.message } }
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        addLog(`✅ Mensagem enviada! ID: ${result.message_id}`)
        addLog('📱 Verifique o WhatsApp do destinatário')
        
        // Reset form
        testForm.reset({
          phone_number: '',
          message: 'Olá! Esta é uma mensagem de teste do PyTake. 🤖',
        })
      } else {
        addLog(`❌ Erro ao enviar: ${result.error?.message || 'Erro desconhecido'}`)
      }
      
    } catch (error) {
      addLog('❌ Erro ao enviar mensagem de teste')
    } finally {
      setIsTesting(false)
    }
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR')
    setTestLogs(prev => [...prev, `${timestamp} - ${message}`].slice(-10)) // Manter últimas 10 linhas
  }

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/v1/whatsapp/webhook`
    navigator.clipboard.writeText(webhookUrl)
    addLog('📋 URL do Webhook copiada para clipboard')
  }

  const generateWebhookToken = () => {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)
    configForm.setValue('webhook_verify_token', token)
    addLog('🔑 Token de verificação gerado')
  }

  const getStatusBadge = (status: ConnectionStatus['status']) => {
    const configs = {
      connected: { color: 'bg-green-500', text: 'Conectado', icon: CheckCircle },
      disconnected: { color: 'bg-gray-500', text: 'Desconectado', icon: X },
      error: { color: 'bg-red-500', text: 'Erro', icon: AlertCircle },
      testing: { color: 'bg-blue-500', text: 'Testando', icon: Loader2 },
    }
    
    const config = configs[status]
    const Icon = config.icon
    
    return (
      <Badge variant="secondary" className={`${config.color} text-white`}>
        <Icon className={`h-3 w-3 mr-1 ${status === 'testing' ? 'animate-spin' : ''}`} />
        {config.text}
      </Badge>
    )
  }

  const getQualityBadge = (quality: PhoneNumber['quality_rating']) => {
    const configs = {
      GREEN: { color: 'bg-green-500', text: 'Ótima' },
      YELLOW: { color: 'bg-yellow-500', text: 'Boa' },
      RED: { color: 'bg-red-500', text: 'Baixa' },
    }
    
    const config = configs[quality]
    
    return (
      <Badge variant="secondary" className={`${config.color} text-white text-xs`}>
        {config.text}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page Description */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-100">API Oficial do WhatsApp Business</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Configure suas credenciais para conectar com a Meta Business Platform
            </p>
          </div>
        </div>
      </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Status da Conexão
                </CardTitle>
                <CardDescription>
                  Estado atual da integração com WhatsApp
                </CardDescription>
              </div>
              {getStatusBadge(connectionStatus.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Status</p>
                  <p className="font-medium">{connectionStatus.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Último Teste</p>
                  <p className="font-medium">
                    {connectionStatus.last_test 
                      ? new Date(connectionStatus.last_test).toLocaleString('pt-BR')
                      : 'Nunca'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Números</p>
                  <p className="font-medium">{phoneNumbers.length} configurados</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Configuração da API */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Configuração da API
              </CardTitle>
              <CardDescription>
                Credenciais da Meta Business API
                <a 
                  href="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-primary hover:underline"
                >
                  Ver documentação <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={configForm.handleSubmit(handleSaveConfig)} className="space-y-4">
                {/* Phone Number ID */}
                <div>
                  <Label htmlFor="phone_number_id">Phone Number ID *</Label>
                  <Input
                    id="phone_number_id"
                    {...configForm.register('phone_number_id')}
                    placeholder="123456789012345"
                  />
                  {configForm.formState.errors.phone_number_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {configForm.formState.errors.phone_number_id.message}
                    </p>
                  )}
                </div>

                {/* Access Token */}
                <div>
                  <Label htmlFor="access_token">Access Token *</Label>
                  <div className="relative">
                    <Input
                      id="access_token"
                      type={showTokens ? 'text' : 'password'}
                      {...configForm.register('access_token')}
                      placeholder="EAAxxxxxxxxxxxx"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTokens(!showTokens)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    >
                      {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {configForm.formState.errors.access_token && (
                    <p className="text-sm text-red-500 mt-1">
                      {configForm.formState.errors.access_token.message}
                    </p>
                  )}
                </div>

                {/* Business Account ID */}
                <div>
                  <Label htmlFor="business_account_id">Business Account ID</Label>
                  <Input
                    id="business_account_id"
                    {...configForm.register('business_account_id')}
                    placeholder="123456789012345"
                  />
                </div>

                {/* App ID */}
                <div>
                  <Label htmlFor="app_id">App ID</Label>
                  <Input
                    id="app_id"
                    {...configForm.register('app_id')}
                    placeholder="1234567890123456"
                  />
                </div>

                {/* App Secret */}
                <div>
                  <Label htmlFor="app_secret">App Secret</Label>
                  <div className="relative">
                    <Input
                      id="app_secret"
                      type={showTokens ? 'text' : 'password'}
                      {...configForm.register('app_secret')}
                      placeholder="abcdefghijk123456"
                      className="pr-10"
                    />
                  </div>
                </div>


                {/* Help */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Como obter as credenciais:
                      </p>
                      <ol className="text-blue-700 dark:text-blue-300 space-y-1 ml-4">
                        <li>1. Acesse Facebook Developer Console</li>
                        <li>2. Crie um app WhatsApp Business</li>
                        <li>3. Configure o produto WhatsApp</li>
                        <li>4. Obtenha Phone Number ID e Access Token</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Salvar Configuração
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Configuração do Webhook
              </CardTitle>
              <CardDescription>
                Configure o webhook para receber mensagens do WhatsApp em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL do Webhook (copie para o Facebook)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value="https://api.pytake.net/api/v1/whatsapp/webhook"
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyWebhookUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-foreground-tertiary mt-1">
                  Configure esta URL no campo "Callback URL" do Facebook Developer
                </p>
              </div>

              <div>
                <Label htmlFor="webhook_verify_token">Token de Verificação do Webhook *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="webhook_verify_token"
                    type={showTokens ? 'text' : 'password'}
                    {...configForm.register('webhook_verify_token')}
                    placeholder="seu_token_seguro_123"
                    className="flex-1 font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateWebhookToken}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {configForm.formState.errors.webhook_verify_token && (
                  <p className="text-sm text-red-500 mt-1">
                    {configForm.formState.errors.webhook_verify_token.message}
                  </p>
                )}
                <p className="text-xs text-foreground-tertiary mt-1">
                  Use este mesmo token no campo "Verify Token" do Facebook Developer
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">📋 Campos do Webhook:</h4>
                <p className="text-xs text-foreground-secondary">
                  • <strong>messages</strong> - Receber mensagens<br/>
                  • <strong>message_deliveries</strong> - Status de entrega<br/>
                  • <strong>message_reads</strong> - Confirmação de leitura
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium text-sm">Recursos</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="autoReply" className="text-sm">Resposta Automática</Label>
                    </div>
                    <Switch
                      id="autoReply"
                      checked={config.autoReply}
                      onCheckedChange={(checked) => setConfig(prev => ({ 
                        ...prev, 
                        autoReply: checked 
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="saveContacts" className="text-sm">Salvar Contatos</Label>
                    </div>
                    <Switch
                      id="saveContacts"
                      checked={config.saveContacts}
                      onCheckedChange={(checked) => setConfig(prev => ({ 
                        ...prev, 
                        saveContacts: checked 
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="syncMessages" className="text-sm">Sincronizar Mensagens</Label>
                    </div>
                    <Switch
                      id="syncMessages"
                      checked={config.syncMessages}
                      onCheckedChange={(checked) => setConfig(prev => ({ 
                        ...prev, 
                        syncMessages: checked 
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="encryptMessages" className="text-sm">Criptografar Mensagens</Label>
                    </div>
                    <Switch
                      id="encryptMessages"
                      checked={config.encryptMessages}
                      onCheckedChange={(checked) => setConfig(prev => ({ 
                        ...prev, 
                        encryptMessages: checked 
                      }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Phone Numbers */}
        {phoneNumbers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Números WhatsApp
              </CardTitle>
              <CardDescription>
                Números configurados na sua conta Business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {phoneNumbers.map((phone) => (
                  <div key={phone.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{phone.display_phone_number}</p>
                      <p className="text-sm text-foreground-secondary">{phone.verified_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getQualityBadge(phone.quality_rating)}
                      <Badge 
                        variant={phone.status === 'APPROVED' ? 'default' : 'secondary'}
                        className={phone.status === 'APPROVED' ? 'bg-green-500' : ''}
                      >
                        {phone.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Teste de Mensagem
            </CardTitle>
            <CardDescription>
              Envie uma mensagem de teste para verificar a integração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={testForm.handleSubmit(handleSendTestMessage)} className="space-y-4">
              <div>
                <Label htmlFor="phone_number">Número de Telefone</Label>
                <Input
                  id="phone_number"
                  {...testForm.register('phone_number')}
                  placeholder="+5511999999999"
                />
                {testForm.formState.errors.phone_number && (
                  <p className="text-sm text-red-500 mt-1">
                    {testForm.formState.errors.phone_number.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  {...testForm.register('message')}
                  rows={3}
                />
                {testForm.formState.errors.message && (
                  <p className="text-sm text-red-500 mt-1">
                    {testForm.formState.errors.message.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={isTesting || connectionStatus.status !== 'connected'}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Teste'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Logs */}
        {testLogs.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Logs de Teste</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTestLogs([])}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto">
                {testLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}