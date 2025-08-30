'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical,
  Phone,
  User,
  CheckCheck,
  Clock,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AppLayout } from '@/components/layout/app-layout'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useConversations } from '@/lib/hooks/useConversations'
import { useAuthContext } from '@/contexts/auth-context'
import { type Message } from '@/lib/api/conversations'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const formatMessageTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp)
    return format(date, 'HH:mm', { locale: ptBR })
  } catch {
    return ''
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="h-3 w-3" />
    case 'sent': return <CheckCheck className="h-3 w-3" />
    case 'delivered': return <CheckCheck className="h-3 w-3 text-gray-500" />
    case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />
    case 'failed': return <AlertCircle className="h-3 w-3 text-red-500" />
    default: return <Clock className="h-3 w-3" />
  }
}

const getContactInitials = (name?: string, phone?: string) => {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  if (phone) {
    return phone.slice(-2)
  }
  return 'C'
}

export default function ChatPage() {
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const { isAuthenticated } = useAuthContext()
  const router = useRouter()
  const params = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const conversationId = params.id as string

  const {
    currentConversation,
    currentMessages,
    selectConversation,
    sendMessage,
    isLoading,
    error,
    isConnected
  } = useConversations()

  // Load conversation when component mounts
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (conversationId) {
      selectConversation(conversationId)
    }
  }, [conversationId, isAuthenticated, selectConversation, router])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (currentMessages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [currentMessages])

  // Focus input when conversation loads
  useEffect(() => {
    if (currentConversation && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentConversation])

  // Show loading state
  if (isLoading || !currentConversation) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || isSending || !currentConversation) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    try {
      await sendMessage(currentConversation.id, {
        content: messageContent,
        message_type: 'text'
      })
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message in case of error
      setNewMessage(messageContent)
    } finally {
      setIsSending(false)
      // Focus back on input
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleBack = () => {
    router.push('/conversations')
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar conversa</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/conversations')}>
              Voltar para conversas
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="flex items-center gap-4 px-4 h-16">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {/* Contact Info */}
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getContactInitials(currentConversation.contact?.name, currentConversation.contact?.phone)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">
                  {currentConversation.contact?.name || currentConversation.contact?.phone || 'Contato'}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {currentConversation.contact?.phone || 'Sem telefone'}
                    </span>
                  </div>
                  {isConnected ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Wifi className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                  {isTyping && (
                    <span className="text-sm text-primary">digitando...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden bg-[#F0F2F5] dark:bg-background">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {currentMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Ainda não há mensagens nesta conversa.
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Envie a primeira mensagem para começar!
                    </p>
                  </div>
                </div>
              ) : (
                currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <Card className={`
                      max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl
                      ${message.sender_type === 'agent' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-white dark:bg-card'
                      }
                    `}>
                      <CardContent className="p-3">
                        <p className="text-sm leading-relaxed mb-1 whitespace-pre-wrap">
                          {message.content}
                        </p>
                        <div className={`
                          flex items-center justify-end gap-1 text-xs
                          ${message.sender_type === 'agent' 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                          }
                        `}>
                          <span>{formatMessageTime(message.created_at)}</span>
                          {message.sender_type === 'agent' && (
                            <div className="ml-1">
                              {getStatusIcon(message.status)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
              
              {isTyping && (
                <div className="flex justify-start">
                  <Card className="bg-white dark:bg-card max-w-xs">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Message Input */}
        <div className="border-t bg-background p-4">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" disabled>
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending || !isConnected}
                  className="pr-10"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  disabled
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                type="submit" 
                size="sm"
                disabled={!newMessage.trim() || isSending}
                className="bg-primary hover:bg-primary/90"
              >
                {isSending ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {!isConnected && (
              <div className="flex items-center gap-2 mt-2 text-sm text-orange-600">
                <WifiOff className="h-4 w-4" />
                <span>Sem conexão em tempo real. As mensagens podem não ser enviadas imediatamente.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </AppLayout>
  )
}