'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { FileText, Settings, BarChart3 } from 'lucide-react';
import { chatbotsAPI, whatsappAPI } from '@/lib/api';

interface WhatsAppTemplatePropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

const generateDefaultVariableName = (nodeId: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `template_status_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function WhatsAppTemplateProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: WhatsAppTemplatePropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [templateName, setTemplateName] = useState(data?.templateName || '');
  const [language, setLanguage] = useState(data?.language || 'pt_BR');
  const [headerParams, setHeaderParams] = useState<string[]>(data?.headerParams || []);
  const [bodyParams, setBodyParams] = useState<string[]>(data?.bodyParams || []);
  const [fallbackOnError, setFallbackOnError] = useState(data?.fallbackOnError ?? true);
  const [outputVariable, setOutputVariable] = useState(() => {
    return data?.outputVariable || generateDefaultVariableName(nodeId);
  });
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Templates fetching state
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setTemplateName(data?.templateName || '');
    setLanguage(data?.language || 'pt_BR');
    setHeaderParams(data?.headerParams || []);
    setBodyParams(data?.bodyParams || []);
    setFallbackOnError(data?.fallbackOnError ?? true);
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
      templateName,
      language,
      headerParams,
      bodyParams,
      fallbackOnError,
      outputVariable,
      nodeType,
      label,
    });
  }, [nodeId, templateName, language, headerParams, bodyParams, fallbackOnError, outputVariable]);

  // Fetch templates from WhatsApp number
  useEffect(() => {
    console.log('🔵 WhatsAppTemplateProperties: useEffect triggered', { chatbotId });
    const fetchTemplates = async () => {
      try {
        console.log('🟢 Starting template fetch...');
        setTemplatesLoading(true);
        setTemplatesError(null);

        // Get chatbot data to find whatsapp_number_id
        console.log('🟡 Fetching chatbot data...');
        const chatbotResponse = await chatbotsAPI.get(chatbotId);
        const chatbot = chatbotResponse.data;
        console.log('🟡 Chatbot data:', { whatsapp_number_id: chatbot.whatsapp_number_id });

        if (!chatbot.whatsapp_number_id) {
          console.log('🔴 No WhatsApp number linked');
          setTemplatesError('Este chatbot não tem um número WhatsApp vinculado. Configure um número nas configurações do chatbot.');
          setTemplatesLoading(false);
          return;
        }

        // Fetch templates from WhatsApp number
        console.log('🟡 Fetching templates from WhatsApp API...');
        const templatesResponse = await whatsappAPI.listTemplates(
          chatbot.whatsapp_number_id,
          'APPROVED'
        );

        console.log('✅ Templates fetched:', templatesResponse.data);
        setTemplates(templatesResponse.data || []);
        setTemplatesLoading(false);
      } catch (error: any) {
        console.error('🔴 Error fetching templates:', error);

        // Parse specific error messages from backend
        const errorDetail = error.response?.data?.detail || '';

        let errorMessage = '';
        if (errorDetail.includes('only available for Official API')) {
          errorMessage = 'Templates só funcionam com API Oficial (Meta Cloud API). O número vinculado usa conexão por QR Code.';
        } else if (errorDetail.includes('WhatsApp Business Account ID not configured')) {
          errorMessage = 'Número vinculado não está configurado corretamente. Configure o WABA ID nas configurações do número.';
        } else if (errorDetail.includes('not found') || error.response?.status === 404) {
          errorMessage = 'Número WhatsApp vinculado não foi encontrado. Pode ter sido deletado.';
        } else {
          errorMessage = errorDetail || 'Erro ao buscar templates. Verifique se o número WhatsApp está configurado corretamente.';
        }

        setTemplatesError(errorMessage);
        setTemplatesLoading(false);
      }
    };

    if (chatbotId) {
      console.log('🟢 chatbotId exists, calling fetchTemplates');
      fetchTemplates();
    } else {
      console.log('🔴 No chatbotId provided');
    }
  }, [chatbotId]);

  const handleAddParam = (type: 'header' | 'body') => {
    if (type === 'header') {
      setHeaderParams([...headerParams, '']);
    } else {
      setBodyParams([...bodyParams, '']);
    }
  };

  const handleUpdateParam = (type: 'header' | 'body', index: number, value: string) => {
    if (type === 'header') {
      const newParams = [...headerParams];
      newParams[index] = value;
      setHeaderParams(newParams);
    } else {
      const newParams = [...bodyParams];
      newParams[index] = value;
      setBodyParams(newParams);
    }
  };

  const handleRemoveParam = (type: 'header' | 'body', index: number) => {
    if (type === 'header') {
      setHeaderParams(headerParams.filter((_, i) => i !== index));
    } else {
      setBodyParams(bodyParams.filter((_, i) => i !== index));
    }
  };

  const tabs: Tab[] = [
    {
      id: 'template',
      label: 'Template',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Info: Template Requirements */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              ℹ️ Requisitos para usar Templates
            </p>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <div>• Número WhatsApp vinculado ao chatbot</div>
              <div>• Conexão via <strong>API Oficial</strong> (Meta Cloud API)</div>
              <div>• Templates aprovados no Meta Business Manager</div>
            </div>
          </div>

          {/* Template Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome do Template
            </label>

            {templatesLoading ? (
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400">
                Carregando templates...
              </div>
            ) : templatesError ? (
              <div className="space-y-2">
                <div className="w-full px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {templatesError}
                </div>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="nome_do_template"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Insira manualmente o nome do template
                </p>
              </div>
            ) : templates.length === 0 ? (
              <div className="space-y-2">
                <div className="w-full px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
                  Nenhum template aprovado encontrado
                </div>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="nome_do_template"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Crie e aprove templates no Meta Business Manager primeiro
                </p>
              </div>
            ) : (
              <div>
                <select
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Selecione um template</option>
                  {templates.map((template: any) => (
                    <option key={template.name} value={template.name}>
                      {template.name} ({template.language})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {templates.length} template(s) aprovado(s) disponível(eis)
                </p>
              </div>
            )}
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Idioma
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="pt_BR">🇧🇷 Português (Brasil)</option>
              <option value="en_US">🇺🇸 English (US)</option>
              <option value="es_ES">🇪🇸 Español (España)</option>
              <option value="es_MX">🇲🇽 Español (México)</option>
            </select>
          </div>

          {/* Header Parameters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Parâmetros do Header
              </label>
              <button
                type="button"
                onClick={() => handleAddParam('header')}
                className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded text-xs transition-colors"
              >
                + Adicionar
              </button>
            </div>
            {headerParams.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Nenhum parâmetro de header
              </p>
            ) : (
              <div className="space-y-2">
                {headerParams.map((param, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={param}
                      onChange={(e) => handleUpdateParam('header', index, e.target.value)}
                      placeholder={`{{param_${index + 1}}}`}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveParam('header', index)}
                      className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Body Parameters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Parâmetros do Body
              </label>
              <button
                type="button"
                onClick={() => handleAddParam('body')}
                className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded text-xs transition-colors"
              >
                + Adicionar
              </button>
            </div>
            {bodyParams.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Nenhum parâmetro de body
              </p>
            ) : (
              <div className="space-y-2">
                {bodyParams.map((param, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={param}
                      onChange={(e) => handleUpdateParam('body', index, e.target.value)}
                      placeholder={`{{param_${index + 1}}}`}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveParam('body', index)}
                      className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Como funcionam os parâmetros
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-400">
              Templates aprovados podem ter placeholders {`{{1}}`}, {`{{2}}`}, etc. Configure aqui
              os valores para cada placeholder usando variáveis do fluxo.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Fallback on Error */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="fallbackOnError"
              checked={fallbackOnError}
              onChange={(e) => setFallbackOnError(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex-1">
              <label
                htmlFor="fallbackOnError"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Usar mensagem de texto em caso de erro
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {fallbackOnError
                  ? '✅ Se o template falhar, envia o conteúdo como mensagem de texto normal'
                  : '❌ Se o template falhar, o fluxo será interrompido'}
              </p>
            </div>
          </div>

          {/* Template Requirements */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-2">
              ⚠️ Requisitos de Template
            </p>
            <div className="space-y-1.5 text-xs text-yellow-800 dark:text-yellow-400">
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>Template deve estar aprovado no Meta Business Manager</span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>Nome do template deve corresponder exatamente ao aprovado</span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>Número de parâmetros deve corresponder aos placeholders</span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>Templates só podem ser usados fora da janela de 24h</span>
              </div>
            </div>
          </div>

          {/* 24h Window Info */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              📅 Janela de 24 Horas
            </p>
            <p className="text-xs text-purple-800 dark:text-purple-400 mb-2">
              WhatsApp permite mensagens livres por 24h após última mensagem do usuário.
            </p>
            <div className="space-y-1.5 text-xs text-purple-800 dark:text-purple-400">
              <div>
                <strong>Dentro de 24h:</strong> Envie qualquer mensagem
              </div>
              <div>
                <strong>Fora de 24h:</strong> Apenas templates aprovados
              </div>
            </div>
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
              placeholder="template_status"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-emerald-500'
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
              Status do envio do template será armazenado nesta variável.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-green-800 dark:text-green-400">
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                  sent
                </code>
                <span>→ Template enviado com sucesso</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                  failed
                </code>
                <span>→ Falha no envio do template</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                  fallback
                </code>
                <span>→ Enviado como mensagem de texto (fallback)</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="template" />;
}
