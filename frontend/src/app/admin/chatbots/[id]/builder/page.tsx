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
} from 'lucide-react';
import { chatbotsAPI, flowsAPI } from '@/lib/api/chatbots';
import type { Chatbot, Flow } from '@/types/chatbot';
import AIPromptProperties from '@/components/admin/builder/AIPromptProperties';
import APICallProperties from '@/components/admin/builder/APICallProperties';
import HandoffProperties from '@/components/admin/builder/HandoffProperties';
import CustomNode from '@/components/admin/builder/CustomNode';
import VariablesPanel from '@/components/admin/builder/VariablesPanel';
import FlowSimulator from '@/components/admin/builder/FlowSimulator';
import SessionExpiredModal from '@/components/admin/SessionExpiredModal';
import { useSessionExpired } from '@/lib/hooks/useSessionExpired';
import { useToast } from '@/store/notificationStore';

// Palette of node types available to drag
const NODE_TYPES_PALETTE = [
  { type: 'start', label: 'Início', icon: Play, color: 'green', description: 'Ponto de entrada do fluxo' },
  { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'blue', description: 'Enviar uma mensagem' },
  { type: 'question', label: 'Pergunta', icon: HelpCircle, color: 'purple', description: 'Capturar resposta do usuário' },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: 'orange', description: 'Decisão condicional' },
  { type: 'action', label: 'Ação', icon: Zap, color: 'yellow', description: 'Executar uma ação' },
  { type: 'api_call', label: 'API', icon: Globe, color: 'indigo', description: 'Chamar API externa' },
  { type: 'ai_prompt', label: 'IA', icon: Brain, color: 'pink', description: 'Prompt para IA (GPT-4)' },
  { type: 'jump', label: 'Pular', icon: ArrowRight, color: 'gray', description: 'Pular para outro fluxo' },
  { type: 'end', label: 'Fim', icon: StopCircle, color: 'red', description: 'Finalizar fluxo' },
  { type: 'handoff', label: 'Transferir', icon: Users, color: 'teal', description: 'Transferir para humano' },
];

const COLOR_MAP: Record<string, string> = {
  green: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f97316',
  yellow: '#eab308',
  indigo: '#6366f1',
  pink: '#ec4899',
  gray: '#6b7280',
  red: '#ef4444',
  teal: '#14b8a6',
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
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
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

  const handleAddNode = (nodeType: typeof NODE_TYPES_PALETTE[0]) => {
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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/chatbots')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {chatbot.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Editor de Fluxos • {selectedFlow?.name || 'Nenhum fluxo selecionado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSimulator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Testar Fluxo
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Node Palette */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Nó
            </h3>
            <div className="space-y-2">
              {NODE_TYPES_PALETTE.map((nodeType) => {
                const Icon = nodeType.icon;
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
                      <Icon className="w-4 h-4" style={{ color: COLOR_MAP[nodeType.color] }} />
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
                const nodeType = NODE_TYPES_PALETTE.find(
                  (t) => t.type === node.data?.nodeType
                );
                return nodeType ? COLOR_MAP[nodeType.color] : '#6b7280';
              }}
            />
            <Panel position="top-center" className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 Dica: Conecte os nós arrastando das bordas. Use <code className="px-1 bg-gray-100 dark:bg-gray-700 rounded">{`{{variavel}}`}</code> para usar variáveis
              </p>
            </Panel>
            <Panel position="top-right" className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowVariablesPanel(!showVariablesPanel)}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <Variable className="w-4 h-4" />
                {showVariablesPanel ? 'Ocultar' : 'Mostrar'} Variáveis
              </button>
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

                {selectedNode.data?.nodeType === 'handoff' && (
                  <HandoffProperties
                    nodeId={selectedNode.id}
                    data={selectedNode.data}
                    onChange={handleNodeDataChange}
                    chatbotId={chatbotId}
                  />
                )}

                {/* Generic properties for other node types */}
                {!['ai_prompt', 'api_call', 'handoff'].includes(selectedNode.data?.nodeType) && (
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
                          💡 Editor de propriedades para este tipo de nó será implementado em breve
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

      {/* Session Expired Modal */}
      {showExpiredModal && <SessionExpiredModal onClose={hideModal} />}
    </div>
  );
}
