'use client';

import { useState } from 'react';
import { Copy, Check, X, ExternalLink } from 'lucide-react';

interface WhatsAppTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  webhookUrl: string;
  displayName?: string;
  phoneNumber?: string;
}

export function WhatsAppTokenModal({
  isOpen,
  onClose,
  token,
  webhookUrl,
  displayName,
  phoneNumber,
}: WhatsAppTokenModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Número WhatsApp Cadastrado! 🎉
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Salve estes dados para configurar no Meta Developers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Número Cadastrado */}
          {phoneNumber && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                📱 Número Cadastrado
              </p>
              <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                {phoneNumber}
              </p>
              {displayName && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Nome: {displayName}
                </p>
              )}
            </div>
          )}

          {/* Webhook URL */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              🔗 Webhook URL (Callback URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-gray-900 dark:text-white"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'webhook_url')}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {copiedField === 'webhook_url' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cole este URL no campo "Callback URL" no Meta for Developers
            </p>
          </div>

          {/* Webhook Verify Token */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              🔐 Webhook Verify Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={token}
                readOnly
                className="flex-1 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg font-mono text-sm text-gray-900 dark:text-white"
              />
              <button
                onClick={() => copyToClipboard(token, 'verify_token')}
                className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {copiedField === 'verify_token' ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cole este token no campo "Verify Token" no Meta for Developers
            </p>
          </div>

          {/* Passo a Passo */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">
              📋 Próximos Passos no Meta
            </h3>
            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0">1.</span>
                <span>Acesse: <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs">developers.facebook.com</code></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0">2.</span>
                <span>Selecione seu App WhatsApp Business</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0">3.</span>
                <span>Menu → WhatsApp → Configuration</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0">4.</span>
                <span>Na seção "Webhooks", clique em "Edit Callback URL"</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0">5.</span>
                <span>Cole a URL e o Token copiados acima</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0">6.</span>
                <span>Clique "Verify and Save"</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold flex-shrink-0">7.</span>
                <span>Inscreva-se nos eventos: messages, message_status</span>
              </li>
            </ol>
          </div>

          {/* Documentation Link */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <p className="text-sm text-purple-800 dark:text-purple-200 flex items-center gap-2">
              <span>💡 Precisa de ajuda?</span>
              <a
                href="https://github.com/xkayo32/pytake/blob/develop/WEBHOOK_WHATSAPP.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                Ver Documentação <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* Warning */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-xs text-red-800 dark:text-red-200">
              ⚠️ <strong>Importante:</strong> Salve estes dados em local seguro. O token será necessário se precisar reconfigura o webhook.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            ✅ Entendi, Vamos Lá!
          </button>
        </div>
      </div>
    </div>
  );
}
