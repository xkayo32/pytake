'use client';

import { useState } from 'react';
import { Modal, ModalActions } from './Modal';
import { ActionButton } from './ActionButton';
import { User, Mail, Shield, Crown, Eye, Users as UsersIcon, Briefcase, Phone } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: Partial<UserFormData>;
  mode?: 'create' | 'edit';
}

export interface UserFormData {
  email: string;
  full_name: string;
  phone?: string;
  role: 'super_admin' | 'org_admin' | 'agent' | 'viewer';
  job_title?: string;
  department_ids?: string[];
  send_invite?: boolean;
}

export function UserModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: UserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: initialData?.email || '',
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    role: initialData?.role || 'agent',
    job_title: initialData?.job_title || '',
    department_ids: initialData?.department_ids || [],
    send_invite: initialData?.send_invite ?? true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof UserFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpar erro do campo ao editar
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

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório';
    }

    if (!formData.role) {
      newErrors.role = 'Função é obrigatória';
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
        email: '',
        full_name: '',
        phone: '',
        role: 'agent',
        job_title: '',
        department_ids: [],
        send_invite: true,
      });
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setErrors({ submit: 'Erro ao salvar usuário. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    {
      value: 'super_admin',
      label: 'Super Admin',
      description: 'Acesso total à plataforma',
      icon: Crown,
      color: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      value: 'org_admin',
      label: 'Administrador',
      description: 'Gerencia organização e usuários',
      icon: Shield,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      value: 'agent',
      label: 'Agente',
      description: 'Atende clientes e conversas',
      icon: UsersIcon,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      value: 'viewer',
      label: 'Visualizador',
      description: 'Apenas visualização',
      icon: Eye,
      color: 'text-gray-600 dark:text-gray-400',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Adicionar Usuário' : 'Editar Usuário'}
      description={mode === 'create' ? 'Preencha as informações para criar um novo usuário' : 'Atualize as informações do usuário'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4" />
              Informações Básicas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className={`w-full px-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                    errors.full_name
                      ? 'border-red-500'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="João Silva"
                />
                {errors.full_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    disabled={mode === 'edit'}
                    className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                      errors.email
                        ? 'border-red-500'
                        : 'border-gray-200 dark:border-gray-700'
                    } ${mode === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="joao@empresa.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                )}
                {mode === 'edit' && (
                  <p className="text-xs text-gray-500 mt-1">Email não pode ser alterado</p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                    placeholder="+5511999999999"
                  />
                </div>
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cargo
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => handleChange('job_title', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                    placeholder="Atendente"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Função/Role */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Função e Permissões *
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roles.map((role) => {
                const Icon = role.icon;
                const isSelected = formData.role === role.value;

                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleChange('role', role.value)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-900'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 bg-gray-100 dark:bg-gray-800 rounded-lg ${isSelected ? 'ring-2 ring-gray-900 dark:ring-white' : ''}`}>
                        <Icon className={`w-5 h-5 ${role.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {role.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {role.description}
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
            {errors.role && (
              <p className="text-xs text-red-600">{errors.role}</p>
            )}
          </div>

          {/* Opções de Convite (apenas no modo create) */}
          {mode === 'create' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <input
                  type="checkbox"
                  id="send_invite"
                  checked={formData.send_invite}
                  onChange={(e) => handleChange('send_invite', e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 dark:focus:ring-white"
                />
                <label htmlFor="send_invite" className="flex-1 cursor-pointer">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Enviar email de convite
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    O usuário receberá um email com instruções para criar sua senha e acessar a plataforma
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Erro de submissão */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Adicionar Usuário' : 'Salvar Alterações'}
          </ActionButton>
        </ModalActions>
      </form>
    </Modal>
  );
}
