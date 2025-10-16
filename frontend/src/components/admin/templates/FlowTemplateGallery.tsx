/**
 * FlowTemplateGallery - Main gallery component for browsing and importing flow templates
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Library,
  ChevronRight,
  Grid3x3,
} from 'lucide-react';
import { templatesAPI } from '@/lib/api';
import { useToast } from '@/store/notificationStore';
import type {
  FlowTemplate,
  TemplateCategory,
  TemplateComplexity,
  TemplateFilters,
} from '@/types/template';
import TemplateCard from './TemplateCard';
import TemplateDetailModal from './TemplateDetailModal';

interface FlowTemplateGalleryProps {
  chatbotId: string;
  onClose: () => void;
  onImportSuccess: (flowId: string) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function FlowTemplateGallery({
  chatbotId,
  onClose,
  onImportSuccess,
}: FlowTemplateGalleryProps) {
  const toast = useToast();

  // State
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState<TemplateComplexity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load templates when filters change
  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, selectedComplexity, debouncedSearch]);

  const loadCategories = async () => {
    try {
      const data = await templatesAPI.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Error loading categories:', err);
      toast.error('Erro ao carregar categorias');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      setError(null);

      const filters: TemplateFilters = {
        category: selectedCategory || undefined,
        complexity: selectedComplexity || undefined,
        search: debouncedSearch || undefined,
      };

      const response = debouncedSearch
        ? await templatesAPI.search(debouncedSearch, filters)
        : await templatesAPI.list(filters);

      setTemplates(response.items);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Erro ao carregar templates');
      toast.error('Erro ao carregar templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleImportTemplate = async (template: FlowTemplate, flowName?: string) => {
    try {
      const result = await templatesAPI.import(template.id, {
        chatbot_id: chatbotId,
        flow_name: flowName || template.name,
        set_as_main: false,
      });

      toast.success(`Template "${result.flow_name}" importado com sucesso!`);
      setSelectedTemplate(null);
      onClose();
      onImportSuccess(result.flow_id);
    } catch (err: any) {
      console.error('Error importing template:', err);
      toast.error(err.response?.data?.detail || 'Erro ao importar template');
      throw err;
    }
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedComplexity(null);
    setSearchQuery('');
  };

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) + (selectedComplexity ? 1 : 0) + (debouncedSearch ? 1 : 0);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando galeria...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex bg-white dark:bg-gray-900">
        {/* Sidebar - Categories */}
        <div className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Library className="w-5 h-5" />
                Categorias
              </h3>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* All Templates */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors mb-2 ${
                !selectedCategory
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Grid3x3 className="w-5 h-5" />
                <span className="font-medium">Todos os Templates</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Category List */}
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium">{category.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {category.template_count} templates
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Galeria de Templates
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Escolha um template pronto para acelerar seu desenvolvimento
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar templates..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Filtros Ativos
                  </h4>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                    >
                      Limpar tudo
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Complexity Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Complexidade
                    </label>
                    <div className="flex gap-2">
                      {(['simple', 'medium', 'complex'] as const).map((complexity) => (
                        <button
                          key={complexity}
                          onClick={() =>
                            setSelectedComplexity(
                              selectedComplexity === complexity ? null : complexity
                            )
                          }
                          className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                            selectedComplexity === complexity
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {complexity === 'simple' && 'Simples'}
                          {complexity === 'medium' && 'Médio'}
                          {complexity === 'complex' && 'Complexo'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <button
                  onClick={loadTemplates}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Library className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Nenhum template encontrado
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Tente ajustar os filtros ou busca
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => setSelectedTemplate(template)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onImport={(flowName) => handleImportTemplate(selectedTemplate, flowName)}
        />
      )}
    </>
  );
}
