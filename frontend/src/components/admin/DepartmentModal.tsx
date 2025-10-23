"use client";

import { useState } from 'react';
import { Modal, ModalActions } from './Modal';
import { ActionButton } from './ActionButton';
import { Building2, Palette, AlertCircle } from 'lucide-react';
import type { DepartmentCreate, DepartmentUpdate } from '@/types/department';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // aceitar tanto criação quanto atualização para compatibilidade com os handlers
  onSubmit: (data: DepartmentCreate | DepartmentUpdate) => Promise<void>;
  initialData?: Partial<DepartmentCreate | DepartmentUpdate>;
  mode?: 'create' | 'edit';
}

export interface DepartmentFormData {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  is_active: boolean;
}

const COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#06B6D4', // cyan
  '#6366F1', // indigo
];

const ICONS = [
  { value: 'users', label: 'Usuários', icon: '👥' },
  { value: 'headset', label: 'Suporte', icon: '🎧' },
  { value: 'shopping', label: 'Vendas', icon: '🛍️' },
  { value: 'tools', label: 'Técnico', icon: '🔧' },
  { value: 'money', label: 'Financeiro', icon: '💰' },
  { value: 'chart', label: 'Comercial', icon: '📊' },
  { value: 'shield', label: 'Segurança', icon: '🛡️' },
  { value: 'star', label: 'Premium', icon: '⭐' },
];

export function DepartmentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: DepartmentModalProps) {
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    color: initialData?.color || '#3B82F6',
    icon: initialData?.icon || 'users',
    is_active: initialData?.is_active ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof DepartmentFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        icon: 'users',
        is_active: true,
      });
      setErrors({});
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao salvar departamento:', error);
      setErrors({ submit: 'Erro ao salvar departamento. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Criar Departamento' : 'Editar Departamento'}
      description={mode === 'create' ? 'Configure um novo departamento de atendimento' : 'Atualize as configurações do departamento'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Informações Básicas
            </h3>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Departamento *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                    errors.name
                      ? 'border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="Suporte Técnico"
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white resize-none"
                  placeholder="Atendimento para questões técnicas e suporte ao produto"
                />
              </div>

              {/* Ativo */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 dark:focus:ring-white"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  Departamento ativo (visível na organização)
                </label>
              </div>
            </div>
          </div>

          {/* Personalização Visual */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Personalização Visual
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cor
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleChange('color', color)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color
                          ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Ícone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ícone
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ICONS.map((iconOption) => (
                    <button
                      key={iconOption.value}
                      type="button"
                      onClick={() => handleChange('icon', iconOption.value)}
                      className={`p-2 border-2 rounded-lg text-center transition-all ${
                        formData.icon === iconOption.value
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-900'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      title={iconOption.label}
                    >
                      <span className="text-xl">{iconOption.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: formData.color + '20', color: formData.color }}>
                <span className="text-lg">{ICONS.find(i => i.value === formData.icon)?.icon}</span>
                <span className="font-medium">{formData.name || 'Nome do Departamento'}</span>
              </div>
            </div>
          </div>

          {/* Somente informações do departamento: não incluir configurações de filas aqui */}

          {/* Erro de submissão */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}
        </div>

        <ModalActions>
          <ActionButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </ActionButton>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Departamento' : 'Salvar Alterações'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}
