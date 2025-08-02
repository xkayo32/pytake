import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Minimize2, User, Bot, Phone, Mail, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
  options?: string[]
}

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! 👋 Bem-vindo ao PyTake!',
      isUser: false,
      timestamp: new Date()
    },
    {
      id: '2',
      text: 'Como posso ajudar você hoje?',
      isUser: false,
      timestamp: new Date(),
      options: ['Ver preços', 'Agendar demo', 'Falar com vendas', 'Dúvidas técnicas']
    }
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto open after 10 seconds on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedBefore')
    if (!hasVisited) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        localStorage.setItem('hasVisitedBefore', 'true')
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [])

  const generateBotResponse = (userMessage: string): { text: string; options?: string[] } => {
    const lowerMessage = userMessage.toLowerCase()
    
    // Respostas baseadas em palavras-chave
    if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('custo')) {
      return {
        text: 'Nossos planos começam em R$ 97/mês! Temos 3 opções:\n\n💎 Starter: R$ 97/mês\n🚀 Professional: R$ 297/mês (mais popular)\n🏢 Enterprise: Sob consulta\n\nQual plano te interessou mais?',
        options: ['Starter', 'Professional', 'Enterprise', 'Comparar planos']
      }
    }
    
    if (lowerMessage.includes('demo') || lowerMessage.includes('demonstração')) {
      return {
        text: 'Ótimo! Adoraria mostrar como o PyTake pode transformar seu atendimento. Nossa demo leva apenas 15 minutos e você verá na prática todos os recursos.',
        options: ['Agendar para hoje', 'Agendar para amanhã', 'Escolher outro dia', 'Receber por e-mail']
      }
    }
    
    if (lowerMessage.includes('vendas') || lowerMessage.includes('comercial')) {
      return {
        text: 'Perfeito! Vou conectar você com nosso time comercial. Eles são especialistas em encontrar a melhor solução para seu negócio. Como prefere ser contactado?',
        options: ['WhatsApp', 'Telefone', 'E-mail', 'Agendar reunião']
      }
    }
    
    if (lowerMessage.includes('funciona') || lowerMessage.includes('como')) {
      return {
        text: 'O PyTake é super simples! Em 3 passos:\n\n1️⃣ Conecte seu WhatsApp Business\n2️⃣ Configure respostas automáticas\n3️⃣ Gerencie todas conversas em um só lugar\n\nQuer ver funcionando?',
        options: ['Ver vídeo demo', 'Testar grátis', 'Ver recursos', 'Falar com especialista']
      }
    }
    
    if (lowerMessage.includes('teste') || lowerMessage.includes('grátis') || lowerMessage.includes('trial')) {
      return {
        text: 'Sim! Oferecemos 7 dias de teste grátis, sem precisar cartão de crédito! 🎉\n\nVocê terá acesso completo a todos os recursos. Posso criar sua conta agora mesmo?',
        options: ['Criar conta grátis', 'Saber mais', 'Ver planos', 'Tenho dúvidas']
      }
    }
    
    // Respostas para opções específicas
    if (lowerMessage === 'starter' || lowerMessage === 'professional' || lowerMessage === 'enterprise') {
      return {
        text: `Excelente escolha! O plano ${userMessage} é perfeito para ${
          lowerMessage === 'starter' ? 'pequenos negócios que querem começar a automatizar' :
          lowerMessage === 'professional' ? 'empresas em crescimento que precisam escalar' :
          'grandes empresas com necessidades específicas'
        }. Vamos criar sua conta?`,
        options: ['Começar agora', 'Ver detalhes', 'Comparar planos', 'Falar com vendas']
      }
    }
    
    // Resposta padrão
    return {
      text: 'Entendi! Deixa eu te ajudar melhor. Sobre o que você gostaria de saber?',
      options: ['Recursos do sistema', 'Preços e planos', 'Como funciona', 'Teste grátis']
    }
  }

  const handleSend = (text?: string) => {
    const messageText = text || message.trim()
    if (!messageText) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date()
    }

    setMessages([...messages, newMessage])
    setMessage('')
    setIsTyping(true)

    // Simular digitação do bot
    setTimeout(() => {
      const botResponse = generateBotResponse(messageText)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse.text,
        isUser: false,
        timestamp: new Date(),
        options: botResponse.options
      }
      
      setMessages(prev => [...prev, botMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleOptionClick = (option: string) => {
    handleSend(option)
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
          isOpen ? "scale-0" : "scale-100 hover:scale-110"
        )}
      >
        <div className="relative p-4">
          <MessageCircle size={24} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 bg-card border border-border rounded-2xl shadow-2xl transition-all duration-300 flex flex-col",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
          isMinimized ? "h-[70px]" : "h-[600px]",
          "w-[400px] max-w-[calc(100vw-3rem)]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Bot className="text-primary-foreground" size={20} />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">PyTake Support</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Online agora
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <Minimize2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div
                    className={cn(
                      "flex gap-2",
                      msg.isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!msg.isUser && (
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot size={16} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                        msg.isUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      )}
                    >
                      {msg.text}
                    </div>
                    {msg.isUser && (
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={16} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Reply Options */}
                  {msg.options && (
                    <div className="mt-3 ml-10 flex flex-wrap gap-2">
                      {msg.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleOptionClick(option)}
                          className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-2 items-center">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Footer Info */}
            <div className="px-4 py-2 bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <span className="flex items-center gap-1">
                  <Phone size={12} />
                  Atendimento rápido
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail size={12} />
                  Resposta em minutos
                </span>
              </p>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="px-3"
                  disabled={isTyping || !message.trim()}
                >
                  <Send size={16} />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  )
}