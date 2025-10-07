import { useState } from 'react';
import { X, Copy, RefreshCw } from 'lucide-react';
import { whatsappAPI } from '@/lib/api';

interface AddWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Gerar token de verificação aleatório
const generateToken = () => {
  return Array.from({ length: 32 }, () =>
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]
  ).join('');
};

export default function AddWhatsAppModal({ isOpen, onClose, onSuccess }: AddWhatsAppModalProps) {
  const [connectionType, setConnectionType] = useState<'official' | 'qrcode'>('official');
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: generateToken(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const webhookUrl = `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}/api/v1/whatsapp/webhook`;

  if (!isOpen) return null;

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data: any = {
        phone_number: formData.phoneNumber,
        display_name: formData.displayName || undefined,
        connection_type: connectionType,
      };

      if (connectionType === 'official') {
        data.phone_number_id = formData.phoneNumberId;
        data.whatsapp_business_account_id = formData.businessAccountId;
        data.access_token = formData.accessToken;
        data.webhook_url = webhookUrl;
        data.webhook_verify_token = formData.webhookVerifyToken;
      }

      await whatsappAPI.create(data);

      onSuccess();
      onClose();

      // Reset form
      setFormData({
        displayName: '',
        phoneNumber: '',
        phoneNumberId: '',
        businessAccountId: '',
        accessToken: '',
        webhookVerifyToken: generateToken(),
      });
    } catch (err: any) {
      console.error('Erro ao adicionar número:', err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Erro ao adicionar número WhatsApp'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Adicionar Número WhatsApp</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Conexão
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConnectionType('official')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  connectionType === 'official'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold text-gray-900">API Oficial</div>
                <div className="text-xs text-gray-600 mt-1">Meta Cloud API</div>
              </button>
              <button
                type="button"
                onClick={() => setConnectionType('qrcode')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  connectionType === 'qrcode'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold text-gray-900">QR Code</div>
                <div className="text-xs text-gray-600 mt-1">Evolution API</div>
              </button>
            </div>
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome de Exibição *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Atendimento Principal"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Telefone *
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="5511999999999"
                required
              />
            </div>
          </div>

          {connectionType === 'official' && (
            <>
              {/* Meta API Fields */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-3">
                  Configuração da API do Meta
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number ID *
                  </label>
                  <input
                    type="text"
                    value={formData.phoneNumberId}
                    onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="123456789012345"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Account ID *
                  </label>
                  <input
                    type="text"
                    value={formData.businessAccountId}
                    onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="123456789012345"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token *
                  </label>
                  <input
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="EAAxxxx..."
                    required
                  />
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-3">
                  Configuração do Webhook
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(webhookUrl, 'webhook')}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {copiedField === 'webhook' ? '✓' : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verify Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.webhookVerifyToken}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(formData.webhookVerifyToken, 'token')}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {copiedField === 'token' ? '✓' : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, webhookVerifyToken: generateToken() })}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use este token ao configurar o webhook no Meta Developer Portal
                  </p>
                </div>
              </div>
            </>
          )}

          {connectionType === 'qrcode' && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>QR Code:</strong> Após salvar, você receberá um QR Code para escanear com seu WhatsApp.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Número'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
