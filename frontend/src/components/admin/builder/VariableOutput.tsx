'use client';

import { CheckCircle2, AlertCircle, Copy, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface VariableOutputProps {
  variableName: string;
  isValid: boolean;
  errorMessage?: string;
  description?: string;
  nodeType?: string;
}

export default function VariableOutput({
  variableName,
  isValid,
  errorMessage,
  description,
  nodeType = 'default',
}: VariableOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`{{${variableName}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    question: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-300 dark:border-purple-700',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-600 dark:text-purple-400',
    },
    ai_prompt: {
      bg: 'bg-pink-50 dark:bg-pink-900/20',
      border: 'border-pink-300 dark:border-pink-700',
      text: 'text-pink-700 dark:text-pink-300',
      icon: 'text-pink-600 dark:text-pink-400',
    },
    api_call: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-300 dark:border-indigo-700',
      text: 'text-indigo-700 dark:text-indigo-300',
      icon: 'text-indigo-600 dark:text-indigo-400',
    },
    set_variable: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    database_query: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-300 dark:border-orange-700',
      text: 'text-orange-700 dark:text-orange-300',
      icon: 'text-orange-600 dark:text-orange-400',
    },
    default: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
    },
  };

  const colors = colorMap[nodeType] || colorMap.default;

  if (!isValid) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">
              Variável Inválida
            </p>
            {errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative p-4 ${colors.bg} border-2 ${colors.border} rounded-lg transition-all duration-200`}>
      {/* Sparkle effect */}
      <div className="absolute -top-1 -right-1">
        <Sparkles className={`w-4 h-4 ${colors.icon} animate-pulse`} />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className={`w-4 h-4 ${colors.icon}`} />
        <span className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}>
          Variável Criada
        </span>
      </div>

      {/* Variable Display */}
      <div className="flex items-center gap-2 mb-3">
        <code className={`flex-1 px-3 py-2 ${colors.bg} border ${colors.border} rounded-lg text-sm font-mono font-bold ${colors.text}`}>
          {`{{${variableName}}}`}
        </code>
        <button
          onClick={handleCopy}
          className={`p-2 ${colors.bg} hover:opacity-80 border ${colors.border} rounded-lg transition-all`}
          title="Copiar variável"
        >
          {copied ? (
            <CheckCircle2 className={`w-4 h-4 ${colors.icon}`} />
          ) : (
            <Copy className={`w-4 h-4 ${colors.icon}`} />
          )}
        </button>
      </div>

      {/* Description */}
      {description && (
        <p className={`text-xs ${colors.text} mb-3`}>
          {description}
        </p>
      )}

      {/* Usage Info */}
      <div className={`p-2.5 bg-white dark:bg-gray-900 border ${colors.border} rounded-lg`}>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          ✨ Esta variável estará disponível em:
        </p>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-1.5">
            <span className="text-green-600 dark:text-green-400">✓</span>
            <span>Todos os nós <strong>conectados depois</strong> deste</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-green-600 dark:text-green-400">✓</span>
            <span>Mensagens, Condições, API calls, IA, etc.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-blue-600 dark:text-blue-400">💡</span>
            <span>Use a sintaxe <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{`{{${variableName}}}`}</code></span>
          </li>
        </ul>
      </div>

      {/* Visual indicator - pulsing border */}
      <div className={`absolute inset-0 border-2 ${colors.border} rounded-lg animate-pulse pointer-events-none opacity-30`} />
    </div>
  );
}
