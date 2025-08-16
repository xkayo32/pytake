import { memo, FC, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard,
  Settings,
  ChevronDown,
  ChevronUp,
  DollarSign,
  User,
  Calendar,
  Target
} from 'lucide-react'

interface NegotiationTemplateNodeData {
  label: string
  customer_name?: string
  amount?: number
  due_date?: string
  discount_options?: Array<{
    percentage: number
    deadline: string
    enabled: boolean
  }>
  buttons?: Array<{
    id: string
    text: string
    action: string
    payload?: string
  }>
}

export const NegotiationTemplateNode: FC<NodeProps<NegotiationTemplateNodeData>> = memo(({ 
  data, 
  selected,
  id 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [nodeData, setNodeData] = useState(data)

  const updateNodeData = (updates: Partial<NegotiationTemplateNodeData>) => {
    setNodeData(prev => ({ ...prev, ...updates }))
    // TODO: Notify parent component of changes
  }

  const defaultButtons = [
    {
      id: 'negotiate',
      text: '💬 Negociar',
      action: 'start_flow',
      payload: 'negotiation_flow'
    },
    {
      id: 'pay_pix',
      text: '💳 Pagar PIX',
      action: 'pix_payment',
      payload: ''
    },
    {
      id: 'talk_agent',
      text: '🧑‍💼 Atendente',
      action: 'transfer',
      payload: 'billing_agent'
    }
  ]

  const buttons = nodeData.buttons || defaultButtons

  return (
    <div
      className={`
        min-w-[280px] transition-all duration-200
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${isExpanded ? 'min-w-[400px]' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-white"
        style={{ backgroundColor: '#f59e0b' }}
      />

      <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500 text-white rounded-lg">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                Template Negociação
              </h3>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Pendência: R$ {nodeData.amount?.toFixed(2) || '0,00'}
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
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-1 text-xs">
            <User className="h-3 w-3 text-orange-600" />
            <span className="text-orange-800 dark:text-orange-200">
              {nodeData.customer_name || 'Cliente'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3 text-orange-600" />
            <span className="text-orange-800 dark:text-orange-200">
              {nodeData.due_date || 'Vencida'}
            </span>
          </div>
        </div>

        {/* Buttons Preview */}
        <div className="space-y-2 mb-3">
          <Label className="text-xs text-orange-700 dark:text-orange-300">Botões do Template:</Label>
          <div className="grid grid-cols-1 gap-1">
            {buttons.slice(0, isExpanded ? buttons.length : 2).map((button, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-white/50 dark:bg-slate-800/50 rounded border text-xs"
              >
                <span className="font-medium">{button.text}</span>
                <Badge variant="outline" className="text-[10px] px-1">
                  {button.action}
                </Badge>
              </div>
            ))}
            {!isExpanded && buttons.length > 2 && (
              <div className="text-xs text-center text-orange-600 dark:text-orange-400">
                +{buttons.length - 2} mais botões
              </div>
            )}
          </div>
        </div>

        {/* Configuration Panel */}
        {isEditing && (
          <div className="space-y-3 p-3 bg-white/70 dark:bg-slate-800/70 rounded border-t border-orange-200 dark:border-orange-700">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`customer-${id}`} className="text-xs">Cliente</Label>
                <Input
                  id={`customer-${id}`}
                  value={nodeData.customer_name || ''}
                  onChange={(e) => updateNodeData({ customer_name: e.target.value })}
                  placeholder="Nome do cliente"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label htmlFor={`amount-${id}`} className="text-xs">Valor (R$)</Label>
                <Input
                  id={`amount-${id}`}
                  type="number"
                  step="0.01"
                  value={nodeData.amount || ''}
                  onChange={(e) => updateNodeData({ amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`due-date-${id}`} className="text-xs">Data Vencimento</Label>
              <Input
                id={`due-date-${id}`}
                type="date"
                value={nodeData.due_date || ''}
                onChange={(e) => updateNodeData({ due_date: e.target.value })}
                className="h-7 text-xs"
              />
            </div>

            {/* Configuração de Botões */}
            <div>
              <Label className="text-xs">Configuração dos Botões</Label>
              <div className="space-y-2">
                {buttons.map((button, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <div className="flex-1">
                      <Input
                        value={button.text}
                        onChange={(e) => {
                          const updatedButtons = [...buttons]
                          updatedButtons[index].text = e.target.value
                          updateNodeData({ buttons: updatedButtons })
                        }}
                        className="h-6 text-xs"
                        placeholder="Texto do botão"
                      />
                    </div>
                    <div className="w-24">
                      <select
                        value={button.action}
                        onChange={(e) => {
                          const updatedButtons = [...buttons]
                          updatedButtons[index].action = e.target.value
                          updateNodeData({ buttons: updatedButtons })
                        }}
                        className="w-full h-6 text-xs border rounded px-1"
                      >
                        <option value="start_flow">Iniciar Flow</option>
                        <option value="pix_payment">PIX</option>
                        <option value="transfer">Transferir</option>
                        <option value="url">Abrir URL</option>
                      </select>
                    </div>
                  </div>
                ))}
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

        {/* Outputs Handles */}
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 space-y-2">
          <Handle
            type="source"
            position={Position.Right}
            id="negotiate"
            className="!w-2 !h-2 !border-2 !border-white !relative !transform-none"
            style={{ 
              backgroundColor: '#22c55e',
              top: '-20px'
            }}
          />
          <div className="text-[8px] text-right text-orange-600 dark:text-orange-400 absolute -left-16 -top-5">
            Negociar
          </div>

          <Handle
            type="source"
            position={Position.Right}
            id="pay_pix"
            className="!w-2 !h-2 !border-2 !border-white !relative !transform-none"
            style={{ 
              backgroundColor: '#3b82f6',
              top: '0px'
            }}
          />
          <div className="text-[8px] text-right text-orange-600 dark:text-orange-400 absolute -left-12 top-1">
            PIX
          </div>

          <Handle
            type="source"
            position={Position.Right}
            id="talk_agent"
            className="!w-2 !h-2 !border-2 !border-white !relative !transform-none"
            style={{ 
              backgroundColor: '#f59e0b',
              top: '20px'
            }}
          />
          <div className="text-[8px] text-right text-orange-600 dark:text-orange-400 absolute -left-16 top-5">
            Atendente
          </div>
        </div>
      </Card>

      {/* Stats */}
      {isExpanded && (
        <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-xs">
          <div className="flex justify-between items-center">
            <span className="text-orange-700 dark:text-orange-300">
              Template: payment_negotiation
            </span>
            <Badge variant="secondary" className="text-[10px]">
              WhatsApp
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
})

NegotiationTemplateNode.displayName = 'NegotiationTemplateNode'