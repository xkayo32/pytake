'use client'

import { useState } from 'react'
import { 
  Brain,
  Bot,
  Activity,
  TrendingUp,
  Target,
  Clock,
  Star,
  MessageSquare,
  Lightbulb,
  Heart,
  BarChart3,
  Shield,
  Settings
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { AppLayout } from '@/components/layout/app-layout'

// Import our new AI components
import { AIInsightsDashboard } from '@/components/ai/ai-insights-dashboard'
import { ChatbotInterface } from '@/components/ai/chatbot-interface'
import { SentimentIndicator } from '@/components/ai/sentiment-indicator'
import { IntentDisplay } from '@/components/ai/intent-display'
import { SuggestionPanel } from '@/components/ai/suggestion-panel'

// Import AI hooks and services
import { useSuggestions } from '@/lib/hooks/useSuggestions'
import { useSentimentAnalysis } from '@/lib/hooks/useSentimentAnalysis'
import { useIntentClassification } from '@/lib/hooks/useIntentClassification'

// Mock data for demonstration
const mockConversation = {
  id: 'conv-123',
  customerId: 'customer-456',
  messages: [
    {
      id: 'msg-1',
      content: 'Olá, estou com problema no meu pedido',
      sender: 'customer' as const,
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      id: 'msg-2',
      content: 'Olá! Vou verificar seu pedido agora mesmo. Pode me informar o número?',
      sender: 'agent' as const,
      timestamp: new Date(Date.now() - 4 * 60 * 1000)
    },
    {
      id: 'msg-3',
      content: 'É o pedido #12345. Ele não chegou ainda e já passou do prazo',
      sender: 'customer' as const,
      timestamp: new Date(Date.now() - 3 * 60 * 1000)
    }
  ],
  category: 'support' as const,
  status: 'active' as const,
  tags: ['delivery', 'delay']
}

const mockMessages = mockConversation.messages.map(msg => ({
  ...msg,
  timestamp: msg.timestamp
}))

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('overview')

  // Use our new AI hooks
  const suggestions = useSuggestions(mockConversation)
  const sentimentAnalysis = useSentimentAnalysis(mockMessages)
  const intentClassification = useIntentClassification(mockMessages)

  // Mock stats for overview
  const stats = {
    totalRequests: 2847,
    successRate: 0.87,
    avgProcessingTime: 1.2,
    userSatisfaction: 4.3,
    monthlyBudget: 1000,
    currentSpent: 287.50
  }

  const handleTransferToHuman = (reason: string, context: any) => {
    console.log('Transferring to human:', reason, context)
  }

  const handleChatbotMessage = (message: any) => {
    console.log('New chatbot message:', message)
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Assistente de IA</h1>
                <p className="text-sm text-muted-foreground">
                  Sistema completo de inteligência artificial para atendimento
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Activity className="h-3 w-3 mr-1" />
                SISTEMA ATIVO
              </Badge>
              <Badge variant="outline">
                R$ {stats.currentSpent.toFixed(2)} / R$ {stats.monthlyBudget.toFixed(2)}
              </Badge>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container p-6 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Operações Hoje</p>
                      <p className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</p>
                    </div>
                    <Bot className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                    <TrendingUp className="h-3 w-3" />
                    +12% vs ontem
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold">{(stats.successRate * 100).toFixed(1)}%</p>
                    </div>
                    <Target className="h-8 w-8 text-green-500" />
                  </div>
                  <Progress value={stats.successRate * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo Médio</p>
                      <p className="text-2xl font-bold">{stats.avgProcessingTime.toFixed(1)}s</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                    <TrendingUp className="h-3 w-3" />
                    -0.3s vs ontem
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Satisfação</p>
                      <p className="text-2xl font-bold">{stats.userSatisfaction.toFixed(1)}/5.0</p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-3 w-3 ${
                          i < Math.floor(stats.userSatisfaction) 
                            ? 'text-yellow-500 fill-current' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
                <TabsTrigger value="analysis">Análise</TabsTrigger>
                <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Current Analysis Results */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold">Análise da Conversa Atual</h3>
                    
                    {/* Sentiment Analysis */}
                    {sentimentAnalysis.currentSentiment && (
                      <SentimentIndicator 
                        result={sentimentAnalysis.currentSentiment}
                        compact={false}
                        showDetails={true}
                        showSuggestions={true}
                      />
                    )}

                    {/* Intent Classification */}
                    {intentClassification.currentIntent && (
                      <IntentDisplay
                        result={intentClassification.currentIntent}
                        compact={false}
                        showActions={true}
                        showEntities={true}
                        showRouting={true}
                      />
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Status em Tempo Real</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Sugestões Disponíveis</span>
                          <Badge variant="secondary">{suggestions.suggestions.length}</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Análises Hoje</span>
                          <Badge variant="outline">{sentimentAnalysis.totalAnalyses}</Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Classificações</span>
                          <Badge variant="outline">{intentClassification.totalClassifications}</Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Urgência</span>
                          <Badge 
                            variant={
                              sentimentAnalysis.recentUrgency === 'critical' ? 'destructive' :
                              sentimentAnalysis.recentUrgency === 'high' ? 'secondary' : 'outline'
                            }
                          >
                            {sentimentAnalysis.recentUrgency}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Orçamento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Uso Mensal</span>
                              <span>R$ {stats.currentSpent.toFixed(2)} / R$ {stats.monthlyBudget.toFixed(2)}</span>
                            </div>
                            <Progress 
                              value={(stats.currentSpent / stats.monthlyBudget) * 100} 
                              className="mt-1"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(((stats.monthlyBudget - stats.currentSpent) / stats.monthlyBudget) * 100)}% restante
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Chatbot Tab */}
              <TabsContent value="chatbot" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    <ChatbotInterface
                      conversationId={mockConversation.id}
                      userId="demo-user"
                      onTransferToHuman={handleTransferToHuman}
                      onMessageReceived={handleChatbotMessage}
                      className="h-[700px]"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">73%</div>
                          <div className="text-sm text-muted-foreground">Taxa de Automação</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">1.2s</div>
                          <div className="text-sm text-muted-foreground">Tempo Médio</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">4.1/5</div>
                          <div className="text-sm text-muted-foreground">Satisfação</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Transferências</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Sentimento negativo</span>
                            <span>45%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Problema complexo</span>
                            <span>28%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Solicitação direta</span>
                            <span>27%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5" />
                        Análise de Sentimento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {sentimentAnalysis.currentSentiment ? (
                        <SentimentIndicator 
                          result={sentimentAnalysis.currentSentiment}
                          compact={false}
                          showDetails={true}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Nenhuma análise disponível</p>
                          <p className="text-sm">Envie uma mensagem para ver a análise</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Classificação de Intenções
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {intentClassification.currentIntent ? (
                        <IntentDisplay
                          result={intentClassification.currentIntent}
                          compact={false}
                          showActions={true}
                          showEntities={true}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Nenhuma classificação disponível</p>
                          <p className="text-sm">Envie uma mensagem para ver a intenção</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Historical Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Análises</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {sentimentAnalysis.hasHistory ? '65%' : '0%'}
                        </div>
                        <div className="text-sm text-muted-foreground">Sentimentos Positivos</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {intentClassification.averageConfidence ? 
                            Math.round(intentClassification.averageConfidence * 100) + '%' : '0%'
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">Precisão Média</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {sentimentAnalysis.escalationRecommendations.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Alertas Ativos</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Suggestions Tab */}
              <TabsContent value="suggestions" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <SuggestionPanel
                      conversation={mockConversation}
                      agentProfile={{
                        id: 'agent-1',
                        name: 'Demo Agent',
                        expertise: ['support', 'sales'],
                        averageResponseTime: 60,
                        satisfactionRating: 4.5,
                        preferredResponseStyle: 'empathetic',
                        languagePreferences: {
                          formality: 'mixed',
                          tone: 'friendly',
                          length: 'medium'
                        }
                      }}
                      currentMessage=""
                      onSuggestionSelect={(suggestion) => console.log('Selected:', suggestion)}
                      onSuggestionCopy={(text) => console.log('Copied:', text)}
                      className="h-[600px]"
                    />
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Estatísticas</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Taxa de Uso</span>
                          <span className="font-mono">{Math.round(suggestions.averageConfidence * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Sugestões Hoje</span>
                          <span className="font-mono">{suggestions.suggestions.length * 47}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Impacto Satisfação</span>
                          <span className="font-mono text-green-600">+15%</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Categorias</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {['information', 'solution', 'greeting', 'closing'].map((category) => (
                            <div key={category} className="flex justify-between text-sm">
                              <span className="capitalize">{category}</span>
                              <span>{Math.floor(Math.random() * 100) + 50}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-6">
                <AIInsightsDashboard 
                  refreshInterval={30000}
                  showRealTimeUpdates={true}
                />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configurações Gerais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        As configurações detalhadas estão disponíveis na seção de configurações do sistema.
                        Esta página mostra o status atual dos serviços de IA.
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Sugestões Automáticas</span>
                          <Badge variant="secondary" className="text-green-600">Ativo</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Análise de Sentimento</span>
                          <Badge variant="secondary" className="text-green-600">Ativo</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Classificação de Intenções</span>
                          <Badge variant="secondary" className="text-green-600">Ativo</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Chatbot Inteligente</span>
                          <Badge variant="secondary" className="text-green-600">Ativo</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Métricas de Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Precisão Geral</span>
                            <span>87%</span>
                          </div>
                          <Progress value={87} />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Taxa de Automação</span>
                            <span>73%</span>
                          </div>
                          <Progress value={73} />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Satisfação do Cliente</span>
                            <span>86%</span>
                          </div>
                          <Progress value={86} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AppLayout>
  )
}