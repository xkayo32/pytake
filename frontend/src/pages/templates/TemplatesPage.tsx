import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Plus, RefreshCw, Star, TrendingUp } from 'lucide-react';
import { TemplateList } from '@/components/templates/TemplateList';
import { TemplateModal } from '@/components/templates/TemplateModal';
import { templateApi } from '@/services/templateApi';
import type { Template, CreateTemplateInput, UpdateTemplateInput } from '@/types/template';
import { useToast } from '@/hooks/useToast';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch templates
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templateApi.listTemplates({ page: 1, page_size: 100 })
  });

  // Fetch favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ['templates', 'favorites'],
    queryFn: () => templateApi.getUserFavorites()
  });

  // Fetch template stats
  const { data: stats = [] } = useQuery({
    queryKey: ['templates', 'stats'],
    queryFn: () => templateApi.getTemplatesWithStats()
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTemplateInput) => templateApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template criado com sucesso!', type: 'success' });
      setShowCreateModal(false);
    },
    onError: () => {
      toast({ title: 'Erro ao criar template', type: 'error' });
    }
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTemplateInput }) =>
      templateApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template atualizado com sucesso!', type: 'success' });
      setSelectedTemplate(null);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar template', type: 'error' });
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => templateApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template excluído com sucesso!', type: 'success' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir template', type: 'error' });
    }
  });

  // Clone template mutation
  const cloneMutation = useMutation({
    mutationFn: ({ id, newName }: { id: number; newName: string }) =>
      templateApi.cloneTemplate(id, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template duplicado com sucesso!', type: 'success' });
    },
    onError: () => {
      toast({ title: 'Erro ao duplicar template', type: 'error' });
    }
  });

  // Use template mutation
  const useMutation = useMutation({
    mutationFn: ({ id, variables }: { id: number; variables: Record<string, string> }) =>
      templateApi.useTemplate(id, variables),
    onSuccess: (data) => {
      // Copy to clipboard
      navigator.clipboard.writeText(data.content);
      toast({ title: 'Template copiado para a área de transferência!', type: 'success' });
    },
    onError: () => {
      toast({ title: 'Erro ao usar template', type: 'error' });
    }
  });

  const handleCreateOrUpdate = (data: CreateTemplateInput | UpdateTemplateInput) => {
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, data: data as UpdateTemplateInput });
    } else {
      createMutation.mutate(data as CreateTemplateInput);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MessageSquareText className="h-8 w-8 mr-3 text-blue-600" />
            Templates de Resposta
          </h1>
          <p className="text-gray-600 mt-1">
            Crie e gerencie templates para respostas rápidas
          </p>
        </div>
        
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Templates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{templates.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <MessageSquareText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Favoritos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{favorites.length}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usos Totais</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {templates.reduce((sum, t) => sum + t.usage_count, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-2">
          <TemplateList
            templates={templates}
            loading={isLoading}
            onEdit={(template) => {
              setSelectedTemplate(template);
              setShowCreateModal(true);
            }}
            onDelete={(id) => deleteMutation.mutate(id)}
            onClone={(id, newName) => cloneMutation.mutate({ id, newName })}
            onUse={(id, variables) => useMutation.mutate({ id, variables })}
            onRefresh={() => refetch()}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ações Rápidas
            </h3>
            <button
              onClick={() => {
                setSelectedTemplate(null);
                setShowCreateModal(true);
              }}
              className="w-full mb-3 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </button>
            <button
              onClick={() => window.open('/api/v1/templates/export', '_blank')}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Exportar Templates
            </button>
          </div>

          {/* Most Used Templates */}
          {stats.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Mais Usados
              </h3>
              <div className="space-y-3">
                {stats.slice(0, 5).map((template) => (
                  <div key={template.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {template.name}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {template.usage_count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              💡 Dicas
            </h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• Use {`{{nome}}`} para criar variáveis dinâmicas</li>
              <li>• Crie atalhos como /welcome para acesso rápido</li>
              <li>• Organize templates por categoria</li>
              <li>• Templates mais usados aparecem primeiro</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <TemplateModal
          template={selectedTemplate || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
          onSave={handleCreateOrUpdate}
        />
      )}
    </div>
  );
}

// useToast hook is imported from @/hooks/useToast