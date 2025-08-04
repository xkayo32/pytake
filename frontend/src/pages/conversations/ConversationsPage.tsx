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
import { Badge } from '@/components/ui/badge'

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

  // Connection status will be managed by real WebSocket connection
  useEffect(() => {
    // TODO: Connect to real WebSocket for connection status
    setIsConnected(true)
  }, [])

  return (
    <div className="h-full">
      {/* Clean Header */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="border-b border-border/50 bg-background p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-medium text-foreground">Conversas</h1>
                <p className="text-sm text-muted-foreground">
                  WhatsApp Business
                </p>
              </div>
            </div>

            {/* Clean Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs ${
              isConnected 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
            }`}>
              {isConnected ? (
                <>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>

          {/* Clean Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Contatos
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova
            </Button>
          </div>
        </div>

        {/* Clean Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
        >
          <div className="bg-card rounded-lg border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-medium text-foreground">{stats.total}</p>
              </div>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ativas</p>
                <p className="text-lg font-medium text-primary">{stats.active}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-lg font-medium text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Resolvidas</p>
                <p className="text-lg font-medium text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </motion.div>

        {/* Clean Search and Filter */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center space-x-1">
            {(['all', 'active', 'pending', 'resolved'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterStatus(status)}
                className="text-xs px-3"
              >
                {status === 'all' && 'Todas'}
                {status === 'active' && 'Ativas'}
                {status === 'pending' && 'Pendentes'}
                {status === 'resolved' && 'Resolvidas'}
              </Button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Clean Chat Container */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.2 }}
        className="h-[calc(100vh-280px)]"
      >
        <ChatContainer />
      </motion.div>

      {/* Clean Floating Action */}
      <AnimatePresence>
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="lg:hidden fixed bottom-6 right-6 z-50"
        >
          <Button size="lg" className="rounded-full w-12 h-12 p-0">
            <Plus className="h-5 w-5" />
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}