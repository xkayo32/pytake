'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Settings, Target, FileText, AlertCircle, BarChart3 } from 'lucide-react';
import { departmentsAPI, usersAPI } from '@/lib/api';
import type { Department } from '@/types/department';
import type { User } from '@/types/user';

interface HandoffPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

const generateDefaultVariableName = (nodeId: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `handoff_status_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function HandoffProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: HandoffPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [handoffType, setHandoffType] = useState(data?.handoffType || 'queue');
  const [departmentId, setDepartmentId] = useState(data?.departmentId || '');
  const [agentId, setAgentId] = useState(data?.agentId || '');
  const [priority, setPriority] = useState(data?.priority || 'normal');
  const [contextMessage, setContextMessage] = useState(data?.contextMessage || '');
  const [generateSummary, setGenerateSummary] = useState(data?.generateSummary ?? false);
  const [outputVariable, setOutputVariable] = useState(() => {
    return data?.outputVariable || generateDefaultVariableName(nodeId);
  });
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // API data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Load departments and agents
  useEffect(() => {
    loadDepartments();
    loadAgents();
  }, []);

  const loadDepartments = async () => {
    try {
      setIsLoadingDepartments(true);
      const response = await departmentsAPI.list({ is_active: true });
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
      setDepartments([]);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  const loadAgents = async () => {
    try {
      setIsLoadingAgents(true);
      const response = await usersAPI.list({ role: 'agent', is_active: true });
      setAgents(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
      setAgents([]);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  // Reinitialize when nodeId changes
  useEffect(() => {
    setHandoffType(data?.handoffType || 'queue');
    setDepartmentId(data?.departmentId || '');
    setAgentId(data?.agentId || '');
    setPriority(data?.priority || 'normal');
    setContextMessage(data?.contextMessage || '');
    setGenerateSummary(data?.generateSummary ?? false);
    const newVar = data?.outputVariable || generateDefaultVariableName(nodeId);
    setOutputVariable(newVar);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      handoffType,
      departmentId,
      agentId,
      priority,
      contextMessage,
      generateSummary,
      outputVariable,
      nodeType,
      label,
    });
  }, [nodeId, handoffType, departmentId, agentId, priority, contextMessage, generateSummary, outputVariable]);

  const tabs: Tab[] = [
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Handoff Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Transferência
            </label>
            <select
              value={handoffType}
              onChange={(e) => setHandoffType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="queue">🎯 Fila Geral</option>
              <option value="department">🏢 Departamento Específico</option>
              <option value="agent">👤 Agente Específico</option>
            </select>
          </div>

          {/* Department Selection */}
          {handoffType === 'department' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Departamento
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={isLoadingDepartments}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingDepartments ? 'Carregando...' : 'Selecione um departamento'}
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} {dept.is_active ? '' : '(Inativo)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                A conversa será direcionada para este departamento
              </p>
              {departments.length === 0 && !isLoadingDepartments && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Nenhum departamento ativo encontrado. Crie um departamento em Filas.
                </p>
              )}
            </div>
          )}

          {/* Agent Selection */}
          {handoffType === 'agent' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agente
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                disabled={isLoadingAgents}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingAgents ? 'Carregando...' : 'Selecione um agente'}
                </option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name} {agent.is_active ? '' : '(Inativo)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                A conversa será atribuída diretamente a este agente
              </p>
              {agents.length === 0 && !isLoadingAgents && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Nenhum agente ativo encontrado. Crie um agente em Usuários.
                </p>
              )}
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prioridade
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="low">🟢 Baixa</option>
              <option value="normal">🟡 Normal</option>
              <option value="high">🟠 Alta</option>
              <option value="urgent">🔴 Urgente</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Define a prioridade na fila de atendimento
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'context',
      label: 'Contexto',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Context Message */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mensagem de Contexto para o Agente
            </label>
            <textarea
              value={contextMessage}
              onChange={(e) => setContextMessage(e.target.value)}
              rows={5}
              placeholder="Forneça informações úteis para o agente... Use {{variavel}} para incluir dados"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Esta mensagem será exibida ao agente antes de iniciar o atendimento
            </p>
          </div>

          {/* Example Context */}
          <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
            <p className="text-xs font-medium text-teal-900 dark:text-teal-300 mb-2">
              💡 Exemplo de mensagem de contexto:
            </p>
            <code className="block px-2 py-1.5 bg-teal-100 dark:bg-teal-900/40 rounded text-xs text-teal-900 dark:text-teal-300 whitespace-pre-wrap">
              {`Cliente: {{contact_name}}
Interesse: {{user_interest}}
Última resposta: {{last_response}}`}
            </code>
          </div>

          {/* Generate Summary */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="generateSummary"
              checked={generateSummary}
              onChange={(e) => setGenerateSummary(e.target.checked)}
              className="mt-1 w-4 h-4 text-teal-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex-1">
              <label
                htmlFor="generateSummary"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Gerar resumo automático com IA
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                ✨ Usa IA para criar um resumo da conversa até este ponto
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'fallback',
      label: 'Fallback',
      icon: AlertCircle,
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-2">
              ⚠️ Se nenhum agente estiver disponível
            </p>
            <div className="space-y-2 text-xs text-yellow-800 dark:text-yellow-400">
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>A conversa será <strong>colocada em fila</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>O usuário receberá uma <strong>mensagem de espera</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>Status será <code className="px-1 bg-yellow-100 dark:bg-yellow-900/40 rounded">queued</code></span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              Horário de Funcionamento
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-400">
              Se a transferência ocorrer <strong>fora do horário</strong> de funcionamento, o sistema:
            </p>
            <div className="mt-2 space-y-1.5 text-xs text-blue-800 dark:text-blue-400">
              <div className="flex items-start gap-2">
                <span>1.</span>
                <span>Coloca a conversa em fila</span>
              </div>
              <div className="flex items-start gap-2">
                <span>2.</span>
                <span>Envia mensagem informando próximo horário</span>
              </div>
              <div className="flex items-start gap-2">
                <span>3.</span>
                <span>Retoma atendimento quando horário iniciar</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'variables',
      label: 'Variáveis',
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          {/* Output Variable */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Variável de Saída
            </label>
            <input
              type="text"
              value={outputVariable}
              onChange={(e) => setOutputVariable(e.target.value)}
              placeholder="handoff_status"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-teal-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-900 dark:text-red-400 focus:ring-red-500'
              }`}
            />
            {!validateSnakeCase(outputVariable) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                ⚠️ Use apenas letras minúsculas, números e underscore (_). Deve começar com letra.
              </p>
            )}
          </div>

          {/* Variable Info */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              💡 Saída deste nó: <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                {'{'}{'{'} {outputVariable} {'}'}{'}'}
              </code>
            </p>
            <p className="text-xs text-green-800 dark:text-green-400 mb-2">
              Status da transferência será armazenado nesta variável.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-green-800 dark:text-green-400">
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">success</code>
                <span>→ Transferência concluída com sucesso</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">queued</code>
                <span>→ Colocado em fila de espera</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">failed</code>
                <span>→ Falha na transferência</span>
              </div>
            </div>
          </div>

          {/* Usage Example */}
          <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
            <p className="text-xs font-medium text-teal-900 dark:text-teal-300 mb-2">
              Como usar esta variável
            </p>
            <p className="text-xs text-teal-800 dark:text-teal-400 mb-2">
              Use em um nó de condição para verificar o status:
            </p>
            <code className="block px-2 py-1.5 bg-teal-100 dark:bg-teal-900/40 rounded text-xs">
              Se {'{'}{'{'} {outputVariable} {'}'}{'}'}  ==  "success"<br />
              Então: Enviar "Transferindo para agente..."
            </code>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="config" />;
}
