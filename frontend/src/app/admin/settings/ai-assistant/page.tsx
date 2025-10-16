'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Bot,
  Save,
  TestTube2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Key,
  Settings2,
  Info,
} from 'lucide-react';
import { aiAssistantAPI } from '@/lib/api';
import AddCustomModelModal from '@/components/AddCustomModelModal';

// Validation Schema
const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['openai', 'anthropic']),
  api_key: z.string().min(1, 'API Key é obrigatória').refine(
    (val) => {
      // Validate API key format based on provider
      return true; // We'll validate format in the form
    },
    { message: 'Formato de API Key inválido' }
  ),
  model: z.string().min(1, 'Modelo é obrigatório'),
  max_tokens: z.number().min(1024, 'Mínimo 1024 tokens').max(200000, 'Máximo 200000 tokens'),
  temperature: z.number().min(0, 'Mínimo 0').max(1, 'Máximo 1'),
}).refine(
  (data) => {
    // If enabled, API key is required
    if (data.enabled && !data.api_key) {
      return false;
    }
    return true;
  },
  {
    message: 'API Key é obrigatória quando o AI Assistant está habilitado',
    path: ['api_key'],
  }
).refine(
  (data) => {
    // Validate API key format based on provider
    if (!data.api_key) return true;

    if (data.provider === 'openai' && !data.api_key.startsWith('sk-')) {
      return false;
    }
    if (data.provider === 'anthropic' && !data.api_key.startsWith('sk-ant-')) {
      return false;
    }
    return true;
  },
  {
    message: 'Formato de API Key inválido para o provider selecionado',
    path: ['api_key'],
  }
);

type AISettingsFormData = z.infer<typeof aiSettingsSchema>;

// AI Model type
interface AIModel {
  id: string;
  model_id: string;
  provider: 'openai' | 'anthropic';
  name: string;
  description?: string;
  context_window: number;
  max_output_tokens: number;
  input_cost_per_million: number;
  output_cost_per_million: number;
  supports_vision: boolean;
  supports_tools: boolean;
  is_custom: boolean;
  is_deprecated: boolean;
  release_date?: string;
}

