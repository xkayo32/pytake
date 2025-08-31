'use client'

import { useState } from 'react'
import { CheckCircle, Rocket, ExternalLink, Play, Book, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CompleteStepProps {
  onComplete: (data?: any) => void
  onFinish?: () => void
}

export function CompleteStep({ onComplete, onFinish }: CompleteStepProps) {
  const [isFinishing, setIsFinishing] = useState(false)

  const nextSteps = [
    {
      title: 'Envie sua primeira mensagem',
      description: 'Teste o envio de mensagens para verificar a integração',
      icon: Play,
      action: 'send-message',
      href: '/messages/send'
    },
    {
      title: 'Convidar equipe',
      description: 'Adicione membros da sua equipe para colaborar',
      icon: Users,
      action: 'invite-team',
      href: '/settings/team'
    },
    {
      title: 'Explorar automações',
      description: 'Descubra fluxos prontos para seu segmento',
      icon: Zap,
      action: 'explore-automations',
      href: '/flows'
    },
    {
      title: 'Central de ajuda',
      description: 'Tutoriais e documentação completa',
      icon: Book,
      action: 'help-center',
      href: '/help'
    }
  ]

  const achievements = [
    'Conta configurada com sucesso',
    'WhatsApp Business conectado',
    'Perfil da empresa completo',
    'Pronto para automatizar atendimento'
  ]

  const handleFinish = async () => {
    setIsFinishing(true)
    
    // Complete this step
    await onComplete({
      completedAt: new Date().toISOString(),
      achievements: achievements
    })

    // Simulate a brief delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    onFinish?.()
  }

  const handleQuickAction = (action: string, href: string) => {
    onComplete({
      completedAt: new Date().toISOString(),
      achievements: achievements,
      selectedAction: action
    })
    
    // Navigate to the specific page
    window.location.href = href
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center animate-pulse">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-center mb-2">
            🎉 Parabéns! Configuração Concluída
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            Sua conta PyTake está pronta! Você completou todas as etapas essenciais 
            para começar a automatizar seu atendimento no WhatsApp Business.
          </p>
        </div>
      </div>

      {/* Achievements */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            O que você conquistou
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <span className="text-sm font-medium">{achievement}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-center">
          Próximos Passos Recomendados
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          {nextSteps.map((step) => {
            const Icon = step.icon
            
            return (
              <Card
                key={step.action}
                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 group"
                onClick={() => handleQuickAction(step.action, step.href)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                          {step.title}
                        </CardTitle>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Stats/Summary */}
      <div className="bg-muted rounded-lg p-6">
        <h4 className="font-semibold mb-3 text-center">
          Estatísticas da Configuração
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">7</p>
            <p className="text-xs text-muted-foreground">Etapas Concluídas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">~15</p>
            <p className="text-xs text-muted-foreground">Minutos Investidos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">∞</p>
            <p className="text-xs text-muted-foreground">Possibilidades</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
          <p className="text-sm text-blue-800">
            💡 <strong>Dica:</strong> Explore o dashboard para ver todas as funcionalidades disponíveis. 
            A equipe de suporte está sempre disponível para ajudar!
          </p>
        </div>
      </div>

      {/* Final Action */}
      <div className="text-center pt-4">
        <Button 
          size="lg" 
          onClick={handleFinish}
          disabled={isFinishing}
          className="min-w-[200px]"
        >
          {isFinishing ? (
            'Finalizando...'
          ) : (
            <>
              <Rocket className="mr-2 h-5 w-5" />
              Ir para o Dashboard
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground mt-3">
          Você pode refazer esta configuração a qualquer momento nas configurações
        </p>
      </div>
    </div>
  )
}