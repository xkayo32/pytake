import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Filter,
  Search,
  Plus,
  Users,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/Badge'

interface ConversationStats {
  total: number
  active: number
  pending: number
  resolved: number
}

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending' | 'resolved'>('all')
  const [isConnected, setIsConnected] = useState(true)
  const [stats, setStats] = useState<ConversationStats>({
    total: 24,
    active: 12,
    pending: 8,
    resolved: 4
  })

  // Simulate connection status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(prev => {
        // Occasionally simulate connection drops for demo
        if (Math.random() < 0.1) {
          return !prev
        }
        return true
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full bg-background">
      {/* Enhanced Header with Stats and Controls */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border bg-card p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Conversas</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie todas as conversas do WhatsApp Business
                </p>
              </div>
            </div>

            {/* Connection Status */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>WhatsApp Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>Reconnectando...</span>
                </>
              )}
            </motion.div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Contatos
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-background rounded-lg border border-border p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-background rounded-lg border border-border p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-background rounded-lg border border-border p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-foreground">{stats.pending}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-background rounded-lg border border-border p-4"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Phone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolvidas</p>
                <p className="text-xl font-bold text-foreground">{stats.resolved}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Search and Filter Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center space-x-1">
              {(['all', 'active', 'pending', 'resolved'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                  className="text-xs"
                >
                  {status === 'all' && 'Todas'}
                  {status === 'active' && 'Ativas'}
                  {status === 'pending' && 'Pendentes'}
                  {status === 'resolved' && 'Resolvidas'}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Chat Container with Animation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="h-[calc(100vh-280px)]"
      >
        <ChatContainer />
      </motion.div>

      {/* Floating Action for Mobile */}
      <AnimatePresence>
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="lg:hidden fixed bottom-6 right-6 z-50"
        >
          <Button size="lg" className="rounded-full shadow-lg">
            <Plus className="h-5 w-5" />
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}