import React, { useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Hash,
  Eye,
  BarChart2,
  Filter,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TemplateModal } from './TemplateModal';
import { TemplatePreview } from './TemplatePreview';
import type { Template, TemplateFilters } from '@/types/template';

interface TemplateListProps {
  templates: Template[];
  loading?: boolean;
  onEdit: (template: Template) => void;
  onDelete: (id: number) => void;
  onClone: (id: number, newName: string) => void;
  onUse: (id: number, variables: Record<string, string>) => void;
  onRefresh: () => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  loading,
  onEdit,
  onDelete,
  onClone,
  onUse,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreview, setShowPreview] = useState<Template | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const categories = [
    { id: 'all', name: 'Todas', icon: '📋' },
    { id: 'greeting', name: 'Saudações', icon: '👋' },
    { id: 'support', name: 'Suporte', icon: '🛠️' },
    { id: 'sales', name: 'Vendas', icon: '💰' },
    { id: 'information', name: 'Informações', icon: 'ℹ️' },
    { id: 'farewell', name: 'Despedidas', icon: '👋' },
    { id: 'followup', name: 'Follow-up', icon: '📞' }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.shortcut && template.shortcut.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === '' || 
      selectedCategory === 'all' || 
      template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleClone = (template: Template) => {
    const newName = prompt(`Nome para o novo template (baseado em "${template.name}"):`);
    if (newName) {
      onClone(template.id, newName);
    }
  };

  const handleDelete = (template: Template) => {
    if (confirm(`Tem certeza que deseja excluir o template "${template.name}"?`)) {
      onDelete(template.id);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-200 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Templates de Resposta
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id === 'all' ? '' : category.id)}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (category.id === 'all' && selectedCategory === '') || selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Template List */}
      <div className="divide-y">
        {filteredTemplates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium mb-1">Nenhum template encontrado</p>
            <p className="text-sm">Tente ajustar os filtros ou criar um novo template</p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    {template.shortcut && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <Hash className="h-3 w-3 mr-1" />
                        {template.shortcut}
                      </span>
                    )}
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {categories.find(c => c.id === template.category)?.icon} {template.category}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {template.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <BarChart2 className="h-3 w-3 mr-1" />
                      {template.usage_count} usos
                    </span>
                    <span>
                      Atualizado {format(new Date(template.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {template.variables && template.variables.length > 0 && (
                      <span className="text-blue-600">
                        {template.variables.length} variáveis
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => setShowPreview(template)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit(template)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleClone(template)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreview(template);
                    }}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium flex items-center"
                    title="Usar template"
                  >
                    Usar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <TemplateModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            onRefresh();
          }}
        />
      )}

      {showPreview && (
        <TemplatePreview
          template={showPreview}
          onClose={() => {
            setShowPreview(null);
            setSelectedTemplate(null);
          }}
          onUse={selectedTemplate ? (variables) => {
            onUse(selectedTemplate.id, variables);
            setShowPreview(null);
            setSelectedTemplate(null);
          } : undefined}
        />
      )}
    </div>
  );
};

export default TemplateList;