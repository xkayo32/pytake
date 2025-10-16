/**
 * TemplateDetailModal - Detailed view of a template with import functionality
 */

import React, { useState } from 'react';
import {
  X,
  Clock,
  Layers,
  Star,
  TrendingUp,
  Check,
  AlertCircle,
  Download,
  Loader2,
  Variable,
  Zap,
} from 'lucide-react';
import type { FlowTemplate } from '@/types/template';

interface TemplateDetailModalProps {
  template: FlowTemplate;
  onClose: () => void;
  onImport: (flowName?: string) => Promise<void>;
}

const COMPLEXITY_CONFIG = {
  simple: {
    label: 'Simples',
    color: 'bg-green-100 text-green-700 border-green-300',
    dotColor: 'bg-green-500',
  },
  medium: {
    label: 'Médio',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    dotColor: 'bg-yellow-500',
  },
  complex: {
    label: 'Complexo',
    color: 'bg-red-100 text-red-700 border-red-300',
    dotColor: 'bg-red-500',
  },
};

export default function TemplateDetailModal({
  template,
  onClose,
  onImport,
}: TemplateDetailModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [customFlowName, setCustomFlowName] = useState(template.name);
  const [showImportForm, setShowImportForm] = useState(false);

  const complexityConfig = COMPLEXITY_CONFIG[template.complexity];

  const handleImport = async () => {
    try {
      setIsImporting(true);
      await onImport(customFlowName);
    } catch (error) {
      console.error('Error importing template:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {template.name}
              </h2>
              {template.use_count > 100 && (
                <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-medium px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  Popular
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {template.category}
                {template.subcategory && ` > ${template.subcategory}`}
              </span>
              <div
                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${complexityConfig.color}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${complexityConfig.dotColor}`} />
                {complexityConfig.label}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preview Image */}
          {(template.preview_image_url || template.thumbnail_url) && (
            <div className="w-full h-64 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden">
              <img
                src={template.preview_image_url || template.thumbnail_url}
                alt={template.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Descrição
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {template.description}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Tempo</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {template.estimated_setup_time}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Layers className="w-4 h-4" />
                <span className="text-xs font-medium">Nós</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {template.node_count}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Star className="w-4 h-4" />
                <span className="text-xs font-medium">Avaliação</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {template.rating > 0 ? template.rating.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Usos</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {template.use_count}
              </p>
            </div>
          </div>

          {/* Features */}
          {template.features.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Recursos Incluídos
              </h3>
              <ul className="space-y-2">
                {template.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Variables */}
          {template.variables_used.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Variable className="w-4 h-4" />
                Variáveis Utilizadas
              </h3>
              <div className="flex flex-wrap gap-2">
                {template.variables_used.map((variable, index) => (
                  <code
                    key={index}
                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-md font-mono"
                  >
                    {`{{${variable}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Integrations */}
          {template.requires_integrations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Integrações Necessárias
              </h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      Este template requer as seguintes integrações configuradas:
                    </p>
                    <ul className="space-y-1">
                      {template.requires_integrations.map((integration, index) => (
                        <li
                          key={index}
                          className="text-sm text-amber-700 dark:text-amber-300"
                        >
                          • {integration}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          {template.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Import Form */}
          {showImportForm && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Nome do Fluxo (opcional)
              </label>
              <input
                type="text"
                value={customFlowName}
                onChange={(e) => setCustomFlowName(e.target.value)}
                placeholder={template.name}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Deixe em branco para usar o nome padrão do template
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          {!showImportForm ? (
            <button
              onClick={() => setShowImportForm(true)}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Importar Template
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirmar Importação
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
