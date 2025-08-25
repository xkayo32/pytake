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
  status: 'draft' | 'active' | 'inactive' | 'archived'
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

// Statuses removidos - agora controlados por botões separados

export function FlowSaveModal({ isOpen, onClose, onSave, mode = 'create' }: FlowSaveModalProps) {
  const { nodes, edges, flow } = useFlowEditorStore()
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  
  const [formData, setFormData] = useState({
    name: flow?.name || '',
    description: flow?.description || '',
    category: 'vendas',
    tags: '',
    version: '1.0.0',
    isPublic: false
  })
  
  const [selectedWhatsAppNumbers, setSelectedWhatsAppNumbers] = useState<string[]>([])
  
  // Debug para monitorar mudanças no estado
  useEffect(() => {
    console.log('📱 selectedWhatsAppNumbers mudou para:', selectedWhatsAppNumbers)
  }, [selectedWhatsAppNumbers])
  
  // Carregar dados do flow existente quando o modal abrir
  useEffect(() => {
    if (isOpen && flow) {
      // Usar dados do flow atual do backend
      setFormData({
        name: flow.name || '',
        description: flow.description || '',
        category: 'vendas',
        tags: '',
        version: '1.0.0',
        isPublic: false
      })
      // Preservar os números WhatsApp já selecionados
      // NÃO resetar para array vazio!
      if (flow.whatsappNumbers && Array.isArray(flow.whatsappNumbers)) {
        setSelectedWhatsAppNumbers(flow.whatsappNumbers)
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
    
    // Validações removidas - status agora é controlado separadamente
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSave = useCallback(async () => {
    if (!validateForm()) return
    
    setIsSaving(true)
    
    try {
      // Salvar flow via backend API
      const flowData = {
        name: formData.name,
        description: formData.description,
        status: 'draft',
        flow: {
          nodes: nodes.map(node => ({
            ...node,
            selected: false
          })),
          edges
        }
      }
      
      let response
      if (mode === 'edit' && flow?.id) {
        // Atualizar flow existente
        response = await fetch(`/api/v1/flows/${flow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(flowData)
        })
      } else {
        // Criar novo flow
        response = await fetch('/api/v1/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(flowData)
        })
      }
      
      if (!response.ok) {
        throw new Error(`Erro ao salvar flow: ${response.status}`)
      }
      
      const savedFlow = await response.json()
      
      setSaveMessage(`Flow "${savedFlow.name}" salvo!`)
      
      // Atualizar o store com os dados salvos
      const { setFlow } = useFlowEditorStore.getState()
      setFlow(savedFlow)
      
      // Callback externo
      onSave?.(savedFlow)
      
      setSavedSuccess(true)
      
      // Fechar após 2 segundos
      setTimeout(() => {
        onClose()
        setSavedSuccess(false)
        setSaveMessage('')
        // Não limpar o formulário completamente após salvar
        // Manter os dados do flow para evitar perda de estado
      }, 2000)
      
    } catch (error) {
      console.error('Erro ao salvar flow:', error)
      setErrors({ save: 'Erro ao salvar flow' })
    } finally {
      setIsSaving(false)
    }
  }, [formData, nodes, edges, flow, onSave, onClose, validateForm, flowAnalysis, selectedWhatsAppNumbers])
  
  // Status removido - sempre será draft
  
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

            {/* Seção de WhatsApp removida - agora controlada pelos botões no builder */}
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
              {saveMessage || 'Flow salvo com sucesso!'}
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