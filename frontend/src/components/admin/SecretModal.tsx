'use client';

import { useState, useEffect } from 'react';
import { SecretModalProps, SecretScope, EncryptionProvider } from '@/types/secret';
import { secretsAPI } from '@/lib/api/secrets';
import { X, Key, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

/**
 * SecretModal Component
 *
 * Modal for creating or editing encrypted secrets
 * Used in admin dashboard to manage API keys, passwords, etc.
 */
export default function SecretModal({
  isOpen,
  onClose,
  onSuccess,
  secret,
  chatbot_id,
}: SecretModalProps) {
  const isEditing = !!secret;

  // Form state
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<SecretScope>(SecretScope.ORGANIZATION);
  const [encryptionProvider, setEncryptionProvider] = useState<EncryptionProvider>(
    EncryptionProvider.FERNET
  );
  const [showValue, setShowValue] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or secret changes
  useEffect(() => {
    if (isOpen) {
      if (secret) {
        // Editing existing secret
        setName(secret.name);
        setDisplayName(secret.display_name);
        setDescription(secret.description || '');
        setScope(secret.scope);
        setEncryptionProvider(secret.encryption_provider);
        setValue(''); // Never pre-fill password for security
      } else {
        // Creating new secret
        resetForm();
        if (chatbot_id) {
          setScope(SecretScope.CHATBOT);
        }
      }
      setError(null);
    }
  }, [isOpen, secret, chatbot_id]);

  const resetForm = () => {
    setName('');
    setDisplayName('');
    setValue('');
    setDescription('');
    setScope(SecretScope.ORGANIZATION);
    setEncryptionProvider(EncryptionProvider.FERNET);
    setShowValue(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError('Nome de exibição é obrigatório');
      return;
    }

    if (!isEditing && !value.trim()) {
      setError('Valor do secret é obrigatório');
      return;
    }

    if (!isEditing && !name.trim()) {
      setError('Nome interno é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isEditing && secret) {
        // Update existing secret
        await secretsAPI.update(secret.id, {
          display_name: displayName,
          description: description || undefined,
          value: value.trim() || undefined, // Only update if provided
        });
      } else {
        // Create new secret
        await secretsAPI.create({
          name: name.trim(),
          display_name: displayName.trim(),
          value: value.trim(),
          description: description.trim() || undefined,
          scope,
          chatbot_id: scope === SecretScope.CHATBOT ? chatbot_id : undefined,
          encryption_provider: encryptionProvider,
        });
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('Failed to save secret:', err);
      setError(
        err.response?.data?.error?.message ||
          `Erro ao ${isEditing ? 'atualizar' : 'criar'} secret`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Key className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Editar Secret' : 'Novo Secret'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEditing
                  ? 'Atualizar informações do secret'
                  : 'Criar um novo secret criptografado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome de Exibição *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: OpenAI API Key - Production"
              required
              disabled={loading}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Nome amigável para identificar o secret
            </p>
          </div>

          {/* Internal Name (only when creating) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Interno *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="Ex: openai_api_key_prod"
                required
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Identificador único (snake_case, somente letras minúsculas, números e underscore)
              </p>
            </div>
          )}

          {/* Secret Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Valor do Secret {!isEditing && '*'}
            </label>
            <div className="relative">
              <input
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={isEditing ? 'Deixe vazio para manter o valor atual' : 'Cole aqui a chave, senha ou token'}
                required={!isEditing}
                disabled={loading}
                className="w-full pl-4 pr-12 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {showValue ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {isEditing
                ? 'Valor nunca é exibido por segurança. Preencha apenas se quiser alterar.'
                : 'Este valor será criptografado e nunca poderá ser visualizado novamente'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição sobre o uso deste secret..."
              rows={3}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 resize-none"
            />
          </div>

          {/* Scope (only when creating) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Escopo *
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as SecretScope)}
                disabled={loading || !!chatbot_id}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              >
                <option value={SecretScope.ORGANIZATION}>
                  Organização (disponível em toda a organização)
                </option>
                <option value={SecretScope.CHATBOT}>
                  Chatbot (específico para um chatbot)
                </option>
              </select>
            </div>
          )}

          {/* Encryption Provider (only when creating) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider de Criptografia
              </label>
              <select
                value={encryptionProvider}
                onChange={(e) => setEncryptionProvider(e.target.value as EncryptionProvider)}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              >
                <option value={EncryptionProvider.FERNET}>
                  Fernet (Interno - Recomendado)
                </option>
                <option value={EncryptionProvider.AWS_KMS} disabled>
                  AWS KMS (Em breve)
                </option>
                <option value={EncryptionProvider.VAULT} disabled>
                  HashiCorp Vault (Em breve)
                </option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Método de criptografia utilizado para proteger o secret
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Atualizar' : 'Criar Secret'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
