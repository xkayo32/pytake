'use client';

import { Edit3, Variable, Info } from 'lucide-react';
import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface VariablesPanelProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId?: string | null;
}

interface FlowVariable {
  name: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

// Extrair variável de um nó
const getNodeVariable = (node: Node): FlowVariable | null => {
  const nodeType = node.data?.nodeType;
  const nodeLabel = node.data?.label || 'Nó';

  let varName: string | null = null;

  switch (nodeType) {
    case 'question':
      varName = node.data?.outputVariable;
      break;
    case 'set_variable':
      varName = node.data?.variableName;
      break;
    case 'ai_prompt':
      varName = node.data?.outputVariable;
      break;
    case 'api_call':
      varName = node.data?.outputVariable;
      break;
    case 'database_query':
      varName = node.data?.outputVariable;
      break;
    default:
      return null;
  }

  if (!varName) return null;

  return {
    name: varName,
    nodeId: node.id,
    nodeLabel: typeof nodeLabel === 'string' ? nodeLabel : nodeType,
    nodeType,
  };
};

// Ordenação topológica dos nós para determinar ordem de execução
const getTopologicalOrder = (nodes: Node[], edges: Edge[]): string[] => {
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Inicializar
  nodes.forEach((node) => {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Construir grafo
  edges.forEach((edge) => {
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Kahn's algorithm
  const queue: string[] = [];
  const result: string[] = [];

  // Encontrar nós sem predecessores
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);

    adjList.get(nodeId)?.forEach((neighbor) => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    });
  }

  return result;
};

export default function VariablesPanel({
  nodes,
  edges,
  selectedNodeId,
}: VariablesPanelProps) {
  // Calcular variáveis disponíveis
  const availableVariables = useMemo(() => {
    const order = getTopologicalOrder(nodes, edges);
    const variables: FlowVariable[] = [];

    // Encontrar posição do nó selecionado
    const selectedIndex = selectedNodeId ? order.indexOf(selectedNodeId) : order.length;

    // Apenas variáveis de nós ANTES do nó selecionado
    for (let i = 0; i < selectedIndex; i++) {
      const nodeId = order[i];
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        const variable = getNodeVariable(node);
        if (variable) {
          variables.push(variable);
        }
      }
    }

    return variables;
  }, [nodes, edges, selectedNodeId]);

  // Variáveis do sistema (sempre disponíveis)
  const systemVariables = [
    { name: 'contact.name', description: 'Nome do contato' },
    { name: 'contact.phone', description: 'Telefone do contato' },
    { name: 'contact.email', description: 'Email do contato' },
    { name: 'conversation.id', description: 'ID da conversa' },
    { name: 'current_time', description: 'Data/hora atual' },
    { name: 'current_date', description: 'Data atual' },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Variable className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Variáveis Disponíveis
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {selectedNodeId
            ? 'Variáveis criadas antes deste nó'
            : 'Selecione um nó para ver variáveis disponíveis'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* System Variables */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            Sistema
          </h4>
          <div className="space-y-1">
            {systemVariables.map((v) => (
              <div
                key={v.name}
                className="group px-2.5 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                title={v.description}
              >
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-blue-700 dark:text-blue-300 flex-1">
                    {`{{${v.name}}}`}
                  </code>
                  <Info className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Flow Variables */}
        {availableVariables.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
              Fluxo ({availableVariables.length})
            </h4>
            <div className="space-y-1">
              {availableVariables.map((v, idx) => (
                <div
                  key={`${v.nodeId}-${idx}`}
                  className="group px-2.5 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3 h-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <code className="text-xs font-mono text-purple-700 dark:text-purple-300 flex-1">
                      {`{{${v.name}}}`}
                    </code>
                  </div>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 pl-5">
                    Criado por: {v.nodeLabel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {availableVariables.length === 0 && selectedNodeId && (
          <div className="text-center py-6">
            <Variable className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nenhuma variável disponível antes deste nó
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Adicione nós que criam variáveis (Pergunta, Variável, IA, API, etc.)
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-900">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            Use a sintaxe <code className="px-1 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded">{`{{nome}}`}</code> para referenciar variáveis em campos de texto
          </p>
        </div>
      </div>
    </div>
  );
}
