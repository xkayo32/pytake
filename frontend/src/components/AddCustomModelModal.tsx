'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  DollarSign,
  Layers,
  Eye,
  Wrench,
} from 'lucide-react';
import { aiAssistantAPI } from '@/lib/api';

const customModelSchema = z.object({
  model_id: z
    .string()
    .min(3, 'ID deve ter no mínimo 3 caracteres')
    .max(255, 'ID muito longo')
    .regex(/^[a-z0-9-_.]+$/, 'Use apenas letras minúsculas, números, hífens, underscores e pontos'),
  provider: z.enum(['openai', 'anthropic']),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(255, 'Nome muito longo'),
  description: z.string().max(1000, 'Descrição muito longa').optional(),
  context_window: z
    .number()
    .min(1024, 'Mínimo 1024 tokens')
    .max(2000000, 'Máximo 2M tokens'),
  max_output_tokens: z
    .number()
    .min(256, 'Mínimo 256 tokens')
    .max(200000, 'Máximo 200K tokens'),
  input_cost_per_million: z
    .number()
    .min(0, 'Custo não pode ser negativo')
    .max(1000, 'Custo muito alto'),
  output_cost_per_million: z
    .number()
    .min(0, 'Custo não pode ser negativo')
    .max(1000, 'Custo muito alto'),
  supports_vision: z.boolean().default(false),
  supports_tools: z.boolean().default(true),
  release_date: z.string().optional(),
});

type CustomModelFormData = z.infer<typeof customModelSchema>;

interface AddCustomModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCustomModelModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomModelModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CustomModelFormData>({
    resolver: zodResolver(customModelSchema),
    defaultValues: {
      provider: 'openai',
      context_window: 128000,
      max_output_tokens: 4096,
      input_cost_per_million: 3.0,
      output_cost_per_million: 15.0,
      supports_vision: false,
      supports_tools: true,
    },
  });

  const provider = watch('provider');
  const inputCost = watch('input_cost_per_million');
  const outputCost = watch('output_cost_per_million');

  const estimatedCost = ((inputCost * 1000) + (outputCost * 500)) / 1_000_000;

  const onSubmit = async (data: CustomModelFormData) => {
    try {
      setIsSaving(true);
      setMessage(null);

      await aiAssistantAPI.createCustomModel(data);

      setMessage({
        type: 'success',
        text: 'Modelo customizado criado com sucesso!',
      });

      setTimeout(() => {
        reset();
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao criar modelo:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erro ao criar modelo customizado',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      reset();
      setMessage(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Adicionar Modelo Customizado
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Adicione modelos fine-tuned ou novos modelos
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Provider & Model ID */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Provider *
                </label>
                <select
                  {...register('provider')}
                  disabled={isSaving}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Model ID *
                </label>
                <input
                  type="text"
                  {...register('model_id')}
                  disabled={isSaving}
                  placeholder="gpt-5-company-finetuned"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50"
                />
                {errors.model_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.model_id.message}
                  </p>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Nome Display *
              </label>
              <input
                type="text"
                {...register('name')}
                disabled={isSaving}
                placeholder="GPT-5 Company Fine-tuned"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Descrição
              </label>
              <textarea
                {...register('description')}
                disabled={isSaving}
                rows={3}
                placeholder="Fine-tuned para atendimento ao cliente da empresa..."
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50 resize-none"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Context & Output Tokens */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Context Window *
                </label>
                <input
                  type="number"
                  {...register('context_window', { valueAsNumber: true })}
                  disabled={isSaving}
                  placeholder="128000"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50"
                />
                {errors.context_window && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.context_window.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Max Output Tokens *
                </label>
                <input
                  type="number"
                  {...register('max_output_tokens', { valueAsNumber: true })}
                  disabled={isSaving}
                  placeholder="4096"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50"
                />
                {errors.max_output_tokens && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.max_output_tokens.message}
                  </p>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                  Pricing (USD por 1M tokens)
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Input Cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('input_cost_per_million', { valueAsNumber: true })}
                    disabled={isSaving}
                    placeholder="3.00"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50"
                  />
                  {errors.input_cost_per_million && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {errors.input_cost_per_million.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Output Cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('output_cost_per_million', { valueAsNumber: true })}
                    disabled={isSaving}
                    placeholder="15.00"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50"
                  />
                  {errors.output_cost_per_million && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {errors.output_cost_per_million.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  <strong>Custo estimado por request típico:</strong> ${estimatedCost.toFixed(4)}
                  <span className="text-purple-600 dark:text-purple-400 ml-1">
                    (1000 input + 500 output tokens)
                  </span>
                </p>
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Capacidades
              </h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('supports_vision')}
                    disabled={isSaving}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                  />
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Suporta Vision
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('supports_tools')}
                    disabled={isSaving}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                  />
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Suporta Tools/Functions
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Release Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Data de Lançamento (Opcional)
              </label>
              <input
                type="date"
                {...register('release_date')}
                disabled={isSaving}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 dark:text-white disabled:opacity-50"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <p>
                    <strong>Dica:</strong> Use IDs descritivos como{' '}
                    <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">
                      gpt-4o-company-support-v2
                    </code>
                  </p>
                  <p>O modelo ficará disponível apenas para sua organização.</p>
                </div>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm font-medium ${
                    message.type === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {message.text}
                </p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Criar Modelo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
