import { memo, FC, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Users,
  Settings,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  Building,
  Zap
} from 'lucide-react'

interface NegotiationQueueNodeData {
  label: string
  queue_type?: 'automatic' | 'manual' | 'priority'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  department?: string
  auto_assign?: boolean
  criteria?: {
    amount_threshold?: number
    overdue_days?: number
    customer_score?: number
  }
}

export const NegotiationQueueNode: FC<NodeProps<NegotiationQueueNodeData>> = memo(({ 
  data, 
  selected,
  id 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [nodeData, setNodeData] = useState(data)

  const updateNodeData = (updates: Partial<NegotiationQueueNodeData>) => {
    setNodeData(prev => ({ ...prev, ...updates }))
    // TODO: Notify parent component of changes
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔥'
      case 'high': return '⚡'
      case 'medium': return '⭐'
      case 'low': return '📝'
      default: return '📋'
    }
  }

  const getQueueTypeLabel = (type: string) => {
    switch (type) {
      case 'automatic': return 'Automática'
      case 'manual': return 'Manual'
      case 'priority': return 'Prioritária'
      default: return 'Padrão'
    }
  }

  return (
    <div
      className={`
        min-w-[260px] transition-all duration-200
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isExpanded ? 'min-w-[380px]' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-white"
        style={{ backgroundColor: '#f59e0b' }}
      />

      <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500 text-white rounded-lg">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Fila de Negociação
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {getQueueTypeLabel(nodeData.queue_type || 'automatic')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 dark:text-amber-300">Prioridade:</span>
              <Badge 
                variant="secondary" 
                className={`text-white text-xs px-2 ${getPriorityColor(nodeData.priority || 'medium')}`}
              >
                {getPriorityIcon(nodeData.priority || 'medium')} {nodeData.priority || 'medium'}
              </Badge>
            </div>
            
            {nodeData.auto_assign && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Auto
              </Badge>
            )}
          </div>

          {nodeData.department && (
            <div className="flex items-center gap-2 text-xs">
              <Building className="h-3 w-3 text-amber-600" />
              <span className="text-amber-800 dark:text-amber-200">
                {nodeData.department}
              </span>
            </div>
          )}
        </div>

        {/* Criteria Preview */}
        {isExpanded && nodeData.criteria && (
          <div className="mb-3 p-2 bg-white/50 dark:bg-slate-800/50 rounded border">
            <Label className="text-xs text-amber-700 dark:text-amber-300 mb-2 block">
              Critérios de Entrada:
            </Label>
            <div className="space-y-1 text-xs">
              {nodeData.criteria.amount_threshold && (
                <div className="flex justify-between">
                  <span>Valor mínimo:</span>
                  <span className="font-medium">R$ {nodeData.criteria.amount_threshold.toFixed(2)}</span>
                </div>
              )}
              {nodeData.criteria.overdue_days && (
                <div className="flex justify-between">
                  <span>Dias em atraso:</span>
                  <span className="font-medium">{nodeData.criteria.overdue_days}+ dias</span>
                </div>
              )}
              {nodeData.criteria.customer_score && (
                <div className="flex justify-between">
                  <span>Score mínimo:</span>
                  <span className="font-medium">{nodeData.criteria.customer_score}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration Panel */}
        {isEditing && (
          <div className="space-y-3 p-3 bg-white/70 dark:bg-slate-800/70 rounded border-t border-amber-200 dark:border-amber-700">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`queue-type-${id}`} className="text-xs">Tipo da Fila</Label>
                <select
                  id={`queue-type-${id}`}
                  value={nodeData.queue_type || 'automatic'}
                  onChange={(e) => updateNodeData({ queue_type: e.target.value as any })}
                  className="w-full h-7 text-xs border rounded px-2"
                >
                  <option value="automatic">Automática</option>
                  <option value="manual">Manual</option>
                  <option value="priority">Prioritária</option>
                </select>
              </div>
              <div>
                <Label htmlFor={`priority-${id}`} className="text-xs">Prioridade</Label>
                <select
                  id={`priority-${id}`}
                  value={nodeData.priority || 'medium'}
                  onChange={(e) => updateNodeData({ priority: e.target.value as any })}
                  className="w-full h-7 text-xs border rounded px-2"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor={`department-${id}`} className="text-xs">Departamento</Label>
              <Input
                id={`department-${id}`}
                value={nodeData.department || ''}
                onChange={(e) => updateNodeData({ department: e.target.value })}
                placeholder="Ex: Cobrança, Financeiro"
                className="h-7 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`auto-assign-${id}`}
                checked={nodeData.auto_assign || false}
                onChange={(e) => updateNodeData({ auto_assign: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor={`auto-assign-${id}`} className="text-xs">
                Atribuição automática de agente
              </Label>
            </div>

            {/* Critérios de Entrada */}
            <div>
              <Label className="text-xs mb-2 block">Critérios de Entrada</Label>
              <div className="space-y-2">
                <div>
                  <Label htmlFor={`amount-threshold-${id}`} className="text-xs">
                    Valor mínimo (R$)
                  </Label>
                  <Input
                    id={`amount-threshold-${id}`}
                    type="number"
                    step="0.01"
                    value={nodeData.criteria?.amount_threshold || ''}
                    onChange={(e) => updateNodeData({ 
                      criteria: { 
                        ...nodeData.criteria, 
                        amount_threshold: parseFloat(e.target.value) || 0 
                      } 
                    })}
                    placeholder="0,00"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor={`overdue-days-${id}`} className="text-xs">
                    Dias em atraso (mínimo)
                  </Label>
                  <Input
                    id={`overdue-days-${id}`}
                    type="number"
                    value={nodeData.criteria?.overdue_days || ''}
                    onChange={(e) => updateNodeData({ 
                      criteria: { 
                        ...nodeData.criteria, 
                        overdue_days: parseInt(e.target.value) || 0 
                      } 
                    })}
                    placeholder="0"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor={`customer-score-${id}`} className="text-xs">
                    Score mínimo do cliente
                  </Label>
                  <Input
                    id={`customer-score-${id}`}
                    type="number"
                    min="0"
                    max="1000"
                    value={nodeData.criteria?.customer_score || ''}
                    onChange={(e) => updateNodeData({ 
                      criteria: { 
                        ...nodeData.criteria, 
                        customer_score: parseInt(e.target.value) || 0 
                      } 
                    })}
                    placeholder="0-1000"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setIsEditing(false)}
              className="w-full h-7 text-xs"
            >
              Salvar Configurações
            </Button>
          </div>
        )}

        {/* Flow Info */}
        {isExpanded && (
          <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="text-amber-700 dark:text-amber-300">
                API Endpoint: /api/v1/negotiation/queue
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-600 dark:text-amber-400">
                Método: POST
              </span>
              <Badge variant="secondary" className="text-[10px]">
                Async
              </Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="queued"
        className="!w-2 !h-2 !border-2 !border-white !top-1/2 !transform !-translate-y-1/2"
        style={{ backgroundColor: '#22c55e' }}
      />
      <div className="absolute -right-14 top-1/2 -translate-y-1/2 text-[8px] text-amber-600 dark:text-amber-400">
        Enfileirado
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="error"
        className="!w-2 !h-2 !border-2 !border-white !left-1/2 !transform !-translate-x-1/2"
        style={{ backgroundColor: '#ef4444' }}
      />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-[8px] text-amber-600 dark:text-amber-400">
        Erro
      </div>
    </div>
  )
})

NegotiationQueueNode.displayName = 'NegotiationQueueNode'