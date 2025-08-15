'use client'

import { useState } from 'react'
import { 
  MessageSquare,
  Brain,
  TrendingUp,
  MessageCircle,
  Zap,
  FileText,
  Languages,
  Settings,
  PlusCircle,
  Send,
  Copy,
  Check,
  Star,
  Users,
  Clock,
  BarChart3,
  Bot,
  Sparkles,
  Filter,
  Search,
  Download,
  RefreshCw,
  Lightbulb,
  Target,
  Globe,
  Shield,
  Cpu,
  Activity
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { AppLayout } from '@/components/layout/app-layout'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scrollarea'

// Import AI types and mock data
import {
  AIModel,
  AIMessage,
  SentimentAnalysis,
  IntentClassification,
  ConversationSummary,
  ResponseSuggestion,
  GeneratedTemplate,
  AISettings,
  AIUsageStats,
  MOCK_AI_CONVERSATIONS,
  MOCK_SENTIMENT_ANALYSES,
  MOCK_INTENT_CLASSIFICATIONS,
  MOCK_CONVERSATION_SUMMARIES,
  MOCK_RESPONSE_SUGGESTIONS,
  MOCK_GENERATED_TEMPLATES,
  MOCK_AI_SETTINGS,
  MOCK_AI_USAGE_STATS
} from '@/lib/types/ai'

export default function AIAssistantPage() {
  const [activeModel, setActiveModel] = useState<AIModel>('gpt-4')
  const [chatInput, setChatInput] = useState('')
  const [selectedConversation, setSelectedConversation] = useState(0)
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [intentFilter, setIntentFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const handleSendMessage = () => {
    if (!chatInput.trim()) return
    
    console.log('Sending message to AI:', chatInput)
    setChatInput('')
  }

  const handleCopyResponse = (text: string) => {
    navigator.clipboard.writeText(text)
    console.log('Response copied to clipboard')
  }

  const handleApplyTemplate = (template: GeneratedTemplate) => {
    console.log('Applying template:', template.name)
  }

  const handleGenerateTemplate = () => {
    console.log('Generating new template')
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200'
      case 'negative': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getIntentColor = (intent: string) => {
    const colors: Record<string, string> = {
      support: 'text-blue-600 bg-blue-50 border-blue-200',
      sales: 'text-green-600 bg-green-50 border-green-200',
      billing: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      cancellation: 'text-red-600 bg-red-50 border-red-200',
      complaint: 'text-orange-600 bg-orange-50 border-orange-200',
      praise: 'text-purple-600 bg-purple-50 border-purple-200'
    }
    return colors[intent] || 'text-gray-600 bg-gray-50 border-gray-200'
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
                <h1 className="text-2xl font-bold">AI Assistant</h1>
                <p className="text-sm text-muted-foreground">
                  Inteligência artificial para otimizar atendimentos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Activity className="h-3 w-3 mr-1" />
                {activeModel.toUpperCase()}
              </Badge>
              <Badge variant="outline">
                R$ {MOCK_AI_USAGE_STATS.totalCost.toFixed(2)} / R$ {MOCK_AI_SETTINGS.costs.monthlyBudget.toFixed(2)}
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
                      <p className="text-sm text-muted-foreground">Requisições Hoje</p>
                      <p className="text-2xl font-bold">{MOCK_AI_USAGE_STATS.totalRequests.toLocaleString()}</p>
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
                      <p className="text-2xl font-bold">{(MOCK_AI_USAGE_STATS.successRate * 100).toFixed(1)}%</p>
                    </div>
                    <Target className="h-8 w-8 text-green-500" />
                  </div>
                  <Progress value={MOCK_AI_USAGE_STATS.successRate * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo Médio</p>
                      <p className="text-2xl font-bold">{(MOCK_AI_USAGE_STATS.avgProcessingTime / 1000).toFixed(1)}s</p>
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
                      <p className="text-2xl font-bold">{MOCK_AI_USAGE_STATS.userSatisfaction.toFixed(1)}/5.0</p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-3 w-3 ${
                          i < Math.floor(MOCK_AI_USAGE_STATS.userSatisfaction) 
                            ? 'text-yellow-500 fill-current' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="chat" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="chat">Chat com IA</TabsTrigger>
                <TabsTrigger value="analysis">Análise</TabsTrigger>
                <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
                <TabsTrigger value="summaries">Resumos</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Chat Interface */}
                  <div className="lg:col-span-2">
                    <Card className="h-[600px] flex flex-col">
                      <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <MessageSquare className="h-5 w-5" />
                              Chat com IA
                            </CardTitle>
                            <CardDescription>
                              Converse diretamente com o assistente de IA
                            </CardDescription>
                          </div>
                          <Select value={activeModel} onValueChange={(v: AIModel) => setActiveModel(v)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gpt-4">GPT-4</SelectItem>
                              <SelectItem value="gpt-3.5-turbo">GPT-3.5</SelectItem>
                              <SelectItem value="claude-3">Claude-3</SelectItem>
                              <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="flex-1 p-0">
                        <ScrollArea className="h-full p-4">
                          <div className="space-y-4">
                            {MOCK_AI_CONVERSATIONS[selectedConversation]?.map((message) => (
                              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${
                                  message.role === 'user' 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted'
                                }`}>
                                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                  <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                                    <span>{formatDate(message.timestamp)}</span>
                                    {message.role === 'assistant' && (
                                      <div className="flex items-center gap-2">
                                        {message.confidence && (
                                          <Badge variant="secondary" className="text-xs">
                                            {(message.confidence * 100).toFixed(0)}%
                                          </Badge>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleCopyResponse(message.content)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>

                      <div className="border-t p-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Digite sua mensagem..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1"
                          />
                          <Button onClick={handleSendMessage} disabled={!chatInput.trim()}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          <Brain className="h-4 w-4 mr-2" />
                          Analisar Sentimento
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Target className="h-4 w-4 mr-2" />
                          Classificar Intenção
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <FileText className="h-4 w-4 mr-2" />
                          Resumir Conversa
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Sugerir Resposta
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Languages className="h-4 w-4 mr-2" />
                          Traduzir Texto
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Gerar Template
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Uso Atual</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Orçamento Mensal</span>
                              <span>R$ {MOCK_AI_SETTINGS.costs.currentSpent.toFixed(2)} / R$ {MOCK_AI_SETTINGS.costs.monthlyBudget.toFixed(2)}</span>
                            </div>
                            <Progress 
                              value={(MOCK_AI_SETTINGS.costs.currentSpent / MOCK_AI_SETTINGS.costs.monthlyBudget) * 100} 
                              className="mt-1"
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {MOCK_AI_USAGE_STATS.totalTokens.toLocaleString()} tokens utilizados
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
                  {/* Sentiment Analysis */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Análise de Sentimento
                          </CardTitle>
                          <CardDescription>
                            Análise emocional das mensagens
                          </CardDescription>
                        </div>
                        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="positive">Positivo</SelectItem>
                            <SelectItem value="negative">Negativo</SelectItem>
                            <SelectItem value="neutral">Neutro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {MOCK_SENTIMENT_ANALYSES
                          .filter(analysis => sentimentFilter === 'all' || analysis.label === sentimentFilter)
                          .map((analysis, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={getSentimentColor(analysis.label)}>
                                  {analysis.label === 'positive' ? 'Positivo' : 
                                   analysis.label === 'negative' ? 'Negativo' : 'Neutro'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {(analysis.confidence * 100).toFixed(1)}% confiança
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Score</span>
                                  <span>{(analysis.score * 100).toFixed(1)}%</span>
                                </div>
                                <Progress value={analysis.score * 100} />
                                {analysis.keywords && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Palavras-chave:</p>
                                    <div className="flex gap-1 flex-wrap">
                                      {analysis.keywords.map((keyword, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {keyword}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {analysis.explanation && (
                                  <p className="text-sm text-muted-foreground italic">
                                    {analysis.explanation}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>

                  {/* Intent Classification */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Classificação de Intenção
                          </CardTitle>
                          <CardDescription>
                            Identificação automática de intenções
                          </CardDescription>
                        </div>
                        <Select value={intentFilter} onValueChange={setIntentFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="support">Suporte</SelectItem>
                            <SelectItem value="sales">Vendas</SelectItem>
                            <SelectItem value="billing">Cobrança</SelectItem>
                            <SelectItem value="cancellation">Cancelamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {MOCK_INTENT_CLASSIFICATIONS
                          .filter(intent => intentFilter === 'all' || intent.intent === intentFilter)
                          .map((classification, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={getIntentColor(classification.intent)}>
                                  {classification.intent === 'support' ? 'Suporte' :
                                   classification.intent === 'sales' ? 'Vendas' :
                                   classification.intent === 'billing' ? 'Cobrança' :
                                   classification.intent === 'cancellation' ? 'Cancelamento' :
                                   classification.intent}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  {classification.priority && (
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        classification.priority === 'urgent' ? 'text-red-600 border-red-200' :
                                        classification.priority === 'high' ? 'text-orange-600 border-orange-200' :
                                        'text-blue-600 border-blue-200'
                                      }
                                    >
                                      {classification.priority === 'urgent' ? 'Urgente' :
                                       classification.priority === 'high' ? 'Alta' :
                                       classification.priority === 'medium' ? 'Média' : 'Baixa'}
                                    </Badge>
                                  )}
                                  <span className="text-sm text-muted-foreground">
                                    {(classification.confidence * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              {classification.subIntent && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  Sub-intenção: {classification.subIntent}
                                </p>
                              )}
                              {classification.suggestedActions && (
                                <div>
                                  <p className="text-sm text-muted-foreground mb-1">Ações sugeridas:</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {classification.suggestedActions.map((action, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {action}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Suggestions Tab */}
              <TabsContent value="suggestions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Sugestões de Resposta
                    </CardTitle>
                    <CardDescription>
                      Respostas inteligentes baseadas no contexto
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {MOCK_RESPONSE_SUGGESTIONS.map((suggestion) => (
                        <div key={suggestion.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {suggestion.category === 'acknowledgment' ? 'Reconhecimento' :
                                 suggestion.category === 'solution' ? 'Solução' :
                                 suggestion.category === 'escalation' ? 'Escalação' :
                                 suggestion.category === 'closing' ? 'Fechamento' :
                                 suggestion.category}
                              </Badge>
                              <Badge variant="secondary">
                                {suggestion.tone === 'empathetic' ? 'Empático' :
                                 suggestion.tone === 'professional' ? 'Profissional' :
                                 suggestion.tone === 'friendly' ? 'Amigável' :
                                 suggestion.tone}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {(suggestion.confidence * 100).toFixed(0)}% confiança
                            </span>
                          </div>
                          
                          <div className="bg-muted p-3 rounded mb-3">
                            <p className="text-sm">{suggestion.text}</p>
                          </div>

                          {suggestion.reasoning && (
                            <p className="text-xs text-muted-foreground mb-3 italic">
                              💡 {suggestion.reasoning}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {suggestion.estimatedReadTime}s leitura
                              {suggestion.requiresApproval && (
                                <Badge variant="outline" className="text-xs">
                                  Aprovação necessária
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyResponse(suggestion.text)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copiar
                              </Button>
                              <Button size="sm">
                                <Send className="h-3 w-3 mr-1" />
                                Usar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summaries Tab */}
              <TabsContent value="summaries" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Resumos de Conversas
                        </CardTitle>
                        <CardDescription>
                          Resumos automáticos das conversas
                        </CardDescription>
                      </div>
                      <Button>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Gerar Resumo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {MOCK_CONVERSATION_SUMMARIES.map((summary) => (
                        <div key={summary.conversationId} className="p-6 border rounded-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Badge className={getSentimentColor(summary.sentiment)}>
                                {summary.sentiment === 'positive' ? 'Positivo' : 
                                 summary.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={
                                  summary.outcome === 'resolved' ? 'text-green-600 border-green-200' :
                                  summary.outcome === 'pending' ? 'text-yellow-600 border-yellow-200' :
                                  summary.outcome === 'escalated' ? 'text-red-600 border-red-200' :
                                  'text-gray-600 border-gray-200'
                                }
                              >
                                {summary.outcome === 'resolved' ? 'Resolvido' :
                                 summary.outcome === 'pending' ? 'Pendente' :
                                 summary.outcome === 'escalated' ? 'Escalado' : 'Abandonado'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {summary.duration} min • {summary.messageCount} msgs
                            </div>
                          </div>

                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Resumo:</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {summary.summary}
                            </p>
                          </div>

                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Pontos-chave:</h4>
                            <ul className="space-y-1">
                              {summary.keyPoints.map((point, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {summary.resolution && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-2">Resolução:</h4>
                              <p className="text-sm text-muted-foreground">
                                {summary.resolution}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {summary.tags.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              {summary.participantSatisfaction && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Star className="h-3 w-3" />
                                  {summary.participantSatisfaction}/5
                                </div>
                              )}
                              <Button size="sm" variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Exportar
                              </Button>
                            </div>
                          </div>

                          {summary.followUpRequired && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                              <div className="flex items-center gap-2 text-sm text-yellow-800">
                                <Clock className="h-3 w-3" />
                                <span className="font-medium">Follow-up necessário:</span>
                                {summary.followUpReason}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Templates Gerados por IA
                        </CardTitle>
                        <CardDescription>
                          Templates criados automaticamente pela IA
                        </CardDescription>
                      </div>
                      <Button onClick={handleGenerateTemplate}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Gerar Template
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {MOCK_GENERATED_TEMPLATES.map((template) => (
                        <div key={template.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-sm text-muted-foreground">{template.useCase}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {template.category === 'welcome' ? 'Boas-vindas' :
                                 template.category === 'confirmation' ? 'Confirmação' :
                                 template.category === 'support' ? 'Suporte' :
                                 template.category}
                              </Badge>
                              <Badge variant="secondary">
                                {template.tone === 'friendly' ? 'Amigável' :
                                 template.tone === 'professional' ? 'Profissional' :
                                 template.tone === 'empathetic' ? 'Empático' :
                                 template.tone}
                              </Badge>
                            </div>
                          </div>

                          <div className="bg-muted p-3 rounded mb-3">
                            <p className="text-sm whitespace-pre-wrap">{template.content}</p>
                          </div>

                          {template.variables && template.variables.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm text-muted-foreground mb-1">Variáveis:</p>
                              <div className="flex gap-1 flex-wrap">
                                {template.variables.map((variable, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs font-mono">
                                    {variable}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Efetividade: {template.estimatedEffectiveness}%</span>
                              <span>Confiança: {(template.confidence * 100).toFixed(0)}%</span>
                              <span>Idioma: {template.language === 'pt' ? 'Português' : template.language}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyResponse(template.content)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copiar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApplyTemplate(template)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Aplicar
                              </Button>
                            </div>
                          </div>

                          {template.complianceChecks && (
                            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                LGPD: {template.complianceChecks.lgpd ? '✓' : '✗'}
                              </div>
                              <div className="flex items-center gap-1">
                                Spam: {template.complianceChecks.spam ? '✓' : '✗'}
                              </div>
                              <div className="flex items-center gap-1">
                                Ofensivo: {template.complianceChecks.offensive ? '✓' : '✗'}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Model Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5" />
                        Configurações de Modelo
                      </CardTitle>
                      <CardDescription>
                        Configure os modelos de IA e parâmetros
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Modelo Padrão</Label>
                        <Select value={MOCK_AI_SETTINGS.defaultModel} disabled>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            <SelectItem value="claude-3">Claude-3</SelectItem>
                            <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Tokens Máximos</Label>
                        <Input type="number" value={MOCK_AI_SETTINGS.maxTokens} disabled />
                      </div>

                      <div>
                        <Label>Temperatura ({MOCK_AI_SETTINGS.temperature})</Label>
                        <div className="mt-2">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={MOCK_AI_SETTINGS.temperature}
                            disabled
                            className="w-full"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Controla a criatividade das respostas
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feature Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Recursos Ativos
                      </CardTitle>
                      <CardDescription>
                        Ativar/desativar recursos de IA
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Análise de Sentimento</Label>
                          <p className="text-sm text-muted-foreground">
                            Análise automática de emoções
                          </p>
                        </div>
                        <Switch checked={MOCK_AI_SETTINGS.enableSentimentAnalysis} disabled />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Classificação de Intenção</Label>
                          <p className="text-sm text-muted-foreground">
                            Identificação de intenções
                          </p>
                        </div>
                        <Switch checked={MOCK_AI_SETTINGS.enableIntentClassification} disabled />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Sugestões de Resposta</Label>
                          <p className="text-sm text-muted-foreground">
                            Respostas inteligentes
                          </p>
                        </div>
                        <Switch checked={MOCK_AI_SETTINGS.enableResponseSuggestions} disabled />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Tradução Automática</Label>
                          <p className="text-sm text-muted-foreground">
                            Tradução de mensagens
                          </p>
                        </div>
                        <Switch checked={MOCK_AI_SETTINGS.enableAutoTranslation} disabled />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Resumo de Conversas</Label>
                          <p className="text-sm text-muted-foreground">
                            Resumos automáticos
                          </p>
                        </div>
                        <Switch checked={MOCK_AI_SETTINGS.enableConversationSummary} disabled />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cost Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Controle de Custos
                      </CardTitle>
                      <CardDescription>
                        Monitoramento de gastos com IA
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Orçamento Mensal</Label>
                        <Input 
                          type="number" 
                          value={MOCK_AI_SETTINGS.costs.monthlyBudget} 
                          disabled 
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Gasto Atual</span>
                          <span>R$ {MOCK_AI_SETTINGS.costs.currentSpent.toFixed(2)}</span>
                        </div>
                        <Progress 
                          value={(MOCK_AI_SETTINGS.costs.currentSpent / MOCK_AI_SETTINGS.costs.monthlyBudget) * 100} 
                        />
                      </div>

                      <div>
                        <Label>Alerta em (% do orçamento)</Label>
                        <Input 
                          type="number" 
                          value={MOCK_AI_SETTINGS.costs.alertThreshold} 
                          disabled 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* API Keys */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Chaves de API
                      </CardTitle>
                      <CardDescription>
                        Configure as chaves dos provedores
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>OpenAI API Key</Label>
                        <Input 
                          type="password" 
                          value={MOCK_AI_SETTINGS.apiKeys.openai || ''} 
                          disabled 
                        />
                      </div>

                      <div>
                        <Label>Anthropic API Key</Label>
                        <Input 
                          type="password" 
                          value={MOCK_AI_SETTINGS.apiKeys.anthropic || ''} 
                          disabled 
                        />
                      </div>

                      <div>
                        <Label>Google API Key</Label>
                        <Input 
                          type="password" 
                          value={MOCK_AI_SETTINGS.apiKeys.google || ''} 
                          disabled 
                          placeholder="Não configurado"
                        />
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