import { useState } from 'react'
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
  Save, 
  Package, 
  Tag, 
  FileText,
  Globe,
  Users,
  Zap,
  AlertCircle,
  Check
} from 'lucide-react'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'

interface TemplateSaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (templateData: TemplateData) => void
}

interface TemplateData {
  name: string
  description: string
  category: string
  tags: string[]
  version: string
  author: string
  isPublic: boolean
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
  }
}

const TEMPLATE_CATEGORIES = [
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

export function TemplateSaveModal({ isOpen, onClose, onSave }: TemplateSaveModalProps) {
  const { nodes, edges } = useFlowEditorStore()
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'vendas',
    tags: '',
    version: '1.0.0',
    author: 'PyTake User',
    isPublic: false
  })
  
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
      newErrors.name = 'Nome do template é obrigatório'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória'
    }
    
    if (formData.description.length < 20) {
      newErrors.description = 'Descrição deve ter pelo menos 20 caracteres'
    }
    
    if (nodes.length === 0) {
      newErrors.flow = 'O flow deve ter pelo menos um nó'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSave = async () => {
    if (!validateForm()) return
    
    setIsSaving(true)
    
    try {
      const templateData: TemplateData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        flow: {
          nodes: nodes.map(node => ({
            ...node,
            selected: false
          })),
          edges
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodeCount: flowAnalysis.nodeCount,
          edgeCount: flowAnalysis.edgeCount,
          triggers: flowAnalysis.triggers,
          actions: flowAnalysis.actions
        }
      }
      
      // Salvar no localStorage
      const savedTemplates = JSON.parse(localStorage.getItem('flow_templates') || '[]')
      savedTemplates.push(templateData)
      localStorage.setItem('flow_templates', JSON.stringify(savedTemplates))
      
      // Callback externo
      onSave?.(templateData)
      
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
          author: 'PyTake User',
          isPublic: false
        })
      }, 2000)
      
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      setErrors({ save: 'Erro ao salvar template' })
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Salvar Flow
          </DialogTitle>
          <DialogDescription>
            Salve seu flow para reutilização e compartilhamento
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
                <Badge variant="secondary">🤖 Inteligência Artificial</Badge>
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
                Nome do Template *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Flow de Vendas com WhatsApp"
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
                placeholder="Descreva o que este template faz e quando deve ser usado..."
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
              <div className="grid grid-cols-3 gap-2 mt-2">
                {TEMPLATE_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`
                      p-2 rounded-lg border text-sm flex items-center gap-2
                      transition-all hover:shadow-sm
                      ${formData.category === cat.value 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
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
                placeholder="vendas, whatsapp, automação"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tags ajudam outros usuários a encontrar seu template
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="version">
                  Versão
                </Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0.0"
                />
              </div>
              
              <div>
                <Label htmlFor="author">
                  Autor
                </Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Seu nome"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isPublic" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Tornar template público</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Templates públicos podem ser usados por outros usuários da plataforma
                </p>
              </Label>
            </div>
          </div>
          
          {errors.save && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errors.save}
            </div>
          )}
          
          {savedSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              Template salvo com sucesso!
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