'use client';

import { useState } from 'react';
import { whatsappAPI, WhatsAppNumberCreate } from '@/lib/api/whatsapp';
import { X, Loader2, Phone, Building2, Server, Key, QrCode, AlertCircle } from 'lucide-react';
import { countries, defaultCountry, Country } from '@/lib/countries';

interface AddWhatsAppQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddWhatsAppQRCodeModal({
  isOpen,
  onClose,
  onSuccess,
}: AddWhatsAppQRCodeModalProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Montar número completo com código do país
      const fullPhoneNumber = `${selectedCountry.phoneCode}${phoneNumber}`;

      // Validações
      if (!phoneNumber) {
        throw new Error('Número de telefone é obrigatório');
      }

      if (phoneNumber.length < 8) {
        throw new Error('Número de telefone muito curto');
      }

      if (!evolutionApiUrl) {
        throw new Error('URL da Evolution API é obrigatória');
      }

      if (!evolutionApiKey) {
        throw new Error('API Key da Evolution é obrigatória');
      }

      const data: WhatsAppNumberCreate = {
        phone_number: fullPhoneNumber,
        display_name: displayName || undefined,
        connection_type: 'qrcode',
        evolution_api_url: evolutionApiUrl,
        evolution_api_key: evolutionApiKey,
      };

      await whatsappAPI.create(data);

      onSuccess();
      onClose();

      // Reset form
      setPhoneNumber('');
      setDisplayName('');
      setSelectedCountry(defaultCountry);
      setEvolutionApiUrl('');
      setEvolutionApiKey('');
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

  // Preview do número completo
  const fullPhoneNumber = phoneNumber
    ? `${selectedCountry.phoneCode}${phoneNumber}`
    : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <QrCode className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Adicionar Número via QR Code
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Conecte usando Evolution API (Gratuito)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Alert Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Evolution API Required
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Você precisa de uma instância da Evolution API rodando. Acesse{' '}
                  <a
                    href="https://github.com/EvolutionAPI/evolution-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    GitHub
                  </a>{' '}
                  para instruções de instalação.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* País */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              País
            </label>
            <select
              value={selectedCountry.code}
              onChange={(e) => {
                const country = countries.find((c) => c.code === e.target.value);
                if (country) setSelectedCountry(country);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name} {country.phoneCode}
                </option>
              ))}
            </select>
          </div>

          {/* Número de Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Número de Telefone
            </label>
            <div className="space-y-2">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="11999999999"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              {fullPhoneNumber && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Número completo: <span className="font-mono font-semibold">{fullPhoneNumber}</span>
                </p>
              )}
            </div>
          </div>

          {/* Nome de Exibição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              Nome de Exibição (Opcional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Atendimento - Principal"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Evolution API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Server className="w-4 h-4 inline mr-1" />
              Evolution API URL
            </label>
            <input
              type="url"
              value={evolutionApiUrl}
              onChange={(e) => setEvolutionApiUrl(e.target.value)}
              placeholder="https://evolution.example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              URL base da sua instância Evolution API
            </p>
          </div>

          {/* Evolution API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Evolution API Key
            </label>
            <input
              type="password"
              value={evolutionApiKey}
              onChange={(e) => setEvolutionApiKey(e.target.value)}
              placeholder="sua-api-key-global"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              API Key global configurada na Evolution API
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  Adicionar e Gerar QR Code
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
