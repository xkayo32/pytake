'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { StopCircle, Settings, Info } from 'lucide-react';

interface EndPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

export default function EndProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: EndPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [endType, setEndType] = useState(data?.endType || 'simple');
  const [farewellMessage, setFarewellMessage] = useState(data?.farewellMessage || '');
  const [closeConversation, setCloseConversation] = useState(data?.closeConversation ?? true);
  const [sendSummary, setSendSummary] = useState(data?.sendSummary ?? false);
  const [addTag, setAddTag] = useState(data?.addTag || '');
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setEndType(data?.endType || 'simple');
    setFarewellMessage(data?.farewellMessage || '');
    setCloseConversation(data?.closeConversation ?? true);
    setSendSummary(data?.sendSummary ?? false);
    setAddTag(data?.addTag || '');
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      endType,
      farewellMessage,
      closeConversation,
      sendSummary,
      addTag,
      nodeType,
      label,
    });
  }, [nodeId, endType, farewellMessage, closeConversation, sendSummary, addTag]);

  const tabs: Tab[] = [
    {
      id: 'end',
      label: 'Finalização',
      icon: StopCircle,
      content: (
        <div className="space-y-4">
          {/* End Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Finalização
            </label>
            <select
              value={endType}
              onChange={(e) => setEndType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="simple">🚪 Simples - Apenas finalizar</option>
              <option value="farewell">👋 Com Despedida - Enviar mensagem final</option>
              <option value="handoff">👤 Transferir para Humano</option>
            </select>
          </div>

          {/* Farewell Message */}
          {(endType === 'farewell' || endType === 'handoff') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mensagem de Despedida
              </label>
              <textarea
                value={farewellMessage}
                onChange={(e) => setFarewellMessage(e.target.value)}
                rows={4}
                placeholder={
                  endType === 'handoff'
                    ? 'Vou transferir você para um atendente humano...'
                    : 'Obrigado por usar nosso serviço! Até logo! 👋'
                }
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none font-mono"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {farewellMessage.length} caracteres - Use {`{{variaveis}}`} se necessário
              </p>
            </div>
          )}

          {/* Visual Preview */}
          <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full mb-2">
                <StopCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {endType === 'simple' && 'Fluxo Finalizado'}
                {endType === 'farewell' && 'Despedida e Finalização'}
                {endType === 'handoff' && 'Transferência para Humano'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {endType === 'simple' && '🔴 Conversa encerrada silenciosamente'}
                {endType === 'farewell' && '👋 Mensagem de despedida enviada'}
                {endType === 'handoff' && '👤 Aguardando atendente disponível'}
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 O que acontece após o End
            </p>
            <div className="space-y-1.5 text-xs text-blue-800 dark:text-blue-400">
              <p>• O fluxo atual é encerrado</p>
              <p>• A conversa pode ser fechada (opcional)</p>
              <p>• Nenhum nó adicional será executado</p>
              <p>
                • Nova mensagem do usuário pode iniciar um novo fluxo (se configurado no bot)
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'config',
      label: 'Configuração',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Close Conversation */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="closeConversation"
              checked={closeConversation}
              onChange={(e) => setCloseConversation(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-red-500"
            />
            <div className="flex-1">
              <label
                htmlFor="closeConversation"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Fechar conversa automaticamente
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {closeConversation
                  ? '✅ A conversa será marcada como "fechada" no sistema'
                  : '⏸️ A conversa permanecerá aberta (inativa)'}
              </p>
            </div>
          </div>

          {/* Send Summary */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="sendSummary"
              checked={sendSummary}
              onChange={(e) => setSendSummary(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-red-500"
            />
            <div className="flex-1">
              <label
                htmlFor="sendSummary"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Enviar resumo da conversa por email
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {sendSummary
                  ? '📧 Um resumo da conversa será enviado ao usuário (se tiver email)'
                  : '❌ Sem envio de resumo'}
              </p>
            </div>
          </div>

          {/* Add Tag */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adicionar Tag ao Contato (Opcional)
            </label>
            <input
              type="text"
              value={addTag}
              onChange={(e) => setAddTag(e.target.value)}
              placeholder="fluxo_completo, cliente_atendido"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tag para marcar que o usuário completou este fluxo
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              💡 Boas Práticas
            </p>
            <div className="space-y-2 text-xs text-purple-800 dark:text-purple-400">
              <div>
                <p className="font-medium">Sempre use mensagem de despedida:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Melhor UX - usuário sabe que o atendimento foi concluído
                </p>
              </div>
              <div>
                <p className="font-medium">Use tags para segmentação:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Marque quem completou o fluxo para campanhas futuras
                </p>
              </div>
              <div>
                <p className="font-medium">Feche conversas resolvidas:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Mantém o inbox organizado e facilita métricas
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'info',
      label: 'Informações',
      icon: Info,
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              ℹ️ Sobre o End
            </p>
            <div className="space-y-2 text-xs text-green-800 dark:text-green-400">
              <p>
                O nó de End marca o final de um fluxo. É o ponto onde a execução do bot para e a
                conversa pode ser considerada completa.
              </p>
              <p className="mt-2">
                <strong>Importante:</strong> Se a conversa não for fechada, novas mensagens do
                usuário podem iniciar novamente o bot (se configurado).
              </p>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-2">
              ⚠️ Diferença entre End e Handoff
            </p>
            <div className="space-y-2 text-xs text-yellow-800 dark:text-yellow-400">
              <div>
                <strong>End:</strong> Finaliza completamente o atendimento automático
              </div>
              <div>
                <strong>Handoff:</strong> Transfere para atendimento humano (conversa continua)
              </div>
              <div className="mt-2 text-gray-600 dark:text-gray-400">
                Use End quando o bot resolver completamente o problema. Use Handoff quando
                precisar de intervenção humana.
              </div>
            </div>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs font-medium text-red-900 dark:text-red-300 mb-2">
              🔴 Métricas Importantes
            </p>
            <div className="space-y-1 text-xs text-red-800 dark:text-red-400">
              <p>• Taxa de conclusão: % de usuários que chegam ao End</p>
              <p>• Tempo até conclusão: Quanto tempo até chegar no End</p>
              <p>• Satisfação: NPS após chegar no End</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              💡 Informação
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Nós de End não geram variáveis de saída. Eles apenas marcam o fim do fluxo de
              execução.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="end" />;
}
