'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save,
  Play,
  ArrowLeft,
  Loader2,
  Plus,
  MessageSquare,
  HelpCircle,
  GitBranch,
  Zap,
  Globe,
  Brain,
  ArrowRight,
  StopCircle,
  Users,
  Variable,
  Clock,
  Database,
  Code,
  Shuffle,
  Calendar,
  BarChart3,
  FileText,
  MousePointerClick,
  List,
  Library,
  Sparkles,
  Boxes,
  UserPlus,
  MessageCircle,
  Cloud,
  XCircle,
  ChevronDown,
  ChevronRight,
  SquareMousePointer,
} from 'lucide-react';
import { chatbotsAPI, flowsAPI } from '@/lib/api/chatbots';
import type { Chatbot, Flow } from '@/types/chatbot';
import AIPromptProperties from '@/components/admin/builder/AIPromptProperties';
import APICallProperties from '@/components/admin/builder/APICallProperties';
import HandoffProperties from '@/components/admin/builder/HandoffProperties';
import MessageProperties from '@/components/admin/builder/MessageProperties';
import QuestionProperties from '@/components/admin/builder/QuestionProperties';
import ConditionProperties from '@/components/admin/builder/ConditionProperties';
import ActionProperties from '@/components/admin/builder/ActionProperties';
import DelayProperties from '@/components/admin/builder/DelayProperties';
import DatabaseQueryProperties from '@/components/admin/builder/DatabaseQueryProperties';
import ScriptProperties from '@/components/admin/builder/ScriptProperties';
import SetVariableProperties from '@/components/admin/builder/SetVariableProperties';
import RandomProperties from '@/components/admin/builder/RandomProperties';
import DateTimeProperties from '@/components/admin/builder/DateTimeProperties';
import AnalyticsProperties from '@/components/admin/builder/AnalyticsProperties';
import WhatsAppTemplateProperties from '@/components/admin/builder/WhatsAppTemplateProperties';
import InteractiveButtonsProperties from '@/components/admin/builder/InteractiveButtonsProperties';
import InteractiveListProperties from '@/components/admin/builder/InteractiveListProperties';
import JumpProperties from '@/components/admin/builder/JumpProperties';
import EndProperties from '@/components/admin/builder/EndProperties';
import CustomNode from '@/components/admin/builder/CustomNode';
import VariablesPanel from '@/components/admin/builder/VariablesPanel';
import FlowSimulator from '@/components/admin/builder/FlowSimulator';
import SessionExpiredModal from '@/components/admin/SessionExpiredModal';
import { useSessionExpired } from '@/lib/hooks/useSessionExpired';
import { useToast } from '@/store/notificationStore';
import FlowTemplateGallery from '@/components/admin/templates/FlowTemplateGallery';
import AIFlowAssistant from '@/components/admin/ai-assistant/AIFlowAssistant';

