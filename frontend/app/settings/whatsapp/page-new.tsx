'use client'

import { useState, useEffect } from 'react'
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
  AlertCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface WhatsAppConfig {
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
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<WhatsAppConfig | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone_number_id: '',
    access_token: '',
    business_account_id: '',
    webhook_verify_token: ''
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/whatsapp/')
      
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

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        id: editingConfig?.id,
        is_default: configs.length === 0 // First config becomes default
      }

      const response = await fetch('/api/v1/whatsapp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await loadConfigs()
        setIsDialogOpen(false)
        setEditingConfig(null)
        setFormData({
          name: '',
          phone_number_id: '',
          access_token: '',
          business_account_id: '',
          webhook_verify_token: ''
        })
      }
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  const handleEdit = (config: WhatsAppConfig) => {
    setEditingConfig(config)
    setFormData({
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
      const response = await fetch(`/api/v1/whatsapp/${configId}/default`, {
        method: 'PUT'
      })

      if (response.ok) {
        await loadConfigs()
      }
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }

  const handleDelete = async (configId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/whatsapp/${configId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadConfigs()
      }
    } catch (error) {
      console.error('Error deleting config:', error)
    }
  }

  const handleTest = async (configId: string) => {
    try {
      const response = await fetch(`/api/v1/whatsapp/${configId}/test`, {
        method: 'POST'
      })

      const result = await response.json()
      alert(result.success ? 'Teste realizado com sucesso!' : `Erro: ${result.error?.message}`)
      await loadConfigs()
    } catch (error) {
      console.error('Error testing config:', error)
      alert('Erro ao testar configuração')
    }
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setEditingConfig(null)
                  setFormData({
                    name: '',
                    phone_number_id: '',
                    access_token: '',
                    business_account_id: '',
                    webhook_verify_token: ''
                  })
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Número
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Editar Configuração' : 'Nova Configuração WhatsApp'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Configuração *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: WhatsApp Vendas"
                  />
                </div>
                <div>
                  <Label htmlFor="phone_number_id">Phone Number ID *</Label>
                  <Input
                    id="phone_number_id"
                    value={formData.phone_number_id}
                    onChange={(e) => setFormData({...formData, phone_number_id: e.target.value})}
                    placeholder="574293335763643"
                  />
                </div>
                <div>
                  <Label htmlFor="access_token">Access Token *</Label>
                  <Input
                    id="access_token"
                    type="password"
                    value={formData.access_token}
                    onChange={(e) => setFormData({...formData, access_token: e.target.value})}
                    placeholder="EAAUZBn..."
                  />
                </div>
                <div>
                  <Label htmlFor="business_account_id">Business Account ID</Label>
                  <Input
                    id="business_account_id"
                    value={formData.business_account_id}
                    onChange={(e) => setFormData({...formData, business_account_id: e.target.value})}
                    placeholder="574293335763643"
                  />
                </div>
                <div>
                  <Label htmlFor="webhook_verify_token">Webhook Verify Token *</Label>
                  <Input
                    id="webhook_verify_token"
                    value={formData.webhook_verify_token}
                    onChange={(e) => setFormData({...formData, webhook_verify_token: e.target.value})}
                    placeholder="verify_token_123"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {editingConfig ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                      <DropdownMenuItem onClick={() => handleTest(config.id)}>
                        <TestTube className="h-4 w-4 mr-2" />
                        Testar Conexão
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
                    onClick={() => handleTest(config.id)}
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
    </div>
  )
}