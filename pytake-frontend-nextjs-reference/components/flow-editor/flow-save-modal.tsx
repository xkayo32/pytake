import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
import { 
  Save, 
  Zap,
  AlertCircle,
  Check,
  Globe,
  Lock,
  Archive,
  History,
  Phone
} from 'lucide-react'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'
import { WhatsAppNumberSelector } from '@/components/whatsapp/whatsapp-number-selector'

interface FlowSaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (flowData: SavedFlowData) => void
  mode?: 'create' | 'edit'
}

interface SavedFlowData {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  version: string
  status: 'draft' | 'published' | 'archived'
  isPublic: boolean
  whatsappNumbers: string[] // IDs dos números WhatsApp onde o flow está ativo
  flow: {
    nodes: any[]
    edges: any[]
  }
  metadata: {
    createdAt: string
    updatedAt: string
    nodeCount: number
    edgeCount: number
    triggers: string[]
    actions: string[]
    version: number
    parentVersion?: string
  }
}

const FLOW_CATEGORIES = [
  { value: 'vendas', label: 'Vendas', icon: '💰' },
  { value: 'suporte', label: 'Suporte', icon: '🎧' },
  { value: 'marketing', label: 'Marketing', icon: '📢' },
  { value: 'cobranca', label: 'Cobrança', icon: '💳' },
  { value: 'onboarding', label: 'Onboarding', icon: '🚀' },
  { value: 'feedback', label: 'Feedback', icon: '⭐' },
  { value: 'agendamento', label: 'Agendamento', icon: '📅' },
  { value: 'notificacao', label: 'Notificação', icon: '🔔' },
  { value: 'automacao', label: 'Automação', icon: '⚡' },
  { value: 'outro', label: 'Outro', icon: '📦' }
]

const FLOW_STATUSES = [
  { value: 'draft', label: 'Rascunho', icon: '✏️', description: 'Flow em desenvolvimento' },
  { value: 'published', label: 'Publicado', icon: '🚀', description: 'Flow ativo e funcional' },
  { value: 'archived', label: 'Arquivado', icon: '📦', description: 'Flow inativo, mantido para histórico' }
]

