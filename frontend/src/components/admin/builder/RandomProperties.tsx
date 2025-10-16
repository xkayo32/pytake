'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Settings, GitBranch, Plus, Trash2, AlertCircle, BarChart3 } from 'lucide-react';
import type { Node } from '@xyflow/react';

interface RandomPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
  nodes: Node[];
}

interface RandomPath {
  id: string;
  name: string;
  weight: number;
  targetNodeId: string;
}

const generateDefaultVariableName = (nodeId: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `random_variant_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function RandomProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
  nodes,
}: RandomPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [paths, setPaths] = useState<RandomPath[]>(
    data?.paths || [
      { id: 'path_a', name: 'Caminho A', weight: 50, targetNodeId: '' },
      { id: 'path_b', name: 'Caminho B', weight: 50, targetNodeId: '' },
    ]
  );
  const [saveToVariable, setSaveToVariable] = useState(data?.saveToVariable || '');
  const [outputVariable, setOutputVariable] = useState(() => {
    return data?.outputVariable || generateDefaultVariableName(nodeId);
  });
  const [useSeeded, setUseSeeded] = useState(data?.useSeeded ?? false);
  const [seed, setSeed] = useState(data?.seed || '');
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setPaths(
      data?.paths || [
        { id: 'path_a', name: 'Caminho A', weight: 50, targetNodeId: '' },
        { id: 'path_b', name: 'Caminho B', weight: 50, targetNodeId: '' },
      ]
    );
    setSaveToVariable(data?.saveToVariable || '');
    const newVar = data?.outputVariable || generateDefaultVariableName(nodeId);
    setOutputVariable(newVar);
    setUseSeeded(data?.useSeeded ?? false);
    setSeed(data?.seed || '');
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      paths,
      saveToVariable,
      outputVariable,
      useSeeded,
      seed,
      nodeType,
      label,
    });
  }, [nodeId, paths, saveToVariable, outputVariable, useSeeded, seed]);

  const addPath = () => {
    const newPathId = `path_${Date.now()}`;
    setPaths([
      ...paths,
      { id: newPathId, name: `Caminho ${paths.length + 1}`, weight: 10, targetNodeId: '' },
    ]);
  };

  const removePath = (pathId: string) => {
    if (paths.length <= 2) return; // Minimum 2 paths
    setPaths(paths.filter((p) => p.id !== pathId));
  };

  const updatePath = (pathId: string, field: keyof RandomPath, value: any) => {
    setPaths(
      paths.map((p) => (p.id === pathId ? { ...p, [field]: value } : p))
    );
  };

  // Calculate total weight and percentages
  const totalWeight = paths.reduce((sum, path) => sum + path.weight, 0);

  // Get available nodes for targeting
  const availableNodes = nodes.filter((n) => n.id !== nodeId);

  const tabs: Tab[] = [
    {
      id: 'paths',
      label: 'Caminhos',
      icon: GitBranch,
      content: (
        <div className="space-y-4">
          {/* Paths List */}
          <div className="space-y-3">
            {paths.map((path, index) => (
              <div
                key={path.id}
                className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Caminho {index + 1}
                  </span>
                  {paths.length > 2 && (
                    <button
                      onClick={() => removePath(path.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Name */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Caminho
                  </label>
                  <input
                    type="text"
                    value={path.name}
                    onChange={(e) => updatePath(path.id, 'name', e.target.value)}
                    placeholder="Ex: Oferta Premium"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  />
                </div>

                {/* Weight */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Peso ({totalWeight > 0 ? Math.round((path.weight / totalWeight) * 100) : 0}%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={path.weight}
                    onChange={(e) => updatePath(path.id, 'weight', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  />
                </div>

                {/* Target Node */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nó de Destino
                  </label>
                  <select
                    value={path.targetNodeId}
                    onChange={(e) => updatePath(path.id, 'targetNodeId', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  >
                    <option value="">Selecione um nó</option>
                    {availableNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.data?.label || node.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Add Path Button */}
          <button
            onClick={addPath}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-lime-600 hover:bg-lime-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Caminho
          </button>

          {/* Total Weight Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-1">
              Peso Total: {totalWeight}
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-400">
              Maior peso = maior probabilidade de ser escolhido
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'advanced',
      label: 'Avançado',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Save to Variable */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Salvar Variante em Variável (Opcional)
            </label>
            <input
              type="text"
              value={saveToVariable}
              onChange={(e) => setSaveToVariable(e.target.value)}
              placeholder="ex: ab_test_variant"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                !saveToVariable || validateSnakeCase(saveToVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-lime-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-900 dark:text-red-400 focus:ring-red-500'
              }`}
            />
            {saveToVariable && !validateSnakeCase(saveToVariable) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                ⚠️ Use apenas letras minúsculas, números e underscore (_). Deve começar com letra.
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              O ID do caminho escolhido será armazenado nesta variável
            </p>
          </div>

          {/* Use Seeded Random */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="useSeeded"
              checked={useSeeded}
              onChange={(e) => setUseSeeded(e.target.checked)}
              className="mt-1 w-4 h-4 text-lime-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-lime-500"
            />
            <div className="flex-1">
              <label
                htmlFor="useSeeded"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Usar Seed para Reproduzir Resultados
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Gera o mesmo caminho para o mesmo usuário (útil para testes consistentes)
              </p>
            </div>
          </div>

          {/* Seed Source */}
          {useSeeded && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Variável para Seed
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="ex: contact_id"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent font-mono"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Usa o valor desta variável como seed para randomização
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
          {/* Output Variable */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Variável de Saída
            </label>
            <input
              type="text"
              value={outputVariable}
              onChange={(e) => setOutputVariable(e.target.value)}
              placeholder="random_selected"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-lime-500'
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
              Nome do caminho selecionado será armazenado nesta variável.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-green-800 dark:text-green-400">
              {paths.map((path) => (
                <div key={path.id} className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                    {path.name}
                  </code>
                  <span>→ {Math.round((path.weight / totalWeight) * 100)}% chance</span>
                </div>
              ))}
            </div>
          </div>

          {/* Use Case Example */}
          <div className="p-3 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
            <p className="text-xs font-medium text-lime-900 dark:text-lime-300 mb-2">
              📊 Caso de uso: Teste A/B
            </p>
            <p className="text-xs text-lime-800 dark:text-lime-400 mb-2">
              Use este nó para direcionar aleatoriamente usuários para diferentes ofertas:
            </p>
            <ul className="space-y-1 text-xs text-lime-800 dark:text-lime-400">
              <li>• 70% para "Oferta Padrão"</li>
              <li>• 30% para "Oferta Premium"</li>
            </ul>
            <p className="mt-2 text-xs text-lime-800 dark:text-lime-400">
              Depois use Analytics Node para rastrear conversões de cada variante.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="paths" />;
}
