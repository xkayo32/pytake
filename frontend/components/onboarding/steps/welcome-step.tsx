'use client'

import { useState } from 'react'
import { Rocket, CheckCircle, Zap, Bot, Users, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WelcomeStepProps {
  onComplete: (data?: any) => void
  onNext: () => void
}

export function WelcomeStep({ onComplete, onNext }: WelcomeStepProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])

  const features = [
    {
      id: 'automation',
      title: 'Automação WhatsApp',
      description: 'Fluxos visuais para atendimento automatizado',
      icon: Zap,
      benefit: 'Economize até 80% do tempo de atendimento'
    },
    {
      id: 'ai',
      title: 'Assistente de IA',
      description: 'Respostas inteligentes e análise de sentimentos',
      icon: Bot,
      benefit: 'Aumente a satisfação dos clientes'
    },
    {
      id: 'team',
      title: 'Gestão de Equipe',
      description: 'Distribua conversas e monitore performance',
      icon: Users,
      benefit: 'Melhore a produtividade da equipe'
    },
    {
      id: 'analytics',
      title: 'Relatórios Avançados',
      description: 'Insights detalhados sobre seu atendimento',
      icon: BarChart3,
      benefit: 'Tome decisões baseadas em dados'
    }
  ]

  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    )
  }

  const handleComplete = () => {
    onComplete({ 
      selectedFeatures,
      welcomeViewed: true,
      timestamp: new Date().toISOString()
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center">
            <Rocket className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-center mb-2">
            Bem-vindo ao PyTake! 🚀
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            Vamos configurar sua plataforma de automação do WhatsApp Business em alguns minutos. 
            Primeiro, conheça os recursos que irão transformar seu atendimento:
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-center">
          Recursos Disponíveis na Plataforma
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {features.map((feature) => {
            const Icon = feature.icon
            const isSelected = selectedFeatures.includes(feature.id)
            
            return (
              <Card
                key={feature.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected 
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleFeatureToggle(feature.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{feature.title}</CardTitle>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="mb-2">
                    {feature.description}
                  </CardDescription>
                  <Badge variant="secondary" className="text-xs">
                    {feature.benefit}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-800">
            💡 <strong>Dica:</strong> Clique nos recursos que mais interessam para personalizar sua experiência
            {selectedFeatures.length > 0 && ` (${selectedFeatures.length} selecionado${selectedFeatures.length > 1 ? 's' : ''})`}
          </p>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-muted rounded-lg p-6">
        <h4 className="font-semibold mb-3">O que vamos configurar:</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span>Perfil da sua empresa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span>Conexão com WhatsApp Business</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary/60 rounded-full" />
            <span>Assistente de IA (opcional)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary/60 rounded-full" />
            <span>Primeiro fluxo automático (opcional)</span>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            ⏱️ <strong>Tempo estimado:</strong> 15-20 minutos • Você pode pausar e continuar depois
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={handleComplete}>
          Vamos Começar!
          <Rocket className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}