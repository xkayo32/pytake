import { memo, FC, useEffect } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { MousePointer, Settings } from 'lucide-react'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'
import { getTemplateButtons } from '@/lib/data/whatsapp-templates'

interface TemplateButtonNodeData {
  label: string
  icon?: string
  color?: string
  description?: string
  nodeType?: string
  config?: {
    templateName?: string
    selectedButtons?: string[]
    captureAll?: boolean
    customName?: string
  }
}

export const TemplateButtonNode: FC<NodeProps<TemplateButtonNodeData>> = memo(({ 
  data, 
  selected, 
  id 
}) => {
  const color = data.color || '#22c55e'
  const selectNode = useFlowEditorStore((state) => state.selectNode)
  const setShowProperties = useFlowEditorStore((state) => state.setShowProperties)
  
  // Obter botões do template selecionado
  const templateButtons = data.config?.templateName 
    ? getTemplateButtons(data.config.templateName)
    : []
  
  // Determinar quais botões criar handles para
  const activeButtons = data.config?.captureAll 
    ? templateButtons
    : templateButtons.filter(btn => 
        data.config?.selectedButtons?.includes(btn.id || btn.text)
      )
  
  const handleClick = () => {
    selectNode(id)
    setShowProperties(true)
  }
  
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-sm
        min-w-[180px] transition-all cursor-pointer
        bg-white dark:bg-slate-900
        ${selected ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700'}
      `}
      style={{
        borderColor: selected ? undefined : color + '30',
      }}
      onClick={handleClick}
    >
      {/* Handle de entrada (trigger) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
        style={{ backgroundColor: color }}
      />
      
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div 
            className="p-1 rounded"
            style={{ backgroundColor: color + '20' }}
          >
            <MousePointer 
              className="h-3.5 w-3.5" 
              style={{ color }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">
              {data.config?.customName || data.label}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {data.config?.templateName ? (
                <>📋 {data.config.templateName}</>
              ) : (
                'Não configurado'
              )}
            </div>
          </div>
        </div>
        
        {/* Lista de botões como saídas */}
        {activeButtons.length > 0 && (
          <div className="space-y-1 pl-6 text-[10px]">
            {activeButtons.map((button, index) => (
              <div key={button.id || index} className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 truncate flex-1">
                  {button.type === 'QUICK_REPLY' && '⚡'}
                  {button.type === 'URL' && '🔗'}
                  {button.type === 'PHONE_NUMBER' && '📞'}
                  {' '}{button.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Handles de saída dinâmicos - um para cada botão */}
      {activeButtons.length > 0 ? (
        activeButtons.map((button, index) => {
          const total = activeButtons.length
          const spacing = 100 / (total + 1)
          const topPosition = spacing * (index + 1)
          
          return (
            <Handle
              key={button.id || index}
              type="source"
              position={Position.Right}
              id={button.id || button.text}
              className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
              style={{ 
                backgroundColor: color,
                top: `${topPosition}%`
              }}
              title={button.text}
            />
          )
        })
      ) : (
        // Handle padrão quando não há template selecionado
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2 !h-2 !border-2 !border-white dark:!border-slate-900"
          style={{ backgroundColor: color }}
        />
      )}
      
      {/* Indicador de configuração */}
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            selectNode(id)
            setShowProperties(true)
          }}
          className="absolute -top-2 -right-2 p-1 bg-primary text-white rounded-full shadow-md hover:bg-primary/90 transition-all"
          title="Configurações"
        >
          <Settings className="h-3 w-3" />
        </button>
      )}
    </div>
  )
})

TemplateButtonNode.displayName = 'TemplateButtonNode'