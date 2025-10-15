'use client';

import { useState } from 'react';
import { Modal, ModalActions } from './Modal';
import { ActionButton } from './ActionButton';
import { Phone, Mail, Building2, User, MapPin, FileText } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => Promise<void>;
  initialData?: Partial<ContactFormData>;
  mode?: 'create' | 'edit';
}

export interface ContactFormData {
  name: string;
  whatsapp_id: string;
  email?: string;
  phone_number?: string;
  company?: string;
  job_title?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
  address_country?: string;
  notes?: string;
}

export function ContactModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: ContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: initialData?.name || '',
    whatsapp_id: initialData?.whatsapp_id || '',
    email: initialData?.email || '',
    phone_number: initialData?.phone_number || '',
    company: initialData?.company || '',
    job_title: initialData?.job_title || '',
    address_street: initialData?.address_street || '',
    address_city: initialData?.address_city || '',
    address_state: initialData?.address_state || '',
    address_postal_code: initialData?.address_postal_code || '',
    address_country: initialData?.address_country || 'Brasil',
    notes: initialData?.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof ContactFormData, value: string) => {
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

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.whatsapp_id.trim()) {
      newErrors.whatsapp_id = 'Número do WhatsApp é obrigatório';
    } else if (!/^\+?\d{10,15}$/.test(formData.whatsapp_id.replace(/\s/g, ''))) {
      newErrors.whatsapp_id = 'Número inválido (ex: +5511999999999)';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
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
        name: '',
        whatsapp_id: '',
        email: '',
        phone_number: '',
        company: '',
        job_title: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_postal_code: '',
        address_country: 'Brasil',
        notes: '',
      });
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      setErrors({ submit: 'Erro ao salvar contato. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Adicionar Contato' : 'Editar Contato'}
      description="Preencha as informações do contato abaixo"
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
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
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
                  placeholder="João Silva"
                />
                {errors.name && (
                  <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.whatsapp_id}
                    onChange={(e) => handleChange('whatsapp_id', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                      errors.whatsapp_id
                        ? 'border-red-500'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    placeholder="+5511999999999"
                  />
                </div>
                {errors.whatsapp_id && (
                  <p className="text-xs text-red-600 mt-1">{errors.whatsapp_id}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white ${
                      errors.email
                        ? 'border-red-500'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    placeholder="joao@exemplo.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Telefone Adicional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefone Adicional
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => handleChange('phone_number', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                    placeholder="(11) 3333-4444"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Informações Profissionais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Informações Profissionais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                  placeholder="Empresa LTDA"
                />
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cargo
                </label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => handleChange('job_title', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                  placeholder="Gerente de Vendas"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {/* Rua */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rua
                </label>
                <input
                  type="text"
                  value={formData.address_street}
                  onChange={(e) => handleChange('address_street', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                  placeholder="Av. Paulista, 1000"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.address_city}
                    onChange={(e) => handleChange('address_city', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                    placeholder="São Paulo"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.address_state}
                    onChange={(e) => handleChange('address_state', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                    placeholder="SP"
                  />
                </div>

                {/* CEP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.address_postal_code}
                    onChange={(e) => handleChange('address_postal_code', e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                    placeholder="01310-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notas
            </h3>

            <div>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white resize-none"
                placeholder="Observações sobre o contato..."
              />
            </div>
          </div>

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
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Adicionar Contato' : 'Salvar Alterações'}
          </ActionButton>
        </ModalActions>
      </form>
    </Modal>
  );
}
