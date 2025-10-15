'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Key, Sparkles, Settings, FileText, Sliders, Variable } from 'lucide-react';
import SecretSelector from '@/components/admin/SecretSelector';
import PropertyTabs, { Tab } from './PropertyTabs';
import AvailableVariables from './AvailableVariables';
import VariableOutput from './VariableOutput';
import type { Node, Edge } from '@xyflow/react';

interface AIPromptPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, newData: any) => void;
  chatbotId?: string;
  nodes?: Node[];
  edges?: Edge[];
}

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4, GPT-3.5)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'groq', label: 'Groq (Llama, Mixtral)' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

const ANTHROPIC_MODELS = [
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
];

const GOOGLE_MODELS = [
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
];

const GROQ_MODELS = [
  { value: 'llama2-70b', label: 'Llama 2 70B' },
  { value: 'mixtral-8x7b', label: 'Mixtral 8x7B' },
];

const MODEL_MAP: Record<string, typeof OPENAI_MODELS> = {
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  google: GOOGLE_MODELS,
  groq: GROQ_MODELS,
};

// Generate unique default variable name
const generateDefaultVariableName = (nodeId: string, provider: string): string => {
  // Remove hyphens from nodeId to ensure valid snake_case
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  const providerPrefix = provider === 'anthropic' ? 'claude' :
                         provider === 'openai' ? 'gpt' :
                         provider === 'google' ? 'gemini' :
                         provider;
  return `${providerPrefix}_response_${shortId}`;
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

export default function AIPromptProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
  nodes = [],
  edges = [],
}: AIPromptPropertiesProps) {
  // Debug: Log component mount
  console.log('🔷 AIPromptProperties MOUNT:', {
    nodeId,
    dataOutputVariable: data?.outputVariable,
    dataProvider: data?.provider,
  });

  // Track if this is the first mount to avoid calling onChange on initial render
  const isFirstMount = useRef(true);

  // Initialize state from data
  const [provider, setProvider] = useState(data?.provider || 'openai');
  const [model, setModel] = useState(data?.model || 'gpt-4');
  const [secretId, setSecretId] = useState(data?.secretId || '');
  const [prompt, setPrompt] = useState(data?.prompt || '');
  const [temperature, setTemperature] = useState(data?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(data?.maxTokens || 1000);
  const [outputVariable, setOutputVariable] = useState(() => {
    const generated = data?.outputVariable || generateDefaultVariableName(nodeId, data?.provider || 'openai');
    console.log('🟢 useState outputVariable init:', { nodeId, fromData: data?.outputVariable, generated });
    return generated;
  });
  // Store nodeType and label in state to avoid infinite loop
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize state when nodeId changes (switching between nodes)
  useEffect(() => {
    console.log('🔄 useEffect [nodeId] running:', { nodeId, dataOutputVariable: data?.outputVariable });
    // When nodeId changes, reinitialize all state from data
    setProvider(data?.provider || 'openai');
    setModel(data?.model || 'gpt-4');
    setSecretId(data?.secretId || '');
    setPrompt(data?.prompt || '');
    setTemperature(data?.temperature || 0.7);
    setMaxTokens(data?.maxTokens || 1000);
    // Use data outputVariable or generate as fallback
    const newVar = data?.outputVariable || generateDefaultVariableName(nodeId, data?.provider || 'openai');
    console.log('🔄 Setting outputVariable to:', newVar);
    setOutputVariable(newVar);
  }, [nodeId]); // Only re-run when nodeId changes

  // Update parent when any field changes (but skip on first mount)
  useEffect(() => {
    console.log('📤 useEffect [onChange] running:', { isFirstMount: isFirstMount.current, nodeId, outputVariable });
    if (isFirstMount.current) {
      isFirstMount.current = false;
      console.log('⏭️  Skipping onChange on first mount');
      return;
    }

    console.log('✅ Calling onChange with:', { nodeId, outputVariable });
    onChange(nodeId, {
      provider,
      model,
      secretId,
      prompt,
      temperature,
      maxTokens,
      outputVariable,
      nodeType,
      label,
    });
  }, [nodeId, provider, model, secretId, prompt, temperature, maxTokens, outputVariable]);

  // Update model when provider changes
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const availableModels = MODEL_MAP[newProvider] || OPENAI_MODELS;
    setModel(availableModels[0].value);

    // Update default variable name based on provider
    if (data?.outputVariable === generateDefaultVariableName(nodeId, provider)) {
      setOutputVariable(generateDefaultVariableName(nodeId, newProvider));
    }
  };

  const availableModels = MODEL_MAP[provider] || OPENAI_MODELS;
  const variableValidation = validateVariableName(outputVariable);

  const tabs: Tab[] = [
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Provider */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider de IA
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Modelo
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              {availableModels.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* API Key (Secret) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Key className="h-3.5 w-3.5" />
              API Key (Secret)
            </label>
            <SecretSelector
              value={secretId}
              onChange={(id) => setSecretId(id || '')}
              chatbot_id={chatbotId}
              placeholder="Selecione uma API key..."
              required
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Selecione um secret contendo sua API key do {AI_PROVIDERS.find(p => p.value === provider)?.label}
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'prompt',
      label: 'Prompt',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Prompt */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Prompt do Sistema
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Você é um assistente prestativo que responde perguntas sobre nossos produtos..."
              rows={12}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none font-mono"
            />
          </div>

          {/* Variables Help */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium">
              💡 Variáveis disponíveis:
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
              Use <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">{'{{variable}}'}</code> para inserir variáveis no prompt
            </p>
            <div className="flex flex-wrap gap-2">
              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs">
                {'{{contact_name}}'}
              </code>
              <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs">
                {'{{contact_phone}}'}
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
      id: 'advanced',
      label: 'Avançado',
      icon: Sliders,
      content: (
        <div className="space-y-4">
          {/* Temperature */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-pink-600"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Determinístico (0)</span>
              <span>Criativo (2)</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Controla a aleatoriedade das respostas. Valores baixos são mais focados e determinísticos, valores altos são mais criativos.
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tokens Máximos
            </label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
              min={1}
              max={4000}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Limite de tokens na resposta (1-4000). Aproximadamente 1 token = 4 caracteres.
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              ⚠️ <strong>Atenção:</strong> Valores muito altos de temperature e tokens podem gerar respostas longas e imprevisíveis, além de aumentar o custo da API.
            </p>
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
              placeholder="Ex: gpt4_summary, claude_response"
              className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                !variableValidation.valid
                  ? 'border-red-300 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              A resposta da IA será salva nesta variável. Use snake_case
            </p>
          </div>

          {/* Variable Output Feedback */}
          <VariableOutput
            variableName={outputVariable}
            isValid={variableValidation.valid}
            errorMessage={variableValidation.error}
            description={`A resposta da IA (${provider === 'anthropic' ? 'Claude' : provider === 'openai' ? 'GPT' : provider}) será armazenada nesta variável.`}
            nodeType="ai_prompt"
          />

          {/* Available Variables */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
              📥 Variáveis Disponíveis para Usar no Prompt
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
        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
          <Brain className="h-5 w-5 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            AI Prompt
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Usar IA para processar mensagens
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
