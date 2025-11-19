'use client';

import { useState } from 'react';
import { Copy, Check, X, ExternalLink, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header com Gradiente */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                ✅ Número WhatsApp Cadastrado!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
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
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800 dark:text-green-300">
                <p className="font-semibold mb-1">Configuração realizada com sucesso!</p>
                <p className="text-green-700 dark:text-green-400">Copie os dados abaixo e configure no Meta Developers.</p>
              </div>
            </div>
          </div>

          {/* Phone Number Summary */}
          {phoneNumber && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                📱 Número Cadastrado
              </p>
              <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                {phoneNumber}
              </p>
              {displayName && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <span className="text-gray-500 dark:text-gray-500">Nome:</span> {displayName}
                </p>
              )}
            </div>
          )}

          {/* Webhook URL */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              🔗 Callback URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm text-gray-900 dark:text-white cursor-text"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'webhook_url')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                {copiedField === 'webhook_url' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cole no campo "Callback URL" no Meta for Developers</p>
          </div>

          {/* Webhook Verify Token */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              🔐 Verify Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={token}
                readOnly
                className="flex-1 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg font-mono text-sm text-gray-900 dark:text-white cursor-text"
              />
              <button
                onClick={() => copyToClipboard(token, 'verify_token')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                {copiedField === 'verify_token' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cole no campo "Verify Token" no Meta for Developers</p>
          </div>

          {/* Step-by-Step Guide */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
              📋 Próximos Passos no Meta
            </h3>
            <ol className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0 w-5">1</span>
                <span>Acesse <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline font-medium">developers.facebook.com</a></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0 w-5">2</span>
                <span>Selecione seu App WhatsApp Business</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0 w-5">3</span>
                <span>Menu → <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">WhatsApp</code> → <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">Configuration</code></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0 w-5">4</span>
                <span>Na seção "Webhooks", clique em <strong>"Edit Callback URL"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0 w-5">5</span>
                <span>Cole a URL e o Token copiados acima</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0 w-5">6</span>
                <span>Clique <strong>"Verify and Save"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0 w-5">7</span>
                <span>Inscreva-se nos eventos: <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">messages</code>, <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono">message_status</code></span>
              </li>
            </ol>
          </div>

          {/* Important Note */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-xs text-red-800 dark:text-red-200">
              <strong>⚠️ Importante:</strong> Salve estes dados em local seguro. Você vai precisar deles se reconfigurar o webhook.
            </p>
          </div>

          {/* Help Link */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <a
              href="https://github.com/xkayo32/pytake/blob/develop/WEBHOOK_WHATSAPP.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 flex items-center gap-2 font-medium"
            >
              💡 Documentação Completa
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            ✅ Entendi, Vamos Lá!
          </button>
        </div>
      </div>
    </div>
  );
}
