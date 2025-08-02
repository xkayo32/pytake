import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  AlertCircle,
  Plus,
  Trash2,
  Variable,
  Hash,
  FileText,
  Tag
} from 'lucide-react';
import type { Template, TemplateVariable, CreateTemplateInput, UpdateTemplateInput } from '@/types/template';

interface TemplateModalProps {
  template?: Template;
  onClose: () => void;
  onSave: (data: CreateTemplateInput | UpdateTemplateInput) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  template,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    content: template?.content || '',
    category: template?.category || 'support',
    shortcut: template?.shortcut || '',
    language: template?.language || 'pt-BR',
    tags: template?.tags || []
  });

  const [variables, setVariables] = useState<TemplateVariable[]>(
    template?.variables || []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');

  const categories = [
    { value: 'greeting', label: 'Saudações', icon: '👋' },
    { value: 'support', label: 'Suporte', icon: '🛠️' },
    { value: 'sales', label: 'Vendas', icon: '💰' },
    { value: 'information', label: 'Informações', icon: 'ℹ️' },
    { value: 'farewell', label: 'Despedidas', icon: '👋' },
    { value: 'followup', label: 'Follow-up', icon: '📞' }
  ];

  const languages = [
    { value: 'pt-BR', label: 'Português (BR)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'es-ES', label: 'Español (ES)' }
  ];

  // Extract variables from content
  useEffect(() => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = Array.from(formData.content.matchAll(regex));
    const extractedVars = matches.map(match => match[1]);
    
    // Update variables list maintaining existing data
    const updatedVars = extractedVars.map(varName => {
      const existing = variables.find(v => v.name === varName);
      return existing || {
        name: varName,
        description: '',
        default_value: '',
        required: true
      };
    });

    setVariables(updatedVars);
  }, [formData.content]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Conteúdo é obrigatório';
    }

    if (formData.shortcut && !formData.shortcut.startsWith('/')) {
      newErrors.shortcut = 'Atalho deve começar com /';
    }

    if (formData.shortcut && !/^\/[a-zA-Z0-9_]+$/.test(formData.shortcut)) {
      newErrors.shortcut = 'Atalho pode conter apenas letras, números e underscore';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data = {
      name: formData.name,
      content: formData.content,
      category: formData.category,
      shortcut: formData.shortcut || undefined,
      language: formData.language,
      variables: variables.length > 0 ? variables : undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined
    };

    onSave(data);
  };

  const updateVariable = (index: number, field: keyof TemplateVariable, value: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {template ? 'Editar Template' : 'Novo Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Nome do Template
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  placeholder="Ex: Boas-vindas"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Hash className="h-4 w-4 inline mr-1" />
                  Atalho (opcional)
                </label>
                <input
                  type="text"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.shortcut ? 'border-red-500' : ''
                  }`}
                  placeholder="Ex: /welcome"
                />
                {errors.shortcut && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.shortcut}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Idioma
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {languages.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conteúdo
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.content ? 'border-red-500' : ''
                }`}
                rows={6}
                placeholder="Digite o conteúdo do template. Use {{nome_variavel}} para adicionar variáveis."
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.content}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Dica: Use {`{{nome}}`} para criar variáveis que serão substituídas ao usar o template
              </p>
            </div>

            {/* Variables */}
            {variables.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Variable className="h-4 w-4 mr-1" />
                  Variáveis Detectadas
                </h3>
                <div className="space-y-3">
                  {variables.map((variable, index) => (
                    <div key={variable.name} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{`{{${variable.name}}}`}</span>
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={variable.required}
                            onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                            className="mr-1"
                          />
                          Obrigatória
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={variable.description}
                          onChange={(e) => updateVariable(index, 'description', e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                          placeholder="Descrição"
                        />
                        <input
                          type="text"
                          value={variable.default_value || ''}
                          onChange={(e) => updateVariable(index, 'default_value', e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                          placeholder="Valor padrão (opcional)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Tag className="h-4 w-4 inline mr-1" />
                Tags (opcional)
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Adicionar tag..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {template ? 'Salvar Alterações' : 'Criar Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;