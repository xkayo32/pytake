import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { 
  MessageCircle, 
  Clock, 
  Send, 
  User, 
  GitBranch, 
  Database, 
  Globe,
  Settings,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const iconMap = {
  MessageCircle,
  Clock,
  Send,
  User,
  GitBranch,
  Database,
  Globe,
  Settings
}

interface BaseNodeProps extends NodeProps {
  category: 'trigger' | 'action' | 'condition' | 'data'
}

export const BaseNode = memo(({ data, selected, category }: BaseNodeProps) => {
  const IconComponent = iconMap[data.icon as keyof typeof iconMap] || Settings
  
  const categoryColors = {
    trigger: {
      bg: 'bg-green-50 border-green-200',
      selectedBg: 'bg-green-100 border-green-400',
      icon: 'text-green-600',
      badge: 'bg-green-100 text-green-800'
    },
    action: {
      bg: 'bg-blue-50 border-blue-200',
      selectedBg: 'bg-blue-100 border-blue-400',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800'
    },
    condition: {
      bg: 'bg-purple-50 border-purple-200',
      selectedBg: 'bg-purple-100 border-purple-400',
      icon: 'text-purple-600',
      badge: 'bg-purple-100 text-purple-800'
    },
    data: {
      bg: 'bg-emerald-50 border-emerald-200',
      selectedBg: 'bg-emerald-100 border-emerald-400',
      icon: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-800'
    }
  }
  
  const colors = categoryColors[category]
  const hasConfig = data.config && Object.keys(data.config).length > 0
  
  // Determine handle positions based on category
  const showTopHandle = category !== 'trigger'
  const showBottomHandle = category !== 'action' || data.nodeType !== 'action-transfer-human'
  const showRightHandle = category === 'condition'
  
  return (
    <div
      className={`
        min-w-[200px] max-w-[300px] rounded-lg border-2 shadow-sm transition-all duration-200
        ${selected ? colors.selectedBg : colors.bg}
        ${selected ? 'shadow-lg scale-105' : 'hover:shadow-md'}
      `}
    >
      {/* Top Handle - Input */}
      {showTopHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 border-2 border-white bg-gray-400"
        />
      )}
      
      {/* Left Handle - Input for conditions */}
      {category === 'condition' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 border-2 border-white bg-gray-400"
        />
      )}
      
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded ${colors.icon}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {data.label}
            </h3>
          </div>
          <Badge variant="secondary" className={`text-xs ${colors.badge}`}>
            {category}
          </Badge>
        </div>
        
        {/* Description */}
        {data.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {data.description}
          </p>
        )}
        
        {/* Config Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              hasConfig ? 'bg-green-400' : 'bg-red-400'
            }`} />
            <span className="text-xs text-gray-600">
              {hasConfig ? 'Configurado' : 'Não configurado'}
            </span>
          </div>
        </div>
        
        {/* Config Preview */}
        {hasConfig && (
          <div className="mt-2 p-2 bg-white/50 rounded text-xs">
            {data.nodeType === 'trigger-keyword' && data.config.keywords && (
              <span className="text-gray-700">
                Palavras: {Array.isArray(data.config.keywords) 
                  ? data.config.keywords.join(', ') 
                  : data.config.keywords}
              </span>
            )}
            {data.nodeType === 'action-send-message' && data.config.message && (
              <span className="text-gray-700 line-clamp-2">
                "{data.config.message}"
              </span>
            )}
            {data.nodeType?.startsWith('condition-') && data.config.variable && (
              <span className="text-gray-700">
                {data.config.variable} {data.config.operator} {data.config.value}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom Handle - Output */}
      {showBottomHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 border-2 border-white bg-gray-600"
        />
      )}
      
      {/* Right Handle - Output for conditions (YES) */}
      {showRightHandle && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="yes"
            style={{ top: '40%' }}
            className="w-3 h-3 border-2 border-white bg-green-500"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="no"
            style={{ top: '60%' }}
            className="w-3 h-3 border-2 border-white bg-red-500"
          />
          
          {/* Labels for condition outputs */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs">
            <div className="text-green-600 mb-1">SIM</div>
            <div className="text-red-600">NÃO</div>
          </div>
        </>
      )}
    </div>
  )
})

BaseNode.displayName = 'BaseNode'

// Specific node components
export const TriggerNode = memo((props: NodeProps) => (
  <BaseNode {...props} category="trigger" />
))

export const ActionNode = memo((props: NodeProps) => (
  <BaseNode {...props} category="action" />
))

export const ConditionNode = memo((props: NodeProps) => (
  <BaseNode {...props} category="condition" />
))

export const DataNode = memo((props: NodeProps) => (
  <BaseNode {...props} category="data" />
))

TriggerNode.displayName = 'TriggerNode'
ActionNode.displayName = 'ActionNode'  
ConditionNode.displayName = 'ConditionNode'
DataNode.displayName = 'DataNode'