export default function AIAssistantSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [originalApiKey, setOriginalApiKey] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [showAddModelModal, setShowAddModelModal] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<AISettingsFormData>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      enabled: false,
      provider: 'openai',
      api_key: '',
      model: 'gpt-4-turbo-preview',
      max_tokens: 4096,
      temperature: 0.7,
    },
  });

  const enabled = watch('enabled');
  const provider = watch('provider');
  const apiKey = watch('api_key');

  // Load settings and models on mount
  useEffect(() => {
    const init = async () => {
      await loadModels();
      await loadSettings();
    };
    init();
  }, []);

  // Update model when provider changes
  useEffect(() => {
    if (availableModels.length === 0) return;

    const currentModel = watch('model');
    const providerModels = availableModels.filter(m => m.provider === provider);
    const modelIds = providerModels.map(m => m.model_id);

    if (!modelIds.includes(currentModel) && providerModels.length > 0) {
      setValue('model', providerModels[0].model_id);
    }
  }, [provider, availableModels]);

  const loadModels = async () => {
    try {
      const response = await aiAssistantAPI.listModels({ include_deprecated: false });
      setAvailableModels(response.data.models);
    } catch (error: any) {
      console.error('Erro ao carregar modelos:', error);
      // Continue even if models fail to load
    }
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await aiAssistantAPI.getSettings();
      const settings = response.data;

      // If no settings configured, use defaults
      if (!settings) {
        reset({
          enabled: false,
          provider: 'openai',
          api_key: '',
          model: 'gpt-4-turbo-preview',
          max_tokens: 4096,
          temperature: 0.7,
        });
        return;
      }

      // Mask API key if present (show only first 7 and last 4 chars)
      let maskedApiKey = '';
      if (settings.api_key) {
        const key = settings.api_key;
        if (key.length > 15) {
          maskedApiKey = key.substring(0, 7) + '...' + key.substring(key.length - 4);
          setOriginalApiKey(key);
        } else {
          maskedApiKey = key;
          setOriginalApiKey(key);
        }
      }

      reset({
        enabled: settings.enabled || false,
        provider: settings.provider || 'openai',
        api_key: maskedApiKey,
        model: settings.model || 'gpt-4-turbo-preview',
        max_tokens: settings.max_tokens || 4096,
        temperature: settings.temperature || 0.7,
      });
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      setSaveMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao carregar configurações',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AISettingsFormData) => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      // If API key wasn't changed (still masked), use original
      let finalApiKey = data.api_key;
      if (data.api_key.includes('...') && originalApiKey) {
        finalApiKey = originalApiKey;
      }

      await aiAssistantAPI.updateSettings({
        enabled: data.enabled,
        provider: data.provider,
        api_key: finalApiKey,
        model: data.model,
        max_tokens: data.max_tokens,
        temperature: data.temperature,
      });

      setSaveMessage({
        type: 'success',
        text: 'Configurações salvas com sucesso!',
      });

      // Reload to get fresh masked key
      setTimeout(() => {
        loadSettings();
      }, 1000);
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      setSaveMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao salvar configurações',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestMessage(null);

      await aiAssistantAPI.testConnection();

      setTestMessage({
        type: 'success',
        text: 'Conexão testada com sucesso! API Key válida.',
      });
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error);
      setTestMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Falha ao testar conexão. Verifique a API Key.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 15) return key;
    return key.substring(0, 7) + '...' + key.substring(key.length - 4);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">AI Assistant</h1>
            <p className="text-purple-100 text-lg">
              Configure modelos de IA para respostas automáticas inteligentes no atendimento ao cliente
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center h-6">
              <input
                type="checkbox"
                {...register('enabled')}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Habilitar AI Assistant
              </label>
              <p className="text-gray-600 dark:text-gray-400">
                Ative respostas automáticas inteligentes baseadas em IA para seus atendimentos
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6 transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Provider
            </label>
            <select
              {...register('provider')}
              disabled={!enabled}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              API Key
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showApiKey ? 'text' : 'password'}
                {...register('api_key')}
                disabled={!enabled}
                placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                className="w-full pl-12 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={!enabled}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.api_key && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.api_key.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              {provider === 'openai'
                ? 'Obtenha sua API key em: platform.openai.com/api-keys'
                : 'Obtenha sua API key em: console.anthropic.com/settings/keys'
              }
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                Modelo
              </label>
              <button
                type="button"
                onClick={() => setShowAddModelModal(true)}
                disabled={!enabled}
                className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Adicionar Modelo Customizado
              </button>
            </div>
            <select
              {...register('model')}
              disabled={!enabled}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableModels
                .filter(m => m.provider === provider)
                .map((model) => (
                  <option key={model.id} value={model.model_id}>
                    {model.name}
                    {model.is_custom && ' (Customizado)'}
                    {` - $${model.input_cost_per_million.toFixed(2)}/$${model.output_cost_per_million.toFixed(2)} por 1M tokens`}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Exibindo modelos atualizados de {provider === 'openai' ? 'OpenAI' : 'Anthropic'} (Outubro 2025)
            </p>
          </div>

          {/* Max Tokens Slider */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Max Tokens: {watch('max_tokens').toLocaleString()}
            </label>
            <input
              type="range"
              {...register('max_tokens', { valueAsNumber: true })}
              disabled={!enabled}
              min="1024"
              max="200000"
              step="1024"
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>1,024</span>
              <span>200,000</span>
            </div>
            {errors.max_tokens && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.max_tokens.message}
              </p>
            )}
          </div>

          {/* Temperature Slider */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Temperature: {watch('temperature').toFixed(1)}
            </label>
            <input
              type="range"
              {...register('temperature', { valueAsNumber: true })}
              disabled={!enabled}
              min="0"
              max="1"
              step="0.1"
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0.0 (Preciso)</span>
              <span>1.0 (Criativo)</span>
            </div>
            {errors.temperature && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.temperature.message}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!enabled || isTesting || !apiKey}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <TestTube2 className="w-5 h-5" />
                Testar Conexão
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isSaving || !isDirty}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>

        {/* Messages */}
        {saveMessage && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${
            saveMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm font-medium ${
              saveMessage.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {saveMessage.text}
            </p>
          </div>
        )}

        {testMessage && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${
            testMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            {testMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm font-medium ${
              testMessage.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {testMessage.text}
            </p>
          </div>
        )}
      </form>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200">
              Como funciona o AI Assistant?
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>Respostas automáticas baseadas no histórico da conversa</li>
              <li>Sugestões de respostas para agentes humanos</li>
              <li>Análise de sentimento e intenção do cliente</li>
              <li>Integração nativa com seus fluxos de chatbot</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Custom Model Modal */}
      <AddCustomModelModal
        isOpen={showAddModelModal}
        onClose={() => setShowAddModelModal(false)}
        onSuccess={loadModels}
      />
    </div>
  );
}
