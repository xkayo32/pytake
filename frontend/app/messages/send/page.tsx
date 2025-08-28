'use client'

import { useState, useEffect } from 'react'
import { 
  Send, 
  Users, 
  MessageCircle,
  FileText,
  Filter,
  Plus,
  Upload,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Hash,
  Target,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/layout/app-layout'
import { notify } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Contact {
  id: string
  name: string
  phone: string
  tags: string[]
  lastInteraction: string
}

interface Template {
  id: string
  name: string
  content: string
  category: string
  status: 'approved' | 'pending' | 'rejected'
  variables: string[]
}

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'scheduled' | 'sending' | 'completed'
  recipients: number
  sent: number
  delivered: number
  read: number
  replied: number
  scheduledAt?: string
}

export default function SendMessagesPage() {
  const [messageType, setMessageType] = useState<'instant' | 'template' | 'campaign'>('instant')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  
  // Carregar templates reais do sistema
  useEffect(() => {
    loadTemplates()
    loadContacts()
  }, [])

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await fetch('/api/v1/whatsapp/templates')
      if (response.ok) {
        const data = await response.json()
        console.log('Templates API response:', data)
        
        // Verificar se data é um array ou tem uma propriedade que é array
        let templatesArray = []
        if (Array.isArray(data)) {
          templatesArray = data
        } else if (data.templates && Array.isArray(data.templates)) {
          templatesArray = data.templates
        } else if (data.data && Array.isArray(data.data)) {
          templatesArray = data.data
        } else {
          console.warn('Unexpected template response format:', data)
          templatesArray = []
        }
        
        // Transformar dados da API para o formato esperado
        const formattedTemplates = templatesArray.map((template: any) => ({
          id: template.id || template.name || Math.random().toString(),
          name: template.name || 'Template sem nome',
          content: template.components?.[0]?.text || 
                  template.body || 
                  template.text || 
                  template.content || 
                  'Conteúdo não disponível',
          category: template.category || 'MARKETING',
          status: (template.status === 'APPROVED' || template.status === 'approved') ? 'approved' : 
                 (template.status === 'PENDING' || template.status === 'pending') ? 'pending' : 
                 (template.status === 'REJECTED' || template.status === 'rejected') ? 'rejected' : 
                 'approved', // Default para approved se não tiver status
          variables: extractVariables(
            template.components?.[0]?.text || 
            template.body || 
            template.text || 
            template.content || 
            ''
          )
        }))
        
        // Se não houver templates, usar exemplos
        if (formattedTemplates.length === 0) {
          setTemplates(getDefaultTemplates())
        } else {
          setTemplates(formattedTemplates)
        }
      } else {
        console.warn('Templates API returned non-OK status:', response.status)
        setTemplates(getDefaultTemplates())
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      // Usar templates de exemplo se a API falhar
      setTemplates(getDefaultTemplates())
    } finally {
      setIsLoadingTemplates(false)
    }
  }
  
  const getDefaultTemplates = (): Template[] => {
    return [
      {
        id: 'welcome_default',
        name: 'Boas-vindas',
        content: 'Olá {{1}}! Bem-vindo ao nosso serviço. Como posso ajudar?',
        category: 'MARKETING',
        status: 'approved',
        variables: ['Nome']
      },
      {
        id: 'order_confirmation',
        name: 'Confirmação de Pedido',
        content: 'Seu pedido {{1}} foi confirmado! Valor: R$ {{2}}. Acompanhe em nosso site.',
        category: 'TRANSACTIONAL',
        status: 'approved',
        variables: ['Número do Pedido', 'Valor']
      },
      {
        id: 'promotion',
        name: 'Promoção',
        content: 'Olá {{1}}! Temos uma oferta especial para você: {{2}}% de desconto!',
        category: 'MARKETING',
        status: 'approved',
        variables: ['Nome', 'Desconto']
      }
    ]
  }

  const loadContacts = async () => {
    setIsLoadingContacts(true)
    try {
      const response = await fetch('/api/v1/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setIsLoadingContacts(false)
    }
  }

  // Extrair variáveis do template ({{1}}, {{2}}, etc)
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\d+)\}\}/g)
    if (!matches) return []
    
    const uniqueNumbers = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))].sort()
    return uniqueNumbers.map(num => `Variável ${num}`)
  }

  const recentCampaigns: Campaign[] = [
    {
      id: '1',
      name: 'Black Friday 2024',
      status: 'completed',
      recipients: 5420,
      sent: 5420,
      delivered: 5380,
      read: 4250,
      replied: 380
    },
    {
      id: '2',
      name: 'Lançamento Produto X',
      status: 'sending',
      recipients: 2000,
      sent: 1450,
      delivered: 1430,
      read: 980,
      replied: 45
    },
    {
      id: '3',
      name: 'Newsletter Dezembro',
      status: 'scheduled',
      recipients: 3500,
      sent: 0,
      delivered: 0,
      read: 0,
      replied: 0,
      scheduledAt: '2024-12-01T09:00:00'
    }
  ]

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedTemplate) {
      notify.error('Digite uma mensagem ou selecione um template')
      return
    }

    if (selectedContacts.length === 0 && messageType !== 'campaign') {
      notify.error('Selecione pelo menos um contato')
      return
    }

    setIsSending(true)
    
    try {
      if (messageType === 'template' && selectedTemplate) {
        // Enviar template
        const template = templates.find(t => t.id === selectedTemplate)
        if (template) {
          const response = await fetch('/api/v1/whatsapp/send-template', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: selectedContacts,
              template_name: template.name,
              template_params: [] // TODO: Coletar valores das variáveis
            })
          })
          
          if (response.ok) {
            notify.success(`Template enviado para ${selectedContacts.length} contatos`)
          } else {
            notify.error('Erro ao enviar template')
          }
        }
      } else {
        // Enviar mensagem direta
        const response = await fetch('/api/v1/whatsapp/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: selectedContacts,
            message: message,
            type: 'text'
          })
        })
        
        if (response.ok) {
          notify.success(`Mensagem enviada para ${selectedContacts.length} contatos`)
        } else {
          notify.error('Erro ao enviar mensagem')
        }
      }
      
      // Limpar formulário
      setMessage('')
      setSelectedContacts([])
      setSelectedTemplate('')
    } catch (error) {
      console.error('Error sending message:', error)
      notify.error('Erro ao enviar mensagem')
    } finally {
      setIsSending(false)
    }
  }

  const getStatusBadge = (status: Campaign['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      sending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700'
    }
    
    const labels = {
      draft: 'Rascunho',
      scheduled: 'Agendada',
      sending: 'Enviando',
      completed: 'Concluída'
    }
    
    return (
      <Badge className={styles[status]}>
        {labels[status]}
      </Badge>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enviar Mensagens</h1>
            <p className="text-muted-foreground mt-1">
              Envie mensagens instantâneas, templates ou crie campanhas
            </p>
          </div>
          
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar Lista
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Mensagens Hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
                +12% vs ontem
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Taxa de Entrega</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98.5%</div>
              <Progress value={98.5} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Taxa de Leitura</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">76.3%</div>
              <Progress value={76.3} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Créditos Disponíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45,200</div>
              <div className="text-xs text-muted-foreground">
                Válidos até 31/12
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Message Composer */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Compor Mensagem</CardTitle>
                <CardDescription>
                  Crie e envie mensagens para seus contatos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Message Type Selector */}
                <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="instant">
                      <Zap className="h-4 w-4 mr-2" />
                      Instantânea
                    </TabsTrigger>
                    <TabsTrigger value="template">
                      <FileText className="h-4 w-4 mr-2" />
                      Template
                    </TabsTrigger>
                    <TabsTrigger value="campaign">
                      <Target className="h-4 w-4 mr-2" />
                      Campanha
                    </TabsTrigger>
                  </TabsList>

                  {/* Instant Message */}
                  <TabsContent value="instant" className="space-y-4">
                    <div>
                      <Label>Destinatários</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione contatos ou grupos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os contatos</SelectItem>
                          <SelectItem value="group1">Clientes VIP</SelectItem>
                          <SelectItem value="group2">Leads Novos</SelectItem>
                          <SelectItem value="group3">Inativos 30 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Mensagem</Label>
                      <Textarea
                        placeholder="Digite sua mensagem aqui..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={6}
                      />
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>{message.length}/4096 caracteres</span>
                        <span>Suporta *negrito*, _itálico_ e ~tachado~</span>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Template Message */}
                  <TabsContent value="template" className="space-y-4">
                    <div>
                      <Label>Template Aprovado</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.filter(t => t.status === 'approved').map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{template.name}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {template.category}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedTemplate && (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">
                            {templates.find(t => t.id === selectedTemplate)?.content}
                          </p>
                        </div>

                        {templates.find(t => t.id === selectedTemplate)?.variables.map((variable, index) => (
                          <div key={index}>
                            <Label>Variável: {variable}</Label>
                            <Input placeholder={`Digite o valor para {{${index + 1}}}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Campaign */}
                  <TabsContent value="campaign" className="space-y-4">
                    <div>
                      <Label>Nome da Campanha</Label>
                      <Input
                        placeholder="Ex: Promoção de Natal 2024"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Segmentação</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="seg1" />
                          <label htmlFor="seg1" className="text-sm">
                            Clientes que compraram nos últimos 30 dias
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="seg2" />
                          <label htmlFor="seg2" className="text-sm">
                            Leads com score acima de 70
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="seg3" />
                          <label htmlFor="seg3" className="text-sm">
                            Contatos da região Sul
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data de Envio</Label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Horário</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Send Button */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Teste A/B
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending}
                    className="min-w-[120px]"
                  >
                    {isSending ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Agora
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Campanhas Recentes</CardTitle>
                <CardDescription>
                  Acompanhe o desempenho
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {recentCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{campaign.name}</h4>
                            {campaign.scheduledAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(campaign.scheduledAt).toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(campaign.status)}
                        </div>
                        
                        {campaign.status !== 'draft' && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Progresso</span>
                              <span className="font-medium">
                                {campaign.sent}/{campaign.recipients}
                              </span>
                            </div>
                            <Progress 
                              value={(campaign.sent / campaign.recipients) * 100} 
                              className="h-2"
                            />
                            
                            {campaign.sent > 0 && (
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Entregues:</span>
                                  <span className="ml-1 font-medium">
                                    {((campaign.delivered / campaign.sent) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Lidas:</span>
                                  <span className="ml-1 font-medium">
                                    {((campaign.read / campaign.delivered) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}