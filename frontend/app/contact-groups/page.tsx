'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Filter,
  Download,
  Upload,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  Share2,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/layout/app-layout'
import { notify } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  tags?: string[]
  lastInteraction?: string
  hasWhatsApp?: boolean
}

interface ContactGroup {
  id: string
  name: string
  description?: string
  contacts: string[]
  contactsDetails?: Contact[]
  contactsCount: number
  createdAt: string
  updatedAt: string
  color?: string
  icon?: string
}

export default function ContactGroupsPage() {
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  
  // Form states
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [contactSearchTerm, setContactSearchTerm] = useState('')
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    loadGroups()
    loadContacts()
  }, [])

  const loadGroups = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/contact-groups')
      if (response.ok) {
        const data = await response.json()
        const groupsArray = Array.isArray(data) ? data : (data.groups || [])
        setGroups(groupsArray)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      notify.error('Erro ao carregar grupos. Verifique se o servidor está funcionando.')
      setGroups([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadContacts = async () => {
    try {
      const response = await fetch('/api/v1/contacts')
      if (response.ok) {
        const data = await response.json()
        let contactsArray = Array.isArray(data) ? data : (data.contacts || [])
        
        // Enriquecer com dados adicionais se necessário
        const enrichedContacts = contactsArray.map((contact: any) => ({
          id: contact.id || contact.phone,
          name: contact.name || contact.firstName || 'Sem nome',
          phone: contact.phone || contact.phoneNumber,
          email: contact.email,
          tags: contact.tags || [],
          hasWhatsApp: contact.hasWhatsApp !== false,
          lastInteraction: contact.lastInteraction
        }))
        
        setContacts(enrichedContacts)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
      notify.error('Erro ao carregar contatos para grupos.')
      setContacts([])
    }
  }

  const saveGroup = async () => {
    if (!groupName.trim()) {
      notify.error('Digite um nome para o grupo')
      return
    }

    if (selectedContacts.length === 0) {
      notify.error('Selecione pelo menos um contato')
      return
    }

    const newGroup: ContactGroup = {
      id: selectedGroup?.id || Date.now().toString(),
      name: groupName,
      description: groupDescription,
      contacts: selectedContacts,
      contactsCount: selectedContacts.length,
      contactsDetails: selectedContacts.map(id => 
        contacts.find(c => c.id === id)!
      ).filter(Boolean),
      createdAt: selectedGroup?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      const response = await fetch(`/api/v1/contact-groups${selectedGroup ? `/${selectedGroup.id}` : ''}`, {
        method: selectedGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      })

      if (!response.ok) {
        throw new Error('API not available')
      }

      await loadGroups()
    } catch (error) {
      // Fallback para localStorage
      const existingGroups = JSON.parse(localStorage.getItem('contactGroups') || '[]')
      const updatedGroups = selectedGroup
        ? existingGroups.map((g: ContactGroup) => g.id === selectedGroup.id ? newGroup : g)
        : [...existingGroups, newGroup]
      
      localStorage.setItem('contactGroups', JSON.stringify(updatedGroups))
      setGroups(updatedGroups)
    }

    notify.success(selectedGroup ? 'Grupo atualizado!' : 'Grupo criado!')
    resetForm()
  }

  const deleteGroup = async (group: ContactGroup) => {
    if (!confirm(`Deseja realmente excluir o grupo "${group.name}"? Esta ação não pode ser desfeita.`)) return

    try {
      const response = await fetch(`/api/v1/contact-groups/${group.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('API not available')
      }

      await loadGroups()
    } catch (error) {
      // Fallback para localStorage
      const existingGroups = JSON.parse(localStorage.getItem('contactGroups') || '[]')
      const updatedGroups = existingGroups.filter((g: ContactGroup) => g.id !== group.id)
      localStorage.setItem('contactGroups', JSON.stringify(updatedGroups))
      setGroups(updatedGroups)
    }

    notify.success('Grupo excluído!')
  }

  const resetForm = () => {
    setIsCreating(false)
    setIsEditing(false)
    setSelectedGroup(null)
    setGroupName('')
    setGroupDescription('')
    setSelectedContacts([])
    setContactSearchTerm('')
  }

  const startEdit = (group: ContactGroup) => {
    setSelectedGroup(group)
    setGroupName(group.name)
    setGroupDescription(group.description || '')
    setSelectedContacts(group.contacts)
    setIsEditing(true)
  }

  const viewGroupMembers = (group: ContactGroup) => {
    setSelectedGroup(group)
    setShowMembers(true)
  }

  const duplicateGroup = (group: ContactGroup) => {
    setGroupName(`${group.name} (Cópia)`)
    setGroupDescription(group.description || '')
    setSelectedContacts(group.contacts)
    setIsCreating(true)
  }

  const exportGroup = (group: ContactGroup) => {
    const groupContacts = group.contacts.map(id => 
      contacts.find(c => c.id === id)
    ).filter(Boolean)

    const csv = [
      'Nome,Telefone,Email,Tags',
      ...groupContacts.map(c => 
        `${c?.name},${c?.phone},${c?.email || ''},${c?.tags?.join(';') || ''}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `grupo_${group.name.replace(/\s+/g, '_')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    notify.success('Grupo exportado!')
  }

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  // Filtrar grupos baseado na busca
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filtrar contatos para seleção
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    contact.phone.includes(contactSearchTerm) ||
    contact.email?.toLowerCase().includes(contactSearchTerm.toLowerCase())
  )

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Grupos de Contatos</h1>
            <p className="text-muted-foreground mt-1">
              Organize seus contatos em grupos para facilitar o envio em massa
            </p>
          </div>
          
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Grupos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Contatos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contacts.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Contatos em Grupos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(groups.flatMap(g => g.contacts)).size}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Média por Grupo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groups.length > 0 
                  ? Math.round(groups.reduce((sum, g) => sum + g.contactsCount, 0) / groups.length)
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
            <TabsList>
              <TabsTrigger value="grid">Grade</TabsTrigger>
              <TabsTrigger value="list">Lista</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Groups Display */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">Carregando grupos...</div>
          </div>
        ) : filteredGroups.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map(group => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        {group.description && (
                          <CardDescription className="mt-1">
                            {group.description}
                          </CardDescription>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewGroupMembers(group)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Membros
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startEdit(group)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateGroup(group)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportGroup(group)}>
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteGroup(group)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {group.contactsCount} {group.contactsCount === 1 ? 'contato' : 'contatos'}
                        </span>
                      </div>
                      
                      {/* Preview dos primeiros contatos */}
                      {group.contactsDetails && group.contactsDetails.length > 0 && (
                        <div className="flex -space-x-2">
                          {group.contactsDetails.slice(0, 5).map((contact, idx) => (
                            <Avatar key={idx} className="h-8 w-8 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                {contact.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {group.contactsDetails.length > 5 && (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                              +{group.contactsDetails.length - 5}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Criado em {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Contatos</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map(group => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{group.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {group.contactsCount} contatos
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewGroupMembers(group)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Membros
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startEdit(group)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateGroup(group)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportGroup(group)}>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => deleteGroup(group)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )
        ) : (
          <Card className="py-12">
            <CardContent className="text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum grupo encontrado' : 'Nenhum grupo criado ainda'}
              </p>
              <Button 
                className="mt-4"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Grupo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Group Dialog */}
        <Dialog open={isCreating || isEditing} onOpenChange={() => resetForm()}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {selectedGroup ? 'Editar Grupo' : 'Criar Novo Grupo'}
              </DialogTitle>
              <DialogDescription>
                {selectedGroup 
                  ? 'Atualize as informações do grupo de contatos'
                  : 'Crie um grupo para organizar e gerenciar seus contatos'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              <div>
                <Label htmlFor="group-name">Nome do Grupo *</Label>
                <Input
                  id="group-name"
                  placeholder="Ex: Clientes VIP"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="group-desc">Descrição (opcional)</Label>
                <Input
                  id="group-desc"
                  placeholder="Ex: Clientes com compras acima de R$ 1000"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Contatos do Grupo *</Label>
                <div className="mt-2 space-y-4">
                  {/* Search contacts */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar contatos..."
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Selected count and actions */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {selectedContacts.length} contatos selecionados
                    </span>
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedContacts(filteredContacts.map(c => c.id))}
                      >
                        Selecionar Todos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedContacts([])}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                  
                  {/* Contacts list */}
                  <ScrollArea className="h-[300px] border rounded-lg p-3">
                    <div className="space-y-2">
                      {filteredContacts.map(contact => (
                        <div
                          key={contact.id}
                          className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                          onClick={() => toggleContactSelection(contact.id)}
                        >
                          <Checkbox
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={() => toggleContactSelection(contact.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{contact.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {contact.phone}
                              {contact.email && ` • ${contact.email}`}
                            </div>
                            {contact.tags && contact.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {contact.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {contact.hasWhatsApp === false && (
                            <Badge variant="destructive" className="text-xs">
                              Sem WhatsApp
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={saveGroup}>
                {selectedGroup ? 'Salvar Alterações' : 'Criar Grupo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Members Dialog */}
        <Dialog open={showMembers} onOpenChange={setShowMembers}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedGroup?.name}</DialogTitle>
              <DialogDescription>
                {selectedGroup?.description || 'Membros do grupo'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">
                  {selectedGroup?.contactsCount} membros
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => selectedGroup && exportGroup(selectedGroup)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {selectedGroup?.contactsDetails?.map(contact => (
                    <div
                      key={contact.id}
                      className="flex items-center space-x-3 p-3 hover:bg-muted rounded-lg"
                    >
                      <Avatar>
                        <AvatarFallback>
                          {contact.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {contact.phone}
                          {contact.email && ` • ${contact.email}`}
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {contact.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {contact.hasWhatsApp === false && (
                        <Badge variant="destructive">
                          Sem WhatsApp
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMembers(false)}>
                Fechar
              </Button>
              <Button onClick={() => {
                setShowMembers(false)
                selectedGroup && startEdit(selectedGroup)
              }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar Grupo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}