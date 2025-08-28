import React, { useState, useEffect } from 'react'
import { Users, Plus, Edit2, Trash2, Save, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { ContactSelector } from '@/components/ui/contact-selector'
import { notify } from '@/lib/toast'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  tags?: string[]
}

interface ContactGroup {
  id: string
  name: string
  description?: string
  contacts: string[]
  contactsCount?: number
  createdAt: string
  updatedAt: string
}

interface ContactGroupsProps {
  contacts: Contact[]
  onSelectGroup: (contactIds: string[]) => void
}

export function ContactGroups({ contacts, onSelectGroup }: ContactGroupsProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/contact-groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(Array.isArray(data) ? data : [])
      } else {
        // Se a API não existir ainda, usar localStorage
        const savedGroups = localStorage.getItem('contactGroups')
        if (savedGroups) {
          setGroups(JSON.parse(savedGroups))
        }
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      // Fallback para localStorage
      const savedGroups = localStorage.getItem('contactGroups')
      if (savedGroups) {
        setGroups(JSON.parse(savedGroups))
      }
    } finally {
      setIsLoading(false)
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
      id: editingGroup?.id || Date.now().toString(),
      name: groupName,
      description: groupDescription,
      contacts: selectedContacts,
      contactsCount: selectedContacts.length,
      createdAt: editingGroup?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      // Tentar salvar na API
      const response = await fetch(`/api/v1/contact-groups${editingGroup ? `/${editingGroup.id}` : ''}`, {
        method: editingGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      })

      if (!response.ok) {
        throw new Error('API not available')
      }

      await loadGroups()
    } catch (error) {
      // Fallback para localStorage
      const updatedGroups = editingGroup
        ? groups.map(g => g.id === editingGroup.id ? newGroup : g)
        : [...groups, newGroup]
      
      setGroups(updatedGroups)
      localStorage.setItem('contactGroups', JSON.stringify(updatedGroups))
    }

    notify.success(editingGroup ? 'Grupo atualizado!' : 'Grupo criado!')
    resetForm()
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Deseja realmente excluir este grupo?')) return

    try {
      const response = await fetch(`/api/v1/contact-groups/${groupId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('API not available')
      }

      await loadGroups()
    } catch (error) {
      // Fallback para localStorage
      const updatedGroups = groups.filter(g => g.id !== groupId)
      setGroups(updatedGroups)
      localStorage.setItem('contactGroups', JSON.stringify(updatedGroups))
    }

    notify.success('Grupo excluído!')
  }

  const resetForm = () => {
    setIsCreating(false)
    setIsEditing(false)
    setEditingGroup(null)
    setGroupName('')
    setGroupDescription('')
    setSelectedContacts([])
  }

  const startEdit = (group: ContactGroup) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupDescription(group.description || '')
    setSelectedContacts(group.contacts)
    setIsEditing(true)
  }

  const handleSelectGroup = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (group) {
      setSelectedGroup(groupId)
      onSelectGroup(group.contacts)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Grupos de Contatos</Label>
        <Dialog open={isCreating || isEditing} onOpenChange={(open) => !open && resetForm()}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Criar Novo Grupo'}</DialogTitle>
              <DialogDescription>
                {editingGroup 
                  ? 'Atualize as informações do grupo de contatos'
                  : 'Crie um grupo para facilitar o envio em massa'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="group-name">Nome do Grupo</Label>
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
                <Label>Contatos do Grupo</Label>
                <ContactSelector
                  contacts={contacts}
                  selectedContacts={selectedContacts}
                  onSelectionChange={setSelectedContacts}
                  placeholder="Selecione os contatos para o grupo"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={saveGroup}>
                <Save className="h-4 w-4 mr-2" />
                {editingGroup ? 'Atualizar' : 'Salvar'} Grupo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Seletor de Grupo */}
      <Select value={selectedGroup} onValueChange={handleSelectGroup}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um grupo salvo" />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="p-2 text-center text-sm text-muted-foreground">
              Carregando grupos...
            </div>
          ) : groups.length > 0 ? (
            groups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{group.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.contactsCount || group.contacts.length} contatos
                    </Badge>
                  </div>
                </div>
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-center text-sm text-muted-foreground">
              Nenhum grupo criado
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Lista de Grupos para Editar/Excluir */}
      {groups.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Grupos salvos:</div>
          <div className="flex flex-wrap gap-2">
            {groups.map(group => (
              <div
                key={group.id}
                className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md"
              >
                <Users className="h-3 w-3" />
                <span className="text-sm">{group.name}</span>
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {group.contactsCount || group.contacts.length}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => startEdit(group)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 text-destructive"
                  onClick={() => deleteGroup(group.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Add missing import
import { Label } from '@/components/ui/label'