'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Settings, Calendar, Code, AlertCircle, BarChart3 } from 'lucide-react';

interface DateTimePropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

const generateDefaultVariableName = (nodeId: string, operation: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `datetime_${operation}_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function DateTimeProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: DateTimePropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [operation, setOperation] = useState(data?.operation || 'get_current');
  const [timezone, setTimezone] = useState(data?.timezone || 'America/Sao_Paulo');
  const [outputFormat, setOutputFormat] = useState(data?.outputFormat || '%Y-%m-%d %H:%M:%S');
  const [sourceVariable, setSourceVariable] = useState(data?.sourceVariable || '');
  const [addAmount, setAddAmount] = useState(data?.addAmount || 1);
  const [addUnit, setAddUnit] = useState(data?.addUnit || 'days');
  const [compareVariable, setCompareVariable] = useState(data?.compareVariable || '');
  const [compareOperator, setCompareOperator] = useState(data?.compareOperator || 'gt');
  const [outputVariable, setOutputVariable] = useState(() => {
    return data?.outputVariable || generateDefaultVariableName(nodeId, data?.operation || 'get_current');
  });
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setOperation(data?.operation || 'get_current');
    setTimezone(data?.timezone || 'America/Sao_Paulo');
    setOutputFormat(data?.outputFormat || '%Y-%m-%d %H:%M:%S');
    setSourceVariable(data?.sourceVariable || '');
    setAddAmount(data?.addAmount || 1);
    setAddUnit(data?.addUnit || 'days');
    setCompareVariable(data?.compareVariable || '');
    setCompareOperator(data?.compareOperator || 'gt');
    const newVar = data?.outputVariable || generateDefaultVariableName(nodeId, data?.operation || 'get_current');
    setOutputVariable(newVar);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      operation,
      timezone,
      outputFormat,
      sourceVariable,
      addAmount,
      addUnit,
      compareVariable,
      compareOperator,
      outputVariable,
      nodeType,
      label,
    });
  }, [
    nodeId,
    operation,
    timezone,
    outputFormat,
    sourceVariable,
    addAmount,
    addUnit,
    compareVariable,
    compareOperator,
    outputVariable,
  ]);

  const commonTimezones = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT/BRST)' },
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'UTC', label: 'UTC' },
  ];

  const dateFormats = [
    { value: '%Y-%m-%d %H:%M:%S', label: '2024-01-15 14:30:00', description: 'ISO completo' },
    { value: '%Y-%m-%d', label: '2024-01-15', description: 'Apenas data' },
    { value: '%H:%M:%S', label: '14:30:00', description: 'Apenas hora' },
    { value: '%d/%m/%Y', label: '15/01/2024', description: 'Formato BR' },
    { value: '%d/%m/%Y %H:%M', label: '15/01/2024 14:30', description: 'BR com hora' },
    { value: '%A, %d de %B de %Y', label: 'Segunda, 15 de Janeiro de 2024', description: 'Extenso' },
  ];

  const tabs: Tab[] = [
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Operation */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Operação
            </label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="get_current">📅 Obter Data/Hora Atual</option>
              <option value="add">➕ Adicionar Tempo</option>
              <option value="subtract">➖ Subtrair Tempo</option>
              <option value="compare">⚖️ Comparar Datas</option>
              <option value="format">🎨 Formatar Data</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fuso Horário
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {commonTimezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source Variable (for operations that need a date input) */}
          {['add', 'subtract', 'compare', 'format'].includes(operation) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Variável de Data de Origem
              </label>
              <input
                type="text"
                value={sourceVariable}
                onChange={(e) => setSourceVariable(e.target.value)}
                placeholder="ex: appointment_date"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Deixe em branco para usar data/hora atual
              </p>
            </div>
          )}

          {/* Add/Subtract Configuration */}
          {(operation === 'add' || operation === 'subtract') && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={addAmount}
                  onChange={(e) => setAddAmount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unidade
                </label>
                <select
                  value={addUnit}
                  onChange={(e) => setAddUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="days">Dias</option>
                  <option value="months">Meses</option>
                  <option value="years">Anos</option>
                  <option value="hours">Horas</option>
                  <option value="minutes">Minutos</option>
                </select>
              </div>
            </>
          )}

          {/* Compare Configuration */}
          {operation === 'compare' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comparar com Variável
                </label>
                <input
                  type="text"
                  value={compareVariable}
                  onChange={(e) => setCompareVariable(e.target.value)}
                  placeholder="ex: deadline"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Operador de Comparação
                </label>
                <select
                  value={compareOperator}
                  onChange={(e) => setCompareOperator(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="gt">&gt; Maior que</option>
                  <option value="gte">&gt;= Maior ou igual</option>
                  <option value="lt">&lt; Menor que</option>
                  <option value="lte">&lt;= Menor ou igual</option>
                  <option value="eq">= Igual</option>
                </select>
              </div>
            </>
          )}

          {/* Output Format (not for compare operation) */}
          {operation !== 'compare' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Formato de Saída
              </label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {dateFormats.map((fmt) => (
                  <option key={fmt.value} value={fmt.value}>
                    {fmt.label} - {fmt.description}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Python strftime format
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'examples',
      label: 'Exemplos',
      icon: Code,
      content: (
        <div className="space-y-4">
          {/* Get Current Example */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              📅 Obter Data Atual
            </p>
            <code className="block px-2 py-1.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs text-blue-900 dark:text-blue-300 whitespace-pre-wrap">
              Resultado: "2024-01-15 14:30:00"
            </code>
          </div>

          {/* Add Example */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              ➕ Adicionar Tempo
            </p>
            <code className="block px-2 py-1.5 bg-green-100 dark:bg-green-900/40 rounded text-xs text-green-900 dark:text-green-300 whitespace-pre-wrap">
              Hoje + 7 dias = "2024-01-22 14:30:00"
            </code>
          </div>

          {/* Subtract Example */}
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-xs font-medium text-orange-900 dark:text-orange-300 mb-2">
              ➖ Subtrair Tempo
            </p>
            <code className="block px-2 py-1.5 bg-orange-100 dark:bg-orange-900/40 rounded text-xs text-orange-900 dark:text-orange-300 whitespace-pre-wrap">
              Hoje - 30 dias = "2023-12-16 14:30:00"
            </code>
          </div>

          {/* Compare Example */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              ⚖️ Comparar Datas
            </p>
            <code className="block px-2 py-1.5 bg-purple-100 dark:bg-purple-900/40 rounded text-xs text-purple-900 dark:text-purple-300 whitespace-pre-wrap">
              Se today &gt; deadline → true/false
            </code>
          </div>

          {/* Format Example */}
          <div className="p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
            <p className="text-xs font-medium text-pink-900 dark:text-pink-300 mb-2">
              🎨 Formatar Data
            </p>
            <code className="block px-2 py-1.5 bg-pink-100 dark:bg-pink-900/40 rounded text-xs text-pink-900 dark:text-pink-300 whitespace-pre-wrap">
              "15/01/2024" ou "Segunda, 15 de Janeiro"
            </code>
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
              placeholder="datetime_result"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-amber-500'
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
              💡 Saída deste nó: <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                {'{'}{'{'} {outputVariable} {'}'}{'}'}
              </code>
            </p>
            <p className="text-xs text-green-800 dark:text-green-400 mb-2">
              {operation === 'compare'
                ? 'Resultado da comparação (true/false) será armazenado.'
                : 'Data/hora formatada será armazenada.'}
            </p>
          </div>

          {/* Use Case */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-300 mb-2">
              📋 Casos de Uso Comuns
            </p>
            <ul className="space-y-1.5 text-xs text-amber-800 dark:text-amber-400">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Agendar follow-up em 3 dias</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Verificar se prazo expirou</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Calcular idade ou dias restantes</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Formatar datas para exibição</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="config" />;
}
