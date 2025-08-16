import { useState, useEffect } from 'react'
import { 
  Settings, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'
import { getNodeConfig, validateNodeConfig } from '@/lib/types/node-schemas'
import { getWhatsAppTemplates, getTemplateButtons } from '@/lib/data/whatsapp-templates'
import { Checkbox } from '@/components/ui/checkbox'

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

  const selectedNodeData = selectedNode 
    ? nodes.find(node => node.id === selectedNode)
    : null

  const nodeType = selectedNodeData?.data?.nodeType 
    ? getNodeConfig(selectedNodeData.data.nodeType)
    : null

  useEffect(() => {
    if (selectedNodeData) {
      const config = selectedNodeData.data.config || {}
      setFormData(config)
      setCustomName(config.customName || '')
    } else {
      setFormData({})
      setCustomName('')
    }
  }, [selectedNodeData])

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
    setFormData(newFormData)
    
    // Atualizar imediatamente para campos críticos
    if ((key === 'templateName' || key === 'selectedButtons' || key === 'captureAll') && selectedNode) {
      updateNodeData(selectedNode, { 
        config: { 
          ...newFormData,
          customName: customName 
        } 
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
    
    switch (schema.type) {
      case 'text':
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={schema.placeholder}
          />
        )
      
      case 'textarea':
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
                handleInputChange(key, checked)
                // Forçar atualização imediata para campos importantes
                if (key === 'captureAll' && selectedNode) {
                  updateNodeData(selectedNode, { 
                    config: { 
                      ...formData,
                      [key]: checked,
                      customName: customName
                    } 
                  })
                }
              }}
            />
            <Label className="text-sm">{value ? 'Ativado' : 'Desativado'}</Label>
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
        const templates = getWhatsAppTemplates()
        return (
          <Select
            value={value || ''}
            onValueChange={(newValue) => {
              handleInputChange(key, newValue)
              // Limpar botões selecionados quando mudar o template
              handleInputChange('selectedButtons', [])
              // Forçar atualização imediata
              if (selectedNode) {
                const updatedConfig = {
                  ...formData,
                  [key]: newValue,
                  selectedButtons: [],
                  captureAll: formData.captureAll !== false
                }
                updateNodeData(selectedNode, { config: updatedConfig })
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={schema.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.name}>
                  <div className="flex flex-col">
                    <span>{template.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {template.components.find(c => c.type === 'BUTTONS')?.buttons?.length || 0} botões
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        const selectedButtons = value || []
        
        if (buttons.length === 0) {
          return (
            <div className="text-xs text-muted-foreground p-2 border rounded">
              Este template não possui botões
            </div>
          )
        }
        
        // Se captureAll é false, mostrar checkboxes
        if (!formData.captureAll) {
          return (
            <div className="space-y-2">
              {buttons.map((button) => {
                const buttonId = button.id || button.text
                const isSelected = selectedButtons.includes(buttonId)
                
                return (
                  <div key={buttonId} className="flex items-center space-x-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        const newSelection = checked
                          ? [...selectedButtons, buttonId]
                          : selectedButtons.filter((id: string) => id !== buttonId)
                        handleInputChange(key, newSelection)
                        // Forçar atualização imediata
                        if (selectedNode) {
                          updateNodeData(selectedNode, { 
                            config: { 
                              ...formData,
                              [key]: newSelection,
                              customName: customName
                            } 
                          })
                        }
                      }}
                    />
                    <Label className="text-sm flex items-center gap-1 cursor-pointer"
                      onClick={() => {
                        const buttonId = button.id || button.text
                        const isSelected = selectedButtons.includes(buttonId)
                        const newSelection = !isSelected
                          ? [...selectedButtons, buttonId]
                          : selectedButtons.filter((id: string) => id !== buttonId)
                        handleInputChange(key, newSelection)
                        if (selectedNode) {
                          updateNodeData(selectedNode, { 
                            config: { 
                              ...formData,
                              [key]: newSelection,
                              customName: customName
                            } 
                          })
                        }
                      }}
                    >
                      {button.type === 'QUICK_REPLY' && '⚡'}
                      {button.type === 'URL' && '🔗'}
                      {button.type === 'PHONE_NUMBER' && '📞'}
                      <span>{button.text}</span>
                      <span className="text-xs text-muted-foreground">({button.type})</span>
                    </Label>
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground">
                Selecione os botões que deseja capturar
              </p>
            </div>
          )
        } else {
          // Se captureAll é true, mostrar lista desabilitada
          return (
            <div className="space-y-2">
              {buttons.map((button) => {
                const buttonId = button.id || button.text
                
                return (
                  <div key={buttonId} className="flex items-center space-x-2 opacity-60">
                    <Checkbox
                      checked={true}
                      disabled={true}
                    />
                    <Label className="text-sm flex items-center gap-1">
                      {button.type === 'QUICK_REPLY' && '⚡'}
                      {button.type === 'URL' && '🔗'}
                      {button.type === 'PHONE_NUMBER' && '📞'}
                      <span>{button.text}</span>
                      <span className="text-xs text-muted-foreground">({button.type})</span>
                    </Label>
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground">
                Todos os botões estão sendo capturados
              </p>
            </div>
          )
        }
      
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
                onChange={(e) => setCustomName(e.target.value)}
                onBlur={() => {
                  // Salvar automaticamente o nome quando perder o foco
                  if (selectedNode) {
                    updateNodeData(selectedNode, { 
                      config: { 
                        ...formData, 
                        customName: customName || selectedNodeData.data.label 
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

      {/* Configuration Form */}
      <div className="flex-1 overflow-auto p-4">
        {nodeType && (
          <div className="space-y-6">
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
            {Object.entries(nodeType.configSchema).map(([key, schema]) => (
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
            ))}

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configurações Avançadas</CardTitle>
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
              </CardContent>
            </Card>

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
          </div>
        )}
      </div>
    </div>
  )
}