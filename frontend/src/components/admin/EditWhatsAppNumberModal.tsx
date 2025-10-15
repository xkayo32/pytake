'use client';

import { useState, useEffect } from 'react';
import { whatsappAPI, WhatsAppNumber, WhatsAppNumberUpdate } from '@/lib/api/whatsapp';
import { X, Loader2, Building2, Webhook, ToggleLeft, ToggleRight, MessageSquare, Shield } from 'lucide-react';

interface EditWhatsAppNumberModalProps {
  isOpen: boolean;
  number: WhatsAppNumber | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditWhatsAppNumberModal({
  isOpen,
  number,
  onClose,
  onSuccess,
}: EditWhatsAppNumberModalProps) {
  const [formData, setFormData] = useState<WhatsAppNumberUpdate>({
    display_name: '',
    webhook_url: '',
    app_secret: '',
    is_active: true,
    away_message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (number) {
      setFormData({
        display_name: number.display_name || '',
        webhook_url: number.webhook_url || '',
        app_secret: '', // Don't show existing app_secret for security
        is_active: number.is_active,
        away_message: number.away_message || '',
      });
    }
  }, [number]);

  if (!isOpen || !number) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await whatsappAPI.update(number.id, formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update WhatsApp number:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Erro ao atualizar número WhatsApp'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof WhatsAppNumberUpdate, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Editar Número WhatsApp
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {number.phone_number}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome de Exibição
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => handleChange('display_name', e.target.value)}
                placeholder="Minha Empresa - Atendimento"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL do Webhook
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Webhook className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => handleChange('webhook_url', e.target.value)}
                placeholder="https://api.pytake.net/api/v1/whatsapp/webhook"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* App Secret (only for Official API) */}
          {number.connection_type === 'official' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  App Secret (Meta for Developers)
                </div>
              </label>
              <input
                type="password"
                value={formData.app_secret}
                onChange={(e) => handleChange('app_secret', e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                🔐 <strong>Obrigatório para segurança do webhook.</strong> Encontre em: Meta for Developers → Settings → Basic → App Secret.
                {' '}Deixe em branco se não deseja alterar.
              </p>
            </div>
          )}

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Número Ativo
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Permitir que este número receba e envie mensagens
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('is_active', !formData.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_active ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Away Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mensagem de Ausência (Opcional)
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <MessageSquare className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                value={formData.away_message}
                onChange={(e) => handleChange('away_message', e.target.value)}
                placeholder="Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve."
                rows={3}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
