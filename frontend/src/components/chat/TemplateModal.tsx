'use client';

import { useState, useEffect } from 'react';
import { whatsappAPI, conversationsAPI } from '@/lib/api';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  whatsappNumberId: string;
  onTemplateSent?: () => void;
}

interface Template {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

export default function TemplateModal({
  isOpen,
  onClose,
  conversationId,
  whatsappNumberId,
  onTemplateSent,
}: TemplateModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen && whatsappNumberId) {
      loadTemplates();
    }
  }, [isOpen, whatsappNumberId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await whatsappAPI.listTemplates(whatsappNumberId);
      setTemplates(response.data || []);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar templates');
    } finally {
      setIsLoading(false);
    }
  };

  const extractVariables = (template: Template) => {
    const vars: string[] = [];

    template.components?.forEach((component: any) => {
      if (component.type === 'BODY' && component.text) {
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach((match: string) => {
            const varNum = match.replace(/[{}]/g, '');
            if (!vars.includes(varNum)) {
              vars.push(varNum);
            }
          });
        }
      }
    });

    return vars.sort();
  };

  const getTemplatePreview = (template: Template) => {
    let preview = '';

    template.components?.forEach((component: any) => {
      if (component.type === 'HEADER' && component.text) {
        preview += `*${component.text}*\n\n`;
      }
      if (component.type === 'BODY' && component.text) {
        let bodyText = component.text;

        // Replace variables with values or placeholders
        Object.keys(variables).forEach((key) => {
          const placeholder = `{{${key}}}`;
          bodyText = bodyText.replace(
            placeholder,
            variables[key] || placeholder
          );
        });

        preview += `${bodyText}\n\n`;
      }
      if (component.type === 'FOOTER' && component.text) {
        preview += `_${component.text}_`;
      }
    });

    return preview;
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setError(null);

    // Initialize variables
    const vars = extractVariables(template);
    const initialVars: { [key: string]: string } = {};
    vars.forEach((v) => {
      initialVars[v] = '';
    });
    setVariables(initialVars);
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate) return;

    setIsSending(true);
    setError(null);

    try {
      // Build template components
      const components: any[] = [];

      const bodyComponent = selectedTemplate.components?.find(
        (c: any) => c.type === 'BODY'
      );

      if (bodyComponent) {
        const parameters = Object.keys(variables)
          .sort()
          .map((key) => ({
            type: 'text',
            text: variables[key] || '',
          }));

        components.push({
          type: 'body',
          parameters,
        });
      }

      // Send template message
      await conversationsAPI.sendMessage(conversationId, {
        message_type: 'template',
        content: {
          name: selectedTemplate.name,
          language: selectedTemplate.language,
          components,
        },
      });

      // Success
      onTemplateSent?.();
      onClose();
    } catch (err: any) {
      console.error('Error sending template:', err);
      setError(err.response?.data?.detail || 'Erro ao enviar template');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Selecionar Template
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Template List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Templates Aprovados
              </h3>

              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Carregando templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum template aprovado encontrado
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.category} • {template.language}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Template Preview & Variables */}
            <div>
              {selectedTemplate ? (
                <>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Preview & Variáveis
                  </h3>

                  {/* Variables Form */}
                  {extractVariables(selectedTemplate).length > 0 && (
                    <div className="mb-4 space-y-3">
                      {extractVariables(selectedTemplate).map((varNum) => (
                        <div key={varNum}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Variável {varNum}
                          </label>
                          <input
                            type="text"
                            value={variables[varNum] || ''}
                            onChange={(e) =>
                              setVariables({ ...variables, [varNum]: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder={`Valor para {{${varNum}}}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      PREVIEW
                    </div>
                    <div className="text-sm whitespace-pre-line text-gray-900">
                      {getTemplatePreview(selectedTemplate)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Selecione um template para ver o preview
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={isSending}
          >
            Cancelar
          </button>
          <button
            onClick={handleSendTemplate}
            disabled={!selectedTemplate || isSending}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? 'Enviando...' : 'Enviar Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
