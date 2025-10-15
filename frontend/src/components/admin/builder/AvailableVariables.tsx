'use client';

import { useMemo } from 'react';
import { Variable, Info } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

interface AvailableVariablesProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId?: string | null;
  compact?: boolean;
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

// Ordenação topológica dos nós
const getTopologicalOrder = (nodes: Node[], edges: Edge[]): string[] => {
  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    adjList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  const queue: string[] = [];
  const result: string[] = [];

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

export default function AvailableVariables({
  nodes,
  edges,
  selectedNodeId,
  compact = false,
}: AvailableVariablesProps) {
  // Calcular variáveis disponíveis
  const { flowVariables, systemVariables } = useMemo(() => {
    const order = getTopologicalOrder(nodes, edges);
    const flowVars: FlowVariable[] = [];

    // Encontrar posição do nó selecionado
    const selectedIndex = selectedNodeId ? order.indexOf(selectedNodeId) : order.length;

    // Apenas variáveis de nós ANTES do nó selecionado
    for (let i = 0; i < selectedIndex; i++) {
      const nodeId = order[i];
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        const variable = getNodeVariable(node);
        if (variable) {
          flowVars.push(variable);
        }
      }
    }

    const systemVars = [
      'contact.name',
      'contact.phone',
      'contact.email',
      'conversation.id',
      'current_time',
      'current_date',
    ];

    return {
      flowVariables: flowVars,
      systemVariables: systemVars,
    };
  }, [nodes, edges, selectedNodeId]);

  const totalVariables = systemVariables.length + flowVariables.length;

  if (compact) {
    return (
      <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
        <div className="flex items-center gap-2 text-xs">
          <Variable className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span className="text-indigo-700 dark:text-indigo-300 font-medium">
            {totalVariables} variável{totalVariables !== 1 ? 'eis' : ''} disponível
            {totalVariables !== 1 ? 'is' : ''}:
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {systemVariables.map((varName) => (
            <code
              key={varName}
              className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
              title="Variável do sistema"
            >
              {`{{${varName}}}`}
            </code>
          ))}
          {flowVariables.map((v, idx) => (
            <code
              key={`${v.nodeId}-${idx}`}
              className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs font-mono"
              title={`Criado por: ${v.nodeLabel}`}
            >
              {`{{${v.name}}}`}
            </code>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* System Variables */}
      <div>
        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          Sistema ({systemVariables.length})
        </h5>
        <div className="flex flex-wrap gap-1.5">
          {systemVariables.map((varName) => (
            <code
              key={varName}
              className="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-xs font-mono transition-colors cursor-pointer"
              title="Clique para copiar"
              onClick={() => {
                navigator.clipboard.writeText(`{{${varName}}}`);
              }}
            >
              {`{{${varName}}}`}
            </code>
          ))}
        </div>
      </div>

      {/* Flow Variables */}
      {flowVariables.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
            Fluxo ({flowVariables.length})
          </h5>
          <div className="space-y-1.5">
            {flowVariables.map((v, idx) => (
              <div
                key={`${v.nodeId}-${idx}`}
                className="group flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded transition-colors cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(`{{${v.name}}}`);
                }}
                title="Clique para copiar"
              >
                <Variable className="w-3 h-3 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono text-purple-700 dark:text-purple-300 font-semibold">
                    {`{{${v.name}}}`}
                  </code>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                    {v.nodeLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {flowVariables.length === 0 && (
        <div className="text-center py-3">
          <Info className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nenhuma variável do fluxo disponível
          </p>
        </div>
      )}

      {/* Usage Info */}
      <div className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          💡 <strong>Clique</strong> em qualquer variável para copiar. Use{' '}
          <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">
            {`{{nome}}`}
          </code>{' '}
          nos campos de texto.
        </p>
      </div>
    </div>
  );
}
