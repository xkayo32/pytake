import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  Users, 
  Settings,
  CheckCircle,
  RefreshCw
} from 'lucide-react'

interface Queue {
  id: string
  name: string
  description: string
  department: string
  agents_online: number
  current_size: number
  max_queue_size: number
  avg_wait_time: number
  is_active: boolean
}

interface TransferToQueuePropertiesProps {
  nodeData: any
  onUpdate: (data: any) => void
}

export function TransferToQueueProperties({ nodeData, onUpdate }: TransferToQueuePropertiesProps) {
  const [config, setConfig] = useState({
    queueId: '',
    queueName: '',
    priority: 0,
    customName: '',
    message: '',
    transferReason: '',
    department: '',
    skillRequired: [] as string[],
    waitTimeoutMinutes: 30,
    fallbackAction: 'abandon' as 'abandon' | 'callback' | 'voicemail',
    metadata: {},
    ...nodeData.config
  })
  
  const [queues, setQueues] = useState<Queue[]>([])
  const [isLoadingQueues, setIsLoadingQueues] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null)

  // Carregar filas disponíveis
  useEffect(() => {
    loadQueues()
  }, [])

  // Encontrar fila selecionada
  useEffect(() => {
    if (config.queueId && queues.length > 0) {
      const queue = queues.find(q => q.id === config.queueId)
      setSelectedQueue(queue || null)
    } else {
      setSelectedQueue(null)
    }
  }, [config.queueId, queues])

  const loadQueues = async () => {
    setIsLoadingQueues(true)
    try {
      const response = await fetch('/api/v1/queues')
      if (response.ok) {
        const data = await response.json()
        setQueues(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading queues:', error)
    } finally {
      setIsLoadingQueues(false)
    }
  }

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...config, [field]: value }
    setConfig(newConfig)
    onUpdate({ ...nodeData, config: newConfig })
  }

  const handleQueueSelect = (queueId: string) => {
    const queue = queues.find(q => q.id === queueId)
    if (queue) {
      const newConfig = {
        ...config,
        queueId: queue.id,
        queueName: queue.name,
        department: queue.department
      }
      setConfig(newConfig)
      onUpdate({ ...nodeData, config: newConfig })
    }
  }

  const priorityOptions = [
    { value: 0, label: 'Normal', color: 'bg-gray-100 text-gray-700' },
    { value: 1, label: 'Alta', color: 'bg-yellow-100 text-yellow-700' },
    { value: 2, label: 'Urgente', color: 'bg-red-100 text-red-700' }
  ]

  const fallbackOptions = [
    { value: 'abandon', label: 'Abandonar', description: 'Finaliza a conversa' },
    { value: 'callback', label: 'Callback', description: 'Agenda retorno de chamada' },
    { value: 'voicemail', label: 'Voicemail', description: 'Deixa mensagem gravada' }
  ]

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Transfer to Queue</h3>
      </div>

      {/* Nome personalizado */}
      <div className="space-y-2">
        <Label htmlFor="customName">Nome do Node (Opcional)</Label>
        <Input
          id="customName"
          value={config.customName}
          onChange={(e) => handleConfigChange('customName', e.target.value)}
          placeholder="Ex: Transferir para Suporte"
        />
      </div>

      {/* Seleção de Fila */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Fila de Destino
            <Button
              variant="ghost"
              size="sm"
              onClick={loadQueues}
              disabled={isLoadingQueues}
              className="h-6 w-6 p-0 ml-auto"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingQueues ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>
            Selecione a fila para onde a conversa será transferida
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="queue">Fila</Label>
            <Select
              value={config.queueId}
              onValueChange={handleQueueSelect}
              disabled={isLoadingQueues || queues.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoadingQueues 
                    ? "Carregando filas..." 
                    : queues.length === 0 
                      ? "Nenhuma fila disponível" 
                      : "Selecione uma fila"
                } />
              </SelectTrigger>
              <SelectContent>
                {queues.filter(q => q.is_active).map((queue) => (
                  <SelectItem key={queue.id} value={queue.id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{queue.name}</div>
                        <div className="text-xs text-muted-foreground">{queue.department}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600">{queue.agents_online} online</span>
                        <span className="text-muted-foreground">{queue.current_size}/{queue.max_queue_size}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedQueue && (
            <div className="p-3 bg-slate-50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{selectedQueue.name}</h4>
                <Badge variant={selectedQueue.is_active ? "default" : "secondary"}>
                  {selectedQueue.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedQueue.description}</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Agentes:</span>
                  <br />
                  <span className="font-medium">{selectedQueue.agents_online} online</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fila:</span>
                  <br />
                  <span className="font-medium">{selectedQueue.current_size}/{selectedQueue.max_queue_size}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tempo médio:</span>
                  <br />
                  <span className="font-medium">{formatWaitTime(selectedQueue.avg_wait_time)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações Avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações da Transferência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={config.priority.toString()}
              onValueChange={(value) => handleConfigChange('priority', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    <div className="flex items-center gap-2">
                      <Badge className={option.color}>
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem de transferência */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem ao Transferir (Opcional)</Label>
            <Textarea
              id="message"
              value={config.message}
              onChange={(e) => handleConfigChange('message', e.target.value)}
              placeholder="Você está sendo transferido para nossa equipe de suporte..."
              rows={3}
            />
          </div>

          {/* Motivo da transferência */}
          <div className="space-y-2">
            <Label htmlFor="transferReason">Motivo da Transferência</Label>
            <Input
              id="transferReason"
              value={config.transferReason}
              onChange={(e) => handleConfigChange('transferReason', e.target.value)}
              placeholder="Ex: Solicitação técnica complexa"
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeout e Fallback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeout e Fallback
          </CardTitle>
          <CardDescription>
            Configure o que acontece se não houver agentes disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeout */}
          <div className="space-y-2">
            <Label htmlFor="waitTimeout">Tempo Limite de Espera (minutos)</Label>
            <Input
              id="waitTimeout"
              type="number"
              min="1"
              max="120"
              value={config.waitTimeoutMinutes}
              onChange={(e) => handleConfigChange('waitTimeoutMinutes', parseInt(e.target.value) || 30)}
            />
            <p className="text-xs text-muted-foreground">
              Tempo máximo que o usuário ficará na fila aguardando atendimento
            </p>
          </div>

          {/* Ação de fallback */}
          <div className="space-y-2">
            <Label htmlFor="fallback">Ação quando Timeout</Label>
            <Select
              value={config.fallbackAction}
              onValueChange={(value) => handleConfigChange('fallbackAction', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fallbackOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Status de configuração */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
        {config.queueId && config.queueName ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              Configuração completa - Pronto para transferir para "{config.queueName}"
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700">
              Selecione uma fila para completar a configuração
            </span>
          </>
        )}
      </div>
    </div>
  )
}