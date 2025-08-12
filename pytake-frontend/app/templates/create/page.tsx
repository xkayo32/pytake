'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  Send,
  Eye,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  Image,
  Video,
  FileText,
  Phone,
  Link,
  MessageSquare,
  Hash
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  Template, 
  TemplateComponent, 
  TemplateButton, 
  TemplateVariable,
  ComponentType,
  HeaderFormat,
  ButtonType,
  TemplateCategory
} from '@/lib/types/template'

const LANGUAGES = [
  { code: 'pt_BR', label: 'Português (Brasil)' },
  { code: 'en_US', label: 'English (US)' },
  { code: 'es', label: 'Español' }
]

const VARIABLE_PLACEHOLDERS = [
  '{{1}}', '{{2}}', '{{3}}', '{{4}}', '{{5}}',
  '{{6}}', '{{7}}', '{{8}}', '{{9}}', '{{10}}'
]

export default function CreateTemplatePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    category: 'UTILITY',
    language: 'pt_BR',
    status: 'draft',
    components: [],
    tags: []
  })

  const [hasHeader, setHasHeader] = useState(false)
  const [hasBody, setHasBody] = useState(true)
  const [hasFooter, setHasFooter] = useState(false)
  const [hasButtons, setHasButtons] = useState(false)

  const [headerComponent, setHeaderComponent] = useState<TemplateComponent>({
    type: 'HEADER',
    format: 'TEXT',
    text: ''
  })

  const [bodyComponent, setBodyComponent] = useState<TemplateComponent>({
    type: 'BODY',
    text: '',
    variables: []
  })

  const [footerComponent, setFooterComponent] = useState<TemplateComponent>({
    type: 'FOOTER',
    text: ''
  })

  const [buttonsComponent, setButtonsComponent] = useState<TemplateComponent>({
    type: 'BUTTONS',
    buttons: []
  })

  const [errors, setErrors] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    // Update components based on toggles
    const components: TemplateComponent[] = []
    
    if (hasHeader) components.push(headerComponent)
    if (hasBody) components.push(bodyComponent)
    if (hasFooter) components.push(footerComponent)
    if (hasButtons) components.push(buttonsComponent)
    
    setTemplate(prev => ({ ...prev, components }))
  }, [hasHeader, hasBody, hasFooter, hasButtons, headerComponent, bodyComponent, footerComponent, buttonsComponent])

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

  const handleAddButton = () => {
    const newButton: TemplateButton = {
      type: 'QUICK_REPLY',
      text: ''
    }
    
    setButtonsComponent(prev => ({
      ...prev,
      buttons: [...(prev.buttons || []), newButton]
    }))
  }

  const handleRemoveButton = (index: number) => {
    setButtonsComponent(prev => ({
      ...prev,
      buttons: prev.buttons?.filter((_, i) => i !== index) || []
    }))
  }

  const handleUpdateButton = (index: number, button: TemplateButton) => {
    setButtonsComponent(prev => ({
      ...prev,
      buttons: prev.buttons?.map((b, i) => i === index ? button : b) || []
    }))
  }

  const handleAddVariable = (componentType: 'header' | 'body') => {
    const usedVars = extractVariables(componentType === 'header' ? headerComponent.text || '' : bodyComponent.text || '')
    const nextVar = VARIABLE_PLACEHOLDERS.find(v => !usedVars.includes(v))
    
    if (nextVar) {
      const newVariable: TemplateVariable = {
        key: nextVar,
        example: '',
        description: ''
      }
      
      if (componentType === 'header') {
        setHeaderComponent(prev => ({
          ...prev,
          variables: [...(prev.variables || []), newVariable]
        }))
      } else {
        setBodyComponent(prev => ({
          ...prev,
          variables: [...(prev.variables || []), newVariable]
        }))
      }
    }
  }

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{\d+\}\}/g) || []
    return [...new Set(matches)]
  }

  const updateVariables = (text: string, componentType: 'header' | 'body') => {
    const vars = extractVariables(text)
    const component = componentType === 'header' ? headerComponent : bodyComponent
    
    // Update existing variables and add new ones
    const updatedVars: TemplateVariable[] = vars.map(v => {
      const existing = component.variables?.find(var_ => var_.key === v)
      return existing || { key: v, example: '', description: '' }
    })
    
    if (componentType === 'header') {
      setHeaderComponent(prev => ({ ...prev, variables: updatedVars }))
    } else {
      setBodyComponent(prev => ({ ...prev, variables: updatedVars }))
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !template.tags?.includes(tagInput.trim())) {
      setTemplate(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTemplate(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }))
  }

  const validateTemplate = (): boolean => {
    const newErrors: string[] = []
    
    if (!template.name || template.name.length < 3) {
      newErrors.push('Nome do template deve ter pelo menos 3 caracteres')
    }
    
    if (!/^[a-z0-9_]+$/.test(template.name || '')) {
      newErrors.push('Nome do template deve conter apenas letras minúsculas, números e underscore')
    }
    
    if (!hasBody || !bodyComponent.text) {
      newErrors.push('Template deve ter um corpo de mensagem')
    }
    
    if (bodyComponent.text && bodyComponent.text.length > 1024) {
      newErrors.push('Corpo da mensagem não pode exceder 1024 caracteres')
    }
    
    if (hasHeader && headerComponent.format === 'TEXT' && headerComponent.text && headerComponent.text.length > 60) {
      newErrors.push('Cabeçalho de texto não pode exceder 60 caracteres')
    }
    
    if (hasFooter && footerComponent.text && footerComponent.text.length > 60) {
      newErrors.push('Rodapé não pode exceder 60 caracteres')
    }
    
    if (hasButtons && buttonsComponent.buttons) {
      if (buttonsComponent.buttons.length > 3) {
        newErrors.push('Máximo de 3 botões permitidos')
      }
      
      buttonsComponent.buttons.forEach((button, index) => {
        if (!button.text) {
          newErrors.push(`Botão ${index + 1} deve ter um texto`)
        }
        if (button.text && button.text.length > 25) {
          newErrors.push(`Texto do botão ${index + 1} não pode exceder 25 caracteres`)
        }
        if (button.type === 'URL' && !button.url) {
          newErrors.push(`Botão ${index + 1} do tipo URL deve ter uma URL`)
        }
        if (button.type === 'PHONE_NUMBER' && !button.phone_number) {
          newErrors.push(`Botão ${index + 1} do tipo Telefone deve ter um número`)
        }
      })
    }
    
    // Check for undefined variables
    const bodyVars = extractVariables(bodyComponent.text || '')
    bodyVars.forEach(v => {
      const variable = bodyComponent.variables?.find(var_ => var_.key === v)
      if (!variable?.example) {
        newErrors.push(`Variável ${v} precisa de um exemplo`)
      }
    })
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSave = () => {
    if (validateTemplate()) {
      // TODO: Save template via API
      console.log('Saving template:', template)
      router.push('/templates')
    }
  }

  const handleSubmitForApproval = () => {
    if (validateTemplate()) {
      // TODO: Submit template for WhatsApp approval
      console.log('Submitting template for approval:', template)
      setTemplate(prev => ({ ...prev, status: 'pending' }))
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/templates')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              <div>
                <h1 className="text-lg font-semibold">Criar Template</h1>
                <p className="text-sm text-muted-foreground">
                  Crie um novo template de mensagem para WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/templates/preview?draft=true`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Rascunho
              </Button>
              
              <Button
                size="sm"
                onClick={handleSubmitForApproval}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar para Aprovação
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="container max-w-6xl mx-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Column */}
              <div className="space-y-6">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome do Template *</Label>
                      <Input
                        id="name"
                        placeholder="welcome_message"
                        value={template.name}
                        onChange={(e) => setTemplate(prev => ({ 
                          ...prev, 
                          name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                        }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Apenas letras minúsculas, números e underscore
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="category">Categoria *</Label>
                      <Select
                        value={template.category}
                        onValueChange={(value: TemplateCategory) => 
                          setTemplate(prev => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="UTILITY">Utilidade</SelectItem>
                          <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="language">Idioma *</Label>
                      <Select
                        value={template.language}
                        onValueChange={(value) => 
                          setTemplate(prev => ({ ...prev, language: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(lang => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tags</Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Adicionar tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddTag()
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddTag}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.tags?.map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                            <button
                              className="ml-1 hover:text-destructive"
                              onClick={() => handleRemoveTag(tag)}
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Components */}
                <Card>
                  <CardHeader>
                    <CardTitle>Componentes da Mensagem</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Header */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Cabeçalho</Label>
                        <Button
                          variant={hasHeader ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setHasHeader(!hasHeader)}
                        >
                          {hasHeader ? 'Remover' : 'Adicionar'}
                        </Button>
                      </div>
                      
                      {hasHeader && (
                        <div className="space-y-3 pl-4 border-l-2">
                          <div>
                            <Label htmlFor="headerFormat">Formato</Label>
                            <Select
                              value={headerComponent.format}
                              onValueChange={(value: HeaderFormat) => 
                                setHeaderComponent(prev => ({ ...prev, format: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TEXT">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Texto
                                  </div>
                                </SelectItem>
                                <SelectItem value="IMAGE">
                                  <div className="flex items-center gap-2">
                                    <Image className="h-4 w-4" />
                                    Imagem
                                  </div>
                                </SelectItem>
                                <SelectItem value="VIDEO">
                                  <div className="flex items-center gap-2">
                                    <Video className="h-4 w-4" />
                                    Vídeo
                                  </div>
                                </SelectItem>
                                <SelectItem value="DOCUMENT">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Documento
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {headerComponent.format === 'TEXT' && (
                            <div>
                              <Label htmlFor="headerText">Texto do Cabeçalho</Label>
                              <Input
                                id="headerText"
                                placeholder="Título da mensagem..."
                                value={headerComponent.text}
                                onChange={(e) => {
                                  setHeaderComponent(prev => ({ ...prev, text: e.target.value }))
                                  updateVariables(e.target.value, 'header')
                                }}
                                maxLength={60}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {headerComponent.text?.length || 0}/60 caracteres
                              </p>
                            </div>
                          )}

                          {headerComponent.format !== 'TEXT' && (
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">
                                <Info className="h-4 w-4 inline mr-1" />
                                URLs de mídia devem ser adicionadas ao enviar a mensagem
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Corpo da Mensagem *</Label>
                        <Badge variant="secondary">Obrigatório</Badge>
                      </div>
                      
                      <div className="space-y-3 pl-4 border-l-2">
                        <div>
                          <Label htmlFor="bodyText">Texto</Label>
                          <Textarea
                            id="bodyText"
                            placeholder="Digite o conteúdo da mensagem... Use {{1}}, {{2}}, etc. para variáveis"
                            value={bodyComponent.text}
                            onChange={(e) => {
                              setBodyComponent(prev => ({ ...prev, text: e.target.value }))
                              updateVariables(e.target.value, 'body')
                            }}
                            rows={6}
                            maxLength={1024}
                          />
                          <div className="flex justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              Use {'{{1}}'}, {'{{2}}'}, etc. para adicionar variáveis
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bodyComponent.text?.length || 0}/1024 caracteres
                            </p>
                          </div>
                        </div>

                        {/* Variables */}
                        {bodyComponent.variables && bodyComponent.variables.length > 0 && (
                          <div className="space-y-2">
                            <Label>Exemplos de Variáveis</Label>
                            {bodyComponent.variables.map((variable, index) => (
                              <div key={variable.key} className="flex gap-2">
                                <Badge variant="outline" className="min-w-fit">
                                  {variable.key}
                                </Badge>
                                <Input
                                  placeholder="Exemplo..."
                                  value={variable.example}
                                  onChange={(e) => {
                                    const updatedVars = [...(bodyComponent.variables || [])]
                                    updatedVars[index] = { ...variable, example: e.target.value }
                                    setBodyComponent(prev => ({ ...prev, variables: updatedVars }))
                                  }}
                                />
                                <Input
                                  placeholder="Descrição (opcional)"
                                  value={variable.description}
                                  onChange={(e) => {
                                    const updatedVars = [...(bodyComponent.variables || [])]
                                    updatedVars[index] = { ...variable, description: e.target.value }
                                    setBodyComponent(prev => ({ ...prev, variables: updatedVars }))
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Rodapé</Label>
                        <Button
                          variant={hasFooter ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setHasFooter(!hasFooter)}
                        >
                          {hasFooter ? 'Remover' : 'Adicionar'}
                        </Button>
                      </div>
                      
                      {hasFooter && (
                        <div className="space-y-3 pl-4 border-l-2">
                          <div>
                            <Label htmlFor="footerText">Texto do Rodapé</Label>
                            <Input
                              id="footerText"
                              placeholder="Informação adicional..."
                              value={footerComponent.text}
                              onChange={(e) => 
                                setFooterComponent(prev => ({ ...prev, text: e.target.value }))
                              }
                              maxLength={60}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {footerComponent.text?.length || 0}/60 caracteres
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Botões</Label>
                        <Button
                          variant={hasButtons ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setHasButtons(!hasButtons)}
                        >
                          {hasButtons ? 'Remover' : 'Adicionar'}
                        </Button>
                      </div>
                      
                      {hasButtons && (
                        <div className="space-y-3 pl-4 border-l-2">
                          {buttonsComponent.buttons?.map((button, index) => (
                            <div key={index} className="space-y-2 p-3 border rounded-lg">
                              <div className="flex items-center justify-between">
                                <Label>Botão {index + 1}</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveButton(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label htmlFor={`buttonType-${index}`}>Tipo</Label>
                                  <Select
                                    value={button.type}
                                    onValueChange={(value: ButtonType) => 
                                      handleUpdateButton(index, { ...button, type: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="QUICK_REPLY">
                                        <div className="flex items-center gap-2">
                                          <MessageSquare className="h-4 w-4" />
                                          Resposta Rápida
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="URL">
                                        <div className="flex items-center gap-2">
                                          <Link className="h-4 w-4" />
                                          URL
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="PHONE_NUMBER">
                                        <div className="flex items-center gap-2">
                                          <Phone className="h-4 w-4" />
                                          Telefone
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label htmlFor={`buttonText-${index}`}>Texto</Label>
                                  <Input
                                    id={`buttonText-${index}`}
                                    placeholder="Texto do botão"
                                    value={button.text}
                                    onChange={(e) => 
                                      handleUpdateButton(index, { ...button, text: e.target.value })
                                    }
                                    maxLength={25}
                                  />
                                </div>
                              </div>
                              
                              {button.type === 'URL' && (
                                <div>
                                  <Label htmlFor={`buttonUrl-${index}`}>URL</Label>
                                  <Input
                                    id={`buttonUrl-${index}`}
                                    placeholder="https://exemplo.com/{{1}}"
                                    value={button.url}
                                    onChange={(e) => 
                                      handleUpdateButton(index, { ...button, url: e.target.value })
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Use {'{{1}}'} para URLs dinâmicas
                                  </p>
                                </div>
                              )}
                              
                              {button.type === 'PHONE_NUMBER' && (
                                <div>
                                  <Label htmlFor={`buttonPhone-${index}`}>Número de Telefone</Label>
                                  <Input
                                    id={`buttonPhone-${index}`}
                                    placeholder="+5511999999999"
                                    value={button.phone_number}
                                    onChange={(e) => 
                                      handleUpdateButton(index, { ...button, phone_number: e.target.value })
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {(!buttonsComponent.buttons || buttonsComponent.buttons.length < 3) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleAddButton}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Botão
                            </Button>
                          )}
                          
                          {buttonsComponent.buttons && buttonsComponent.buttons.length >= 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              Máximo de 3 botões atingido
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Validation Errors */}
                {errors.length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-800 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Erros de Validação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm text-red-700">
                        {errors.map((error, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Preview Column */}
              <div className="lg:sticky lg:top-20 lg:h-fit">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-[#E5DDD5] dark:bg-slate-900 rounded-lg p-4 min-h-[400px]">
                      <div className="max-w-sm mx-auto">
                        {/* WhatsApp Message Bubble */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-3 space-y-2">
                          {/* Header */}
                          {hasHeader && headerComponent.text && (
                            <div className="font-semibold text-sm">
                              {headerComponent.text}
                            </div>
                          )}
                          
                          {hasHeader && headerComponent.format !== 'TEXT' && (
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32 flex items-center justify-center">
                              <div className="text-gray-500 dark:text-gray-400 text-sm">
                                {headerComponent.format === 'IMAGE' && <Image className="h-8 w-8 mb-1 mx-auto" />}
                                {headerComponent.format === 'VIDEO' && <Video className="h-8 w-8 mb-1 mx-auto" />}
                                {headerComponent.format === 'DOCUMENT' && <FileText className="h-8 w-8 mb-1 mx-auto" />}
                                [{headerComponent.format}]
                              </div>
                            </div>
                          )}
                          
                          {/* Body */}
                          {hasBody && bodyComponent.text && (
                            <div className="text-sm whitespace-pre-wrap">
                              {bodyComponent.text.replace(/\{\{\d+\}\}/g, (match) => {
                                const variable = bodyComponent.variables?.find(v => v.key === match)
                                return variable?.example ? 
                                  `[${variable.example}]` : 
                                  `[${match}]`
                              })}
                            </div>
                          )}
                          
                          {/* Footer */}
                          {hasFooter && footerComponent.text && (
                            <div className="text-xs text-muted-foreground pt-2 border-t">
                              {footerComponent.text}
                            </div>
                          )}
                          
                          {/* Buttons */}
                          {hasButtons && buttonsComponent.buttons && buttonsComponent.buttons.length > 0 && (
                            <div className="pt-2 border-t space-y-2">
                              {buttonsComponent.buttons.map((button, index) => (
                                <button
                                  key={index}
                                  className="w-full p-2 text-sm text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                  {button.type === 'URL' && <Link className="h-4 w-4" />}
                                  {button.type === 'PHONE_NUMBER' && <Phone className="h-4 w-4" />}
                                  {button.type === 'QUICK_REPLY' && <MessageSquare className="h-4 w-4" />}
                                  {button.text || `Botão ${index + 1}`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                          <CheckCircle className="h-3 w-3" />
                          <span>Preview da mensagem</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Template Info */}
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Nome:</span>
                        <span className="font-mono">{template.name || 'não definido'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Categoria:</span>
                        <Badge variant="secondary">{template.category}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Idioma:</span>
                        <span>{LANGUAGES.find(l => l.code === template.language)?.label}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Variáveis:</span>
                        <span>{extractVariables(bodyComponent.text || '').length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}