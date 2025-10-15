'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCog,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Shield,
  ShieldOff,
  Edit,
  Trash2,
  Power,
  PowerOff,
  MoreVertical,
  Crown,
  Users as UsersIcon,
  Eye,
} from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { ActionButton } from '@/components/admin/ActionButton';
import { UserModal, UserFormData } from '@/components/admin/UserModal';
import { usersAPI } from '@/lib/api';
import { User, UserRole } from '@/types/user';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Modal state
  const [showUserModal, setShowUserModal] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };

      if (selectedRole !== 'all') {
        params.role = selectedRole;
      }

      if (showInactiveOnly) {
        params.is_active = false;
      }

      const response = await usersAPI.list(params);
      let filteredUsers = response.data;

      // Filtro de busca no frontend
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredUsers = filteredUsers.filter((user: User) =>
          user.full_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        );
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole, showInactiveOnly]);

  useEffect(() => {
    // Debounce da busca
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleActivate = async (userId: string) => {
    try {
      await usersAPI.activate(userId);
      fetchUsers();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao ativar usuário:', error);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Tem certeza que deseja desativar este usuário?')) return;

    try {
      await usersAPI.deactivate(userId);
      fetchUsers();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) return;

    try {
      await usersAPI.delete(userId);
      fetchUsers();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
    }
  };

  const handleCreateUser = async (data: UserFormData) => {
    try {
      await usersAPI.create(data);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
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

  const getRoleBadge = (role: UserRole) => {
    const configs: Record<UserRole, { icon: any; color: string }> = {
      super_admin: { icon: Crown, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
      org_admin: { icon: Shield, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      agent: { icon: UsersIcon, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
      viewer: { icon: Eye, color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400' },
    };

    const config = configs[role] || configs.viewer;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="w-3 h-3" />
        {getRoleLabel(role)}
      </span>
    );
  };

  const columns = [
    {
      key: 'user',
      header: 'Usuário',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-gray-900 font-semibold">
            {user.full_name[0].toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {user.full_name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {user.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Função',
      render: (user: User) => getRoleBadge(user.role),
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (user: User) => (
        user.phone ? (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Phone className="w-4 h-4 text-gray-400" />
            {user.phone}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )
      ),
    },
    {
      key: 'last_login',
      header: 'Último Acesso',
      render: (user: User) => (
        user.last_login_at ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDistanceToNow(new Date(user.last_login_at), {
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
      render: (user: User) => (
        <div>
          {user.is_active ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <Power className="w-3 h-3" />
              Ativo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              <PowerOff className="w-3 h-3" />
              Inativo
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (user: User) => (
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {openDropdown === user.id && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-10">
              <button
                onClick={() => router.push(`/admin/users/${user.id}`)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>

              <hr className="my-1 border-gray-200 dark:border-gray-700" />

              {user.is_active ? (
                <button
                  onClick={() => handleDeactivate(user.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600"
                >
                  <PowerOff className="w-4 h-4" />
                  Desativar
                </button>
              ) : (
                <button
                  onClick={() => handleActivate(user.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600"
                >
                  <Power className="w-4 h-4" />
                  Ativar
                </button>
              )}

              <button
                onClick={() => handleDelete(user.id)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Deletar
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filtros e Ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busca */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
          />
        </div>

        {/* Filtro por Role */}
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
          className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
        >
          <option value="all">Todas as Funções</option>
          <option value="org_admin">Administradores</option>
          <option value="agent">Agentes</option>
          <option value="viewer">Visualizadores</option>
        </select>

        {/* Filtro de inativos */}
        <button
          onClick={() => setShowInactiveOnly(!showInactiveOnly)}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
            showInactiveOnly
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          {showInactiveOnly ? 'Inativos' : 'Todos'}
        </button>

        {/* Botão Adicionar */}
        <ActionButton
          onClick={() => setShowUserModal(true)}
          variant="primary"
          icon={Plus}
        >
          Adicionar Usuário
        </ActionButton>
      </div>

      {/* Modal */}
      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSubmit={handleCreateUser}
        mode="create"
      />

      {/* Conteúdo */}
      {users.length === 0 && !isLoading ? (
        <EmptyState
          icon={UserCog}
          title="Nenhum usuário encontrado"
          description={
            searchQuery
              ? `Não encontramos usuários com "${searchQuery}"`
              : 'Adicione membros à sua equipe para começar a colaborar'
          }
          variant="gradient"
          action={
            searchQuery ? {
              label: 'Limpar Busca',
              onClick: () => setSearchQuery(''),
              icon: Search,
            } : {
              label: 'Adicionar Primeiro Usuário',
              onClick: () => setShowUserModal(true),
              icon: Plus,
            }
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          loading={isLoading}
          emptyMessage="Nenhum usuário encontrado"
          onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
        />
      )}
    </div>
  );
}
