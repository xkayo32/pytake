'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  AISuggestionEngine, 
  SuggestionResponse, 
  SuggestionContext,
  Conversation,
  AgentProfile
} from '@/lib/ai/suggestion-engine'
import { 
  Bot, 
  Clock, 
  MessageSquare, 
  Zap, 
  ChevronRight, 
  Copy,
  Edit3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuggestionPanelProps {
  conversation: Conversation
  agentProfile?: AgentProfile
  currentMessage?: string
  onSuggestionSelect: (suggestion: SuggestionResponse) => void
  onSuggestionCopy: (text: string) => void
  className?: string
  isVisible?: boolean
}

export function SuggestionPanel({
  conversation,
  agentProfile,
  currentMessage,
  onSuggestionSelect,
  onSuggestionCopy,
  className,
  isVisible = true
}: SuggestionPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestionResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [usageStats, setUsageStats] = useState<any>(null)
  
  const suggestionEngine = useRef(new AISuggestionEngine())
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const lastMessageIdRef = useRef<string>()

  // Mock data for templates and knowledge base
  const mockContext: Omit<SuggestionContext, 'conversation' | 'agentProfile' | 'currentMessage'> = {
    availableTemplates: [
      {
        id: 'greeting-1',
        title: 'Cumprimento Padrão',
        content: 'Olá {customerName}! Sou {agentName} e vou ajudar você hoje. Como posso auxiliar?',
        category: 'greeting',
        tags: ['cumprimento', 'inicial'],
        usageCount: 150,
        successRate: 0.92,
        variables: { customerName: '', agentName: '' }
      },
      {
        id: 'problem-1',
        title: 'Resolução de Problema',
        content: 'Entendo seu problema e vou resolver isso rapidamente. Pode me dar mais detalhes sobre {issue}?',
        category: 'support',
        tags: ['problema', 'suporte'],
        usageCount: 89,
        successRate: 0.87,
        variables: { issue: '' }
      }
    ],
    knowledgeBase: [
      {
        id: 'kb-1',
        question: 'Como resetar senha?',
        answer: 'Para resetar sua senha, acesse o link "Esqueci minha senha" na tela de login e siga as instruções enviadas por email.',
        keywords: ['senha', 'reset', 'esqueci', 'login'],
        category: 'account',
        confidence: 0.95,
        lastUpdated: new Date()
      },
      {
        id: 'kb-2',
        question: 'Como cancelar assinatura?',
        answer: 'Você pode cancelar sua assinatura a qualquer momento nas configurações da sua conta, seção "Assinatura".',
        keywords: ['cancelar', 'assinatura', 'conta'],
        category: 'billing',
        confidence: 0.90,
        lastUpdated: new Date()
      }
    ],
    recentSuccessfulResponses: [
      {
        originalMessage: 'Não consigo fazer login',
        response: 'Vou ajudar você com o login. Primeiro, vamos verificar se o email está correto.',
        context: 'login issue',
        customerSatisfaction: 4.8,
        responseTime: 45,
        resolved: true
      }
    ]
  }

  // Generate suggestions when conversation changes
  const generateSuggestions = useCallback(async () => {
    if (!conversation || conversation.messages.length === 0) return

    const lastMessage = conversation.messages[conversation.messages.length - 1]
    
    // Skip if it's the same message
    if (lastMessageIdRef.current === lastMessage.id) return
    lastMessageIdRef.current = lastMessage.id

    setIsLoading(true)
    setError(null)

    try {
      const context: SuggestionContext = {
        conversation,
        agentProfile,
        currentMessage,
        ...mockContext
      }

      const newSuggestions = await suggestionEngine.current.generateSuggestions(context)
      setSuggestions(newSuggestions)
    } catch (err: any) {
      setError(err.message)
      console.error('Error generating suggestions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [conversation, agentProfile, currentMessage])

  // Auto-refresh suggestions when conversation changes
  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    refreshTimeoutRef.current = setTimeout(() => {
      generateSuggestions()
    }, 500) // Debounce 500ms

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [generateSuggestions])

  // Load usage stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await suggestionEngine.current.getUsageStats()
        setUsageStats(stats)
      } catch (error) {
        console.error('Error loading usage stats:', error)
      }
    }

    loadStats()
  }, [])

  const handleSuggestionClick = useCallback((suggestion: SuggestionResponse) => {
    setSelectedSuggestion(suggestion.id)
    onSuggestionSelect(suggestion)
    
    // Submit usage feedback
    suggestionEngine.current.trainWithFeedback(
      suggestion,
      { conversation, agentProfile, currentMessage, ...mockContext },
      { used: true, edited: false, resolved: false }
    )
  }, [conversation, agentProfile, currentMessage, onSuggestionSelect])

  const handleCopyClick = useCallback((suggestion: SuggestionResponse, e: React.MouseEvent) => {
    e.stopPropagation()
    onSuggestionCopy(suggestion.text)
    
    // Visual feedback
    setSelectedSuggestion(suggestion.id)
    setTimeout(() => setSelectedSuggestion(null), 1000)
  }, [onSuggestionCopy])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'greeting':
        return <MessageSquare className="h-4 w-4" />
      case 'solution':
        return <Lightbulb className="h-4 w-4" />
      case 'information':
        return <CheckCircle className="h-4 w-4" />
      case 'escalation':
        return <AlertCircle className="h-4 w-4" />
      case 'closing':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'greeting':
        return 'bg-blue-100 text-blue-800'
      case 'solution':
        return 'bg-yellow-100 text-yellow-800'
      case 'information':
        return 'bg-green-100 text-green-800'
      case 'escalation':
        return 'bg-red-100 text-red-800'
      case 'closing':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isVisible) return null

  return (
    <Card className={cn('w-80 h-fit max-h-[600px] overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Sugestões IA</CardTitle>
          </div>
          {usageStats && (
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              {Math.round(usageStats.usageRate * 100)}% uso
            </Badge>
          )}
        </div>
        <CardDescription>
          Sugestões inteligentes baseadas no contexto da conversa
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-y-auto">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Separator />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-600 text-sm">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Erro ao carregar sugestões
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={generateSuggestions}
                className="mt-2"
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {!isLoading && !error && suggestions.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhuma sugestão disponível
            </div>
          )}

          {!isLoading && !error && suggestions.length > 0 && (
            <div className="space-y-0">
              {suggestions.map((suggestion, index) => (
                <div key={suggestion.id}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-gray-50 transition-colors",
                      "focus:outline-none focus:bg-gray-50",
                      selectedSuggestion === suggestion.id && "bg-blue-50 border-l-4 border-blue-500"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={cn("text-xs", getCategoryColor(suggestion.category))}>
                          {getCategoryIcon(suggestion.category)}
                          <span className="ml-1 capitalize">{suggestion.category}</span>
                        </Badge>
                        {suggestion.confidence > 0.8 && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            {Math.round(suggestion.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => handleCopyClick(suggestion, e)}
                          className="p-1 hover:bg-white rounded transition-colors"
                          title="Copiar sugestão"
                        >
                          <Copy className="h-3 w-3 text-gray-400" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-900 mb-2 line-clamp-3">
                      {suggestion.text}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        ~{suggestion.estimatedResponseTime}s para digitar
                      </span>
                      {suggestion.shortcuts && (
                        <span className="bg-gray-100 px-2 py-1 rounded font-mono">
                          {suggestion.shortcuts[0]}
                        </span>
                      )}
                    </div>
                    
                    {suggestion.reasoning && (
                      <p className="text-xs text-gray-400 mt-2 italic">
                        {suggestion.reasoning}
                      </p>
                    )}

                    {suggestion.followUpQuestions && suggestion.followUpQuestions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600 mb-2">Perguntas de follow-up:</p>
                        <div className="space-y-1">
                          {suggestion.followUpQuestions.map((question, qIndex) => (
                            <p key={qIndex} className="text-xs text-gray-500 pl-2 border-l-2 border-gray-200">
                              {question}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                  {index < suggestions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>

        {usageStats && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Sugestões hoje:</span>
                <span className="font-medium">{usageStats.totalSuggestions}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de uso:</span>
                <span className="font-medium">{Math.round(usageStats.usageRate * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Impacto satisfação:</span>
                <span className="font-medium text-green-600">
                  +{Math.round(usageStats.satisfactionImpact * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}