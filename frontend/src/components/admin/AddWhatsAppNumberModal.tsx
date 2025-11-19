'use client';

import { useState, useEffect } from 'react';
import { whatsappAPI, WhatsAppNumberCreate } from '@/lib/api/whatsapp';
import { X, Loader2, Phone, Building2, Key, Webhook, Info, Copy, RefreshCw, Shield, Eye, EyeOff } from 'lucide-react';
import { countries, defaultCountry, Country } from '@/lib/countries';
import { generateWebhookVerifyToken } from '@/lib/utils/crypto';
import { WhatsAppTokenModal } from './WhatsAppTokenModal';

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
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  // Webhook URL padrão
  const getDefaultWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/v1/whatsapp/webhook`;
    }
    return 'https://api.pytake.net/api/v1/whatsapp/webhook';
  };
  const [webhookUrl, setWebhookUrl] = useState(getDefaultWebhookUrl());

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
      // Validações
      const fullPhoneNumber = `${selectedCountry.phoneCode}${phoneNumber}`;

      if (!phoneNumber) {
        throw new Error('Número de telefone é obrigatório');
      }

      if (phoneNumber.length < 8) {
        throw new Error('Número de telefone muito curto');
      }

      if (!phoneNumberId.trim()) {
        throw new Error('Phone Number ID é obrigatório');
      }

      if (!businessAccountId.trim()) {
        throw new Error('Business Account ID é obrigatório');
      }

      if (!accessToken.trim()) {
        throw new Error('Access Token é obrigatório');
      }

      const data: WhatsAppNumberCreate = {
        phone_number: fullPhoneNumber,
        display_name: displayName || undefined,
        connection_type: 'official',
        phone_number_id: phoneNumberId,
        whatsapp_business_account_id: businessAccountId,
        access_token: accessToken,
        app_secret: appSecret || undefined,
        webhook_url: webhookUrl,
        webhook_verify_token: webhookVerifyToken,
      };

      const response = await whatsappAPI.create(data);
      
      // Salvar dados para exibir no modal de sucesso
      setSuccessData(response);
      setShowTokenModal(true);

      // Reset form
      setPhoneNumber('');
      setDisplayName('');
      setPhoneNumberId('');
      setBusinessAccountId('');
      setAccessToken('');
      setAppSecret('');
      setSelectedCountry(defaultCountry);
      setWebhookUrl(getDefaultWebhookUrl());
      setWebhookVerifyToken('');

      // Chamar callback depois de um delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
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
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Nova Configuração WhatsApp
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
            </div>

            {/* Meta Cloud API Credentials */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Key className="h-4 w-4" />
                Credenciais da Meta Cloud API
              </h3>

              {/* Phone Number ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="574293335763643"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  ID do número de telefone fornecido pela Meta
                </p>
              </div>

              {/* Business Account ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Account ID *
                </label>
                <input
                  type="text"
                  required
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  placeholder="574293335763643"
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  ID da conta comercial do WhatsApp
                </p>
              </div>

              {/* Access Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Access Token (Permanente) *
                </label>
                <div className="relative">
                  <input
                    type={showAccessToken ? 'text' : 'password'}
                    required
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAUZBn..."
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Token de acesso permanente (System User Token)
                </p>
              </div>

              {/* App Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    App Secret
                  </div>
                </label>
                <div className="relative">
                  <input
                    type={showAppSecret ? 'text' : 'password'}
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppSecret(!showAppSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showAppSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  🔐 Obrigatório para segurança do webhook
                </p>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Configuração do Webhook
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
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
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
              </div>

              {/* Verify Token */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Verify Token *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookVerifyToken}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm text-gray-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookVerifyToken, 'token')}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    {copiedField === 'token' ? (
                      <>✓</>
                    ) : (
                      <Copy className="h-4 w-4" />
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
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Token Success Modal */}
      {successData && (
        <WhatsAppTokenModal
          isOpen={showTokenModal}
          onClose={() => {
            setShowTokenModal(false);
            setSuccessData(null);
          }}
          token={successData.webhook_verify_token}
          webhookUrl={successData.webhook_url}
          phoneNumber={successData.phone_number}
          displayName={successData.display_name}
        />
      )}
    </>
  );
}
