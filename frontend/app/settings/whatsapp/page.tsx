'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Plus, 
  Phone, 
  Settings, 
  Trash2, 
  Star,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  MoreVertical,
  MessageSquare,
  AlertCircle,
  Webhook,
  Key,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Loader2,
  Shield,
  Users
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/hooks/useAuth'
import { useToast } from '@/components/ui/toast'
import { getApiUrl, getAuthHeaders } from '@/lib/api-client'
import { AddWhatsAppNumberModal } from '@/src/components/admin/AddWhatsAppNumberModal'

// Validação dos formulários
const whatsappConfigSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone_number_id: z.string().min(1, 'Phone Number ID é obrigatório'),
  access_token: z.string().min(1, 'Access Token é obrigatório'),
  business_account_id: z.string().optional(),
  webhook_verify_token: z.string().min(1, 'Webhook Verify Token é obrigatório'),
})

const testMessageSchema = z.object({
  phone_number: z.string().min(10, 'Número de telefone válido é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem muito longa'),
})

type WhatsappConfig = z.infer<typeof whatsappConfigSchema>
type TestMessage = z.infer<typeof testMessageSchema>

interface WhatsAppConfigData {
  id: string
  name: string
  phone_number_id: string
  access_token: string
  business_account_id: string
  webhook_verify_token: string
  status: 'connected' | 'disconnected' | 'error'
  is_default: boolean
  created_at: string
  updated_at: string
}

