'use client';

import { useEffect, useState } from 'react';
import {
  ListTodo,
  Users,
  Clock,
  AlertCircle,
  Settings as SettingsIcon,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { StatsCard } from '@/components/admin/StatsCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { SLABadge } from '@/components/admin/SLABadge';
import { queueAPI, departmentsAPI } from '@/lib/api';
import { Conversation } from '@/types/conversation';
import { Department } from '@/types/department';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DepartmentsPage() {
  const [queue, setQueue] = useState<Conversation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);

  const fetchQueue = async () => {
    try {
      setIsLoadingQueue(true);
      const response = await queueAPI.list({ limit: 100 });
      setQueue(response.data);
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setIsLoadingDepartments(true);
      const response = await departmentsAPI.list();
      setDepartments(response.data);
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchDepartments();

    const queueInterval = setInterval(fetchQueue, 10000); // Auto-refresh a cada 10s
    const departmentsInterval = setInterval(fetchDepartments, 30000); // Auto-refresh a cada 30s

    return () => {
      clearInterval(queueInterval);
      clearInterval(departmentsInterval);
    };
  }, []);

  // Deriva contagens por prioridade a partir de queue_priority (numérico)
  const urgentCount = queue.filter(c => (c.queue_priority ?? 0) >= 100).length;
  const highCount = queue.filter(c => (c.queue_priority ?? 0) >= 80 && (c.queue_priority ?? 0) < 100).length;

  const getIconEmoji = (icon?: string) => {
    const iconMap: Record<string, string> = {
      users: '👥',
      headset: '🎧',
      shopping: '🛍️',
      tools: '🔧',
      money: '💰',
      chart: '📊',
      shield: '🛡️',
      star: '⭐',
    };
    return iconMap[icon || 'users'] || '👥';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Departamentos"
        description="Gerencie departamentos e equipes de atendimento"
      />

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total na Fila"
          value={queue.length}
          subtitle="Aguardando atendimento"
          icon={ListTodo}
          color="blue"
          loading={isLoadingQueue}
        />

        <StatsCard
          title="Urgentes"
          value={urgentCount}
          subtitle="Alta prioridade"
          icon={AlertCircle}
          color="red"
          loading={isLoadingQueue}
        />

        <StatsCard
          title="Altas"
          value={highCount}
          subtitle="Média-alta prioridade"
          icon={Clock}
          color="orange"
          loading={isLoadingQueue}
        />

        <StatsCard
          title="Departamentos Ativos"
          value={departments.filter(d => d.is_active).length}
          subtitle={`${departments.length} total`}
          icon={Users}
          color="green"
          loading={isLoadingDepartments}
        />
      </div>

      {/* Departamentos */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Departamentos
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Visualização de departamentos • Para criar ou editar, acesse Configurações → Organização
            </p>
          </div>
          <Link
            href="/admin/settings/organization?tab=departments"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Gerenciar</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-6">
          {isLoadingDepartments ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12">
              <SettingsIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhum departamento criado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Acesse Configurações → Organização para criar seu primeiro departamento
              </p>
              <Link
                href="/admin/settings/organization?tab=departments"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Ir para Configurações da Organização</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                      style={{
                        backgroundColor: dept.color + '20',
                        color: dept.color,
                      }}
                    >
                      <span className="text-lg">{getIconEmoji(dept.icon)}</span>
                      <span className="font-semibold">{dept.name}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {dept.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {dept.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {dept.total_agents}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Agentes
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {dept.queued_conversations}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Na Fila
                      </div>
                    </div>
                  </div>

                  {/* Config Info */}
                  <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        dept.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {dept.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Roteamento</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {dept.routing_mode === 'round_robin' && '🔄 Round Robin'}
                        {dept.routing_mode === 'load_balance' && '⚖️ Balanceamento'}
                        {dept.routing_mode === 'manual' && '👆 Manual'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Auto-atribuir</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {dept.auto_assign_conversations ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Máx. por agente</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {dept.max_conversations_per_agent}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Conversas na Fila */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conversas Aguardando
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Conversas em fila aguardando distribuição
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {queue.length === 0 ? (
            <div className="p-12 text-center">
              <ListTodo className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Nenhuma conversa na fila</p>
            </div>
          ) : (
            queue.map((conversation) => (
              <div key={conversation.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {conversation.contact?.name || conversation.contact?.whatsapp_id || 'Sem nome'}
                      </h3>
                      {typeof conversation.queue_priority === 'number' && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          conversation.queue_priority >= 100
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : conversation.queue_priority >= 80
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {conversation.queue_priority >= 100
                            ? 'Urgente'
                            : conversation.queue_priority >= 80
                              ? 'Alta'
                              : 'Normal'}
                        </span>
                      )}
                      {/* SLA Badge */}
                      {conversation.queued_at && (
                        <SLABadge 
                          queuedAt={conversation.queued_at}
                          slaMinutes={null} // TODO: Buscar da fila
                          size="sm"
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Aguardando há {formatDistanceToNow(new Date(conversation.created_at), { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {conversation.unread_count > 0 && (
                      <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                        {conversation.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
