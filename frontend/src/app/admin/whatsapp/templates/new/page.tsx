'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  ArrowLeft,
  Send,
  Save,
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface ComponentData {
  type: string;
  format?: string;
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    phone_number?: string;
    url?: string;
  }>;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const numberId = searchParams?.get('number');

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [templateName, setTemplateName] = useState('');
  const [language, setLanguage] = useState('pt_BR');
  const [category, setCategory] = useState('UTILITY');
  const [components, setComponents] = useState<ComponentData[]>([
    { type: 'BODY', text: '' },
  ]);

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!numberId) {
      router.push('/admin/whatsapp/templates');
    }
  }, [isAuthenticated, authLoading, numberId, router]);

  useEffect(() => {
    generatePreview();
  }, [components]);

  const validateTemplateName = (name: string): string | null => {
    if (!name) return 'Nome é obrigatório';
    if (name !== name.toLowerCase()) return 'Nome deve ser minúsculo';
    if (!/^[a-z0-9_]+$/.test(name))
      return 'Nome deve conter apenas letras minúsculas, números e underscores';
    if (name.length < 1 || name.length > 512) return 'Nome deve ter entre 1 e 512 caracteres';
    return null;
  };

  const addComponent = (type: string) => {
    if (type === 'HEADER') {
      setComponents([{ type: 'HEADER', format: 'TEXT', text: '' }, ...components]);
    } else if (type === 'FOOTER') {
      const bodyIndex = components.findIndex((c) => c.type === 'BODY');
      const newComponents = [...components];
      newComponents.splice(bodyIndex + 1, 0, { type: 'FOOTER', text: '' });
      setComponents(newComponents);
    } else if (type === 'BUTTONS') {
      setComponents([
        ...components,
        {
          type: 'BUTTONS',
          buttons: [{ type: 'QUICK_REPLY', text: '' }],
        },
      ]);
    }
  };

  const removeComponent = (index: number) => {
    const newComponents = components.filter((_, i) => i !== index);
    setComponents(newComponents);
  };

  const updateComponent = (index: number, field: string, value: any) => {
    const newComponents = [...components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setComponents(newComponents);
  };

  const addButton = (componentIndex: number) => {
    const newComponents = [...components];
    const buttons = newComponents[componentIndex].buttons || [];
    buttons.push({ type: 'QUICK_REPLY', text: '' });
    newComponents[componentIndex].buttons = buttons;
    setComponents(newComponents);
  };

  const updateButton = (
    componentIndex: number,
    buttonIndex: number,
    field: string,
    value: string
  ) => {
    const newComponents = [...components];
    const buttons = newComponents[componentIndex].buttons || [];
    buttons[buttonIndex] = { ...buttons[buttonIndex], [field]: value };
    newComponents[componentIndex].buttons = buttons;
    setComponents(newComponents);
  };

  const removeButton = (componentIndex: number, buttonIndex: number) => {
    const newComponents = [...components];
    const buttons = newComponents[componentIndex].buttons || [];
    buttons.splice(buttonIndex, 1);
    newComponents[componentIndex].buttons = buttons;
    setComponents(newComponents);
  };

  const generatePreview = () => {
    let previewText = '';

    components.forEach((component) => {
      if (component.type === 'HEADER' && component.text) {
        previewText += `*${component.text}*\n\n`;
      } else if (component.type === 'BODY' && component.text) {
        previewText += `${component.text}\n\n`;
      } else if (component.type === 'FOOTER' && component.text) {
        previewText += `_${component.text}_\n\n`;
      } else if (component.type === 'BUTTONS' && component.buttons) {
        component.buttons.forEach((btn, idx) => {
          if (btn.text) {
            previewText += `[${idx + 1}] ${btn.text}\n`;
          }
        });
      }
    });

    setPreview(previewText || 'Digite o conteúdo para ver o preview...');
  };

  const validateTemplate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    const nameError = validateTemplateName(templateName);
    if (nameError) newErrors.name = nameError;

    // Validate body
    const bodyComponent = components.find((c) => c.type === 'BODY');
    if (!bodyComponent?.text || bodyComponent.text.trim() === '') {
      newErrors.body = 'Corpo da mensagem é obrigatório';
    }

    // Validate header
    const headerComponent = components.find((c) => c.type === 'HEADER');
    if (headerComponent && (!headerComponent.text || headerComponent.text.trim() === '')) {
      newErrors.header = 'Se adicionar cabeçalho, o texto é obrigatório';
    }

    // Validate buttons
    const buttonsComponent = components.find((c) => c.type === 'BUTTONS');
    if (buttonsComponent) {
      const buttons = buttonsComponent.buttons || [];
      buttons.forEach((btn, idx) => {
        if (!btn.text || btn.text.trim() === '') {
          newErrors[`button_${idx}`] = `Texto do botão ${idx + 1} é obrigatório`;
        }
        if (btn.type === 'URL' && (!btn.url || btn.url.trim() === '')) {
          newErrors[`button_url_${idx}`] = `URL do botão ${idx + 1} é obrigatória`;
        }
        if (
          btn.type === 'PHONE_NUMBER' &&
          (!btn.phone_number || btn.phone_number.trim() === '')
        ) {
          newErrors[`button_phone_${idx}`] = `Telefone do botão ${idx + 1} é obrigatório`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveTemplate = async (submitToMeta: boolean) => {
    if (!validateTemplate()) {
      alert('Por favor, corrija os erros antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: templateName,
        language,
        category,
        components: components.map((comp) => {
          if (comp.type === 'BUTTONS') {
            return {
              type: comp.type,
              buttons: comp.buttons,
            };
          }
          return comp;
        }),
      };

      await api.post(`/whatsapp/${numberId}/templates?submit=${submitToMeta}`, payload);

      alert(
        submitToMeta
          ? 'Template criado e enviado para aprovação do Meta!\n\nAguarde 24-48h para aprovação.'
          : 'Template salvo como rascunho com sucesso!'
      );

      router.push('/admin/whatsapp/templates');
    } catch (error: any) {
      console.error('Erro ao salvar template:', error);
      alert(`Erro ao salvar template:\n${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Novo Template</h1>
              <p className="text-gray-600 mt-1">
                Crie um template de mensagem para aprovação do Meta
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => saveTemplate(false)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Salvar Rascunho
            </button>
            <button
              onClick={() => saveTemplate(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar para Meta'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuração</h2>

            {/* Template Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Template *
                <HelpCircle
                  className="w-4 h-4 inline ml-1 text-gray-400"
                  title="Nome deve ser minúsculo com underscores (ex: pedido_confirmado)"
                />
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value.toLowerCase())}
                placeholder="ex: pedido_confirmado"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Language & Category */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma *
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white"
                >
                  <option value="pt_BR">Português (BR)</option>
                  <option value="en_US">English (US)</option>
                  <option value="es">Español</option>
                  <option value="pt_PT">Português (PT)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white"
                >
                  <option value="UTILITY">Utilidade</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="AUTHENTICATION">Autenticação</option>
                </select>
              </div>
            </div>

            {/* Add Component Buttons */}
            <div className="flex gap-2 mb-6">
              {!components.find((c) => c.type === 'HEADER') && (
                <button
                  onClick={() => addComponent('HEADER')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Cabeçalho
                </button>
              )}
              {!components.find((c) => c.type === 'FOOTER') && (
                <button
                  onClick={() => addComponent('FOOTER')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Rodapé
                </button>
              )}
              {!components.find((c) => c.type === 'BUTTONS') && (
                <button
                  onClick={() => addComponent('BUTTONS')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Botões
                </button>
              )}
            </div>

            {/* Components */}
            <div className="space-y-4">
              {components.map((component, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {component.type === 'HEADER' && '📌 Cabeçalho'}
                      {component.type === 'BODY' && '📝 Corpo *'}
                      {component.type === 'FOOTER' && '🔖 Rodapé'}
                      {component.type === 'BUTTONS' && '🔘 Botões'}
                    </span>
                    {component.type !== 'BODY' && (
                      <button
                        onClick={() => removeComponent(idx)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {component.type !== 'BUTTONS' && (
                    <textarea
                      value={component.text || ''}
                      onChange={(e) => updateComponent(idx, 'text', e.target.value)}
                      placeholder={
                        component.type === 'BODY'
                          ? 'Digite o texto da mensagem... Use {{1}}, {{2}} para variáveis'
                          : 'Digite o texto...'
                      }
                      rows={component.type === 'BODY' ? 5 : 2}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white resize-none ${
                        (component.type === 'BODY' && errors.body) ||
                        (component.type === 'HEADER' && errors.header)
                          ? 'border-red-500'
                          : 'border-gray-300'
                      }`}
                    />
                  )}

                  {component.type === 'BUTTONS' && (
                    <div className="space-y-3">
                      {component.buttons?.map((button, btnIdx) => (
                        <div key={btnIdx} className="border border-gray-100 rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">
                              Botão {btnIdx + 1}
                            </span>
                            <button
                              onClick={() => removeButton(idx, btnIdx)}
                              className="text-red-600 hover:bg-red-100 p-1 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <select
                            value={button.type}
                            onChange={(e) =>
                              updateButton(idx, btnIdx, 'type', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm"
                          >
                            <option value="QUICK_REPLY">Resposta Rápida</option>
                            <option value="URL">URL</option>
                            <option value="PHONE_NUMBER">Telefone</option>
                          </select>

                          <input
                            type="text"
                            value={button.text}
                            onChange={(e) =>
                              updateButton(idx, btnIdx, 'text', e.target.value)
                            }
                            placeholder="Texto do botão"
                            maxLength={25}
                            className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-sm"
                          />

                          {button.type === 'URL' && (
                            <input
                              type="url"
                              value={button.url || ''}
                              onChange={(e) =>
                                updateButton(idx, btnIdx, 'url', e.target.value)
                              }
                              placeholder="https://exemplo.com"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}

                          {button.type === 'PHONE_NUMBER' && (
                            <input
                              type="tel"
                              value={button.phone_number || ''}
                              onChange={(e) =>
                                updateButton(idx, btnIdx, 'phone_number', e.target.value)
                              }
                              placeholder="+5511999999999"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                          )}
                        </div>
                      ))}

                      {(component.buttons?.length || 0) < 3 && (
                        <button
                          onClick={() => addButton(idx)}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white text-sm"
                        >
                          + Adicionar Botão
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Help Text */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Dicas:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use {'{{1}}'}, {'{{2}}'} para variáveis dinâmicas</li>
                    <li>Meta leva 24-48h para aprovar templates</li>
                    <li>Templates rejeitados não podem ser reenviados</li>
                    <li>Máximo de 3 botões por template</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
              <Eye className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 min-h-[400px]">
              <div className="max-w-sm mx-auto">
                {/* WhatsApp Message Bubble */}
                <div className="bg-white rounded-lg shadow-lg p-4 relative">
                  <div className="absolute -top-2 left-4 w-4 h-4 bg-white transform rotate-45"></div>

                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {preview}
                  </div>

                  <div className="mt-3 text-xs text-gray-400 text-right">
                    {new Date().toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Example Variables */}
                {(() => {
                  const bodyComponent = components.find((c) => c.type === 'BODY');
                  const bodyText = bodyComponent?.text || '';
                  const variableCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length;

                  if (variableCount > 0) {
                    return (
                      <div className="mt-4 bg-white rounded-lg shadow p-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Variáveis detectadas:
                        </p>
                        {Array.from({ length: variableCount }, (_, i) => (
                          <div key={i} className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                              {'{{' + (i + 1) + '}}'}
                            </span>
                            <input
                              type="text"
                              placeholder={`Exemplo: ${
                                i === 0 ? 'João' : i === 1 ? 'Pedido #123' : 'Valor'
                              }`}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                              disabled
                            />
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Validation Status */}
            <div className="mt-4">
              {Object.keys(errors).length > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800 mb-1">
                        Corrija os erros:
                      </p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {Object.values(errors).map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-medium">
                      Template válido! Pronto para enviar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
