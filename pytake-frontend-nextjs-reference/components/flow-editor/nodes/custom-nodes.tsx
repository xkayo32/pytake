import { memo, FC } from 'react'
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
  Zap
} from 'lucide-react'

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

const BaseNode: FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const Icon = data.icon ? iconMap[data.icon] || Zap : Zap
  const color = data.color || '#6b7280'
  
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 bg-background shadow-sm
        min-w-[120px] transition-all
        ${selected ? 'border-primary shadow-lg' : 'border-border'}
        ${data.isGroup ? 'bg-accent/10' : ''}
      `}
      style={{
        borderColor: selected ? undefined : color + '40',
        backgroundColor: data.isGroup ? color + '08' : undefined
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
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
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">
            {data.label}
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
      />
    </div>
  )
}

// Grupo Node - Special container node
export const GroupNode: FC<NodeProps<CustomNodeData>> = memo(({ data, selected }) => {
  const color = data.color || '#64748b'
  
  return (
    <div
      className={`
        p-4 rounded-xl border-2 bg-accent/5
        min-w-[200px] min-h-[150px] transition-all
        ${selected ? 'border-primary shadow-lg' : 'border-dashed border-border'}
      `}
      style={{
        borderColor: selected ? undefined : color + '60',
        backgroundColor: color + '05'
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
      
      <div className="text-[10px] text-muted-foreground">
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
        px-3 py-2 rounded-lg border-2 bg-gradient-to-r shadow-sm
        min-w-[140px] transition-all
        ${selected ? 'border-primary shadow-lg' : 'border-border'}
      `}
      style={{
        borderColor: selected ? undefined : color + '40',
        backgroundImage: `linear-gradient(135deg, ${color}10 0%, ${color}20 100%)`
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
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
          <div className="text-[10px] text-muted-foreground">
            AI Powered
          </div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
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
        ${selected ? 'border-primary shadow-lg' : 'border-[#25d366]/40'}
      `}
      style={{
        backgroundColor: '#25d36610'
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
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
        className="!w-2 !h-2 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
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
        px-3 py-2 rounded-lg border-2 bg-background shadow-sm
        min-w-[120px] transition-all
        ${selected ? 'border-primary shadow-lg' : 'border-border'}
      `}
      style={{
        borderColor: selected ? undefined : color + '40'
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2"
        style={{ backgroundColor: color, borderColor: 'white' }}
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
  integration: BaseNode
}

GroupNode.displayName = 'GroupNode'
AINode.displayName = 'AINode'
MessageNode.displayName = 'MessageNode'
LogicNode.displayName = 'LogicNode'