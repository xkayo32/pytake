'use client';

import { useState, useEffect } from 'react';
import { whatsappAPI, WhatsAppNumberCreate } from '@/lib/api/whatsapp';
import { X, Loader2, Phone, Building2, Key, Webhook, Info, Copy, RefreshCw } from 'lucide-react';
import { countries, defaultCountry, Country } from '@/lib/countries';
import { generateWebhookVerifyToken } from '@/lib/utils/crypto';

interface AddWhatsAppNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddWhatsAppNumberModal({
  isOpen,
  onClose,
  onSuccess,
}: AddWhatsAppNumberModalProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Webhook URL padrão (backend)
  const webhookUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') + '/api/v1/whatsapp/webhook' ||
                     'https://api.pytake.net/api/v1/whatsapp/webhook';

  // Gerar token automaticamente ao abrir o modal
  useEffect(() => {
    if (isOpen && !webhookVerifyToken) {
      setWebhookVerifyToken(generateWebhookVerifyToken());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Montar número completo com código do país
      const fullPhoneNumber = `${selectedCountry.phoneCode}${phoneNumber}`;

      // Validações básicas
      if (!phoneNumber) {
        throw new Error('Número de telefone é obrigatório');
      }

      if (phoneNumber.length < 8) {
        throw new Error('Número de telefone muito curto');
      }

      const data: WhatsAppNumberCreate = {
        phone_number: fullPhoneNumber,
        display_name: displayName || undefined,
        connection_type: 'official',
        webhook_url: webhookUrl,
        webhook_verify_token: webhookVerifyToken,
      };

      await whatsappAPI.create(data);

      onSuccess();
      onClose();

      // Reset form
      setPhoneNumber('');
      setDisplayName('');
      setSelectedCountry(defaultCountry);
      setWebhookVerifyToken('');
    } catch (err: any) {
      console.error('Failed to create WhatsApp number:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Erro ao adicionar número WhatsApp'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRegenerateToken = () => {
    setWebhookVerifyToken(generateWebhookVerifyToken());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Adicionar Número WhatsApp
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure um novo número WhatsApp Business
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

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-300">
                <p className="font-medium mb-1">Meta Cloud API</p>
                <p className="text-blue-700 dark:text-blue-400">
                  Configure primeiro seu número no{' '}
                  <a
                    href="https://developers.facebook.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Meta for Developers
                  </a>
                  {' '}e depois adicione aqui.
                </p>
              </div>
            </div>
          </div>

          {/* Phone Number with Country Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de Telefone *
            </label>
            <div className="flex gap-2">
              {/* Country Selector */}
              <div className="w-48">
                <select
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const country = countries.find(c => c.code === e.target.value);
                    if (country) setSelectedCountry(country);
                  }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name} {country.phoneCode}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone Number Input */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="11999999999"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Número completo: {selectedCountry.phoneCode}{phoneNumber || 'XXXXXXXXXXX'}
            </p>
          </div>

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
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Minha Empresa - Atendimento"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Nome amigável para identificar este número internamente
            </p>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Configuração do Webhook (Meta)
            </h3>

            {/* Webhook URL */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Callback URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm text-gray-900 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(webhookUrl, 'url')}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  {copiedField === 'url' ? (
                    <>✓ Copiado</>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cole esta URL no campo "Callback URL" no Meta for Developers
              </p>
            </div>

            {/* Verify Token */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verify Token
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={webhookVerifyToken}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(webhookVerifyToken, 'token')}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  {copiedField === 'token' ? (
                    <>✓ Copiado</>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  title="Gerar novo token"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cole este token no campo "Verify Token" no Meta for Developers
              </p>
            </div>
          </div>

          {/* Meta Cloud API Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Passo a Passo - Configuração no Meta
            </h3>
            <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
              <li>Acesse o Meta for Developers e crie um App de WhatsApp Business</li>
              <li>Configure o número no painel do WhatsApp Business</li>
              <li>Vá em "Configuração" → "Webhook"</li>
              <li>Cole a <strong>Callback URL</strong> acima</li>
              <li>Cole o <strong>Verify Token</strong> acima</li>
              <li>Clique em "Verificar e Salvar"</li>
              <li>Inscreva-se nos eventos: messages, message_status</li>
            </ol>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Ver documentação completa →
            </a>
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
                  Adicionando...
                </>
              ) : (
                'Adicionar Número'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
