'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Phone, 
  Settings, 
  Trash2, 
  Star, 
  StarOff,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  MoreVertical
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
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

export default function WhatsAppNumbersPage() {
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
  
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadConfigs()
    }
  }, [isAuthenticated])

  const loadConfigs = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp-configs`, { headers })
      
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

      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp-configs`, {
        method: 'POST',
        headers,
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
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp-configs/${configId}/default`, {
        method: 'PUT',
        headers
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
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp-configs/${configId}`, {
        method: 'DELETE',
        headers
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
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp-configs/${configId}/test`, {
        method: 'POST',
        headers
      })

      const result = await response.json()
      alert(result.success ? 'Teste realizado com sucesso!' : `Erro: ${result.error?.message}`)
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

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Números WhatsApp</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie múltiplos números WhatsApp Business
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingConfig(null)
                  setFormData({
                    name: '',
                    phone_number_id: '',
                    access_token: '',
                    business_account_id: '',
                    webhook_verify_token: ''
                  })
                }}>
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
                    <Label htmlFor="name">Nome da Configuração</Label>
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
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{configs.length}</div>
                <p className="text-xs text-muted-foreground">Números configurados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conectados</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {configs.filter(c => c.status === 'connected').length}
                </div>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Padrão</CardTitle>
                <Star className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {configs.filter(c => c.is_default).length}
                </div>
                <p className="text-xs text-muted-foreground">Número padrão</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desconectados</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {configs.filter(c => c.status !== 'connected').length}
                </div>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </CardContent>
            </Card>
          </div>

          {/* Configs Grid */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando configurações...</p>
            </div>
          ) : configs.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Phone className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum número configurado</h3>
                <p className="mb-4">Adicione seu primeiro número WhatsApp Business</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Número
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {configs.map((config) => (
                <Card key={config.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{config.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            ID: {config.phone_number_id.substring(0, 12)}...
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
                            Testar
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
                    <div className="flex items-center justify-between">
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
                      {config.is_default && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Padrão
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <div>Business ID: {config.business_account_id}</div>
                      <div>Criado: {new Date(config.created_at).toLocaleDateString()}</div>
                      <div>Atualizado: {new Date(config.updated_at).toLocaleDateString()}</div>
                    </div>

                    <div className="flex gap-2">
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
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  )
}