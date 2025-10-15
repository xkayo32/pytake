'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  Trash2,
  Copy,
  Calendar,
  Globe,
  Tag,
  FileText,
  MessageSquare,
  Phone,
  Link as LinkIcon,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  body_text: string;
  header_text?: string;
  footer_text?: string;
  body_variables_count: number;
  header_variables_count?: number;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  sent_count: number;
  components?: any[];
}

interface Button {
  type: string;
  text: string;
  phone_number?: string;
  url?: string;
}

export default function TemplateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const templateId = params?.id as string;
  const numberId = searchParams?.get('number');

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);

  // Test send state
  const [testPhone, setTestPhone] = useState('');
  const [testVariables, setTestVariables] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!numberId || !templateId) {
      router.push('/admin/whatsapp/templates');
      return;
    }
    loadTemplate();
  }, [isAuthenticated, authLoading, numberId, templateId, router]);

  const loadTemplate = async () => {
    if (!numberId || !templateId) return;

    setLoading(true);
    try {
      const response = await api.get(
        `/whatsapp/${numberId}/templates/${templateId}`
      );
      const templateData = response.data;
      setTemplate(templateData);

      // Initialize test variables array
      if (templateData.body_variables_count > 0) {
        setTestVariables(new Array(templateData.body_variables_count).fill(''));
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error);
      alert('Erro ao carregar template. Redirecionando...');
      router.push('/admin/whatsapp/templates');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async () => {
    if (!template || !numberId) return;

    if (
      !confirm(
        `Tem certeza que deseja excluir o template "${template.name}"?\n\n` +
          `Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/whatsapp/${numberId}/templates/${template.id}`);
      alert('Template excluído com sucesso!');
      router.push('/admin/whatsapp/templates');
    } catch (error: any) {
      console.error('Erro ao excluir template:', error);
      alert(
        `Erro ao excluir: ${error.response?.data?.detail || error.message}`
      );
    }
  };

  const sendTestMessage = async () => {
    if (!template || !numberId || !testPhone) {
      alert('Por favor, preencha o número de telefone.');
      return;
    }

    // Validate all variables are filled
    if (template.body_variables_count > 0) {
      const hasEmptyVariables = testVariables.some((v) => !v || v.trim() === '');
      if (hasEmptyVariables) {
        alert('Por favor, preencha todas as variáveis.');
        return;
      }
    }

    setSendingTest(true);
    try {
      await api.post(`/whatsapp/${numberId}/templates/${template.id}/send`, {
        phone_number: testPhone,
        variables: testVariables,
      });

      alert('Mensagem de teste enviada com sucesso! ✅');
      setTestPhone('');
      setTestVariables(new Array(template.body_variables_count).fill(''));

      // Reload to update sent_count
      await loadTemplate();
    } catch (error: any) {
      console.error('Erro ao enviar teste:', error);
      alert(
        `Erro ao enviar: ${error.response?.data?.detail || error.message}`
      );
    } finally {
      setSendingTest(false);
    }
  };

  const copyTemplateName = () => {
    if (template) {
      navigator.clipboard.writeText(template.name);
      alert('Nome copiado para área de transferência!');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'REJECTED':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'DRAFT':
        return <AlertCircle className="w-6 h-6 text-gray-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      APPROVED: 'bg-green-100 text-green-800 border-green-300',
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
      DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    return (
      <span
        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
          colors[status as keyof typeof colors] || colors.DRAFT
        }`}
      >
        {status}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      MARKETING: 'bg-blue-100 text-blue-800 border-blue-300',
      UTILITY: 'bg-green-100 text-green-800 border-green-300',
      AUTHENTICATION: 'bg-orange-100 text-orange-800 border-orange-300',
    };

    return (
      <span
        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
          colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {category}
      </span>
    );
  };

  const renderButtons = () => {
    if (!template?.components) return null;

    const buttonsComponent = template.components.find(
      (c: any) => c.type === 'BUTTONS'
    );
    if (!buttonsComponent?.buttons) return null;

    return (
      <div className="mt-4 space-y-2">
        {buttonsComponent.buttons.map((button: Button, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            {button.type === 'QUICK_REPLY' && (
              <MessageSquare className="w-4 h-4 text-blue-600" />
            )}
            {button.type === 'URL' && (
              <LinkIcon className="w-4 h-4 text-green-600" />
            )}
            {button.type === 'PHONE_NUMBER' && (
              <Phone className="w-4 h-4 text-orange-600" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {button.text}
              </p>
              {button.url && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {button.url}
                </p>
              )}
              {button.phone_number && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {button.phone_number}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              {button.type.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderPreviewText = () => {
    if (!template) return '';

    let preview = '';

    if (template.header_text) {
      preview += `*${template.header_text}*\n\n`;
    }

    if (template.body_text) {
      let bodyText = template.body_text;

      // Replace variables with test values or placeholders
      for (let i = 0; i < template.body_variables_count; i++) {
        const variablePattern = new RegExp(`\\{\\{${i + 1}\\}\\}`, 'g');
        const replacement = testVariables[i] || `{{${i + 1}}}`;
        bodyText = bodyText.replace(variablePattern, replacement);
      }

      preview += `${bodyText}\n\n`;
    }

    if (template.footer_text) {
      preview += `_${template.footer_text}_`;
    }

    return preview;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Carregando template...
          </p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Template não encontrado
          </h2>
          <button
            onClick={() => router.push('/admin/whatsapp/templates')}
            className="mt-4 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            Voltar para Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/whatsapp/templates')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(template.status)}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {template.name}
                </h1>
                <button
                  onClick={copyTemplateName}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Copiar nome"
                >
                  <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Detalhes e configurações do template
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={deleteTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Info */}
          <div className="space-y-6">
            {/* Status & Category */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Informações Gerais
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Status
                  </label>
                  {getStatusBadge(template.status)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Categoria
                  </label>
                  {getCategoryBadge(template.category)}
                </div>

                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">Idioma: {template.language}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">
                    Variáveis: {template.body_variables_count}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Send className="w-4 h-4" />
                  <span className="text-sm">Enviados: {template.sent_count}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Criado em:{' '}
                    {new Date(template.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {template.approved_at && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">
                      Aprovado em:{' '}
                      {new Date(template.approved_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                {template.rejected_reason && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                          Motivo da Rejeição:
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-400">
                          {template.rejected_reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Template Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Conteúdo do Template
              </h2>

              <div className="space-y-4">
                {template.header_text && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      📌 Cabeçalho
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-900 dark:text-gray-100 font-bold">
                        {template.header_text}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    📝 Corpo
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {template.body_text}
                    </p>
                  </div>
                </div>

                {template.footer_text && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      🔖 Rodapé
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400 italic">
                        {template.footer_text}
                      </p>
                    </div>
                  </div>
                )}

                {renderButtons()}
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Test */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Preview da Mensagem
              </h2>

              <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
                <div className="max-w-sm w-full">
                  {/* WhatsApp Message Bubble */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-4 relative">
                    <div className="absolute -top-2 left-4 w-4 h-4 bg-white dark:bg-gray-700 transform rotate-45"></div>

                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
                      {renderPreviewText()}
                    </div>

                    {template.components?.find((c: any) => c.type === 'BUTTONS') && (
                      <div className="mt-3 space-y-1">
                        {template.components
                          .find((c: any) => c.type === 'BUTTONS')
                          ?.buttons?.map((btn: Button, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-center gap-2 p-2 bg-white dark:bg-gray-600 border border-blue-500 rounded text-blue-600 dark:text-blue-400 text-sm font-medium"
                            >
                              {btn.type === 'URL' && <LinkIcon className="w-3 h-3" />}
                              {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3" />}
                              {btn.text}
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-400 text-right">
                      {new Date().toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Send - Only for APPROVED templates */}
            {template.status === 'APPROVED' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Enviar Mensagem de Teste
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Número de Telefone
                    </label>
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+5511999999999"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white"
                    />
                  </div>

                  {template.body_variables_count > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Variáveis
                      </label>
                      <div className="space-y-2">
                        {Array.from(
                          { length: template.body_variables_count },
                          (_, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400 font-mono w-12">
                                {'{{' + (i + 1) + '}}'}
                              </span>
                              <input
                                type="text"
                                value={testVariables[i] || ''}
                                onChange={(e) => {
                                  const newVars = [...testVariables];
                                  newVars[i] = e.target.value;
                                  setTestVariables(newVars);
                                }}
                                placeholder={`Valor para variável ${i + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-gray-900 dark:focus:border-white"
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={sendTestMessage}
                    disabled={sendingTest || !testPhone}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Send className="w-5 h-5" />
                    {sendingTest ? 'Enviando...' : 'Enviar Teste'}
                  </button>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-medium mb-1">Importante:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>
                            Templates só podem ser enviados para números que já
                            conversaram com você nas últimas 24h
                          </li>
                          <li>Custos de mensagem podem ser aplicados pela Meta</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Info for non-approved templates */}
            {template.status !== 'APPROVED' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                      Template não disponível para envio
                    </h3>
                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                      {template.status === 'PENDING' &&
                        'Aguardando aprovação do Meta. Geralmente leva 24-48 horas.'}
                      {template.status === 'REJECTED' &&
                        'Template foi rejeitado pelo Meta. Verifique o motivo acima.'}
                      {template.status === 'DRAFT' &&
                        'Template está em rascunho. Envie para aprovação do Meta primeiro.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
