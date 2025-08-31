'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  IntentResult, 
  EntityExtraction, 
  IntentType 
} from '@/lib/ai/intent-classifier'
import {
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Settings,
  ThumbsUp,
  ThumbsDown,
  User,
  Clock,
  Zap,
  Target,
  ArrowRight,
  CheckCircle,
  XCircle,
  Hash,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Tag,
  Brain,
  Route,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntentDisplayProps {
  result: IntentResult
  compact?: boolean
  showActions?: boolean
  showEntities?: boolean
  showRouting?: boolean
  onFeedback?: (correct: boolean, correctIntent?: string) => void
  className?: string
}

export function IntentDisplay({
  result,
  compact = false,
  showActions = true,
  showEntities = true,
  showRouting = true,
  onFeedback,
  className
}: IntentDisplayProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false)

  const getIntentIcon = (type: IntentType) => {
    switch (type) {
      case 'question':
        return <HelpCircle className="h-4 w-4" />
      case 'problem_report':
        return <AlertTriangle className="h-4 w-4" />
      case 'complaint':
        return <XCircle className="h-4 w-4" />
      case 'compliment':
        return <CheckCircle className="h-4 w-4" />
      case 'greeting':
        return <User className="h-4 w-4" />
      case 'goodbye':
        return <User className="h-4 w-4" />
      case 'escalation':
        return <ArrowRight className="h-4 w-4" />
      case 'request':
        return <MessageSquare className="h-4 w-4" />
      case 'information':
        return <MessageSquare className="h-4 w-4" />
      case 'support':
        return <Settings className="h-4 w-4" />
      case 'billing':
        return <DollarSign className="h-4 w-4" />
      case 'sales':
        return <Target className="h-4 w-4" />
      case 'technical':
        return <Settings className="h-4 w-4" />
      case 'feedback':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getIntentColor = (type: IntentType) => {
    switch (type) {
      case 'complaint':
        return 'text-red-600 bg-red-100 border-red-200'
      case 'problem_report':
        return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'escalation':
        return 'text-red-700 bg-red-50 border-red-300'
      case 'compliment':
        return 'text-green-600 bg-green-100 border-green-200'
      case 'greeting':
        return 'text-blue-600 bg-blue-100 border-blue-200'
      case 'goodbye':
        return 'text-purple-600 bg-purple-100 border-purple-200'
      case 'billing':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      case 'sales':
        return 'text-indigo-600 bg-indigo-100 border-indigo-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
    }
  }

  const getUrgencyColor = () => {
    switch (result.urgency) {
      case 'critical':
        return 'text-red-800 bg-red-100 border-red-300'
      case 'high':
        return 'text-orange-800 bg-orange-100 border-orange-300'
      case 'medium':
        return 'text-yellow-800 bg-yellow-100 border-yellow-300'
      case 'low':
        return 'text-gray-600 bg-gray-100 border-gray-300'
    }
  }

  const getEntityIcon = (type: EntityExtraction['type']) => {
    switch (type) {
      case 'email':
        return <Mail className="h-3 w-3" />
      case 'phone':
        return <Phone className="h-3 w-3" />
      case 'date':
      case 'time':
        return <Calendar className="h-3 w-3" />
      case 'money':
        return <DollarSign className="h-3 w-3" />
      case 'order_id':
        return <Hash className="h-3 w-3" />
      default:
        return <Tag className="h-3 w-3" />
    }
  }

  const handleFeedback = (correct: boolean) => {
    if (onFeedback) {
      onFeedback(correct)
      setFeedbackGiven(true)
    }
  }

  const getIntentLabel = (type: IntentType) => {
    const labels: Record<IntentType, string> = {
      'question': 'Pergunta',
      'problem_report': 'Problema',
      'request': 'Solicitação',
      'complaint': 'Reclamação',
      'compliment': 'Elogio',
      'greeting': 'Cumprimento',
      'goodbye': 'Despedida',
      'escalation': 'Escalonamento',
      'information': 'Informação',
      'support': 'Suporte',
      'sales': 'Vendas',
      'billing': 'Cobrança',
      'technical': 'Técnico',
      'feedback': 'Feedback'
    }
    return labels[type] || type
  }

  const getUrgencyLabel = () => {
    switch (result.urgency) {
      case 'critical': return 'Crítica'
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return 'Baixa'
    }
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center space-x-2", className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={cn("text-xs", getIntentColor(result.primary.type))}>
                {getIntentIcon(result.primary.type)}
                <span className="ml-1">{getIntentLabel(result.primary.type)}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p><strong>Intenção:</strong> {result.primary.description}</p>
                <p><strong>Confiança:</strong> {Math.round(result.confidence * 100)}%</p>
                <p><strong>Urgência:</strong> {getUrgencyLabel()}</p>
              </div>
            </TooltipContent>
          </Tooltip>

          {result.urgency !== 'low' && (
            <Badge variant="outline" className={cn("text-xs", getUrgencyColor())}>
              <Zap className="h-3 w-3 mr-1" />
              {getUrgencyLabel()}
            </Badge>
          )}

          {result.actionRequired && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ação
            </Badge>
          )}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Classificação de Intenção</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {Math.round(result.confidence * 100)}% confiança
            </Badge>
            {result.actionRequired && (
              <Badge variant="outline" className="text-xs text-orange-600 bg-orange-50">
                Ação Requerida
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Análise automática da intenção da mensagem
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Intenção Principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-full", getIntentColor(result.primary.type))}>
              {getIntentIcon(result.primary.type)}
            </div>
            <div>
              <p className="font-medium">{getIntentLabel(result.primary.type)}</p>
              <p className="text-sm text-gray-500">{result.primary.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={getUrgencyColor()}>
              <Clock className="h-3 w-3 mr-1" />
              Urgência: {getUrgencyLabel()}
            </Badge>
          </div>
        </div>

        {/* Intenção Secundária */}
        {result.secondary && (
          <>
            <Separator />
            <div className="flex items-center space-x-3">
              <div className={cn("p-1.5 rounded-full", getIntentColor(result.secondary.type))}>
                {getIntentIcon(result.secondary.type)}
              </div>
              <div>
                <p className="text-sm font-medium">
                  Intenção secundária: {getIntentLabel(result.secondary.type)}
                </p>
                <p className="text-xs text-gray-500">{result.secondary.description}</p>
              </div>
            </div>
          </>
        )}

        {/* Entidades */}
        {showEntities && result.entities.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Entidades Detectadas ({result.entities.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.entities.slice(0, 6).map((entity, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    {getEntityIcon(entity.type)}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{entity.value}</p>
                      <p className="text-xs text-gray-500 capitalize">{entity.type}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(entity.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
                
                {result.entities.length > 6 && (
                  <div className="col-span-full text-center text-sm text-gray-500">
                    +{result.entities.length - 6} entidades adicionais
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Ações Sugeridas */}
        {showActions && result.suggestedActions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Ações Sugeridas
              </h4>
              <ul className="space-y-2">
                {result.suggestedActions.map((action, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Roteamento */}
        {showRouting && result.routing && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center">
                <Route className="h-4 w-4 mr-2" />
                Roteamento Sugerido
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Departamento</p>
                    <p className="text-xs text-gray-600 capitalize">
                      {result.routing.department}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Prioridade</p>
                    <p className="text-xs text-gray-600">
                      {result.routing.priority}/5
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Skills</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.routing.skillRequired.slice(0, 2).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill.replace('_', ' ')}
                        </Badge>
                      ))}
                      {result.routing.skillRequired.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{result.routing.skillRequired.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Feedback */}
        {onFeedback && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Esta classificação está correta?
              </p>
              {!feedbackGiven ? (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(true)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Sim
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFeedback(false)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Não
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Feedback enviado
                </Badge>
              )}
            </div>
          </>
        )}

        {/* Alertas especiais */}
        {result.urgency === 'critical' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Urgência Crítica Detectada</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Esta mensagem requer atenção imediata. Considere escalação ou resposta prioritária.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}