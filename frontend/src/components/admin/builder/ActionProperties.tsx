'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Zap, Settings, BarChart3 } from 'lucide-react';

interface ActionPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

const generateDefaultVariableName = (nodeId: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `action_status_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function ActionProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: ActionPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [actionType, setActionType] = useState(data?.actionType || 'save_contact');
  const [contactFields, setContactFields] = useState(
    data?.contactFields || { name: '', email: '', phone: '' }
  );
  const [tagName, setTagName] = useState(data?.tagName || '');
  const [fieldName, setFieldName] = useState(data?.fieldName || '');
  const [fieldValue, setFieldValue] = useState(data?.fieldValue || '');
  const [webhookUrl, setWebhookUrl] = useState(data?.webhookUrl || '');
  const [webhookMethod, setWebhookMethod] = useState(data?.webhookMethod || 'POST');
  const [timeout, setTimeout] = useState(data?.timeout || 30);
  const [retryOnFailure, setRetryOnFailure] = useState(data?.retryOnFailure ?? true);
  const [continueOnError, setContinueOnError] = useState(data?.continueOnError ?? false);
  const [outputVariable, setOutputVariable] = useState(() => {
    return data?.outputVariable || generateDefaultVariableName(nodeId);
  });
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setActionType(data?.actionType || 'save_contact');
    setContactFields(data?.contactFields || { name: '', email: '', phone: '' });
    setTagName(data?.tagName || '');
    setFieldName(data?.fieldName || '');
    setFieldValue(data?.fieldValue || '');
    setWebhookUrl(data?.webhookUrl || '');
    setWebhookMethod(data?.webhookMethod || 'POST');
    setTimeout(data?.timeout || 30);
    setRetryOnFailure(data?.retryOnFailure ?? true);
    setContinueOnError(data?.continueOnError ?? false);
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
      actionType,
      contactFields,
      tagName,
      fieldName,
      fieldValue,
      webhookUrl,
      webhookMethod,
      timeout,
      retryOnFailure,
      continueOnError,
      outputVariable,
      nodeType,
      label,
    });
  }, [
    nodeId,
    actionType,
    contactFields,
    tagName,
    fieldName,
    fieldValue,
    webhookUrl,
    webhookMethod,
    timeout,
    retryOnFailure,
    continueOnError,
    outputVariable,
  ]);

  const tabs: Tab[] = [
    {
      id: 'action',
      label: 'Ação',
      icon: Zap,
      content: (
        <div className="space-y-4">
          {/* Action Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Ação
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="save_contact">💾 Salvar Contato</option>
              <option value="add_tag">🏷️ Adicionar Tag</option>
              <option value="remove_tag">🗑️ Remover Tag</option>
              <option value="update_field">✏️ Atualizar Campo</option>
              <option value="send_email">📧 Enviar Email</option>
              <option value="webhook">🔗 Webhook</option>
            </select>
          </div>

          {/* Save Contact Fields */}
          {actionType === 'save_contact' && (
            <div className="space-y-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                Campos do Contato
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={contactFields.name}
                  onChange={(e) =>
                    setContactFields({ ...contactFields, name: e.target.value })
                  }
                  placeholder="{{user_name}}"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Email
                </label>
                <input
                  type="text"
                  value={contactFields.email}
                  onChange={(e) =>
                    setContactFields({ ...contactFields, email: e.target.value })
                  }
                  placeholder="{{user_email}}"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={contactFields.phone}
                  onChange={(e) =>
                    setContactFields({ ...contactFields, phone: e.target.value })
                  }
                  placeholder="{{user_phone}}"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Add/Remove Tag */}
          {(actionType === 'add_tag' || actionType === 'remove_tag') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome da Tag
              </label>
              <input
                type="text"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="vip, cliente, leads"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use variáveis como {`{{tag_name}}`} se necessário
              </p>
            </div>
          )}

          {/* Update Field */}
          {actionType === 'update_field' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Campo
                </label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="custom_field_name"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Novo Valor
                </label>
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder="{{new_value}}"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Webhook */}
          {actionType === 'webhook' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL do Webhook
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.exemplo.com/webhook"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método HTTP
                </label>
                <select
                  value={webhookMethod}
                  onChange={(e) => setWebhookMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Timeout */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeout (segundos)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tempo máximo de espera pela ação (5-300 segundos)
            </p>
          </div>

          {/* Retry on Failure */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="retryOnFailure"
              checked={retryOnFailure}
              onChange={(e) => setRetryOnFailure(e.target.checked)}
              className="mt-1 w-4 h-4 text-yellow-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-yellow-500"
            />
            <div className="flex-1">
              <label
                htmlFor="retryOnFailure"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Tentar novamente em caso de falha
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {retryOnFailure
                  ? '✅ Tentará executar a ação até 3 vezes em caso de erro'
                  : '❌ Falhará imediatamente sem retry'}
              </p>
            </div>
          </div>

          {/* Continue on Error */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="continueOnError"
              checked={continueOnError}
              onChange={(e) => setContinueOnError(e.target.checked)}
              className="mt-1 w-4 h-4 text-yellow-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-yellow-500"
            />
            <div className="flex-1">
              <label
                htmlFor="continueOnError"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Continuar fluxo mesmo se falhar
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {continueOnError
                  ? '➡️ O fluxo continuará para o próximo nó mesmo que a ação falhe'
                  : '⛔ O fluxo será interrompido se a ação falhar'}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Dica de Performance
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-400">
              Para ações críticas (salvar contato, enviar email), mantenha o retry ativo e
              continue on error desativado. Para ações secundárias (adicionar tag), pode ativar
              continue on error.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'variables',
      label: 'Variáveis',
      icon: BarChart3,
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
              placeholder="action_status"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-yellow-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-900 dark:text-red-400 focus:ring-red-500'
              }`}
            />
            {!validateSnakeCase(outputVariable) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                ⚠️ Use apenas letras minúsculas, números e underscore (_). Deve começar com letra.
              </p>
            )}
          </div>

          {/* Variable Info */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              💡 Saída deste nó:{' '}
              <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                {'{{ ' + outputVariable + ' }}'}
              </code>
            </p>
            <p className="text-xs text-green-800 dark:text-green-400 mb-2">
              Status da execução da ação será armazenado nesta variável.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-green-800 dark:text-green-400">
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                  success
                </code>
                <span>→ Ação executada com sucesso</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                  failed
                </code>
                <span>→ Falha na execução da ação</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                  timeout
                </code>
                <span>→ Ação excedeu o tempo limite</span>
              </div>
            </div>
          </div>

          {/* Usage Example */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-2">
              Como usar esta variável
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-400 mb-2">
              Use em um nó de condição para verificar o resultado:
            </p>
            <code className="block px-2 py-1.5 bg-yellow-100 dark:bg-yellow-900/40 rounded text-xs">
              Se {'{{ ' + outputVariable + ' }}'} == "success"
              <br />
              Então: Continuar fluxo normal
            </code>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="action" />;
}
