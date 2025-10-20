'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalActions } from './Modal';
import { ActionButton } from './ActionButton';
import {
  ListTodo,
  Palette,
  Clock,
  Settings,
  MessageSquare,
  AlertCircle,
  Zap,
} from 'lucide-react';
import type { QueueCreate, QueueUpdate, RoutingMode } from '@/types/queue';
import type { Department } from '@/types/department';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QueueCreate | QueueUpdate) => Promise<void>;
  departments: Department[];
  initialData?: Partial<QueueCreate>;
  mode?: 'create' | 'edit';
}

export interface QueueFormData {
  department_id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  is_active: boolean;
  priority: number;
  sla_minutes?: number;
  routing_mode: RoutingMode;
  auto_assign_conversations: boolean;
  max_conversations_per_agent: number;
}

const COLORS = [
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#F59E0B', // amber
  '#06B6D4', // cyan
  '#6366F1', // indigo
];

const ICONS = [
  { value: 'star', label: 'VIP', icon: '⭐' },
  { value: 'zap', label: 'Urgente', icon: '⚡' },
  { value: 'clock', label: 'Normal', icon: '⏰' },
  { value: 'tools', label: 'Técnico', icon: '🔧' },
  { value: 'shield', label: 'Premium', icon: '🛡️' },
  { value: 'fire', label: 'Hot', icon: '🔥' },
  { value: 'trophy', label: 'Prioridade', icon: '🏆' },
  { value: 'rocket', label: 'Express', icon: '🚀' },
];

export function QueueModal({
  isOpen,
  onClose,
  onSubmit,
  departments,
  initialData,
  mode = 'create',
}: QueueModalProps) {
  const [formData, setFormData] = useState<QueueFormData>({
    department_id: initialData?.department_id || '',
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    color: initialData?.color || '#10B981',
    icon: initialData?.icon || 'star',
    is_active: initialData?.is_active ?? true,
    priority: initialData?.priority ?? 50,
    sla_minutes: initialData?.sla_minutes,
    routing_mode: initialData?.routing_mode || 'round_robin',
    auto_assign_conversations: initialData?.auto_assign_conversations ?? true,
    max_conversations_per_agent: initialData?.max_conversations_per_agent || 10,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from name
  useEffect(() => {
    if (mode === 'create' && formData.name && !formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, mode]);

  const handleChange = (field: keyof QueueFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error
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

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug é obrigatório';
    }

    if (!formData.department_id) {
      newErrors.department_id = 'Departamento é obrigatório';
    }

    if (formData.priority < 0 || formData.priority > 100) {
      newErrors.priority = 'Prioridade deve estar entre 0 e 100';
    }

    if (formData.sla_minutes && formData.sla_minutes < 1) {
      newErrors.sla_minutes = 'SLA deve ser maior que 0';
    }

    if (formData.max_conversations_per_agent < 1 || formData.max_conversations_per_agent > 100) {
      newErrors.max_conversations_per_agent = 'Deve estar entre 1 e 100';
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
      // Reset form
      setFormData({
        department_id: '',
        name: '',
        slug: '',
        description: '',
        color: '#10B981',
        icon: 'star',
        is_active: true,
        priority: 50,
        sla_minutes: undefined,
        routing_mode: 'round_robin',
        auto_assign_conversations: true,
        max_conversations_per_agent: 10,
      });
    } catch (error) {
      console.error('Erro ao salvar fila:', error);
      setErrors({ submit: 'Erro ao salvar fila. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const routingModes = [
    {
      value: 'round_robin',
      label: 'Round Robin',
      description: 'Distribuição igualitária entre agentes',
      icon: '🔄',
    },
    {
      value: 'load_balance',
      label: 'Balanceamento',
      description: 'Prioriza agentes com menos conversas',
      icon: '⚖️',
    },
    {
      value: 'manual',
      label: 'Manual',
      description: 'Agentes pegam da fila manualmente',
      icon: '👆',
    },
    {
      value: 'skills_based',
      label: 'Por Habilidades',
      description: 'Requer habilidades específicas',
      icon: '🎯',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Criar Fila' : 'Editar Fila'}
      description={mode === 'create' ? 'Configure uma nova fila dentro de um departamento' : 'Atualize as configurações da fila'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              Informações Básicas
            </h3>

            <div className="space-y-4">
              {/* Departamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Departamento *
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => handleChange('department_id', e.target.value)}
                  disabled={mode === 'edit'}
                  className={`w-full px-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                    errors.department_id
                      ? 'border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                  } ${mode === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">Selecione um departamento</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {errors.department_id && (
                  <p className="text-xs text-red-600 mt-1">{errors.department_id}</p>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da Fila *
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
                  placeholder="Fila VIP"
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  className={`w-full px-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white font-mono ${
                    errors.slug
                      ? 'border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="fila-vip"
                />
                {errors.slug && (
                  <p className="text-xs text-red-600 mt-1">{errors.slug}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  URL amigável (apenas letras minúsculas, números e hífens)
                </p>
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
                  placeholder="Fila prioritária para clientes VIP e premium"
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
                  Fila ativa (aceita novas conversas)
                </label>
              </div>
            </div>
          </div>

          {/* Prioridade e SLA */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Prioridade e SLA
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prioridade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prioridade (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                    errors.priority
                      ? 'border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                />
                {errors.priority && (
                  <p className="text-xs text-red-600 mt-1">{errors.priority}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Maior valor = maior prioridade
                </p>
              </div>

              {/* SLA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SLA (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.sla_minutes || ''}
                  onChange={(e) => handleChange('sla_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                    errors.sla_minutes
                      ? 'border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="30"
                />
                {errors.sla_minutes && (
                  <p className="text-xs text-red-600 mt-1">{errors.sla_minutes}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Tempo máximo de espera (opcional)
                </p>
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
                <span className="font-medium">{formData.name || 'Nome da Fila'}</span>
                <span className="text-xs opacity-75">Prioridade: {formData.priority}</span>
              </div>
            </div>
          </div>

          {/* Configurações de Roteamento */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Roteamento de Conversas
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {routingModes.map((mode) => {
                const isSelected = formData.routing_mode === mode.value;

                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => handleChange('routing_mode', mode.value)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-900'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{mode.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {mode.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {mode.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-Assignment */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <input
                type="checkbox"
                id="auto_assign"
                checked={formData.auto_assign_conversations}
                onChange={(e) => handleChange('auto_assign_conversations', e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 dark:focus:ring-white"
              />
              <label htmlFor="auto_assign" className="flex-1 cursor-pointer">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Atribuir conversas automaticamente
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Conversas desta fila serão automaticamente distribuídas aos agentes
                </div>
              </label>
            </div>

            {/* Max conversations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Máximo de conversas por agente
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.max_conversations_per_agent}
                onChange={(e) => handleChange('max_conversations_per_agent', parseInt(e.target.value) || 10)}
                className={`w-full px-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                  errors.max_conversations_per_agent
                    ? 'border-red-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              />
              {errors.max_conversations_per_agent && (
                <p className="text-xs text-red-600 mt-1">{errors.max_conversations_per_agent}</p>
              )}
            </div>
          </div>

          {/* Submit Error */}
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
          <ActionButton
            variant="primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Fila' : 'Salvar Alterações'}
          </ActionButton>
        </ModalActions>
      </form>
    </Modal>
  );
}
