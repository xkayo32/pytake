import { useState } from 'react'
import { 
  MessageCircle, 
  Clock, 
  Send, 
  User, 
  GitBranch, 
  Database, 
  Globe,
  Search,
  Zap,
  Settings2,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NODE_TYPES, NodeType } from '@/lib/types/flow'

const iconMap = {
  MessageCircle,
  Clock,
  Send,
  User,
  GitBranch,
  Database,
  Globe,
  Zap,
  Settings2
}

interface NodePaletteProps {
  onNodeDragStart: (nodeType: NodeType) => void
}

const categoryLabels = {
  trigger: 'Gatilhos',
  action: 'Ações',
  condition: 'Condições',
  data: 'Dados'
}

const categoryColors = {
  trigger: 'bg-green-100 text-green-800',
  action: 'bg-blue-100 text-blue-800', 
  condition: 'bg-purple-100 text-purple-800',
  data: 'bg-emerald-100 text-emerald-800'
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['trigger', 'action', 'condition', 'data'])
  )

  const handleDragStart = (nodeType: NodeType) => {
    onNodeDragStart(nodeType)
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredNodes = NODE_TYPES.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = []
    }
    acc[node.category].push(node)
    return acc
  }, {} as Record<string, NodeType[]>)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b bg-background/50">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Componentes</h2>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="h-6 px-2 text-xs"
          >
            Todos
          </Button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
              className="h-6 px-2 text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(nodesByCategory).map(([category, nodes]) => (
          <div key={category} className="mb-6">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center gap-2 w-full p-2 text-left rounded-lg hover:bg-accent transition-colors mb-2"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </span>
              <Badge variant="secondary" className="ml-auto">
                {nodes.length}
              </Badge>
            </button>

            {/* Category Nodes */}
            {expandedCategories.has(category) && (
              <div className="space-y-2">
                {nodes.map((nodeType) => {
                  const IconComponent = iconMap[nodeType.icon as keyof typeof iconMap] || Settings2
                  
                  return (
                    <div
                      key={nodeType.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType))
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className="group cursor-grab active:cursor-grabbing p-3 border border-border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all bg-background"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div 
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: `${nodeType.color}20`, color: nodeType.color }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">
                              {nodeType.name}
                            </h3>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${categoryColors[nodeType.category]}`}
                            >
                              {nodeType.category}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {nodeType.description}
                          </p>
                          
                          {/* Connection info */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>↑ {nodeType.inputs} entrada{nodeType.inputs !== 1 ? 's' : ''}</span>
                            <span>↓ {nodeType.outputs} saída{nodeType.outputs !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Drag indicator */}
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        </div>
                        <span>Arraste para o canvas</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
        
        {filteredNodes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum componente encontrado</p>
            <p className="text-sm">Tente ajustar os filtros de busca</p>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="p-4 border-t bg-muted/50">
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Dica:</strong> Arraste os componentes para o canvas para criar seu flow.</p>
          <p>Conecte os componentes clicando e arrastando entre os pontos de conexão.</p>
        </div>
      </div>
    </div>
  )
}