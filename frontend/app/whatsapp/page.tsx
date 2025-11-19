'use client'

import { useState, useEffect, useRef } from 'react'
import { getApiUrl, getWebSocketUrl, getAuthHeaders } from '@/lib/api-client'
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Search,
  Check,
  CheckCheck,
  Clock,
  Phone,
  Video,
  Info,
  ArrowLeft,
  Filter,
  Plus,
  X,
  UserPlus,
  MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { AppLayout } from '@/components/layout/app-layout'
import { notify } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Contact {
  id: string
  name: string
  phone: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: Date
  unreadCount?: number
  isOnline?: boolean
  isTyping?: boolean
  isFavorite?: boolean
  isBlocked?: boolean
}

interface Message {
  id: string
  content: string
  timestamp: Date
  isFromMe: boolean
  status?: 'sending' | 'sent' | 'delivered' | 'read'
  type?: 'text' | 'image' | 'document' | 'audio' | 'video'
  mediaUrl?: string
}

export default function WhatsAppPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'favorite' | 'blocked'>('all')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [templateVariables, setTemplateVariables] = useState<string[]>([])
  const [requiresTemplate, setRequiresTemplate] = useState(false)
  const [whatsappNumbers, setWhatsappNumbers] = useState<any[]>([])
  const [activeNumberId, setActiveNumberId] = useState<string | null>(null)

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Carregar contatos
  useEffect(() => {
    loadContacts()
  }, [])

  // Scroll para última mensagem
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsUrl = getWebSocketUrl()
        
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('🔌 WebSocket connected')
          setWsConnected(true)
          notify.success('Conectado ao chat em tempo real')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📨 WebSocket message:', data)

            switch (data.type) {
              case 'new_message':
              case 'message_sent':
                // Add new message to the current conversation
                if (selectedContact && data.data.contactId === selectedContact.id) {
                  const newMsg: Message = {
                    id: data.data.id,
                    content: data.data.content,
                    timestamp: new Date(data.data.timestamp),
                    isFromMe: data.data.isFromMe,
                    status: data.data.status,
                    type: data.data.messageType || 'text'
                  }
                  setMessages(prev => [...prev, newMsg])
                }
                
                // Update contact list with new message
                setContacts(prev => prev.map(contact => 
                  contact.id === data.data.contactId 
                    ? {
                        ...contact,
                        lastMessage: data.data.content,
                        lastMessageTime: new Date(data.data.timestamp),
                        unreadCount: selectedContact?.id === contact.id ? 0 : (contact.unreadCount || 0) + (data.data.isFromMe ? 0 : 1)
                      }
                    : contact
                ))
                break
              
              case 'message_status_update':
                // Update message status
                setMessages(prev => prev.map(msg => 
                  msg.id === data.data.messageId 
                    ? { ...msg, status: data.data.status }
                    : msg
                ))
                break

              case 'contact_typing':
                // Show typing indicator
                setContacts(prev => prev.map(contact =>
                  contact.id === data.data.contactId
                    ? { ...contact, isTyping: data.data.isTyping }
                    : contact
                ))
                break
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error)
          }
        }

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected')
          setWsConnected(false)
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000)
        }

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          setWsConnected(false)
        }
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [selectedContact, notify])

  // Notify WebSocket when conversation changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedContact) {
      wsRef.current.send(JSON.stringify({
        type: 'join_conversation',
        conversationId: selectedContact.id
      }))
    }
  }, [selectedContact])

  const loadContacts = async () => {
    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/contacts/`, { headers })
      if (response.ok) {
        const data = await response.json()
        const formattedContacts = data.map((contact: any) => ({
          id: contact.id,
          name: contact.name || contact.phone,
          phone: contact.phone,
          avatar: contact.avatar_url,
          lastMessage: contact.last_message,
          lastMessageTime: contact.last_message_time ? new Date(contact.last_message_time) : undefined,
          unreadCount: contact.unread_count || 0,
          isOnline: false,
          isFavorite: contact.is_favorite,
          isBlocked: contact.is_blocked
        }))
        setContacts(formattedContacts)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
      notify.error('Erro ao carregar contatos')
    }
  }

  const loadMessages = async (contactId: string) => {
    setIsLoading(true)
    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp/messages/${contactId}`, { headers })
      if (response.ok) {
        const data = await response.json()
        const formattedMessages = data.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      notify.error('Erro ao carregar mensagens')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    loadMessages(contact.id)
    
    // No mobile, esconder lista de contatos ao selecionar
    if (isMobile) {
      // Implementar lógica de navegação mobile
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return

    const tempMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      timestamp: new Date(),
      isFromMe: true,
      status: 'sending'
    }

    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')

    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: selectedContact.phone,
          message: { text: { body: newMessage } }
        })
      })

      if (response.ok) {
        // Atualizar status da mensagem
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...msg, status: 'sent' }
              : msg
          )
        )
        notify.success('Mensagem enviada')
      } else {
        const errorData = await response.json()
        
        // Se requer template, mostrar modal de templates
        if (errorData.error?.requires_template) {
          setRequiresTemplate(true)
          setShowTemplateModal(true)
          // Remover mensagem temporária
          setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
          
          if (errorData.error?.window_expired) {
            notify.error('⏰ Janela de 24h expirou! Selecione um template para reabrir.')
          } else {
            notify.error('📱 Primeira mensagem deve ser um template aprovado!')
          }
          return
        }
        
        throw new Error('Falha ao enviar mensagem')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      if (!requiresTemplate) {
        notify.error('Erro ao enviar mensagem')
        // Remover mensagem temporária
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      default:
        return null
    }
  }

  const formatMessageTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: ptBR })
  }

  const formatLastSeen = (date?: Date) => {
    if (!date) return 'Offline'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}min atrás`
    if (minutes < 1440) return format(date, 'HH:mm', { locale: ptBR })
    return format(date, 'dd/MM', { locale: ptBR })
  }

  // Função para criar nova conversa
  const handleCreateNewChat = async () => {
    if (!newContactPhone.trim()) {
      notify.error('Informe o número do WhatsApp')
      return
    }

    try {
      // Formatar número
      let phone = newContactPhone.replace(/\D/g, '')
      if (!phone.startsWith('55')) {
        phone = '55' + phone
      }
      phone = '+' + phone

      // Criar/buscar contato
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/contacts/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone,
          name: newContactName.trim() || phone
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newContact = data
        
        // Format contact for frontend
        const formattedContact = {
          id: newContact.id,
          name: newContact.name || newContact.phone,
          phone: newContact.phone,
          avatar: newContact.avatar_url,
          lastMessage: undefined,
          lastMessageTime: undefined,
          unreadCount: 0,
          isOnline: false,
          isFavorite: newContact.is_favorite || false,
          isBlocked: newContact.is_blocked || false
        }
        
        await loadContacts() // Recarregar lista
        setSelectedContact(formattedContact)
        loadMessages(formattedContact.id)
        setShowNewChatModal(false)
        setNewContactPhone('')
        setNewContactName('')
        notify.success('Nova conversa criada')
      } else {
        throw new Error('Falha ao criar conversa')
      }
    } catch (error) {
      console.error('Error creating chat:', error)
      notify.error('Erro ao criar conversa')
    }
  }

  // Função para ligar
  const handleCall = () => {
    if (selectedContact) {
      const phone = selectedContact.phone.replace(/\D/g, '')
      window.open(`tel:${phone}`, '_self')
    }
  }

  // Função para videochamada
  const handleVideoCall = () => {
    if (selectedContact) {
      // Integração futura com APIs de videochamada
      notify.info('Videochamada será implementada em breve')
    }
  }

  // Função para mostrar/ocultar filtros
  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }

  // Função para anexar arquivo
  const handleAttachFile = () => {
    fileInputRef.current?.click()
  }

  // Carregar números WhatsApp disponíveis
  const loadWhatsAppNumbers = async () => {
    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp/`, { headers })
      if (response.ok) {
        const data = await response.json()
        setWhatsappNumbers(data)
        if (data.length > 0) {
          setActiveNumberId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading WhatsApp numbers:', error)
    }
  }

  // Carregar templates disponíveis
  const loadTemplates = async (numberId?: string) => {
    try {
      const numberIdToUse = numberId || activeNumberId
      if (!numberIdToUse) {
        console.warn('No WhatsApp number ID available')
        return
      }
      
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp/${numberIdToUse}/templates`, { headers })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      notify.error('Erro ao carregar templates')
    }
  }

  // Carregar números e templates ao iniciar
  useEffect(() => {
    const init = async () => {
      await loadWhatsAppNumbers()
    }
    init()
  }, [])

  // Carregar templates quando activeNumberId mudar
  useEffect(() => {
    if (activeNumberId) {
      loadTemplates(activeNumberId)
    }
  }, [activeNumberId])

  // Função para enviar template
  const handleSendTemplate = async () => {
    if (!selectedTemplate || !selectedContact) return

    try {
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/api/v1/whatsapp/send-template`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: selectedContact.phone,
          template: selectedTemplate,
          variables: templateVariables
        })
      })

      if (response.ok) {
        await loadContacts()
        loadMessages(selectedContact.id)
        setShowTemplateModal(false)
        setSelectedTemplate(null)
        setTemplateVariables([])
        setRequiresTemplate(false)
        notify.success('📱 Template enviado! Janela de 24h aberta para mensagens livres.')
      } else {
        throw new Error('Falha ao enviar template')
      }
    } catch (error) {
      console.error('Error sending template:', error)
      notify.error('Erro ao enviar template')
    }
  }

  // Função para processar arquivo anexado
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedContact) return

    // Validar tamanho do arquivo (max 16MB)
    if (file.size > 16 * 1024 * 1024) {
      notify.error('Arquivo muito grande. Máximo 16MB.')
      return
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument']
    if (!allowedTypes.some(type => file.type.startsWith(type))) {
      notify.error('Tipo de arquivo não suportado')
      return
    }

    try {
      // Por enquanto, simular envio de arquivo
      const tempMessage: Message = {
        id: Date.now().toString(),
        content: `[${file.type.startsWith('image/') ? 'Imagem' : 
                    file.type.startsWith('video/') ? 'Vídeo' : 
                    file.type.startsWith('audio/') ? 'Áudio' : 'Documento'}] ${file.name}`,
        timestamp: new Date(),
        isFromMe: true,
        status: 'sending',
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 
              file.type.startsWith('audio/') ? 'audio' : 'document'
      }

      setMessages(prev => [...prev, tempMessage])
      
      // TODO: Implementar upload real do arquivo
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id 
              ? { ...msg, status: 'sent' }
              : msg
          )
        )
        notify.success('Arquivo enviado')
      }, 2000)
      
    } catch (error) {
      console.error('Error sending file:', error)
      notify.error('Erro ao enviar arquivo')
    }

    // Limpar input
    if (event.target) {
      event.target.value = ''
    }
  }

  const filteredContacts = contacts.filter(contact => {
    // Filtro por texto de busca
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone.includes(searchTerm)
    
    // Filtro por tipo
    let matchesFilter = true
    switch (filterType) {
      case 'unread':
        matchesFilter = (contact.unreadCount || 0) > 0
        break
      case 'favorite':
        matchesFilter = contact.isFavorite || false
        break
      case 'blocked':
        matchesFilter = contact.isBlocked || false
        break
      case 'all':
      default:
        matchesFilter = true
        break
    }
    
    return matchesSearch && matchesFilter
  })

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
        {/* Lista de Contatos */}
        <div className={`${isMobile && selectedContact ? 'hidden' : 'flex'} flex-col w-full md:w-96 bg-white dark:bg-gray-800 border-r`}>
        {/* Header da Lista */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Conversas</h2>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleFilters}
                className={showFilters ? 'bg-gray-200 dark:bg-gray-600' : ''}
              >
                <Filter className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowNewChatModal(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filtros */}
          {showFilters && (
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Todas
              </Button>
              <Button
                variant={filterType === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('unread')}
              >
                Não lidas
              </Button>
              <Button
                variant={filterType === 'favorite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('favorite')}
              >
                Favoritas
              </Button>
              <Button
                variant={filterType === 'blocked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('blocked')}
              >
                Bloqueadas
              </Button>
            </div>
          )}
        </div>

        {/* Lista de Conversas */}
        <ScrollArea className="flex-1">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleSelectContact(contact)}
              className={`flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                selectedContact?.id === contact.id ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <div className="relative">
                <Avatar>
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback>
                    {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {contact.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold truncate">{contact.name}</p>
                  <span className="text-xs text-gray-500">
                    {contact.lastMessageTime && formatLastSeen(contact.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {contact.isTyping ? (
                      <span className="text-green-600">digitando...</span>
                    ) : (
                      contact.lastMessage
                    )}
                  </p>
                  {contact.unreadCount && contact.unreadCount > 0 && (
                    <Badge className="bg-green-600 text-white">
                      {contact.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Área de Chat */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col">
          {/* Header do Chat */}
          <div className="bg-white dark:bg-gray-800 border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedContact(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <Avatar>
                  <AvatarImage src={selectedContact.avatar} />
                  <AvatarFallback>
                    {selectedContact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedContact.name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedContact.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleCall}
                  title="Ligar"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleVideoCall}
                  title="Videochamada"
                >
                  <Video className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowContactInfo(true)}
                  title="Informações do contato"
                >
                  <Info className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" title="Mais opções">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <ScrollArea className="flex-1 p-4 bg-[url('/whatsapp-bg.png')] bg-cover">
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.isFromMe
                        ? 'bg-green-100 dark:bg-green-900'
                        : 'bg-white dark:bg-gray-700'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(message.timestamp)}
                      </span>
                      {message.isFromMe && getMessageStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input de Mensagem */}
          <div className="bg-white dark:bg-gray-800 border-t p-4">
            <div className="flex items-end gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleAttachFile}
                title="Anexar arquivo"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowTemplateModal(true)}
                title="Enviar template"
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Digite uma mensagem..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                rows={1}
              />
              
              <Button variant="ghost" size="icon">
                <Smile className="h-5 w-5" />
              </Button>
              
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Tela vazia quando nenhum contato selecionado
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="w-64 h-64 mx-auto mb-4 bg-[url('/whatsapp-illustration.svg')] bg-contain bg-center bg-no-repeat opacity-50" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400">
              WhatsApp Business
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mt-2">
              Selecione uma conversa para começar
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Modal para Nova Conversa */}
      <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Nova Conversa
            </DialogTitle>
            <DialogDescription>
              Digite o número do WhatsApp para iniciar uma nova conversa
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Número do WhatsApp *</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                placeholder="Nome do contato"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewChatModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateNewChat}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Informações do Contato */}
      <Dialog open={showContactInfo} onOpenChange={setShowContactInfo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Informações do Contato
            </DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedContact.avatar} />
                  <AvatarFallback className="text-lg">
                    {selectedContact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedContact.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{selectedContact.phone}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedContact.isOnline ? '• Online' : 'Offline'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Última mensagem</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedContact.lastMessage || 'Nenhuma mensagem'}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Mensagens não lidas</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedContact.unreadCount || 0} mensagens
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCall}
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleVideoCall}
                  className="flex-1"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Videochamada
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowContactInfo(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Seleção de Template */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {requiresTemplate ? 'Template Requerido' : 'Enviar Template'}
            </DialogTitle>
            <DialogDescription>
              {requiresTemplate 
                ? 'Para o WhatsApp Business, a primeira mensagem ou após 24h deve ser um template aprovado.'
                : 'Selecione um template para enviar.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Templates Disponíveis</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id 
                        ? 'bg-green-50 border-green-500 dark:bg-green-900/20' 
                        : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {template.category} - {template.language}
                        </p>
                      </div>
                      <Badge 
                        variant={template.status === 'APPROVED' ? 'default' : 'secondary'}
                        className={template.status === 'APPROVED' ? 'bg-green-600' : ''}
                      >
                        {template.status}
                      </Badge>
                    </div>
                    <p className="text-sm mt-2">
                      {template.components?.find((c: any) => c.type === 'BODY')?.text || template.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Variáveis do Template */}
            {selectedTemplate?.variables?.length > 0 && (
              <div className="grid gap-2">
                <Label>Variáveis do Template</Label>
                <div className="space-y-2">
                  {selectedTemplate.variables.map((variable: string, index: number) => (
                    <Input
                      key={index}
                      placeholder={`Digite ${variable}`}
                      value={templateVariables[index] || ''}
                      onChange={(e) => {
                        const newVars = [...templateVariables]
                        newVars[index] = e.target.value
                        setTemplateVariables(newVars)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {selectedTemplate && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  📱 Preview:
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text
                    ?.replace(/\{\{(\d+)\}\}/g, (match: string, num: string) => 
                      templateVariables[parseInt(num) - 1] || `{{${num}}}`
                    ) || selectedTemplate.name}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  ⏰ Este template abrirá uma janela de 24h para mensagens livres.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTemplateModal(false)
                setSelectedTemplate(null)
                setTemplateVariables([])
                setRequiresTemplate(false)
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSendTemplate}
              disabled={!selectedTemplate}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}