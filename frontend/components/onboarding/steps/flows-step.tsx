'use client'

import { useState } from 'react'
import { Workflow, Play, MessageCircle, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FlowTemplate {
  id: string
  name: string
  description: string
  category: 'customer_service' | 'sales' | 'marketing' | 'general'
  estimatedTime: number
  popularity: number
  steps: number
  preview: string[]
}

interface FlowsStepProps {
  data?: any[]
  onComplete: (data: any[]) => void
  onNext: () => void
  onPrevious: () => void
}

export function FlowsStep({ data, onComplete, onNext, onPrevious }: FlowsStepProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(data?.map(f => f.id) || [])

  const flowTemplates: FlowTemplate[] = [
    {
      id: 'welcome',
      name: 'Boas-vindas',
      description: 'Receba novos clientes com uma mensagem personalizada',
      category: 'customer_service',
      estimatedTime: 2,
      popularity: 95,
      steps: 3,
      preview: [
        '👋 Olá! Bem-vindo à [Empresa]',
        'Como posso ajudá-lo hoje?',
        '[Opções: Vendas | Suporte | Informações]'
      ]
    },
    {
      id: 'faq',
      name: 'Perguntas Frequentes',
      description: 'Responda automaticamente às dúvidas mais comuns',
      category: 'customer_service',
      estimatedTime: 5,
      popularity: 88,
      steps: 5,
      preview: [
        'Escolha sua dúvida:',
        '1️⃣ Horário de funcionamento',
        '2️⃣ Formas de pagamento',
        '3️⃣ Política de devolução'
      ]
    },
    {
      id: 'lead_capture',
      name: 'Captura de Leads',
      description: 'Colete informações de contato de potenciais clientes',
      category: 'sales',
      estimatedTime: 4,
      popularity: 82,
      steps: 4,
      preview: [
        'Interessado em nossos produtos?',
        'Por favor, informe seu nome:',
        'Qual seu email?',
        'Entraremos em contato em breve!'
      ]
    },
    {
      id: 'appointment',
      name: 'Agendamento',
      description: 'Permita que clientes agendem serviços automaticamente',
      category: 'general',
      estimatedTime: 8,
      popularity: 76,
      steps: 6,
      preview: [
        'Vamos agendar seu horário',
        'Escolha o serviço desejado:',
        'Selecione uma data disponível:',
        'Confirme: [Data] às [Hora]'
      ]
    },
    {
      id: 'order_status',
      name: 'Status do Pedido',
      description: 'Clientes podem consultar o status de seus pedidos',
      category: 'customer_service',
      estimatedTime: 3,
      popularity: 71,
      steps: 3,
      preview: [
        'Informe o número do seu pedido:',
        'Consultando status...',
        '📦 Pedido #123 - Em transporte'
      ]
    },
    {
      id: 'feedback',
      name: 'Coleta de Feedback',
      description: 'Colete avaliações e sugestões dos clientes',
      category: 'marketing',
      estimatedTime: 3,
      popularity: 68,
      steps: 4,
      preview: [
        'Como foi sua experiência?',
        '⭐ De 1 a 5 estrelas',
        'Deixe um comentário (opcional):',
        'Obrigado pelo feedback! 😊'
      ]
    }
  ]

  const categories = {
    customer_service: { label: 'Atendimento', color: 'bg-blue-100 text-blue-800' },
    sales: { label: 'Vendas', color: 'bg-green-100 text-green-800' },
    marketing: { label: 'Marketing', color: 'bg-purple-100 text-purple-800' },
    general: { label: 'Geral', color: 'bg-gray-100 text-gray-800' }
  }

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  const handleComplete = () => {
    const selectedFlows = flowTemplates.filter(template => 
      selectedTemplates.includes(template.id)
    )
    onComplete(selectedFlows)
    onNext()
  }

  const handleSkip = () => {
    onComplete([])
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Workflow className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="text-muted-foreground">
          Escolha fluxos prontos para começar a automatizar seu atendimento
        </p>
        <Badge variant="secondary" className="mt-2">
          Etapa Opcional
        </Badge>
      </div>

      {/* Templates Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Modelos Disponíveis</h3>
          <span className="text-sm text-muted-foreground">
            {selectedTemplates.length} selecionado{selectedTemplates.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid gap-4">
          {flowTemplates.map((template) => {
            const isSelected = selectedTemplates.includes(template.id)
            const category = categories[template.category]
            
            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'hover:border-primary/50 hover:shadow-md'
                }`}
                onClick={() => handleTemplateToggle(template.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge className={category.color}>
                          {category.label}
                        </Badge>
                        {template.popularity > 80 && (
                          <Badge variant="secondary" className="text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <div className="text-right text-sm text-muted-foreground ml-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {template.estimatedTime}min
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Workflow className="h-3 w-3" />
                        {template.steps} passos
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      Prévia do fluxo:
                    </h5>
                    <div className="bg-muted rounded-lg p-3 text-xs space-y-1">
                      {template.preview.map((message, index) => (
                        <div key={index} className="text-muted-foreground">
                          {message}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="mt-3 p-2 bg-primary/10 border border-primary/20 rounded text-center">
                      <span className="text-sm text-primary font-medium">
                        ✓ Será criado na sua conta
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      {selectedTemplates.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">
            🚀 Fluxos selecionados ({selectedTemplates.length})
          </h4>
          <div className="grid md:grid-cols-2 gap-2">
            {selectedTemplates.map(id => {
              const template = flowTemplates.find(t => t.id === id)
              return (
                <div key={id} className="text-sm text-green-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full" />
                  {template?.name}
                </div>
              )
            })}
          </div>
          <p className="text-sm text-green-700 mt-2">
            Tempo total de configuração: ~{selectedTemplates.reduce((total, id) => {
              const template = flowTemplates.find(t => t.id === id)
              return total + (template?.estimatedTime || 0)
            }, 0)} minutos
          </p>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">
          💡 Sobre os Fluxos Automatizados
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Os fluxos serão criados automaticamente na sua conta</li>
          <li>• Você poderá editá-los e personalizá-los depois</li>
          <li>• Cada fluxo pode ser ativado/desativado individualmente</li>
          <li>• Todos os modelos são baseados em melhores práticas</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Pular Fluxos
          </Button>
          <Button onClick={handleComplete}>
            {selectedTemplates.length > 0 
              ? `Criar ${selectedTemplates.length} Fluxo${selectedTemplates.length > 1 ? 's' : ''}`
              : 'Continuar'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}