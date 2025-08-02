import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Smartphone,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  TestTube,
  Globe,
  Lock,
  Bell,
  Users,
  MessageSquare,
  Shield,
  Key,
  Save,
  RefreshCw,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/switch'

interface WhatsAppInstance {
  id: string
  name: string
  phone: string
  status: 'connected' | 'disconnected' | 'connecting'
  type: 'official' | 'evolution'
  webhook: string
  token: string
  lastActivity: Date
}

interface WebhookConfig {
  url: string
  events: string[]
  secret: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'instances' | 'webhooks' | 'notifications' | 'security'>('instances')
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})
  const [isAddingInstance, setIsAddingInstance] = useState(false)
  const [isTestingWebhook, setIsTestingWebhook] = useState(false)
  
  const [instances, setInstances] = useState<WhatsAppInstance[]>([
    {
      id: '1',
      name: 'Vendas Principal',
      phone: '+55 11 99999-9999',
      status: 'connected',
      type: 'official',
      webhook: 'https://api.pytake.com/webhook/whatsapp/1',
      token: 'whatsapp_token_abc123...',
      lastActivity: new Date(Date.now() - 300000)
    },
    {
      id: '2',
      name: 'Suporte Técnico',
      phone: '+55 11 88888-8888',
      status: 'connected',
      type: 'evolution',
      webhook: 'https://api.pytake.com/webhook/evolution/2',
      token: 'evolution_token_def456...',
      lastActivity: new Date(Date.now() - 600000)
    },
    {
      id: '3',
      name: 'Marketing',
      phone: '+55 11 77777-7777',
      status: 'disconnected',
      type: 'official',
      webhook: 'https://api.pytake.com/webhook/whatsapp/3',
      token: 'whatsapp_token_ghi789...',
      lastActivity: new Date(Date.now() - 3600000)
    }
  ])

  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    url: 'https://api.pytake.com/webhook',
    events: ['message', 'status', 'presence'],
    secret: 'webhook_secret_xyz123'
  })

  const tabs = [
    { id: 'instances', label: 'Instâncias WhatsApp', icon: Smartphone },
    { id: 'webhooks', label: 'Webhooks', icon: Globe },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield }
  ] as const

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
      case 'connecting':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'disconnected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const toggleTokenVisibility = (instanceId: string) => {
    setShowTokens(prev => ({
      ...prev,
      [instanceId]: !prev[instanceId]
    }))
  }

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true)
    // Simulate webhook test
    setTimeout(() => {
      setIsTestingWebhook(false)
      // Show success message
    }, 2000)
  }

  const maskToken = (token: string) => {
    return token.substring(0, 8) + '...'
  }

  return (
    <div className="p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie as configurações do sistema PyTake</p>
          </div>
        </div>
        
        <Button className="space-x-2">
          <Save className="h-4 w-4" />
          <span>Salvar Todas</span>
        </Button>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border-b border-border"
      >
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'instances' && (
          <motion.div
            key="instances"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Instances Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Instâncias WhatsApp</h2>
                <p className="text-muted-foreground">Gerencie suas conexões WhatsApp Business</p>
              </div>
              <Button onClick={() => setIsAddingInstance(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            </div>

            {/* Instances Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {instances.map((instance, index) => (
                <motion.div
                  key={instance.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Smartphone className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{instance.name}</CardTitle>
                            <CardDescription>{instance.phone}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(instance.status)}
                          <Badge className={getStatusColor(instance.status)}>
                            {instance.status === 'connected' && 'Conectado'}
                            {instance.status === 'connecting' && 'Conectando'}
                            {instance.status === 'disconnected' && 'Desconectado'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tipo</p>
                          <p className="font-medium">
                            {instance.type === 'official' ? 'WhatsApp Official' : 'Evolution API'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Última atividade</p>
                          <p className="font-medium">
                            {instance.lastActivity.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Webhook URL</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Input value={instance.webhook} readOnly className="text-xs" />
                            <Button variant="outline" size="sm">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Token</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Input 
                              value={showTokens[instance.id] ? instance.token : maskToken(instance.token)}
                              readOnly 
                              className="text-xs"
                              type={showTokens[instance.id] ? 'text' : 'password'}
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toggleTokenVisibility(instance.id)}
                            >
                              {showTokens[instance.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-2">
                        <Button variant="outline" size="sm">
                          <Edit3 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm">
                          <TestTube className="h-3 w-3 mr-1" />
                          Testar
                        </Button>
                        {instance.status === 'disconnected' && (
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remover
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'webhooks' && (
          <motion.div
            key="webhooks"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold">Configuração de Webhooks</h2>
              <p className="text-muted-foreground">Configure os endpoints para receber eventos do WhatsApp</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Webhook Principal</CardTitle>
                <CardDescription>
                  URL que receberá todos os eventos de mensagens e status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">URL do Webhook</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input 
                      value={webhookConfig.url}
                      onChange={(e) => setWebhookConfig(prev => ({ ...prev, url: e.target.value }))}
                    />
                    <Button 
                      variant="outline"
                      onClick={handleTestWebhook}
                      disabled={isTestingWebhook}
                    >
                      {isTestingWebhook ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Secret</label>
                  <Input 
                    value={webhookConfig.secret}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, secret: e.target.value }))}
                    type="password"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usado para verificar a autenticidade dos webhooks
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-3 block">Eventos</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['message', 'status', 'presence', 'media', 'webhook_verification'].map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <Switch 
                          checked={webhookConfig.events.includes(event)}
                          onCheckedChange={(checked) => {
                            setWebhookConfig(prev => ({
                              ...prev,
                              events: checked 
                                ? [...prev.events, event]
                                : prev.events.filter(e => e !== event)
                            }))
                          }}
                        />
                        <label className="text-sm">{event}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold">Notificações</h2>
              <p className="text-muted-foreground">Configure como você quer ser notificado</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notificações do Sistema</CardTitle>
                  <CardDescription>Alertas sobre o funcionamento do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Conexões perdidas</p>
                      <p className="text-sm text-muted-foreground">Quando uma instância WhatsApp desconectar</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Erros de webhook</p>
                      <p className="text-sm text-muted-foreground">Falhas no recebimento de mensagens</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Atualizações do sistema</p>
                      <p className="text-sm text-muted-foreground">Novas versões e funcionalidades</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notificações de Conversas</CardTitle>
                  <CardDescription>Alertas sobre mensagens e conversas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Novas mensagens</p>
                      <p className="text-sm text-muted-foreground">Mensagens não lidas</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Mensagens urgentes</p>
                      <p className="text-sm text-muted-foreground">Palavras-chave específicas</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Tempo de resposta</p>
                      <p className="text-sm text-muted-foreground">Quando SLA é ultrapassado</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-semibold">Segurança</h2>
              <p className="text-muted-foreground">Configurações de segurança e autenticação</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Autenticação</CardTitle>
                  <CardDescription>Configurações de login e acesso</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Autenticação em dois fatores</p>
                      <p className="text-sm text-muted-foreground">Segurança adicional com 2FA</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sessões múltiplas</p>
                      <p className="text-sm text-muted-foreground">Permitir login em múltiplos dispositivos</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Timeout de sessão</p>
                      <p className="text-sm text-muted-foreground">Logout automático após inatividade</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API e Integrações</CardTitle>
                  <CardDescription>Controle de acesso a APIs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Rate limiting</p>
                      <p className="text-sm text-muted-foreground">Limite de requisições por minuto</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Whitelist de IPs</p>
                      <p className="text-sm text-muted-foreground">Restringir acesso por IP</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Logs de auditoria</p>
                      <p className="text-sm text-muted-foreground">Registrar todas as ações</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}