// Categorized node types palette
const NODE_CATEGORIES = [
  {
    id: 'basics',
    label: 'Básicos',
    icon: Boxes,
    nodeTypes: [
      { type: 'start', label: 'Início', icon: Play, color: 'green', description: 'Ponto de entrada do fluxo' },
      { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'blue', description: 'Enviar uma mensagem' },
      { type: 'question', label: 'Pergunta', icon: HelpCircle, color: 'purple', description: 'Capturar resposta do usuário' },
      { type: 'end', label: 'Fim', icon: XCircle, color: 'red', description: 'Finalizar fluxo' },
    ],
  },
  {
    id: 'logic',
    label: 'Lógica & Controle',
    icon: GitBranch,
    nodeTypes: [
      { type: 'condition', label: 'Condição', icon: GitBranch, color: 'orange', description: 'Decisão condicional' },
      { type: 'jump', label: 'Pular', icon: ArrowRight, color: 'gray', description: 'Pular para outro fluxo' },
      { type: 'delay', label: 'Delay', icon: Clock, color: 'cyan', description: 'Adicionar atraso temporal' },
      { type: 'set_variable', label: 'Variável', icon: Variable, color: 'slate', description: 'Definir/atualizar variável' },
      { type: 'script', label: 'Script', icon: Code, color: 'violet', description: 'Executar código Python' },
      { type: 'random', label: 'Aleatório', icon: Shuffle, color: 'lime', description: 'Caminho aleatório (A/B test)' },
    ],
  },
  {
    id: 'ai_integrations',
    label: 'IA & Integrações',
    icon: Sparkles,
    nodeTypes: [
      { type: 'ai_prompt', label: 'IA', icon: Brain, color: 'pink', description: 'Prompt para IA (GPT-4)' },
      { type: 'api_call', label: 'API', icon: Cloud, color: 'indigo', description: 'Chamar API externa' },
      { type: 'action', label: 'Ação', icon: Zap, color: 'yellow', description: 'Executar uma ação' },
    ],
  },
  {
    id: 'human_service',
    label: 'Atendimento Humano',
    icon: UserPlus,
    nodeTypes: [
      { type: 'handoff', label: 'Transferir', icon: UserPlus, color: 'brown', description: 'Transferir para humano' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    nodeTypes: [
      { type: 'whatsapp_template', label: 'Template', icon: FileText, color: 'sky', description: 'Template WhatsApp oficial' },
      { type: 'interactive_buttons', label: 'Botões', icon: SquareMousePointer, color: 'fuchsia', description: 'Botões interativos' },
      { type: 'interactive_list', label: 'Lista', icon: List, color: 'teal', description: 'Lista de seleção' },
    ],
  },
  {
    id: 'data',
    label: 'Dados & Armazenamento',
    icon: Database,
    nodeTypes: [
      { type: 'database_query', label: 'Database', icon: Database, color: 'emerald', description: 'Consultar banco de dados' },
      { type: 'datetime', label: 'Data/Hora', icon: Calendar, color: 'amber', description: 'Manipular datas e horários' },
      { type: 'analytics', label: 'Analytics', icon: BarChart3, color: 'rose', description: 'Rastrear eventos' },
    ],
  },
];

const COLOR_MAP: Record<string, string> = {
  green: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f97316',
  yellow: '#eab308',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  pink: '#ec4899',
  emerald: '#10b981',
  violet: '#8b5cf6',
  slate: '#64748b',
  lime: '#84cc16',
  amber: '#f59e0b',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  fuchsia: '#d946ef',
  teal: '#14b8a6',
  gray: '#6b7280',
  red: '#ef4444',
  brown: '#92400e',
};

let nodeIdCounter = 0;

// Custom node types
const nodeTypes = {
  default: CustomNode,
};

// Default edge style com setas
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#94a3b8',
    width: 20,
    height: 20,
  },
};

