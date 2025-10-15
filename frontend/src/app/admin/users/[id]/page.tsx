'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Crown,
  Users as UsersIcon,
  Eye,
  Calendar,
  Power,
  PowerOff,
  Edit,
  Trash2,
  BarChart3,
  MessageSquare,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { ActionButton } from '@/components/admin/ActionButton';
import { usersAPI } from '@/lib/api';
import { User as UserType, UserStats, UserRole } from '@/types/user';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserType | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserDetails = async () => {
    try {
      setIsLoading(true);
      const [userResponse, statsResponse] = await Promise.all([
        usersAPI.get(userId),
        usersAPI.getStats(userId),
      ]);
      setUser(userResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Erro ao carregar detalhes do usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const handleActivate = async () => {
    try {
      await usersAPI.activate(userId);
      fetchUserDetails();
    } catch (error) {
      console.error('Erro ao ativar usuário:', error);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Desativar este usuário?')) return;
    try {
      await usersAPI.deactivate(userId);
      fetchUserDetails();
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deletar este usuário permanentemente?')) return;
    try {
      await usersAPI.delete(userId);
      router.push('/admin/users');
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    const icons = {
      super_admin: Crown,
      org_admin: Shield,
      agent: UsersIcon,
      viewer: Eye,
    };
    return icons[role] || UsersIcon;
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      super_admin: 'Super Admin',
      org_admin: 'Administrador',
      agent: 'Agente',
      viewer: 'Visualizador',
    };
    return labels[role] || role;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Usuário não encontrado</div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(user.role);

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.full_name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <RoleIcon className="w-4 h-4" />
              {getRoleLabel(user.role)}
              {user.is_active ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ml-2">
                  <Power className="w-3 h-3" />
                  Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ml-2">
                  <PowerOff className="w-3 h-3" />
                  Inativo
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
              {user.is_active ? (
                <ActionButton
                  onClick={handleDeactivate}
                  variant="secondary"
                  icon={PowerOff}
                >
                  Desativar
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleActivate}
                  variant="success"
                  icon={Power}
                >
                  Ativar
                </ActionButton>
              )}
              <ActionButton
                onClick={() => {/* TODO: Editar */}}
                variant="secondary"
                icon={Edit}
              >
                Editar
              </ActionButton>
              <ActionButton
                onClick={handleDelete}
                variant="danger"
                icon={Trash2}
              >
                Deletar
              </ActionButton>
            </div>
      </div>

      {/* Estatísticas de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Conversas Totais"
          value={stats?.total_conversations || 0}
          subtitle="Atendimentos"
          icon={MessageSquare}
          color="blue"
        />
        <StatsCard
          title="Mensagens Enviadas"
          value={stats?.total_messages_sent || 0}
          subtitle="Total"
          icon={MessageSquare}
          color="orange"
        />
        <StatsCard
          title="Tempo Médio"
          value={stats?.avg_response_time_minutes ? `${stats.avg_response_time_minutes.toFixed(0)}min` : '-'}
          subtitle="Resposta"
          icon={Clock}
          color="blue"
        />
        <StatsCard
          title="Taxa de Resolução"
          value={stats?.conversations_resolved || 0}
          subtitle={`${stats?.conversations_active || 0} ativas`}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Informações do Usuário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Informações Pessoais */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            Informações Pessoais
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {user.email}
                </div>
                {user.is_email_verified && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Verificado
                  </div>
                )}
              </div>
            </div>

            {user.phone && (
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Telefone</div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {user.phone}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <RoleIcon className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Função</div>
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                  {getRoleLabel(user.role)}
                </div>
              </div>
            </div>

            {user.job_title && (
              <div className="flex items-start gap-2.5">
                <BarChart3 className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cargo</div>
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {user.job_title}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Atividade */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Atividade
          </h2>

          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Último Acesso</div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {user.last_login_at
                  ? formatDistanceToNow(new Date(user.last_login_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : 'Nunca'}
              </div>
              {user.last_login_at && (
                <div className="text-xs text-gray-500 mt-1">
                  {format(new Date(user.last_login_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Membro desde</div>
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: ptBR })}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
              <div className="flex items-center gap-2">
                {user.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    <Power className="w-3 h-3" />
                    Conta Ativa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    <PowerOff className="w-3 h-3" />
                    Conta Inativa
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Atendimentos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Histórico de Atendimentos
        </h2>
        <div className="text-center py-8 text-gray-500">
          Lista de conversas atendidas será implementada em breve
        </div>
      </div>
    </div>
  );
}
