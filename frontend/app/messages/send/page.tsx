'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Send, 
  Users, 
  MessageCircle,
  FileText,
  Upload,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Zap,
  Eye,
  AlertTriangle,
  Smartphone,
  Variable,
  Image,
  Paperclip,
  BarChart3,
  TrendingDown
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
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

// Importar novos componentes
import { WhatsAppPreview } from '@/components/ui/whatsapp-preview'
import { ContactSelector } from '@/components/ui/contact-selector'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { ContactGroups } from '@/components/ui/contact-groups'
import { ImportContacts } from '@/components/ui/import-contacts'
import { ScheduleConfigComponent } from '@/components/ui/schedule-config'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  tags?: string[]
  lastInteraction?: string
  hasWhatsApp?: boolean
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

// Dados para gráficos de métricas
const metricsData = [
  { time: '08h', sent: 45, delivered: 43, read: 38 },
  { time: '10h', sent: 120, delivered: 118, read: 95 },
  { time: '12h', sent: 180, delivered: 175, read: 140 },
  { time: '14h', sent: 150, delivered: 148, read: 120 },
  { time: '16h', sent: 200, delivered: 195, read: 160 },
  { time: '18h', sent: 90, delivered: 88, read: 70 }
]

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
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: false,
    startDate: '',
    endDate: '',
    time: '',
    weekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    dailyStartTime: '09:00',
    dailyEndTime: '18:00',
    skipHolidays: true,
    holidays: [],
    timezone: 'America/Sao_Paulo',
    pauseBetweenMessages: 2,
    messagesPerBatch: 10
  })
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [has24hWindow, setHas24hWindow] = useState<boolean | null>(null)
  const [checkingWindow, setCheckingWindow] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Carregar dados reais do sistema
  useEffect(() => {
    loadTemplates()
    loadContacts()
    loadCampaigns()
  }, [])

  // Verificar janela de 24h quando contatos são selecionados
  useEffect(() => {
    if (selectedContacts.length > 0) {
      check24hWindow()
    }
  }, [selectedContacts])

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await fetch('/api/v1/whatsapp/templates?status=approved')
      if (response.ok) {
        const data = await response.json()
        
        let templatesArray = []
        if (Array.isArray(data)) {
          templatesArray = data
        } else if (data.templates && Array.isArray(data.templates)) {
          templatesArray = data.templates
        } else if (data.data && Array.isArray(data.data)) {
          templatesArray = data.data
        }
        
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
                 'rejected',
          variables: extractVariables(
            template.components?.[0]?.text || 
            template.body || 
            template.text || 
            template.content || 
            ''
          )
        }))
        
        // Filtrar apenas templates aprovados
        const approvedTemplates = formattedTemplates.filter(t => 
          t.status === 'approved'
        )
        setTemplates(approvedTemplates)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const loadContacts = async () => {
    setIsLoadingContacts(true)
    try {
      const response = await fetch('/api/v1/contacts')
      if (response.ok) {
        const data = await response.json()
        // Adicionar tags e hasWhatsApp aos contatos
        const enrichedContacts = (Array.isArray(data) ? data : []).map((contact: any) => ({
          ...contact,
          tags: contact.tags || ['Cliente'],
          hasWhatsApp: contact.has_whatsapp !== false
        }))
        setContacts(enrichedContacts)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setIsLoadingContacts(false)
    }
  }

  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  
  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true)
    try {
      const response = await fetch('/api/v1/campaigns')
      if (response.ok) {
        const data = await response.json()
        setRecentCampaigns(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
      setRecentCampaigns([])
    } finally {
      setIsLoadingCampaigns(false)
    }
  }

  // Verificar janela de 24h
  const check24hWindow = async () => {
    setCheckingWindow(true)
    try {
      // Simular verificação (substituir por API real)
      const contactsWithWindow = selectedContacts.filter(() => Math.random() > 0.3)
      setHas24hWindow(contactsWithWindow.length === selectedContacts.length)
    } catch (error) {
      console.error('Error checking 24h window:', error)
    } finally {
      setCheckingWindow(false)
    }
  }

  // Extrair variáveis do template
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\d+)\}\}/g)
    if (!matches) return []
    
    const uniqueNumbers = [...new Set(matches.map(m => m.replace(/[{}]/g, '')))].sort()
    return uniqueNumbers.map(num => `Variável ${num}`)
  }

  // Inserir emoji no texto
  const insertEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const text = message
      const newText = text.substring(0, start) + emoji + text.substring(end)
      setMessage(newText)
      
      // Reposicionar cursor após o emoji
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + emoji.length
          textareaRef.current.selectionEnd = start + emoji.length
          textareaRef.current.focus()
        }
      }, 0)
    }
  }

  // Inserir variável no texto
  const insertVariable = (variable: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const text = message
      const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end)
      setMessage(newText)
      
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = start + variable.length + 4
          textareaRef.current.selectionStart = newPos
          textareaRef.current.selectionEnd = newPos
          textareaRef.current.focus()
        }
      }, 0)
    }
  }

  // Confirmar antes de enviar
  const handlePreSend = () => {
    if (!message.trim() && !selectedTemplate) {
      notify.error('Digite uma mensagem ou selecione um template')
      return
    }

    if (selectedContacts.length === 0 && messageType !== 'campaign') {
      notify.error('Selecione pelo menos um contato')
      return
    }

    // Mostrar diálogo de confirmação para envios em massa
    if (selectedContacts.length > 10) {
      setShowConfirmDialog(true)
    } else {
      handleSendMessage()
    }
  }

  const handleSendMessage = async () => {
    setShowConfirmDialog(false)
    setIsSending(true)
    
    try {
      const payload = {
        message,
        templateId: selectedTemplate,
        templateVariables,
        contactIds: selectedContacts,
        messageType,
        campaignName,
        schedule: scheduleConfig.enabled ? scheduleConfig : null
      }

      const endpoint = scheduleConfig.enabled 
        ? '/api/v1/messages/schedule-bulk' 
        : (messageType === 'template' ? '/api/v1/whatsapp/send-template' : '/api/v1/whatsapp/send')

      const requestBody = scheduleConfig.enabled ? payload : (
        messageType === 'template' ? {
          to: selectedContacts,
          template_name: templates.find(t => t.id === selectedTemplate)?.name,
          template_params: Object.values(templateVariables)
        } : {
          to: selectedContacts,
          message: message,
          type: 'text'
        }
      )
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (response.ok) {
        if (scheduleConfig.enabled) {
          notify.success(`Envio agendado para ${selectedContacts.length} contatos!`)
        } else {
          notify.success(`Mensagem enviada para ${selectedContacts.length} contatos!`)
        }
        
        // Limpar formulário
        setMessage('')
        setSelectedContacts([])
        setSelectedTemplate('')
        setTemplateVariables({})
        setCampaignName('')
        setScheduleConfig({
          ...scheduleConfig,
          enabled: false
        })
      } else {
        notify.error('Erro ao enviar mensagem')
      }
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

  // Calcular métricas
  const totalMessagesSent = metricsData.reduce((sum, item) => sum + item.sent, 0)
  const totalDelivered = metricsData.reduce((sum, item) => sum + item.delivered, 0)
  const totalRead = metricsData.reduce((sum, item) => sum + item.read, 0)
  const deliveryRate = totalMessagesSent > 0 ? ((totalDelivered / totalMessagesSent) * 100).toFixed(1) : '0'
  const readRate = totalDelivered > 0 ? ((totalRead / totalDelivered) * 100).toFixed(1) : '0'

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enviar Mensagens</h1>
            <p className="text-muted-foreground mt-1">
              Central de envio com preview em tempo real
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Ocultar' : 'Mostrar'} Preview
            </Button>
            <ImportContacts 
              onImport={(importedContacts) => {
                // Converter contatos importados para o formato esperado
                const newContacts = importedContacts.map((c, index) => ({
                  id: `imported-${Date.now()}-${index}`,
                  name: c.name,
                  phone: c.phone,
                  email: c.email,
                  tags: c.tags ? [c.tags] : [],
                  hasWhatsApp: true
                }))
                setContacts([...contacts, ...newContacts])
                // Selecionar automaticamente os contatos importados
                const importedIds = newContacts.map(c => c.id)
                setSelectedContacts([...selectedContacts, ...importedIds])
                notify.success(`${newContacts.length} contatos importados com sucesso!`)
              }}
            />
          </div>
        </div>

        {/* Métricas com Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center justify-between">
                <span>Mensagens Hoje</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMessagesSent}</div>
              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3" />
                +12% vs ontem
              </div>
              <div className="h-[40px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metricsData.slice(-4)}>
                    <Line 
                      type="monotone" 
                      dataKey="sent" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center justify-between">
                <span>Taxa de Entrega</span>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveryRate}%</div>
              <Progress value={Number(deliveryRate)} className="h-2 mt-2" />
              <div className="text-xs text-muted-foreground mt-2">
                {totalDelivered} de {totalMessagesSent} entregues
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center justify-between">
                <span>Taxa de Leitura</span>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{readRate}%</div>
              <Progress value={Number(readRate)} className="h-2 mt-2" />
              <div className="text-xs text-muted-foreground mt-2">
                {totalRead} de {totalDelivered} lidas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center justify-between">
                <span>Janela 24h</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkingWindow ? (
                <div className="text-sm text-muted-foreground">Verificando...</div>
              ) : has24hWindow === null ? (
                <div className="text-sm text-muted-foreground">Selecione contatos</div>
              ) : has24hWindow ? (
                <div>
                  <div className="text-2xl font-bold text-green-600">Ativa</div>
                  <div className="text-xs text-green-600">Pode enviar mensagem direta</div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-orange-600">Template</div>
                  <div className="text-xs text-orange-600">Use template aprovado</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content com Preview */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Message Composer */}
          <div className={showPreview ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <Card>
              <CardHeader>
                <CardTitle>Compor Mensagem</CardTitle>
                <CardDescription>
                  Crie mensagens personalizadas com preview em tempo real
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
                    {/* Alert de Janela 24h */}
                    {has24hWindow === false && (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertTitle>Janela de 24h expirada</AlertTitle>
                        <AlertDescription>
                          Alguns contatos não têm janela ativa. Use um template aprovado ou aguarde uma resposta.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Grupos de Contatos */}
                    <div>
                      <ContactGroups
                        contacts={contacts}
                        onSelectGroup={(contactIds) => {
                          setSelectedContacts(contactIds)
                          notify.success(`${contactIds.length} contatos selecionados do grupo`)
                        }}
                      />
                    </div>

                    <div>
                      <Label>Destinatários</Label>
                      <ContactSelector
                        contacts={contacts}
                        selectedContacts={selectedContacts}
                        onSelectionChange={setSelectedContacts}
                        isLoading={isLoadingContacts}
                        placeholder="Selecione um ou mais contatos"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Mensagem</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => insertVariable('nome')}
                            type="button"
                          >
                            <Variable className="h-4 w-4 mr-1" />
                            Variável
                          </Button>
                          <EmojiPicker onEmojiSelect={insertEmoji} />
                          <Button variant="ghost" size="icon" type="button">
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        ref={textareaRef}
                        placeholder="Digite sua mensagem aqui... Use *negrito*, _itálico_ e ~tachado~"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={6}
                        className="resize-none"
                      />
                      <div className="flex justify-between mt-2">
                        <span className={`text-xs ${message.length > 1024 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {message.length}/1024 caracteres
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Formatação WhatsApp suportada
                        </span>
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
                          {isLoadingTemplates ? (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              Carregando templates...
                            </div>
                          ) : templates.filter(t => t.status === 'approved').length > 0 ? (
                            templates.filter(t => t.status === 'approved').map(template => (
                              <SelectItem key={template.id} value={template.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{template.name}</span>
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    {template.category}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              Nenhum template aprovado disponível
                            </div>
                          )}
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
                            <Label>{variable}</Label>
                            <Input 
                              placeholder={`Digite o valor para {{${index + 1}}}`}
                              value={templateVariables[index] || ''}
                              onChange={(e) => setTemplateVariables({
                                ...templateVariables,
                                [index]: e.target.value
                              })}
                            />
                          </div>
                        ))}

                        <div>
                          <Label>Destinatários</Label>
                          <ContactSelector
                            contacts={contacts}
                            selectedContacts={selectedContacts}
                            onSelectionChange={setSelectedContacts}
                            isLoading={isLoadingContacts}
                          />
                        </div>
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
                      <div className="space-y-2 max-w-full">
                        <div className="flex items-start space-x-2">
                          <Checkbox id="seg1" className="mt-0.5" />
                          <label htmlFor="seg1" className="text-sm leading-relaxed cursor-pointer select-none">
                            Clientes que compraram nos últimos 30 dias
                          </label>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Checkbox id="seg2" className="mt-0.5" />
                          <label htmlFor="seg2" className="text-sm leading-relaxed cursor-pointer select-none">
                            Leads com score acima de 70
                          </label>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Checkbox id="seg3" className="mt-0.5" />
                          <label htmlFor="seg3" className="text-sm leading-relaxed cursor-pointer select-none">
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

                {/* Schedule Configuration */}
                <div className="border-t pt-4">
                  <ScheduleConfigComponent
                    value={scheduleConfig}
                    onChange={setScheduleConfig}
                  />
                </div>

                {/* Send Button */}
                <Separator />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="w-auto">
                      <Users className="h-4 w-4 mr-2" />
                      Teste A/B
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handlePreSend}
                    disabled={isSending}
                    className="min-w-[120px] w-full sm:w-auto"
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

          {/* WhatsApp Preview */}
          {showPreview && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Preview WhatsApp
                  </CardTitle>
                  <CardDescription>
                    Visualize como sua mensagem aparecerá
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WhatsAppPreview 
                    message={message || (selectedTemplate && templates.find(t => t.id === selectedTemplate)?.content) || ''}
                    contactName={contacts.find(c => selectedContacts.includes(c.id))?.name || 'Cliente'}
                    phoneNumber={contacts.find(c => selectedContacts.includes(c.id))?.phone}
                  />
                </CardContent>
              </Card>

              {/* Campanhas Recentes */}
              <Card>
                <CardHeader>
                  <CardTitle>Campanhas Recentes</CardTitle>
                  <CardDescription>Últimos envios</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {isLoadingCampaigns ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        </div>
                      ) : recentCampaigns.length > 0 ? (
                        recentCampaigns.slice(0, 5).map((campaign) => (
                          <div
                            key={campaign.id}
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{campaign.name}</span>
                              {getStatusBadge(campaign.status)}
                            </div>
                            {campaign.status !== 'draft' && (
                              <div className="space-y-1">
                                <Progress 
                                  value={(campaign.sent / campaign.recipients) * 100} 
                                  className="h-1"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{campaign.sent}/{campaign.recipients}</span>
                                  <span>{((campaign.read / campaign.sent) * 100).toFixed(0)}% lidas</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          Nenhuma campanha encontrada
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Diálogo de Confirmação */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Envio em Massa</DialogTitle>
              <DialogDescription>
                Você está prestes a enviar mensagem para {selectedContacts.length} contatos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Informações do Envio</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Total de destinatários: {selectedContacts.length}</li>
                    <li>Tipo: {messageType === 'template' ? 'Template' : 'Mensagem direta'}</li>
                    <li>Custo estimado: R$ {(selectedContacts.length * 0.05).toFixed(2)}</li>
                    <li>Tempo estimado: {Math.ceil(selectedContacts.length / 10)} segundos</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendMessage}>
                Confirmar Envio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}