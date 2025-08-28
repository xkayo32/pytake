import React, { useState, useMemo } from 'react'
import { Search, Users, User, X, Check, Filter, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  tags?: string[]
  lastInteraction?: string
  hasWhatsApp?: boolean
}

interface ContactSelectorProps {
  contacts: Contact[]
  selectedContacts: string[]
  onSelectionChange: (contacts: string[]) => void
  isLoading?: boolean
  placeholder?: string
}

export function ContactSelector({
  contacts,
  selectedContacts,
  onSelectionChange,
  isLoading = false,
  placeholder = 'Selecionar contatos'
}: ContactSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Extrair todas as tags únicas
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    contacts.forEach(contact => {
      contact.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags)
  }, [contacts])

  // Filtrar contatos
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesTag = !filterTag || contact.tags?.includes(filterTag)
      
      return matchesSearch && matchesTag
    })
  }, [contacts, searchTerm, filterTag])

  // Contatos selecionados
  const selectedContactsData = useMemo(() => {
    return contacts.filter(c => selectedContacts.includes(c.id))
  }, [contacts, selectedContacts])

  const toggleContact = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      onSelectionChange(selectedContacts.filter(id => id !== contactId))
    } else {
      onSelectionChange([...selectedContacts, contactId])
    }
  }

  const toggleAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(filteredContacts.map(c => c.id))
    }
  }

  const clearSelection = () => {
    onSelectionChange([])
  }

  return (
    <div className="space-y-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <Users className="mr-2 h-4 w-4" />
            {selectedContacts.length > 0 ? (
              <span>{selectedContacts.length} contatos selecionados</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] max-h-[500px] p-0" align="start" sideOffset={5}>
          <div className="p-4 border-b">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tags para filtro */}
            {allTags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                <Button
                  size="sm"
                  variant={!filterTag ? "default" : "outline"}
                  onClick={() => setFilterTag(null)}
                  className="h-7 text-xs"
                >
                  Todos
                </Button>
                {allTags.map(tag => (
                  <Button
                    key={tag}
                    size="sm"
                    variant={filterTag === tag ? "default" : "outline"}
                    onClick={() => setFilterTag(tag)}
                    className="h-7 text-xs"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            )}

            {/* Ações em massa */}
            <div className="flex items-center justify-between mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={toggleAll}
                className="text-xs"
              >
                {selectedContacts.length === filteredContacts.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
              {selectedContacts.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  className="text-xs text-red-600"
                >
                  Limpar seleção
                </Button>
              )}
            </div>
          </div>

          {/* Lista de contatos */}
          <ScrollArea className="h-[250px]">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Carregando contatos...
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="p-2">
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg cursor-pointer"
                    onClick={() => toggleContact(contact.id)}
                  >
                    <Checkbox
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => toggleContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{contact.name}</span>
                        {contact.hasWhatsApp === false && (
                          <Badge variant="destructive" className="text-xs">
                            Sem WhatsApp
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {contact.phone}
                        {contact.email && ` • ${contact.email}`}
                      </div>
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {contact.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum contato encontrado
              </div>
            )}
          </ScrollArea>

          {/* Rodapé com resumo */}
          <div className="p-3 border-t bg-muted/50">
            <div className="text-xs text-muted-foreground">
              {selectedContacts.length} de {contacts.length} contatos selecionados
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Chips dos contatos selecionados */}
      {selectedContactsData.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedContactsData.slice(0, 5).map(contact => (
            <Badge key={contact.id} variant="secondary" className="text-xs">
              {contact.name}
              <button
                onClick={() => toggleContact(contact.id)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedContactsData.length > 5 && (
            <Badge variant="secondary" className="text-xs">
              +{selectedContactsData.length - 5} mais
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}