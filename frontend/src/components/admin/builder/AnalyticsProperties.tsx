'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Settings, BarChart3, Tag, Code, AlertCircle } from 'lucide-react';

interface AnalyticsPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

const generateDefaultVariableName = (nodeId: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `analytics_event_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function AnalyticsProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: AnalyticsPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [eventType, setEventType] = useState(data?.eventType || 'custom');
  const [eventName, setEventName] = useState(data?.eventName || '');
  const [eventValue, setEventValue] = useState(data?.eventValue || '');
  const [tags, setTags] = useState<string[]>(data?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [metadata, setMetadata] = useState(data?.metadata || '');
  const [outputVariable, setOutputVariable] = useState(() => {
    return data?.outputVariable || generateDefaultVariableName(nodeId);
  });
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setEventType(data?.eventType || 'custom');
    setEventName(data?.eventName || '');
    setEventValue(data?.eventValue || '');
    setTags(data?.tags || []);
    setMetadata(data?.metadata || '');
    const newVar = data?.outputVariable || generateDefaultVariableName(nodeId);
    setOutputVariable(newVar);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      eventType,
      eventName,
      eventValue,
      tags,
      metadata,
      outputVariable,
      nodeType,
      label,
    });
  }, [nodeId, eventType, eventName, eventValue, tags, metadata, outputVariable]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const tabs: Tab[] = [
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Event Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Evento
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="custom">📊 Evento Customizado</option>
              <option value="conversion">💰 Conversão</option>
              <option value="engagement">👥 Engajamento</option>
              <option value="error">❌ Erro</option>
              <option value="milestone">🎯 Marco/Meta</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Categoria do evento para facilitar análise
            </p>
          </div>

          {/* Event Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome do Evento *
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="ex: lead_qualified"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Identificador único do evento (use snake_case)
            </p>
          </div>

          {/* Event Value */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Valor do Evento (Opcional)
            </label>
            <input
              type="text"
              value={eventValue}
              onChange={(e) => setEventValue(e.target.value)}
              placeholder="ex: {{order_total}} ou 150.00"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Valor numérico ou variável (ex: receita, quantidade)
            </p>
          </div>

          {/* Metadata JSON */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metadados Adicionais (JSON)
            </label>
            <textarea
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              rows={4}
              placeholder={`{\n  "product": "{{product_name}}",\n  "category": "premium"\n}`}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Dados adicionais em formato JSON (suporta variáveis)
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'tags',
      label: 'Tags',
      icon: Tag,
      content: (
        <div className="space-y-4">
          {/* Tags Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adicionar Tags à Conversa
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Digite uma tag e pressione Enter"
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Adicionar
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tags são adicionadas à conversa para segmentação
            </p>
          </div>

          {/* Tags List */}
          {tags.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags Configuradas ({tags.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 text-xs font-medium rounded-full"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tag Examples */}
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
            <p className="text-xs font-medium text-rose-900 dark:text-rose-300 mb-2">
              💡 Exemplos de Tags
            </p>
            <div className="space-y-1 text-xs text-rose-800 dark:text-rose-400">
              <div className="flex items-start gap-2">
                <span>•</span>
                <span><strong>lead_qualificado</strong> - Para leads que passaram na qualificação</span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span><strong>cliente_premium</strong> - Para clientes de alto valor</span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span><strong>abandonou_carrinho</strong> - Para recuperação de carrinho</span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span><strong>demo_agendada</strong> - Para follow-up pós-demo</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'examples',
      label: 'Exemplos',
      icon: Code,
      content: (
        <div className="space-y-4">
          {/* Conversion Example */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              💰 Rastrear Conversão
            </p>
            <div className="space-y-2 text-xs text-green-800 dark:text-green-400">
              <div>
                <strong>Tipo:</strong> Conversão
              </div>
              <div>
                <strong>Nome:</strong> purchase_completed
              </div>
              <div>
                <strong>Valor:</strong> {'{{order_total}}'}
              </div>
              <div>
                <strong>Tags:</strong> cliente, comprou
              </div>
            </div>
          </div>

          {/* Engagement Example */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              👥 Rastrear Engajamento
            </p>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-400">
              <div>
                <strong>Tipo:</strong> Engajamento
              </div>
              <div>
                <strong>Nome:</strong> quiz_completed
              </div>
              <div>
                <strong>Valor:</strong> {'{{quiz_score}}'}
              </div>
              <div>
                <strong>Metadata:</strong> {`{"quiz_id": "{{quiz_id}}"}`}
              </div>
            </div>
          </div>

          {/* Milestone Example */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              🎯 Marco Alcançado
            </p>
            <div className="space-y-2 text-xs text-purple-800 dark:text-purple-400">
              <div>
                <strong>Tipo:</strong> Marco/Meta
              </div>
              <div>
                <strong>Nome:</strong> onboarding_completed
              </div>
              <div>
                <strong>Tags:</strong> onboarding, ativo
              </div>
            </div>
          </div>

          {/* Error Tracking Example */}
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs font-medium text-red-900 dark:text-red-300 mb-2">
              ❌ Rastrear Erro
            </p>
            <div className="space-y-2 text-xs text-red-800 dark:text-red-400">
              <div>
                <strong>Tipo:</strong> Erro
              </div>
              <div>
                <strong>Nome:</strong> payment_failed
              </div>
              <div>
                <strong>Metadata:</strong> {`{"error": "{{error_message}}"}`}
              </div>
              <div>
                <strong>Tags:</strong> erro_pagamento, requer_atenção
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'storage',
      label: 'Armazenamento',
      icon: AlertCircle,
      content: (
        <div className="space-y-4">
          {/* Output Variable */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Variável de Saída
            </label>
            <input
              type="text"
              value={outputVariable}
              onChange={(e) => setOutputVariable(e.target.value)}
              placeholder="analytics_event_id"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-rose-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-900 dark:text-red-400 focus:ring-red-500'
              }`}
            />
            {!validateSnakeCase(outputVariable) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                ⚠️ Use apenas letras minúsculas, números e underscore (_). Deve começar com letra.
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ID do evento será armazenado nesta variável
            </p>
          </div>

          {/* Storage Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              💾 Onde os Eventos São Armazenados
            </p>
            <ul className="space-y-2 text-xs text-blue-800 dark:text-blue-400">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span><strong>MongoDB:</strong> Todos os eventos são salvos no banco MongoDB na collection <code className="px-1 bg-blue-100 dark:bg-blue-900/40 rounded">chatbot_events</code></span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span><strong>PostgreSQL:</strong> Tags são adicionadas à conversa na tabela <code className="px-1 bg-blue-100 dark:bg-blue-900/40 rounded">conversations</code></span>
              </li>
            </ul>
          </div>

          {/* Analytics Dashboard Info */}
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
            <p className="text-xs font-medium text-indigo-900 dark:text-indigo-300 mb-2">
              📊 Visualização de Dados
            </p>
            <p className="text-xs text-indigo-800 dark:text-indigo-400 mb-2">
              Acesse o painel de Analytics para visualizar:
            </p>
            <ul className="space-y-1 text-xs text-indigo-800 dark:text-indigo-400">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Total de eventos por tipo</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Conversões ao longo do tempo</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Funil de conversão</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Segmentação por tags</span>
              </li>
            </ul>
          </div>

          {/* Performance Note */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              ⚡ Performance
            </p>
            <p className="text-xs text-green-800 dark:text-green-400">
              O tracking de eventos é <strong>assíncrono</strong> e não impacta a velocidade do chatbot.
              Os eventos são salvos em background após o processamento do nó.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="config" />;
}
