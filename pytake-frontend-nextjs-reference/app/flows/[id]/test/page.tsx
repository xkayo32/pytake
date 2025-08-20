'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Play, 
  RotateCcw, 
  Send, 
  Bug, 
  Variable, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Settings,
  Eye,
  Map,
  Zap,
  PauseCircle,
  PlayCircle,
  SkipForward,
  ChevronRight,
  ArrowLeft,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  sender: 'user' | 'bot'
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'audio' | 'document' | 'buttons' | 'list'
  buttons?: Array<{ id: string; text: string }>
  nodeId?: string
}

interface DebugLog {
  id: string
  timestamp: Date
  nodeId: string
  nodeName: string
  nodeType: string
  status: 'running' | 'success' | 'error' | 'skipped'
  message: string
  duration?: number
  data?: any
}

interface FlowVariable {
  name: string
  value: any
  type: string
}

export default function FlowTestPage() {
  const params = useParams()
  const router = useRouter()
  const flowId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [flow, setFlow] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [variables, setVariables] = useState<FlowVariable[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [executionPath, setExecutionPath] = useState<string[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [breakpoints, setBreakpoints] = useState<Set<string>>(new Set())
  const [testMode, setTestMode] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Carregar flow
  useEffect(() => {
    loadFlow()
  }, [flowId])
  
  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const loadFlow = async () => {
    try {
      console.log('🔄 Carregando flow do backend:', flowId)
      
      // Carregar apenas do backend - não há mais localStorage
      const response = await fetch(`/api/v1/flows/${flowId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(`Flow com ID "${flowId}" não foi encontrado no servidor.`)
          addDebugLog('system', 'Sistema', 'system', 'error', `Flow "${flowId}" não encontrado (404)`)
        } else {
          setError(`Erro ao carregar flow: ${response.status} - ${response.statusText}`)
          addDebugLog('system', 'Sistema', 'system', 'error', `Erro HTTP ${response.status}: ${response.statusText}`)
        }
        return
      }
      
      const data = await response.json()
      console.log('✅ Flow carregado do backend:', data)
      
      setFlow(data)
      
      // Inicializar variáveis padrão
      setVariables([
        { name: 'contact.name', value: 'Usuário Teste', type: 'string' },
        { name: 'contact.phone', value: '+5511999999999', type: 'string' },
        { name: 'flow.id', value: flowId, type: 'string' },
        { name: 'flow.name', value: data.name, type: 'string' },
      ])
      
      addDebugLog('system', 'Sistema', 'system', 'success', `Flow "${data.name}" carregado com sucesso`)
      
    } catch (error) {
      console.error('❌ Erro ao carregar flow:', error)
      setError(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      addDebugLog('system', 'Sistema', 'system', 'error', `Erro de conexão: ${error}`)
    }
  }
  
  const startFlow = async () => {
    setIsExecuting(true)
    setMessages([])
    setDebugLogs([])
    setExecutionPath([])
    setCurrentNodeId(null)
    
    // Encontrar nó inicial (trigger)
    const nodes = flow?.flow?.nodes || flow?.nodes || []
    const edges = flow?.flow?.edges || flow?.edges || []
    
    const triggerNode = nodes.find((n: any) => 
      n.type === 'trigger_keyword' || 
      n.type === 'trigger_template_button' ||
      n.type === 'trigger_webhook'
    )
    
    if (triggerNode) {
      addDebugLog(triggerNode.id, triggerNode.data.label || 'Trigger', triggerNode.type, 'running', 'Iniciando flow...')
      await executeNode(triggerNode)
    } else {
      addDebugLog('error', 'Sistema', 'system', 'error', 'Nenhum trigger encontrado no flow')
    }
    
    setIsExecuting(false)
  }
  
  const executeNode = async (node: any) => {
    setCurrentNodeId(node.id)
    setExecutionPath(prev => [...prev, node.id])
    
    // Verificar breakpoint
    if (breakpoints.has(node.id)) {
      setIsPaused(true)
      addDebugLog(node.id, node.data.label, node.type, 'running', '⏸️ Pausado em breakpoint')
      return
    }
    
    const startTime = Date.now()
    
    try {
      // Simular execução baseada no tipo de nó
      switch (node.type) {
        case 'message':
          await handleMessageNode(node)
          break
        case 'condition':
          await handleConditionNode(node)
          break
        case 'delay':
          await handleDelayNode(node)
          break
        case 'api':
          await handleApiNode(node)
          break
        case 'assign_variable':
          await handleVariableNode(node)
          break
        default:
          addDebugLog(node.id, node.data.label, node.type, 'skipped', 'Tipo de nó não implementado')
      }
      
      const duration = Date.now() - startTime
      addDebugLog(node.id, node.data.label, node.type, 'success', `Executado em ${duration}ms`, duration)
      
      // Encontrar próximo nó
      const nodes = flow?.flow?.nodes || flow?.nodes || []
      const edges = flow?.flow?.edges || flow?.edges || []
      
      const nextEdge = edges.find((e: any) => e.source === node.id)
      if (nextEdge) {
        const nextNode = nodes.find((n: any) => n.id === nextEdge.target)
        if (nextNode && !isPaused) {
          await executeNode(nextNode)
        }
      }
    } catch (error) {
      addDebugLog(node.id, node.data.label, node.type, 'error', `Erro: ${error}`)
    }
  }
  
  const handleMessageNode = async (node: any) => {
    const message = node.data.message || 'Mensagem de teste'
    const processedMessage = processVariables(message)
    
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsTyping(false)
    
    addMessage('bot', processedMessage, node.id)
  }
  
  const handleConditionNode = async (node: any) => {
    const condition = node.data.condition
    addDebugLog(node.id, node.data.label, 'condition', 'running', `Avaliando condição: ${condition}`)
    // Simular avaliação de condição
  }
  
  const handleDelayNode = async (node: any) => {
    const delay = node.data.delay || 1000
    addDebugLog(node.id, node.data.label, 'delay', 'running', `Aguardando ${delay}ms`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  const handleApiNode = async (node: any) => {
    addDebugLog(node.id, node.data.label, 'api', 'running', `Chamando API: ${node.data.url}`)
    // Simular chamada API
  }
  
  const handleVariableNode = async (node: any) => {
    const varName = node.data.variableName
    const varValue = node.data.variableValue
    
    setVariables(prev => {
      const existing = prev.findIndex(v => v.name === varName)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing].value = varValue
        return updated
      }
      return [...prev, { name: varName, value: varValue, type: typeof varValue }]
    })
    
    addDebugLog(node.id, node.data.label, 'variable', 'success', `${varName} = ${varValue}`)
  }
  
  const processVariables = (text: string): string => {
    let processed = text
    variables.forEach(variable => {
      const regex = new RegExp(`{{${variable.name}}}`, 'g')
      processed = processed.replace(regex, variable.value)
    })
    return processed
  }
  
  const sendMessage = () => {
    if (!inputMessage.trim()) return
    
    addMessage('user', inputMessage)
    setInputMessage('')
    
    // Simular resposta do bot
    setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addMessage('bot', 'Esta é uma resposta simulada do flow')
      }, 1500)
    }, 500)
  }
  
  const addMessage = (sender: 'user' | 'bot', content: string, nodeId?: string) => {
    const message: Message = {
      id: `msg-${Date.now()}`,
      sender,
      content,
      timestamp: new Date(),
      type: 'text',
      nodeId
    }
    setMessages(prev => [...prev, message])
  }
  
  const addDebugLog = (nodeId: string, nodeName: string, nodeType: string, status: DebugLog['status'], message: string, duration?: number) => {
    const log: DebugLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      nodeId,
      nodeName,
      nodeType,
      status,
      message,
      duration
    }
    setDebugLogs(prev => [...prev, log])
  }
  
  const toggleBreakpoint = (nodeId: string) => {
    setBreakpoints(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }
  
  const continueExecution = () => {
    setIsPaused(false)
    if (currentNodeId) {
      const nodes = flow?.flow?.nodes || flow?.nodes || []
      const currentNode = nodes.find((n: any) => n.id === currentNodeId)
      if (currentNode) {
        executeNode(currentNode)
      }
    }
  }
  
  const resetFlow = () => {
    setMessages([])
    setDebugLogs([])
    setVariables([])
    setExecutionPath([])
    setCurrentNodeId(null)
    setIsExecuting(false)
    setIsPaused(false)
    loadFlow()
  }
  
  const getStatusIcon = (status: DebugLog['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'skipped':
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }
  
  return (
    <div className="flex h-screen bg-background">
      {/* Chat Simulator */}
      <div className="flex-1 flex flex-col max-w-3xl">
        {/* WhatsApp Header */}
        <div className="bg-green-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-green-700"
              onClick={() => router.push('/flows')}
              title="Voltar para lista de flows"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarFallback className="bg-green-500 text-white text-lg">🤖</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{flow?.name || 'Flow de Teste'}</h2>
              <p className="text-xs opacity-90">
                {isTyping ? 'digitando...' : isExecuting ? 'executando flow...' : 'online'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-green-700"
              onClick={() => router.push('/')}
              title="Voltar para dashboard"
            >
              <Home className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-700">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-2 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Erro ao carregar flow</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4 bg-muted/30">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2 shadow-sm",
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-card-foreground border'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-card text-card-foreground rounded-lg px-4 py-2 shadow-sm border">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Input Area */}
        <div className="p-4 bg-muted/50 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Smile className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite uma mensagem..."
              className="flex-1"
            />
            <Button onClick={sendMessage} size="icon">
              {inputMessage ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Debug Panel */}
      <div className="w-[500px] border-l bg-background flex flex-col">
        {/* Control Bar */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Console
            </h3>
            <Badge variant={testMode ? 'default' : 'destructive'}>
              {testMode ? 'Modo Teste' : 'Modo Produção'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={startFlow}
              disabled={isExecuting}
              size="sm"
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-1" />
              Iniciar
            </Button>
            {isPaused && (
              <Button
                onClick={continueExecution}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Continuar
              </Button>
            )}
            <Button
              onClick={resetFlow}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reiniciar
            </Button>
          </div>
        </div>
        
        {/* Debug Tabs */}
        <Tabs defaultValue="logs" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="variables">Variáveis</TabsTrigger>
            <TabsTrigger value="flow">Flow</TabsTrigger>
            <TabsTrigger value="settings">Config</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {debugLogs.map((log) => (
                  <Card key={log.id} className="p-3">
                    <div className="flex items-start gap-2">
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {log.nodeName}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{log.nodeType}</p>
                        <p className="text-sm mt-1">{log.message}</p>
                        {log.duration && (
                          <Badge variant="outline" className="mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {log.duration}ms
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="variables" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {variables.map((variable) => (
                  <Card key={variable.name} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm font-medium">{variable.name}</p>
                        <p className="text-xs text-muted-foreground">{variable.type}</p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {JSON.stringify(variable.value)}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="flow" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Caminho de Execução
                  </h4>
                  <div className="space-y-1">
                    {executionPath.map((nodeId, index) => {
                      const nodes = flow?.flow?.nodes || flow?.nodes || []
                      const node = nodes.find((n: any) => n.id === nodeId)
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <Badge
                            variant={currentNodeId === nodeId ? 'default' : 'outline'}
                            className={cn(
                              "text-xs",
                              breakpoints.has(nodeId) && "border-red-500"
                            )}
                          >
                            {node?.data?.label || nodeId}
                          </Badge>
                          {breakpoints.has(nodeId) && (
                            <PauseCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Nós do Flow
                  </h4>
                  <div className="space-y-2">
                    {(flow?.flow?.nodes || flow?.nodes || []).map((node: any) => (
                      <div
                        key={node.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleBreakpoint(node.id)}
                          >
                            {breakpoints.has(node.id) ? (
                              <PauseCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <PlayCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="text-sm">{node.data?.label || node.id}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {node.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="settings" className="flex-1 overflow-hidden">
            <div className="p-4 space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Modo de Teste</h4>
                    <p className="text-xs text-muted-foreground">
                      Simula execução sem enviar mensagens reais
                    </p>
                  </div>
                  <Button
                    variant={testMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTestMode(!testMode)}
                  >
                    {testMode ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-medium mb-3">Configurações de Debug</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mostrar timestamps</span>
                    <Button variant="outline" size="sm">Ativado</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Log detalhado</span>
                    <Button variant="outline" size="sm">Ativado</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-scroll logs</span>
                    <Button variant="outline" size="sm">Ativado</Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}