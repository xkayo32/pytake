'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import AvailableVariables from './AvailableVariables';
import { GitBranch, Settings, BarChart3, Plus, Trash2 } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

interface Condition {
  variable: string;
  operator: string;
  value: string;
  label: string;
}

interface ConditionPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
  nodes?: Node[];
  edges?: Edge[];
}

export default function ConditionProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
  nodes = [],
  edges = [],
}: ConditionPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [conditions, setConditions] = useState<Condition[]>(
    data?.conditions || [
      { variable: '', operator: '==', value: '', label: 'Condição 1' },
    ]
  );
  const [logicOperator, setLogicOperator] = useState(data?.logicOperator || 'AND');
  const [hasDefaultRoute, setHasDefaultRoute] = useState(data?.hasDefaultRoute ?? true);
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setConditions(
      data?.conditions || [{ variable: '', operator: '==', value: '', label: 'Condição 1' }]
    );
    setLogicOperator(data?.logicOperator || 'AND');
    setHasDefaultRoute(data?.hasDefaultRoute ?? true);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      conditions,
      logicOperator,
      hasDefaultRoute,
      nodeType,
      label,
    });
  }, [nodeId, conditions, logicOperator, hasDefaultRoute]);

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { variable: '', operator: '==', value: '', label: `Condição ${conditions.length + 1}` },
    ]);
  };

  const handleUpdateCondition = (index: number, field: keyof Condition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const operatorOptions = [
    { value: '==', label: 'Igual a (==)' },
    { value: '!=', label: 'Diferente de (!=)' },
    { value: '>', label: 'Maior que (>)' },
    { value: '<', label: 'Menor que (<)' },
    { value: '>=', label: 'Maior ou igual (>=)' },
    { value: '<=', label: 'Menor ou igual (<=)' },
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
    { value: 'starts_with', label: 'Começa com' },
    { value: 'ends_with', label: 'Termina com' },
    { value: 'is_empty', label: 'Está vazio' },
    { value: 'is_not_empty', label: 'Não está vazio' },
  ];

  const tabs: Tab[] = [
    {
      id: 'conditions',
      label: 'Condições',
      icon: GitBranch,
      badge: conditions.length,
      content: (
        <div className="space-y-4">
          {/* Conditions List */}
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Condição {index + 1}
                  </span>
                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(index)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remover condição"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Variable */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Variável
                  </label>
                  <input
                    type="text"
                    value={condition.variable}
                    onChange={(e) => handleUpdateCondition(index, 'variable', e.target.value)}
                    placeholder="{{nome_da_variavel}}"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                {/* Operator */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Operador
                  </label>
                  <select
                    value={condition.operator}
                    onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {operatorOptions.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value (hidden for is_empty/is_not_empty) */}
                {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Valor
                    </label>
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                      placeholder="Valor para comparar"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Label */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Nome da Saída
                  </label>
                  <input
                    type="text"
                    value={condition.label}
                    onChange={(e) => handleUpdateCondition(index, 'label', e.target.value)}
                    placeholder="Ex: É cliente VIP"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Nome da porta de saída quando esta condição for verdadeira
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Condition Button */}
          <button
            type="button"
            onClick={handleAddCondition}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Condição
          </button>
        </div>
      ),
    },
    {
      id: 'logic',
      label: 'Lógica',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Logic Operator (if multiple conditions) */}
          {conditions.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Operador Lógico
              </label>
              <select
                value={logicOperator}
                onChange={(e) => setLogicOperator(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="AND">AND - Todas devem ser verdadeiras</option>
                <option value="OR">OR - Pelo menos uma deve ser verdadeira</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {logicOperator === 'AND'
                  ? '✅ Todas as condições precisam ser verdadeiras'
                  : '✅ Qualquer condição verdadeira é suficiente'}
              </p>
            </div>
          )}

          {/* Default Route */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="defaultRoute"
              checked={hasDefaultRoute}
              onChange={(e) => setHasDefaultRoute(e.target.checked)}
              className="mt-1 w-4 h-4 text-orange-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex-1">
              <label
                htmlFor="defaultRoute"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Rota Padrão (Senão)
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {hasDefaultRoute
                  ? '✅ Cria uma saída "Senão" para quando nenhuma condição for verdadeira'
                  : '❌ Se nenhuma condição for verdadeira, o fluxo para'}
              </p>
            </div>
          </div>

          {/* Info Card */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              Como funcionam as condições
            </p>
            <div className="space-y-1.5 text-xs text-blue-800 dark:text-blue-400">
              <p>
                • Este nó cria <strong>múltiplas saídas</strong>, uma para cada condição
              </p>
              <p>
                • Conecte cada porta de saída ao nó apropriado
              </p>
              <p>
                • O fluxo segue pela primeira condição verdadeira
              </p>
              <p>
                • A rota padrão é usada se nenhuma condição for verdadeira
              </p>
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
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-xs font-medium text-orange-900 dark:text-orange-300 mb-2">
              Exemplos de Condições
            </p>
            <div className="space-y-2 text-xs text-orange-800 dark:text-orange-400">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded">
                <p className="font-medium mb-1">Verificar se é VIP:</p>
                <p className="font-mono text-xs">
                  {'{'}{'{'} customer_type {'}'}{'}'}  ==  "VIP"
                </p>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded">
                <p className="font-medium mb-1">Verificar idade:</p>
                <p className="font-mono text-xs">
                  {'{'}{'{'} user_age {'}'}{'}'}  {'>'}=  18
                </p>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded">
                <p className="font-medium mb-1">Verificar interesse:</p>
                <p className="font-mono text-xs">
                  {'{'}{'{'} user_response {'}'}{'}'}  contains  "produto"
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              💡 Informação
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Nós de condição não geram variáveis de saída. Eles apenas roteiam o fluxo baseado nas condições.
            </p>
          </div>

          {/* Available Variables */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Variáveis Disponíveis
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

  return <PropertyTabs tabs={tabs} defaultTab="conditions" />;
}
