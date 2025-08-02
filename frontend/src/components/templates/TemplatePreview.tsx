import React, { useState } from 'react';
import {
  X,
  Send,
  Variable,
  AlertCircle,
  Copy,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import type { Template, TemplateVariable } from '@/types/template';

interface TemplatePreviewProps {
  template: Template;
  onClose: () => void;
  onUse?: (variables: Record<string, string>) => void;
  showUseButton?: boolean;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  onClose,
  onUse,
  showUseButton = true
}) => {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Initialize variables with default values
  React.useEffect(() => {
    if (template.variables) {
      const defaultVars: Record<string, string> = {};
      template.variables.forEach((v: TemplateVariable) => {
        defaultVars[v.name] = v.default_value || '';
      });
      setVariables(defaultVars);
    }
  }, [template]);

  const getProcessedContent = () => {
    let content = template.content;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value || `{{${key}}}`);
    });
    return content;
  };

  const validateVariables = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (template.variables) {
      template.variables.forEach((v: TemplateVariable) => {
        if (v.required && !variables[v.name]?.trim()) {
          newErrors[v.name] = 'Este campo é obrigatório';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUse = () => {
    if (!onUse) return;
    
    if (validateVariables()) {
      onUse(variables);
    }
  };

  const handleCopy = async () => {
    const content = getProcessedContent();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateVariable = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {template.name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-500">
                Categoria: {template.category}
              </span>
              {template.shortcut && (
                <span className="text-sm text-blue-600">
                  Atalho: {template.shortcut}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Variables Form */}
            {template.variables && template.variables.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <Variable className="h-4 w-4 mr-1" />
                  Preencha as variáveis
                </h3>
                <div className="space-y-3">
                  {template.variables.map((variable: TemplateVariable) => (
                    <div key={variable.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {variable.description || variable.name}
                        {variable.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        value={variables[variable.name] || ''}
                        onChange={(e) => updateVariable(variable.name, e.target.value)}
                        placeholder={variable.default_value || `Digite ${variable.name}...`}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[variable.name] ? 'border-red-500' : ''
                        }`}
                      />
                      {errors[variable.name] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {errors[variable.name]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <MessageSquare className="h-4 w-4 mr-1" />
                Pré-visualização
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <p className="whitespace-pre-wrap text-gray-800">
                    {getProcessedContent()}
                  </p>
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div className="text-sm text-gray-500 space-y-1">
              <p>Criado por: Usuário #{template.created_by}</p>
              <p>Usos: {template.usage_count}</p>
              <p>Última atualização: {new Date(template.updated_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="inline-flex items-center px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Texto
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Fechar
            </button>
            {onUse && showUseButton && (
              <button
                onClick={handleUse}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Usar Template
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;