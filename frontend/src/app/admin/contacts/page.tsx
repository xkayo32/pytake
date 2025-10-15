'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Building2,
  Shield,
  ShieldOff,
  Edit,
  Trash2,
  Tag as TagIcon,
  MoreVertical,
  UserPlus,
  UserCheck,
  UserX,
  MessageSquare,
} from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { ActionButton } from '@/components/admin/ActionButton';
import { StatsCard } from '@/components/admin/StatsCard';
import { ContactModal, ContactFormData } from '@/components/admin/ContactModal';
import { TagsModal } from '@/components/admin/TagsModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DropdownMenu } from '@/components/admin/DropdownMenu';
import { contactsAPI, tagsAPI } from '@/lib/api';
import { Contact } from '@/types/contact';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Tags filter
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagsFilter, setShowTagsFilter] = useState(false);

  // Modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Dropdown state
  const [dropdownTrigger, setDropdownTrigger] = useState<HTMLButtonElement | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total_contacts: 0,
    contacts_with_tags: 0,
    blocked_contacts: 0,
    recent_contacts: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await contactsAPI.getOrganizationStats();
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.list();
      setAvailableTags(response.data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };

      if (searchQuery) {
        params.query = searchQuery;
      }

      if (showBlockedOnly) {
        params.is_blocked = true;
      }

      if (selectedTagIds.length > 0) {
        params.tags = selectedTagIds;
      }

      const response = await contactsAPI.list(params);
      setContacts(response.data);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTags();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [searchQuery, showBlockedOnly, selectedTagIds]);

  const handleOpenDropdown = (contactId: string, buttonElement: HTMLButtonElement) => {
    if (openDropdown === contactId) {
      setOpenDropdown(null);
      setDropdownTrigger(null);
    } else {
      setOpenDropdown(contactId);
      setDropdownTrigger(buttonElement);
    }
  };

  const handleCloseDropdown = () => {
    setOpenDropdown(null);
    setDropdownTrigger(null);
  };

  const handleBlock = async (contactId: string) => {
    try {
      await contactsAPI.block(contactId, 'Bloqueado pelo administrador');
      fetchContacts();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao bloquear contato:', error);
    }
  };

  const handleUnblock = async (contactId: string) => {
    try {
      await contactsAPI.unblock(contactId);
      fetchContacts();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao desbloquear contato:', error);
    }
  };

  const handleDeleteClick = (contact: Contact) => {
    setSelectedContact(contact);
    setShowConfirmDialog(true);
    setOpenDropdown(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedContact) return;

    try {
      await contactsAPI.delete(selectedContact.id);
      setShowConfirmDialog(false);
      setSelectedContact(null);
      fetchContacts();
    } catch (error) {
      console.error('Erro ao deletar contato:', error);
    }
  };

  const handleCreateContact = async (data: ContactFormData) => {
    try {
      await contactsAPI.create(data);
      fetchContacts();
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      throw error;
    }
  };

  const handleOpenTagsModal = (contact: Contact) => {
    setSelectedContact(contact);
    setShowTagsModal(true);
    setOpenDropdown(null);
  };

  const handleSaveTags = async (tags: string[]) => {
    if (!selectedContact) return;

    try {
      await contactsAPI.updateTags(selectedContact.id, tags);
      fetchContacts();
    } catch (error) {
      console.error('Erro ao salvar tags:', error);
      throw error;
    }
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const clearTagFilters = () => {
    setSelectedTagIds([]);
  };

  const getSelectedTagNames = () => {
    return availableTags
      .filter(tag => selectedTagIds.includes(tag.id))
      .map(tag => tag.name);
  };

  const columns = [
    {
      key: 'name',
      header: 'Contato',
      render: (contact: Contact) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-gray-900 font-semibold">
            {contact.name ? contact.name[0].toUpperCase() : contact.whatsapp_id[0]}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {contact.name || contact.whatsapp_name || 'Sem nome'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {contact.whatsapp_id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (contact: Contact) => (
        contact.email ? (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Mail className="w-4 h-4 text-gray-400" />
            {contact.email}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )
      ),
    },
    {
      key: 'company',
      header: 'Empresa',
      render: (contact: Contact) => (
        contact.company ? (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Building2 className="w-4 h-4 text-gray-400" />
            {contact.company}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (contact: Contact) => (
        <div className="flex items-center gap-1 flex-wrap max-w-[200px]" onClick={(e) => e.stopPropagation()}>
          {contact.tags && contact.tags.length > 0 ? (
            <>
              {contact.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                >
                  {tag}
                </span>
              ))}
              {contact.tags.length > 2 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  +{contact.tags.length - 2}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenTagsModal(contact);
                }}
                className="ml-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                title="Gerenciar tags"
              >
                <TagIcon className="w-3 h-3 text-gray-400" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTagsModal(contact);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <TagIcon className="w-3 h-3" />
              Adicionar
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'conversations',
      header: 'Conversas',
      render: (contact: Contact) => {
        const hasConversations = contact.total_conversations > 0;

        return (
          <div
            className={`text-center ${hasConversations ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg py-1 transition-colors' : ''}`}
            onClick={(e) => {
              if (hasConversations) {
                e.stopPropagation();
                router.push(`/admin/conversations?contact=${contact.id}`);
              }
            }}
          >
            <div className={`text-sm font-semibold ${hasConversations ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
              {contact.total_conversations}
            </div>
            <div className="text-xs text-gray-500">
              {contact.total_messages_sent + contact.total_messages_received} msgs
            </div>
          </div>
        );
      },
    },
    {
      key: 'last_message',
      header: 'Última Mensagem',
      render: (contact: Contact) => (
        contact.last_message_at ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDistanceToNow(new Date(contact.last_message_at), {
              addSuffix: true,
              locale: ptBR
            })}
          </div>
        ) : (
          <span className="text-sm text-gray-400">Nunca</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (contact: Contact) => (
        <div>
          {contact.is_blocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              <ShieldOff className="w-3 h-3" />
              Bloqueado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <Shield className="w-3 h-3" />
              Ativo
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (contact: Contact) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDropdown(contact.id, e.currentTarget);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Contatos"
          value={stats.total_contacts}
          subtitle="contatos cadastrados"
          icon={Users}
          color="indigo"
          loading={statsLoading}
        />
        <StatsCard
          title="Com Tags"
          value={stats.contacts_with_tags}
          subtitle="contatos organizados"
          icon={TagIcon}
          color="blue"
          loading={statsLoading}
        />
        <StatsCard
          title="Bloqueados"
          value={stats.blocked_contacts}
          subtitle="contatos bloqueados"
          icon={UserX}
          color="red"
          loading={statsLoading}
        />
        <StatsCard
          title="Adicionados"
          value={stats.recent_contacts}
          subtitle="últimos 7 dias"
          icon={UserPlus}
          color="green"
          loading={statsLoading}
        />
      </div>

      {/* Filtros e Ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busca */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
          />
        </div>

        {/* Filtro de bloqueados */}
        <button
          onClick={() => setShowBlockedOnly(!showBlockedOnly)}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
            showBlockedOnly
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          {showBlockedOnly ? 'Bloqueados' : 'Todos'}
        </button>

        {/* Filtro de tags */}
        <div className="relative">
          <button
            onClick={() => setShowTagsFilter(!showTagsFilter)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
              selectedTagIds.length > 0
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <TagIcon className="w-4 h-4" />
            {selectedTagIds.length > 0 ? `Tags (${selectedTagIds.length})` : 'Tags'}
          </button>

          {showTagsFilter && (
            <div className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Filtrar por Tags</span>
                {selectedTagIds.length > 0 && (
                  <button
                    onClick={clearTagFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {availableTags.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                  Nenhuma tag disponível
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagFilter(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedTagIds.includes(tag.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão Adicionar */}
        <ActionButton
          onClick={() => setShowContactModal(true)}
          variant="primary"
          icon={Plus}
        >
          Adicionar Contato
        </ActionButton>
      </div>

      {/* Tags selecionadas */}
      {selectedTagIds.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400">Filtrando por:</span>
          {availableTags
            .filter(tag => selectedTagIds.includes(tag.id))
            .map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
              >
                {tag.name}
                <button
                  onClick={() => toggleTagFilter(tag.id)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
        </div>
      )}

      {/* Modals */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSubmit={handleCreateContact}
        mode="create"
      />

      <TagsModal
        isOpen={showTagsModal}
        onClose={() => {
          setShowTagsModal(false);
          setSelectedContact(null);
        }}
        onSave={handleSaveTags}
        currentTags={selectedContact?.tags || []}
        contactName={selectedContact?.name || selectedContact?.whatsapp_id}
      />

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Deletar Contato"
        message={`Tem certeza que deseja deletar o contato ${selectedContact?.name || selectedContact?.whatsapp_id}? Esta ação não pode ser desfeita.`}
        confirmText="Deletar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowConfirmDialog(false);
          setSelectedContact(null);
        }}
      />

      {/* Dropdown Menu - Rendered via Portal */}
      <DropdownMenu
        isOpen={!!openDropdown}
        onClose={handleCloseDropdown}
        triggerElement={dropdownTrigger}
      >
        {openDropdown && contacts.find(c => c.id === openDropdown) && (() => {
          const contact = contacts.find(c => c.id === openDropdown)!;
          return (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/admin/contacts/${contact.id}`);
                  handleCloseDropdown();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenTagsModal(contact);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <TagIcon className="w-4 h-4" />
                Tags
              </button>

              {contact.total_conversations > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/conversations?contact=${contact.id}`);
                    handleCloseDropdown();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-blue-600 dark:text-blue-400"
                >
                  <MessageSquare className="w-4 h-4" />
                  Ver Conversas ({contact.total_conversations})
                </button>
              )}

              <hr className="my-1 border-gray-200 dark:border-gray-700" />

              {contact.is_blocked ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnblock(contact.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600"
                >
                  <Shield className="w-4 h-4" />
                  Desbloquear
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBlock(contact.id);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600"
                >
                  <ShieldOff className="w-4 h-4" />
                  Bloquear
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(contact);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Deletar
              </button>
            </>
          );
        })()}
      </DropdownMenu>

      {/* Conteúdo */}
      {contacts.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="Nenhum contato encontrado"
          description={
            searchQuery
              ? `Não encontramos contatos com "${searchQuery}"`
              : 'Os contatos são criados automaticamente quando clientes enviam mensagens via WhatsApp'
          }
          variant="gradient"
          action={
            searchQuery ? {
              label: 'Limpar Busca',
              onClick: () => setSearchQuery(''),
              icon: Search,
            } : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={contacts}
          loading={isLoading}
          emptyMessage="Nenhum contato encontrado"
          onRowClick={(contact) => router.push(`/admin/contacts/${contact.id}`)}
        />
      )}
    </div>
  );
}
