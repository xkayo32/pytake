import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Download,
  Eye,
  Clock,
  Zap,
  FileText,
  Search,
  History,
  Globe,
  Lock
} from 'lucide-react'

interface FlowLoaderProps {
  onLoadFlow?: (flow: any) => void
  onPreviewFlow?: (flow: any) => void
}

export function FlowLoader({ onLoadFlow, onPreviewFlow }: FlowLoaderProps) {
  const [flows, setFlows] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Carregar flows do backend
  useEffect(() => {
    loadFlowsFromBackend()
  }, [])
  
  const loadFlowsFromBackend = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/v1/flows')
      if (response.ok) {
        const data = await response.json()
        const flows = data.flows || []
        console.log('🔄 FlowLoader - Carregando flows do backend:', flows.length)
        setFlows(flows)
      } else {
        console.error('Erro ao carregar flows do backend')
        setFlows([])
      }
    } catch (error) {
      console.error('Erro ao carregar flows:', error)
      setFlows([])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleLoadFlow = async (flow: any) => {
    setIsLoading(true)
    
    try {
      console.log('FlowLoader - Loading flow:', flow)
      console.log('Flow structure:', {
        hasNodes: !!flow.flow?.nodes,
        nodeCount: flow.flow?.nodes?.length || 0,
        edgeCount: flow.flow?.edges?.length || 0
      })
      
      // Simular delay de carregamento
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Carregar no builder
      onLoadFlow?.(flow)
      
    } catch (error) {
      console.error('Erro ao carregar flow:', error)
      alert('❌ Erro ao carregar flow')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePreviewFlow = (flow: any) => {
    onPreviewFlow?.(flow)
  }
  
  // Filtros
  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || flow.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })
  
  // Categorias disponíveis
  const categories = ['all', ...new Set(flows.map(f => f.category).filter(Boolean))]
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Meus Flows Salvos</h2>
        <p className="text-sm text-muted-foreground">
          {flows.length > 0 
            ? `${flows.length} flow(s) salvo(s)`
            : 'Nenhum flow salvo ainda'
          }
        </p>
      </div>
      
      {/* Filters */}
      {flows.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar flows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs"
              >
                {category === 'all' ? 'Todos' : category}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Flows List */}
      {filteredFlows.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? 'Nenhum flow encontrado' : 'Nenhum flow salvo'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm 
              ? 'Tente ajustar sua busca ou filtros'
              : 'Crie um flow e salve para reutilizar posteriormente.'
            }
          </p>
          {!searchTerm && (
            <div className="text-xs text-muted-foreground">
              💡 Dica: Use o botão "Salvar Flow" no editor
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFlows.map((flow, index) => (
            <Card key={flow.id || index} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm truncate">{flow.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {flow.description || 'Flow personalizado'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {flow.isPublic ? (
                          <Globe className="h-3 w-3 text-green-600" title="Público" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" title="Privado" />
                        )}
                        {flow.status === 'published' && (
                          <Badge variant="default" className="text-xs">🚀 Publicado</Badge>
                        )}
                        {flow.status === 'archived' && (
                          <Badge variant="secondary" className="text-xs">📦 Arquivado</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(flow.metadata?.updatedAt || flow.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {flow.metadata?.nodeCount || 0} nós
                      </div>
                      {flow.metadata?.version && (
                        <div className="flex items-center gap-1">
                          <History className="h-3 w-3" />
                          v{flow.metadata.version}
                        </div>
                      )}
                    </div>
                    
                    {/* Category and Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {flow.category && (
                        <Badge variant="outline" className="text-xs">
                          {flow.category}
                        </Badge>
                      )}
                      {flow.tags?.slice(0, 3).map((tag: string, tagIndex: number) => (
                        <Badge key={tagIndex} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {flow.tags?.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{flow.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewFlow(flow)}
                    className="h-8 px-2 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleLoadFlow(flow)}
                    disabled={isLoading}
                    className="h-8 px-2 text-xs"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        Usar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}