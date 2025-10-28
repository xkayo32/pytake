'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Play, RotateCcw, Send, User, Bot, Variable, Zap } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

interface FlowSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onHighlightNode?: (nodeId: string | null) => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface FlowState {
  currentNodeId: string | null;
  variables: Record<string, any>;
  executionHistory: string[];
  isWaitingForInput: boolean;
  completed: boolean;
}

export default function FlowSimulator({
  nodes,
  edges,
  onClose,
  onHighlightNode,
}: FlowSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [flowState, setFlowState] = useState<FlowState>({
    currentNodeId: null,
    variables: {
      'contact.name': 'Usuário Teste',
      'contact.phone': '+5511999999999',
      'contact.email': 'teste@exemplo.com',
      'conversation.id': 'sim-123',
      'current_time': new Date().toLocaleTimeString(),
      'current_date': new Date().toLocaleDateString(),
    },
    executionHistory: [],
    isWaitingForInput: false,
    completed: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Highlight current node
  useEffect(() => {
    if (onHighlightNode && flowState.currentNodeId) {
      onHighlightNode(flowState.currentNodeId);
    }
    return () => {
      if (onHighlightNode) {
        onHighlightNode(null);
      }
    };
  }, [flowState.currentNodeId, onHighlightNode]);

  // Start flow
  useEffect(() => {
    startFlow();
  }, []);

  const addMessage = (text: string, sender: 'user' | 'bot') => {
    const newMessage: Message = {
      id: Math.random().toString(36),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const replaceVariables = (text: any, variables: Record<string, any>): string => {
    // Accept any incoming value and coerce to string safely
    let result = String(text ?? '');
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      // Preserve falsy non-null values like 0, but convert null/undefined to empty string
      result = result.replace(regex, value == null ? '' : String(value));
    });
    return result;
  };

  const getNextNode = (currentNodeId: string, outputLabel?: string): Node | null => {
    const outgoingEdges = edges.filter((e) => e.source === currentNodeId);

    if (outputLabel) {
      // For condition nodes, find edge matching label
      const matchingEdge = outgoingEdges.find((e) =>
        e.sourceHandle?.includes(outputLabel) || e.label === outputLabel
      );
      if (matchingEdge) {
        return nodes.find((n) => n.id === matchingEdge.target) || null;
      }
    }

    // Default: return first connected node
    if (outgoingEdges.length > 0) {
      return nodes.find((n) => n.id === outgoingEdges[0].target) || null;
    }

    return null;
  };

  // Execute node with explicit variables to avoid race condition
  const executeNodeWithVariables = async (node: Node, explicitVariables: Record<string, any>) => {
    const nodeType = node.data?.nodeType;
    let nextNode: Node | null = null;
    const newVariables = { ...explicitVariables };

    // Add to execution history
    setFlowState((prev) => ({
      ...prev,
      executionHistory: [...prev.executionHistory, `${nodeType} (${node.id})`],
      currentNodeId: node.id,
      variables: newVariables, // Ensure variables are in sync
    }));

    switch (nodeType) {
      case 'start':
        nextNode = getNextNode(node.id);
        break;

      case 'message':
  const messageText = node.data?.messageText || 'Mensagem não configurada';
  const processedMessage = replaceVariables(String(messageText ?? ''), newVariables);
        addMessage(processedMessage, 'bot');

  await new Promise((resolve) => setTimeout(resolve, (Number(node.data?.delay) * 1000) || 500));

        if (node.data?.autoAdvance !== false) {
          nextNode = getNextNode(node.id);
        }
        break;

      case 'question':
  const questionText = node.data?.questionText || 'Por favor, responda:';
  const processedQuestion = replaceVariables(String(questionText ?? ''), newVariables);
        addMessage(processedQuestion, 'bot');

        setFlowState((prev) => ({ ...prev, isWaitingForInput: true }));
        return;

      case 'condition':
  const conditions: any[] = node.data?.conditions || [];
        let conditionMet = false;

  for (const condition of conditions) {
          const variable = condition.variable?.replace(/[{}]/g, '').trim();
          const value = newVariables[variable];
          const compareValue = condition.value;

          let matches = false;
          switch (condition.operator) {
            case '==':
              matches = String(value) === String(compareValue);
              break;
            case '!=':
              matches = String(value) !== String(compareValue);
              break;
            case 'contains':
              matches = String(value).includes(String(compareValue));
              break;
            case 'is_empty':
              matches = !value || String(value).trim() === '';
              break;
            case 'is_not_empty':
              matches = value && String(value).trim() !== '';
              break;
            default:
              matches = false;
          }

          if (matches) {
            nextNode = getNextNode(node.id, condition.label);
            conditionMet = true;
            break;
          }
        }

        if (!conditionMet && node.data?.hasDefaultRoute) {
          nextNode = getNextNode(node.id, 'default');
        }
        break;

      case 'end':
        addMessage('🏁 Conversa finalizada', 'bot');
        setFlowState((prev) => ({ ...prev, completed: true, currentNodeId: null }));
        return;

      case 'ai_prompt':
      case 'api_call':
      case 'database_query':
        addMessage('⏳ Processando...', 'bot');
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const outputVar = node.data?.outputVariable || node.data?.responseVar;
        if (outputVar) {
          newVariables[String(outputVar)] = `[Resposta simulada de ${nodeType}]`;
        }

        nextNode = getNextNode(node.id);
        break;

      case 'script':
        addMessage('⚙️ Executando script...', 'bot');
        await new Promise((resolve) => setTimeout(resolve, 500));

        const scriptCode = node.data?.scriptCode;
        const scriptOutputVar = node.data?.outputVariable;
        const scriptLanguage = node.data?.scriptLanguage || 'javascript';
        const pythonPackages = node.data?.pythonPackages || [];

        if (scriptCode && scriptOutputVar) {
          try {
            let result;

            if (scriptLanguage === 'javascript') {
              // JavaScript execution
              const wrappedCode = `
                try {
                  ${scriptCode}
                } catch (error) {
                  throw new Error('Erro na execução: ' + (error && error.message ? error.message : String(error)));
                }
              `;

              // Filter out functions from variables to avoid passing executable references
              const safeEntries = Object.entries(newVariables).filter(([, v]) => typeof v !== 'function');
              const safeContext: Record<string, any> = Object.fromEntries(safeEntries);

              const fn = new Function(...Object.keys(safeContext), wrappedCode);
              try {
                result = fn(...Object.values(safeContext));
              } catch (err: any) {
                throw new Error('Erro na execução do script JS: ' + (err?.message || String(err)));
              }
            } else if (scriptLanguage === 'python') {
              // Python execution via Pyodide
              // @ts-ignore
              if (typeof window !== 'undefined' && window.loadPyodide) {
                addMessage('🐍 Carregando Python...', 'bot');
                // @ts-ignore
                try {
                  const pyodide = await (window as any).loadPyodide({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
                  });

                  // Load Python packages if specified
                  if ((pythonPackages as any).length > 0) {
                    addMessage(`📦 Carregando bibliotecas: ${(pythonPackages as any).join(', ') }...`, 'bot');
                    await pyodide.loadPackage(pythonPackages as any);
                  }

                  // Set variables in Python namespace (filter functions)
                  for (const [key, value] of Object.entries(newVariables as any).filter(([, v]) => typeof v !== 'function')) {
                    pyodide.globals.set(key, value);
                  }

                  // Execute Python code
                  result = pyodide.runPython(scriptCode);
                } catch (pyErr: any) {
                  addMessage(`❌ Falha ao executar código Python: ${pyErr?.message || String(pyErr)}`, 'bot');
                  throw pyErr;
                }
              } else {
                throw new Error('Python não está disponível. Recarregue a página.');
              }
            }

            // Save result to output variable
            newVariables[String(scriptOutputVar)] = result;
            addMessage(`✅ Script executado: ${JSON.stringify(result)}`, 'bot');
          } catch (error: any) {
            addMessage(`❌ Erro no script: ${error.message}`, 'bot');
            // Continue flow even on error
          }
        } else {
          addMessage('⚠️ Script sem código ou variável de saída', 'bot');
        }

        nextNode = getNextNode(node.id);
        break;

      default:
        nextNode = getNextNode(node.id);
    }

    // Update variables
    setFlowState((prev) => ({
      ...prev,
      variables: newVariables,
    }));

    // Continue to next node
    if (nextNode) {
      setTimeout(() => executeNodeWithVariables(nextNode, newVariables), 300);
    } else {
      // Use functional update to avoid stale closure read of flowState
      setFlowState((prev) => {
        if (!prev.completed) {
          addMessage('✅ Fluxo concluído', 'bot');
          return { ...prev, completed: true, currentNodeId: null };
        }
        return prev;
      });
    }
  };

  const startFlow = () => {
    // Find start node
    const startNode = nodes.find((n) => n.data?.nodeType === 'start');
    if (startNode) {
      executeNodeWithVariables(startNode, flowState.variables);
    } else {
      addMessage('❌ Nó de início não encontrado', 'bot');
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    addMessage(inputValue, 'user');

    // Save user input to variable if waiting for question response
    if (flowState.isWaitingForInput && flowState.currentNodeId) {
      const currentNode = nodes.find((n) => n.id === flowState.currentNodeId);
      if (currentNode && currentNode.data?.nodeType === 'question') {
        const outputVar = currentNode.data?.outputVariable;
        if (outputVar) {
          // FIXED: Create new variables object with user input
          const newVariables = { ...flowState.variables, [outputVar]: inputValue };

          // Update state
          setFlowState((prev) => ({
            ...prev,
            variables: newVariables,
            isWaitingForInput: false,
          }));

          // Continue to next node WITH updated variables
          const nextNode = getNextNode(currentNode.id);
          if (nextNode) {
            // Pass updated variables explicitly to avoid race condition
            setTimeout(() => {
              executeNodeWithVariables(nextNode, newVariables);
            }, 300);
          }
        }
      }
    }

    setInputValue('');
  };

  const handleReset = () => {
    setMessages([]);
    setFlowState({
      currentNodeId: null,
      variables: {
        'contact.name': 'Usuário Teste',
        'contact.phone': '+5511999999999',
        'contact.email': 'teste@exemplo.com',
        'conversation.id': 'sim-123',
        'current_time': new Date().toLocaleTimeString(),
        'current_date': new Date().toLocaleDateString(),
      },
      executionHistory: [],
      isWaitingForInput: false,
      completed: false,
    });
    startFlow();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Simulador de Fluxo</h2>
              <p className="text-xs text-indigo-100">Teste seu chatbot em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              title="Reiniciar teste"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Iniciando simulação...</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[70%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.sender === 'user'
                        ? 'bg-indigo-500'
                        : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                      {msg.sender === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      )}
                    </div>
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        msg.sender === 'user'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'user' ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={
                    flowState.completed
                      ? 'Teste finalizado - clique em reiniciar'
                      : flowState.isWaitingForInput
                      ? 'Digite sua resposta...'
                      : 'Aguarde o bot processar...'
                  }
                  disabled={!flowState.isWaitingForInput || flowState.completed}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!flowState.isWaitingForInput || !inputValue.trim() || flowState.completed}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Debug Panel */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            {/* Current Node */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Nó Atual
                </h3>
              </div>
              {flowState.currentNodeId ? (
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                  {nodes.find((n) => n.id === flowState.currentNodeId)?.data?.nodeType || 'Desconhecido'}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">Nenhum</p>
              )}
            </div>

            {/* Variables */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Variable className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Variáveis ({Object.keys(flowState.variables).length})
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(flowState.variables).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                    <p className="text-xs font-mono font-semibold text-purple-600 dark:text-purple-400">
                      {key}
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 break-words">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Execution History */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Histórico de Execução
              </h3>
              <div className="space-y-1 text-xs">
                {flowState.executionHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-gray-400">#{idx + 1}</span>
                    <span className="font-mono">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
