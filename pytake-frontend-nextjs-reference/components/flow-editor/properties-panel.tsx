import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  Variable,
  Code,
  Wrench,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'
import { getNodeConfig, validateNodeConfig } from '@/lib/types/node-schemas'
import { getWhatsAppTemplatesSync, getTemplateButtons, getWhatsAppTemplates } from '@/lib/data/whatsapp-templates'
import { Checkbox } from '@/components/ui/checkbox'
import { ButtonSelector } from '@/components/flow-editor/button-selector'
import { VariableEditor } from '@/components/flow-editor/variable-editor'
import { VariablesPanel } from '@/components/flow-editor/variables-panel'
import { extractVariables } from '@/lib/data/flow-variables'
import { WhatsAppTemplateManager } from '@/components/flow-editor/whatsapp-template-manager'

interface PropertiesPanelProps {
  className?: string
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const { 
    selectedNode, 
    nodes, 
    updateNodeData, 
    deleteNode,
    selectNode
  } = useFlowEditorStore()
  
  const [customName, setCustomName] = useState('')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isValid, setIsValid] = useState(true)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('config')
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  const selectedNodeData = selectedNode 
    ? nodes.find(node => node.id === selectedNode)
    : null

  const nodeType = selectedNodeData?.data?.nodeType 
    ? getNodeConfig(selectedNodeData.data.nodeType)
    : null

  // Extrair variáveis usadas nos campos do nó
  const usedVariables = React.useMemo(() => {
    if (!nodeType || !formData) return []
    
    const variables = new Set<string>()
    
    Object.entries(nodeType.configSchema).forEach(([key, schema]) => {
      if (schema.supportsVariables !== false && (schema.type === 'text' || schema.type === 'textarea')) {
        const value = formData[key] || ''
        if (typeof value === 'string') {
          extractVariables(value).forEach(variable => variables.add(variable))
        }
      }
    })
    
    return Array.from(variables)
  }, [nodeType, formData])

  useEffect(() => {
    if (selectedNodeData && nodeType) {
      const config = selectedNodeData.data.config || {}
      
      // Aplicar valores padrão do schema quando não existirem
      const configWithDefaults = { ...config }
      Object.entries(nodeType.configSchema).forEach(([key, schema]) => {
        if (schema.defaultValue !== undefined && configWithDefaults[key] === undefined) {
          configWithDefaults[key] = schema.defaultValue
        }
      })
      
      setFormData(configWithDefaults)
      setCustomName(configWithDefaults.customName || '')
    } else {
      setFormData({})
      setCustomName('')
    }
  }, [selectedNodeData, nodeType])
  
  // Carregar templates da API quando o componente montar
  useEffect(() => {
    if (!templatesLoaded) {
      getWhatsAppTemplates().then((loadedTemplates) => {
        setTemplatesLoaded(true)
        // Forçar re-render para atualizar o Select com os novos templates
        setFormData(prev => ({ ...prev }))
      }).catch(error => {
        console.error('Error loading templates:', error)
        setTemplatesLoaded(true) // Mark as loaded even on error to avoid infinite loop
      })
    }
  }, [templatesLoaded])
  
  // Auto-save no localStorage quando houver mudanças
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (selectedNode && formData) {
        const { saveToLocalStorage } = useFlowEditorStore.getState()
        saveToLocalStorage()
        console.log('Auto-save: dados salvos no localStorage')
      }
    }, 1000) // Salva após 1 segundo de inatividade
    
    return () => clearTimeout(saveTimer)
  }, [formData, customName, selectedNode])

  useEffect(() => {
    validateForm()
  }, [formData, nodeType])

  const validateForm = () => {
    if (!nodeType || !selectedNodeData) return

    const validation = validateNodeConfig(selectedNodeData.data.nodeType, formData)
    setValidationErrors(validation.errors)
    setIsValid(validation.isValid)
  }

  const handleInputChange = (key: string, value: any) => {
    const newFormData = { ...formData, [key]: value }
    
    // Se estamos desativando captureAll, também limpar selectedButtons no mesmo update
    if (key === 'captureAll' && !value) {
      newFormData.selectedButtons = []
    }
    
    setFormData(newFormData)
    
    // Sempre atualizar o nó em tempo real para não perder dados
    if (selectedNode) {
      const updatedConfig = { 
        ...newFormData,
        customName: customName 
      }
      updateNodeData(selectedNode, { 
        config: updatedConfig 
      })
    }
  }

  const handleSave = () => {
    if (!selectedNode || !isValid) return
    
    const fullConfig = {
      ...formData,
      customName: customName || selectedNodeData?.data.label
    }
    
    updateNodeData(selectedNode, { config: fullConfig })
    
    // Mostrar feedback visual
    const button = document.querySelector('[data-save-button]')
    if (button) {
      button.classList.add('bg-green-500')
      setTimeout(() => {
        button.classList.remove('bg-green-500')
      }, 1000)
    }
  }

  const handleDelete = () => {
    if (!selectedNode) return
    deleteNode(selectedNode)
    selectNode(null)
  }

  const renderFormField = (key: string, schema: any) => {
    const value = formData[key] || ''
    
    // Determinar se o campo suporta variáveis
    const supportsVariables = schema.supportsVariables !== false && 
      (schema.type === 'text' || schema.type === 'textarea')
    
    switch (schema.type) {
      case 'text':
        if (supportsVariables) {
          return (
            <VariableEditor
              key={`${selectedNode}-${key}`} // Add key to prevent confusion
              value={value}
              onChange={(newValue) => handleInputChange(key, newValue)}
              placeholder={schema.placeholder}
              multiline={false}
            />
          )
        }
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={schema.placeholder}
          />
        )
      
      case 'textarea':
        if (supportsVariables) {
          return (
            <VariableEditor
              key={`${selectedNode}-${key}`} // Add key to prevent confusion
              value={value}
              onChange={(newValue) => handleInputChange(key, newValue)}
              placeholder={schema.placeholder}
              multiline={true}
            />
          )
        }
        return (
          <Textarea
            value={value}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={schema.placeholder}
            rows={3}
          />
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={schema.placeholder}
          />
        )
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => {
                console.log(`Switch ${key} changed:`, { from: value, to: checked })
                handleInputChange(key, checked)
              }}
            />
            <Label className="text-sm">{Boolean(value) ? 'Ativado' : 'Desativado'}</Label>
          </div>
        )
      
      case 'array':
        return (
          <div className="space-y-2">
            <Textarea
              value={Array.isArray(value) ? value.join('\n') : value}
              onChange={(e) => handleInputChange(key, e.target.value.split('\n').filter(v => v))}
              placeholder={schema.placeholder}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Separe os valores com Enter</p>
          </div>
        )
      
      case 'template_select':
        const templates = getWhatsAppTemplatesSync()
        // Garantir que o valor seja uma string válida
        const currentValue = value ? String(value) : ''
        
        return (
          <div className="space-y-2">
            <Select
              key={`template-select-${selectedNode}`} // Forçar re-render quando mudar de nó
              value={currentValue}
              onValueChange={(newValue) => {
                handleInputChange(key, newValue)
                // Limpar botões selecionados quando mudar o template
                if (formData.selectedButtons) {
                  handleInputChange('selectedButtons', [])
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={schema.placeholder || 'Selecione um template'}>
                  {currentValue && templates.find(t => t.name === currentValue)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    Nenhum template disponível
                  </div>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={`${template.id}-${template.name}`} value={template.name}>
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {template.components.find(c => c.type === 'BUTTONS')?.buttons?.length || 0} botões
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateManager(true)}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Gerenciar Templates
            </Button>
          </div>
        )
      
      case 'button_select':
        const selectedTemplate = formData.templateName
        if (!selectedTemplate) {
          return (
            <div className="text-xs text-muted-foreground p-2 border rounded">
              Selecione um template primeiro
            </div>
          )
        }
        
        const buttons = getTemplateButtons(selectedTemplate)
        
        return (
          <ButtonSelector
            buttons={buttons}
            selectedButtons={value || []}
            captureAll={formData.captureAll === true || formData.captureAll === undefined}
            onSelectionChange={(newSelection) => {
              handleInputChange('selectedButtons', newSelection)
            }}
          />
        )
      
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleInputChange(key, newValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder={schema.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {schema.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'json':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                handleInputChange(key, parsed)
              } catch {
                handleInputChange(key, e.target.value)
              }
            }}
            placeholder={schema.placeholder}
            rows={4}
            className="font-mono text-sm"
          />
        )
      
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={schema.placeholder}
          />
        )
    }
  }

  if (!selectedNode || !selectedNodeData) {
    return (
      <div className={`w-80 border-l bg-background/50 flex flex-col ${className}`}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-muted-foreground">Propriedades</h2>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Selecione um componente no canvas</p>
            <p className="text-xs mt-2 opacity-70">Clique em um nó para editar suas propriedades</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <WhatsAppTemplateManager 
        isOpen={showTemplateManager} 
        onClose={() => {
          setShowTemplateManager(false)
          // Recarregar templates após fechar o gerenciador
          getWhatsAppTemplates().then(() => {
            // Forçar re-render do campo de seleção
            const currentTemplate = formData.templateName
            if (currentTemplate) {
              handleInputChange('templateName', '')
              setTimeout(() => {
                handleInputChange('templateName', currentTemplate)
              }, 50)
            }
          })
        }}
      />
      
      <div className={`w-80 border-l bg-background/50 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Propriedades</h2>
        </div>

        {/* Node Info */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                backgroundColor: `${selectedNodeData.data.color}20`,
                color: selectedNodeData.data.color
              }}
            >
              <Settings className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {selectedNodeData.data.label}
              </div>
              <Input
                type="text"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value)
                  // Salvar em tempo real
                  if (selectedNode) {
                    updateNodeData(selectedNode, { 
                      config: { 
                        ...formData, 
                        customName: e.target.value || selectedNodeData.data.label 
                      } 
                    })
                  }
                }}
                placeholder={`Nome do ${selectedNodeData.data.label}`}
                className="h-8 text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 transition-colors"
            data-save-button
          >
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-hidden">
        {nodeType && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Tabs List */}
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="config" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Config
                </TabsTrigger>
                <TabsTrigger value="variables" className="text-xs">
                  <Variable className="h-3 w-3 mr-1" />
                  Variáveis
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs">
                  <Wrench className="h-3 w-3 mr-1" />
                  Avançado
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-4">
              {/* Aba de Configuração */}
              <TabsContent value="config" className="space-y-4 mt-0">
                {/* Validation Status */}
                <div className="flex items-center gap-2">
                  {isValid ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Configuração válida</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">
                        {validationErrors.length} erro{validationErrors.length > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-2">Erros de validação:</p>
                      <ul className="space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <div className="w-1 h-1 bg-red-600 rounded-full" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  {Object.entries(nodeType.configSchema).map(([key, schema]) => {
                    // Pular customName porque já é renderizado no cabeçalho
                    if (key === 'customName') {
                      return null
                    }
                    
                    // Verificar condição showWhen
                    if (schema.showWhen) {
                      const [conditionField, conditionValue] = schema.showWhen.split(':')
                      const currentValue = formData[conditionField]
                      const shouldShow = conditionValue === 'false' 
                        ? currentValue === false 
                        : currentValue?.toString() === conditionValue
                      
                      if (!shouldShow) {
                        return null
                      }
                    }
                    
                    return (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key} className="text-sm font-medium">
                          {schema.label}
                          {schema.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {renderFormField(key, schema)}
                        {schema.placeholder && (
                          <p className="text-xs text-muted-foreground">
                            {schema.placeholder}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </TabsContent>

              {/* Aba de Variáveis */}
              <TabsContent value="variables" className="mt-0">
                <VariablesPanel 
                  selectedVariables={usedVariables}
                  showCopyButtons={true}
                  onVariableSelect={(variableId) => {
                    // Opcional: inserir variável no campo ativo
                    console.log('Variable selected:', variableId)
                  }}
                />
              </TabsContent>

              {/* Aba Avançada */}
              <TabsContent value="advanced" className="space-y-4 mt-0">
                {/* Advanced Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informações do Nó</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">ID do Node</Label>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {selectedNode}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Tipo</Label>
                      <Badge variant="outline" className="text-xs">
                        {nodeType.name}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Categoria</Label>
                      <Badge variant="outline" className="text-xs">
                        {nodeType.category}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Entradas</Label>
                      <Badge variant="outline" className="text-xs">
                        {nodeType.inputs}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Saídas</Label>
                      <Badge variant="outline" className="text-xs">
                        {nodeType.outputs}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Variáveis em Uso */}
                {usedVariables.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Variáveis em Uso</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {usedVariables.map((varId, index) => (
                          <Badge key={index} variant="secondary" className="text-xs font-mono">
                            {`{{${varId}}}`}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Debug Info */}
                {process.env.NODE_ENV === 'development' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Debug</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(formData, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
      </div>
    </>
  )
}