'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import AvailableVariables from './AvailableVariables';
import { FileText, Palette, Clock, BarChart3 } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';

interface MessagePropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
  nodes?: Node[];
  edges?: Edge[];
}

export default function MessageProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
  nodes = [],
  edges = [],
}: MessagePropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [messageType, setMessageType] = useState(data?.messageType || 'text');
  const [messageText, setMessageText] = useState(data?.messageText || '');
  const [mediaUrl, setMediaUrl] = useState(data?.mediaUrl || '');
  const [delay, setDelay] = useState(data?.delay || 0);
  const [autoAdvance, setAutoAdvance] = useState(data?.autoAdvance ?? true);
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setMessageType(data?.messageType || 'text');
    setMessageText(data?.messageText || '');
    setMediaUrl(data?.mediaUrl || '');
    setDelay(data?.delay || 0);
    setAutoAdvance(data?.autoAdvance ?? true);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      messageType,
      messageText,
      mediaUrl,
      delay,
      autoAdvance,
      nodeType,
      label,
    });
  }, [nodeId, messageType, messageText, mediaUrl, delay, autoAdvance]);

  const tabs: Tab[] = [
    {
      id: 'content',
      label: 'Conteúdo',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Message Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Mensagem
            </label>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="text">📝 Texto</option>
              <option value="image">🖼️ Imagem</option>
              <option value="video">🎥 Vídeo</option>
              <option value="audio">🎵 Áudio</option>
              <option value="document">📄 Documento</option>
              <option value="location">📍 Localização</option>
            </select>
          </div>

          {/* Message Text */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Texto da Mensagem
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={6}
              placeholder="Digite a mensagem... Use {{variavel}} para inserir variáveis"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {messageText.length} caracteres
            </p>
          </div>

          {/* Media URL (if not text) */}
          {messageType !== 'text' && messageType !== 'location' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL do Arquivo
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://exemplo.com/arquivo.jpg"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                💡 URL pública do arquivo de mídia
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'formatting',
      label: 'Formatação',
      icon: Palette,
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              Formatação WhatsApp
            </p>
            <div className="space-y-1.5 text-xs text-blue-800 dark:text-blue-400">
              <div className="flex items-center gap-2">
                <code className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">*texto*</code>
                <span>→ Negrito</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">_texto_</code>
                <span>→ Itálico</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">~texto~</code>
                <span>→ Riscado</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded">```texto```</code>
                <span>→ Monoespaçado</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              Emojis Comuns
            </p>
            <div className="grid grid-cols-4 gap-2">
              {['👋', '😊', '✅', '❌', '⚠️', '💡', '📞', '📧', '🎉', '🔔', '⭐', '❤️'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setMessageText((prev) => prev + emoji)}
                  className="p-2 text-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded transition-colors"
                  title="Adicionar emoji"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'behavior',
      label: 'Comportamento',
      icon: Clock,
      content: (
        <div className="space-y-4">
          {/* Delay */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Atraso antes de enviar (segundos)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={delay}
                onChange={(e) => setDelay(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-center">
                {delay}s
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {delay > 0 ? '⏱️ Simulando digitação...' : '⚡ Envio imediato'}
            </p>
          </div>

          {/* Auto Advance */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="autoAdvance"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="autoAdvance" className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                Continuar automaticamente
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {autoAdvance
                  ? '✅ Vai para o próximo nó sem esperar resposta'
                  : '⏸️ Aguarda resposta do usuário antes de continuar'}
              </p>
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
          <AvailableVariables
            nodes={nodes}
            edges={edges}
            selectedNodeId={nodeId}
          />

          <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              💡 Informação
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Nós de mensagem não geram variáveis de saída. Eles apenas enviam conteúdo para o usuário.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="content" />;
}