export function FlowSaveModal({ isOpen, onClose, onSave, mode = 'create' }: FlowSaveModalProps) {
  const { nodes, edges, flow, clearLocalStorage } = useFlowEditorStore()
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: flow?.name || '',
    description: flow?.description || '',
    category: 'vendas',
    tags: '',
    version: '1.0.0',
    status: 'draft' as 'draft' | 'published' | 'archived',
    isPublic: false
  })
  
  const [selectedWhatsAppNumbers, setSelectedWhatsAppNumbers] = useState<string[]>([])
  
  // Carregar dados do flow existente quando o modal abrir
  useEffect(() => {
    if (isOpen && flow) {
      // Tentar carregar flow salvo para obter números WhatsApp
      const savedFlows = JSON.parse(localStorage.getItem('saved_flows') || '[]')
      const existingFlow = savedFlows.find((f: any) => f.id === flow.id)
      
      if (existingFlow) {
        console.log('Carregando flow existente:', existingFlow)
        
        // Atualizar formulário com dados do flow existente
        setFormData({
          name: existingFlow.name || flow.name || '',
          description: existingFlow.description || flow.description || '',
          category: existingFlow.category || 'vendas',
          tags: Array.isArray(existingFlow.tags) ? existingFlow.tags.join(', ') : '',
          version: existingFlow.version || '1.0.0',
          status: existingFlow.status || 'draft',
          isPublic: existingFlow.isPublic || false
        })
        
        // Carregar números WhatsApp selecionados anteriormente
        if (existingFlow.whatsappNumbers && Array.isArray(existingFlow.whatsappNumbers)) {
          console.log('Números WhatsApp salvos:', existingFlow.whatsappNumbers)
          setSelectedWhatsAppNumbers(existingFlow.whatsappNumbers)
        }
      } else {
        // Se não encontrar flow salvo, usar dados do flow atual
        setFormData({
          name: flow.name || '',
          description: flow.description || '',
          category: 'vendas',
          tags: '',
          version: '1.0.0',
          status: flow.status || 'draft',
          isPublic: false
        })
        setSelectedWhatsAppNumbers([])
      }
    }
  }, [isOpen, flow])
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Análise do flow
  const flowAnalysis = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    triggers: nodes.filter(n => n.type?.includes('trigger')).map(n => n.data?.label || n.type),
    actions: nodes.filter(n => n.type?.includes('msg') || n.type?.includes('api')).map(n => n.data?.label || n.type),
    hasAI: nodes.some(n => n.type?.includes('ai')),
    hasConditions: nodes.some(n => n.type?.includes('condition')),
    hasIntegrations: nodes.some(n => n.type?.includes('api') || n.type?.includes('webhook'))
  }
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do flow é obrigatório'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória'
    }
    
    if (formData.description.length < 10) {
      newErrors.description = 'Descrição deve ter pelo menos 10 caracteres'
    }
    
    if (nodes.length === 0) {
      newErrors.flow = 'O flow deve ter pelo menos um nó'
    }
    
    if (formData.status === 'published' && flowAnalysis.triggers.length === 0) {
      newErrors.flow = 'Flow publicado deve ter pelo menos um gatilho (trigger)'
    }
    
    if (formData.status === 'published' && selectedWhatsAppNumbers.length === 0) {
      newErrors.whatsapp = 'Flow publicado deve ter pelo menos um número WhatsApp selecionado'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSave = useCallback(async () => {
    if (!validateForm()) return
    
    setIsSaving(true)
    
    try {
      // Em modo edit, usar ID existente; em modo create, gerar novo
      const flowId = mode === 'edit' && flow?.id ? flow.id : `flow-${Date.now()}`
      
      // Buscar versão anterior se existir
      const existingFlows = JSON.parse(localStorage.getItem('saved_flows') || '[]')
      const existingFlow = existingFlows.find((f: any) => f.id === flowId)
      const currentVersion = existingFlow ? (existingFlow.metadata?.version || 1) + 1 : 1
      
      const flowData: SavedFlowData = {
        id: flowId,
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        whatsappNumbers: selectedWhatsAppNumbers,
        flow: {
          nodes: nodes.map(node => ({
            ...node,
            selected: false
          })),
          edges
        },
        metadata: {
          createdAt: existingFlow?.metadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodeCount: flowAnalysis.nodeCount,
          edgeCount: flowAnalysis.edgeCount,
          triggers: flowAnalysis.triggers,
          actions: flowAnalysis.actions,
          version: currentVersion,
          parentVersion: existingFlow ? `v${existingFlow.metadata?.version || 1}` : undefined
        }
      }
      
      // Salvar flow principal
      const savedFlows = existingFlows.filter((f: any) => f.id !== flowId)
      savedFlows.push(flowData)
      localStorage.setItem('saved_flows', JSON.stringify(savedFlows))
      
      // Salvar histórico de versões
      const flowHistory = JSON.parse(localStorage.getItem(`flow_history_${flowId}`) || '[]')
      if (existingFlow) {
        flowHistory.push({
          ...existingFlow,
          versionLabel: `v${existingFlow.metadata?.version || 1}`,
          archivedAt: new Date().toISOString()
        })
        localStorage.setItem(`flow_history_${flowId}`, JSON.stringify(flowHistory))
      }
      
      // Limpar rascunho se flow foi salvo como não-draft
      if (formData.status !== 'draft') {
        console.log('🧹 Limpando rascunho - flow salvo como', formData.status)
        clearLocalStorage()
        
        // Também forçar limpeza adicional para garantir
        localStorage.removeItem('pytake_flow_draft')
        console.log('🧹 Rascunho limpo completamente')
      }
      
      // Callback externo
      onSave?.(flowData)
      
      setSavedSuccess(true)
      
      // Fechar após 2 segundos
      setTimeout(() => {
        onClose()
        setSavedSuccess(false)
        setFormData({
          name: '',
          description: '',
          category: 'vendas',
          tags: '',
          version: '1.0.0',
          status: 'draft',
          isPublic: false
        })
        setSelectedWhatsAppNumbers([])
      }, 2000)
      
    } catch (error) {
      console.error('Erro ao salvar flow:', error)
      setErrors({ save: 'Erro ao salvar flow' })
    } finally {
      setIsSaving(false)
    }
  }, [formData, nodes, edges, flow, onSave, onClose, clearLocalStorage, validateForm, flowAnalysis, selectedWhatsAppNumbers])
  
  const selectedStatus = FLOW_STATUSES.find(s => s.value === formData.status)
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Salvar Flow
          </DialogTitle>
          <DialogDescription>
            Salve seu flow para reutilizar, publicar ou manter como rascunho
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Análise do Flow */}
          <Card className="p-4 bg-muted/30">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Análise do Flow
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold">{flowAnalysis.nodeCount}</div>
                <div className="text-muted-foreground">Nós</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{flowAnalysis.edgeCount}</div>
                <div className="text-muted-foreground">Conexões</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{flowAnalysis.triggers.length}</div>
                <div className="text-muted-foreground">Gatilhos</div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {flowAnalysis.hasAI && (
                <Badge variant="secondary">🤖 IA</Badge>
              )}
              {flowAnalysis.hasConditions && (
                <Badge variant="secondary">🔀 Condições</Badge>
              )}
              {flowAnalysis.hasIntegrations && (
                <Badge variant="secondary">🔌 Integrações</Badge>
              )}
            </div>
          </Card>
          
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">
                Nome do Flow *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Atendimento Automático WhatsApp"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">
                Descrição *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que este flow faz e quando deve ser usado..."
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.description}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">
                  Status do Flow
                </Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLOW_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <span>{status.icon}</span>
                          <div>
                            <div className="font-medium">{status.label}</div>
                            <div className="text-xs text-muted-foreground">{status.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStatus && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedStatus.description}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="category">
                  Categoria
                </Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLOW_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="tags">
                Tags (separadas por vírgula)
              </Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="atendimento, automação, vendas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tags ajudam na organização e busca de flows
              </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                {formData.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <Label htmlFor="isPublic" className="cursor-pointer">
                  <div className="font-medium">Flow Público</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Flows públicos podem ser utilizados por outros usuários
                  </p>
                </Label>
              </div>
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
            </div>

            {/* Seleção de Números WhatsApp */}
            {formData.status === 'published' && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Números WhatsApp para Ativação
                  </h4>
                </div>
                <WhatsAppNumberSelector
                  selectedNumbers={selectedWhatsAppNumbers}
                  onNumbersChange={setSelectedWhatsAppNumbers}
                  title="Selecionar Números"
                  description="Escolha em quais números este flow será ativado quando publicado"
                  allowMultiple={true}
                  showAddNumber={false}
                />
                {errors.whatsapp && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.whatsapp}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {errors.save && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errors.save}
            </div>
          )}
          
          {errors.flow && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errors.flow}
            </div>
          )}
          
          {savedSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              Flow salvo com sucesso!
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || savedSuccess}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Salvando...
              </>
            ) : savedSuccess ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salvo!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Flow
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}