'use client';

import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  MessageSquare,
  HelpCircle,
  GitBranch,
  Zap,
  Globe,
  Brain,
  ArrowRight,
  StopCircle,
  Users,
  Clock,
  Edit3,
  FileText,
  LayoutGrid,
  List,
  Play,
  Database,
  Info,
  Code,
} from 'lucide-react';

// Map node types to icons
const ICON_MAP: Record<string, any> = {
  start: Play,
  message: MessageSquare,
  question: HelpCircle,
  condition: GitBranch,
  action: Zap,
  api_call: Globe,
  ai_prompt: Brain,
  jump: ArrowRight,
  end: StopCircle,
  handoff: Users,
  delay: Clock,
  set_variable: Edit3,
  whatsapp_template: FileText,
  interactive_buttons: LayoutGrid,
  interactive_list: List,
  database_query: Database,
  script: Code,
};

// Map node types to colors (icon and border)
const COLOR_MAP: Record<string, string> = {
  start: '#10b981',
  message: '#3b82f6',
  question: '#8b5cf6',
  condition: '#f97316',
  action: '#eab308',
  api_call: '#6366f1',
  ai_prompt: '#ec4899',
  jump: '#6b7280',
  end: '#ef4444',
  handoff: '#14b8a6',
  delay: '#06b6d4',
  set_variable: '#f59e0b',
  whatsapp_template: '#10b981',
  interactive_buttons: '#7c3aed',
  interactive_list: '#64748b',
  database_query: '#ff5722',
  script: '#4f46e5',
};

// Map node types to Tailwind background classes (light + dark mode)
const BG_CLASS_MAP: Record<string, string> = {
  start: 'bg-green-50 dark:bg-green-950',
  message: 'bg-blue-50 dark:bg-blue-950',
  question: 'bg-purple-50 dark:bg-purple-950',
  condition: 'bg-orange-50 dark:bg-orange-950',
  action: 'bg-yellow-50 dark:bg-yellow-950',
  api_call: 'bg-indigo-50 dark:bg-indigo-950',
  ai_prompt: 'bg-pink-50 dark:bg-pink-950',
  jump: 'bg-gray-50 dark:bg-gray-800',
  end: 'bg-red-50 dark:bg-red-950',
  handoff: 'bg-teal-50 dark:bg-teal-950',
  delay: 'bg-cyan-50 dark:bg-cyan-950',
  set_variable: 'bg-amber-50 dark:bg-amber-950',
  whatsapp_template: 'bg-green-50 dark:bg-green-950',
  interactive_buttons: 'bg-violet-50 dark:bg-violet-950',
  interactive_list: 'bg-slate-50 dark:bg-slate-800',
  database_query: 'bg-orange-50 dark:bg-orange-950',
  script: 'bg-indigo-50 dark:bg-indigo-950',
};

// Map node types to labels
const LABEL_MAP: Record<string, string> = {
  start: 'Início',
  message: 'Mensagem',
  question: 'Pergunta',
  condition: 'Condição',
  action: 'Ação',
  api_call: 'API',
  ai_prompt: 'IA',
  jump: 'Pular',
  end: 'Fim',
  handoff: 'Transferir',
  delay: 'Atraso',
  set_variable: 'Variável',
  whatsapp_template: 'Template',
  interactive_buttons: 'Botões',
  interactive_list: 'Lista',
  database_query: 'Banco de Dados',
  script: 'Script',
};

// Truncate text helper
const truncate = (text: string, maxLength: number = 30): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Check if text contains variables
const hasVariables = (text: string): boolean => {
  return /\{\{.+?\}\}/.test(text);
};

