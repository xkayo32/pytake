'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Filter,
  Download,
  Upload,
  Users,
  User,
  Phone,
  Mail,
  Tag,
  Calendar,
  Building,
  MapPin,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Globe,
  Hash
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { MOCK_CONTACTS, MOCK_GROUPS, MOCK_TAGS, Contact, ContactGroup, ContactTag } from '@/lib/types/contact'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS)
  const [groups, setGroups] = useState<ContactGroup[]>(MOCK_GROUPS)
  const [tags, setTags] = useState<ContactTag[]>(MOCK_TAGS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus
    const matchesGroup = filterGroup === 'all' || contact.groups.includes(filterGroup)
    const matchesTag = filterTag === 'all' || contact.tags.includes(filterTag)

    return matchesSearch && matchesStatus && matchesGroup && matchesTag
  })

  const handleSelectContact = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(prev => prev.filter(id => id !== contactId))
    } else {
      setSelectedContacts(prev => [...prev, contactId])
    }
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id))
    }
  }

  const handleExport = () => {
    // TODO: Implement export
    console.log('Exporting contacts:', selectedContacts.length || filteredContacts.length)
  }

  const handleImport = () => {
    router.push('/contacts/import')
  }

  const handleAddToGroup = () => {
    // TODO: Implement add to group
    console.log('Adding to group:', selectedContacts)
  }

  const handleAddTags = () => {
    // TODO: Implement add tags
    console.log('Adding tags to:', selectedContacts)
  }

  const handleDeleteSelected = () => {
    if (confirm(`Deseja excluir ${selectedContacts.length} contato(s)?`)) {
      setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id)))
      setSelectedContacts([])
    }
  }

  const stats = {
    total: contacts.length,
    active: contacts.filter(c => c.status === 'active').length,
    inactive: contacts.filter(c => c.status === 'inactive').length,
    blocked: contacts.filter(c => c.status === 'blocked').length,
    withWhatsApp: contacts.filter(c => c.whatsappId).length,
    totalMessages: contacts.reduce((sum, c) => sum + c.stats.totalMessages, 0)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatPhone = (phone: string) => {
    // Keep original format for display
    return phone
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-600 border-gray-200'
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-3 w-3" />
      case 'inactive': return <Clock className="h-3 w-3" />
      case 'blocked': return <XCircle className="h-3 w-3" />
      default: return null
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Contatos</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus contatos e CRM
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedContacts.length > 0 && (
                <>
                  <Badge variant="secondary" className="mr-2">
                    {selectedContacts.length} selecionado(s)
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleAddToGroup}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Grupo
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAddTags}>
                    <Tag className="h-4 w-4 mr-2" />
                    Tags
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeleteSelected}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => router.push('/contacts/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Contato
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Contatos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">Conversando</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inativos</CardTitle>
                <Clock className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
                <p className="text-xs text-muted-foreground">Sem interação</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">WhatsApp</CardTitle>
                <MessageSquare className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stats.withWhatsApp}</div>
                <p className="text-xs text-muted-foreground">Conectados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grupos</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{groups.length}</div>
                <p className="text-xs text-muted-foreground">Segmentos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.totalMessages.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total enviadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, email ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Grupos</SelectItem>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.name}>
                    <div className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      <span>{group.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.contactCount}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Tags</SelectItem>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.name}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {tag.count}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                Lista
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grade
              </Button>
            </div>
          </div>

          {/* Select All */}
          {filteredContacts.length > 0 && (
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === filteredContacts.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-muted-foreground">
                  Selecionar todos ({filteredContacts.length})
                </span>
              </label>
            </div>
          )}

          {/* Contacts List/Grid */}
          {filteredContacts.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum contato encontrado</h3>
                <p className="mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca' 
                    : 'Adicione seu primeiro contato'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push('/contacts/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Contato
                  </Button>
                )}
              </div>
            </Card>
          ) : viewMode === 'list' ? (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-3 w-10"></th>
                      <th className="p-3">Contato</th>
                      <th className="p-3">Telefone</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Tags</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Última Interação</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact) => (
                      <tr 
                        key={contact.id} 
                        className="border-b hover:bg-accent/50 transition-colors"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => handleSelectContact(contact.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {contact.profilePicture ? (
                              <img 
                                src={contact.profilePicture} 
                                alt={contact.name}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            <div>
                              <button 
                                onClick={() => router.push(`/contacts/${contact.id}`)}
                                className="font-medium hover:text-primary transition-colors"
                              >
                                {contact.name}
                              </button>
                              {contact.about && (
                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                  {contact.about}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {contact.whatsappId && (
                              <MessageSquare className="h-3 w-3 text-green-600" />
                            )}
                            <span className="text-sm">{formatPhone(contact.phone)}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-muted-foreground">
                            {contact.email || '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">
                            {contact.company || '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(contact.status)}
                          >
                            {getStatusIcon(contact.status)}
                            <span className="ml-1">
                              {contact.status === 'active' ? 'Ativo' :
                               contact.status === 'inactive' ? 'Inativo' : 'Bloqueado'}
                            </span>
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {contact.lastInteraction ? (
                              <>
                                <div>{formatDate(contact.lastInteraction)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {contact.stats.totalMessages} mensagens
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredContacts.map((contact) => (
                <Card 
                  key={contact.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {contact.profilePicture ? (
                          <img 
                            src={contact.profilePicture} 
                            alt={contact.name}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">{contact.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getStatusColor(contact.status)}`}
                          >
                            {getStatusIcon(contact.status)}
                            <span className="ml-1">
                              {contact.status === 'active' ? 'Ativo' :
                               contact.status === 'inactive' ? 'Inativo' : 'Bloqueado'}
                            </span>
                          </Badge>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleSelectContact(contact.id)
                        }}
                        className="rounded border-gray-300"
                      />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span className="truncate">{formatPhone(contact.phone)}</span>
                        {contact.whatsappId && (
                          <MessageSquare className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      
                      {contact.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      
                      {contact.company && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-3 w-3" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                      )}
                      
                      {contact.address?.city && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {contact.address.city}, {contact.address.state}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{contact.stats.totalMessages} mensagens</span>
                        {contact.lastInteraction && (
                          <span>{formatDate(contact.lastInteraction)}</span>
                        )}
                      </div>
                      
                      {contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {contact.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {contact.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{contact.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  )
}