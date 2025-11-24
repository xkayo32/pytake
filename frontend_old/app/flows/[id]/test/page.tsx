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
import { getMockFlowById, isMockFlow } from '@/lib/mock/flow-test-data'
import { FlowExecutionEngine, ExecutionMessage, ExecutionLog, FlowVariable } from '@/lib/mock/flow-execution-engine'
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
  Home,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Usando interfaces do sistema mock
type Message = ExecutionMessage
type DebugLog = ExecutionLog
// FlowVariable já importado

export default function FlowTestPage() {
  const params = useParams()
  const router = useRouter()
  const flowId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Estados principais
  const [flow, setFlow] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [variables, setVariables] = useState<FlowVariable[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [executionPath, setExecutionPath] = useState<string[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [breakpoints, setBreakpoints] = useState<Set<string>>(new Set())
  const [testMode, setTestMode] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para agrupar logs  
  const [groupedLogs, setGroupedLogs] = useState<Record<string, DebugLog[]>>({})
  const [lastLogTime, setLastLogTime] = useState<Record<string, number>>({})

  // Estados do sistema mock
  const [isWaitingForInput, setIsWaitingForInput] = useState(false)
  const [waitingInputType, setWaitingInputType] = useState<string | null>(null)
  const [executionEngine, setExecutionEngine] = useState<FlowExecutionEngine | null>(null)
  const [isMockMode, setIsMockMode] = useState(false)
  
  // Estados para WhatsApp real
  const [useRealWhatsApp, setUseRealWhatsApp] = useState(false)
  const [whatsAppNumber, setWhatsAppNumber] = useState<string | null>(null)
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false)
  const [debugPanelWidth, setDebugPanelWidth] = useState(400)
  const [isDebugCollapsed, setIsDebugCollapsed] = useState(false)
  
  // Carregar flow
  useEffect(() => {
    loadFlow()
  }, [flowId])
  
  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Atualizar estados baseado no execution engine
  useEffect(() => {
    if (executionEngine) {
      setCurrentNodeId(executionEngine.currentNodeId)
      setExecutionPath(executionEngine.executionPath)
    }
  }, [executionEngine])
  
  const initializeMockEngine = (mockFlow: any) => {
    const engine = new FlowExecutionEngine(mockFlow)
    
    // Configurar callbacks
    engine.onMessage((message: ExecutionMessage) => {
      setMessages(prev => [...prev, message])
      if (message.sender === 'bot') {
        setIsTyping(false)
      }
    })
    
    engine.onLog((log: ExecutionLog) => {
      const now = Date.now()
      const nodeKey = log.nodeId || log.nodeName
      
      setLastLogTime(prev => ({ ...prev, [nodeKey]: now }))
      
      // Agrupar logs por nó
      setGroupedLogs(prev => {
        const existing = prev[nodeKey] || []
        
        // Se é o mesmo status que o último log do mesmo nó, atualizar o último
        if (existing.length > 0 && existing[existing.length - 1].status === log.status) {
          return {
            ...prev,
            [nodeKey]: [...existing.slice(0, -1), log]
          }
        } else {
          return {
            ...prev,
            [nodeKey]: [...existing, log]
          }
        }
      })
      
      setDebugLogs(prev => {
        // Limitar logs totais para evitar acúmulo
        const logs = [...prev, log]
        return logs.slice(-100) // Manter apenas os últimos 100 logs
      })
    })
    
    engine.onVariableUpdate((vars: FlowVariable[]) => {
      setVariables(vars)
    })
    
    engine.onWaitingForInput((isWaiting: boolean, inputType?: string) => {
      setIsWaitingForInput(isWaiting)
      setWaitingInputType(inputType || null)
      if (!isWaiting) {
        setIsTyping(false)
      }
    })
    
    setExecutionEngine(engine)
    setVariables(engine.variables)
  }
  
  const loadFlow = async () => {
    try {
      console.log('🔄 Carregando flow:', flowId)
      
      // Verificar se é um flow mock
      if (isMockFlow(flowId)) {
        console.log('📦 Carregando flow mock:', flowId)
        const mockFlow = getMockFlowById(flowId)
        if (mockFlow) {
          setFlow(mockFlow)
          setIsMockMode(true)
          initializeMockEngine(mockFlow)
          addDebugLog('system', 'Sistema', 'mock', 'success', `Flow mock "${mockFlow.name}" carregado com sucesso`)
          return
        }
      }
      
      // Tentar carregar do backend
      const response = await fetch(`/api/v1/flows/${flowId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.warn(`⚠️ Backend não disponível (${response.status}), tentando modo mock...`)
        
        // Fallback para modo mock se backend não responder
        const mockFlow = getMockFlowById(flowId)
        if (mockFlow) {
          console.log('📦 Usando fallback mock para flow:', flowId)
          setFlow(mockFlow)
          setIsMockMode(true)
          initializeMockEngine(mockFlow)
          addDebugLog('system', 'Sistema', 'mock', 'success', 
            `Flow mock carregado como fallback (backend indisponível)`)
          return
        }
        
        // Se não há mock, mostrar erro
        if (response.status === 404) {
          setError(`Flow com ID "${flowId}" não foi encontrado no servidor e não há dados mock disponíveis.`)
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
      setIsMockMode(false)
      
      // Inicializar variáveis padrão para backend
      setVariables([
        { name: 'contact.name', value: 'Usuário Teste', type: 'string' },
        { name: 'contact.phone', value: '+5511999999999', type: 'string' },
        { name: 'flow.id', value: flowId, type: 'string' },
        { name: 'flow.name', value: data.name, type: 'string' },
      ])
      
      addDebugLog('system', 'Sistema', 'system', 'success', `Flow "${data.name}" carregado do backend`)
      
    } catch (error) {
      console.error('❌ Erro ao carregar flow:', error)
      
      // Tentar fallback mock em caso de erro de conexão
      const mockFlow = getMockFlowById(flowId)
      if (mockFlow) {
        console.log('📦 Usando fallback mock devido a erro de conexão')
        setFlow(mockFlow)
        setIsMockMode(true)
        initializeMockEngine(mockFlow)
        addDebugLog('system', 'Sistema', 'mock', 'success', 
          `Flow mock carregado como fallback (erro de conexão)`)
        return
      }
      
      setError(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      addDebugLog('system', 'Sistema', 'system', 'error', `Erro de conexão: ${error}`)
    }
  }
  
  const startFlow = async () => {
    setIsExecuting(true)
    setMessages([])
    setDebugLogs([])
    setGroupedLogs({})
    setExpandedLogs(new Set())
    setLastLogTime({})
    setExecutionPath([])
    setCurrentNodeId(null)
    setIsWaitingForInput(false)
    setWaitingInputType(null)
    
    if (isMockMode && executionEngine) {
      // Usar execution engine para modo mock
      try {
        await executionEngine.startFlow()
      } catch (error) {
        addDebugLog('system', 'Sistema', 'system', 'error', `Erro na execução: ${error}`)
      }
    } else {
      // Modo backend - execução legacy
      const nodes = flow?.flow?.nodes || flow?.nodes || []
      
      const triggerNode = nodes.find((n: any) => 
        n.type === 'trigger_keyword' || 
        n.type === 'trigger_template_button' ||
        n.type === 'trigger_webhook'
      )
      
      if (triggerNode) {
        addDebugLog(triggerNode.id, triggerNode.data.label || 'Trigger', triggerNode.type, 'running', 'Iniciando flow...')
        await executeNodeLegacy(triggerNode)
      } else {
        addDebugLog('error', 'Sistema', 'system', 'error', 'Nenhum trigger encontrado no flow')
      }
    }
    
    setIsExecuting(false)
  }

  // Execução legacy para modo backend
  const executeNodeLegacy = async (node: any) => {
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
      switch (node.type) {
        case 'message':
          await handleMessageNodeLegacy(node)
          break
        case 'condition':
          await handleConditionNodeLegacy(node)
          break
        case 'delay':
          await handleDelayNodeLegacy(node)
          break
        case 'api':
          await handleApiNodeLegacy(node)
          break
        case 'assign_variable':
          await handleVariableNodeLegacy(node)
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
          await executeNodeLegacy(nextNode)
        }
      }
    } catch (error) {
      addDebugLog(node.id, node.data.label, node.type, 'error', `Erro: ${error}`)
    }
  }
  
  // Handlers legacy para backend
  const handleMessageNodeLegacy = async (node: any) => {
    const message = node.data.message || 'Mensagem de teste'
    const processedMessage = processVariables(message)
    
    setIsTyping(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsTyping(false)
    
    addMessage('bot', processedMessage, node.id)
  }

  const handleConditionNodeLegacy = async (node: any) => {
    const condition = node.data.condition
    addDebugLog(node.id, node.data.label, 'condition', 'running', `Avaliando condição: ${condition}`)
  }

  const handleDelayNodeLegacy = async (node: any) => {
    const delay = node.data.delay || 1000
    addDebugLog(node.id, node.data.label, 'delay', 'running', `Aguardando ${delay}ms`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  const handleApiNodeLegacy = async (node: any) => {
    addDebugLog(node.id, node.data.label, 'api', 'running', `Chamando API: ${node.data.url}`)
  }

  const handleVariableNodeLegacy = async (node: any) => {
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
  
  const sendMessage = async () => {
    if (!inputMessage.trim()) return
    
    const userInput = inputMessage.trim()
    setInputMessage('')
    
    if (isMockMode && executionEngine) {
      // Usar execution engine para processar input
      if (executionEngine.isWaitingForInput) {
        if (executionEngine.waitingInputType === 'text') {
          await executionEngine.handleUserInput(userInput)
        }
      } else {
        // Se não está esperando input, adicionar mensagem do usuário e simular resposta
        addMessage('user', userInput)
        
        // Verificar se é comando para reiniciar (oi, olá, menu, etc.)
        const triggerKeywords = ['oi', 'olá', 'hello', 'start', 'começar', 'ajuda', 'menu']
        if (triggerKeywords.some(keyword => userInput.toLowerCase().includes(keyword))) {
          setTimeout(async () => {
            await startFlow()
          }, 500)
        } else {
          // Resposta padrão
          setTimeout(() => {
            setIsTyping(true)
            setTimeout(() => {
              setIsTyping(false)
              addMessage('bot', '🤔 Não entendi. Digite "menu" para ver as opções disponíveis.')
            }, 1500)
          }, 500)
        }
      }
    } else {
      // Modo backend - comportamento original
      addMessage('user', userInput)
      
      setTimeout(() => {
        setIsTyping(true)
        setTimeout(() => {
          setIsTyping(false)
          addMessage('bot', 'Esta é uma resposta simulada do flow')
        }, 1500)
      }, 500)
    }
  }
  
  const handleButtonClick = async (buttonId: string) => {
    if (isMockMode && executionEngine && executionEngine.isWaitingForInput) {
      await executionEngine.handleButtonClick(buttonId)
    }
  }
  
  const handleListSelection = async (itemId: string) => {
    if (isMockMode && executionEngine && executionEngine.isWaitingForInput) {
      await executionEngine.handleListSelection(itemId)
    }
  }
  
  const addMessage = (sender: 'user' | 'bot', content: string, nodeId?: string, type: Message['type'] = 'text', buttons?: any[], listItems?: any[]) => {
    const message: Message = {
      id: `msg-${Date.now()}`,
      sender,
      content,
      timestamp: new Date(),
      type,
      buttons,
      listItems,
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
    
    // Agrupar logs por nó
    setGroupedLogs(prev => {
      const nodeKey = nodeId || nodeName
      const existing = prev[nodeKey] || []
      
      // Se é o mesmo status que o último log do mesmo nó, atualizar
      if (existing.length > 0 && existing[existing.length - 1].status === status && status !== 'error') {
        return {
          ...prev,
          [nodeKey]: [...existing.slice(0, -1), log]
        }
      } else {
        return {
          ...prev,
          [nodeKey]: [...existing, log]
        }
      }
    })
    
    setDebugLogs(prev => {
      const logs = [...prev, log]
      return logs.slice(-100) // Manter apenas últimos 100 logs
    })
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
        executeNodeLegacy(currentNode)
      }
    }
  }
  
  const resetFlow = () => {
    setMessages([])
    setDebugLogs([])
    setGroupedLogs({})
    setExpandedLogs(new Set())
    setLastLogTime({})
    setVariables([])
    setExecutionPath([])
    setCurrentNodeId(null)
    setIsExecuting(false)
    setIsPaused(false)
    setIsWaitingForInput(false)
    setWaitingInputType(null)
    loadFlow()
  }
  
  const checkWhatsAppConnection = async (number: string) => {
    try {
      // Verificar se o número está conectado ao WhatsApp
      const response = await fetch(`/api/v1/whatsapp/status/${number}`)
      if (response.ok) {
        const data = await response.json()
        setIsWhatsAppConnected(data.connected || false)
      } else {
        setIsWhatsAppConnected(false)
      }
    } catch (error) {
      console.error('Erro ao verificar conexão WhatsApp:', error)
      setIsWhatsAppConnected(false)
    }
  }
  
  const getStatusIcon = (status: DebugLog['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'waiting':
        return <Clock className="h-3 w-3 text-yellow-500" />
      case 'skipped':
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }
  
  // Função para alternar expansão de logs
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }
  
  // Função para obter logs consolidados
  const getConsolidatedLogs = () => {
    const consolidated: DebugLog[] = []
    const nodeLastLog: Record<string, DebugLog> = {}
    
    debugLogs.forEach(log => {
      const nodeKey = log.nodeId || log.nodeName
      const existing = nodeLastLog[nodeKey]
      
      // Se mudou de status ou é um nó diferente, adicionar ao consolidado
      if (!existing || existing.status !== log.status || log.status === 'error') {
        consolidated.push(log)
        nodeLastLog[nodeKey] = log
      } else {
        // Atualizar o log existente com informações mais recentes
        const index = consolidated.findIndex(l => l.id === existing.id)
        if (index !== -1) {
          consolidated[index] = { ...log, id: existing.id }
        }
      }
    })
    
    return consolidated
  }
  
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Chat Simulator */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* WhatsApp Header */}
        <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
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
            <div className="flex-1">
              <h2 className="font-semibold text-sm">{flow?.name || 'Flow de Teste'}</h2>
              <p className="text-xs opacity-90">
                {useRealWhatsApp && whatsAppNumber ? `📱 ${whatsAppNumber}` :
                 isTyping ? 'digitando...' : 
                 isExecuting ? 'executando flow...' : 
                 isWaitingForInput ? `aguardando ${waitingInputType}...` : 'online'}
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
                {isMockFlow(flowId) && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => {
                      setError(null)
                      loadFlow()
                    }}
                  >
                    Tentar Modo Mock
                  </Button>
                )}
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
                    "max-w-[80%] rounded-lg px-4 py-2 shadow-sm",
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-card-foreground border'
                  )}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  
                  {/* Render buttons */}
                  {message.type === 'buttons' && message.buttons && (
                    <div className="mt-3 space-y-2">
                      {message.buttons.map((button) => (
                        <Button
                          key={button.id}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-3 px-4"
                          onClick={() => handleButtonClick(button.id)}
                          disabled={!isWaitingForInput || waitingInputType !== 'button'}
                        >
                          <div className="text-left">
                            <div className="font-medium">{button.text}</div>
                            {button.description && (
                              <div className="text-xs opacity-70 mt-1">{button.description}</div>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Render list items */}
                  {message.type === 'list' && message.listItems && (
                    <div className="mt-3 space-y-1">
                      <div className="text-xs opacity-70 mb-2">Escolha uma opção:</div>
                      {message.listItems.map((item) => (
                        <Button
                          key={item.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-3 px-3 hover:bg-muted border-l-2 border-l-primary/20"
                          onClick={() => handleListSelection(item.id)}
                          disabled={!isWaitingForInput || waitingInputType !== 'list'}
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">{item.title}</div>
                            {item.description && (
                              <div className="text-xs opacity-70 mt-1">{item.description}</div>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs opacity-60 mt-2 flex items-center justify-between">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.nodeId && (
                      <span className="font-mono text-xs bg-black/10 px-1 rounded">
                        {message.nodeId.slice(0, 8)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-card text-card-foreground rounded-lg px-4 py-3 shadow-sm border">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
                    <span className="ml-2 text-xs text-muted-foreground">digitando...</span>
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
              placeholder={
                isWaitingForInput && waitingInputType === 'text' 
                  ? "Digite sua resposta..." 
                  : isWaitingForInput 
                    ? `Aguardando seleção...`
                    : "Digite uma mensagem..."
              }
              className="flex-1"
              disabled={isWaitingForInput && waitingInputType !== 'text'}
            />
            <Button 
              onClick={sendMessage} 
              size="icon"
              disabled={isWaitingForInput && waitingInputType !== 'text'}
            >
              {inputMessage ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </div>
          
          {isWaitingForInput && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando {waitingInputType === 'button' ? 'seleção de botão' : 
                         waitingInputType === 'list' ? 'seleção da lista' : 
                         waitingInputType === 'text' ? 'entrada de texto' : 'entrada do usuário'}
            </div>
          )}
        </div>
      </div>
      
      {/* Debug Panel com largura ajustável */}
      <div 
        className={cn(
          "border-l bg-background flex flex-col overflow-hidden transition-all duration-300",
          isDebugCollapsed ? "w-12" : `w-[${debugPanelWidth}px]`
        )}
        style={{ width: isDebugCollapsed ? '48px' : `${debugPanelWidth}px` }}
      >
        {/* Botão para colapsar/expandir */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 bg-background border rounded-full h-6 w-6"
          onClick={() => setIsDebugCollapsed(!isDebugCollapsed)}
        >
          {isDebugCollapsed ? 
            <ChevronRight className="h-3 w-3" /> : 
            <ChevronRight className="h-3 w-3 rotate-180" />
          }
        </Button>
        
        {!isDebugCollapsed && (
        <>
        {/* Control Bar */}
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug
            </h3>
            <div className="flex gap-1">
              <Badge variant={useRealWhatsApp ? 'default' : 'secondary'} className={`text-xs px-2 py-0.5 ${useRealWhatsApp ? 'bg-green-600' : ''}`}>
                {useRealWhatsApp ? '📱 Real' : '🔧 Mock'}
              </Badge>
              <Badge variant={testMode ? 'default' : 'destructive'} className="text-xs px-2 py-0.5">
                {testMode ? 'Test' : 'Prod'}
              </Badge>
            </div>
          </div>
          
          {/* Toggle para WhatsApp Real */}
          {flow?.whatsapp_numbers?.length > 0 && (
            <div className="mb-3 p-2 bg-muted rounded-md">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Modo WhatsApp Real</label>
                <Button
                  variant={useRealWhatsApp ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    setUseRealWhatsApp(!useRealWhatsApp)
                    if (!useRealWhatsApp && flow?.whatsapp_numbers?.[0]) {
                      setWhatsAppNumber(flow.whatsapp_numbers[0])
                      checkWhatsAppConnection(flow.whatsapp_numbers[0])
                    }
                  }}
                >
                  {useRealWhatsApp ? 'Ativado' : 'Desativado'}
                </Button>
              </div>
              {useRealWhatsApp && (
                <select 
                  className="w-full text-xs p-1 rounded border"
                  value={whatsAppNumber || ''}
                  onChange={(e) => {
                    setWhatsAppNumber(e.target.value)
                    checkWhatsAppConnection(e.target.value)
                  }}
                >
                  {flow.whatsapp_numbers.map((num: string) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          <div className="flex gap-1">
            <Button
              onClick={startFlow}
              disabled={isExecuting}
              size="sm"
              className="flex-1 h-8"
            >
              <Play className="h-3 w-3 mr-1" />
              {isExecuting ? 'Run...' : 'Iniciar'}
            </Button>
            {isPaused && (
              <Button
                onClick={continueExecution}
                size="sm"
                variant="outline"
                className="flex-1 h-8"
              >
                <PlayCircle className="h-3 w-3" />
              </Button>
            )}
            <Button
              onClick={resetFlow}
              size="sm"
              variant="outline"
              className="px-2 h-8"
              title="Reiniciar"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Debug Tabs */}
        <Tabs defaultValue="logs" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
            <TabsTrigger value="variables" className="text-xs">Vars</TabsTrigger>
            <TabsTrigger value="flow" className="text-xs">Flow</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Config</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {getConsolidatedLogs().map((log) => {
                  const isExpanded = expandedLogs.has(log.id)
                  const nodeKey = log.nodeId || log.nodeName
                  const nodeLogs = groupedLogs[nodeKey] || []
                  const logCount = nodeLogs.filter(l => l.status === log.status).length
                  
                  return (
                    <Card 
                      key={log.id} 
                      className={cn(
                        "p-2 transition-all cursor-pointer hover:bg-muted/50",
                        isExpanded && "ring-1 ring-primary/20"
                      )}
                      onClick={() => toggleLogExpansion(log.id)}
                    >
                      <div className="flex items-start gap-2">
                        {getStatusIcon(log.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {log.nodeName}
                              </p>
                              {logCount > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  {logCount}x
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          
                          {/* Resumo compacto */}
                          {!isExpanded && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.status === 'success' ? '✓ Executado' : 
                               log.status === 'running' ? '⏳ Executando...' :
                               log.status === 'waiting' ? '⏸ Aguardando entrada' :
                               log.status === 'error' ? '✗ Erro na execução' :
                               log.status === 'skipped' ? '⏭ Pulado' : log.message}
                            </p>
                          )}
                          
                          {/* Detalhes expandidos */}
                          {isExpanded && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">{log.nodeType}</p>
                              <p className="text-sm">{log.message}</p>
                              {log.details && (
                                <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                              {log.duration && (
                                <Badge variant="outline" className="mt-1">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {log.duration}ms
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
                {debugLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bug className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum log ainda</p>
                    <p className="text-xs">Clique em "Iniciar" para começar</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="variables" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {variables.map((variable) => (
                  <Card key={variable.name} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm font-medium">{variable.name}</p>
                        <p className="text-xs text-muted-foreground">{variable.type}</p>
                      </div>
                      <Badge variant="secondary" className="font-mono max-w-32 truncate">
                        {JSON.stringify(variable.value)}
                      </Badge>
                    </div>
                  </Card>
                ))}
                {variables.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma variável</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="flow" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
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
                            {node?.data?.label || nodeId.slice(0, 8)}
                          </Badge>
                          {breakpoints.has(nodeId) && (
                            <PauseCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      )
                    })}
                    {executionPath.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhum nó executado</p>
                    )}
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
                        className={cn(
                          "flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors",
                          currentNodeId === node.id && "bg-primary/10 border border-primary/20"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleBreakpoint(node.id)}
                            title={breakpoints.has(node.id) ? "Remover breakpoint" : "Adicionar breakpoint"}
                          >
                            {breakpoints.has(node.id) ? (
                              <PauseCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <PlayCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="text-sm">{node.data?.label || node.id.slice(0, 10)}</span>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Sistema Mock</h4>
                    <p className="text-xs text-muted-foreground">
                      {isMockMode ? 'Usando dados mock offline' : 'Conectado ao backend'}
                    </p>
                  </div>
                  <Badge variant={isMockMode ? 'secondary' : 'outline'}>
                    {isMockMode ? '📦 Mock' : '🌐 Backend'}
                  </Badge>
                </div>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-medium mb-3">Flow Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>ID:</span>
                    <code className="text-xs bg-muted px-1 rounded">
                      {flowId?.slice(0, 8)}...
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span>Nome:</span>
                    <span>{flow?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nós:</span>
                    <span>{(flow?.flow?.nodes || flow?.nodes || []).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Edges:</span>
                    <span>{(flow?.flow?.edges || flow?.edges || []).length}</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
    </div>
  )
}
// Force recompile - Fixed Map issue with Next.js 15.4.6 and improved layout
