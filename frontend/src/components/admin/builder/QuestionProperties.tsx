'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import AvailableVariables from './AvailableVariables';
import VariableOutput from './VariableOutput';
import { FileText, CheckCircle, BarChart3 } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

interface QuestionPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
  nodes?: Node[];
  edges?: Edge[];
}

const generateDefaultVariableName = (nodeId: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `user_response_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function QuestionProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
  nodes = [],
  edges = [],
}: QuestionPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [questionText, setQuestionText] = useState(data?.questionText || '');
  const [responseType, setResponseType] = useState(data?.responseType || 'text');
  const [validation, setValidation] = useState(
    data?.validation || {
      required: true,
      errorMessage: 'Por favor, forneça uma resposta válida',
      maxAttempts: 3,
    }
  );
  const [options, setOptions] = useState<string[]>(data?.options || []);
  const [outputVariable, setOutputVariable] = useState(() => {
    return data?.outputVariable || generateDefaultVariableName(nodeId);
  });
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setQuestionText(data?.questionText || '');
    setResponseType(data?.responseType || 'text');
    setValidation(
      data?.validation || {
        required: true,
        errorMessage: 'Por favor, forneça uma resposta válida',
        maxAttempts: 3,
      }
    );
    setOptions(data?.options || []);
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
      questionText,
      responseType,
      validation,
      options,
      outputVariable,
      nodeType,
      label,
    });
  }, [nodeId, questionText, responseType, validation, options, outputVariable]);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const tabs: Tab[] = [
    {
      id: 'question',
      label: 'Pergunta',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Question Text */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Texto da Pergunta
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
              placeholder="Digite a pergunta... Use {{variavel}} para inserir variáveis"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {questionText.length} caracteres
            </p>
          </div>

          {/* Response Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Resposta Esperada
            </label>
            <select
              value={responseType}
              onChange={(e) => setResponseType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="text">📝 Texto livre</option>
              <option value="number">🔢 Número</option>
              <option value="email">📧 Email</option>
              <option value="phone">📱 Telefone</option>
              <option value="date">📅 Data</option>
              <option value="yesno">✅ Sim/Não</option>
              <option value="multiple_choice">🔘 Opção Múltipla</option>
              <option value="file">📎 Arquivo/Mídia</option>
            </select>
          </div>

          {/* Options (if multiple_choice) */}
          {responseType === 'multiple_choice' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Opções de Resposta
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleUpdateOption(index, e.target.value)}
                      placeholder={`Opção ${index + 1}`}
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-sm transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="w-full px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg text-sm font-medium transition-colors"
                >
                  + Adicionar Opção
                </button>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'validation',
      label: 'Validação',
      icon: CheckCircle,
      content: (
        <div className="space-y-4">
          {/* Required */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="required"
              checked={validation.required}
              onChange={(e) =>
                setValidation({ ...validation, required: e.target.checked })
              }
              className="mt-1 w-4 h-4 text-purple-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex-1">
              <label
                htmlFor="required"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Resposta obrigatória
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Usuário deve fornecer uma resposta válida
              </p>
            </div>
          </div>

          {/* Error Message */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mensagem de Erro
            </label>
            <input
              type="text"
              value={validation.errorMessage}
              onChange={(e) =>
                setValidation({ ...validation, errorMessage: e.target.value })
              }
              placeholder="Mensagem exibida quando validação falhar"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Max Attempts */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tentativas Máximas
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={validation.maxAttempts}
                onChange={(e) =>
                  setValidation({ ...validation, maxAttempts: parseInt(e.target.value) })
                }
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-center">
                {validation.maxAttempts}x
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Após {validation.maxAttempts} tentativas sem sucesso, o fluxo pode ser encerrado
            </p>
          </div>

          {/* Validation Rules Based on Type */}
          {responseType === 'number' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">
                Validação Automática: Número
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-400">
                ✅ Aceita apenas valores numéricos
              </p>
            </div>
          )}

          {responseType === 'email' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">
                Validação Automática: Email
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-400">
                ✅ Valida formato de email (ex: usuario@exemplo.com)
              </p>
            </div>
          )}

          {responseType === 'phone' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">
                Validação Automática: Telefone
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-400">
                ✅ Valida formato de telefone brasileiro
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'variables',
      label: 'Variáveis',
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          {/* Output Variable Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Variável de Saída
            </label>
            <input
              type="text"
              value={outputVariable}
              onChange={(e) => setOutputVariable(e.target.value)}
              placeholder="user_response"
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-purple-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-900 dark:text-red-400 focus:ring-red-500'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use apenas letras minúsculas, números e underscore (_)
            </p>
          </div>

          {/* Variable Output Feedback */}
          <VariableOutput
            variableName={outputVariable}
            isValid={validateSnakeCase(outputVariable)}
            errorMessage={
              !validateSnakeCase(outputVariable)
                ? 'Use apenas letras minúsculas, números e underscore (_). Deve começar com letra.'
                : undefined
            }
            description={`A resposta do usuário será armazenada nesta variável (${
              responseType === 'number' ? 'Número' : responseType === 'yesno' ? 'Boolean' : 'Texto'
            }).`}
            nodeType="question"
          />

          {/* Available Variables */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
              📥 Variáveis Disponíveis para Usar na Pergunta
            </h5>
            <AvailableVariables
              nodes={nodes}
              edges={edges}
              selectedNodeId={nodeId}
            />
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="question" />;
}
