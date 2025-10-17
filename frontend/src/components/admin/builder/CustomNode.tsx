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
      const messageText = data.messageText || 'Sem mensagem configurada';
      return hasVariables(messageText)
        ? highlightVariables(truncate(messageText))
        : truncate(messageText);

    case 'question':
      const questionText = data.questionText || 'Sem pergunta configurada';
      return hasVariables(questionText)
        ? highlightVariables(truncate(questionText))
        : truncate(questionText);

    case 'condition':
      const conditionsCount = data.conditions?.length || 0;
      if (conditionsCount === 0) return 'Sem condições';
      return `${conditionsCount} condição${conditionsCount > 1 ? 'ões' : ''}`;

    case 'api_call':
      if (!data.url) return 'Sem URL configurada';
      return `${data.method || 'GET'} ${truncate(data.url, 20)}`;

    case 'ai_prompt':
      return truncate(data.prompt || 'Sem prompt configurado');

    case 'whatsapp_template':
      return truncate(data.templateName || 'Sem template selecionado');

    case 'interactive_buttons':
      const buttonsCount = data.buttons?.length || 0;
      if (buttonsCount === 0) return 'Sem botões';
      return `${buttonsCount} botão${buttonsCount > 1 ? 'ões' : ''}`;

    case 'interactive_list':
      const itemsCount = data.listItems?.length || 0;
      if (itemsCount === 0) return 'Sem itens';
      return `${itemsCount} item${itemsCount > 1 ? 'ns' : ''}`;

    case 'delay':
      if (!data.duration) return 'Sem delay';
      const unit = data.unit === 'seconds' ? 's' : data.unit === 'minutes' ? 'min' : 'h';
      return `Aguardar ${data.duration}${unit}`;

    case 'set_variable':
      return data.variableName ? `{{${data.variableName}}}` : 'Sem variável';

    case 'jump':
      if (data.jumpType === 'flow') {
        return data.targetFlow ? `→ ${data.targetFlow}` : 'Selecione um fluxo';
      }
      return data.targetNode ? `→ ${data.targetNode}` : 'Selecione um nó';

    case 'handoff':
      const handoffTypes: Record<string, string> = {
        queue: 'Fila',
        department: 'Departamento',
        agent: 'Agente específico',
      };
      return handoffTypes[data.handoffType] || 'Transferir';

    case 'end':
      const endTypes: Record<string, string> = {
        simple: 'Finalização simples',
        farewell: 'Com despedida',
        handoff: 'Transferir para humano',
      };
      return endTypes[data.endType] || 'Fim do fluxo';

    case 'action':
      const actionTypes: Record<string, string> = {
        save_contact: 'Salvar contato',
        send_email: 'Enviar email',
        webhook: 'Chamar webhook',
        update_crm: 'Atualizar CRM',
      };
      return actionTypes[data.actionType] || 'Executar ação';

    case 'database_query':
      const dbTypes: Record<string, string> = {
        postgres: 'PostgreSQL',
        mysql: 'MySQL',
        mongodb: 'MongoDB',
        sqlite: 'SQLite',
      };
      const dbType = dbTypes[data.connectionType] || data.connectionType || 'Banco';
      if (!data.query && !data.database) return `${dbType} - Sem configuração`;
      if (!data.query) return `${dbType} ${data.database ? `(${data.database})` : ''} - Sem query`;
      const queryPreview = truncate(data.query, 20);
      return `${dbType}: ${queryPreview}`;

    case 'script':
      if (!data.scriptCode) return 'Sem código configurado';
      return data.description || truncate(data.scriptCode, 25);

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

  const needsTooltip = fullText && fullText.length > 30;

  return (
    <>
      {/* Target Handle (entrada) - apenas se não for 'start' */}
      {hasTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="custom-handle custom-handle-target"
          style={{ background: color }}
        />
      )}

      <div
        className={`px-3 py-2.5 min-w-[180px] max-w-[220px] rounded-lg border custom-node ${bgClass} relative`}
        style={{
          borderColor: color,
          borderWidth: '1.5px'
        }}
        onMouseEnter={() => needsTooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Header: Icon + Label */}
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">
            {label}
          </span>
        </div>

        {/* Preview Text */}
        {previewText && (
          <div className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed pl-6 font-medium break-words">
            {previewText}
          </div>
        )}

        {/* Badges Row */}
        {(variableOutput || usesVariables) && (
          <div className="mt-2 pl-6 flex flex-wrap gap-1.5">
            {/* Variable Output Badge (variável que este nó cria) */}
            {variableOutput && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-mono">
                <Edit3 className="w-2.5 h-2.5" />
                {`{{${variableOutput}}}`}
              </div>
            )}

            {/* Uses Variables Badge (este nó usa variáveis) */}
            {usesVariables && (
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium"
                title="Este nó usa variáveis. Use 'Testar Fluxo' para ver valores substituídos."
              >
                <Edit3 className="w-2.5 h-2.5" />
                Usa variáveis
              </div>
            )}
          </div>
        )}

        {/* Tooltip icon */}
        {needsTooltip && (
          <div className="absolute top-2 right-2">
            <Info className="w-3 h-3 text-gray-400" />
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && fullText && (
        <div className="absolute z-50 left-full ml-2 top-0 min-w-[200px] max-w-[300px] bg-gray-900 dark:bg-gray-800 text-white text-xs p-3 rounded-lg shadow-xl border border-gray-700">
          <div className="font-medium mb-1">{label}</div>
          <div className="text-gray-300 whitespace-pre-wrap break-words">
            {fullText}
          </div>
        </div>
      )}

      {/* Source Handle (saída) - apenas se não for 'end' */}
      {hasSourceHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="custom-handle custom-handle-source"
          style={{ background: color }}
        />
      )}
    </>
  );
}
