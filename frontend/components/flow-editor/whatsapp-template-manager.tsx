import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Edit, MessageSquare, Copy } from 'lucide-react'
import { WhatsAppTemplate, WhatsAppButton } from '@/lib/data/whatsapp-templates'
import { cacheWhatsAppTemplates } from '@/lib/data/whatsapp-templates'

interface WhatsAppTemplateManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function WhatsAppTemplateManager({ isOpen, onClose }: WhatsAppTemplateManagerProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('UTILITY')
  const [headerText, setHeaderText] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [footerText, setFooterText] = useState('')
  const [buttons, setButtons] = useState<WhatsAppButton[]>([])
  const [newButtonText, setNewButtonText] = useState('')
  const [newButtonType, setNewButtonType] = useState<'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'>('QUICK_REPLY')
  const [newButtonValue, setNewButtonValue] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      // Primeiro, buscar templates da API
      const response = await fetch('/api/v1/whatsapp/templates/manage')
      if (response.ok) {
        const apiTemplates = await response.json()
        
        // Formatar templates da API para o nosso formato
        const formattedApiTemplates = apiTemplates.map((t: any) => ({
          id: t.id,
          name: t.name,
          language: t.language || 'pt_BR',
          category: t.category || 'UTILITY',
          status: t.status || 'APPROVED',
          components: t.components || [],
          variables: t.variables || []
        }))
        
        // Também carregar templates locais criados pelo usuário
        const cached = localStorage.getItem('whatsapp_templates_cache')
        let localTemplates: WhatsAppTemplate[] = []
        if (cached) {
          const parsed = JSON.parse(cached)
          localTemplates = parsed.templates || []
        }
        
        // Combinar templates da API com templates locais (evitando duplicatas)
        const apiIds = new Set(formattedApiTemplates.map((t: WhatsAppTemplate) => t.id))
        const userCreatedTemplates = localTemplates.filter(t => 
          t.id.startsWith('custom_') && !apiIds.has(t.id)
        )
        
        const allTemplates = [...formattedApiTemplates, ...userCreatedTemplates]
        setTemplates(allTemplates)
        
        // Atualizar cache com todos os templates
        cacheWhatsAppTemplates(allTemplates)
      } else {
        // Se API falhar, usar apenas cache local
        const cached = localStorage.getItem('whatsapp_templates_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          setTemplates(parsed.templates || [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      // Em caso de erro, tentar cache local
      try {
        const cached = localStorage.getItem('whatsapp_templates_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          setTemplates(parsed.templates || [])
        }
      } catch (cacheError) {
        console.error('Erro ao carregar cache:', cacheError)
        setTemplates([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const saveTemplates = async (newTemplates: WhatsAppTemplate[]) => {
    setTemplates(newTemplates)
    cacheWhatsAppTemplates(newTemplates)
    
    // Se for um template customizado, também salvar via API (opcional)
    // Por enquanto, apenas salvar localmente
  }

  const handleAddButton = () => {
    if (!newButtonText) return
    
    const newButton: WhatsAppButton = {
      type: newButtonType,
      text: newButtonText,
      id: `btn_${Date.now()}`
    }
    
    if (newButtonType === 'URL' && newButtonValue) {
      newButton.url = newButtonValue
    } else if (newButtonType === 'PHONE_NUMBER' && newButtonValue) {
      newButton.phone_number = newButtonValue
    }
    
    setButtons([...buttons, newButton])
    setNewButtonText('')
    setNewButtonValue('')
  }

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index))
  }

  const handleSaveTemplate = () => {
    if (!templateName || !bodyText) {
      alert('Nome e corpo da mensagem são obrigatórios')
      return
    }

    const components = []
    
    if (headerText) {
      components.push({
        type: 'HEADER' as const,
        format: 'TEXT' as const,
        text: headerText
      })
    }
    
    components.push({
      type: 'BODY' as const,
      text: bodyText
    })
    
    if (footerText) {
      components.push({
        type: 'FOOTER' as const,
        text: footerText
      })
    }
    
    if (buttons.length > 0) {
      components.push({
        type: 'BUTTONS' as const,
        buttons: buttons
      })
    }

    const newTemplate: WhatsAppTemplate = {
      id: editingTemplate?.id || `custom_${Date.now()}`,
      name: templateName.toLowerCase().replace(/\s+/g, '_'),
      language: 'pt_BR',
      category: templateCategory,
      status: 'APPROVED',
      components,
      variables: extractVariables(bodyText + headerText)
    }

    let updatedTemplates
    if (editingTemplate) {
      updatedTemplates = templates.map(t => 
        t.id === editingTemplate.id ? newTemplate : t
      )
    } else {
      updatedTemplates = [...templates, newTemplate]
    }
    
    saveTemplates(updatedTemplates)
    resetForm()
  }

  const handleEditTemplate = (template: WhatsAppTemplate) => {
    setEditingTemplate(template)
    setTemplateName(template.name.replace(/_/g, ' '))
    // Categoria pode vir como string dinâmica da API; forçar tipo conhecido ou manter anterior
    setTemplateCategory((template.category as any) as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION')
    
    const header = template.components.find(c => c.type === 'HEADER')
    const body = template.components.find(c => c.type === 'BODY')
    const footer = template.components.find(c => c.type === 'FOOTER')
    const buttonsComp = template.components.find(c => c.type === 'BUTTONS')
    
    setHeaderText(header?.text || '')
    setBodyText(body?.text || '')
    setFooterText(footer?.text || '')
    setButtons(buttonsComp?.buttons || [])
    
    setShowAddTemplate(true)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
      // Se for um template da API (não customizado), tentar deletar via API
      if (!templateId.startsWith('custom_')) {
        try {
          const response = await fetch(`/api/v1/whatsapp/templates/manage/${templateId}`, {
            method: 'DELETE'
          })
          if (!response.ok) {
            console.error('Erro ao deletar template na API')
          }
        } catch (error) {
          console.error('Erro ao deletar template:', error)
        }
      }
      
      const updatedTemplates = templates.filter(t => t.id !== templateId)
      await saveTemplates(updatedTemplates)
    }
  }

  const handleDuplicateTemplate = (template: WhatsAppTemplate) => {
    const duplicated = {
      ...template,
      id: `custom_${Date.now()}`,
      name: `${template.name}_copy`
    }
    saveTemplates([...templates, duplicated])
  }

  const resetForm = () => {
    setShowAddTemplate(false)
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateCategory('UTILITY')
    setHeaderText('')
    setBodyText('')
    setFooterText('')
    setButtons([])
    setNewButtonText('')
    setNewButtonType('QUICK_REPLY')
    setNewButtonValue('')
  }

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\d+)\}\}/g) || []
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Gerenciar Templates do WhatsApp
          </DialogTitle>
          <DialogDescription>
            Crie e gerencie seus templates de mensagem do WhatsApp Business
          </DialogDescription>
        </DialogHeader>

        {!showAddTemplate ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span>Carregando templates...</span>
                ) : (
                  <>
                    {templates.length} template(s) cadastrado(s)
                    {templates.filter(t => !t.id.startsWith('custom_')).length > 0 && (
                      <span className="ml-2 text-xs">
                        ({templates.filter(t => !t.id.startsWith('custom_')).length} da API)
                      </span>
                    )}
                  </>
                )}
              </div>
              <Button onClick={() => setShowAddTemplate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </div>

            {templates.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Nenhum template cadastrado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie templates personalizados para usar em seus flows
                </p>
                <Button onClick={() => setShowAddTemplate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.status}
                          </Badge>
                          {!template.id.startsWith('custom_') && (
                            <Badge variant="default" className="text-xs">
                              Meta
                            </Badge>
                          )}
                          {template.id.startsWith('custom_') && (
                            <Badge variant="secondary" className="text-xs">
                              Local
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          {template.components.find(c => c.type === 'BODY')?.text?.substring(0, 100)}...
                        </div>
                        
                        {template.components.find(c => c.type === 'BUTTONS') && (
                          <div className="flex gap-1 flex-wrap">
                            {template.components.find(c => c.type === 'BUTTONS')?.buttons?.map((btn, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {btn.text}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Template</Label>
                  <Input
                    id="name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Boas vindas"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={templateCategory} onValueChange={(v: any) => setTemplateCategory(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTILITY">Utilidade</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="header">Cabeçalho (opcional)</Label>
                <Input
                  id="header"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Ex: Bem-vindo à {{1}}!"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {"{{1}}"}, {"{{2}}"}, etc. para variáveis
                </p>
              </div>

              <div>
                <Label htmlFor="body">Corpo da Mensagem *</Label>
                <Textarea
                  id="body"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Ex: Olá {{1}}, obrigado por entrar em contato..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="footer">Rodapé (opcional)</Label>
                <Input
                  id="footer"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Ex: Responda com um número"
                />
              </div>

              <div>
                <Label>Botões (opcional)</Label>
                <div className="space-y-2">
                  {buttons.map((button, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="flex-1">
                        {button.type}: {button.text}
                        {button.url && ` → ${button.url}`}
                        {button.phone_number && ` → ${button.phone_number}`}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveButton(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Select value={newButtonType} onValueChange={(v: any) => setNewButtonType(v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUICK_REPLY">Resposta Rápida</SelectItem>
                        <SelectItem value="URL">URL</SelectItem>
                        <SelectItem value="PHONE_NUMBER">Telefone</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      value={newButtonText}
                      onChange={(e) => setNewButtonText(e.target.value)}
                      placeholder="Texto do botão"
                      className="flex-1"
                    />
                    
                    {newButtonType !== 'QUICK_REPLY' && (
                      <Input
                        value={newButtonValue}
                        onChange={(e) => setNewButtonValue(e.target.value)}
                        placeholder={newButtonType === 'URL' ? 'https://...' : '+55...'}
                        className="flex-1"
                      />
                    )}
                    
                    <Button onClick={handleAddButton} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTemplate}>
                {editingTemplate ? 'Atualizar' : 'Salvar'} Template
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}