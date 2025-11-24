'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Save,
  Play,
  Plus,
  Trash2,
  Settings,
  Zap,
  Webhook,
  Database,
  Mail,
  Calendar,
  MessageSquare,
  Code,
  FileSpreadsheet,
  Clock,
  ChevronRight,
  Info,
  Link2,
  Key,
  Server,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  AutomationType, 
  TriggerType, 
  ActionType,
  AutomationTrigger,
  AutomationAction 
} from '@/lib/types/automation'

const typeOptions: { value: AutomationType; label: string; icon: any }[] = [
  { value: 'webhook', label: 'Webhook', icon: Webhook },
  { value: 'api', label: 'API Custom', icon: Code },
  { value: 'erp', label: 'ERP', icon: Database },
  { value: 'crm', label: 'CRM', icon: Server },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'calendar', label: 'Calendário', icon: Calendar },
  { value: 'sheet', label: 'Planilha', icon: FileSpreadsheet }
]

const triggerOptions: { value: TriggerType; label: string }[] = [
  { value: 'message_received', label: 'Mensagem Recebida' },
  { value: 'message_sent', label: 'Mensagem Enviada' },
  { value: 'contact_created', label: 'Contato Criado' },
  { value: 'contact_updated', label: 'Contato Atualizado' },
  { value: 'campaign_completed', label: 'Campanha Concluída' },
  { value: 'flow_completed', label: 'Flow Concluído' },
  { value: 'tag_added', label: 'Tag Adicionada' },
  { value: 'tag_removed', label: 'Tag Removida' },
  { value: 'schedule', label: 'Agendamento' },
  { value: 'manual', label: 'Manual' }
]

const actionOptions: { value: ActionType; label: string }[] = [
  { value: 'send_message', label: 'Enviar Mensagem' },
  { value: 'update_contact', label: 'Atualizar Contato' },
  { value: 'add_tag', label: 'Adicionar Tag' },
  { value: 'remove_tag', label: 'Remover Tag' },
  { value: 'create_task', label: 'Criar Tarefa' },
  { value: 'send_webhook', label: 'Enviar Webhook' },
  { value: 'send_email', label: 'Enviar Email' },
  { value: 'update_crm', label: 'Atualizar CRM' },
  { value: 'create_invoice', label: 'Criar Fatura' },
  { value: 'custom_api', label: 'API Customizada' }
]

