'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Save,
  TestTube,
  Copy,
  Eye,
  EyeOff,
  Smartphone,
  Globe,
  Shield,
  Zap,
  Info,
  ExternalLink,
  QrCode,
  Webhook
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/useAuth'

interface WhatsAppConfig {
  // API Configuration
  phoneNumberId: string
  accessToken: string
  appId: string
  appSecret: string
  businessId: string
  
  // Webhook Configuration
  webhookUrl: string
  webhookVerifyToken: string
  webhookEnabled: boolean
  
  // Provider Settings
  provider: 'official' | 'evolution' | 'baileys'
  evolutionApiUrl?: string
  evolutionApiKey?: string
  
  // Status
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'checking'
  lastSync?: string
  phoneNumber?: string
  businessName?: string
  
  // Features
  autoReply: boolean
  saveContacts: boolean
  syncMessages: boolean
  encryptMessages: boolean
}

const WEBHOOK_BASE_URL = 'https://api.pytake.net/api/v1/whatsapp/webhook'

export default function WhatsAppSettingsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const [config, setConfig] = useState<WhatsAppConfig>({
    phoneNumberId: '',
    accessToken: '',
    appId: '',
    appSecret: '',
    businessId: '',
    webhookUrl: WEBHOOK_BASE_URL,
    webhookVerifyToken: '',
    webhookEnabled: true,
    provider: 'official',
    connectionStatus: 'disconnected',
    autoReply: true,
    saveContacts: true,
    syncMessages: true,
    encryptMessages: false
  })

  const [showToken, setShowToken] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
    }
  }, [isLoading, isAuthenticated])

  useEffect(() => {
    // Load existing configuration
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    // TODO: Load from API
    // Mock data for now
    setConfig(prev => ({
      ...prev,
      phoneNumberId: '123456789',
      businessId: 'BUS123',
      phoneNumber: '+55 11 99999-9999',
      businessName: 'PyTake Demo',
      connectionStatus: 'connected',
      lastSync: new Date().toISOString()
    }))
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    // Simulate API test
    setTimeout(() => {
      const success = Math.random() > 0.3
      setTestResult({
        success,
        message: success 
          ? 'Conexão estabelecida com sucesso!' 
          : 'Falha ao conectar. Verifique suas credenciais.',
        details: success ? {
          phoneNumber: '+55 11 99999-9999',
          businessName: 'PyTake Demo',
          status: 'verified',
          webhookStatus: 'active'
        } : {
          error: 'Invalid access token',
          code: 'AUTH_ERROR'
        }
      })
      
      if (success) {
        setConfig(prev => ({
          ...prev,
          connectionStatus: 'connected',
          phoneNumber: '+55 11 99999-9999',
          businessName: 'PyTake Demo'
        }))
      }
      
      setIsTesting(false)
    }, 2000)
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    // TODO: Save to API
    setTimeout(() => {
      setIsSaving(false)
    }, 1000)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // TODO: Show toast notification
  }

  const generateVerifyToken = () => {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)
    setConfig(prev => ({ ...prev, webhookVerifyToken: token }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100'
      case 'disconnected': return 'text-gray-600 bg-gray-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'checking': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />
      case 'disconnected': return <XCircle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      case 'checking': return <RefreshCw className="h-4 w-4 animate-spin" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuração WhatsApp Business</h1>
        <p className="text-muted-foreground">
          Configure sua integração com o WhatsApp Business API
        </p>
      </div>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status da Conexão</CardTitle>
            <Badge className={getStatusColor(config.connectionStatus)}>
              {getStatusIcon(config.connectionStatus)}
              <span className="ml-1">
                {config.connectionStatus === 'connected' ? 'Conectado' :
                 config.connectionStatus === 'disconnected' ? 'Desconectado' :
                 config.connectionStatus === 'error' ? 'Erro' : 'Verificando'}
              </span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Número</p>
                <p className="font-medium">{config.phoneNumber || 'Não configurado'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="font-medium">{config.businessName || 'Não configurado'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Última Sincronização</p>
                <p className="font-medium">
                  {config.lastSync 
                    ? new Date(config.lastSync).toLocaleString('pt-BR')
                    : 'Nunca'}
                </p>
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              testResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.success 
                  ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  : <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                }
                <div className="flex-1">
                  <p className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                    {testResult.message}
                  </p>
                  {testResult.details && (
                    <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-auto">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Provedor de API</CardTitle>
          <CardDescription>
            Escolha o provedor de integração com WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setConfig(prev => ({ ...prev, provider: 'official' }))}
              className={`p-4 border-2 rounded-lg transition-all ${
                config.provider === 'official' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium">WhatsApp Official</h3>
              <p className="text-xs text-muted-foreground mt-1">
                API oficial do Meta/Facebook
              </p>
            </button>

            <button
              onClick={() => setConfig(prev => ({ ...prev, provider: 'evolution' }))}
              className={`p-4 border-2 rounded-lg transition-all ${
                config.provider === 'evolution' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Zap className="h-8 w-8 mb-2 text-orange-500" />
              <h3 className="font-medium">Evolution API</h3>
              <p className="text-xs text-muted-foreground mt-1">
                API não-oficial alternativa
              </p>
            </button>

            <button
              onClick={() => setConfig(prev => ({ ...prev, provider: 'baileys' }))}
              className={`p-4 border-2 rounded-lg transition-all ${
                config.provider === 'baileys' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <QrCode className="h-8 w-8 mb-2 text-purple-500" />
              <h3 className="font-medium">Baileys/WA Web</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Conexão via WhatsApp Web
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      {config.provider === 'official' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuração da API Oficial</CardTitle>
            <CardDescription>
              Credenciais do WhatsApp Business API (Meta/Facebook)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
                  id="phoneNumberId"
                  placeholder="123456789..."
                  value={config.phoneNumberId}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    phoneNumberId: e.target.value 
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="businessId">Business ID *</Label>
                <Input
                  id="businessId"
                  placeholder="BUS123..."
                  value={config.businessId}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    businessId: e.target.value 
                  }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accessToken">Access Token *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="accessToken"
                    type={showToken ? 'text' : 'password'}
                    placeholder="EAAxx..."
                    value={config.accessToken}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      accessToken: e.target.value 
                    }))}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(config.accessToken)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Token de acesso permanente do Facebook Developer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appId">App ID</Label>
                <Input
                  id="appId"
                  placeholder="1234567890..."
                  value={config.appId}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    appId: e.target.value 
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="appSecret">App Secret</Label>
                <div className="flex gap-2">
                  <Input
                    id="appSecret"
                    type={showSecret ? 'text' : 'password'}
                    placeholder="abc123..."
                    value={config.appSecret}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      appSecret: e.target.value 
                    }))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Help Link */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Para obter suas credenciais, acesse o{' '}
                    <a 
                      href="https://developers.facebook.com/apps" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-medium underline inline-flex items-center gap-1"
                    >
                      Facebook Developer Console
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolution API Configuration */}
      {config.provider === 'evolution' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuração Evolution API</CardTitle>
            <CardDescription>
              Configure sua instância Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="evolutionApiUrl">URL da API *</Label>
              <Input
                id="evolutionApiUrl"
                placeholder="https://api.evolution.com/instance"
                value={config.evolutionApiUrl}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  evolutionApiUrl: e.target.value 
                }))}
              />
            </div>

            <div>
              <Label htmlFor="evolutionApiKey">API Key *</Label>
              <div className="flex gap-2">
                <Input
                  id="evolutionApiKey"
                  type={showToken ? 'text' : 'password'}
                  placeholder="B6D711FCDE4D4FD5936544120E713976"
                  value={config.evolutionApiKey}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    evolutionApiKey: e.target.value 
                  }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="p-8 border-2 border-dashed rounded-lg text-center">
              <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                QR Code aparecerá aqui após configurar
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Gerar QR Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuração de Webhook</CardTitle>
          <CardDescription>
            Configure o webhook para receber mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <Label htmlFor="webhookEnabled">Webhook Ativo</Label>
            </div>
            <Switch
              id="webhookEnabled"
              checked={config.webhookEnabled}
              onCheckedChange={(checked) => setConfig(prev => ({ 
                ...prev, 
                webhookEnabled: checked 
              }))}
            />
          </div>

          <div>
            <Label htmlFor="webhookUrl">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                id="webhookUrl"
                value={config.webhookUrl}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  webhookUrl: e.target.value 
                }))}
                readOnly
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(config.webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure esta URL no Facebook Developer Console
            </p>
          </div>

          <div>
            <Label htmlFor="webhookVerifyToken">Token de Verificação</Label>
            <div className="flex gap-2">
              <Input
                id="webhookVerifyToken"
                value={config.webhookVerifyToken}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  webhookVerifyToken: e.target.value 
                }))}
                placeholder="Token de verificação..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={generateVerifyToken}
              >
                Gerar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(config.webhookVerifyToken)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use o mesmo token no Facebook Developer Console
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recursos</CardTitle>
          <CardDescription>
            Configure recursos adicionais do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor="autoReply">Resposta Automática</Label>
                  <p className="text-xs text-muted-foreground">
                    Ativar respostas automáticas via flows
                  </p>
                </div>
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor="saveContacts">Salvar Contatos</Label>
                  <p className="text-xs text-muted-foreground">
                    Salvar automaticamente novos contatos
                  </p>
                </div>
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <RefreshCw className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor="syncMessages">Sincronizar Mensagens</Label>
                  <p className="text-xs text-muted-foreground">
                    Sincronizar histórico de mensagens
                  </p>
                </div>
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
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor="encryptMessages">Criptografar Mensagens</Label>
                  <p className="text-xs text-muted-foreground">
                    Criptografia adicional no banco de dados
                  </p>
                </div>
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={isTesting}
        >
          {isTesting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Testar Conexão
            </>
          )}
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}