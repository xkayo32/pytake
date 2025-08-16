import { memo, FC, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { 
  MessageCircle,
  Brain,
  Globe,
  Database,
  HardDrive,
  GitBranch,
  Package,
  Code,
  Plug,
  Clock,
  Zap,
  Settings,
  Copy,
  Trash2
} from 'lucide-react'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'

// Import specialized nodes
import { NegotiationTemplateNode } from './negotiation-template-node'
import { NegotiationQueueNode } from './negotiation-queue-node'

const iconMap: Record<string, any> = {
  MessageCircle,
  Brain,
  Globe,
  Database,
  HardDrive,
  GitBranch,
  Package,
  Code,
  Plug,
  Clock,
  Zap
}

interface CustomNodeData {
  label: string
  icon?: string
  color?: string
  description?: string
  nodeType?: string
  config?: Record<string, any>
  isGroup?: boolean
  children?: string[]  
}

// Função para renderizar preview dos campos principais
const renderNodePreview = (data: CustomNodeData) => {
  if (!data.config || !data.nodeType) return null
  
  // Renderizar preview baseado no tipo de nó
  switch(data.nodeType) {
    case 'trigger_keyword':
      if (data.config.keywords) {
        const keywords = data.config.keywords.split('\n').filter((k: string) => k).slice(0, 2)
        return (
          <>
            {keywords.map((keyword: string, i: number) => (
              <div key={i} className="truncate">
                🔑 {keyword}
              </div>
            ))}
            {data.config.keywords.split('\n').filter((k: string) => k).length > 2 && (
              <div className="text-[9px]">+{data.config.keywords.split('\n').filter((k: string) => k).length - 2} mais...</div>
            )}
          </>
        )
      }
      break
      
    case 'trigger_webhook':
      if (data.config.webhookUrl) {
        return (
          <div className="truncate">
            🌐 {data.config.method || 'POST'}
          </div>
        )
      }
      break
      
    case 'trigger_schedule':
      if (data.config.time) {
        return (
          <>
            <div className="truncate">⏰ {data.config.time}</div>
            <div className="truncate">{data.config.frequency || 'daily'}</div>
          </>
        )
      }
      break
      
    case 'msg_text':
      if (data.config.message) {
        const preview = data.config.message.substring(0, 50)
        return (
          <div className="truncate">
            💬 {preview}{data.config.message.length > 50 ? '...' : ''}
          </div>
        )
      }
      break
      
    case 'msg_template':
      if (data.config.templateName) {
        return (
          <>
            <div className="truncate">📄 {data.config.templateName}</div>
            {data.config.language && (
              <div className="truncate">🌐 {data.config.language}</div>
            )}
          </>
        )
      }
      break
      
    case 'msg_negotiation_template':
      if (data.config.debtAmount) {
        return (
          <>
            <div className="truncate">💵 R$ {data.config.debtAmount}</div>
            {data.config.customerName && (
              <div className="truncate">👤 {data.config.customerName}</div>
            )}
          </>
        )
      }
      break
      
    case 'msg_image':
      if (data.config.imageUrl) {
        return (
          <>
            <div className="truncate">🖼️ Imagem</div>
            {data.config.caption && (
              <div className="truncate">📝 {data.config.caption.substring(0, 20)}...</div>
            )}
          </>
        )
      }
      break
      
    case 'ai_chatgpt':
    case 'ai_claude':
    case 'ai_gemini':
      if (data.config.prompt) {
        return (
          <div className="truncate">
            🤖 {data.config.prompt.substring(0, 30)}...
          </div>
        )
      }
      break
      
    case 'api_call':
    case 'api_webhook':
      if (data.config.url || data.config.webhookUrl) {
        const url = data.config.url || data.config.webhookUrl
        const method = data.config.method || 'GET'
        return (
          <>
            <div className="truncate">🌐 {method}</div>
            <div className="truncate text-[9px]">{new URL(url).hostname}</div>
          </>
        )
      }
      break
      
    case 'condition_if':
      if (data.config.variable && data.config.operator) {
        return (
          <div className="truncate">
            ❔ {data.config.variable} {data.config.operator} {data.config.value || '?'}
          </div>
        )
      }
      break
      
    case 'flow_delay':
      if (data.config.delay) {
        return (
          <div className="truncate">
            ⏱️ {data.config.delay}s
          </div>
        )
      }
      break
  }
  
  // Fallback genérico
  const configKeys = Object.keys(data.config).filter(k => k !== 'customName' && data.config[k])
  if (configKeys.length > 0) {
    return (
      <div className="truncate">
        ⚙️ {configKeys.length} config
      </div>
    )
  }
  
  return null
}

const BaseNode: FC<NodeProps<CustomNodeData>> = ({ data, selected, id, type }) => {
  const Icon = data.icon ? iconMap[data.icon] || Zap : Zap
  const color = data.color || '#6b7280'
  const [showSettings, setShowSettings] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  
  // Get store functions
  const selectNode = useFlowEditorStore((state) => state.selectNode)
  const setShowProperties = useFlowEditorStore((state) => state.setShowProperties)
  const deleteNode = useFlowEditorStore((state) => state.deleteNode)
  const updateNodeData = useFlowEditorStore((state) => state.updateNodeData)
  
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
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
    selectNode(id)
  }
  
  const handleDuplicate = () => {
    // Implementar duplicação do nó
    const nodes = useFlowEditorStore.getState().nodes
    const currentNode = nodes.find(n => n.id === id)
    if (currentNode) {
      const newNode = {
        ...currentNode,
        id: `node-${Date.now()}`,
        position: {
          x: currentNode.position.x + 50,
          y: currentNode.position.y + 50
        }
      }
      useFlowEditorStore.getState().setNodes([...nodes, newNode])
    }
    setShowContextMenu(false)
  }
  
  const handleDelete = () => {
    deleteNode(id)
    setShowContextMenu(false)
  }
  
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-sm
        min-w-[150px] transition-all cursor-pointer
        bg-white dark:bg-slate-900 group
        ${selected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700'}
        ${data.isGroup ? 'bg-accent/10' : ''}
      `}
      style={{
        borderColor: selected ? undefined : color + '30',
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
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
          <Icon 
            className="h-3.5 w-3.5" 
            style={{ color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">
            {data.config?.customName || data.label}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-0.5">
            {renderNodePreview(data) || (
              <div className="text-[9px] opacity-60">Não configurado</div>
            )}
          </div>
        </div>
        {(showSettings || selected) && (
          <button
            onClick={handleSettingsClick}
            className="absolute -top-2 -right-2 p-1 bg-primary text-white rounded-full shadow-md hover:bg-primary/90 transition-all"
            title="Configurações"
          >
            <Settings className="h-3 w-3" />
          </button>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
      
      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed z-[100] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[150px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onMouseLeave={() => setTimeout(() => setShowContextMenu(false), 100)}
        >
          <button
            onClick={handleSettingsClick}
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </button>
          <button
            onClick={handleDuplicate}
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplicar
          </button>
          <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

// Grupo Node - Special container node
export const GroupNode: FC<NodeProps<CustomNodeData>> = memo(({ data, selected }) => {
  const color = data.color || '#64748b'
  
  return (
    <div
      className={`
        p-4 rounded-xl border-2
        min-w-[200px] min-h-[150px] transition-all
        bg-slate-50/50 dark:bg-slate-900/50
        ${selected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-dashed border-slate-300 dark:border-slate-700'}
      `}
      style={{
        borderColor: selected ? undefined : color + '40',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
      />
      
      <div className="flex items-center gap-2 mb-2">
        <Package 
          className="h-4 w-4" 
          style={{ color }}
        />
        <div className="text-xs font-semibold" style={{ color }}>
          {data.label || 'Grupo'}
        </div>
      </div>
      
      <div className="text-[10px] text-slate-500 dark:text-slate-400">
        Arraste nodes aqui dentro
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
      />
    </div>
  )
})

// AI Node with special styling
export const AINode: FC<NodeProps<CustomNodeData>> = memo(({ data, selected }) => {
  const Icon = data.icon ? iconMap[data.icon] || Brain : Brain
  const color = data.color || '#8b5cf6'
  
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-sm
        min-w-[140px] transition-all
        bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800
        ${selected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700'}
      `}
      style={{
        borderColor: selected ? undefined : color + '30',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
      
      <div className="flex items-center gap-2">
        <div 
          className="p-1.5 rounded-md bg-white/50 backdrop-blur"
          style={{ backgroundColor: color + '30' }}
        >
          <Icon 
            className="h-4 w-4" 
            style={{ color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">
            {data.label}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            AI Powered
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
    </div>
  )
})

// Message Node with WhatsApp styling
export const MessageNode: FC<NodeProps<CustomNodeData>> = memo(({ data, selected }) => {
  const Icon = data.icon ? iconMap[data.icon] || MessageCircle : MessageCircle
  const color = '#25d366'
  
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-sm
        min-w-[120px] transition-all
        bg-green-50 dark:bg-green-950/20
        ${selected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-green-300 dark:border-green-800'}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
      
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-[#25d366]/20">
          <Icon className="h-3.5 w-3.5 text-[#25d366]" />
        </div>
        <div className="text-xs font-medium truncate">
          {data.label}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
    </div>
  )
})

// Logic Node with condition outputs
export const LogicNode: FC<NodeProps<CustomNodeData>> = memo(({ data, selected }) => {
  const Icon = GitBranch
  const color = '#a855f7'
  
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-sm
        min-w-[120px] transition-all
        bg-white dark:bg-slate-900
        ${selected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700'}
      `}
      style={{
        borderColor: selected ? undefined : color + '30'
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
      
      <div className="flex items-center gap-2">
        <div 
          className="p-1 rounded"
          style={{ backgroundColor: color + '20' }}
        >
          <Icon 
            className="h-3.5 w-3.5" 
            style={{ color }}
          />
        </div>
        <div className="text-xs font-medium truncate">
          {data.label}
        </div>
      </div>
      
      {/* Multiple outputs for conditions */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-2 !h-2 !border-2"
        style={{ 
          backgroundColor: '#22c55e', 
          borderColor: 'white',
          top: '30%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="!w-2 !h-2 !border-2"
        style={{ 
          backgroundColor: '#ef4444', 
          borderColor: 'white',
          top: '70%'
        }}
      />
    </div>
  )
})

export const nodeTypes = {
  default: BaseNode,
  group: GroupNode,
  ai: AINode,
  message: MessageNode,
  logic: LogicNode,
  trigger: BaseNode,
  action: BaseNode,
  condition: LogicNode,
  data: BaseNode,
  api: BaseNode,
  database: BaseNode,
  storage: BaseNode,
  transform: BaseNode,
  integration: BaseNode,
  // Specialized nodes
  msg_negotiation_template: NegotiationTemplateNode,
  api_negotiation_queue: NegotiationQueueNode,
  api_start_negotiation_flow: BaseNode,
}

GroupNode.displayName = 'GroupNode'
AINode.displayName = 'AINode'
MessageNode.displayName = 'MessageNode'
LogicNode.displayName = 'LogicNode'