'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  RefreshCw, 
  MessageSquare, 
  Eye,
  BarChart3,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/layout/app-layout'
import { notify } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Template {
  id: string
  name: string
  status: string
  category: string
  language: string
  body_text: string
  header_text?: string
  footer_text?: string
  variables: string[]
  components: any[]
  usage_count?: number
  last_used_at?: string
  is_custom: boolean
  description?: string
  created_at: string
  updated_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Editor states
  const [formData, setFormData] = useState({
    name: '',
    category: 'UTILITY',
    language: 'pt_BR',
    body_text: '',
    header_text: '',
    footer_text: '',
    variables: [] as string[],
    description: ''
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/whatsapp/templates/manage')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      } else {
        throw new Error('Failed to load templates')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      notify.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/v1/whatsapp/templates/sync', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        notify.success(`${data.synced_count} templates sincronizados`)
        loadTemplates()
      } else {
        throw new Error('Failed to sync templates')
      }
    } catch (error) {
      console.error('Error syncing templates:', error)
      notify.error('Erro ao sincronizar templates')
    } finally {
      setSyncing(false)
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.body_text) {
        notify.error('Nome e texto do corpo são obrigatórios')
        return
      }

      const response = await fetch('/api/v1/whatsapp/templates/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingTemplate?.id,
          variables: extractVariables(formData.body_text + ' ' + formData.header_text + ' ' + formData.footer_text)
        })
      })

      if (response.ok) {
        const data = await response.json()
        notify.success(editingTemplate ? 'Template atualizado' : 'Template criado')
        setShowEditor(false)
        resetForm()
        loadTemplates()
      } else {
        throw new Error('Failed to save template')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      notify.error('Erro ao salvar template')
    }
  }

  const handleDelete = async () => {
    if (!templateToDelete) return

    try {
      const response = await fetch(`/api/v1/whatsapp/templates/manage/${templateToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        notify.success('Template removido')
        setShowDeleteDialog(false)
        setTemplateToDelete(null)
        loadTemplates()
      } else {
        throw new Error('Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      notify.error('Erro ao remover template')
    }
  }

  const handleSubmitForApproval = async (templateId: string) => {
    try {
      const response = await fetch(`/api/v1/whatsapp/templates/submit/${templateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        notify.success('Template enviado para aprovação do Meta')
        loadTemplates() // Recarregar para mostrar novo status
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit template')
      }
    } catch (error) {
      console.error('Error submitting template:', error)
      notify.error('Erro ao enviar template para aprovação')
    }
  }

  const extractVariables = (text: string): string[] => {
    const variableRegex = /\{\{(\d+)\}\}/g
    const variables = new Set<string>()
    let match
    
    while ((match = variableRegex.exec(text)) !== null) {
      variables.add(`var${match[1]}`)
    }
    
    return Array.from(variables)
  }

  const openEditor = (template?: Template) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        category: template.category,
        language: template.language,
        body_text: template.body_text || '',
        header_text: template.header_text || '',
        footer_text: template.footer_text || '',
        variables: template.variables || [],
        description: template.description || ''
      })
    } else {
      setEditingTemplate(null)
      resetForm()
    }
    setShowEditor(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'UTILITY',
      language: 'pt_BR',
      body_text: '',
      header_text: '',
      footer_text: '',
      variables: [],
      description: ''
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      APPROVED: { label: 'Aprovado', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      PENDING: { label: 'Pendente', variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      REJECTED: { label: 'Rejeitado', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      DRAFT: { label: 'Rascunho', variant: 'outline' as const, icon: Edit, color: 'text-gray-600' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.body_text?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Templates</h1>
            <p className="text-muted-foreground">
              Crie, edite e gerencie seus templates do WhatsApp Business
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Button onClick={() => openEditor()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Template
            </Button>
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="APPROVED">Aprovados</SelectItem>
                  <SelectItem value="PENDING">Pendentes</SelectItem>
                  <SelectItem value="REJECTED">Rejeitados</SelectItem>
                  <SelectItem value="DRAFT">Rascunhos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Templates Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {getStatusBadge(template.status)}
                      </div>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <span>{template.category}</span>
                        <span>•</span>
                        <span>{template.language}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm">
                        <p className="line-clamp-3">{template.body_text}</p>
                      </div>
                      
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {template.variables.map((variable, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {`{{${index + 1}}}`}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {template.usage_count !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          {template.usage_count} envios
                        </div>
                      )}

                      <div className="flex gap-2">
                        {template.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSubmitForApproval(template.id)}
                            className="flex-1 gap-2"
                          >
                            <Send className="h-3 w-3" />
                            Enviar
                          </Button>
                        )}
                        {template.status !== 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditor(template)}
                            className="flex-1 gap-2"
                          >
                            <Edit className="h-3 w-3" />
                            Editar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTemplateToDelete(template)
                            setShowDeleteDialog(true)
                          }}
                          className="gap-2 text-red-600 hover:text-red-700"
                          disabled={template.status === 'APPROVED' && !template.is_custom}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredTemplates.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Tente ajustar seus filtros'
                        : 'Crie seu primeiro template ou sincronize com o Meta'}
                    </p>
                    <Button onClick={() => openEditor()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Criar Template
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Métricas de Templates
                </CardTitle>
                <CardDescription>
                  Análise de desempenho dos seus templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>Métricas de templates em desenvolvimento</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Template Editor Modal */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {editingTemplate ? 'Editar Template' : 'Novo Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Modifique seu template' : 'Crie um novo template para WhatsApp Business'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="nome_do_template"
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utilitário</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="language">Idioma</Label>
              <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">Português (BR)</SelectItem>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="es_ES">Español (ES)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="header">Cabeçalho (opcional)</Label>
              <Input
                id="header"
                value={formData.header_text}
                onChange={(e) => setFormData(prev => ({ ...prev, header_text: e.target.value }))}
                placeholder="Texto do cabeçalho"
              />
            </div>

            <div>
              <Label htmlFor="body">Texto Principal *</Label>
              <Textarea
                id="body"
                value={formData.body_text}
                onChange={(e) => setFormData(prev => ({ ...prev, body_text: e.target.value }))}
                placeholder="Olá {{1}}! Como posso ajudar você hoje?"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {`{{1}}, {{2}}, etc.`} para variáveis
              </p>
            </div>

            <div>
              <Label htmlFor="footer">Rodapé (opcional)</Label>
              <Input
                id="footer"
                value={formData.footer_text}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_text: e.target.value }))}
                placeholder="Texto do rodapé"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do template para referência interna"
                rows={2}
              />
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="mt-2 space-y-2">
                {formData.header_text && (
                  <div className="font-medium text-sm">{formData.header_text}</div>
                )}
                <div className="text-sm">{formData.body_text || 'Digite o texto principal...'}</div>
                {formData.footer_text && (
                  <div className="text-xs text-muted-foreground">{formData.footer_text}</div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditor(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Atualizar' : 'Criar'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Excluir Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}