'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Clock, CheckCircle, Users, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import { useToast } from '@/components/ui/use-toast'

// Step Components
import { WelcomeStep } from './steps/welcome-step'
import { ProfileStep } from './steps/profile-step'
import { WhatsAppStep } from './steps/whatsapp-step'
import { AIStep } from './steps/ai-step'
import { FlowsStep } from './steps/flows-step'
import { TeamStep } from './steps/team-step'
import { CompleteStep } from './steps/complete-step'

interface OnboardingFlowProps {
  onClose?: () => void
  onComplete?: () => void
}

export function OnboardingFlow({ onClose, onComplete }: OnboardingFlowProps) {
  const { 
    state, 
    data, 
    isSaving, 
    completeStep, 
    skipOnboarding, 
    goToStep,
    getCurrentStep,
    getAvailableSteps
  } = useOnboarding()

  const [isSkipping, setIsSkipping] = useState(false)
  const { toast } = useToast()

  const currentStep = getCurrentStep()
  const availableSteps = getAvailableSteps()

  const handleStepComplete = async (stepData?: any) => {
    if (!currentStep) return
    
    const success = await completeStep(currentStep.id, stepData)
    if (success) {
      toast({
        title: 'Etapa Concluída',
        description: `${currentStep.title} foi configurado com sucesso!`
      })
      
      // If this was the last step, call onComplete
      if (state?.progress.completionPercentage === 100) {
        onComplete?.()
      }
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível completar esta etapa. Tente novamente.',
        variant: 'destructive'
      })
    }
  }

  const handleSkip = async () => {
    setIsSkipping(true)
    const success = await skipOnboarding()
    if (success) {
      toast({
        title: 'Configuração Inicial Concluída',
        description: 'Você pode finalizar a configuração a qualquer momento nas configurações.'
      })
      onComplete?.()
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível pular a configuração.',
        variant: 'destructive'
      })
    }
    setIsSkipping(false)
  }

  const renderStepComponent = () => {
    if (!currentStep) return null

    const stepProps = {
      data: data[currentStep.id as keyof typeof data],
      onComplete: handleStepComplete,
      onNext: () => {
        const nextStep = availableSteps.find(step => 
          step.order > currentStep.order && !step.isCompleted
        )
        if (nextStep) {
          goToStep(nextStep.id)
        }
      },
      onPrevious: () => {
        const prevStep = availableSteps
          .filter(step => step.order < currentStep.order)
          .sort((a, b) => b.order - a.order)[0]
        if (prevStep) {
          goToStep(prevStep.id)
        }
      }
    }

    switch (currentStep.component) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />
      case 'profile':
        return <ProfileStep {...stepProps} />
      case 'whatsapp':
        return <WhatsAppStep {...stepProps} />
      case 'ai':
        return <AIStep {...stepProps} />
      case 'flows':
        return <FlowsStep {...stepProps} />
      case 'team':
        return <TeamStep {...stepProps} />
      case 'complete':
        return <CompleteStep {...stepProps} onFinish={onComplete} />
      default:
        return <div>Componente não encontrado</div>
    }
  }

  if (!state || !currentStep) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Configuração Inicial</h2>
              <Badge variant="outline">
                Passo {currentStep.order} de {state.steps.length}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {state.canSkip && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
                disabled={isSkipping}
              >
                {isSkipping ? 'Pulando...' : 'Pular Configuração'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progresso: {state.progress.completionPercentage}%
            </span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{state.progress.estimatedTimeRemaining} min restantes</span>
            </div>
          </div>
          <Progress value={state.progress.completionPercentage} className="w-full" />
          
          {/* Step indicators */}
          <div className="flex items-center justify-between mt-4">
            {state.steps.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-col items-center gap-1 cursor-pointer"
                onClick={() => {
                  if (availableSteps.some(s => s.id === step.id)) {
                    goToStep(step.id)
                  }
                }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step.isCompleted
                      ? 'bg-green-600 text-white'
                      : step.id === currentStep.id
                      ? 'bg-primary text-primary-foreground'
                      : availableSteps.some(s => s.id === step.id)
                      ? 'bg-muted border-2 border-primary text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-xs text-center max-w-20 ${
                    step.id === currentStep.id
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.title.split(' ').slice(0, 2).join(' ')}
                </span>
                {step.isOptional && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    Opcional
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="max-w-2xl mx-auto">
            {/* Current step header */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">{currentStep.title}</h3>
              <p className="text-muted-foreground mb-4">{currentStep.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>~{currentStep.estimatedTime} minutos</span>
                </div>
                {currentStep.prerequisites && currentStep.prerequisites.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>
                      Requer: {currentStep.prerequisites
                        .map(prereq => state.steps.find(s => s.id === prereq)?.title)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step component */}
            <div className="min-h-[400px]">
              {renderStepComponent()}
            </div>
          </div>
        </div>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between p-6 border-t bg-muted/30">
          <Button
            variant="outline"
            onClick={() => {
              const prevStep = availableSteps
                .filter(step => step.order < currentStep.order)
                .sort((a, b) => b.order - a.order)[0]
              if (prevStep) {
                goToStep(prevStep.id)
              }
            }}
            disabled={
              currentStep.order === 1 || 
              !availableSteps.some(step => step.order < currentStep.order)
            }
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>
                {state.progress.completedSteps} de {state.progress.totalSteps} concluídos
              </span>
            </div>
          </div>

          <Button
            onClick={() => {
              const nextStep = availableSteps.find(step => 
                step.order > currentStep.order && !step.isCompleted
              )
              if (nextStep) {
                goToStep(nextStep.id)
              }
            }}
            disabled={
              !availableSteps.some(step => step.order > currentStep.order && !step.isCompleted) ||
              isSaving
            }
          >
            {currentStep.order === state.steps.length ? 'Finalizar' : 'Próximo'}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}