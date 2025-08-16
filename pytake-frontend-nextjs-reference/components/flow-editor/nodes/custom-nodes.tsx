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
  isGroup?: boolean
  children?: string[]
}

const BaseNode: FC<NodeProps<CustomNodeData>> = ({ data, selected, id }) => {
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
    // TODO: Implement node duplication
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
        min-w-[120px] transition-all cursor-pointer
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
            {data.label}
          </div>
          {data.description && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {data.description}
            </div>
          )}
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
          className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[150px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onMouseLeave={() => setShowContextMenu(false)}
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