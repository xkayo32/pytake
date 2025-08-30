'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  MessageSquare,
  Activity,
  Settings,
  Coffee,
  Pause
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  email: string
  status: string
  avatar_url?: string
  current_chats: number
  max_simultaneous_chats: number
  capacity_percentage: number
  last_activity_at?: string
}

interface Queue {
  id: string
  name: string
  department: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [queues, setQueues] = useState<Queue[]>([])
  const [selectedQueue, setSelectedQueue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  useEffect(() => {
    fetchAgents()
    fetchQueues()
  }, [selectedQueue])

  const fetchAgents = async () => {
    try {
      const url = selectedQueue 
        ? `/api/v1/agents?queue_id=${selectedQueue}`
        : '/api/v1/agents'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAgents(data)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/v1/queues')
      if (response.ok) {
        const data = await response.json()
        setQueues(data)
      }
    } catch (error) {
      console.error('Error fetching queues:', error)
    }
  }

  const updateAgentStatus = async (agentId: string, status: string) => {
    try {
      const response = await fetch(`/api/v1/agents/${agentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        fetchAgents()
      }
    } catch (error) {
      console.error('Error updating agent status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'busy': return 'bg-red-500'
      case 'away': return 'bg-yellow-500'
      case 'break': return 'bg-blue-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Online'
      case 'busy': return 'Ocupado'
      case 'away': return 'Ausente'
      case 'break': return 'Pausa'
      case 'offline': return 'Offline'
      default: return 'Desconhecido'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return UserCheck
      case 'busy': return MessageSquare
      case 'away': return Clock
      case 'break': return Coffee
      case 'offline': return UserX
      default: return Users
    }
  }

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return 'Nunca'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return `${Math.floor(diffInMinutes / 1440)}d atrás`
  }

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const onlineAgents = agents.filter(a => a.status === 'online')
  const busyAgents = agents.filter(a => a.status === 'busy')
  const awayAgents = agents.filter(a => a.status === 'away')
  const offlineAgents = agents.filter(a => a.status === 'offline')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agentes</h1>
          <p className="text-muted-foreground">
            Monitore e gerencie agentes de atendimento
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedQueue} onValueChange={setSelectedQueue}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por fila" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as filas</SelectItem>
              {queues.map((queue) => (
                <SelectItem key={queue.id} value={queue.id}>
                  {queue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Online</p>
                <p className="text-2xl font-bold">{onlineAgents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ocupados</p>
                <p className="text-2xl font-bold">{busyAgents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ausentes</p>
                <p className="text-2xl font-bold">{awayAgents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserX className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold">{offlineAgents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const StatusIcon = getStatusIcon(agent.status)
          return (
            <Card key={agent.id} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(agent.status)}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={agent.avatar_url} />
                    <AvatarFallback>
                      {agent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{agent.email}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(agent.status)} text-white border-0`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {getStatusLabel(agent.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Capacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Capacidade</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCapacityColor(agent.capacity_percentage)}`}>
                      {agent.current_chats}/{agent.max_simultaneous_chats} ({Math.round(agent.capacity_percentage)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        agent.capacity_percentage >= 90 ? 'bg-red-500' :
                        agent.capacity_percentage >= 70 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(agent.capacity_percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Last Activity */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Activity className="h-4 w-4" />
                    <span>Última atividade</span>
                  </div>
                  <span>{formatLastActivity(agent.last_activity_at)}</span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Select 
                    value={agent.status} 
                    onValueChange={(value) => updateAgentStatus(agent.id, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span>Online</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="away">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span>Ausente</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="break">
                        <div className="flex items-center space-x-2">
                          <Coffee className="h-4 w-4 text-blue-600" />
                          <span>Pausa</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="offline">
                        <div className="flex items-center space-x-2">
                          <UserX className="h-4 w-4 text-gray-600" />
                          <span>Offline</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Detalhes do Agente</DialogTitle>
                        <DialogDescription>
                          Informações detalhadas sobre {agent.name}
                        </DialogDescription>
                      </DialogHeader>
                      {selectedAgent && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Email</label>
                              <p className="text-sm">{selectedAgent.email}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Status</label>
                              <p className="text-sm">{getStatusLabel(selectedAgent.status)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Chats Atuais</label>
                              <p className="text-sm">{selectedAgent.current_chats}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Capacidade Máxima</label>
                              <p className="text-sm">{selectedAgent.max_simultaneous_chats}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {agents.length === 0 && (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum agente encontrado</h3>
          <p className="text-muted-foreground">
            {selectedQueue 
              ? 'Nenhum agente encontrado para a fila selecionada'
              : 'Cadastre agentes para começar a usar o sistema de filas'
            }
          </p>
        </Card>
      )}
    </div>
  )
}