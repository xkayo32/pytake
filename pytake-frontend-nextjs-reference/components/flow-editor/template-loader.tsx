import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  Eye,
  Play,
  Clock,
  Star,
  CreditCard,
  Users,
  Settings,
  CheckCircle
} from 'lucide-react'
import { 
  negotiationTemplateFlow, 
  createNegotiationTemplateInstance,
  validateNegotiationTemplate,
  negotiationTemplateMetadata
} from '@/lib/flow-templates/negotiation-template-flow'

interface TemplateLoaderProps {
  onLoadTemplate?: (template: any) => void
  onPreviewTemplate?: (template: any) => void
}

export function TemplateLoader({ onLoadTemplate, onPreviewTemplate }: TemplateLoaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleLoadTemplate = async () => {
    setIsLoading(true)
    
    try {
      // Criar instância do template com configurações padrão
      const templateInstance = createNegotiationTemplateInstance({
        id: `negotiation_${Date.now()}`,
        name: `Negociação ${new Date().toLocaleDateString()}`
      })
      
      // Validar template
      const validation = validateNegotiationTemplate(templateInstance)
      
      if (!validation.valid) {
        alert(`❌ Erro no template: ${validation.errors.join(', ')}`)
        return
      }
      
      // Simular delay de carregamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Carregar no builder
      onLoadTemplate?.(templateInstance)
      
      // Notificar sucesso
      alert('✅ Template carregado com sucesso!')
      
    } catch (error) {
      console.error('Erro ao carregar template:', error)
      alert('❌ Erro ao carregar template')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePreviewTemplate = () => {
    onPreviewTemplate?.(negotiationTemplateFlow)
  }
  
  const handleTestTemplate = async () => {
    try {
      // Simular teste do template
      const response = await fetch('/api/flows/test-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: negotiationTemplateMetadata.id,
          contact_id: '5511999999999'
        })
      })
      
      if (response.ok) {
        alert('✅ Template testado com sucesso!')
      } else {
        alert('❌ Erro ao testar template')
      }
    } catch (error) {
      alert('❌ Erro de conexão')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-2">Templates de Flow</h2>
        <p className="text-muted-foreground">
          Carregue templates pré-configurados para acelerar a criação de flows
        </p>
      </div>

      {/* Template Card */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{negotiationTemplateMetadata.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {negotiationTemplateMetadata.description}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{negotiationTemplateMetadata.category}</Badge>
                  <Badge variant="outline">v{negotiationTemplateMetadata.version}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {negotiationTemplateMetadata.estimated_setup_time}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">4.8</span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Template WhatsApp</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Fila Automática</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Múltiplas Opções</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>PIX Integrado</span>
            </div>
          </div>

          {/* Template Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">8</div>
              <div className="text-xs text-muted-foreground">Nodes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">10</div>
              <div className="text-xs text-muted-foreground">Conexões</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-xs text-muted-foreground">Outputs</div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h4 className="font-medium">O que este template inclui:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Template de Negociação:</strong> Mensagem personalizável com dados do cliente e valor da dívida</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Botões Inteligentes:</strong> 3 opções (Negociar, PIX, Atendente) com ações configuráveis</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Fila de Negociação:</strong> Sistema automático de enfileiramento com critérios personalizáveis</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Verificação de Elegibilidade:</strong> API call para validar se cliente pode negociar</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Roteamento Inteligente:</strong> Direciona para flow de negociação, PIX ou atendente baseado na escolha</span>
              </li>
            </ul>
          </div>

          {/* Configuration Preview */}
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
              Configurações Incluídas:
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-orange-800 dark:text-orange-200">Critérios de Elegibilidade:</div>
                <ul className="text-orange-600 dark:text-orange-400 space-y-1 mt-1">
                  <li>• Valor mínimo: R$ 50,00</li>
                  <li>• Max atraso: 180 dias</li>
                  <li>• Score mín: 300</li>
                </ul>
              </div>
              <div>
                <div className="font-medium text-orange-800 dark:text-orange-200">Opções de Negociação:</div>
                <ul className="text-orange-600 dark:text-orange-400 space-y-1 mt-1">
                  <li>• Descontos: 10%, 20%, 30%</li>
                  <li>• Parcelamento: 2x, 3x, 6x</li>
                  <li>• Desconto máx: 40%</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button 
              onClick={handleLoadTemplate}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Carregando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Carregar Template
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handlePreviewTemplate}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleTestTemplate}
            >
              <Play className="h-4 w-4 mr-2" />
              Testar
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Ações Rápidas</h4>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Simular criação de template customizado
              const customTemplate = createNegotiationTemplateInstance({
                id: `custom_${Date.now()}`,
                name: 'Negociação Personalizada',
                config: {
                  eligibility_criteria: {
                    min_amount: 100.00,
                    max_overdue_days: 90
                  }
                }
              })
              onLoadTemplate?.(customTemplate)
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Template Customizado
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Abrir modal de configurações
              alert('🔧 Modal de configurações será implementado')
            }}
          >
            <Users className="h-4 w-4 mr-2" />
            Configurar Fila
          </Button>
        </div>
      </Card>
    </div>
  )
}