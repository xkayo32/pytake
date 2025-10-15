'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe, Key, Plus, Trash2, Code, Settings, FileText, Variable } from 'lucide-react';
import SecretSelector from '@/components/admin/SecretSelector';
import PropertyTabs, { Tab } from './PropertyTabs';
import AvailableVariables from './AvailableVariables';
import VariableOutput from './VariableOutput';
import type { Node, Edge } from '@xyflow/react';

interface APICallPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, newData: any) => void;
  chatbotId?: string;
  nodes?: Node[];
  edges?: Edge[];
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const AUTH_TYPES = [
  { value: 'none', label: 'Sem Autenticação' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key' },
  { value: 'basic', label: 'Basic Auth' },
];

interface Header {
  key: string;
  value: string;
}

// Generate unique default variable name
const generateDefaultVariableName = (nodeId: string, method: string): string => {
  // Remove hyphens from nodeId to ensure valid snake_case
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  const methodPrefix = method.toLowerCase();
  return `${methodPrefix}_response_${shortId}`;
};

// Validate variable name (snake_case)
const validateVariableName = (name: string): { valid: boolean; error?: string } => {
  if (!name) {
    return { valid: false, error: 'Nome da variável é obrigatório' };
  }

  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return {
      valid: false,
      error: 'Use apenas letras minúsculas, números e underscore. Deve começar com letra.'
    };
  }

  if (name.length > 50) {
    return { valid: false, error: 'Nome muito longo (máx: 50 caracteres)' };
  }

  return { valid: true };
};

export default function APICallProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
  nodes = [],
  edges = [],
}: APICallPropertiesProps) {
  // Track if this is the first mount to avoid calling onChange on initial render
  const isFirstMount = useRef(true);

  // Initialize state from data
  const [method, setMethod] = useState(data?.method || 'GET');
  const [url, setUrl] = useState(data?.url || '');
  const [authType, setAuthType] = useState(data?.authType || 'none');
  const [secretId, setSecretId] = useState(data?.secretId || '');
  const [headers, setHeaders] = useState<Header[]>(data?.headers || []);
  const [body, setBody] = useState(data?.body || '');
  const [outputVariable, setOutputVariable] = useState(
    data?.outputVariable || data?.responseVar || generateDefaultVariableName(nodeId, data?.method || 'GET')
  );
  // Store nodeType and label in state to avoid infinite loop
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize state when nodeId changes (switching between nodes)
  useEffect(() => {
    // When nodeId changes, reinitialize all state from data
    setMethod(data?.method || 'GET');
    setUrl(data?.url || '');
    setAuthType(data?.authType || 'none');
    setSecretId(data?.secretId || '');
    setHeaders(data?.headers || []);
    setBody(data?.body || '');
    // Use data outputVariable or generate as fallback
    const newVar = data?.outputVariable || data?.responseVar || generateDefaultVariableName(nodeId, data?.method || 'GET');
    setOutputVariable(newVar);
  }, [nodeId]); // Only re-run when nodeId changes

  // Update parent when any field changes (but skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    onChange(nodeId, {
      method,
      url,
      authType,
      secretId,
      headers,
      body,
      outputVariable,
      responseVar: outputVariable, // mantém compatibilidade
      nodeType,
      label,
    });
  }, [nodeId, method, url, authType, secretId, headers, body, outputVariable]);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    // Update default variable name based on method
    if (data?.outputVariable === generateDefaultVariableName(nodeId, method)) {
      setOutputVariable(generateDefaultVariableName(nodeId, newMethod));
    }
  };

  const variableValidation = validateVariableName(outputVariable);

  const tabs: Tab[] = [
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* HTTP Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Método HTTP
            </label>
            <select
              value={method}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.exemplo.com/endpoint"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Use <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{'{{variable}}'}</code> para inserir variáveis
            </p>
          </div>

          {/* Authentication */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Autenticação
            </label>
            <select
              value={authType}
              onChange={(e) => setAuthType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {AUTH_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Secret Selector (if auth is not none) */}
          {authType !== 'none' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                Token/Chave (Secret)
              </label>
              <SecretSelector
                value={secretId}
                onChange={(id) => setSecretId(id || '')}
                chatbot_id={chatbotId}
                placeholder="Selecione um secret..."
                required
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {authType === 'bearer' && 'Secret será usado como Bearer token no header Authorization'}
                {authType === 'api_key' && 'Secret será usado como API key (configure o header abaixo)'}
                {authType === 'basic' && 'Secret deve conter username:password em Base64'}
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'request',
      label: 'Requisição',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Headers Personalizados
              </label>
              <button
                type="button"
                onClick={addHeader}
                className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
              >
                <Plus className="h-3 w-3" />
                Adicionar
              </button>
            </div>

            {headers.length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400 py-3 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                Nenhum header personalizado
              </div>
            ) : (
              <div className="space-y-2">
                {headers.map((header, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      placeholder="Header"
                      className="flex-1 px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      placeholder="Valor"
                      className="flex-1 px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(index)}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Request Body (for POST, PUT, PATCH) */}
          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Code className="h-3.5 w-3.5" />
                Body (JSON)
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{\n  "campo": "valor",\n  "usuario": "{{user_name}}"\n}'
                rows={12}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono"
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                JSON válido. Use <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{'{{variable}}'}</code> para inserir variáveis
              </p>
            </div>
          )}

          {/* Variables Help */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium">
              💡 Variáveis disponíveis:
            </p>
            <div className="flex flex-wrap gap-2">
              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs">
                {'{{contact_name}}'}
              </code>
              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs">
                {'{{user_input}}'}
              </code>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'variables',
      label: 'Variáveis',
      icon: Variable,
      badge: !variableValidation.valid ? '!' : undefined,
      content: (
        <div className="space-y-4">
          {/* Output Variable Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Variable className="h-3.5 w-3.5" />
              Nome da Variável de Saída
            </label>
            <input
              type="text"
              value={outputVariable}
              onChange={(e) => setOutputVariable(e.target.value.toLowerCase())}
              placeholder="Ex: api_response, user_data"
              className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                !variableValidation.valid
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              A resposta da API será salva nesta variável. Use snake_case
            </p>
          </div>

          {/* Variable Output Feedback */}
          <VariableOutput
            variableName={outputVariable}
            isValid={variableValidation.valid}
            errorMessage={variableValidation.error}
            description={`A resposta da API (${method}) será armazenada nesta variável. Você pode acessar campos específicos com {{${outputVariable}.campo}}.`}
            nodeType="api_call"
          />

          {/* Available Variables */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
              📥 Variáveis Disponíveis para Usar na URL/Body
            </h5>
            <AvailableVariables
              nodes={nodes}
              edges={edges}
              selectedNodeId={nodeId}
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            API Call
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Chamar API externa
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden mt-4">
        <PropertyTabs tabs={tabs} defaultTab="config" />
      </div>
    </div>
  );
}
