import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  Eye,
  Clock,
  Package,
  FileText,
  Zap
} from 'lucide-react'

interface TemplateLoaderProps {
  onLoadTemplate?: (template: any) => void
  onPreviewTemplate?: (template: any) => void
}

export function TemplateLoader({ onLoadTemplate, onPreviewTemplate }: TemplateLoaderProps) {
  const [templates, setTemplates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Carregar templates do localStorage
  useEffect(() => {
    loadTemplatesFromStorage()
  }, [])
  
  const loadTemplatesFromStorage = () => {
    try {
      const savedTemplates = JSON.parse(localStorage.getItem('flow_templates') || '[]')
      setTemplates(savedTemplates)
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      setTemplates([])
    }
  }
  
  const handleLoadTemplate = async (template: any) => {
    setIsLoading(true)
    
    try {
      // Simular delay de carregamento
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Carregar no builder
      onLoadTemplate?.(template)
      
    } catch (error) {
      console.error('Erro ao carregar template:', error)
      alert('❌ Erro ao carregar template')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePreviewTemplate = (template: any) => {
    onPreviewTemplate?.(template)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Meus Templates</h2>
        <p className="text-sm text-muted-foreground">
          {templates.length > 0 
            ? `${templates.length} template(s) salvo(s)`
            : 'Nenhum template salvo ainda'
          }
        </p>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie um flow e salve como template para reutilizar posteriormente.
          </p>
          <div className="text-xs text-muted-foreground">
            💡 Dica: Use o botão "Salvar Template" no editor de flows
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                    <Zap className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-1 truncate">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {template.description || 'Template personalizado'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {template.category || 'Geral'}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(template.metadata.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {template.metadata.nodeCount} nós
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewTemplate(template)}
                    className="h-8 px-2 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleLoadTemplate(template)}
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
              
              {/* Template Tags */}
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                  {template.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                    <Badge key={tagIndex} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}