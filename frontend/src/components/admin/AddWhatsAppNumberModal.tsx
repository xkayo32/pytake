'use client';

import { useState, useEffect } from 'react';
import { whatsappAPI, WhatsAppNumberCreate } from '@/lib/api/whatsapp';
import { X, Loader2, Copy, RefreshCw, Eye, EyeOff, Info } from 'lucide-react';
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
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  const getDefaultWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/v1/whatsapp/webhook`;
    }
    return 'https://api.pytake.net/api/v1/whatsapp/webhook';
  };
  const [webhookUrl, setWebhookUrl] = useState(getDefaultWebhookUrl());

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

      await whatsappAPI.create(data);
      
      setPhoneNumber('');
      setDisplayName('');
      setPhoneNumberId('');
      setBusinessAccountId('');
      setAccessToken('');
      setAppSecret('');
      setSelectedCountry(defaultCountry);
      setWebhookUrl(getDefaultWebhookUrl());
      setWebhookVerifyToken('');

      onSuccess();
      onClose();
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header - Verde como na página de settings */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 z-10 rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Adicionar Número WhatsApp
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Configure um novo número WhatsApp Business
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
          )}

          {/* Info Box - Verde como na página */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900 dark:text-green-300">
              <p className="font-medium">Configure seu número no{' '}
                <a
                  href="https://developers.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline font-semibold"
                >
                  Meta for Developers
                </a>
                {' '}antes de adicionar aqui.</p>
            </div>
          </div>

          {/* Step 1: Phone Number */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900 dark:text-white">
              1. Número de Telefone
            </label>
            <div className="flex gap-2">
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const country = countries.find(c => c.code === e.target.value);
                  if (country) setSelectedCountry(country);
                }}
                className="w-40 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent text-slate-900 dark:text-white text-sm"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name} {country.phoneCode}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="11999999999"
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm"
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Completo: <span className="font-mono font-medium">{selectedCountry.phoneCode}{phoneNumber || 'XXXXXXXXXXX'}</span>
            </p>
          </div>

          {/* Step 2: Display Name */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900 dark:text-white">
              2. Identificação (Opcional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Minha Empresa - Atendimento"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm"
            />
            <p className="text-xs text-slate-600 dark:text-slate-400">Nome para identificar este número</p>
          </div>

          {/* Step 3: Meta Credentials */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900 dark:text-white">
              3. Credenciais da Meta
            </label>
            <div className="space-y-3">
              {/* Phone Number ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="574293335763643"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 font-mono text-xs"
                />
              </div>

              {/* Business Account ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Business Account ID *
                </label>
                <input
                  type="text"
                  required
                  value={businessAccountId}
                  onChange={(e) => setBusinessAccountId(e.target.value)}
                  placeholder="574293335763643"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 font-mono text-xs"
                />
              </div>

              {/* Access Token */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Access Token (Permanente) *
                </label>
                <div className="relative">
                  <input
                    type={showAccessToken ? 'text' : 'password'}
                    required
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAUZBn..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 font-mono text-xs pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showAccessToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* App Secret */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  App Secret
                </label>
                <div className="relative">
                  <input
                    type={showAppSecret ? 'text' : 'password'}
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400 font-mono text-xs pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppSecret(!showAppSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showAppSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Obrigatório para segurança do webhook</p>
              </div>
            </div>
          </div>

          {/* Step 4: Webhook */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900 dark:text-white">
              4. Webhook
            </label>
            <div className="space-y-3">
              {/* Webhook URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Callback URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookUrl, 'url')}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium"
                  >
                    {copiedField === 'url' ? '✓' : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Verify Token */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Verify Token *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookVerifyToken}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white font-mono cursor-text"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(webhookVerifyToken, 'token')}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg transition-colors text-xs font-medium"
                  >
                    {copiedField === 'token' ? '✓' : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    title="Gerar novo token"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-3 p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              '✓ Salvar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