export default function CreateAutomationPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<AutomationType>('webhook')
  const [triggers, setTriggers] = useState<AutomationTrigger[]>([
    { id: '1', type: 'message_received' }
  ])
  const [triggerLogic, setTriggerLogic] = useState<'any' | 'all'>('all')
  const [actions, setActions] = useState<AutomationAction[]>([
    { id: '1', type: 'send_message', config: {} }
  ])
  
  // Integration settings
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookMethod, setWebhookMethod] = useState<'GET' | 'POST'>('POST')
  const [webhookAuth, setWebhookAuth] = useState<'none' | 'bearer' | 'basic' | 'api_key'>('none')
  const [webhookToken, setWebhookToken] = useState('')
  
  const [erpProvider, setErpProvider] = useState<'hubsoft' | 'ixcsoft' | 'mksolutions' | 'sisgp' | 'custom'>('hubsoft')
  const [erpUrl, setErpUrl] = useState('')
  const [erpApiKey, setErpApiKey] = useState('')
  
  // Execution settings
  const [enabled, setEnabled] = useState(true)
  const [runOnce, setRunOnce] = useState(false)
  const [maxExecutions, setMaxExecutions] = useState('')
  const [cooldownMinutes, setCooldownMinutes] = useState('')
  const [errorHandling, setErrorHandling] = useState<'stop' | 'continue' | 'retry'>('continue')
  const [notifyOnError, setNotifyOnError] = useState(true)
  const [logExecutions, setLogExecutions] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleAddTrigger = () => {
    const newTrigger: AutomationTrigger = {
      id: Date.now().toString(),
      type: 'message_received'
    }
    setTriggers([...triggers, newTrigger])
  }

  const handleRemoveTrigger = (id: string) => {
    setTriggers(triggers.filter(t => t.id !== id))
  }

  const handleUpdateTrigger = (id: string, type: TriggerType) => {
    setTriggers(triggers.map(t => t.id === id ? { ...t, type } : t))
  }

  const handleAddAction = () => {
    const newAction: AutomationAction = {
      id: Date.now().toString(),
      type: 'send_message',
      config: {}
    }
    setActions([...actions, newAction])
  }

  const handleRemoveAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id))
  }

  const handleUpdateAction = (id: string, type: ActionType) => {
    setActions(actions.map(a => a.id === id ? { ...a, type } : a))
  }

  const handleSave = () => {
    // TODO: Implement save
    console.log('Saving automation:', {
      name,
      description,
      type,
      triggers,
      triggerLogic,
      actions,
      settings: {
        enabled,
        runOnce,
        maxExecutions,
        cooldownMinutes,
        errorHandling,
        notifyOnError,
        logExecutions
      }
    })
    router.push('/automations')
  }

  const handleTest = () => {
    // TODO: Implement test
    console.log('Testing automation')
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/automations')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Nova Automação</h1>
                <p className="text-sm text-muted-foreground">
                  Configure gatilhos e ações para automatizar processos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleTest}>
                <Play className="h-4 w-4 mr-2" />
                Testar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Automação
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Automação</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Boas-vindas automático"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o que esta automação faz..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label>Tipo de Automação</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {typeOptions.map(option => {
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          onClick={() => setType(option.value)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            type === option.value 
                              ? 'border-primary bg-primary/10' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="h-5 w-5 mx-auto mb-1" />
                          <p className="text-xs font-medium">{option.label}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Triggers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gatilhos</CardTitle>
                    <CardDescription>
                      Defina quando esta automação deve ser executada
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddTrigger}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Gatilho
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {triggers.length > 1 && (
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <Label>Lógica dos gatilhos:</Label>
                    <Select value={triggerLogic} onValueChange={(v: 'any' | 'all') => setTriggerLogic(v)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos (AND)</SelectItem>
                        <SelectItem value="any">Qualquer um (OR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {triggers.map((trigger, index) => (
                  <div key={trigger.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge variant="outline">{index + 1}</Badge>
                    <Select 
                      value={trigger.type} 
                      onValueChange={(v: TriggerType) => handleUpdateTrigger(trigger.id, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {triggerOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {trigger.type === 'schedule' && (
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                    )}
                    
                    {triggers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTrigger(trigger.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ações</CardTitle>
                    <CardDescription>
                      O que deve acontecer quando a automação é disparada
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddAction}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Ação
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {actions.map((action, index) => (
                  <div key={action.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <Select 
                        value={action.type} 
                        onValueChange={(v: ActionType) => handleUpdateAction(action.id, v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actionOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                      
                      {actions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAction(action.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Action specific config preview */}
                    {action.type === 'send_message' && (
                      <div className="ml-9 p-3 bg-muted rounded text-sm">
                        <Info className="h-3 w-3 inline mr-1" />
                        Configure o template ou mensagem a ser enviada
                      </div>
                    )}
                    {action.type === 'send_webhook' && (
                      <div className="ml-9 p-3 bg-muted rounded text-sm">
                        <Link2 className="h-3 w-3 inline mr-1" />
                        Configure a URL e método do webhook
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Integration Settings */}
            {(type === 'webhook' || type === 'api') && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuração de Webhook</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="webhook-url">URL do Webhook</Label>
                    <Input
                      id="webhook-url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://api.exemplo.com/webhook"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Método HTTP</Label>
                      <Select value={webhookMethod} onValueChange={(v: 'GET' | 'POST') => setWebhookMethod(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Autenticação</Label>
                      <Select value={webhookAuth} onValueChange={(v: any) => setWebhookAuth(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {webhookAuth !== 'none' && (
                    <div>
                      <Label htmlFor="webhook-token">
                        {webhookAuth === 'bearer' ? 'Token' : 
                         webhookAuth === 'api_key' ? 'API Key' : 'Credenciais'}
                      </Label>
                      <Input
                        id="webhook-token"
                        type="password"
                        value={webhookToken}
                        onChange={(e) => setWebhookToken(e.target.value)}
                        placeholder="Digite o token de autenticação"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {type === 'erp' && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuração de ERP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Provedor ERP</Label>
                    <Select value={erpProvider} onValueChange={(v: any) => setErpProvider(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hubsoft">HubSoft</SelectItem>
                        <SelectItem value="ixcsoft">IxcSoft</SelectItem>
                        <SelectItem value="mksolutions">MkSolutions</SelectItem>
                        <SelectItem value="sisgp">SisGP</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="erp-url">URL Base da API</Label>
                    <Input
                      id="erp-url"
                      value={erpUrl}
                      onChange={(e) => setErpUrl(e.target.value)}
                      placeholder="https://api.erp.com/v1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="erp-key">API Key</Label>
                    <Input
                      id="erp-key"
                      type="password"
                      value={erpApiKey}
                      onChange={(e) => setErpApiKey(e.target.value)}
                      placeholder="Digite a chave de API"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Sincronizar</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">Clientes</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">Faturas</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm">Pagamentos</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Tickets</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Execution Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Execução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enabled">Automação Ativa</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar imediatamente após salvar
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="run-once">Executar apenas uma vez</Label>
                    <p className="text-sm text-muted-foreground">
                      Por contato/trigger
                    </p>
                  </div>
                  <Switch
                    id="run-once"
                    checked={runOnce}
                    onCheckedChange={setRunOnce}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-exec">Máximo de Execuções</Label>
                    <Input
                      id="max-exec"
                      type="number"
                      value={maxExecutions}
                      onChange={(e) => setMaxExecutions(e.target.value)}
                      placeholder="Ilimitado"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cooldown">Cooldown (minutos)</Label>
                    <Input
                      id="cooldown"
                      type="number"
                      value={cooldownMinutes}
                      onChange={(e) => setCooldownMinutes(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Tratamento de Erros</Label>
                  <Select value={errorHandling} onValueChange={(v: any) => setErrorHandling(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stop">Parar execução</SelectItem>
                      <SelectItem value="continue">Continuar próximas ações</SelectItem>
                      <SelectItem value="retry">Tentar novamente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notify-error">Notificar em caso de erro</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificação ao administrador
                    </p>
                  </div>
                  <Switch
                    id="notify-error"
                    checked={notifyOnError}
                    onCheckedChange={setNotifyOnError}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="log-exec">Registrar execuções</Label>
                    <p className="text-sm text-muted-foreground">
                      Manter histórico de todas execuções
                    </p>
                  </div>
                  <Switch
                    id="log-exec"
                    checked={logExecutions}
                    onCheckedChange={setLogExecutions}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AppLayout>
  )
}