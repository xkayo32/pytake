'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chatbotsAPI, whatsappAPI, flowAutomationsAPI } from '@/lib/api';
import { Chatbot, Flow } from '@/types/chatbot';
import { FlowAutomationCreate } from '@/types/flow_automation';
import { Plus, Save, ArrowLeft, ChevronRight, ChevronsRight } from 'lucide-react';

export default function NewFlowAutomationPage() {
  const router = useRouter();

  // Stepper state
  const [step, setStep] = useState<number>(1);

  // Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chatbotId, setChatbotId] = useState<string>('');
  const [flowId, setFlowId] = useState<string>('');
  const [whatsappNumberId, setWhatsappNumberId] = useState<string>('');

  // Data lists
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<any[]>([]);

  // Audience (MVP: custom)
  const [audienceType, setAudienceType] = useState<'custom' | 'all'>('custom');
  const [contactIdsText, setContactIdsText] = useState<string>('');

  // Variables mapping (simple key/value JSON)
  const [variableJson, setVariableJson] = useState<string>('{}');
  const [variableError, setVariableError] = useState<string>('');

  // Advanced config (optional in MVP)
  const [rateLimitPerHour, setRateLimitPerHour] = useState<number>(100);
  const [maxConcurrent, setMaxConcurrent] = useState<number>(50);

  const canGoNextStep1 = useMemo(() => {
    return name.trim().length > 0 && chatbotId && flowId && whatsappNumberId;
  }, [name, chatbotId, flowId, whatsappNumberId]);

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

  useEffect(() => {
    (async () => {
      try {
        const [cbRes, waRes] = await Promise.all([
          chatbotsAPI.list({ limit: 100 }),
          whatsappAPI.list(),
        ]);
        setChatbots(cbRes.data.items || cbRes.data || []);
        setWhatsappNumbers(waRes.data.items || waRes.data || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (!chatbotId) {
      setFlows([]);
      setFlowId('');
      return;
    }
    (async () => {
      try {
        const res = await chatbotsAPI.get(chatbotId);
        // Em alguns endpoints temos /chatbots/:id/flows para listar diretamente
        const flowsRes = await fetch(`/api/v1/chatbots/${chatbotId}/flows`, { credentials: 'include' });
        const data = await flowsRes.json();
        const list = data.items || [];
        setFlows(list);
      } catch (error) {
        console.error('Erro ao carregar flows:', error);
        setFlows([]);
      }
    })();
  }, [chatbotId]);

  const handleCreate = async () => {
    try {
      const contactIds = contactIdsText
        .split(/\s|,|;|\n/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload: FlowAutomationCreate = {
        name,
        description,
        chatbot_id: chatbotId,
        flow_id: flowId,
        whatsapp_number_id: whatsappNumberId,
        trigger_type: 'manual',
        trigger_config: {},
        audience_type: audienceType,
        audience_config: audienceType === 'custom' ? { contact_ids: contactIds } : {},
        variable_mapping: parsedVariables,
        max_concurrent_executions: maxConcurrent,
        rate_limit_per_hour: rateLimitPerHour,
        retry_failed: true,
        max_retries: 3,
        execution_window_start: undefined,
        execution_window_end: undefined,
        execution_timezone: 'America/Sao_Paulo',
      } as any;

      const res = await flowAutomationsAPI.create(payload);
      const automation = res.data;
      router.push(`/admin/flow-automations`);
    } catch (error) {
      console.error('Erro ao criar automação:', error);
      alert('Erro ao criar automação. Verifique os campos e tente novamente.');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nova Automação de Fluxo</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Configure um disparo proativo de flow</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={step !== 3 || !!variableError}
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Criar Automação
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 1, label: 'Informações Básicas' },
          { id: 2, label: 'Audiência' },
          { id: 3, label: 'Variáveis' },
        ].map((s) => (
          <div key={s.id} className={`p-3 rounded-lg border ${step === s.id ? 'border-gray-900 dark:border-white' : 'border-gray-200 dark:border-gray-800'}`}>
            <div className="text-xs text-gray-500">Etapa {s.id}</div>
            <div className="font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Recuperação de Clientes Q4"
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número WhatsApp</label>
              <select
                value={whatsappNumberId}
                onChange={(e) => setWhatsappNumberId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              >
                <option value="">Selecione...</option>
                {whatsappNumbers.map((n: any) => (
                  <option key={n.id} value={n.id}>{n.display_name || n.name || n.phone_number}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Chatbot</label>
              <select
                value={chatbotId}
                onChange={(e) => setChatbotId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              >
                <option value="">Selecione...</option>
                {chatbots.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Flow</label>
              <select
                value={flowId}
                onChange={(e) => setFlowId(e.target.value)}
                disabled={!chatbotId}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                {flows.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              disabled={!canGoNextStep1}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-50"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 - Audience */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Audiência</label>
              <select
                value={audienceType}
                onChange={(e) => setAudienceType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
              >
                <option value="custom">Lista Custom (IDs)</option>
                <option value="all">Todos os Contatos</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">MVP: suporte a lista custom ou todos</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rate limit (msgs/h)</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={rateLimitPerHour}
                  onChange={(e) => setRateLimitPerHour(parseInt(e.target.value || '0'))}
                  className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Concorrência</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(parseInt(e.target.value || '0'))}
                  className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                />
              </div>
            </div>
          </div>

          {audienceType === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-1">IDs dos Contatos</label>
              <textarea
                value={contactIdsText}
                onChange={(e) => setContactIdsText(e.target.value)}
                placeholder="Cole aqui uma lista de UUIDs separados por vírgula, espaço ou quebra de linha"
                rows={6}
                className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Dica: você pode exportar IDs da página de Contatos</p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 - Variables */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Variáveis (JSON)</label>
            <textarea
              value={variableJson}
              onChange={(e) => setVariableJson(e.target.value)}
              placeholder='Exemplo: {"customer_name": "{{contact.name}}"}'
              rows={10}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 font-mono text-sm"
            />
            {variableError && (
              <div className="text-sm text-red-600 mt-1">{variableError}</div>
            )}
            <p className="text-xs text-gray-500 mt-1">Use {{contact.campo}} para mapear campos do contato</p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              disabled={!!variableError}
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-50"
            >
              Criar Automação
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