export default function WhatsAppSettingsPage() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const [configs, setConfigs] = useState<WhatsAppConfigData[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfigData | null>(null)
  const [selectedConfig, setSelectedConfig] = useState<WhatsAppConfigData | null>(null)
  const [showTokens, setShowTokens] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testLogs, setTestLogs] = useState<string[]>([])
  const [features, setFeatures] = useState({
    autoReply: true,
    saveContacts: true,
    syncMessages: true,
    encryptMessages: false
  })

  // Formulário de configuração
  const configForm = useForm<WhatsappConfig>({
    resolver: zodResolver(whatsappConfigSchema),
    defaultValues: {
      name: '',
      phone_number_id: '',
      access_token: '',
      business_account_id: '',
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
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/whatsapp/`, { headers })
      
      if (response.ok) {
        const data = await response.json()
        setConfigs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async (data: WhatsappConfig) => {
    try {
      const payload = {
        ...data,
        id: editingConfig?.id,
        is_default: configs.length === 0 // First config becomes default
      }

      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/whatsapp/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await loadConfigs()
        setIsDialogOpen(false)
        setEditingConfig(null)
        configForm.reset({
          name: '',
          phone_number_id: '',
          access_token: '',
          business_account_id: '',
          webhook_verify_token: ''
        })
        addToast({
          type: 'success',
          title: editingConfig ? 'Configuração atualizada' : 'Configuração adicionada',
          description: 'As alterações foram salvas com sucesso'
        })
      }
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  const handleEdit = (config: WhatsAppConfigData) => {
    setEditingConfig(config)
    configForm.reset({
      name: config.name,
      phone_number_id: config.phone_number_id,
      access_token: config.access_token,
      business_account_id: config.business_account_id,
      webhook_verify_token: config.webhook_verify_token
    })
    setIsDialogOpen(true)
  }

  const handleSetDefault = async (configId: string) => {
    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/whatsapp/${configId}/default`, {
        method: 'PUT',
        headers
      })

      if (response.ok) {
        await loadConfigs()
        addToast({
          type: 'info',
          title: 'Configuração padrão atualizada',
          description: 'Este número será usado como padrão para envios'
        })
      }
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }

  const handleDelete = async (configId: string) => {
    // Por enquanto mantemos o confirm, mas podemos trocar por um modal depois
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) {
      return
    }

    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/whatsapp/${configId}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        await loadConfigs()
        addToast({
          type: 'success',
          title: 'Configuração excluída',
          description: 'A configuração foi removida com sucesso'
        })
      }
    } catch (error) {
      console.error('Error deleting config:', error)
    }
  }

  const handleTest = async (config: WhatsAppConfigData) => {
    setIsTesting(true)
    addLog('🔄 Iniciando teste de conectividade...')
    
    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/whatsapp/${config.id}/test`, {
        method: 'POST',
        headers
      })

      const result = await response.json()
      
      if (result.status === 'connected') {
        addLog('✅ Teste realizado com sucesso!')
        addLog(`📱 Número: ${result.display_name || result.phone_number || 'N/A'}`)
        addLog(result.message)
        addToast({
          type: 'success',
          title: 'Teste realizado com sucesso!',
          description: result.message
        })
      } else {
        addLog(`❌ ${result.message}`)
        addToast({
          type: 'error',
          title: 'Erro no teste de conexão',
          description: result.message || 'Verifique suas credenciais'
        })
      }
      
      await loadConfigs()
    } catch (error) {
      console.error('Error testing config:', error)
      addLog('❌ Erro ao testar configuração')
      addToast({
        type: 'error',
        title: 'Erro ao testar configuração',
        description: 'Verifique sua conexão e tente novamente'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSendTestMessage = async (data: TestMessage) => {
    if (!selectedConfig) return
    
    setIsTesting(true)
    addLog(`📤 Enviando mensagem de teste para ${data.phone_number}...`)
    
    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/whatsapp/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: data.phone_number,
          message: { text: { body: data.message } },
          config_id: selectedConfig.id
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        addLog(`✅ Mensagem enviada! ID: ${result.message_id}`)
        addLog('📱 Verifique o WhatsApp do destinatário')
        
        addToast({
          type: 'success',
          title: 'Mensagem enviada!',
          description: 'Verifique o WhatsApp do destinatário'
        })
        
        // Reset form
        testForm.reset({
          phone_number: '',
          message: 'Olá! Esta é uma mensagem de teste do PyTake. 🤖',
        })
        setIsTestDialogOpen(false)
      } else {
        addLog(`❌ Erro ao enviar: ${result.error?.message || 'Erro desconhecido'}`)
        addToast({
          type: 'error',
          title: 'Erro ao enviar mensagem',
          description: result.error?.message || 'Erro desconhecido'
        })
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
    const webhookUrl = `https://api.pytake.net/api/v1/whatsapp/webhook`
    navigator.clipboard.writeText(webhookUrl)
    addLog('📋 URL do Webhook copiada para clipboard')
    addToast({
      type: 'success',
      title: 'URL copiada',
      description: 'URL do webhook copiada para a área de transferência'
    })
  }

  const generateWebhookToken = () => {
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15)
    configForm.setValue('webhook_verify_token', token)
    addLog('🔑 Token de verificação gerado')
    addToast({
      type: 'info',
      title: 'Token gerado',
      description: 'Um novo token de verificação foi criado'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 border-green-200'
      case 'disconnected': return 'bg-gray-100 text-gray-600 border-gray-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />
      case 'disconnected': return <Clock className="h-4 w-4" />
      case 'error': return <XCircle className="h-4 w-4" />
      default: return null
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 dark:text-green-100">Configurações do WhatsApp Business</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Gerencie múltiplos números WhatsApp Business conectados ao sistema
            </p>
          </div>
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Número
          </Button>
          
          <AddWhatsAppNumberModal 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)}
            onSuccess={loadConfigs}
          />
        </div>
      </div>

      {/* Lista de Configurações */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando configurações...</p>
        </div>
      ) : configs.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">Nenhuma configuração encontrada</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Para começar a usar o WhatsApp Business, você precisa adicionar pelo menos uma configuração.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeira Configuração
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((config) => (
            <Card key={config.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {config.name}
                        {config.is_default && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Padrão
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {config.phone_number_id.substring(0, 15)}...
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(config)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTest(config)}>
                        <TestTube className="h-4 w-4 mr-2" />
                        Testar Conexão
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedConfig(config)
                        setIsWebhookDialogOpen(true)
                      }}>
                        <Webhook className="h-4 w-4 mr-2" />
                        Configurar Webhook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedConfig(config)
                        setIsTestDialogOpen(true)
                      }}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar Teste
                      </DropdownMenuItem>
                      {!config.is_default && (
                        <DropdownMenuItem onClick={() => handleSetDefault(config.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Definir como Padrão
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDelete(config.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(config.status)}
                  >
                    {getStatusIcon(config.status)}
                    <span className="ml-1">
                      {config.status === 'connected' ? 'Conectado' :
                       config.status === 'disconnected' ? 'Desconectado' : 'Erro'}
                    </span>
                  </Badge>
                </div>

                {/* Business ID */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Business ID:</span>
                  <span className="text-sm font-mono">
                    {config.business_account_id ? 
                      `${config.business_account_id.substring(0, 10)}...` : 
                      'Não configurado'}
                  </span>
                </div>

                {/* Webhook */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Webhook:</span>
                  <span className="text-sm">
                    {config.webhook_verify_token ? '✓ Configurado' : '✗ Não configurado'}
                  </span>
                </div>

                {/* Datas */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Criado: {new Date(config.created_at).toLocaleDateString()}</span>
                    <span>Atualizado: {new Date(config.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleTest(config)}
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Testar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(config)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Webhook Dialog */}
      <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Configuração do Webhook
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Configure o webhook no Facebook Developer:
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Use a URL e o token abaixo para receber mensagens em tempo real.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <Label>URL do Webhook</Label>
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
              <p className="text-xs text-muted-foreground mt-1">
                Configure esta URL no campo "Callback URL" do Facebook Developer
              </p>
            </div>

            <div>
              <Label>Token de Verificação</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={selectedConfig?.webhook_verify_token || ''}
                  readOnly
                  className="flex-1 font-mono text-sm"
                  type={showTokens ? 'text' : 'password'}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTokens(!showTokens)}
                >
                  {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use este token no campo "Verify Token" do Facebook Developer
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-sm">Recursos do Webhook</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Resposta Automática</Label>
                  </div>
                  <Switch
                    checked={features.autoReply}
                    onCheckedChange={(checked) => setFeatures(prev => ({ 
                      ...prev, 
                      autoReply: checked 
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Salvar Contatos</Label>
                  </div>
                  <Switch
                    checked={features.saveContacts}
                    onCheckedChange={(checked) => setFeatures(prev => ({ 
                      ...prev, 
                      saveContacts: checked 
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Sincronizar Mensagens</Label>
                  </div>
                  <Switch
                    checked={features.syncMessages}
                    onCheckedChange={(checked) => setFeatures(prev => ({ 
                      ...prev, 
                      syncMessages: checked 
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm">Criptografar Mensagens</Label>
                  </div>
                  <Switch
                    checked={features.encryptMessages}
                    onCheckedChange={(checked) => setFeatures(prev => ({ 
                      ...prev, 
                      encryptMessages: checked 
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setIsWebhookDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Message Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Teste de Mensagem
            </DialogTitle>
          </DialogHeader>
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

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isTesting}
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
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Informações de Ajuda */}
      {configs.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Você pode adicionar múltiplos números WhatsApp para diferentes finalidades (vendas, suporte, etc.)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>O número marcado como "Padrão" será usado para envios quando não especificado.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Use o botão "Testar" para verificar se as credenciais estão funcionando corretamente.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Webhook URL: https://api.pytake.net/api/v1/whatsapp/webhook</span>
            </div>
          </CardContent>
        </Card>
      )}
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