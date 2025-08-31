'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  SentimentResult,
  EmotionAnalysis,
  SentimentIndicator as SentimentIndicatorType
} from '@/lib/ai/sentiment-analyzer'
import {
  Heart,
  Frown,
  Meh,
  Smile,
  HeartHandshake,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  ThermometerSun,
  Brain,
  MessageCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SentimentIndicatorProps {
  result: SentimentResult
  compact?: boolean
  showDetails?: boolean
  showSuggestions?: boolean
  className?: string
}

export function SentimentIndicator({
  result,
  compact = false,
  showDetails = true,
  showSuggestions = true,
  className
}: SentimentIndicatorProps) {
  const getSentimentIcon = () => {
    switch (result.sentiment) {
      case 'very_positive':
        return <HeartHandshake className="h-5 w-5" />
      case 'positive':
        return <Smile className="h-5 w-5" />
      case 'neutral':
        return <Meh className="h-5 w-5" />
      case 'negative':
        return <Frown className="h-5 w-5" />
      case 'very_negative':
        return <AlertTriangle className="h-5 w-5" />
      default:
        return <Meh className="h-5 w-5" />
    }
  }

  const getSentimentColor = () => {
    switch (result.sentiment) {
      case 'very_positive':
        return 'text-green-600 bg-green-100'
      case 'positive':
        return 'text-green-500 bg-green-50'
      case 'neutral':
        return 'text-gray-500 bg-gray-100'
      case 'negative':
        return 'text-orange-500 bg-orange-50'
      case 'very_negative':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-500 bg-gray-100'
    }
  }

  const getUrgencyIcon = () => {
    switch (result.urgency) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'high':
        return <Zap className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getUrgencyColor = () => {
    switch (result.urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getSentimentLabel = () => {
    switch (result.sentiment) {
      case 'very_positive':
        return 'Muito Positivo'
      case 'positive':
        return 'Positivo'
      case 'neutral':
        return 'Neutro'
      case 'negative':
        return 'Negativo'
      case 'very_negative':
        return 'Muito Negativo'
      default:
        return 'Neutro'
    }
  }

  const getUrgencyLabel = () => {
    switch (result.urgency) {
      case 'critical':
        return 'Crítica'
      case 'high':
        return 'Alta'
      case 'medium':
        return 'Média'
      case 'low':
        return 'Baixa'
      default:
        return 'Baixa'
    }
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center space-x-2", className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className={cn("text-xs", getSentimentColor())}>
                {getSentimentIcon()}
                <span className="ml-1">{getSentimentLabel()}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p><strong>Sentimento:</strong> {getSentimentLabel()}</p>
                <p><strong>Confiança:</strong> {Math.round(result.confidence * 100)}%</p>
                <p><strong>Urgência:</strong> {getUrgencyLabel()}</p>
              </div>
            </TooltipContent>
          </Tooltip>

          {result.urgency !== 'low' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("text-xs", getUrgencyColor())}>
                  {getUrgencyIcon()}
                  <span className="ml-1">{getUrgencyLabel()}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Nível de urgência: {getUrgencyLabel()}</p>
              </TooltipContent>
            </Tooltip>
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
            <CardTitle className="text-lg">Análise de Sentimento</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {Math.round(result.confidence * 100)}% confiança
          </Badge>
        </div>
        <CardDescription>
          Análise automática do estado emocional da mensagem
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sentimento Principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-full", getSentimentColor())}>
              {getSentimentIcon()}
            </div>
            <div>
              <p className="font-medium">{getSentimentLabel()}</p>
              <p className="text-sm text-gray-500">
                Score: {result.score > 0 ? '+' : ''}{result.score.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getUrgencyIcon()}
            <span className="text-sm">Urgência: {getUrgencyLabel()}</span>
          </div>
        </div>

        {showDetails && (
          <>
            <Separator />
            
            {/* Análise de Emoções */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center">
                <ThermometerSun className="h-4 w-4 mr-2" />
                Análise Emocional
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(result.emotions).map(([emotion, value]) => {
                  if (value < 0.1) return null
                  
                  const getEmotionLabel = (emotion: string) => {
                    const labels: Record<string, string> = {
                      anger: 'Raiva',
                      frustration: 'Frustração',
                      satisfaction: 'Satisfação',
                      confusion: 'Confusão',
                      urgency: 'Urgência',
                      politeness: 'Polidez',
                      gratitude: 'Gratidão',
                      impatience: 'Impaciência'
                    }
                    return labels[emotion] || emotion
                  }

                  const getEmotionColor = (emotion: string) => {
                    const colors: Record<string, string> = {
                      anger: 'bg-red-500',
                      frustration: 'bg-orange-500',
                      satisfaction: 'bg-green-500',
                      confusion: 'bg-yellow-500',
                      urgency: 'bg-red-400',
                      politeness: 'bg-blue-500',
                      gratitude: 'bg-purple-500',
                      impatience: 'bg-pink-500'
                    }
                    return colors[emotion] || 'bg-gray-500'
                  }

                  return (
                    <div key={emotion} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{getEmotionLabel(emotion)}</span>
                        <span className="font-mono">{Math.round(value * 100)}%</span>
                      </div>
                      <Progress 
                        value={value * 100} 
                        className="h-2"
                        // @ts-ignore
                        indicatorClassName={getEmotionColor(emotion)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Indicadores */}
            {result.indicators.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Indicadores Detectados
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.indicators
                      .sort((a, b) => b.weight - a.weight)
                      .slice(0, 5)
                      .map((indicator, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={indicator.type === 'positive' ? 'default' : 
                                      indicator.type === 'negative' ? 'destructive' : 'secondary'}
                              className="text-xs px-2 py-0"
                            >
                              {indicator.category}
                            </Badge>
                            <span className="text-gray-600">{indicator.text}</span>
                          </div>
                          <span className="font-mono text-gray-500">
                            {indicator.weight.toFixed(1)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Sugestões */}
        {showSuggestions && result.suggestions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Sugestões de Atendimento
              </h4>
              <ul className="space-y-2">
                {result.suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
              
              {result.urgency === 'critical' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Atenção Crítica Necessária</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Esta mensagem indica urgência extrema. Considere resposta imediata ou escalonamento.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}