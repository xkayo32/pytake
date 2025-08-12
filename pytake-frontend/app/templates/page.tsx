'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Copy, 
  Trash2, 
  Edit3, 
  Eye,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Filter,
  Download,
  Upload
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { MOCK_TEMPLATES, Template, TemplateStatus, TemplateCategory } from '@/lib/types/template'

const statusConfig: Record<TemplateStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Edit3 },
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  disabled: { label: 'Desativado', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: AlertCircle }
}

const categoryConfig: Record<TemplateCategory, { label: string; color: string }> = {
  MARKETING: { label: 'Marketing', color: 'bg-purple-100 text-purple-800' },
  UTILITY: { label: 'Utilidade', color: 'bg-blue-100 text-blue-800' },
  AUTHENTICATION: { label: 'Autenticação', color: 'bg-orange-100 text-orange-800' }
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

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

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.components.some(c => c.text?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = filterStatus === 'all' || template.status === filterStatus
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory

    return matchesSearch && matchesStatus && matchesCategory
  })

  const handleEdit = (templateId: string) => {
    router.push(`/templates/${templateId}/edit`)
  }

  const handlePreview = (templateId: string) => {
    router.push(`/templates/${templateId}/preview`)
  }

  const handleDuplicate = (templateId: string) => {
    const original = templates.find(t => t.id === templateId)
    if (original) {
      const duplicate: Template = {
        ...original,
        id: Date.now().toString(),
        name: `${original.name}_copy`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvedAt: undefined,
        stats: {
          sent: 0,
          delivered: 0,
          read: 0,
          replied: 0
        }
      }
      setTemplates(prev => [duplicate, ...prev])
    }
  }

  const handleDelete = (templateId: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId))
    }
  }

  const handleSendTest = (templateId: string) => {
    // TODO: Implement test send
    console.log('Sending test for template:', templateId)
  }

  const stats = {
    total: templates.length,
    approved: templates.filter(t => t.status === 'approved').length,
    pending: templates.filter(t => t.status === 'pending').length,
    draft: templates.filter(t => t.status === 'draft').length,
    totalSent: templates.reduce((sum, t) => sum + (t.stats?.sent || 0), 0)
  }

  const getVariableCount = (template: Template) => {
    const variables = new Set<string>()
    template.components.forEach(component => {
      if (component.text) {
        const matches = component.text.match(/\{\{\d+\}\}/g)
        if (matches) {
          matches.forEach(match => variables.add(match))
        }
      }
    })
    return variables.size
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Templates WhatsApp</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus templates de mensagem aprovados pelo WhatsApp
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => router.push('/templates/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Templates criados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <p className="text-xs text-muted-foreground">Prontos para uso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
                <Edit3 className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
                <p className="text-xs text-muted-foreground">Em edição</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enviados</CardTitle>
                <Send className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats.totalSent.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total de envios</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, conteúdo ou tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Todos
              </Button>
              <Button
                variant={filterStatus === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('approved')}
              >
                Aprovados
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                Pendentes
              </Button>
              <Button
                variant={filterStatus === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('draft')}
              >
                Rascunhos
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory('all')}
              >
                <Filter className="h-4 w-4 mr-1" />
                Todas
              </Button>
              <Button
                variant={filterCategory === 'MARKETING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory('MARKETING')}
              >
                Marketing
              </Button>
              <Button
                variant={filterCategory === 'UTILITY' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory('UTILITY')}
              >
                Utilidade
              </Button>
            </div>
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
                <p className="mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca' 
                    : 'Crie seu primeiro template de mensagem'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push('/templates/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Template
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => {
                const StatusIcon = statusConfig[template.status].icon
                const variableCount = getVariableCount(template)
                const bodyComponent = template.components.find(c => c.type === 'BODY')
                
                return (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg font-medium">
                              {template.name}
                            </CardTitle>
                            <Badge 
                              variant="outline" 
                              className={statusConfig[template.status].color}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[template.status].label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary"
                              className={categoryConfig[template.category].color}
                            >
                              {categoryConfig[template.category].label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.language}
                            </Badge>
                            {variableCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {variableCount} variáveis
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Preview Text */}
                      {bodyComponent && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {bodyComponent.text}
                          </p>
                        </div>
                      )}

                      {/* Tags */}
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      {template.stats && template.stats.sent > 0 && (
                        <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Enviados</p>
                            <p className="text-sm font-medium">{template.stats.sent}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Entregues</p>
                            <p className="text-sm font-medium">{template.stats.delivered}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Lidos</p>
                            <p className="text-sm font-medium">{template.stats.read}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Respostas</p>
                            <p className="text-sm font-medium">{template.stats.replied}</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(template.id)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        
                        {template.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendTest(template.id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(template.id)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(template.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  )
}