'use client'

import { useState, useEffect, useCallback } from 'react'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  component: 'welcome' | 'profile' | 'whatsapp' | 'ai' | 'flows' | 'team' | 'complete'
  isCompleted: boolean
  isOptional: boolean
  order: number
  estimatedTime: number // in minutes
  prerequisites?: string[]
  data?: Record<string, any>
}

export interface OnboardingProgress {
  currentStep: string
  totalSteps: number
  completedSteps: number
  completionPercentage: number
  estimatedTimeRemaining: number
  startedAt?: Date
  completedAt?: Date
}

export interface OnboardingState {
  isActive: boolean
  isCompleted: boolean
  canSkip: boolean
  steps: OnboardingStep[]
  progress: OnboardingProgress
}

export interface UserProfile {
  name: string
  email: string
  phone: string
  company: string
  role: 'admin' | 'manager' | 'agent'
  industry: string
  teamSize: string
  useCase: string[]
}

export interface WhatsAppConfig {
  instanceName: string
  webhookUrl: string
  enableMediaDownload: boolean
  autoReconnect: boolean
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local'
  apiKey: string
  model: string
  enableAutoReply: boolean
  responsePersonality: 'professional' | 'friendly' | 'casual'
}

export interface OnboardingData {
  profile?: UserProfile
  whatsapp?: WhatsAppConfig
  ai?: AIConfig
  flows?: any[]
  team?: any[]
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null)
  const [data, setData] = useState<OnboardingData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Default onboarding steps
  const defaultSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao PyTake',
      description: 'Conheça a plataforma e configure suas preferências iniciais',
      component: 'welcome',
      isCompleted: false,
      isOptional: false,
      order: 1,
      estimatedTime: 2
    },
    {
      id: 'profile',
      title: 'Perfil da Empresa',
      description: 'Configure as informações da sua empresa e perfil pessoal',
      component: 'profile',
      isCompleted: false,
      isOptional: false,
      order: 2,
      estimatedTime: 5
    },
    {
      id: 'whatsapp',
      title: 'Configurar WhatsApp',
      description: 'Conecte sua conta do WhatsApp Business e configure as preferências',
      component: 'whatsapp',
      isCompleted: false,
      isOptional: false,
      order: 3,
      estimatedTime: 8,
      prerequisites: ['profile']
    },
    {
      id: 'ai',
      title: 'Inteligência Artificial',
      description: 'Configure o assistente de IA para respostas automáticas',
      component: 'ai',
      isCompleted: false,
      isOptional: true,
      order: 4,
      estimatedTime: 6,
      prerequisites: ['whatsapp']
    },
    {
      id: 'flows',
      title: 'Primeiro Fluxo',
      description: 'Crie seu primeiro fluxo de atendimento automatizado',
      component: 'flows',
      isCompleted: false,
      isOptional: true,
      order: 5,
      estimatedTime: 12,
      prerequisites: ['whatsapp']
    },
    {
      id: 'team',
      title: 'Convidar Equipe',
      description: 'Adicione membros da sua equipe à plataforma',
      component: 'team',
      isCompleted: false,
      isOptional: true,
      order: 6,
      estimatedTime: 4,
      prerequisites: ['profile']
    },
    {
      id: 'complete',
      title: 'Configuração Concluída',
      description: 'Parabéns! Sua conta está pronta para uso',
      component: 'complete',
      isCompleted: false,
      isOptional: false,
      order: 7,
      estimatedTime: 2
    }
  ]

  // Load onboarding state
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        // Check if user has completed onboarding
        const completed = localStorage.getItem('onboarding_completed')
        const startedAt = localStorage.getItem('onboarding_started')
        const savedSteps = localStorage.getItem('onboarding_steps')
        const savedData = localStorage.getItem('onboarding_data')

        let steps = defaultSteps
        let onboardingData: OnboardingData = {}

        if (savedSteps) {
          try {
            const parsedSteps = JSON.parse(savedSteps)
            // Merge with default steps to ensure we have all steps
            steps = defaultSteps.map(defaultStep => {
              const savedStep = parsedSteps.find((s: OnboardingStep) => s.id === defaultStep.id)
              return savedStep ? { ...defaultStep, ...savedStep } : defaultStep
            })
          } catch (error) {
            console.warn('Failed to parse saved onboarding steps')
          }
        }

        if (savedData) {
          try {
            onboardingData = JSON.parse(savedData)
          } catch (error) {
            console.warn('Failed to parse saved onboarding data')
          }
        }

        const completedSteps = steps.filter(step => step.isCompleted)
        const totalRequired = steps.filter(step => !step.isOptional).length
        const completedRequired = completedSteps.filter(step => !step.isOptional).length
        
        const currentStep = steps.find(step => !step.isCompleted) || steps[steps.length - 1]
        
        const progress: OnboardingProgress = {
          currentStep: currentStep.id,
          totalSteps: steps.length,
          completedSteps: completedSteps.length,
          completionPercentage: Math.round((completedSteps.length / steps.length) * 100),
          estimatedTimeRemaining: steps
            .filter(step => !step.isCompleted)
            .reduce((total, step) => total + step.estimatedTime, 0),
          startedAt: startedAt ? new Date(startedAt) : undefined,
          completedAt: completed ? new Date(completed) : undefined
        }

        const onboardingState: OnboardingState = {
          isActive: !completed && completedRequired < totalRequired,
          isCompleted: !!completed,
          canSkip: completedRequired >= totalRequired - 1, // Can skip if only one required step left
          steps,
          progress
        }

        setState(onboardingState)
        setData(onboardingData)

        // Mark onboarding as started if not already
        if (!startedAt && onboardingState.isActive) {
          localStorage.setItem('onboarding_started', new Date().toISOString())
        }

      } catch (error) {
        console.error('Error loading onboarding state:', error)
        // Fallback to default state
        const progress: OnboardingProgress = {
          currentStep: defaultSteps[0].id,
          totalSteps: defaultSteps.length,
          completedSteps: 0,
          completionPercentage: 0,
          estimatedTimeRemaining: defaultSteps.reduce((total, step) => total + step.estimatedTime, 0)
        }

        setState({
          isActive: true,
          isCompleted: false,
          canSkip: false,
          steps: defaultSteps,
          progress
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadOnboardingState()
  }, [])

  // Complete a step
  const completeStep = useCallback(async (stepId: string, stepData?: any) => {
    if (!state) return false

    setIsSaving(true)
    try {
      const updatedSteps = state.steps.map(step => 
        step.id === stepId ? { ...step, isCompleted: true, data: stepData } : step
      )

      const updatedData = stepData ? { ...data, [stepId]: stepData } : data

      const completedSteps = updatedSteps.filter(step => step.isCompleted)
      const nextStep = updatedSteps.find(step => 
        !step.isCompleted && 
        (!step.prerequisites || step.prerequisites.every(prereq => 
          updatedSteps.find(s => s.id === prereq)?.isCompleted
        ))
      ) || updatedSteps[updatedSteps.length - 1]

      const progress: OnboardingProgress = {
        currentStep: nextStep.id,
        totalSteps: updatedSteps.length,
        completedSteps: completedSteps.length,
        completionPercentage: Math.round((completedSteps.length / updatedSteps.length) * 100),
        estimatedTimeRemaining: updatedSteps
          .filter(step => !step.isCompleted)
          .reduce((total, step) => total + step.estimatedTime, 0),
        startedAt: state.progress.startedAt,
        completedAt: completedSteps.length === updatedSteps.length ? new Date() : undefined
      }

      const isCompleted = completedSteps.length === updatedSteps.length
      const totalRequired = updatedSteps.filter(step => !step.isOptional).length
      const completedRequired = completedSteps.filter(step => !step.isOptional).length

      const newState: OnboardingState = {
        isActive: !isCompleted && completedRequired < totalRequired,
        isCompleted,
        canSkip: completedRequired >= totalRequired - 1,
        steps: updatedSteps,
        progress
      }

      setState(newState)
      setData(updatedData)

      // Save to localStorage
      localStorage.setItem('onboarding_steps', JSON.stringify(updatedSteps))
      localStorage.setItem('onboarding_data', JSON.stringify(updatedData))
      
      if (isCompleted) {
        localStorage.setItem('onboarding_completed', new Date().toISOString())
      }

      return true
    } catch (error) {
      console.error('Error completing onboarding step:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [state, data])

  // Skip onboarding
  const skipOnboarding = useCallback(async () => {
    if (!state?.canSkip) return false

    try {
      localStorage.setItem('onboarding_completed', new Date().toISOString())
      setState(prev => prev ? { ...prev, isActive: false, isCompleted: true } : null)
      return true
    } catch (error) {
      console.error('Error skipping onboarding:', error)
      return false
    }
  }, [state])

  // Restart onboarding
  const restartOnboarding = useCallback(() => {
    localStorage.removeItem('onboarding_completed')
    localStorage.removeItem('onboarding_started')
    localStorage.removeItem('onboarding_steps')
    localStorage.removeItem('onboarding_data')
    
    const progress: OnboardingProgress = {
      currentStep: defaultSteps[0].id,
      totalSteps: defaultSteps.length,
      completedSteps: 0,
      completionPercentage: 0,
      estimatedTimeRemaining: defaultSteps.reduce((total, step) => total + step.estimatedTime, 0),
      startedAt: new Date()
    }

    setState({
      isActive: true,
      isCompleted: false,
      canSkip: false,
      steps: defaultSteps.map(step => ({ ...step, isCompleted: false })),
      progress
    })
    setData({})

    localStorage.setItem('onboarding_started', new Date().toISOString())
  }, [])

  // Go to specific step
  const goToStep = useCallback((stepId: string) => {
    if (!state) return false

    const step = state.steps.find(s => s.id === stepId)
    if (!step) return false

    // Check prerequisites
    if (step.prerequisites && 
        !step.prerequisites.every(prereq => 
          state.steps.find(s => s.id === prereq)?.isCompleted
        )) {
      return false
    }

    const newProgress = {
      ...state.progress,
      currentStep: stepId
    }

    setState({
      ...state,
      progress: newProgress
    })

    return true
  }, [state])

  // Get current step
  const getCurrentStep = useCallback(() => {
    if (!state) return null
    return state.steps.find(step => step.id === state.progress.currentStep) || null
  }, [state])

  // Get available steps (those that can be accessed now)
  const getAvailableSteps = useCallback(() => {
    if (!state) return []
    
    return state.steps.filter(step => 
      step.isCompleted || 
      !step.prerequisites || 
      step.prerequisites.every(prereq => 
        state.steps.find(s => s.id === prereq)?.isCompleted
      )
    )
  }, [state])

  return {
    state,
    data,
    isLoading,
    isSaving,
    completeStep,
    skipOnboarding,
    restartOnboarding,
    goToStep,
    getCurrentStep,
    getAvailableSteps
  }
}