'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  SentimentHistory, 
  ConversationSentimentSummary,
  SentimentResult 
} from '@/lib/ai/sentiment-analyzer'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  RefreshCw,
  Users,
  MessageSquare,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SentimentDashboardProps {
  sentimentHistory: SentimentHistory[]
  conversationSummary?: ConversationSentimentSummary | null
  stats?: any
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}

export function SentimentDashboard({
  sentimentHistory,
  conversationSummary,
  stats,
  isLoading = false,
  onRefresh,
  className
}: SentimentDashboardProps) {
  
  // Calculate metrics
  const metrics = useMemo(() => {
    if (sentimentHistory.length === 0) {
      return {
        averageScore: 0,
        totalMessages: 0,
        positivePercentage: 0,
        negativePercentage: 0,
        urgentMessages: 0,
        trendDirection: 'stable' as const,
        dominantEmotion: 'neutral'
      }
    }

    const totalMessages = sentimentHistory.length
    const averageScore = sentimentHistory.reduce((sum, h) => sum + h.sentiment.score, 0) / totalMessages
    
    const positiveCount = sentimentHistory.filter(h => 
      ['positive', 'very_positive'].includes(h.sentiment.sentiment)
    ).length
    
    const negativeCount = sentimentHistory.filter(h => 
      ['negative', 'very_negative'].includes(h.sentiment.sentiment)
    ).length
    
    const urgentMessages = sentimentHistory.filter(h => 
      ['high', 'critical'].includes(h.sentiment.urgency)
    ).length

    // Calculate trend
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable'
    if (sentimentHistory.length >= 3) {
      const recentScores = sentimentHistory.slice(-3).map(h => h.sentiment.score)
      const trend = recentScores[recentScores.length - 1] - recentScores[0]
      if (trend > 0.2) trendDirection = 'improving'
      else if (trend < -0.2) trendDirection = 'declining'
    }

    // Find dominant emotion
    const emotionTotals: Record<string, number> = {}
    sentimentHistory.forEach(h => {
      Object.entries(h.sentiment.emotions).forEach(([emotion, value]) => {
        emotionTotals[emotion] = (emotionTotals[emotion] || 0) + value
      })
    })
    
    const dominantEmotion = Object.entries(emotionTotals)
      .reduce((max, [emotion, total]) => 
        total > max.total ? { emotion, total } : max, 
        { emotion: 'neutral', total: 0 }
      ).emotion

    return {
      averageScore,
      totalMessages,
      positivePercentage: (positiveCount / totalMessages) * 100,
      negativePercentage: (negativeCount / totalMessages) * 100,
      urgentMessages,
      trendDirection,
      dominantEmotion
    }
  }, [sentimentHistory])

  const getTrendIcon = () => {
    switch (metrics.trendDirection) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    switch (metrics.trendDirection) {
      case 'improving':
        return 'text-green-600 bg-green-50'
      case 'declining':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.3) return 'text-green-600'
    if (score <= -0.3) return 'text-red-600'
    return 'text-gray-600'
  }

  const getEmotionLabel = (emotion: string) => {
    const labels: Record<string, string> = {
      satisfaction: 'Satisfação',
      frustration: 'Frustração',
      anger: 'Raiva',
      confusion: 'Confusão',
      gratitude: 'Gratidão',
      politeness: 'Polidez',
      urgency: 'Urgência',
      impatience: 'Impaciência'
    }
    return labels[emotion] || emotion
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dashboard de Sentimento</h3>
          <p className="text-sm text-gray-600">
            Análise em tempo real do estado emocional da conversa
          </p>
        </div>
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        )}
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mensagens Analisadas</p>
                <p className="text-2xl font-bold">{metrics.totalMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Score Médio</p>
                <p className={cn("text-2xl font-bold", getScoreColor(metrics.averageScore))}>
                  {metrics.averageScore > 0 ? '+' : ''}{metrics.averageScore.toFixed(2)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tendência</p>
                <div className="flex items-center space-x-2">
                  {getTrendIcon()}
                  <span className={cn("text-lg font-semibold", getTrendColor())}>
                    {metrics.trendDirection === 'improving' ? 'Melhorando' :
                     metrics.trendDirection === 'declining' ? 'Piorando' : 'Estável'}
                  </span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgentes</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.urgentMessages}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de sentimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Sentimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Positivo</span>
                <span className="font-mono">{metrics.positivePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.positivePercentage} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Neutro</span>
                <span className="font-mono">
                  {(100 - metrics.positivePercentage - metrics.negativePercentage).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={100 - metrics.positivePercentage - metrics.negativePercentage} 
                className="h-2" 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Negativo</span>
                <span className="font-mono">{metrics.negativePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.negativePercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Emoções dominantes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emoções Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentHistory.length > 0 ? (
              <div className="space-y-3">
                {Object.entries(sentimentHistory[sentimentHistory.length - 1]?.sentiment.emotions || {})
                  .filter(([_, value]) => value > 0.2)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([emotion, value]) => (
                    <div key={emotion} className="flex items-center justify-between">
                      <span className="text-sm">{getEmotionLabel(emotion)}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={value * 100} className="w-16 h-2" />
                        <span className="text-sm font-mono w-10">
                          {Math.round(value * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhuma análise disponível
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo da conversa */}
      {conversationSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Resumo da Conversa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Sentimento Geral: {conversationSummary.overallSentiment}
              </Badge>
              <Badge variant="outline" className={getTrendColor()}>
                {getTrendIcon()}
                <span className="ml-1">
                  {conversationSummary.sentimentTrend === 'improving' ? 'Melhorando' :
                   conversationSummary.sentimentTrend === 'declining' ? 'Piorando' :
                   conversationSummary.sentimentTrend === 'volatile' ? 'Instável' : 'Estável'}
                </span>
              </Badge>
            </div>

            {conversationSummary.keyMoments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Momentos Importantes:</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {conversationSummary.keyMoments.map((moment, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <div>
                        <span className="font-medium">
                          {moment.event === 'escalation' ? 'Escalonamento' :
                           moment.event === 'resolution' ? 'Resolução' :
                           moment.event === 'satisfaction_drop' ? 'Queda de Satisfação' :
                           'Pico de Satisfação'}:
                        </span>
                        <span className="text-gray-600 ml-1">
                          {moment.message.substring(0, 50)}
                          {moment.message.length > 50 && '...'}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {moment.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {conversationSummary.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recomendações:</h4>
                <ul className="space-y-1">
                  {conversationSummary.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estatísticas globais */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estatísticas Gerais</CardTitle>
            <CardDescription>
              Dados agregados de todas as análises
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalAnalyses?.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Análises</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Math.round((stats.averageUrgency || 0) * 100)}%</p>
              <p className="text-sm text-gray-600">Urgência Média</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {Math.round((stats.sentimentDistribution?.positive || 0) * 100)}%
              </p>
              <p className="text-sm text-gray-600">Mensagens Positivas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {Math.round((stats.sentimentDistribution?.negative || 0) * 100)}%
              </p>
              <p className="text-sm text-gray-600">Mensagens Negativas</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {sentimentHistory.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma Análise Disponível
            </h3>
            <p className="text-gray-600">
              As análises de sentimento aparecerão aqui conforme as mensagens são processadas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}