import { memo, FC, useState, useEffect } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { UserCheck, Users, Settings, AlertCircle, CheckCircle } from 'lucide-react'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'

interface TransferToQueueData {
  label: string
  nodeType: string
  config?: {
    queueId?: string
    queueName?: string
    priority?: number // 0=normal, 1=high, 2=urgent
    customName?: string
    message?: string
    transferReason?: string
    department?: string
    skillRequired?: string[]
    waitTimeoutMinutes?: number
    fallbackAction?: 'abandon' | 'callback' | 'voicemail'
    metadata?: Record<string, any>
  }
}

export const TransferToQueueNode: FC<NodeProps<TransferToQueueData>> = memo(({ data, selected, id }) => {
  const [showSettings, setShowSettings] = useState(false)
  const [availableQueues, setAvailableQueues] = useState<any[]>([])
  const [isLoadingQueues, setIsLoadingQueues] = useState(false)
  
  const selectNode = useFlowEditorStore((state) => state.selectNode)
  const setShowProperties = useFlowEditorStore((state) => state.setShowProperties)
  
  // Carregar filas disponíveis
  useEffect(() => {
    const loadQueues = async () => {
      setIsLoadingQueues(true)
      try {
        const response = await fetch('/api/v1/queues')
        if (response.ok) {
          const queues = await response.json()
          setAvailableQueues(Array.isArray(queues) ? queues : [])
        }
      } catch (error) {
        console.error('Error loading queues:', error)
        setAvailableQueues([])
      } finally {
        setIsLoadingQueues(false)
      }
    }
    
    loadQueues()
  }, [])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectNode(id)
    setShowProperties(true)
  }
  
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectNode(id)
    setShowProperties(true)
  }

  // Renderizar preview das configurações
  const renderPreview = () => {
    if (!data.config) {
      return (
        <div className="text-[9px] text-muted-foreground italic">
          Configurar transferência
        </div>
      )
    }

    const { queueName, priority, department, waitTimeoutMinutes } = data.config
    const priorityLabels = { 0: 'Normal', 1: 'Alta', 2: 'Urgente' }
    
    return (
      <>
        {queueName ? (
          <div className="truncate text-[10px] max-w-full">
            🏢 {queueName}
          </div>
        ) : (
          <div className="text-[9px] text-orange-600">
            ⚠️ Selecionar fila
          </div>
        )}
        
        {department && (
          <div className="text-[9px] truncate">
            📋 {department}
          </div>
        )}
        
        {priority !== undefined && priority > 0 && (
          <div className="text-[9px] truncate">
            🔥 {priorityLabels[priority as keyof typeof priorityLabels] || 'Normal'}
          </div>
        )}
        
        {waitTimeoutMinutes && (
          <div className="text-[9px] truncate">
            ⏱️ Timeout: {waitTimeoutMinutes}min
          </div>
        )}
      </>
    )
  }

  const isConfigured = data.config?.queueId && data.config?.queueName
  const color = '#3b82f6'
  
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-sm
        min-w-[150px] max-w-[200px] transition-all cursor-pointer
        bg-white dark:bg-slate-900 group
        ${selected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700'}
        ${!isConfigured ? 'border-orange-300 bg-orange-50/50' : ''}
      `}
      style={{
        borderColor: selected ? undefined : isConfigured ? color + '30' : '#fb923c30',
      }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowSettings(true)}
      onMouseLeave={() => setShowSettings(false)}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
      
      <div className="flex items-center gap-2 relative">
        <div 
          className="p-1 rounded"
          style={{ backgroundColor: color + '20' }}
        >
          <UserCheck 
            className="h-3.5 w-3.5" 
            style={{ color }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">
            {data.config?.customName || data.label || 'Transfer to Queue'}
          </div>
          
          <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-0.5">
            {renderPreview()}
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="absolute -top-1 -right-1">
          {isConfigured ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-orange-600" />
          )}
        </div>
        
        {(showSettings || selected) && (
          <button
            onClick={handleSettingsClick}
            className="absolute -top-2 -right-2 p-1 bg-primary text-white rounded-full shadow-md hover:bg-primary/90 transition-all"
            title="Configurar transferência para fila"
          >
            <Settings className="h-3 w-3" />
          </button>
        )}
      </div>
      
      {/* Output handle - No continue after transfer */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
    </div>
  )
})

TransferToQueueNode.displayName = 'TransferToQueueNode'