'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Plus,
  Power,
  PowerOff,
  Workflow,
  Zap,
  BarChart3,
  Trash2,
  Grid3x3,
  List,
  Filter,
  MessageSquare,
  Star,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { ActionButton } from '@/components/admin/ActionButton';
import { CreateChatbotModal } from '@/components/admin/CreateChatbotModal';
import { chatbotsAPI } from '@/lib/api/chatbots';
import type { Chatbot } from '@/types/chatbot';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'active' | 'inactive';
type FilterWhatsApp = 'all' | 'with' | 'without';

export default function ChatbotsPage() {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterWhatsApp, setFilterWhatsApp] = useState<FilterWhatsApp>('all');

  const fetchChatbots = async () => {
    try {
      setIsLoading(true);
      const response = await chatbotsAPI.list({ limit: 100 });
      setChatbots(response.items || []);
    } catch (error) {
      console.error('Erro ao carregar chatbots:', error);
      setChatbots([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatbots();
  }, []);

  const handleToggleActive = async (bot: Chatbot) => {
    try {
      if (bot.is_active) {
        await chatbotsAPI.deactivate(bot.id);
      } else {
        await chatbotsAPI.activate(bot.id);
      }
      await fetchChatbots();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      alert(error.response?.data?.detail || 'Erro ao alterar status do chatbot');
    }
  };

  const handleDelete = async (bot: Chatbot) => {
    if (!confirm(`Tem certeza que deseja deletar o chatbot "${bot.name}"?`)) {
      return;
    }

    try {
      await chatbotsAPI.delete(bot.id);
      await fetchChatbots();
    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      alert(error.response?.data?.detail || 'Erro ao deletar chatbot');
    }
  };

  // Filtragem
  const filteredChatbots = chatbots.filter((bot) => {
    // Filtro de status
    if (filterStatus === 'active' && !bot.is_active) return false;
    if (filterStatus === 'inactive' && bot.is_active) return false;

    // Filtro de WhatsApp
    if (filterWhatsApp === 'with' && !bot.whatsapp_number_id) return false;
    if (filterWhatsApp === 'without' && bot.whatsapp_number_id) return false;

    return true;
  });

  const activeCount = chatbots.filter((c) => c.is_active).length;
  const withWhatsAppCount = chatbots.filter((c) => c.whatsapp_number_id).length;

  return (
    <div className="space-y-6">
      {/* Action Button Row */}
      <div className="flex justify-between items-center">
        {/* Filtros */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="text-sm bg-transparent border-none focus:outline-none text-gray-700 dark:text-gray-300"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <select
              value={filterWhatsApp}
              onChange={(e) => setFilterWhatsApp(e.target.value as FilterWhatsApp)}
              className="text-sm bg-transparent border-none focus:outline-none text-gray-700 dark:text-gray-300"
            >
              <option value="all">Todos</option>
              <option value="with">Com WhatsApp</option>
              <option value="without">Sem WhatsApp</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Visualização em grade"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Visualização em lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ActionButton
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          icon={Plus}
        >
          Criar Chatbot
        </ActionButton>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Bots"
          value={chatbots.length}
          subtitle="Criados"
          icon={Bot}
          color="blue"
          loading={isLoading}
        />

        <StatsCard
          title="Ativos"
          value={activeCount}
          subtitle="Em produção"
          icon={Power}
          color="green"
          loading={isLoading}
        />

        <StatsCard
          title="Com WhatsApp"
          value={withWhatsAppCount}
          subtitle="Números vinculados"
          icon={MessageSquare}
          color="purple"
          loading={isLoading}
        />

        <StatsCard
          title="Interações Hoje"
          value={0}
          subtitle="Conversas automatizadas"
          icon={Zap}
          color="orange"
          loading={isLoading}
        />
      </div>

      {/* Lista de Chatbots */}
      {filteredChatbots.length === 0 && !isLoading ? (
        <EmptyState
          icon={Bot}
          title={
            chatbots.length === 0
              ? 'Nenhum chatbot criado'
              : 'Nenhum chatbot encontrado'
          }
          description={
            chatbots.length === 0
              ? 'Automatize seu atendimento criando chatbots inteligentes com fluxos personalizados'
              : 'Tente ajustar os filtros para encontrar o que procura'
          }
          variant="gradient"
          action={
            chatbots.length === 0
              ? {
                  label: 'Criar Primeiro Chatbot',
                  onClick: () => setShowCreateModal(true),
                  icon: Plus,
                }
              : undefined
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChatbots.map((bot) => (
            <ChatbotCard
              key={bot.id}
              bot={bot}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onEdit={() => router.push(`/builder/${bot.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChatbots.map((bot) => (
            <ChatbotListItem
              key={bot.id}
              bot={bot}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onEdit={() => router.push(`/builder/${bot.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal de Criação */}
      <CreateChatbotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchChatbots();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}

// Componente Card
function ChatbotCard({
  bot,
  onToggleActive,
  onDelete,
  onEdit,
}: {
  bot: Chatbot;
  onToggleActive: (bot: Chatbot) => void;
  onDelete: (bot: Chatbot) => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center relative">
            <Bot className="w-6 h-6 text-white" />
            {bot.whatsapp_number_id && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                <MessageSquare className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {bot.is_active ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
                <Power className="w-3 h-3" />
                Ativo
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 flex items-center gap-1">
                <PowerOff className="w-3 h-3" />
                Inativo
              </span>
            )}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {bot.name}
        </h3>

        {bot.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {bot.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4" />
            <span>{bot.total_conversations || 0} conversas</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            <span>{bot.total_messages_sent || 0} msgs</span>
          </div>
        </div>

        {/* Badge WhatsApp */}
        {bot.whatsapp_number_id && (
          <div className="mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">WhatsApp vinculado</span>
            </div>
          </div>
        )}

        {/* Ação Principal - Abrir Builder */}
        <button
          onClick={onEdit}
          className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 mb-3"
        >
          <Workflow className="w-4 h-4" />
          Editar Fluxos
        </button>
      </div>

      {/* Actions Row */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
        <button
          onClick={() => onToggleActive(bot)}
          className={`p-2 rounded-lg transition-colors ${
            bot.is_active
              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={bot.is_active ? 'Desativar' : 'Ativar'}
        >
          {bot.is_active ? (
            <Power className="w-4 h-4" />
          ) : (
            <PowerOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onDelete(bot)}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Deletar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Componente Lista
function ChatbotListItem({
  bot,
  onToggleActive,
  onDelete,
  onEdit,
}: {
  bot: Chatbot;
  onToggleActive: (bot: Chatbot) => void;
  onDelete: (bot: Chatbot) => void;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
      <div className="p-4 flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 relative">
          <Bot className="w-6 h-6 text-white" />
          {bot.whatsapp_number_id && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {bot.name}
            </h3>
            {bot.whatsapp_number_id && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1 flex-shrink-0">
                <MessageSquare className="w-3 h-3" />
                WhatsApp
              </span>
            )}
          </div>
          {bot.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {bot.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            <span>{bot.total_conversations || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            <span>{bot.total_messages_sent || 0}</span>
          </div>
        </div>

        {/* Status Badge */}
        {bot.is_active ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1 flex-shrink-0">
            <Power className="w-3 h-3" />
            Ativo
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 flex items-center gap-1 flex-shrink-0">
            <PowerOff className="w-3 h-3" />
            Inativo
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
          >
            <Workflow className="w-4 h-4" />
            Editar
          </button>

          <button
            onClick={() => onToggleActive(bot)}
            className={`p-2 rounded-lg transition-colors ${
              bot.is_active
                ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={bot.is_active ? 'Desativar' : 'Ativar'}
          >
            {bot.is_active ? (
              <Power className="w-4 h-4" />
            ) : (
              <PowerOff className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => onDelete(bot)}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Deletar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
