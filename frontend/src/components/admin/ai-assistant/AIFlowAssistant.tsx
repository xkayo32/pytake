/**
 * AIFlowAssistant Component
 *
 * Conversational AI assistant for generating chatbot flows from natural language descriptions.
 * Features:
 * - Chat-like interface for describing desired flow
 * - Industry/sector selection for context
 * - Example prompts for quick start
 * - Flow preview and import functionality
 * - Clarification questions handling
 * - Error handling with retry mechanism
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Loader2,
  Trash2,
  Lightbulb,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { aiFlowAssistantAPI } from '@/lib/api/chatbots';
import { useToast } from '@/store/notificationStore';
import ChatMessage from './ChatMessage';
import FlowPreview from './FlowPreview';
import IndustrySelect from './IndustrySelect';
import ExamplesModal from './ExamplesModal';
import ClarificationForm from './ClarificationForm';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ClarificationQuestion {
  question: string;
  options?: string[];
  field: string;
}

interface GeneratedFlow {
  name: string;
  description: string;
  canvas_data: {
    nodes: any[];
    edges: any[];
  };
}

export interface AIFlowAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  onImportFlow: (flowData: GeneratedFlow, flowName: string) => Promise<void>;
}

export default function AIFlowAssistant({
  isOpen,
  onClose,
  chatbotId,
  onImportFlow,
}: AIFlowAssistantProps) {
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [industry, setIndustry] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFlow, setGeneratedFlow] = useState<GeneratedFlow | null>(null);
  const [clarificationQuestions, setClarificationQuestions] = useState<
    ClarificationQuestion[]
  >([]);
  const [lastDescription, setLastDescription] = useState(''); // Store last description for clarifications
  const [isImporting, setIsImporting] = useState(false);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  // Rate limiting state
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const RATE_LIMIT_MS = 3000; // 3 seconds

  // Check if AI is enabled on mount
  useEffect(() => {
    checkAIEnabled();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history from localStorage
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
      loadGeneratedFlow();
    }
  }, [isOpen]);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory();
    }
  }, [messages]);

  // Save generated flow to localStorage
  useEffect(() => {
    saveGeneratedFlow();
  }, [generatedFlow]);

  const checkAIEnabled = async () => {
    try {
      const result = await aiFlowAssistantAPI.checkEnabled();
      setAiEnabled(result.enabled);
      setAiConfigured(result.configured);
    } catch (error) {
      console.error('Error checking AI status:', error);
      setAiEnabled(false);
      setAiConfigured(false);
    }
  };

  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem(`ai_chat_history_${chatbotId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(
          parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = () => {
    try {
      localStorage.setItem(`ai_chat_history_${chatbotId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const loadGeneratedFlow = () => {
    try {
      const saved = localStorage.getItem(`ai_generated_flow_${chatbotId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setGeneratedFlow(parsed);
      }
    } catch (error) {
      console.error('Error loading generated flow:', error);
    }
  };

  const saveGeneratedFlow = () => {
    try {
      if (generatedFlow) {
        localStorage.setItem(`ai_generated_flow_${chatbotId}`, JSON.stringify(generatedFlow));
      } else {
        localStorage.removeItem(`ai_generated_flow_${chatbotId}`);
      }
    } catch (error) {
      console.error('Error saving generated flow:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (type: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleGenerateFlow = async () => {
    // Validate input
    if (!inputValue.trim()) {
      toast.error('Por favor, descreva o flow que você deseja criar');
      return;
    }

    if (inputValue.length < 10) {
      toast.error('Por favor, forneça uma descrição mais detalhada (mínimo 10 caracteres)');
      return;
    }

    if (inputValue.length > 2000) {
      toast.error('Descrição muito longa (máximo 2000 caracteres)');
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastRequestTime)) / 1000);
      toast.error(`Aguarde ${waitTime} segundos antes de fazer outra solicitação`);
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedFlow(null);
      setClarificationQuestions([]);
      setLastRequestTime(now);

      // Add user message
      addMessage('user', inputValue);
      const userInput = inputValue;
      setInputValue('');
      setLastDescription(userInput); // Store for clarifications

      // Call API
      const response = await aiFlowAssistantAPI.generateFlow({
        description: userInput,
        industry: industry || undefined,
        language: 'pt-BR',
        chatbot_id: chatbotId,
      });

      if (response.status === 'success' && response.flow_data) {
        // Success - show preview
        setGeneratedFlow(response.flow_data);
        addMessage(
          'assistant',
          `Flow "${response.flow_data.name}" gerado com sucesso! Confira o preview abaixo e clique em "Importar Flow" para adicioná-lo ao seu chatbot.`
        );
      } else if (response.status === 'needs_clarification' && response.clarification_questions) {
        // Needs clarification
        setClarificationQuestions(response.clarification_questions);
        const questionsText = response.clarification_questions
          .map((q, i) => `${i + 1}. ${q.question}`)
          .join('\n');
        addMessage(
          'assistant',
          `Preciso de mais informações para gerar o flow ideal:\n\n${questionsText}\n\nPor favor, responda essas perguntas para continuar.`
        );
      } else if (response.status === 'error') {
        // Error
        addMessage(
          'assistant',
          `Erro ao gerar flow: ${response.error_message || 'Erro desconhecido. Tente novamente.'}`
        );
        toast.error(response.error_message || 'Erro ao gerar flow');
      }
    } catch (error: any) {
      console.error('Error generating flow:', error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        'Erro ao gerar flow. Verifique se o AI Assistant está configurado.';
      addMessage('assistant', `Erro: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async (flowName: string) => {
    if (!generatedFlow) return;

    try {
      setIsImporting(true);

      // Update flow name if changed
      const flowToImport = {
        ...generatedFlow,
        name: flowName,
      };

      await onImportFlow(flowToImport, flowName);

      toast.success(`Flow "${flowName}" importado com sucesso!`);
      addMessage('assistant', `Flow "${flowName}" foi importado com sucesso! Você pode fechá-lo agora e editá-lo no builder.`);

      // Clear generated flow
      setGeneratedFlow(null);

      // Close assistant after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error importing flow:', error);
      toast.error(error.response?.data?.detail || 'Erro ao importar flow');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRetry = () => {
    setGeneratedFlow(null);
    addMessage('assistant', 'Vamos tentar novamente. Por favor, descreva o flow que você deseja criar.');
  };

  const handleSubmitClarifications = async (answers: Record<string, string>) => {
    try {
      setIsGenerating(true);
      setClarificationQuestions([]);

      // Add user answers as message
      const answersText = Object.entries(answers)
        .map(([field, answer]) => `${field}: ${answer}`)
        .join('\n');
      addMessage('user', `Respostas:\n${answersText}`);

      // Call API with clarifications - backend expects Dict[str, str] format
      const response = await aiFlowAssistantAPI.generateFlow({
        description: lastDescription,
        industry: industry || undefined,
        language: 'pt-BR',
        chatbot_id: chatbotId,
        clarifications: answers, // Send answers as clarifications
      });

      if (response.status === 'success' && response.flow_data) {
        setGeneratedFlow(response.flow_data);
        addMessage(
          'assistant',
          `Flow "${response.flow_data.name}" gerado com sucesso! Confira o preview abaixo.`
        );
      } else if (response.status === 'needs_clarification' && response.clarification_questions) {
        // More clarifications needed
        setClarificationQuestions(response.clarification_questions);
        const questionsText = response.clarification_questions
          .map((q, i) => `${i + 1}. ${q.question}`)
          .join('\n');
        addMessage(
          'assistant',
          `Preciso de mais algumas informações:\n\n${questionsText}`
        );
      } else if (response.status === 'error') {
        addMessage(
          'assistant',
          `Erro: ${response.error_message || 'Erro desconhecido'}`
        );
        toast.error(response.error_message || 'Erro ao gerar flow');
      }
    } catch (error: any) {
      console.error('Error submitting clarifications:', error);
      const errorMessage =
        error.response?.data?.detail || error.message || 'Erro ao enviar respostas';
      addMessage('assistant', `Erro: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setGeneratedFlow(null);
    setClarificationQuestions([]);
    setInputValue('');
    try {
      localStorage.removeItem(`ai_chat_history_${chatbotId}`);
      localStorage.removeItem(`ai_generated_flow_${chatbotId}`);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const handleSelectExample = (prompt: string) => {
    setInputValue(prompt);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerateFlow();
    }
    // Escape to close
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Show error if AI is not configured
  const showAIError = aiEnabled === false || aiConfigured === false;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[500px] bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Flow Assistant</h2>
              <p className="text-sm text-purple-100">Gere flows com inteligência artificial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* AI Not Configured Warning */}
        {showAIError && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
                  AI Assistant não configurado
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  Configure o AI Assistant nas configurações da organização para usar este recurso.
                </p>
                <a
                  href="/admin/settings"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Ir para Configurações
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Descreva o flow que você quer criar
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Use linguagem natural para descrever seu chatbot. A IA irá gerar o flow automaticamente!
              </p>
              <button
                onClick={() => setShowExamplesModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
              >
                <Lightbulb className="w-4 h-4" />
                Ver Exemplos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} {...message} />
              ))}

              {/* Clarification Form */}
              {clarificationQuestions.length > 0 && (
                <div className="mt-4">
                  <ClarificationForm
                    questions={clarificationQuestions}
                    onSubmit={handleSubmitClarifications}
                    isLoading={isGenerating}
                  />
                </div>
              )}

              {/* Flow Preview */}
              {generatedFlow && (
                <div className="mt-4">
                  <FlowPreview
                    flowData={generatedFlow}
                    onImport={handleImport}
                    onRetry={handleRetry}
                  />
                </div>
              )}

              {/* Loading Indicator */}
              {isGenerating && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          {/* Industry Select */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Indústria/Setor (opcional)
            </label>
            <IndustrySelect
              value={industry}
              onChange={setIndustry}
              placeholder="Selecione ou digite o setor..."
            />
          </div>

          {/* Input Field */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o flow que você quer criar... (Ctrl+Enter para enviar)"
              disabled={isGenerating || showAIError}
              rows={3}
              className="w-full px-4 py-3 pr-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ maxHeight: '150px' }}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                onClick={() => setShowExamplesModal(true)}
                className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                title="Ver exemplos"
                type="button"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Limpar chat"
                  type="button"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleGenerateFlow}
                disabled={isGenerating || !inputValue.trim() || showAIError}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Gerar flow (Ctrl+Enter)"
                type="button"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Character Count */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {inputValue.length}/2000 caracteres
            </span>
            <span className="text-gray-400 dark:text-gray-500">
              Ctrl+Enter para enviar
            </span>
          </div>
        </div>
      </div>

      {/* Examples Modal */}
      <ExamplesModal
        isOpen={showExamplesModal}
        onClose={() => setShowExamplesModal(false)}
        onSelectExample={handleSelectExample}
      />
    </>
  );
}
