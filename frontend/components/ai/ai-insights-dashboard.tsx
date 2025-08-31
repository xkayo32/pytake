'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Brain,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Bot,
  Users,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  Lightbulb,
  Zap,
  Heart,
  RefreshCw,
  Download,
  Settings,
  Eye,
  MessageCircle,
  ThermometerSun
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SentimentDashboard } from './sentiment-dashboard'

interface AIInsight {
  id: string
  type: 'suggestion' | 'sentiment' | 'intent' | 'chatbot' | 'performance'
  title: string
  description: string
  value: string | number
  change?: number
  trend: 'up' | 'down' | 'stable'
  severity: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  timestamp: Date
}

interface AIMetrics {
  suggestions: {
    totalGenerated: number
    usageRate: number
    satisfactionImpact: number
    topCategories: { category: string; count: number }[]
  }
  sentiment: {
    totalAnalyses: number
    positivePercentage: number
    negativePercentage: number
    averageScore: number
    alertsTriggered: number
  }
  intents: {
    totalClassifications: number
    accuracy: number
    topIntents: { intent: string; count: number }[]
    escalationRate: number
  }
  chatbot: {
    totalInteractions: number
    automationRate: number
    humanTransfers: number
    avgResponseTime: number
    satisfactionRating: number
  }
}

interface AIInsightsDashboardProps {
  className?: string
  refreshInterval?: number
  showRealTimeUpdates?: boolean
}