export default function ChatbotBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const chatbotId = params.id as string;
  const { showExpiredModal, hideModal } = useSessionExpired();

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showVariablesPanel, setShowVariablesPanel] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    // Load from localStorage or default all to true
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('builder-expanded-categories');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    // Default: all categories expanded
    return NODE_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {});
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load chatbot and flows
  useEffect(() => {
    loadChatbotData();
  }, [chatbotId]);

  // Highlight node during simulation
  useEffect(() => {
    if (highlightedNodeId) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === highlightedNodeId) {
            return {
              ...node,
              style: {
                ...node.style,
                boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.5)',
                animation: 'pulse 1s infinite',
              },
            };
          } else if (node.style?.boxShadow?.includes('rgba(34, 197, 94')) {
            // Remove highlight from previously highlighted node
            const { boxShadow, animation, ...restStyle } = node.style;
            return { ...node, style: restStyle };
          }
          return node;
        })
      );
    }
  }, [highlightedNodeId, setNodes]);

  const loadChatbotData = async () => {
    try {
      setIsLoading(true);
      const [chatbotData, flowsData] = await Promise.all([
        chatbotsAPI.get(chatbotId),
        flowsAPI.list(chatbotId),
      ]);

      setChatbot(chatbotData);
      setFlows(flowsData.items || []);

      // Select main flow or first flow
      const mainFlow = flowsData.items?.find((f) => f.is_main);
      const firstFlow = flowsData.items?.[0];
      const flow = mainFlow || firstFlow;

      if (flow) {
        setSelectedFlow(flow);
        loadFlowCanvas(flow);
      }
    } catch (error) {
      console.error('Erro ao carregar chatbot:', error);
      toast.error('Erro ao carregar chatbot');
      router.push('/admin/chatbots');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFlowCanvas = (flow: Flow) => {
    if (flow.canvas_data?.nodes && flow.canvas_data?.edges) {
      setNodes(flow.canvas_data.nodes);
      setEdges(flow.canvas_data.edges);
    } else {
      // Create default start node
      setNodes([
        {
          id: '1',
          type: 'input',
          position: { x: 250, y: 100 },
          data: {
            label: (
              <div className="flex items-center gap-2 px-3 py-2">
                <Play className="w-4 h-4 text-green-600" />
                <span className="font-medium">Início</span>
              </div>
            ),
          },
          style: {
            background: '#f0fdf4',
            border: '2px solid #10b981',
            borderRadius: '12px',
            padding: '4px',
          },
        },
      ]);
      setEdges([]);
      nodeIdCounter = 1;
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      // Adicionar edge com seta
      const newEdge = {
        ...params,
        ...defaultEdgeOptions,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const handleSave = async () => {
    if (!selectedFlow) return;

    try {
      setIsSaving(true);
      await flowsAPI.update(selectedFlow.id, {
        canvas_data: {
          nodes,
          edges,
        },
      });
      toast.success('Fluxo salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar fluxo:', error);
      toast.error(error.response?.data?.detail || 'Erro ao salvar fluxo');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newState = { ...prev, [categoryId]: !prev[categoryId] };
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('builder-expanded-categories', JSON.stringify(newState));
      }
      return newState;
    });
  };

  const handleAddNode = (nodeType: any) => {
    const newNodeId = `node-${++nodeIdCounter}`;
    const Icon = nodeType.icon;

    const newNode: Node = {
      id: newNodeId,
      type: 'default',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: {
        label: (
          <div className="flex items-center gap-2 px-3 py-2">
            <Icon className="w-4 h-4" style={{ color: COLOR_MAP[nodeType.color] }} />
            <span className="font-medium">{nodeType.label}</span>
          </div>
        ),
        nodeType: nodeType.type,
      },
      style: {
        background: '#fff',
        border: `2px solid ${COLOR_MAP[nodeType.color]}`,
        borderRadius: '12px',
        padding: '4px',
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeDataChange = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleTemplateImportSuccess = useCallback(async (flowId: string) => {
    // Reload flows to include the new imported flow
    try {
      const flowsData = await flowsAPI.list(chatbotId);
      setFlows(flowsData.items || []);

      // Load the imported flow
      const importedFlow = flowsData.items?.find((f) => f.id === flowId);
      if (importedFlow) {
        setSelectedFlow(importedFlow);
        loadFlowCanvas(importedFlow);
      }
    } catch (error) {
      console.error('Error reloading flows after import:', error);
    }
  }, [chatbotId]);

  const handleAIFlowImport = useCallback(async (flowData: any, flowName: string) => {
    // Create new flow with AI-generated data
    try {
      const newFlow = await flowsAPI.create(chatbotId, {
        chatbot_id: chatbotId,
        name: flowName,
        description: flowData.description,
        canvas_data: flowData.canvas_data,
      });

      // Reload flows
      const flowsData = await flowsAPI.list(chatbotId);
      setFlows(flowsData.items || []);

      // Load the new flow
      setSelectedFlow(newFlow);
      loadFlowCanvas(newFlow);

      // Close AI Assistant
      setShowAIAssistant(false);
    } catch (error) {
      console.error('Error importing AI-generated flow:', error);
      throw error;
    }
  }, [chatbotId]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando chatbot...</p>
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Chatbot não encontrado</p>
      </div>
    );
  }

  return (
    <>
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Left Sidebar - Node Palette with Categories */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Nó
            </h3>
            <div className="space-y-2">
              {NODE_CATEGORIES.map((category) => {
                const CategoryIcon = category.icon;
                const isExpanded = expandedCategories[category.id];

                return (
                  <div key={category.id} className="space-y-1">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                      <CategoryIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {category.label}
                      </span>
                      <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {category.nodeTypes.length}
                      </span>
                    </button>

                    {/* Category Nodes */}
                    {isExpanded && (
                      <div className="space-y-1 pl-2">
                        {category.nodeTypes.map((nodeType) => {
                          const NodeIcon = nodeType.icon;
                          return (
                            <button
                              key={nodeType.type}
                              onClick={() => handleAddNode(nodeType)}
                              className="w-full flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md text-left"
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${COLOR_MAP[nodeType.color]}20` }}
                              >
                                <NodeIcon className="w-4 h-4" style={{ color: COLOR_MAP[nodeType.color] }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                  {nodeType.label}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {nodeType.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center - React Flow Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            className="bg-gray-50 dark:bg-gray-900"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                // Find node type in categories
                for (const category of NODE_CATEGORIES) {
                  const nodeType = category.nodeTypes.find(
                    (t) => t.type === node.data?.nodeType
                  );
                  if (nodeType) {
                    return COLOR_MAP[nodeType.color];
                  }
                }
                return '#6b7280';
              }}
            />

            {/* Top Left - Back Button and Title */}
            <Panel position="top-left" className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/admin/chatbots')}
                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Voltar"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-sm font-bold text-gray-900 dark:text-white">
                    {chatbot.name}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedFlow?.name || 'Nenhum fluxo'}
                  </p>
                </div>
              </div>
            </Panel>

            {/* Top Right - Action Buttons */}
            <Panel position="top-right" className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAIAssistant(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-purple-500/30"
                  title="AI Assistant"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI
                </button>
                <button
                  onClick={() => setShowTemplateGallery(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  title="Templates"
                >
                  <Library className="w-3.5 h-3.5" />
                  Templates
                </button>
                <button
                  onClick={() => setShowSimulator(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  title="Testar Fluxo"
                >
                  <Play className="w-3.5 h-3.5" />
                  Testar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Salvar Fluxo"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Salvar
                    </>
                  )}
                </button>
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                <button
                  onClick={() => setShowVariablesPanel(!showVariablesPanel)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={showVariablesPanel ? 'Ocultar Variáveis' : 'Mostrar Variáveis'}
                >
                  <Variable className="w-3.5 h-3.5" />
                  {showVariablesPanel ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </Panel>

            {/* Bottom Center - Tip */}
            <Panel position="bottom-center" className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                💡 Conecte os nós arrastando das bordas • Use <code className="px-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{`{{variavel}}`}</code> para usar variáveis
              </p>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Sidebar - Properties Panel + Variables Panel */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {/* Properties Panel - Top Section (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedNode ? (
              <div>
                {/* Render specific properties component based on node type */}
                {selectedNode.data?.nodeType === 'message' && (
                  <MessageProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'question' && (
                  <QuestionProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'condition' && (
                  <ConditionProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                    nodes={nodes}
                    edges={edges}
                  />
                )}

                {selectedNode.data?.nodeType === 'action' && (
                  <ActionProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'delay' && (
                  <DelayProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'api_call' && (
                  <APICallProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                    nodes={nodes}
                    edges={edges}
                  />
                )}

                {selectedNode.data?.nodeType === 'ai_prompt' && (
                  <AIPromptProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                    nodes={nodes}
                    edges={edges}
                  />
                )}

                {selectedNode.data?.nodeType === 'database_query' && (
                  <DatabaseQueryProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'script' && (
                  <ScriptProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'set_variable' && (
                  <SetVariableProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'random' && (
                  <RandomProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                    nodes={nodes}
                  />
                )}

                {selectedNode.data?.nodeType === 'datetime' && (
                  <DateTimeProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'analytics' && (
                  <AnalyticsProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'whatsapp_template' && (
                  <WhatsAppTemplateProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'interactive_buttons' && (
                  <InteractiveButtonsProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'interactive_list' && (
                  <InteractiveListProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'jump' && (
                  <JumpProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                    nodes={nodes}
                    edges={edges}
                  />
                )}

                {selectedNode.data?.nodeType === 'end' && (
                  <EndProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {selectedNode.data?.nodeType === 'handoff' && (
                  <HandoffProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {/* Generic fallback for 'start' or any unknown node type */}
                {!['message', 'question', 'condition', 'action', 'delay', 'api_call', 'ai_prompt', 'database_query', 'script', 'set_variable', 'random', 'datetime', 'analytics', 'whatsapp_template', 'interactive_buttons', 'interactive_list', 'jump', 'end', 'handoff'].includes(selectedNode.data?.nodeType) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                      Propriedades do Nó
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tipo
                        </label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-900 dark:text-white">
                          {selectedNode.data?.nodeType || 'default'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ID do Nó
                        </label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                          {selectedNode.id}
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedNode.data?.nodeType === 'start'
                            ? '🚀 Este é o nó inicial do fluxo. Não requer configuração adicional.'
                            : '💡 Tipo de nó não reconhecido ou sem propriedades configuráveis'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Selecione um nó para editar suas propriedades
                </p>
              </div>
            )}
          </div>

          {/* Variables Panel - Bottom Section (conditional) */}
          {showVariablesPanel && (
            <div className="h-96 flex-shrink-0">
              <VariablesPanel
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNode?.id}
              />
            </div>
          )}
        </div>
    </div>

    {/* Flow Simulator Modal */}
      {showSimulator && (
        <FlowSimulator
          nodes={nodes}
          edges={edges}
          onClose={() => setShowSimulator(false)}
          onHighlightNode={(nodeId) => setHighlightedNodeId(nodeId)}
        />
      )}

      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <FlowTemplateGallery
          chatbotId={chatbotId}
          onClose={() => setShowTemplateGallery(false)}
          onImportSuccess={handleTemplateImportSuccess}
        />
      )}

      {/* AI Flow Assistant */}
      {showAIAssistant && (
        <AIFlowAssistant
          isOpen={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          chatbotId={chatbotId}
          onImportFlow={handleAIFlowImport}
        />
      )}

    {/* Session Expired Modal */}
    {showExpiredModal && <SessionExpiredModal onClose={hideModal} />}
    </>
  );
}
