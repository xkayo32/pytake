'use client'

import { useState } from 'react'
import { Rocket, Play, CheckCircle, Clock, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

interface OnboardingWidgetProps {
  className?: string
}

export function OnboardingWidget({ className }: OnboardingWidgetProps) {
  const { state, isLoading, restartOnboarding } = useOnboarding()
  const [showOnboarding, setShowOnboarding] = useState(false)

  if (isLoading || !state) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-pulse text-muted-foreground" />
              <span>Carregando...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Don't show if onboarding is completed and was completed more than a week ago
  if (state.isCompleted && state.progress.completedAt) {
    const completedAt = new Date(state.progress.completedAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    if (completedAt < weekAgo) {
      return null
    }
  }

  const handleStartOnboarding = () => {
    setShowOnboarding(true)
  }

  const handleRestartOnboarding = () => {
    restartOnboarding()
    setShowOnboarding(true)
  }

  const handleCompleteOnboarding = () => {
    setShowOnboarding(false)
    // Refresh the page to update all components
    window.location.reload()
  }

  const getNextSteps = () => {
    if (!state.steps) return []
    
    return state.steps
      .filter(step => !step.isCompleted)
      .filter(step => !step.prerequisites || 
        step.prerequisites.every(prereq => 
          state.steps.find(s => s.id === prereq)?.isCompleted
        )
      )
      .slice(0, 3)
      .map(step => ({
        title: step.title,
        description: step.description,
        estimatedTime: step.estimatedTime,
        isOptional: step.isOptional
      }))
  }

  const nextSteps = getNextSteps()

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {state.isCompleted ? 'Configuração Concluída' : 'Configuração Inicial'}
              </CardTitle>
            </div>
            
            {state.isCompleted && (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completo
              </Badge>
            )}
          </div>
          
          {!state.isCompleted && (
            <CardDescription>
              Complete a configuração para aproveitar todos os recursos
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {!state.isCompleted ? (
            <>
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso da configuração</span>
                  <span className="text-muted-foreground">
                    {state.progress.completionPercentage}%
                  </span>
                </div>
                <Progress value={state.progress.completionPercentage} className="w-full" />
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {state.progress.completedSteps} de {state.progress.totalSteps} etapas
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{state.progress.estimatedTimeRemaining} min restantes
                  </span>
                </div>
              </div>

              {/* Next Steps */}
              {nextSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Próximas etapas:</h4>
                  <div className="space-y-1">
                    {nextSteps.map((step, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className={step.isOptional ? 'text-muted-foreground' : ''}>
                            {step.title}
                            {step.isOptional && ' (opcional)'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {step.estimatedTime}min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button className="w-full" onClick={handleStartOnboarding}>
                <Play className="mr-2 h-4 w-4" />
                {state.progress.completedSteps > 0 ? 'Continuar Configuração' : 'Começar Configuração'}
              </Button>
            </>
          ) : (
            <>
              {/* Completed State */}
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="font-medium text-green-600 mb-2">
                  Parabéns! Configuração concluída! 🎉
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Sua conta PyTake está pronta para automatizar o atendimento
                </p>
                
                <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground mb-4">
                  <div>
                    <p className="font-medium text-foreground">{state.progress.totalSteps}</p>
                    <p>Etapas</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {state.progress.startedAt && state.progress.completedAt ? 
                        Math.round((new Date(state.progress.completedAt).getTime() - new Date(state.progress.startedAt).getTime()) / (1000 * 60)) : 
                        '~15'
                      }
                    </p>
                    <p>Minutos</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">100%</p>
                    <p>Completo</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={handleRestartOnboarding}
                  >
                    Refazer
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.location.href = '/conversations'}
                  >
                    Ver Conversas
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Dica:</strong> {
                !state.isCompleted 
                  ? 'Complete todas as etapas para desbloquear todo o potencial da plataforma'
                  : 'Explore o dashboard e comece a atender seus primeiros clientes automaticamente'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Flow Modal */}
      {showOnboarding && (
        <OnboardingFlow 
          onClose={() => setShowOnboarding(false)}
          onComplete={handleCompleteOnboarding}
        />
      )}
    </>
  )
}