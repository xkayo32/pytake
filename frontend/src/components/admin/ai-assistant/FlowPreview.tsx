/**
 * FlowPreview Component
 *
 * Displays a preview card of a generated flow with import action
 */

import { useState } from 'react';
import { FileText, Download, RotateCcw, Layers } from 'lucide-react';

export interface FlowPreviewProps {
  flowData: {
    name: string;
    description: string;
    canvas_data: {
      nodes: any[];
      edges: any[];
    };
  };
  onImport: (flowName: string) => void;
  onRetry: () => void;
}

export default function FlowPreview({ flowData, onImport, onRetry }: FlowPreviewProps) {
  const [customName, setCustomName] = useState(flowData.name);
  const [showRenameInput, setShowRenameInput] = useState(false);

  const nodeCount = flowData.canvas_data.nodes.length;
  const edgeCount = flowData.canvas_data.edges.length;

  // Extract unique node types for tags
  const nodeTypes = Array.from(
    new Set(
      flowData.canvas_data.nodes
        .map((n) => n.data?.nodeType)
        .filter(Boolean)
    )
  );

  const handleImport = () => {
    onImport(customName);
  };

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          {showRenameInput ? (
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onBlur={() => setShowRenameInput(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowRenameInput(false);
                }
              }}
              className="w-full px-2 py-1 text-sm font-semibold bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          ) : (
            <h3
              className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              onClick={() => setShowRenameInput(true)}
              title="Clique para renomear"
            >
              {customName}
            </h3>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {flowData.description}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          <span>{nodeCount} nós</span>
        </div>
        <div className="flex items-center gap-1">
          <span>•</span>
          <span>{edgeCount} conexões</span>
        </div>
      </div>

      {/* Tags */}
      {nodeTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {nodeTypes.slice(0, 5).map((type) => (
            <span
              key={type}
              className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full"
            >
              {type}
            </span>
          ))}
          {nodeTypes.length > 5 && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
              +{nodeTypes.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleImport}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Importar Flow
        </button>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
          title="Tentar novamente"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
