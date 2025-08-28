'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Users,
  Clock,
  User,
  Phone,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Star,
  RefreshCw,
  UserPlus,
  BarChart3,
  Timer
} from 'lucide-react'

interface QueueItem {
  id: string
  phone_number: string
  contact_name: string
  position: number
  status: string
  priority: number
  wait_start_time: string
  wait_time_seconds: number
  assigned_agent_id?: string
}

interface Agent {
  id: string
  name: string
  status: string
  current_chats: number
  max_simultaneous_chats: number
}

interface QueueMetrics {
  waiting_count: number
  avg_wait_time: number
  agents_online: number
  today_count: number
}

export default function QueueMonitorPage() {
  const params = useParams()
  const queueId = params.id as string
  
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)
  const [assignDialog, setAssignDialog] = useState(false)
  const [completeDialog, setCompleteDialog] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')

  const fetchQueueData = useCallback(async () => {
    try {
      // Fetch queue items
      const itemsResponse = await fetch(`/api/v1/queues/${queueId}/items`)
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json()
        setQueueItems(itemsData)
      }

      // Fetch agents for this queue
      const agentsResponse = await fetch(`/api/v1/agents?queue_id=${queueId}`)
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        setAgents(agentsData)
      }

      // Fetch metrics
      const metricsResponse = await fetch(`/api/v1/queues/${queueId}/metrics`)
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }
    } catch (error) {
      console.error('Error fetching queue data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [queueId])

  useEffect(() => {
    fetchQueueData()
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchQueueData, 30000)
    return () => clearInterval(interval)
  }, [fetchQueueData])

  const assignToAgent = async () => {
    if (!selectedItem || !selectedAgent) return

    try {
      const response = await fetch(`/api/v1/queues/items/${selectedItem.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: selectedAgent })
      })

      if (response.ok) {
        setAssignDialog(false)
        setSelectedAgent('')
        fetchQueueData()
      }
    } catch (error) {
      console.error('Error assigning item:', error)
    }
  }

  const completeItem = async () => {
    if (!selectedItem) return

    try {
      const response = await fetch(`/api/v1/queues/items/${selectedItem.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback })
      })

      if (response.ok) {
        setCompleteDialog(false)
        setRating(5)
        setFeedback('')
        fetchQueueData()
      }
    } catch (error) {
      console.error('Error completing item:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'in_progress': return 'bg-green-100 text-green-800 border-green-300'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return 'Aguardando'
      case 'assigned': return 'Atribuído'
      case 'in_progress': return 'Em Atendimento'
      case 'completed': return 'Concluído'
      default: return status
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 2: return 'bg-red-500'
      case 1: return 'bg-orange-500'
      default: return 'bg-green-500'
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 2: return 'Urgente'
      case 1: return 'Alta'
      default: return 'Normal'
    }
  }

  const formatWaitTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes === 0) return `${remainingSeconds}s`
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    return formatWaitTime(diffInSeconds)
  }

  const waitingItems = queueItems.filter(item => item.status === 'waiting')
  const assignedItems = queueItems.filter(item => item.status === 'assigned')
  const inProgressItems = queueItems.filter(item => item.status === 'in_progress')

  const availableAgents = agents.filter(agent => 
    agent.status === 'online' && agent.current_chats < agent.max_simultaneous_chats
  )

  if (isLoading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600\"></div>
      </div>
    )
  }

  return (
    <div className=\"p-6 space-y-6\">
      {/* Header */}
      <div className=\"flex justify-between items-center\">
        <div>
          <h1 className=\"text-3xl font-bold\">Monitor de Fila</h1>
          <p className=\"text-muted-foreground\">
            Monitore e gerencie atendimentos em tempo real
          </p>
        </div>
        <div className=\"flex space-x-2\">
          <Button onClick={fetchQueueData} variant=\"outline\" size=\"sm\">
            <RefreshCw className=\"h-4 w-4 mr-2\" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
          <Card>
            <CardContent className=\"p-6\">
              <div className=\"flex items-center space-x-2\">
                <Users className=\"h-4 w-4 text-yellow-600\" />
                <div>
                  <p className=\"text-sm font-medium text-muted-foreground\">Na Fila</p>
                  <p className=\"text-2xl font-bold\">{metrics.waiting_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className=\"p-6\">
              <div className=\"flex items-center space-x-2\">
                <Timer className=\"h-4 w-4 text-blue-600\" />
                <div>
                  <p className=\"text-sm font-medium text-muted-foreground\">Tempo Médio</p>
                  <p className=\"text-2xl font-bold\">{formatWaitTime(metrics.avg_wait_time)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className=\"p-6\">
              <div className=\"flex items-center space-x-2\">
                <User className=\"h-4 w-4 text-green-600\" />
                <div>
                  <p className=\"text-sm font-medium text-muted-foreground\">Agentes Online</p>
                  <p className=\"text-2xl font-bold\">{metrics.agents_online}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className=\"p-6\">
              <div className=\"flex items-center space-x-2\">
                <BarChart3 className=\"h-4 w-4 text-purple-600\" />
                <div>
                  <p className=\"text-sm font-medium text-muted-foreground\">Hoje</p>
                  <p className=\"text-2xl font-bold\">{metrics.today_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue Sections */}
      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
        {/* Waiting Queue */}
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center space-x-2\">
              <Clock className=\"h-5 w-5 text-yellow-600\" />
              <span>Aguardando ({waitingItems.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className=\"space-y-3\">
            {waitingItems.map((item, index) => (
              <div key={item.id} className=\"p-3 bg-yellow-50 border border-yellow-200 rounded-lg\">
                <div className=\"flex items-center justify-between mb-2\">
                  <div className=\"flex items-center space-x-2\">
                    <div className=\"w-6 h-6 bg-yellow-500 text-white rounded-full text-xs flex items-center justify-center font-bold\">
                      {index + 1}
                    </div>
                    <Avatar className=\"w-8 h-8\">
                      <AvatarFallback className=\"text-xs\">
                        {item.contact_name ? item.contact_name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className=\"font-medium text-sm\">{item.contact_name || 'Cliente'}</p>
                      <p className=\"text-xs text-muted-foreground\">{item.phone_number}</p>
                    </div>
                  </div>
                  <div className=\"flex items-center space-x-2\">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} />
                    <Badge variant=\"outline\" className=\"text-xs\">
                      {getPriorityLabel(item.priority)}
                    </Badge>
                  </div>
                </div>
                <div className=\"flex items-center justify-between\">
                  <span className=\"text-sm text-muted-foreground\">
                    Aguardando há {formatTimeAgo(item.wait_start_time)}
                  </span>
                  {availableAgents.length > 0 && (
                    <Dialog open={assignDialog && selectedItem?.id === item.id} onOpenChange={setAssignDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          size=\"sm\" 
                          variant=\"outline\"
                          onClick={() => setSelectedItem(item)}
                        >
                          <UserPlus className=\"h-3 w-3 mr-1\" />
                          Atribuir
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Atribuir a Agente</DialogTitle>
                          <DialogDescription>
                            Selecione um agente disponível para este atendimento
                          </DialogDescription>
                        </DialogHeader>
                        <div className=\"space-y-4\">
                          <div>
                            <Label>Cliente: {item.contact_name} ({item.phone_number})</Label>
                          </div>
                          <div>
                            <Label htmlFor=\"agent\">Agente</Label>
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                              <SelectTrigger>
                                <SelectValue placeholder=\"Selecione um agente\" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableAgents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.name} ({agent.current_chats}/{agent.max_simultaneous_chats})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className=\"flex justify-end space-x-2\">
                          <Button variant=\"outline\" onClick={() => setAssignDialog(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={assignToAgent} disabled={!selectedAgent}>
                            Atribuir
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
            {waitingItems.length === 0 && (
              <p className=\"text-center text-muted-foreground py-8\">
                Nenhum cliente aguardando
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Queue */}
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center space-x-2\">
              <ArrowRight className=\"h-5 w-5 text-blue-600\" />
              <span>Atribuídos ({assignedItems.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className=\"space-y-3\">
            {assignedItems.map((item) => (
              <div key={item.id} className=\"p-3 bg-blue-50 border border-blue-200 rounded-lg\">
                <div className=\"flex items-center justify-between mb-2\">
                  <div className=\"flex items-center space-x-2\">
                    <Avatar className=\"w-8 h-8\">
                      <AvatarFallback className=\"text-xs\">
                        {item.contact_name ? item.contact_name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className=\"font-medium text-sm\">{item.contact_name || 'Cliente'}</p>
                      <p className=\"text-xs text-muted-foreground\">{item.phone_number}</p>
                    </div>
                  </div>
                  <Badge className=\"text-xs bg-blue-100 text-blue-800\">
                    Atribuído
                  </Badge>
                </div>
                <div className=\"text-sm text-muted-foreground\">
                  Aguardou {formatWaitTime(item.wait_time_seconds)}
                </div>
              </div>
            ))}
            {assignedItems.length === 0 && (
              <p className=\"text-center text-muted-foreground py-8\">
                Nenhum atendimento atribuído
              </p>
            )}
          </CardContent>
        </Card>

        {/* In Progress Queue */}
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center space-x-2\">
              <CheckCircle className=\"h-5 w-5 text-green-600\" />
              <span>Em Atendimento ({inProgressItems.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className=\"space-y-3\">
            {inProgressItems.map((item) => (
              <div key={item.id} className=\"p-3 bg-green-50 border border-green-200 rounded-lg\">
                <div className=\"flex items-center justify-between mb-2\">
                  <div className=\"flex items-center space-x-2\">
                    <Avatar className=\"w-8 h-8\">
                      <AvatarFallback className=\"text-xs\">
                        {item.contact_name ? item.contact_name.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className=\"font-medium text-sm\">{item.contact_name || 'Cliente'}</p>
                      <p className=\"text-xs text-muted-foreground\">{item.phone_number}</p>
                    </div>
                  </div>
                  <Dialog open={completeDialog && selectedItem?.id === item.id} onOpenChange={setCompleteDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        size=\"sm\" 
                        variant=\"outline\"
                        onClick={() => setSelectedItem(item)}
                      >
                        <CheckCircle className=\"h-3 w-3 mr-1\" />
                        Finalizar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Finalizar Atendimento</DialogTitle>
                        <DialogDescription>
                          Avalie o atendimento realizado
                        </DialogDescription>
                      </DialogHeader>
                      <div className=\"space-y-4\">
                        <div>
                          <Label>Cliente: {item.contact_name} ({item.phone_number})</Label>
                        </div>
                        <div>
                          <Label htmlFor=\"rating\">Avaliação (1-5 estrelas)</Label>
                          <div className=\"flex items-center space-x-1 mt-2\">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`p-1 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                              >
                                <Star className={`h-5 w-5 ${rating >= star ? 'fill-current' : ''}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor=\"feedback\">Observações (opcional)</Label>
                          <Textarea
                            id=\"feedback\"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder=\"Comentários sobre o atendimento...\"
                          />
                        </div>
                      </div>
                      <div className=\"flex justify-end space-x-2\">
                        <Button variant=\"outline\" onClick={() => setCompleteDialog(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={completeItem}>
                          Finalizar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className=\"text-sm text-muted-foreground\">
                  Em atendimento
                </div>
              </div>
            ))}
            {inProgressItems.length === 0 && (
              <p className=\"text-center text-muted-foreground py-8\">
                Nenhum atendimento em andamento
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}