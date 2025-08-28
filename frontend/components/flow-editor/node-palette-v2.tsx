import { useState } from 'react'
import { 
  Search,
  ChevronDown,
  ChevronRight,
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
  Image,
  Mic,
  Video,
  FileText,
  MapPin,
  MousePointer,
  List,
  Sparkles,
  Stars,
  Cpu,
  Palette,
  Share2,
  Cloud,
  Send,
  Plus,
  Edit,
  Trash,
  Layers,
  Zap,
  Upload,
  Download,
  CloudRain,
  Server,
  ToggleLeft,
  RefreshCw,
  Shuffle,
  GitMerge,
  Navigation,
  StopCircle,
  Table,
  FileCode,
  Filter,
  Hash,
  Mail,
  MessageSquare,
  Calendar,
  Table2,
  CreditCard,
  QrCode,
  UserCheck
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FLOW_NODES, CATEGORY_LABELS, NODE_CATEGORIES } from '@/lib/types/flow-nodes'

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
  Image,
  Mic,
  Video,
  FileText,
  MapPin,
  MousePointer,
  List,
  Sparkles,
  Stars,
  Cpu,
  Palette,
  Share2,
  Cloud,
  Send,
  Plus,
  Edit,
  Trash,
  Layers,
  Zap,
  Upload,
  Download,
  CloudRain,
  Server,
  ToggleLeft,
  RefreshCw,
  Shuffle,
  GitMerge,
  Navigation,
  StopCircle,
  Table,
  Table2,
  FileCode,
  Filter,
  Hash,
  Mail,
  MessageSquare,
  Calendar,
  CreditCard,
  QrCode,
  UserCheck
}

const categoryIcons: Record<string, any> = {
  trigger: Clock,
  message: MessageCircle,
  ai: Brain,
  api: Globe,
  database: Database,
  storage: HardDrive,
  logic: GitBranch,
  flow: Package,
  transform: Code,
  integration: Plug,
  action: UserCheck
}

interface NodePaletteProps {
  onNodeDragStart: (nodeType: any) => void
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const onDragStart = (event: React.DragEvent, node: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
    event.dataTransfer.effectAllowed = 'move'
    onNodeDragStart(node)
  }

  const filteredNodes = FLOW_NODES.filter(node =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const nodesByCategory = filteredNodes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = []
    }
    acc[node.category].push(node)
    return acc
  }, {} as Record<string, typeof FLOW_NODES>)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(NODE_CATEGORIES).map(([key, category]) => {
          const nodes = nodesByCategory[category] || []
          if (nodes.length === 0) return null
          
          const CategoryIcon = categoryIcons[category]
          const isExpanded = expandedCategories.has(category)
          
          return (
            <div key={category} className="border-b">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2 w-full p-2 text-left hover:bg-accent/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium flex-1">
                  {CATEGORY_LABELS[category]}
                </span>
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {nodes.length}
                </Badge>
              </button>

              {/* Nodes */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-1 p-2">
                  {nodes.map((node) => {
                    const Icon = iconMap[node.icon] || Zap
                    
                    return (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, node)}
                        className="flex items-center gap-1.5 p-1.5 rounded border hover:scale-105 cursor-move transition-all
                                 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800
                                 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      >
                        <Icon 
                          className="h-3 w-3 flex-shrink-0" 
                          style={{ color: node.color }}
                        />
                        <span className="text-[10px] font-medium truncate">
                          {node.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}