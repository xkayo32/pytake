'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Edit3, Settings, Info } from 'lucide-react';

interface SetVariablePropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function SetVariableProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: SetVariablePropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [variableName, setVariableName] = useState(data?.variableName || '');
  const [variableValue, setVariableValue] = useState(data?.variableValue || '');
  const [valueType, setValueType] = useState(data?.valueType || 'string');
  const [operation, setOperation] = useState(data?.operation || 'set');
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setVariableName(data?.variableName || '');
    setVariableValue(data?.variableValue || '');
    setValueType(data?.valueType || 'string');
    setOperation(data?.operation || 'set');
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      variableName,
      variableValue,
      valueType,
      operation,
      nodeType,
      label,
    });
  }, [nodeId, variableName, variableValue, valueType, operation]);

  const tabs: Tab[] = [
    {
      id: 'variable',
      label: 'Variável',
      icon: Edit3,
      content: (
        <div className="space-y-4">
          {/* Variable Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Variável
            </label>
            <input
              type="text"
              value={variableName}
              onChange={(e) => setVariableName(e.target.value)}
              placeholder="minha_variavel"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(variableName)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-amber-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-900 dark:text-red-400 focus:ring-red-500'
              }`}
            />
            {!validateSnakeCase(variableName) && variableName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                ⚠️ Use apenas letras minúsculas, números e underscore (_). Deve começar com letra.
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Esta variável ficará disponível como {`{{${variableName || 'nome'}}}`}
            </p>
          </div>

          {/* Variable Value */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Valor da Variável
            </label>
            <textarea
              value={variableValue}
              onChange={(e) => setVariableValue(e.target.value)}
              rows={4}
              placeholder="Digite o valor... Use {{outras_variaveis}} se necessário"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Você pode usar outras variáveis: {`{{contact_name}}`}, {`{{user_response}}`}, etc.
            </p>
          </div>

          {/* Value Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Dado
            </label>
            <select
              value={valueType}
              onChange={(e) => setValueType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="string">📝 String (Texto)</option>
              <option value="number">🔢 Number (Número)</option>
              <option value="boolean">✅ Boolean (true/false)</option>
              <option value="json">📦 JSON (Objeto)</option>
            </select>
          </div>

          {/* Type Examples */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-300 mb-2">
              💡 Exemplos por Tipo
            </p>
            <div className="space-y-2 text-xs text-amber-800 dark:text-amber-400">
              <div>
                <strong>String:</strong> <code className="px-1 bg-amber-100 dark:bg-amber-900/40 rounded">"Olá Mundo"</code>
              </div>
              <div>
                <strong>Number:</strong> <code className="px-1 bg-amber-100 dark:bg-amber-900/40 rounded">42</code>
              </div>
              <div>
                <strong>Boolean:</strong> <code className="px-1 bg-amber-100 dark:bg-amber-900/40 rounded">true</code> ou{' '}
                <code className="px-1 bg-amber-100 dark:bg-amber-900/40 rounded">false</code>
              </div>
              <div>
                <strong>JSON:</strong>{' '}
                <code className="px-1 bg-amber-100 dark:bg-amber-900/40 rounded">
                  {`{"nome": "João", "idade": 30}`}
                </code>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'operation',
      label: 'Operação',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Operation Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Operação
            </label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="set">✏️ Set - Definir valor</option>
              <option value="append">➕ Append - Adicionar ao final</option>
              <option value="increment">⬆️ Increment - Incrementar número</option>
              <option value="decrement">⬇️ Decrement - Decrementar número</option>
            </select>
          </div>

          {/* Operation Descriptions */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              Como funciona: <strong>{operation}</strong>
            </p>
            {operation === 'set' && (
              <div className="space-y-2 text-xs text-blue-800 dark:text-blue-400">
                <p>
                  <strong>Set</strong> define o valor da variável, substituindo qualquer valor
                  anterior.
                </p>
                <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/40 rounded">
                  <p className="font-mono">
                    minha_var = "Novo Valor"
                    <br />
                    Resultado: minha_var = "Novo Valor"
                  </p>
                </div>
              </div>
            )}
            {operation === 'append' && (
              <div className="space-y-2 text-xs text-blue-800 dark:text-blue-400">
                <p>
                  <strong>Append</strong> adiciona o novo valor ao final do valor existente.
                </p>
                <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/40 rounded">
                  <p className="font-mono">
                    minha_var = "Olá"
                    <br />
                    Append " Mundo"
                    <br />
                    Resultado: minha_var = "Olá Mundo"
                  </p>
                </div>
              </div>
            )}
            {operation === 'increment' && (
              <div className="space-y-2 text-xs text-blue-800 dark:text-blue-400">
                <p>
                  <strong>Increment</strong> aumenta o valor numérico pelo valor especificado.
                </p>
                <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/40 rounded">
                  <p className="font-mono">
                    contador = 5<br />
                    Increment 2<br />
                    Resultado: contador = 7
                  </p>
                </div>
              </div>
            )}
            {operation === 'decrement' && (
              <div className="space-y-2 text-xs text-blue-800 dark:text-blue-400">
                <p>
                  <strong>Decrement</strong> diminui o valor numérico pelo valor especificado.
                </p>
                <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/40 rounded">
                  <p className="font-mono">
                    contador = 10
                    <br />
                    Decrement 3<br />
                    Resultado: contador = 7
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Warning for increment/decrement */}
          {(operation === 'increment' || operation === 'decrement') && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                ⚠️ Atenção
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-400">
                A variável deve existir e conter um número válido. Caso contrário, a operação
                iniciará do zero.
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'info',
      label: 'Informações',
      icon: Info,
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              💡 Casos de Uso
            </p>
            <div className="space-y-2 text-xs text-green-800 dark:text-green-400">
              <div>
                <p className="font-medium">Contador de interações:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Criar contador = 0, depois incrementar a cada mensagem
                </p>
              </div>
              <div>
                <p className="font-medium">Construir mensagem dinâmica:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Append várias partes para formar uma mensagem completa
                </p>
              </div>
              <div>
                <p className="font-medium">Armazenar dados temporários:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Guardar respostas do usuário para usar depois
                </p>
              </div>
              <div>
                <p className="font-medium">Flags booleanas:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  is_premium = true para controlar lógica condicional
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              📚 Usando Variáveis em Outros Nós
            </p>
            <p className="text-xs text-purple-800 dark:text-purple-400 mb-2">
              Depois de criar uma variável, você pode usá-la em qualquer lugar:
            </p>
            <div className="space-y-1.5 text-xs text-purple-800 dark:text-purple-400">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded">
                <strong>Mensagens:</strong> Olá {`{{nome_usuario}}`}, bem-vindo!
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded">
                <strong>Condições:</strong> Se {`{{contador}}`} {'>'} 5
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded">
                <strong>Ações:</strong> Salvar contato com nome = {`{{nome_usuario}}`}
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              ℹ️ Informação
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Este nó não gera variável de saída. Ele apenas cria ou modifica a variável
              especificada no campo "Nome da Variável".
            </p>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="variable" />;
}
