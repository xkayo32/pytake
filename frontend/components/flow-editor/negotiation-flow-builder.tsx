import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageCircle, 
  List, 
  Calculator,
  CreditCard,
  Users,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  Download
} from 'lucide-react'

interface NegotiationFlowBuilderProps {
  onFlowGenerated?: (flow: any) => void
}

export function NegotiationFlowBuilder({ onFlowGenerated }: NegotiationFlowBuilderProps) {
  const [config, setConfig] = useState({
    customerName: 'João Silva',
    originalAmount: '150.00',
    discounts: {
      discount30: { enabled: true, percentage: 30, deadline: 'hoje' },
      discount20: { enabled: true, percentage: 20, deadline: '3 dias' },
      discount10: { enabled: true, percentage: 10, deadline: '7 dias' }
    },
    installments: {
      installment2x: { enabled: true, parcels: 2, interest: false },
      installment3x: { enabled: true, parcels: 3, interest: true }
    },
    customOptions: {
      allowCustomProposal: true,
      allowAgentTransfer: true,
      allowPixPayment: true
    },
    flowSettings: {
      timeoutMinutes: 60,
      maxIterations: 15
    }
  })

  const [generatedFlow, setGeneratedFlow] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const keys = path.split('.')
      const updated: any = { ...prev }
      let current: any = updated
      // Navegar criando objetos intermediários se necessário
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        if (current[k] === undefined) current[k] = {}
        current = current[k]
      }
      current[keys[keys.length - 1]] = value
      return updated as typeof prev
    })
  }

  const calculateDiscountAmount = (percentage: number) => {
    const original = parseFloat(config.originalAmount)
    return (original * (100 - percentage) / 100).toFixed(2)
  }

  const calculateInstallmentAmount = (parcels: number, withInterest: boolean = false) => {
    const original = parseFloat(config.originalAmount)
    const interest = withInterest ? 1.05 : 1 // 5% de juros se aplicável
    return (original * interest / parcels).toFixed(2)
  }

  const generateFlow = async () => {
    setIsGenerating(true)
    
    try {
      // Simular geração do flow baseado na configuração
      const flow = {
        id: 'negotiation_flow_custom',
        name: `Negociação - ${config.customerName}`,
        variables: {
          amount: config.originalAmount,
          customer_name: config.customerName,
          discount_30_amount: calculateDiscountAmount(30),
          discount_20_amount: calculateDiscountAmount(20),
          discount_10_amount: calculateDiscountAmount(10),
          installment_2x_amount: calculateInstallmentAmount(2),
          installment_3x_amount: calculateInstallmentAmount(3, true)
        },
        nodes: generateFlowNodes(),
        settings: {
          timeout_minutes: config.flowSettings.timeoutMinutes,
          max_iterations: config.flowSettings.maxIterations
        }
      }
      
      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setGeneratedFlow(flow)
      onFlowGenerated?.(flow)
      
    } catch (error) {
      console.error('Erro ao gerar flow:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateFlowNodes = () => {
    const nodes = []
    
    // Node de boas-vindas
    nodes.push({
      id: 'welcome',
      type: 'message',
      config: {
        content: `🤝 Olá ${config.customerName}! Vamos negociar sua pendência de R$ ${config.originalAmount}.`
      }
    })
    
    // Node de opções
    const options = []
    
    if (config.discounts.discount30.enabled) {
      options.push({
        id: 'discount_30',
        title: `${config.discounts.discount30.percentage}% de desconto`,
        description: `Pagamento ${config.discounts.discount30.deadline} - R$ ${calculateDiscountAmount(30)}`
      })
    }
    
    if (config.discounts.discount20.enabled) {
      options.push({
        id: 'discount_20', 
        title: `${config.discounts.discount20.percentage}% de desconto`,
        description: `Pagamento até ${config.discounts.discount20.deadline} - R$ ${calculateDiscountAmount(20)}`
      })
    }
    
    if (config.installments.installment2x.enabled) {
      options.push({
        id: 'installment_2x',
        title: `${config.installments.installment2x.parcels}x sem juros`,
        description: `${config.installments.installment2x.parcels} parcelas de R$ ${calculateInstallmentAmount(2)}`
      })
    }
    
    if (config.customOptions.allowCustomProposal) {
      options.push({
        id: 'custom_proposal',
        title: 'Fazer proposta',
        description: 'Sugira um valor ou condição'
      })
    }
    
    nodes.push({
      id: 'show_options',
      type: 'interactive_list',
      config: {
        content: {
          header: 'Opções de Negociação',
          body: 'Escolha a melhor opção para você:',
          sections: [{ title: 'Opções Disponíveis', rows: options }]
        }
      }
    })
    
    return nodes
  }

  const exportFlow = () => {
    if (!generatedFlow) return
    
    const dataStr = JSON.stringify(generatedFlow, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `negotiation_flow_${config.customerName.replace(/\s+/g, '_').toLowerCase()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const testFlow = async () => {
    if (!generatedFlow) return
    
    try {
      const response = await fetch('/api/flows/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: '5511999999999',
          flow: generatedFlow
        })
      })
      
      if (response.ok) {
        alert('✅ Flow testado com sucesso!')
      } else {
        alert('❌ Erro ao testar flow')
      }
    } catch (error) {
      alert('❌ Erro de conexão')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Builder de Flow de Negociação</h2>
          <p className="text-muted-foreground">Configure automaticamente um flow personalizado para negociação de dívidas</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Calculator className="h-4 w-4 mr-1" />
          Auto Builder
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurações */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Básicos */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Dados do Cliente
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nome do Cliente</Label>
                <Input
                  id="customerName"
                  value={config.customerName}
                  onChange={(e) => updateConfig('customerName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="originalAmount">Valor Original (R$)</Label>
                <Input
                  id="originalAmount"
                  type="number"
                  step="0.01"
                  value={config.originalAmount}
                  onChange={(e) => updateConfig('originalAmount', e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Opções de Desconto */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Descontos à Vista
            </h3>
            
            <div className="space-y-4">
              {Object.entries(config.discounts).map(([key, discount]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={discount.enabled}
                      onChange={(e) => updateConfig(`discounts.${key}.enabled`, e.target.checked)}
                      className="rounded"
                    />
                    <div>
                      <p className="font-medium">{discount.percentage}% de desconto</p>
                      <p className="text-sm text-muted-foreground">
                        Prazo: {discount.deadline} | Valor: R$ {calculateDiscountAmount(discount.percentage)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{discount.percentage}% OFF</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Opções de Parcelamento */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Parcelamento
            </h3>
            
            <div className="space-y-4">
              {Object.entries(config.installments).map(([key, installment]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={installment.enabled}
                      onChange={(e) => updateConfig(`installments.${key}.enabled`, e.target.checked)}
                      className="rounded"
                    />
                    <div>
                      <p className="font-medium">{installment.parcels}x {installment.interest ? 'com juros' : 'sem juros'}</p>
                      <p className="text-sm text-muted-foreground">
                        {installment.parcels} parcelas de R$ {calculateInstallmentAmount(installment.parcels, installment.interest)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={installment.interest ? "destructive" : "secondary"}>
                    {installment.parcels}x
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Configurações Avançadas */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Configurações do Flow</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Permitir proposta customizada</Label>
                <input
                  type="checkbox"
                  checked={config.customOptions.allowCustomProposal}
                  onChange={(e) => updateConfig('customOptions.allowCustomProposal', e.target.checked)}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Permitir transferência para atendente</Label>
                <input
                  type="checkbox"
                  checked={config.customOptions.allowAgentTransfer}
                  onChange={(e) => updateConfig('customOptions.allowAgentTransfer', e.target.checked)}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Opção de pagamento PIX direto</Label>
                <input
                  type="checkbox"
                  checked={config.customOptions.allowPixPayment}
                  onChange={(e) => updateConfig('customOptions.allowPixPayment', e.target.checked)}
                  className="rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (minutos)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={config.flowSettings.timeoutMinutes}
                    onChange={(e) => updateConfig('flowSettings.timeoutMinutes', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="maxIterations">Max Iterações</Label>
                  <Input
                    id="maxIterations"
                    type="number"
                    value={config.flowSettings.maxIterations}
                    onChange={(e) => updateConfig('flowSettings.maxIterations', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview e Actions */}
        <div className="space-y-6">
          {/* Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Ações</h3>
            
            <div className="space-y-3">
              <Button 
                onClick={generateFlow}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Gerando Flow...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Gerar Flow
                  </>
                )}
              </Button>
              
              {generatedFlow && (
                <>
                  <Button 
                    onClick={testFlow}
                    variant="outline"
                    className="w-full"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Testar Flow
                  </Button>
                  
                  <Button 
                    onClick={exportFlow}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar JSON
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Preview */}
          {generatedFlow && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Preview do Flow
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <Badge variant="outline" className="mb-2">Flow ID</Badge>
                  <p className="font-mono">{generatedFlow.id}</p>
                </div>
                
                <div>
                  <Badge variant="outline" className="mb-2">Nodes</Badge>
                  <p>{generatedFlow.nodes?.length || 0} nodes criados</p>
                </div>
                
                <div>
                  <Badge variant="outline" className="mb-2">Variáveis</Badge>
                  <div className="text-xs space-y-1">
                    {Object.entries(generatedFlow.variables || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-mono">{key}:</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}