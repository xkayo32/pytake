import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone,
  MessageSquare,
  Zap,
  Shield,
  Globe,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  Play,
  TrendingUp,
  MessageCircle,
  Bot,
  Webhook,
  Database,
  Layers,
  ArrowRight,
  Star,
  Activity,
  Send,
  Phone,
  Video,
  Image,
  FileText,
  Settings,
  Headphones,
  Target,
  Rocket,
  Wifi,
  WifiOff
} from 'lucide-react'

interface ChatMessage {
  id: string
  sender: 'user' | 'agent' | 'bot'
  message: string
  timestamp: string
  type: 'text' | 'image' | 'file'
  status?: 'sent' | 'delivered' | 'read'
}

interface Feature {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  stats: string
  color: string
}

interface MetricCard {
  label: string
  value: string
  change: string
  color: string
  icon: React.ComponentType<{ className?: string }>
}

export default function WhatsAppShowcasePage() {
  const [currentDemo, setCurrentDemo] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [liveMetrics, setLiveMetrics] = useState({
    activeUsers: 1247,
    messagesPerMinute: 342,
    responseTime: 1.2,
    satisfaction: 96.8
  })

  // Simulated real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 10) - 5,
        messagesPerMinute: prev.messagesPerMinute + Math.floor(Math.random() * 20) - 10,
        responseTime: Math.max(0.5, prev.responseTime + (Math.random() - 0.5) * 0.2),
        satisfaction: Math.min(100, Math.max(85, prev.satisfaction + (Math.random() - 0.5) * 1))
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Demo conversation simulation
  const demoMessages: ChatMessage[] = [
    {
      id: '1',
      sender: 'user',
      message: 'Olá! Gostaria de saber mais sobre seus produtos.',
      timestamp: '14:30',
      type: 'text',
      status: 'read'
    },
    {
      id: '2',
      sender: 'bot',
      message: 'Olá! Bem-vindo à nossa loja. Posso ajudar você a encontrar o produto ideal. Que tipo de produto você está procurando?',
      timestamp: '14:30',
      type: 'text',
      status: 'read'
    },
    {
      id: '3',
      sender: 'user',
      message: 'Estou interessado em notebooks para trabalho.',
      timestamp: '14:32',
      type: 'text',
      status: 'read'
    },
    {
      id: '4',
      sender: 'agent',
      message: 'Perfeito! Temos várias opções excelentes. Deixe-me transferir você para nosso especialista em notebooks.',
      timestamp: '14:33',
      type: 'text',
      status: 'delivered'
    }
  ]

  useEffect(() => {
    if (isPlaying && currentDemo === 1) {
      let messageIndex = 0
      const interval = setInterval(() => {
        if (messageIndex < demoMessages.length) {
          setChatMessages(prev => [...prev, demoMessages[messageIndex]])
          messageIndex++
        } else {
          setIsPlaying(false)
          setTimeout(() => {
            setChatMessages([])
          }, 3000)
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [isPlaying, currentDemo])

  const features: Feature[] = [
    {
      icon: MessageSquare,
      title: 'API WhatsApp Business',
      description: 'Integração completa com WhatsApp Business API oficial e Evolution API',
      stats: '99.9% uptime',
      color: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    },
    {
      icon: Bot,
      title: 'Chatbots Inteligentes',
      description: 'Respostas automáticas com IA e fluxos conversacionais avançados',
      stats: '87% automação',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
    },
    {
      icon: Users,
      title: 'Múltiplos Agentes',
      description: 'Gestão de equipes com distribuição inteligente de conversas',
      stats: '24/7 suporte',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avançado',
      description: 'Métricas detalhadas e relatórios em tempo real',
      stats: '50+ métricas',
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
    },
    {
      icon: Webhook,
      title: 'Webhooks & APIs',
      description: 'Integração com sistemas externos via REST APIs e webhooks',
      stats: '100+ integrações',
      color: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    },
    {
      icon: Shield,
      title: 'Segurança Enterprise',
      description: 'Criptografia end-to-end e compliance com LGPD',
      stats: 'LGPD compliant',
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
    }
  ]

  const metrics: MetricCard[] = [
    {
      label: 'Usuários Ativos',
      value: liveMetrics.activeUsers.toLocaleString(),
      change: '+12.5%',
      color: 'text-blue-600',
      icon: Users
    },
    {
      label: 'Msgs/Minuto',
      value: liveMetrics.messagesPerMinute.toString(),
      change: '+8.3%',
      color: 'text-green-600',
      icon: MessageCircle
    },
    {
      label: 'Tempo Resposta',
      value: `${liveMetrics.responseTime.toFixed(1)}s`,
      change: '-15.2%',
      color: 'text-orange-600',
      icon: Clock
    },
    {
      label: 'Satisfação',
      value: `${liveMetrics.satisfaction.toFixed(1)}%`,
      change: '+2.1%',
      color: 'text-purple-600',
      icon: Star
    }
  ]

  const demos = [
    {
      title: 'Instâncias WhatsApp',
      description: 'Gerencie múltiplas contas WhatsApp Business em uma única plataforma'
    },
    {
      title: 'Chat em Tempo Real',
      description: 'Interface de conversação moderna com notificações em tempo real'
    },
    {
      title: 'Webhooks & Automação',
      description: 'Sistema de webhooks para integração com sistemas externos'
    },
    {
      title: 'Analytics & Métricas',
      description: 'Dashboard completo com métricas de performance e engagement'
    }
  ]

  const whatsappInstances = [
    {
      id: 1,
      name: 'Vendas - Loja Principal',
      phone: '+55 11 99999-9999',
      status: 'connected',
      messages: 1547,
      qrCode: true
    },
    {
      id: 2,
      name: 'Suporte Técnico',
      phone: '+55 11 88888-8888',
      status: 'connected',
      messages: 892,
      qrCode: false
    },
    {
      id: 3,
      name: 'Marketing Campaigns',
      phone: '+55 11 77777-7777',
      status: 'disconnected',
      messages: 0,
      qrCode: true
    }
  ]

  const startDemo = (demoIndex: number) => {
    setCurrentDemo(demoIndex)
    setIsPlaying(true)
    if (demoIndex === 1) {
      setChatMessages([])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              PyTake
              <span className="bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                {' '}WhatsApp
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Plataforma empresarial completa para gestão de conversas WhatsApp Business com IA, automação e analytics avançados
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Demonstração Interativa
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Documentação API
              </motion.button>
            </div>

            {/* Live Status Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400"
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Sistema Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span>{liveMetrics.activeUsers.toLocaleString()} usuários ativos</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                <span>{liveMetrics.messagesPerMinute} msgs/min</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Live Metrics Dashboard */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Métricas em Tempo Real
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Acompanhe o desempenho do seu sistema em tempo real
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <metric.icon className={`h-8 w-8 ${metric.color}`} />
                <span className={`text-sm font-medium ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {metric.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Demonstrações Interativas
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Explore as funcionalidades principais do PyTake
          </p>
        </motion.div>

        {/* Demo Selector */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {demos.map((demo, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => startDemo(index)}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentDemo === index
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {demo.title}
            </motion.button>
          ))}
        </div>

        {/* Demo Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {demos[currentDemo].title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {demos[currentDemo].description}
                </p>
              </div>
              {currentDemo === 1 && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => startDemo(1)}
                  className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg font-medium"
                >
                  <Play className="h-4 w-4" />
                  <span>Iniciar Demo</span>
                </motion.button>
              )}
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* WhatsApp Instances Demo */}
              {currentDemo === 0 && (
                <motion.div
                  key="instances"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-4"
                >
                  {whatsappInstances.map((instance) => (
                    <div
                      key={instance.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-4 h-4 rounded-full ${
                            instance.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {instance.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {instance.phone}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {instance.messages}
                            </p>
                            <p className="text-xs text-gray-500">mensagens hoje</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {instance.status === 'connected' ? (
                              <Wifi className="h-5 w-5 text-green-500" />
                            ) : (
                              <WifiOff className="h-5 w-5 text-red-500" />
                            )}
                            
                            {instance.qrCode && (
                              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded border-2 border-dashed border-gray-400 flex items-center justify-center">
                                <span className="text-xs text-gray-500">QR</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Chat Demo */}
              {currentDemo === 1 && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="h-96 flex flex-col"
                >
                  <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {chatMessages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'user'
                            ? 'bg-blue-500 text-white'
                            : message.sender === 'bot'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {message.timestamp}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <button className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors">
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Webhooks Demo */}
              {currentDemo === 2 && (
                <motion.div
                  key="webhooks"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Webhook Events
                      </h4>
                      <div className="space-y-2">
                        {['message_received', 'message_sent', 'user_joined', 'status_updated'].map((event) => (
                          <div key={event} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border">
                            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{event}</span>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Integration Status
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">CRM System</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">E-commerce</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Analytics</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Analytics Demo */}
              {currentDemo === 3 && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                      <TrendingUp className="h-8 w-8 mb-2" />
                      <p className="text-2xl font-bold">2,847</p>
                      <p className="text-sm opacity-90">Conversas este mês</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                      <Clock className="h-8 w-8 mb-2" />
                      <p className="text-2xl font-bold">1.2s</p>
                      <p className="text-sm opacity-90">Tempo médio resposta</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                      <Star className="h-8 w-8 mb-2" />
                      <p className="text-2xl font-bold">96.8%</p>
                      <p className="text-sm opacity-90">Taxa de satisfação</p>
                    </div>
                  </div>
                  
                  <div className="h-32 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Gráfico interativo de conversas (simulação)
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Funcionalidades Principais
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Tudo que você precisa para uma gestão profissional do WhatsApp Business
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="h-6 w-6" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {feature.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {feature.stats}
                </span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-4">
              Pronto para revolucionar sua comunicação?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Comece a usar o PyTake hoje e transforme a gestão de WhatsApp Business da sua empresa
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                Iniciar Teste Gratuito
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all"
              >
                Falar com Especialista
              </motion.button>
            </div>
            
            <p className="text-sm mt-6 opacity-75">
              Sem compromisso • Setup em 5 minutos • Suporte 24/7
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}