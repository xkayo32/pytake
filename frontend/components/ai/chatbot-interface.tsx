'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  IntelligentChatbot, 
  ChatbotMessage, 
  ConversationContext,
  ChatbotResponse 
} from '@/lib/ai/intelligent-chatbot'
import {
  Bot,
  User,
  UserCheck,
  Send,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Clock,
  Zap,
  MessageSquare,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatbotInterfaceProps {
  conversationId: string
  userId: string
  onTransferToHuman?: (reason: string, context: ConversationContext) => void
  onMessageReceived?: (message: ChatbotMessage) => void
  className?: string
  autoStart?: boolean
  welcomeMessage?: string
}

export function ChatbotInterface({
  conversationId,
  userId,
  onTransferToHuman,
  onMessageReceived,
  className,
  autoStart = true,
  welcomeMessage = "Olá! Sou o assistente virtual. Como posso ajudar você hoje?"
}: ChatbotInterfaceProps) {
  const [messages, setMessages] = useState<ChatbotMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTransferredToHuman, setIsTransferredToHuman] = useState(false)
  const [agentId, setAgentId] = useState<string>()
  const [context, setContext] = useState<ConversationContext>({
    conversationId,
    userId,
    messages: [],
    unresolvedIssues: [],
    transferredToHuman: false,
    startTime: new Date(),
    lastActivity: new Date()
  })

  const chatbot = useRef(new IntelligentChatbot())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Add message to conversation
  const addMessage = useCallback((message: ChatbotMessage) => {
    setMessages(prev => {
      const updated = [...prev, message]
      setContext(ctx => ({
        ...ctx,
        messages: updated,
        lastActivity: new Date()
      }))
      return updated
    })

    if (onMessageReceived) {
      onMessageReceived(message)
    }

    setTimeout(scrollToBottom, 100)
  }, [onMessageReceived, scrollToBottom])

  // Send welcome message on start
  useEffect(() => {
    if (autoStart && messages.length === 0) {
      const welcomeMsg: ChatbotMessage = {
        id: `bot-welcome-${Date.now()}`,
        content: welcomeMessage,
        sender: 'bot',
        timestamp: new Date(),
        confidence: 1.0,
        metadata: {
          wasAutomated: true,
          responseTime: 0
        }
      }
      addMessage(welcomeMsg)
    }
  }, [autoStart, welcomeMessage, messages.length, addMessage])

  // Process user message
  const processUserMessage = useCallback(async (message: string) => {
    if (!message.trim() || isProcessing) return

    setIsProcessing(true)
    
    // Add user message
    const userMessage: ChatbotMessage = {
      id: `user-${Date.now()}`,
      content: message.trim(),
      sender: 'user',
      timestamp: new Date()
    }
    addMessage(userMessage)

    try {
      // Process with chatbot
      const response: ChatbotResponse = await chatbot.current.processMessage(
        message.trim(),
        { ...context, messages: [...messages, userMessage] }
      )

      // Check if needs human transfer
      if (response.shouldTransferToHuman) {
        setIsTransferredToHuman(true)
        
        // Add transfer message
        const transferMessage: ChatbotMessage = {
          id: `bot-transfer-${Date.now()}`,
          content: response.message,
          sender: 'bot',
          timestamp: new Date(),
          confidence: response.confidence,
          metadata: {
            requiresHuman: true,
            escalationReason: response.transferReason,
            responseTime: response.metadata.processingTime,
            wasAutomated: true,
            intent: response.metadata.intent,
            sentiment: response.metadata.sentiment
          }
        }
        addMessage(transferMessage)

        // Notify parent component
        if (onTransferToHuman) {
          onTransferToHuman(
            response.transferReason || 'Transferência solicitada',
            { ...context, messages: [...messages, userMessage, transferMessage] }
          )
        }

        return
      }

      // Add bot response
      const botMessage: ChatbotMessage = {
        id: `bot-${Date.now()}`,
        content: response.message,
        sender: 'bot',
        timestamp: new Date(),
        confidence: response.confidence,
        metadata: {
          intent: response.metadata.intent,
          sentiment: response.metadata.sentiment,
          suggestions: response.suggestedActions?.map(action => ({
            id: `suggestion-${Date.now()}`,
            text: action,
            confidence: response.confidence,
            category: 'information' as const,
            reasoning: 'Sugestão do chatbot',
            personalizable: false
          })),
          responseTime: response.metadata.processingTime,
          wasAutomated: true
        }
      }
      addMessage(botMessage)

    } catch (error) {
      console.error('Error processing message:', error)
      
      // Add error message
      const errorMessage: ChatbotMessage = {
        id: `bot-error-${Date.now()}`,
        content: 'Desculpe, tive um problema técnico. Vou conectar você com um agente humano.',
        sender: 'bot',
        timestamp: new Date(),
        confidence: 0.0,
        metadata: {
          requiresHuman: true,
          escalationReason: 'Erro técnico',
          wasAutomated: true
        }
      }
      addMessage(errorMessage)
      
      setIsTransferredToHuman(true)
      if (onTransferToHuman) {
        onTransferToHuman('Erro técnico do sistema', context)
      }
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, context, messages, addMessage, onTransferToHuman])

  // Handle input submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (currentMessage.trim() && !isTransferredToHuman) {
      processUserMessage(currentMessage)
      setCurrentMessage('')
    }
  }, [currentMessage, isTransferredToHuman, processUserMessage])

  // Handle message feedback
  const handleFeedback = useCallback(async (messageId: string, helpful: boolean) => {
    try {
      await chatbot.current.recordFeedback(
        messageId,
        helpful ? 5 : 2,
        helpful,
        helpful ? 'Resposta útil' : 'Resposta não útil'
      )

      // Update message to show feedback was given
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, metadata: { ...msg.metadata, feedbackGiven: true } }
          : msg
      ))
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }, [])

  // Simulate agent taking over
  const simulateHumanTakeover = useCallback(() => {
    if (!isTransferredToHuman) return

    setTimeout(() => {
      const agentMessage: ChatbotMessage = {
        id: `agent-${Date.now()}`,
        content: 'Olá! Sou Ana, agente humana. Vou ajudar você a partir de agora. Em que posso ser útil?',
        sender: 'agent',
        timestamp: new Date()
      }
      addMessage(agentMessage)
      setAgentId('agent-ana-123')
    }, 2000)
  }, [isTransferredToHuman, addMessage])

  useEffect(() => {
    simulateHumanTakeover()
  }, [simulateHumanTakeover])

  // Get sender info
  const getSenderInfo = (message: ChatbotMessage) => {
    switch (message.sender) {
      case 'bot':
        return {
          name: 'Assistente Virtual',
          avatar: 'B',
          color: 'bg-blue-600',
          icon: <Bot className="h-4 w-4" />
        }
      case 'agent':
        return {
          name: agentId ? 'Ana (Agente)' : 'Agente',
          avatar: 'A',
          color: 'bg-green-600',
          icon: <UserCheck className="h-4 w-4" />
        }
      default:
        return {
          name: 'Você',
          avatar: 'U',
          color: 'bg-gray-600',
          icon: <User className="h-4 w-4" />
        }
    }
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className={cn("flex flex-col h-96", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isTransferredToHuman ? (
              <>
                <Users className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Atendimento Humano</CardTitle>
              </>
            ) : (
              <>
                <Bot className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Assistente Virtual</CardTitle>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isTransferredToHuman ? (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                <UserCheck className="h-3 w-3 mr-1" />
                Agente Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Bot className="h-3 w-3 mr-1" />
                IA Ativa
              </Badge>
            )}
            {isProcessing && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1 animate-spin" />
                Processando
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => {
              const sender = getSenderInfo(message)
              const isUser = message.sender === 'user'

              return (
                <div key={message.id} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
                  <Avatar className={cn("w-8 h-8 flex-shrink-0", sender.color)}>
                    <AvatarFallback className="text-white text-xs">
                      {sender.avatar}
                    </AvatarFallback>
                  </Avatar>

                  <div className={cn("flex-1 max-w-[80%]", isUser && "text-right")}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {sender.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {message.confidence !== undefined && !isUser && (
                        <Badge variant="outline" className="text-xs">
                          <span className={getConfidenceColor(message.confidence)}>
                            {Math.round(message.confidence * 100)}%
                          </span>
                        </Badge>
                      )}
                    </div>

                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        isUser
                          ? "bg-blue-600 text-white ml-auto"
                          : message.sender === 'agent'
                          ? "bg-green-50 text-green-900 border border-green-200"
                          : "bg-gray-50 text-gray-900 border border-gray-200"
                      )}
                    >
                      <p>{message.content}</p>

                      {/* Metadata */}
                      {message.metadata && !isUser && (
                        <div className="mt-2 pt-2 border-t border-current/20">
                          {message.metadata.requiresHuman && (
                            <div className="flex items-center text-xs text-orange-600 mb-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Transferindo para agente humano...
                            </div>
                          )}

                          {message.metadata.intent && (
                            <div className="text-xs opacity-75 mb-1">
                              <strong>Intenção:</strong> {message.metadata.intent.primary?.name}
                              {message.metadata.intent.urgency !== 'low' && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  {message.metadata.intent.urgency}
                                </Badge>
                              )}
                            </div>
                          )}

                          {message.metadata.responseTime && (
                            <div className="text-xs opacity-75">
                              <strong>Tempo:</strong> {message.metadata.responseTime}ms
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Feedback buttons for bot messages */}
                    {message.sender === 'bot' && 
                     !message.metadata?.feedbackGiven && 
                     !message.metadata?.requiresHuman && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">Foi útil?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(message.id, true)}
                          className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(message.id, false)}
                          className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Feedback confirmation */}
                    {message.metadata?.feedbackGiven && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <CheckCircle className="h-3 w-3" />
                        <span>Feedback enviado</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            
            {isProcessing && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 bg-blue-600">
                  <AvatarFallback className="text-white text-xs">B</AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 rounded-lg px-3 py-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder={
                isTransferredToHuman 
                  ? "Digite sua mensagem para o agente..." 
                  : "Digite sua mensagem..."
              }
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!currentMessage.trim() || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          
          {isTransferredToHuman && !agentId && (
            <div className="mt-2 flex items-center text-sm text-orange-600">
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Aguardando agente humano...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}