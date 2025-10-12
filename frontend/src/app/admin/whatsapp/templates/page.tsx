'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Trash2,
  Send,
  FileText,
  CheckCircle,
  FileX,
  Power,
  PowerOff,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { ActionButton } from '@/components/admin/ActionButton';
import { EmptyState } from '@/components/admin/EmptyState';

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  body_text: string;
  header_text?: string;
  footer_text?: string;
  body_variables_count: number;
  rejected_reason?: string;
  created_at: string;
  approved_at?: string;
  sent_count: number;
  is_enabled: boolean;
}

interface WhatsAppNumber {
  id: string;
  phone_number: string;
  connection_type: string;
  whatsapp_business_account_id?: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadWhatsAppNumbers();
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (selectedNumber) {
      loadTemplates();
    }
  }, [selectedNumber]);

  const loadWhatsAppNumbers = async () => {
    try {
      const response = await api.get('/whatsapp/');
      const numbers = response.data;

      // Filter only Official API numbers (templates only work with Official API)
      const officialNumbers = numbers.filter(
        (n: WhatsAppNumber) => n.connection_type === 'official'
      );

      setWhatsappNumbers(officialNumbers);

      if (officialNumbers.length > 0) {
        setSelectedNumber(officialNumbers[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar números:', error);
    }
  };

  const loadTemplates = async () => {
    if (!selectedNumber) return;

    setLoading(true);
    try {
      const response = await api.get(
        `/whatsapp/${selectedNumber}/templates/local`
      );
      setTemplates(response.data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncTemplates = async () => {
    if (!selectedNumber) return;

    setSyncing(true);
    try {
      const response = await api.post(
        `/whatsapp/${selectedNumber}/templates/sync`
      );

      const stats = response.data;
      alert(
        `Sincronização concluída!\n\n` +
          `✅ Criados: ${stats.created}\n` +
          `🔄 Atualizados: ${stats.updated}\n` +
          `📊 Total sincronizado: ${stats.synced}`
      );

      await loadTemplates();
    } catch (error: any) {
      console.error('Erro ao sincronizar templates:', error);
      alert(
        `Erro ao sincronizar: ${error.response?.data?.detail || error.message}`
      );
    } finally {
      setSyncing(false);
    }
  };

  const deleteTemplate = async (templateId: string, templateName: string) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o template "${templateName}"?\n\n` +
          `Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/whatsapp/${selectedNumber}/templates/${templateId}`);
      alert('Template excluído com sucesso!');
      await loadTemplates();
    } catch (error: any) {
      console.error('Erro ao excluir template:', error);
      alert(
        `Erro ao excluir: ${error.response?.data?.detail || error.message}`
      );
    }
  };

  const toggleTemplateStatus = async (template: Template) => {
    try {
      const newStatus = !template.is_enabled;
      await api.put(`/whatsapp/${selectedNumber}/templates/${template.id}`, {
        is_enabled: newStatus,
      });

      // Update local state
      setTemplates(prev =>
        prev.map(t =>
          t.id === template.id ? { ...t, is_enabled: newStatus } : t
        )
      );
    } catch (error: any) {
      console.error('Erro ao alterar status do template:', error);
      alert(
        `Erro ao alterar status: ${error.response?.data?.detail || error.message}`
      );
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.body_text.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || template.status === statusFilter;

    const matchesCategory =
      categoryFilter === 'all' || template.category === categoryFilter;

    const matchesActiveStatus = showInactive || template.is_enabled;

    return matchesSearch && matchesStatus && matchesCategory && matchesActiveStatus;
  });

  // Calculate stats
  const stats = {
    total: templates.length,
    approved: templates.filter((t) => t.status === 'APPROVED').length,
    pending: templates.filter((t) => t.status === 'PENDING').length,
    rejected: templates.filter((t) => t.status === 'REJECTED').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'DRAFT':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-800',
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-600',
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
          colors[status as keyof typeof colors] || colors.DRAFT
        }`}
      >
        {status}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      MARKETING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      UTILITY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      AUTHENTICATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {category}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando templates...</p>
        </div>
      </div>
    );
  }

  if (whatsappNumbers.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={AlertCircle}
          title="Nenhum número Official API encontrado"
          description="Templates só funcionam com números conectados via Official API (Meta Cloud API). Configure um número primeiro."
          variant="gradient"
          action={{
            label: 'Configurar WhatsApp',
            onClick: () => router.push('/admin/whatsapp'),
            icon: Plus,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Templates"
          value={stats.total}
          subtitle="templates cadastrados"
          icon={FileText}
          color="indigo"
          loading={false}
        />
        <StatsCard
          title="Aprovados"
          value={stats.approved}
          subtitle="prontos para uso"
          icon={CheckCircle}
          color="green"
          loading={false}
        />
        <StatsCard
          title="Pendentes"
          value={stats.pending}
          subtitle="aguardando aprovação"
          icon={Clock}
          color="orange"
          loading={false}
        />
        <StatsCard
          title="Rejeitados"
          value={stats.rejected}
          subtitle="pelo Meta"
          icon={FileX}
          color="red"
          loading={false}
        />
      </div>

      {/* WhatsApp Number Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Número WhatsApp
        </label>
        <select
          value={selectedNumber}
          onChange={(e) => setSelectedNumber(e.target.value)}
          className="w-full max-w-sm px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
        >
          {whatsappNumbers.map((number) => (
            <option key={number.id} value={number.id}>
              {number.phone_number}
            </option>
          ))}
        </select>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou conteúdo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
        >
          <option value="all">Todos os Status</option>
          <option value="APPROVED">Aprovado</option>
          <option value="PENDING">Pendente</option>
          <option value="REJECTED">Rejeitado</option>
          <option value="DRAFT">Rascunho</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
        >
          <option value="all">Todas Categorias</option>
          <option value="MARKETING">Marketing</option>
          <option value="UTILITY">Utilidade</option>
          <option value="AUTHENTICATION">Autenticação</option>
        </select>

        {/* Sync Button */}
        <button
          onClick={syncTemplates}
          disabled={syncing || !selectedNumber}
          className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>

        {/* Show Inactive Checkbox */}
        <label className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-2 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-white"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Mostrar inativos
          </span>
        </label>

        {/* New Template Button */}
        <ActionButton
          onClick={() =>
            router.push(`/admin/whatsapp/templates/new?number=${selectedNumber}`)
          }
          variant="primary"
          icon={Plus}
          disabled={!selectedNumber}
        >
          Novo Template
        </ActionButton>
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Nenhum template encontrado'
              : 'Nenhum template criado ainda'
          }
          description={
            searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Crie seu primeiro template de mensagem para aprovação do Meta'
          }
          variant="gradient"
          action={
            searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? {
                  label: 'Limpar Filtros',
                  onClick: () => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  },
                  icon: Search,
                }
              : {
                  label: 'Criar Primeiro Template',
                  onClick: () =>
                    router.push(`/admin/whatsapp/templates/new?number=${selectedNumber}`),
                  icon: Plus,
                }
          }
        />
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    {getStatusIcon(template.status)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    {getStatusBadge(template.status)}
                    {getCategoryBadge(template.category)}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {template.language}
                    </span>
                  </div>

                  {/* Template Content Preview */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700">
                    {template.header_text && (
                      <p className="font-bold text-gray-900 dark:text-white mb-2">
                        {template.header_text}
                      </p>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-2">
                      {template.body_text}
                    </p>
                    {template.footer_text && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                        {template.footer_text}
                      </p>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {template.body_variables_count} variáveis
                    </span>
                    <span className="flex items-center gap-1">
                      <Send className="w-4 h-4" />
                      {template.sent_count} enviados
                    </span>
                    {template.approved_at && (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Aprovado em{' '}
                        {new Date(template.approved_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {template.rejected_reason && (
                      <span className="text-red-600 dark:text-red-400">
                        ❌ {template.rejected_reason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {/* Toggle Active/Inactive */}
                  <button
                    onClick={() => toggleTemplateStatus(template)}
                    className={`p-2 rounded-lg transition-colors ${
                      template.is_enabled
                        ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={template.is_enabled ? 'Desativar template' : 'Ativar template'}
                  >
                    {template.is_enabled ? (
                      <Power className="w-5 h-5" />
                    ) : (
                      <PowerOff className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        `/admin/whatsapp/templates/${template.id}?number=${selectedNumber}`
                      )
                    }
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Ver detalhes"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => deleteTemplate(template.id, template.name)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
