'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Users,
  FileText,
  Headphones,
  Zap,
  Settings,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Building,
  Globe,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wifi,
  WifiOff,
  Gauge,
  Copy,
  ExternalLink,
  PlayCircle,
  StopCircle,
  Pause
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { AppLayout } from '@/components/layout/app-layout'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scrollarea'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Import ERP types and mock data
import {
  ERPType,
  ERPCustomer,
  ERPInvoice,
  ERPTicket,
  ERPPlan,
  ERPConnectionStatus,
  CustomerStatus,
  InvoiceStatus,
  TicketStatus,
  TicketType,
  TicketPriority,
  MOCK_ERP_CONFIGS,
  MOCK_ERP_CUSTOMERS,
  MOCK_ERP_INVOICES,
  MOCK_ERP_TICKETS,
  MOCK_ERP_PLANS,
  MOCK_ERP_CONNECTION_STATUS
} from '@/lib/types/erp'

export default function ERPDetailPage() {
  const params = useParams()
  const router = useRouter()
  const erpType = params.erpType as ERPType
  
  const [searchTerm, setSearchTerm] = useState('')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
  const [ticketFilter, setTicketFilter] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<ERPCustomer | null>(null)
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false)
  const [newTicketData, setNewTicketData] = useState({
    title: '',
    description: '',
    type: 'support' as TicketType,
    priority: 'medium' as TicketPriority
  })

  // Find the ERP config
  const erpConfig = MOCK_ERP_CONFIGS.find(config => config.erpType === erpType)
  
  if (!erpConfig) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold">ERP não encontrado</h2>
            <p className="text-muted-foreground mt-2">A integração solicitada não existe.</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const getERPName = (erpType: ERPType): string => {
    const names = {
      hubsoft: 'HubSoft',
      ixcsoft: 'IXC Soft',
      mksolutions: 'MK Solutions',
      sisgp: 'SisGP'
    }
    return names[erpType]
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
      case 'paid':
      case 'resolved':
      case 'connected': return 'text-green-600 bg-green-50 border-green-200'
      case 'inactive':
      case 'pending':
      case 'open':
      case 'disconnected': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'blocked':
      case 'overdue':
      case 'error':
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200'
      case 'suspended':
      case 'in_progress': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
      case 'resolved':
      case 'connected': return <CheckCircle className="h-3 w-3" />
      case 'blocked':
      case 'overdue':
      case 'error':
      case 'cancelled': return <XCircle className="h-3 w-3" />
      case 'suspended':
      case 'in_progress': return <Clock className="h-3 w-3" />
      default: return <AlertCircle className="h-3 w-3" />
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      active: 'Ativo',
      inactive: 'Inativo',
      blocked: 'Bloqueado',
      suspended: 'Suspenso',
      paid: 'Pago',
      pending: 'Pendente',
      overdue: 'Vencida',
      cancelled: 'Cancelada',
      open: 'Aberto',
      in_progress: 'Em Andamento',
      resolved: 'Resolvido',
      closed: 'Fechado',
      connected: 'Conectado',
      disconnected: 'Desconectado'
    }
    return labels[status] || status
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'critical':
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Crítica',
      urgent: 'Urgente'
    }
    return labels[priority] || priority
  }

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      technical: 'Técnico',
      billing: 'Cobrança',
      support: 'Suporte',
      installation: 'Instalação',
      maintenance: 'Manutenção'
    }
    return labels[type] || type
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleSearchCustomer = (document: string) => {
    console.log('Searching customer:', document)
  }

  const handleUnblockCustomer = (customerId: string) => {
    console.log('Unblocking customer:', customerId)
  }

  const handleChangePlan = (customerId: string, planId: string) => {
    console.log('Changing plan:', customerId, planId)
  }

  const handleGenerateInvoice = (customerId: string) => {
    console.log('Generating duplicate invoice for customer:', customerId)
  }

  const handleCreateTicket = () => {
    if (!selectedCustomer) return
    
    console.log('Creating ticket:', {
      customerId: selectedCustomer.id,
      ...newTicketData
    })
    
    setIsCreateTicketOpen(false)
    setNewTicketData({
      title: '',
      description: '',
      type: 'support',
      priority: 'medium'
    })
  }

  const filteredCustomers = MOCK_ERP_CUSTOMERS.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.document.includes(searchTerm) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = customerFilter === 'all' || customer.status === customerFilter
    return matchesSearch && matchesFilter
  })

  const filteredInvoices = MOCK_ERP_INVOICES.filter(invoice => {
    const matchesSearch = invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customerDocument.includes(searchTerm) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = invoiceFilter === 'all' || invoice.status === invoiceFilter
    return matchesSearch && matchesFilter
  })

  const filteredTickets = MOCK_ERP_TICKETS.filter(ticket => {
    const matchesSearch = ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customerDocument.includes(searchTerm)
    const matchesFilter = ticketFilter === 'all' || ticket.status === ticketFilter
    return matchesSearch && matchesFilter
  })

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{erpConfig.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {getERPName(erpType)} - {erpConfig.stats.totalCustomers.toLocaleString()} clientes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(erpConfig.status)}>
                {getStatusIcon(erpConfig.status)}
                <span className="ml-1">{getStatusLabel(erpConfig.status)}</span>
              </Badge>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                      <p className="text-xl font-bold">{erpConfig.stats.activeCustomers.toLocaleString()}</p>
                    </div>
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Faturas Vencidas</p>
                      <p className="text-xl font-bold text-red-600">{erpConfig.stats.overdueInvoices}</p>
                    </div>
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Chamados Abertos</p>
                      <p className="text-xl font-bold">{erpConfig.stats.openTickets}</p>
                    </div>
                    <Headphones className="h-6 w-6 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <p className="text-xl font-bold">{erpConfig.stats.uptime}%</p>
                    </div>
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="customers" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="customers">Clientes</TabsTrigger>
                <TabsTrigger value="invoices">Faturas</TabsTrigger>
                <TabsTrigger value="tickets">Chamados</TabsTrigger>
                <TabsTrigger value="plans">Planos</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              </TabsList>

              {/* Customers Tab */}
              <TabsContent value="customers" className="space-y-6">
                {/* Search and Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nome, documento ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={customerFilter} onValueChange={setCustomerFilter}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                          <SelectItem value="blocked">Bloqueado</SelectItem>
                          <SelectItem value="suspended">Suspenso</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Buscar Cliente
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Customers List */}
                <div className="space-y-4">
                  {filteredCustomers.map((customer) => (
                    <Card key={customer.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">{customer.name}</h3>
                                <Badge className={getStatusColor(customer.status)}>
                                  {getStatusIcon(customer.status)}
                                  <span className="ml-1">{getStatusLabel(customer.status)}</span>
                                </Badge>
                                {customer.connectionStatus === 'active' && (
                                  <Badge variant="outline" className="text-green-600 border-green-200">
                                    <Wifi className="h-3 w-3 mr-1" />
                                    Online
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Documento</p>
                                  <p className="font-mono">{customer.document}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Email</p>
                                  <p>{customer.email}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Telefone</p>
                                  <p>{customer.phone}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Plano</p>
                                  <p>{customer.planName}</p>
                                </div>
                              </div>
                              {customer.balance !== 0 && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                  <span className={`font-medium ${customer.balance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Saldo: {formatCurrency(Math.abs(customer.balance))} 
                                    {customer.balance < 0 ? ' (crédito)' : ' (débito)'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(customer)}>
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Status da Conexão
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Gerar 2ª Via
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setSelectedCustomer(customer)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Criar Chamado
                                </DropdownMenuItem>
                                {customer.status === 'blocked' && (
                                  <DropdownMenuItem onClick={() => handleUnblockCustomer(customer.id)}>
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    Desbloquear
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Alterar Plano
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="space-y-6">
                {/* Search and Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar faturas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="overdue">Vencida</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Invoices List */}
                <div className="space-y-4">
                  {filteredInvoices.map((invoice) => (
                    <Card key={invoice.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{invoice.invoiceNumber}</h3>
                              <Badge className={getStatusColor(invoice.status)}>
                                {getStatusIcon(invoice.status)}
                                <span className="ml-1">{getStatusLabel(invoice.status)}</span>
                              </Badge>
                              <span className="text-lg font-bold text-primary">
                                {formatCurrency(invoice.amount)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Cliente</p>
                                <p className="font-medium">{invoice.customerName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Vencimento</p>
                                <p className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                                  {formatDate(invoice.dueDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Pagamento</p>
                                <p>{invoice.paymentDate ? formatDate(invoice.paymentDate) : '-'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Método</p>
                                <p className="capitalize">{invoice.paymentMethod || '-'}</p>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{invoice.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Gerar 2ª Via
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Link de Pagamento
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Enviar por Email
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Tickets Tab */}
              <TabsContent value="tickets" className="space-y-6">
                {/* Search and Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar chamados..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={ticketFilter} onValueChange={setTicketFilter}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                          <SelectItem value="closed">Fechado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog open={isCreateTicketOpen} onOpenChange={setIsCreateTicketOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Chamado
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Criar Novo Chamado</DialogTitle>
                            <DialogDescription>
                              Crie um novo chamado de suporte para um cliente
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="ticket-title">Título</Label>
                              <Input
                                id="ticket-title"
                                value={newTicketData.title}
                                onChange={(e) => setNewTicketData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Título do chamado"
                              />
                            </div>
                            <div>
                              <Label htmlFor="ticket-type">Tipo</Label>
                              <Select 
                                value={newTicketData.type} 
                                onValueChange={(value: TicketType) => setNewTicketData(prev => ({ ...prev, type: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="technical">Técnico</SelectItem>
                                  <SelectItem value="billing">Cobrança</SelectItem>
                                  <SelectItem value="support">Suporte</SelectItem>
                                  <SelectItem value="installation">Instalação</SelectItem>
                                  <SelectItem value="maintenance">Manutenção</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="ticket-priority">Prioridade</Label>
                              <Select 
                                value={newTicketData.priority} 
                                onValueChange={(value: TicketPriority) => setNewTicketData(prev => ({ ...prev, priority: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Baixa</SelectItem>
                                  <SelectItem value="medium">Média</SelectItem>
                                  <SelectItem value="high">Alta</SelectItem>
                                  <SelectItem value="critical">Crítica</SelectItem>
                                  <SelectItem value="urgent">Urgente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="ticket-description">Descrição</Label>
                              <Textarea
                                id="ticket-description"
                                value={newTicketData.description}
                                onChange={(e) => setNewTicketData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descreva o problema..."
                                rows={4}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateTicketOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleCreateTicket}>
                              Criar Chamado
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* Tickets List */}
                <div className="space-y-4">
                  {filteredTickets.map((ticket) => (
                    <Card key={ticket.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{ticket.title}</h3>
                              <Badge className={getStatusColor(ticket.status)}>
                                {getStatusIcon(ticket.status)}
                                <span className="ml-1">{getStatusLabel(ticket.status)}</span>
                              </Badge>
                              <Badge className={getPriorityColor(ticket.priority)}>
                                {getPriorityLabel(ticket.priority)}
                              </Badge>
                              <Badge variant="outline">
                                {getTypeLabel(ticket.type)}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Cliente</p>
                                <p className="font-medium">{ticket.customerName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Responsável</p>
                                <p>{ticket.assignedToName || 'Não atribuído'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Criado em</p>
                                <p>{formatDate(ticket.createdAt)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Última Atualização</p>
                                <p>{formatDateTime(ticket.updatedAt)}</p>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{ticket.description}</p>
                            {ticket.comments.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {ticket.comments.length} comentário(s) • Último: {ticket.comments[ticket.comments.length - 1].author}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <User className="h-4 w-4 mr-2" />
                                  Atribuir
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Resolver
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Plans Tab */}
              <TabsContent value="plans" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Planos Disponíveis</CardTitle>
                    <CardDescription>
                      Planos configurados no ERP {getERPName(erpType)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {MOCK_ERP_PLANS.map((plan) => (
                        <Card key={plan.id}>
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">{plan.name}</h3>
                                <Badge className={plan.isActive ? getStatusColor('active') : getStatusColor('inactive')}>
                                  {plan.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-3xl font-bold text-primary">
                                  {formatCurrency(plan.price)}
                                </div>
                                <p className="text-sm text-muted-foreground">por mês</p>
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Download</span>
                                  <span className="font-medium">{plan.speed.download} Mbps</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Upload</span>
                                  <span className="font-medium">{plan.speed.upload} Mbps</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Clientes</span>
                                  <span className="font-medium">{plan.customerCount}</span>
                                </div>
                                {plan.installationFee && (
                                  <div className="flex justify-between text-sm">
                                    <span>Taxa de Instalação</span>
                                    <span className="font-medium">{formatCurrency(plan.installationFee)}</span>
                                  </div>
                                )}
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <p className="text-sm font-medium">Características:</p>
                                <div className="space-y-1">
                                  {plan.features.map((feature, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span>{feature}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {plan.restrictions.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Restrições:</p>
                                  <div className="space-y-1">
                                    {plan.restrictions.map((restriction, index) => (
                                      <div key={index} className="flex items-center gap-2 text-sm">
                                        <AlertCircle className="h-3 w-3 text-orange-600" />
                                        <span>{restriction}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configurações de Conexão</CardTitle>
                      <CardDescription>
                        Configurações da API do {getERPName(erpType)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>URL da API</Label>
                        <Input value={erpConfig.apiUrl} disabled />
                      </div>
                      <div>
                        <Label>Chave da API</Label>
                        <Input type="password" value={erpConfig.apiKey} disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Sincronização Automática</Label>
                          <p className="text-sm text-muted-foreground">
                            Sincronizar dados automaticamente
                          </p>
                        </div>
                        <Badge className={erpConfig.settings.autoSync ? getStatusColor('active') : getStatusColor('inactive')}>
                          {erpConfig.settings.autoSync ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <div>
                        <Label>Intervalo de Sincronização</Label>
                        <Input value={`${erpConfig.settings.syncInterval} minutos`} disabled />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recursos Habilitados</CardTitle>
                      <CardDescription>
                        Recursos ativos na integração
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Clientes</span>
                        </div>
                        <Badge className={erpConfig.settings.enabledFeatures.customers ? getStatusColor('active') : getStatusColor('inactive')}>
                          {erpConfig.settings.enabledFeatures.customers ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>Faturas</span>
                        </div>
                        <Badge className={erpConfig.settings.enabledFeatures.invoices ? getStatusColor('active') : getStatusColor('inactive')}>
                          {erpConfig.settings.enabledFeatures.invoices ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Headphones className="h-4 w-4" />
                          <span>Chamados</span>
                        </div>
                        <Badge className={erpConfig.settings.enabledFeatures.tickets ? getStatusColor('active') : getStatusColor('inactive')}>
                          {erpConfig.settings.enabledFeatures.tickets ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>Planos</span>
                        </div>
                        <Badge className={erpConfig.settings.enabledFeatures.plans ? getStatusColor('active') : getStatusColor('inactive')}>
                          {erpConfig.settings.enabledFeatures.plans ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          <span>Status de Conexão</span>
                        </div>
                        <Badge className={erpConfig.settings.enabledFeatures.connectionStatus ? getStatusColor('active') : getStatusColor('inactive')}>
                          {erpConfig.settings.enabledFeatures.connectionStatus ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AppLayout>
  )
}