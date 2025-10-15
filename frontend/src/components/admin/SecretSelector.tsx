'use client';

import { useEffect, useState } from 'react';
import { SecretSelectorProps, Secret } from '@/types/secret';
import { secretsAPI } from '@/lib/api/secrets';
import { Key, Plus, AlertCircle, Loader2 } from 'lucide-react';

/**
 * SecretSelector Component
 *
 * Dropdown to select an encrypted secret (API key, password, etc.)
 * Used in chatbot builder and other forms that need secure credentials
 */
export default function SecretSelector({
  value,
  onChange,
  chatbot_id,
  scope,
  placeholder = 'Selecione um secret...',
  required = false,
  disabled = false,
  className = '',
}: SecretSelectorProps) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load secrets on mount or when filters change
  useEffect(() => {
    loadSecrets();
  }, [chatbot_id, scope]);

  const loadSecrets = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        chatbot_id,
        scope,
        is_active: true,
      };

      const data = await secretsAPI.list(filters);
      setSecrets(data);
    } catch (err: any) {
      console.error('Failed to load secrets:', err);
      setError(err.response?.data?.error?.message || 'Erro ao carregar secrets');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || undefined;
    onChange(newValue);
  };

  const selectedSecret = secrets.find((s) => s.id === value);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || loading}
          required={required}
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
        >
          <option value="">{placeholder}</option>
          {secrets.map((secret) => (
            <option key={secret.id} value={secret.id}>
              {secret.display_name}
              {secret.scope === 'chatbot' && ' (Chatbot)'}
              {secret.scope === 'organization' && ' (Organização)'}
            </option>
          ))}
        </select>

        {/* Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Key className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected secret info */}
      {selectedSecret && (
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Provider:</span>
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
              {selectedSecret.encryption_provider.toUpperCase()}
            </span>
          </div>
          {selectedSecret.description && (
            <div className="text-gray-500 dark:text-gray-400">
              {selectedSecret.description}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs">
            <span>Usado: {selectedSecret.usage_count}x</span>
            {selectedSecret.last_used_at && (
              <span>
                Último uso:{' '}
                {new Date(selectedSecret.last_used_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* No secrets available */}
      {!loading && !error && secrets.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-4 w-4" />
          <span>Nenhum secret disponível. Crie um primeiro.</span>
        </div>
      )}
    </div>
  );
}
