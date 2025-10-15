'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  Key,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Lock,
  Globe,
  Bot,
  Eye,
  Loader2,
} from 'lucide-react';
import { Secret, SecretScope } from '@/types/secret';
import { secretsAPI } from '@/lib/api/secrets';
import SecretModal from '@/components/admin/SecretModal';
import { useToast } from '@/store/notificationStore';
import { useConfirm } from '@/hooks/useConfirm';

export default function SecretsPage() {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Secrets state
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [filteredSecrets, setFilteredSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | SecretScope>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | undefined>(undefined);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    organization: 0,
    chatbot: 0,
  });

  // Auth check
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load secrets on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSecrets();
    }
  }, [isAuthenticated]);

  // Apply filters when secrets or filters change
  useEffect(() => {
    applyFilters();
  }, [secrets, searchQuery, scopeFilter, activeFilter]);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await secretsAPI.list({ is_active: true });
      setSecrets(data);

      // Calculate stats
      const active = data.filter((s) => s.is_active).length;
      const organization = data.filter((s) => s.scope === SecretScope.ORGANIZATION).length;
      const chatbot = data.filter((s) => s.scope === SecretScope.CHATBOT).length;

      setStats({
        total: data.length,
        active,
        organization,
        chatbot,
      });
    } catch (err: any) {
      console.error('Failed to load secrets:', err);
      setError(err.response?.data?.error?.message || 'Erro ao carregar secrets');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...secrets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.display_name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
      );
    }

    // Scope filter
    if (scopeFilter !== 'all') {
      filtered = filtered.filter((s) => s.scope === scopeFilter);
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter((s) => s.is_active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter((s) => !s.is_active);
    }

    setFilteredSecrets(filtered);
  };

  const handleCreate = () => {
    setEditingSecret(undefined);
    setModalOpen(true);
  };

  const handleEdit = (secret: Secret) => {
    setEditingSecret(secret);
    setModalOpen(true);
  };

  const handleDelete = async (secret: Secret) => {
    const confirmed = await confirm({
      title: 'Deletar Secret',
      message: `Tem certeza que deseja deletar o secret "${secret.display_name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Deletar',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await secretsAPI.delete(secret.id, false); // Soft delete
      loadSecrets();
      toast.success('Secret deletado com sucesso');
    } catch (err: any) {
      console.error('Failed to delete secret:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao deletar secret');
    }
  };

  const handleValidate = async (secret: Secret) => {
    try {
      const result = await secretsAPI.validate(secret.id);
      if (result.is_valid) {
        toast.success(result.message || 'Secret válido!');
      } else {
        toast.error(result.message || 'Secret inválido!');
      }
    } catch (err: any) {
      console.error('Failed to validate secret:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao validar secret');
    }
  };

  const handleModalSuccess = () => {
    loadSecrets();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Key className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Secrets Manager
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gerencie chaves de API, senhas e tokens criptografados
                </p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Novo Secret
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total}
                </p>
              </div>
              <Key className="h-10 w-10 text-purple-600 dark:text-purple-400 opacity-50" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ativos</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400 opacity-50" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Organização</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.organization}
                </p>
              </div>
              <Globe className="h-10 w-10 text-blue-600 dark:text-blue-400 opacity-50" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Chatbot</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {stats.chatbot}
                </p>
              </div>
              <Bot className="h-10 w-10 text-orange-600 dark:text-orange-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, display name ou descrição..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Scope Filter */}
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todos os escopos</option>
              <option value={SecretScope.ORGANIZATION}>Organização</option>
              <option value={SecretScope.CHATBOT}>Chatbot</option>
            </select>

            {/* Active Filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            {/* Refresh */}
            <button
              onClick={loadSecrets}
              disabled={loading}
              className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredSecrets.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhum secret encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery || scopeFilter !== 'all' || activeFilter !== 'all'
                  ? 'Tente ajustar os filtros'
                  : 'Crie seu primeiro secret para começar'}
              </p>
              {!searchQuery && scopeFilter === 'all' && activeFilter === 'all' && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Criar Secret
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Secret
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Escopo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Uso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSecrets.map((secret) => (
                    <tr
                      key={secret.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {secret.display_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                              {secret.name}
                            </div>
                            {secret.description && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {secret.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            secret.scope === SecretScope.ORGANIZATION
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          }`}
                        >
                          {secret.scope === SecretScope.ORGANIZATION ? (
                            <>
                              <Globe className="h-3 w-3" />
                              Organização
                            </>
                          ) : (
                            <>
                              <Bot className="h-3 w-3" />
                              Chatbot
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                          <Lock className="h-3 w-3" />
                          {secret.encryption_provider.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {secret.usage_count}x
                        </div>
                        {secret.last_used_at && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(secret.last_used_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {secret.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                            <AlertCircle className="h-3 w-3" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleValidate(secret)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                            title="Validar decriptação"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(secret)}
                            className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(secret)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredSecrets.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
            Exibindo {filteredSecrets.length} de {secrets.length} secrets
          </div>
        )}
      </div>

      {/* Modal */}
      <SecretModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        secret={editingSecret}
      />
    </div>
  );
}
