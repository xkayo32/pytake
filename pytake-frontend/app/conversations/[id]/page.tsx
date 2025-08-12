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
  AlertCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scrollarea'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'

interface Message {
  id: string
  content: string
  timestamp: string
  sender: 'user' | 'contact'
  status: 'sending' | 'sent' | 'delivered' | 'read'
  type: 'text' | 'image' | 'document' | 'audio'
}

interface Contact {
  id: string
  name: string
  phone: string
  avatar?: string
  status: 'online' | 'offline' | 'typing'
  lastSeen?: string
}

// Mock data
const mockContact: Contact = {
  id: '1',
  name: 'João Silva',
  phone: '+55 11 99999-1234',
  status: 'online'
}

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Olá! Tudo bem?',
    timestamp: '2024-01-15T09:00:00Z',
    sender: 'contact',
    status: 'read',
    type: 'text'
  },
  {
    id: '2',
    content: 'Oi! Tudo ótimo, e você?',
    timestamp: '2024-01-15T09:01:00Z',
    sender: 'user',
    status: 'read',
    type: 'text'
  },
  {
    id: '3',
    content: 'Estou bem também! Preciso de ajuda com meu pedido #12345',
    timestamp: '2024-01-15T09:02:00Z',
    sender: 'contact',
    status: 'read',
    type: 'text'
  },
  {
    id: '4',
    content: 'Claro! Vou verificar o status do seu pedido. Um momento, por favor.',
    timestamp: '2024-01-15T09:03:00Z',
    sender: 'user',
    status: 'read',
    type: 'text'
  },
  {
    id: '5',
    content: 'Seu pedido foi enviado hoje pela manhã. O código de rastreamento é ABC123XYZ.',
    timestamp: '2024-01-15T09:05:00Z',
    sender: 'user',
    status: 'delivered',
    type: 'text'
  },
  {
    id: '6',
    content: 'Perfeito! Muito obrigado pelo atendimento rápido!',
    timestamp: '2024-01-15T09:06:00Z',
    sender: 'contact',
    status: 'read',
    type: 'text'
  }
]

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'sending': return <Clock className="h-3 w-3" />
    case 'sent': return <CheckCheck className="h-3 w-3" />
    case 'delivered': return <CheckCheck className="h-3 w-3 text-gray-500" />
    case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />
    default: return <AlertCircle className="h-3 w-3 text-red-500" />
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [contact, setContact] = useState<Contact>(mockContact)
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const conversationId = params.id as string

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      sender: 'user',
      status: 'sending',
      type: 'text'
    }

    setMessages(prev => [...prev, message])
    setNewMessage('')

    // Simulate sending
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, status: 'sent' } 
          : msg
      ))
    }, 1000)

    // Simulate delivery
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, status: 'delivered' } 
          : msg
      ))
    }, 2000)
  }

  const handleBack = () => {
    router.push('/conversations')
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="flex items-center gap-4 px-4 h-16">
            <Button variant="ghost" size="sm" onClick={handleBack} className="lg:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {/* Contact Info */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold truncate">{contact.name}</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{contact.phone}</span>
                  </div>
                  {contact.status === 'online' && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Online
                    </Badge>
                  )}
                  {contact.status === 'typing' && (
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
        <div className="flex-1 overflow-hidden bg-[#F0F2F5] dark:bg-slate-900">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card className={`
                    max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl
                    ${message.sender === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-white dark:bg-slate-800'
                    }
                  `}>
                    <CardContent className="p-3">
                      <p className="text-sm leading-relaxed mb-1">
                        {message.content}
                      </p>
                      <div className={`
                        flex items-center justify-end gap-1 text-xs
                        ${message.sender === 'user' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                        }
                      `}>
                        <span>{formatMessageTime(message.timestamp)}</span>
                        {message.sender === 'user' && (
                          <div className="ml-1">
                            {getStatusIcon(message.status)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <Card className="bg-white dark:bg-slate-800 max-w-xs">
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
              <Button type="button" variant="ghost" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="pr-10"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                type="submit" 
                size="sm"
                disabled={!newMessage.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}