// Highlight variables in text for preview
const highlightVariables = (text: string): JSX.Element | string => {
  if (!text || !hasVariables(text)) return text;

  const parts = text.split(/(\{\{.+?\}\})/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.match(/\{\{.+?\}\}/)) {
          // É uma variável - destacar
          return (
            <span key={index} className="inline-flex items-center px-1 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 rounded text-[10px] font-mono">
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

// Generate preview text based on node type and data
const getPreviewText = (nodeType: string, data: any): JSX.Element | string | null => {
  switch (nodeType) {
    case 'message':
      const messageText = data.messageText || 'Configure a mensagem...';
      return hasVariables(messageText)
        ? highlightVariables(truncate(messageText, 50))
        : truncate(messageText, 50);

    case 'question':
      const questionText = data.questionText || 'Configure a pergunta...';
      return hasVariables(questionText)
        ? highlightVariables(truncate(questionText, 50))
        : truncate(questionText, 50);

    case 'condition':
      const conditionsCount = data.conditions?.length || 0;
      if (conditionsCount === 0) return 'Configure as condições';

      // Mostrar apenas a contagem de forma limpa
      return `${conditionsCount} ${conditionsCount === 1 ? 'condição' : 'condições'}`;

    case 'api_call':
      if (!data.url && !data.name) return 'Configure a chamada de API';
      const apiName = data.name || 'API Externa';
      const method = data.method || 'GET';
      return (
        <>
          <span className="font-semibold text-xs px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 rounded">{method}</span>
          <span className="ml-1">{truncate(apiName, 25)}</span>
        </>
      );

    case 'ai_prompt':
      if (!data.prompt) return 'Configure o prompt de IA';
      return truncate(data.prompt, 45);

    case 'whatsapp_template':
      return data.templateName ? truncate(data.templateName, 35) : 'Selecione um template';

    case 'interactive_buttons':
      const buttonsCount = data.buttons?.length || 0;
      if (buttonsCount === 0) return 'Adicione botões';
      return `${buttonsCount} ${buttonsCount === 1 ? 'botão' : 'botões'}`;

    case 'interactive_list':
      const itemsCount = data.listItems?.length || 0;
      if (itemsCount === 0) return 'Adicione itens à lista';
      return `${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`;

    case 'delay':
      if (!data.duration) return 'Configure o tempo de espera';
      const unit = data.unit === 'seconds' ? 'segundo(s)' : data.unit === 'minutes' ? 'minuto(s)' : 'hora(s)';
      return `${data.duration} ${unit}`;

    case 'set_variable':
      if (!data.variableName) return 'Configure a variável';
      return `{{${data.variableName}}}`;

    case 'jump':
      if (data.jumpType === 'flow') {
        return data.targetFlow ? `Ir para fluxo` : 'Selecione o fluxo destino';
      }
      return data.targetNode ? `Ir para nó` : 'Selecione o nó destino';

    case 'handoff':
      const handoffTypes: Record<string, string> = {
        queue: 'Fila de atendimento',
        department: 'Departamento',
        agent: 'Agente específico',
      };

      const handoffType = handoffTypes[data.handoffType];

      if (!handoffType) return 'Configure a transferência';

      // Mostrar detalhes específicos se configurado
      if (data.handoffType === 'department' && data.departmentName) {
        return (
          <>
            <span className="text-xs opacity-75">{handoffType}:</span>
            <br />
            <span className="font-semibold">{truncate(data.departmentName, 30)}</span>
          </>
        );
      }

      if (data.handoffType === 'agent' && data.agentName) {
        return (
          <>
            <span className="text-xs opacity-75">{handoffType}:</span>
            <br />
            <span className="font-semibold">{truncate(data.agentName, 30)}</span>
          </>
        );
      }

      return handoffType;

    case 'end':
      const endTypes: Record<string, string> = {
        simple: 'Finalizar conversa',
        farewell: 'Finalizar com despedida',
        handoff: 'Transferir para humano',
      };
      return endTypes[data.endType] || 'Fim do fluxo';

    case 'action':
      const actionTypes: Record<string, string> = {
        save_contact: 'Salvar dados do contato',
        send_email: 'Enviar email',
        webhook: 'Chamar webhook',
        update_crm: 'Atualizar CRM',
      };
      return actionTypes[data.actionType] || 'Configure a ação';

    case 'database_query':
      const dbTypes: Record<string, string> = {
        postgres: 'PostgreSQL',
        mysql: 'MySQL',
        mongodb: 'MongoDB',
        sqlite: 'SQLite',
      };
      const dbType = dbTypes[data.connectionType] || 'Banco de Dados';

      if (!data.query) return `${dbType} - Configure a consulta`;

      // Extrair primeira palavra da query (SELECT, INSERT, UPDATE, DELETE)
      const queryFirstWord = data.query.trim().split(/\s+/)[0].toUpperCase();

      return (
        <>
          <span className="font-semibold text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">{queryFirstWord}</span>
          <span className="ml-1 text-xs opacity-75">{dbType}</span>
        </>
      );

    case 'script':
      if (!data.scriptCode) return 'Configure o script';

      const language = data.language || 'JavaScript';
      const description = data.description || 'Executar código';

      return (
        <>
          <span className="font-semibold">{truncate(description, 30)}</span>
          <br />
          <span className="text-xs opacity-75">{language}</span>
        </>
      );

    case 'start':
      return 'Início do fluxo';

    default:
      return null;
  }
};

// Get full text (não truncado) para tooltip
const getFullText = (nodeType: string, data: any): string | null => {
  switch (nodeType) {
    case 'message':
      return data.messageText || 'Sem mensagem configurada';
    case 'question':
      return data.questionText || 'Sem pergunta configurada';
    case 'ai_prompt':
      return data.prompt || 'Sem prompt configurado';
    case 'database_query':
      return data.query || null;
    case 'script':
      return data.scriptCode || null;
    default:
      return null;
  }
};

// Get variable info (variável que este nó cria)
const getVariableOutput = (nodeType: string, data: any): string | null => {
  switch (nodeType) {
    case 'question':
      return data.outputVariable || null;
    case 'set_variable':
      return data.variableName || null;
    case 'ai_prompt':
      return data.outputVariable || null;
    case 'api_call':
      return data.outputVariable || null;
    case 'database_query':
      return data.outputVariable || null;
    case 'script':
      return data.outputVariable || null;
    default:
      return null;
  }
};

export default function CustomNode({ data }: NodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const nodeType = data.nodeType || 'default';
  const Icon = ICON_MAP[nodeType] || MessageSquare;
  const color = data.color || COLOR_MAP[nodeType] || '#6b7280';
  const bgClass = BG_CLASS_MAP[nodeType] || 'bg-white dark:bg-gray-800';
  const label = LABEL_MAP[nodeType] || 'Node';
  const previewText = getPreviewText(nodeType, data);
  const fullText = getFullText(nodeType, data);
  const variableOutput = getVariableOutput(nodeType, data);

  // Check if this node uses variables in its content
  const usesVariables = hasVariables(data.messageText || '') || hasVariables(data.questionText || '');

  // Determinar quais handles mostrar
  const hasTargetHandle = nodeType !== 'start'; // Início não tem entrada
  const hasSourceHandle = nodeType !== 'end';   // Fim não tem saída

  // Para nó de condição, criar múltiplos handles de saída
  const isConditionNode = nodeType === 'condition';
  const conditions = isConditionNode ? (data.conditions || []) : [];
  const hasDefaultRoute = isConditionNode ? (data.hasDefaultRoute ?? true) : false;
  const totalOutputs = isConditionNode ? conditions.length + (hasDefaultRoute ? 1 : 0) : 1;

  const needsTooltip = fullText && fullText.length > 30;

  return (
    <div
      className={`min-w-[220px] max-w-[280px] rounded-lg border custom-node bg-white dark:bg-gray-800 relative shadow-sm hover:shadow-md transition-shadow overflow-visible`}
      style={{
        borderColor: color,
        borderWidth: '2px',
        borderLeftWidth: '4px',
      }}
    >
      {/* Target Handle (entrada) - ESQUERDA - apenas se não for 'start' */}
      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="custom-handle custom-handle-target"
          style={{ background: color }}
        />
      )}

      {/* Header com cor de fundo */}
      <div
        className="px-4 py-2.5 flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700"
        style={{ backgroundColor: `${color}08` }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="font-semibold text-[13px] text-gray-900 dark:text-white truncate">
          {label}
        </span>
      </div>

      {/* Conteúdo Principal */}
      <div className="px-4 py-3">
        {previewText && (
          <div className="text-[13px] text-gray-700 dark:text-gray-200 leading-relaxed break-words">
            {previewText}
          </div>
        )}

        {!previewText && (
          <div className="text-[12px] text-gray-400 dark:text-gray-500 italic">
            Não configurado
          </div>
        )}
      </div>

      {/* Footer com metadados (variável de saída) */}
      {variableOutput && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            <Edit3 className="w-3 h-3 text-purple-500 dark:text-purple-400 flex-shrink-0" />
            <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300 truncate">
              {`{{${variableOutput}}}`}
            </span>
          </div>
        </div>
      )}

      {/* Tooltip icon */}
      {needsTooltip && (
        <div className="absolute top-2.5 right-3 z-10">
          <Info className="w-3.5 h-3.5 text-gray-400 opacity-60 hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Source Handle (saída) - DIREITA - nós normais */}
      {hasSourceHandle && !isConditionNode && (
        <Handle
          type="source"
          position={Position.Right}
          className="custom-handle custom-handle-source"
          style={{ background: color }}
        />
      )}

      {/* Espaço vazio no card para as labels flutuantes (apenas para nós de condição) */}
      {isConditionNode && (
        <div
          className="px-3"
          style={{
            height: `${totalOutputs * 28}px` // ~28px por saída (espaço para cada label)
          }}
        />
      )}

      {/* Multiple source handles - nós de condição com labels flutuantes ao lado */}
      {hasSourceHandle && isConditionNode && totalOutputs > 0 && (
        <>
          {conditions.map((condition: any, index: number) => {
            const spacing = 100 / (totalOutputs + 1);
            const topPercent = spacing * (index + 1);
            const labelText = condition.label || `Condição ${index + 1}`;

            return (
              <div key={`handle-wrapper-${index}`}>
                {/* Label flutuante ao lado do handle */}
                <div
                  className="absolute pointer-events-none z-20"
                  style={{
                    top: `${topPercent}%`,
                    right: '20px',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm border border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {truncate(labelText, 18)}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>

                {/* Handle */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`condition-${index}`}
                  className="custom-handle custom-handle-source"
                  style={{
                    background: color,
                    top: `${topPercent}%`,
                  }}
                />
              </div>
            );
          })}

          {/* Default route handle (senão) com label */}
          {hasDefaultRoute && (
            <div key="handle-wrapper-default">
              {/* Label flutuante ao lado do handle senão */}
              <div
                className="absolute pointer-events-none z-20"
                style={{
                  top: `${100 / (totalOutputs + 1) * totalOutputs}%`,
                  right: '20px',
                  transform: 'translateY(-50%)',
                }}
              >
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded shadow-sm border border-gray-300 dark:border-gray-600">
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    Senão
                  </span>
                  <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                </div>
              </div>

              {/* Handle */}
              <Handle
                type="source"
                position={Position.Right}
                id="condition-default"
                className="custom-handle custom-handle-source"
                style={{
                  background: '#6b7280',
                  top: `${100 / (totalOutputs + 1) * totalOutputs}%`,
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Tooltip expandido */}
      {showTooltip && fullText && (
        <div className="absolute z-50 left-full ml-3 top-0 min-w-[220px] max-w-[340px] bg-gray-900 dark:bg-gray-800 text-white text-xs p-4 rounded-lg shadow-2xl border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4" style={{ color }} />
            <div className="font-semibold text-gray-100">{label}</div>
          </div>
          <div className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
            {fullText}
          </div>
        </div>
      )}
    </div>
  );
}
