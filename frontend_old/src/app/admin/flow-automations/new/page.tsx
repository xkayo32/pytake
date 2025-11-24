'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  ChevronRight,
  ChevronsRight,
  Plus,
  Trash2,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { flowAutomationsAPI } from '@/lib/api/flowAutomationsAPI';
import ScheduleEditor from '@/components/admin/flow-automations/ScheduleEditor';
import type {
  FlowAutomationCreate,
  FlowAutomationScheduleCreate,
  AudienceType,
} from '@/types/flow_automation';

// Types for fetching data
interface Chatbot {
  id: string;
  name: string;
}

interface Flow {
  id: string;
  name: string;
}

interface WhatsAppNumber {
  id: string;
  display_name?: string;
  name?: string;
  phone_number: string;
}

export default function NewFlowAutomationPage() {
  const router = useRouter();

  // ============================================
  // State - Stepper
  // ============================================

  const [step, setStep] = useState<number>(1);

  // ============================================
  // State - Basic Info (Step 1)
  // ============================================

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chatbotId, setChatbotId] = useState<string>('');
  const [flowId, setFlowId] = useState<string>('');
  const [whatsappNumberId, setWhatsappNumberId] = useState<string>('');

  // ============================================
  // State - Audience (Step 2)
  // ============================================

  const [audienceType, setAudienceType] = useState<AudienceType>('custom');
  const [contactIdsText, setContactIdsText] = useState<string>('');

  // ============================================
  // State - Variables (Step 3)
  // ============================================

  const [variableJson, setVariableJson] = useState<string>('{}');
  const [variableError, setVariableError] = useState<string>('');

  // ============================================
  // State - Schedule (Step 4)
  // ============================================

  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  // ============================================
  // State - Data Lists
  // ============================================

  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<WhatsAppNumber[]>([]);

  // ============================================
  // State - Loading/Submitting
  // ============================================

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        // Fetch chatbots and whatsapp numbers
        const [cbRes, waRes] = await Promise.all([
          fetch('/api/v1/chatbots?limit=100', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/v1/whatsapp/numbers', { credentials: 'include' }).then(r => r.json()),
        ]);

        setChatbots(cbRes.items || cbRes.data || []);
        const waNumbers = Array.isArray(waRes) ? waRes : waRes.items || waRes.data || [];
        setWhatsappNumbers(waNumbers);

        if (waNumbers?.[0]?.id) {
          setWhatsappNumberId(waNumbers[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        setError('Erro ao carregar dados. Tente recarregar a página.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Fetch flows when chatbot changes
  useEffect(() => {
    if (!chatbotId) {
      setFlows([]);
      setFlowId('');
      return;
    }

    (async () => {
      try {
        const response = await fetch(`/api/v1/chatbots/${chatbotId}/flows`, {
          credentials: 'include',
        });
        const data = await response.json();
        setFlows(data.items || data.data || []);
      } catch (error) {
        console.error('Erro ao carregar flows:', error);
      }
    })();
  }, [chatbotId]);

  // ============================================
  // Computed Values
  // ============================================

  const parsedVariables = useMemo(() => {
    try {
      const obj = variableJson.trim() ? JSON.parse(variableJson) : {};
      setVariableError('');
      return obj;
    } catch (e: any) {
      setVariableError('JSON inválido nas variáveis');
      return {};
    }
  }, [variableJson]);

  const canGoNextStep1 = useMemo(() => {
    return name.trim().length > 0 && chatbotId && flowId && whatsappNumberId;
  }, [name, chatbotId, flowId, whatsappNumberId]);

  const canGoNextStep2 = useMemo(() => {
    if (audienceType === 'custom') {
      return contactIdsText.trim().length > 0;
    }
    return true;
  }, [audienceType, contactIdsText]);

  const canGoNextStep3 = useMemo(() => {
    return variableError === '';
  }, [variableError]);

  // ============================================
  // Handlers
  // ============================================

  const handleCreate = async () => {
    try {
      setError('');
      setIsSubmitting(true);

      // Parse contact IDs
      let contactIds: string[] = [];
      if (audienceType === 'custom') {
        contactIds = contactIdsText
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }

      // Create automation
      const automationData: FlowAutomationCreate = {
        name,
        description: description || undefined,
        chatbot_id: chatbotId,
        flow_id: flowId,
        whatsapp_number_id: whatsappNumberId,
        audience_type: audienceType,
        audience_config:
          audienceType === 'custom'
            ? { contact_ids: contactIds }
            : {},
        variable_mapping: Object.keys(parsedVariables).length > 0 ? parsedVariables : undefined,
      };

      const automation = await flowAutomationsAPI.create(automationData);

      // If schedule enabled, redirect to schedule page
      if (scheduleEnabled) {
        router.push(`/admin/flow-automations/${automation.id}?tab=schedule`);
      } else {
        router.push('/admin/flow-automations');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar automação');
      console.error('Erro:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // Loading State
  // ============================================

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/flow-automations')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Nova Automação de Fluxo
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure um disparo proativo de flow
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={step !== 4 || !!variableError || isSubmitting}
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-50"
          >
            {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            Criar Automação
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stepper */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { id: 1, label: 'Informações' },
          { id: 2, label: 'Audiência' },
          { id: 3, label: 'Variáveis' },
          { id: 4, label: 'Agendamento' },
        ].map((s) => (
          <div
            key={s.id}
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              step === s.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-800'
            }`}
            onClick={() => setStep(s.id)}
          >
            <div className="text-xs text-gray-500">Etapa {s.id}</div>
            <div className="font-semibold text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-semibold">Informações Básicas</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nome da Automação *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Campanha Promoção Q4"
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chatbot *</label>
              <select
                value={chatbotId}
                onChange={(e) => setChatbotId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              >
                <option value="">Selecione...</option>
                {chatbots.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Flow *</label>
              <select
                value={flowId}
                onChange={(e) => setFlowId(e.target.value)}
                disabled={!chatbotId}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                {flows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Número WhatsApp *</label>
              <select
                value={whatsappNumberId}
                onChange={(e) => setWhatsappNumberId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              >
                <option value="">Selecione...</option>
                {whatsappNumbers.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.display_name || n.name || n.phone_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!canGoNextStep1}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-50"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Audience */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-semibold">Audiência</h2>

          <div>
            <label className="block text-sm font-medium mb-3">Tipo de Audiência</label>
            <div className="space-y-2">
              {(['all', 'custom'] as AudienceType[]).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="audienceType"
                    value={type}
                    checked={audienceType === type}
                    onChange={(e) => setAudienceType(e.target.value as AudienceType)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {type === 'all' && 'Todos os contatos'}
                    {type === 'custom' && 'Contatos específicos'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {audienceType === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-1">IDs dos Contatos *</label>
              <textarea
                value={contactIdsText}
                onChange={(e) => setContactIdsText(e.target.value)}
                placeholder="Cole os IDs separados por vírgula ou nova linha"
                rows={6}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 font-mono text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">
                {contactIdsText
                  .split(/[,\n]/)
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0).length}{' '}
                contatos
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canGoNextStep2}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-50"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Variables */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-xl font-semibold">Variáveis</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Mapeamento de Variáveis (JSON)</label>
            <textarea
              value={variableJson}
              onChange={(e) => setVariableJson(e.target.value)}
              placeholder='Exemplo: {"customer_name": "{{contact.name}}", "discount": "10%"}'
              rows={10}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 font-mono text-sm ${
                variableError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {variableError && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-2">{variableError}</div>
            )}
          </div>

          {Object.keys(parsedVariables).length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
              <div className="text-sm font-semibold mb-2">Variáveis a mapear:</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(parsedVariables).map((key) => (
                  <div key={key} className="text-xs text-gray-600 dark:text-gray-400">
                    <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">{key}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!canGoNextStep3}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-50"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Schedule */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Agendamento</h2>

            <div className="flex items-center gap-3 mb-6">
              <input
                type="checkbox"
                id="scheduleEnabled"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="scheduleEnabled" className="cursor-pointer">
                <span className="text-sm font-medium">Agendar execução</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Deixe em branco para apenas criar a automação. Você pode configurar o
                  agendamento depois.
                </p>
              </label>
            </div>

            {scheduleEnabled && (
              <div className="text-sm text-blue-600 dark:text-blue-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                Após criar a automação, você será redirecionado para configurar o agendamento em detalhes.
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
            >
              Voltar
            </button>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Criar Automação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
