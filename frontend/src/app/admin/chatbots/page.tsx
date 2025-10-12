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
  Edit,
  Trash2,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { ActionButton } from '@/components/admin/ActionButton';
import { CreateChatbotModal } from '@/components/admin/CreateChatbotModal';
import { chatbotsAPI } from '@/lib/api/chatbots';
import type { Chatbot } from '@/types/chatbot';

export default function ChatbotsPage() {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const activeCount = chatbots.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Action Button Row */}
      <div className="flex justify-end">
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
          title="Taxa de Conclusão"
          value="0%"
          subtitle="Fluxos completos"
          icon={BarChart3}
          color="orange"
          loading={isLoading}
        />

        <StatsCard
          title="Interações Hoje"
          value={0}
          subtitle="Conversas automatizadas"
          icon={Zap}
          color="blue"
          loading={isLoading}
        />
      </div>

      {/* Lista de Chatbots */}
      {chatbots.length === 0 && !isLoading ? (
        <EmptyState
          icon={Bot}
          title="Nenhum chatbot criado"
          description="Automatize seu atendimento criando chatbots inteligentes com fluxos personalizados"
          variant="gradient"
          action={{
            label: 'Criar Primeiro Chatbot',
            onClick: () => setShowCreateModal(true),
            icon: Plus,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatbots.map((bot) => (
            <div
              key={bot.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
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

                {/* Ação Principal - Abrir Builder */}
                <button
                  onClick={() => router.push(`/admin/chatbots/${bot.id}/builder`)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 mb-3"
                >
                  <Workflow className="w-4 h-4" />
                  Editar Fluxos
                </button>
              </div>

              {/* Actions Row */}
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleToggleActive(bot)}
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
                  onClick={() => handleDelete(bot)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Deletar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
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