export function AIInsightsDashboard({
  className,
  refreshInterval = 30000, // 30 seconds
  showRealTimeUpdates = true
}: AIInsightsDashboardProps) {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null)
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [selectedTab, setSelectedTab] = useState('overview')

  // Mock data generation
  const generateMockData = (): { metrics: AIMetrics; insights: AIInsight[] } => {
    const mockMetrics: AIMetrics = {
      suggestions: {
        totalGenerated: 2847,
        usageRate: 0.78,
        satisfactionImpact: 0.15,
        topCategories: [
          { category: 'information', count: 892 },
          { category: 'solution', count: 634 },
          { category: 'greeting', count: 445 },
          { category: 'closing', count: 387 }
        ]
      },
      sentiment: {
        totalAnalyses: 1956,
        positivePercentage: 45.2,
        negativePercentage: 18.7,
        averageScore: 0.31,
        alertsTriggered: 23
      },
      intents: {
        totalClassifications: 2134,
        accuracy: 0.87,
        topIntents: [
          { intent: 'question', count: 756 },
          { intent: 'problem_report', count: 523 },
          { intent: 'request', count: 398 },
          { intent: 'complaint', count: 287 }
        ],
        escalationRate: 0.12
      },
      chatbot: {
        totalInteractions: 1432,
        automationRate: 0.73,
        humanTransfers: 387,
        avgResponseTime: 1.3,
        satisfactionRating: 4.1
      }
    }

    const mockInsights: AIInsight[] = [
      {
        id: '1',
        type: 'chatbot',
        title: 'Alta Taxa de Automação',
        description: 'O chatbot está resolvendo 73% das consultas automaticamente',
        value: '73%',
        change: 5.2,
        trend: 'up',
        severity: 'low',
        actionable: false,
        timestamp: new Date()
      },
      {
        id: '2',
        type: 'sentiment',
        title: 'Aumento em Sentimentos Negativos',
        description: 'Detectado aumento de 12% em mensagens com sentimento negativo',
        value: '18.7%',
        change: 12,
        trend: 'up',
        severity: 'medium',
        actionable: true,
        timestamp: new Date()
      },
      {
        id: '3',
        type: 'suggestion',
        title: 'Sugestões Melhorando Satisfação',
        description: 'As sugestões de IA aumentaram a satisfação do cliente em 15%',
        value: '+15%',
        change: 3.4,
        trend: 'up',
        severity: 'low',
        actionable: false,
        timestamp: new Date()
      },
      {
        id: '4',
        type: 'intent',
        title: 'Precisão de Classificação Alta',
        description: 'Classificação de intenções mantendo 87% de precisão',
        value: '87%',
        trend: 'stable',
        severity: 'low',
        actionable: false,
        timestamp: new Date()
      },
      {
        id: '5',
        type: 'performance',
        title: 'Pico de Reclamações Detectado',
        description: 'Aumento significativo em reclamações nas últimas 4 horas',
        value: '287',
        change: 45,
        trend: 'up',
        severity: 'high',
        actionable: true,
        timestamp: new Date()
      }
    ]

    return { metrics: mockMetrics, insights: mockInsights }
  }

  // Load data
  const loadData = async () => {
    setIsLoading(true)
    try {
      // In real implementation, this would be API calls
      const { metrics: newMetrics, insights: newInsights } = generateMockData()
      setMetrics(newMetrics)
      setInsights(newInsights)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading AI insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadData()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!showRealTimeUpdates) return

    const interval = setInterval(loadData, refreshInterval)
    return () => clearInterval(interval)
  }, [showRealTimeUpdates, refreshInterval])

  // Calculated insights
  const calculatedInsights = useMemo(() => {
    if (!metrics) return { totalAIOperations: 0, overallHealthScore: 0, criticalAlerts: 0 }

    const totalAIOperations = 
      metrics.suggestions.totalGenerated +
      metrics.sentiment.totalAnalyses +
      metrics.intents.totalClassifications +
      metrics.chatbot.totalInteractions

    // Calculate overall health score (0-100)
    const healthFactors = [
      metrics.suggestions.usageRate * 20,
      (metrics.sentiment.positivePercentage / 100) * 20,
      metrics.intents.accuracy * 20,
      metrics.chatbot.automationRate * 20,
      Math.min(metrics.chatbot.satisfactionRating / 5, 1) * 20
    ]
    const overallHealthScore = healthFactors.reduce((sum, factor) => sum + factor, 0)

    const criticalAlerts = insights.filter(i => i.severity === 'critical' || i.severity === 'high').length

    return { totalAIOperations, overallHealthScore, criticalAlerts }
  }, [metrics, insights])

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="h-4 w-4" />
      case 'sentiment':
        return <Heart className="h-4 w-4" />
      case 'intent':
        return <Target className="h-4 w-4" />
      case 'chatbot':
        return <Bot className="h-4 w-4" />
      case 'performance':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const getInsightColor = (severity: AIInsight['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'high':
        return 'border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-yellow-500 bg-yellow-50'
      default:
        return 'border-green-500 bg-green-50'
    }
  }

  const getTrendIcon = (trend: AIInsight['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />
      default:
        return <Activity className="h-3 w-3 text-gray-500" />
    }
  }

  if (isLoading && !metrics) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Brain className="h-6 w-6 mr-2 text-purple-600" />
            Dashboard de Insights de IA
          </h2>
          <p className="text-gray-600">
            Análise completa do desempenho dos sistemas de inteligência artificial
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Atualizado {lastUpdated.toLocaleTimeString()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Operações de IA</p>
                <p className="text-2xl font-bold">
                  {calculatedInsights.totalAIOperations.toLocaleString()}
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Score de Saúde</p>
                <p className="text-2xl font-bold">
                  {Math.round(calculatedInsights.overallHealthScore)}%
                </p>
              </div>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                calculatedInsights.overallHealthScore >= 80 ? "bg-green-100" : 
                calculatedInsights.overallHealthScore >= 60 ? "bg-yellow-100" : "bg-red-100"
              )}>
                <CheckCircle className={cn(
                  "h-5 w-5",
                  calculatedInsights.overallHealthScore >= 80 ? "text-green-600" : 
                  calculatedInsights.overallHealthScore >= 60 ? "text-yellow-600" : "text-red-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa de Automação</p>
                <p className="text-2xl font-bold">
                  {Math.round((metrics?.chatbot.automationRate || 0) * 100)}%
                </p>
              </div>
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Alertas Críticos</p>
                <p className="text-2xl font-bold text-red-600">
                  {calculatedInsights.criticalAlerts}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
          <TabsTrigger value="sentiment">Sentimento</TabsTrigger>
          <TabsTrigger value="intents">Intenções</TabsTrigger>
          <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
        </Tabs>

        <TabsContent value="overview" className="space-y-6">
          {/* Insights Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Insights em Tempo Real
              </CardTitle>
              <CardDescription>
                Análises e alertas automáticos dos sistemas de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={cn(
                      "p-4 rounded-lg border-l-4",
                      getInsightColor(insight.severity)
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getInsightIcon(insight.type)}
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.type}
                          </Badge>
                          {getTrendIcon(insight.trend)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {insight.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {insight.timestamp.toLocaleTimeString()}
                          </span>
                          {insight.change && (
                            <span className={cn(
                              "flex items-center",
                              insight.change > 0 ? "text-red-600" : "text-green-600"
                            )}>
                              {insight.change > 0 ? "+" : ""}{insight.change}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{insight.value}</p>
                        {insight.actionable && (
                          <Button variant="outline" size="sm" className="mt-2">
                            <Zap className="h-3 w-3 mr-1" />
                            Ação
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Desempenho das Sugestões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Taxa de Uso</span>
                  <span className="font-mono">
                    {Math.round((metrics?.suggestions.usageRate || 0) * 100)}%
                  </span>
                </div>
                <Progress value={(metrics?.suggestions.usageRate || 0) * 100} />

                <div className="flex justify-between items-center">
                  <span>Impacto na Satisfação</span>
                  <span className="font-mono text-green-600">
                    +{Math.round((metrics?.suggestions.satisfactionImpact || 0) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(metrics?.suggestions.satisfactionImpact || 0) * 100} 
                  className="[&>div]:bg-green-500"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categorias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.suggestions.topCategories.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <span className="capitalize">{category.category}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono">{category.count}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(category.count / (metrics?.suggestions.totalGenerated || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          {/* Use the existing sentiment dashboard component */}
          <SentimentDashboard
            sentimentHistory={[]}
            conversationSummary={null}
            stats={{
              totalAnalyses: metrics?.sentiment.totalAnalyses || 0,
              sentimentDistribution: {
                positive: (metrics?.sentiment.positivePercentage || 0) / 100,
                negative: (metrics?.sentiment.negativePercentage || 0) / 100,
                neutral: 1 - ((metrics?.sentiment.positivePercentage || 0) + (metrics?.sentiment.negativePercentage || 0)) / 100
              },
              averageUrgency: 0.3
            }}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="intents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Classificação de Intenções
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Precisão</span>
                  <span className="font-mono">
                    {Math.round((metrics?.intents.accuracy || 0) * 100)}%
                  </span>
                </div>
                <Progress value={(metrics?.intents.accuracy || 0) * 100} />

                <div className="flex justify-between items-center">
                  <span>Taxa de Escalonamento</span>
                  <span className="font-mono text-orange-600">
                    {Math.round((metrics?.intents.escalationRate || 0) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(metrics?.intents.escalationRate || 0) * 100}
                  className="[&>div]:bg-orange-500"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intenções Mais Comuns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.intents.topIntents.map((intent) => (
                    <div key={intent.intent} className="flex items-center justify-between">
                      <span className="capitalize">{intent.intent.replace('_', ' ')}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono">{intent.count}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${(intent.count / (metrics?.intents.totalClassifications || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chatbot" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  Automação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    {Math.round((metrics?.chatbot.automationRate || 0) * 100)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Das interações foram automatizadas
                  </p>
                  <Progress 
                    value={(metrics?.chatbot.automationRate || 0) * 100} 
                    className="mt-4"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Tempo de Resposta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    {metrics?.chatbot.avgResponseTime || 0}s
                  </p>
                  <p className="text-sm text-gray-600">
                    Tempo médio de resposta
                  </p>
                  <div className="mt-4 text-xs text-green-600">
                    ⚡ Muito rápido
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Satisfação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600 mb-2">
                    {metrics?.chatbot.satisfactionRating || 0}/5
                  </p>
                  <p className="text-sm text-gray-600">
                    Avaliação média dos usuários
                  </p>
                  <div className="flex justify-center mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Heart
                        key={i}
                        className={cn(
                          "h-4 w-4 mx-1",
                          i < Math.round(metrics?.chatbot.satisfactionRating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transferências para Humanos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span>Total de Transferências</span>
                <span className="text-2xl font-bold">
                  {metrics?.chatbot.humanTransfers || 0}
                </span>
              </div>
              <Progress 
                value={((metrics?.chatbot.humanTransfers || 0) / (metrics?.chatbot.totalInteractions || 1)) * 100}
                className="[&>div]:bg-orange-500"
              />
              <p className="text-sm text-gray-600 mt-2">
                {Math.round(((metrics?.chatbot.humanTransfers || 0) / (metrics?.chatbot.totalInteractions || 1)) * 100)}% das interações foram transferidas
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}