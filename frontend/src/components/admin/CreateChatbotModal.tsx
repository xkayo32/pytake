'use client';

import { useState, useEffect } from 'react';
import { X, Bot, Loader2, Phone } from 'lucide-react';
import { chatbotsAPI } from '@/lib/api/chatbots';
import { api } from '@/lib/api';
import type { ChatbotCreate } from '@/types/chatbot';

interface CreateChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface WhatsAppNumber {
  id: string;
  phone_number: string;
  display_name?: string;
  is_active: boolean;
}

export function CreateChatbotModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateChatbotModalProps) {
  const [formData, setFormData] = useState<ChatbotCreate>({
    name: '',
    description: '',
    whatsapp_number_id: undefined,
    is_active: false,
    is_published: false,
    global_variables: {},
    settings: {
      welcome_message: 'Olá! Como posso ajudar você hoje?',
      fallback_message: 'Desculpe, não entendi. Pode reformular?',
      handoff_message: 'Transferindo para um atendente humano...',
    },
  });

  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load WhatsApp numbers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadWhatsAppNumbers();
    }
  }, [isOpen]);

  const loadWhatsAppNumbers = async () => {
    try {
      setLoadingNumbers(true);
      const response = await api.get<WhatsAppNumber[]>('/whatsapp/');
      // Filter only active numbers
      const activeNumbers = response.data.filter(n => n.is_active);
      setWhatsappNumbers(activeNumbers);
    } catch (error) {
      console.error('Erro ao carregar números WhatsApp:', error);
      setWhatsappNumbers([]);
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Nome do chatbot é obrigatório');
      return;
    }

    try {
      setIsSubmitting(true);
      await chatbotsAPI.create(formData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        is_active: false,
        is_published: false,
        global_variables: {},
        settings: {
          welcome_message: 'Olá! Como posso ajudar você hoje?',
          fallback_message: 'Desculpe, não entendi. Pode reformular?',
          handoff_message: 'Transferindo para um atendente humano...',
        },
      });
    } catch (err: any) {
      console.error('Erro ao criar chatbot:', err);
      setError(
        err.response?.data?.detail || 'Erro ao criar chatbot. Tente novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Criar Novo Chatbot
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure seu assistente virtual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Nome */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nome do Chatbot *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Ex: Atendimento Inicial"
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          {/* Descrição */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva o propósito deste chatbot..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Número WhatsApp */}
          <div>
            <label
              htmlFor="whatsapp_number_id"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Número WhatsApp
            </label>
            {loadingNumbers ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Carregando números...</span>
              </div>
            ) : whatsappNumbers.length === 0 ? (
              <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Nenhum número WhatsApp ativo encontrado.{' '}
                  <a
                    href="/admin/whatsapp"
                    className="underline hover:no-underline font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/admin/whatsapp', '_blank');
                    }}
                  >
                    Cadastre um número primeiro
                  </a>
                </p>
              </div>
            ) : (
              <select
                id="whatsapp_number_id"
                value={formData.whatsapp_number_id || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    whatsapp_number_id: e.target.value || undefined,
                  }))
                }
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                <option value="">Nenhum (sem número WhatsApp)</option>
                {whatsappNumbers.map((number) => (
                  <option key={number.id} value={number.id}>
                    {number.display_name || number.phone_number} ({number.phone_number})
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Opcional: Escolha o número WhatsApp que este chatbot irá utilizar
            </p>
          </div>

          {/* Mensagem de Boas-Vindas */}
          <div>
            <label
              htmlFor="welcome_message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Mensagem de Boas-Vindas
            </label>
            <textarea
              id="welcome_message"
              value={formData.settings?.welcome_message || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    welcome_message: e.target.value,
                  },
                }))
              }
              rows={2}
              placeholder="Mensagem inicial do bot..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Mensagem de Fallback */}
          <div>
            <label
              htmlFor="fallback_message"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Mensagem de Erro (Fallback)
            </label>
            <textarea
              id="fallback_message"
              value={formData.settings?.fallback_message || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    fallback_message: e.target.value,
                  },
                }))
              }
              rows={2}
              placeholder="Mensagem quando não entende..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-sm text-indigo-900 dark:text-indigo-100">
                <p className="font-medium mb-1">Próximos Passos</p>
                <p className="text-indigo-700 dark:text-indigo-300">
                  Após criar o chatbot, você será direcionado para o construtor
                  visual onde poderá criar os fluxos de conversa com drag-and-drop.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Bot className="w-5 h-5" />
                  Criar Chatbot
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
