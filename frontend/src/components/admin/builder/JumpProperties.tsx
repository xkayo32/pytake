'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { ArrowRight, Settings, Info } from 'lucide-react';

interface JumpPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

export default function JumpProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: JumpPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [jumpType, setJumpType] = useState(data?.jumpType || 'flow');
  const [targetFlow, setTargetFlow] = useState(data?.targetFlow || '');
  const [targetNode, setTargetNode] = useState(data?.targetNode || '');
  const [preserveContext, setPreserveContext] = useState(data?.preserveContext ?? true);
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setJumpType(data?.jumpType || 'flow');
    setTargetFlow(data?.targetFlow || '');
    setTargetNode(data?.targetNode || '');
    setPreserveContext(data?.preserveContext ?? true);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      jumpType,
      targetFlow,
      targetNode,
      preserveContext,
      nodeType,
      label,
    });
  }, [nodeId, jumpType, targetFlow, targetNode, preserveContext]);

  const tabs: Tab[] = [
    {
      id: 'jump',
      label: 'Pular Para',
      icon: ArrowRight,
      content: (
        <div className="space-y-4">
          {/* Jump Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Salto
            </label>
            <select
              value={jumpType}
              onChange={(e) => setJumpType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="flow">🔀 Outro Fluxo</option>
              <option value="node">🎯 Nó Específico (mesmo fluxo)</option>
            </select>
          </div>

          {/* Target Flow */}
          {jumpType === 'flow' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fluxo de Destino
              </label>
              <select
                value={targetFlow}
                onChange={(e) => setTargetFlow(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="">Selecione um fluxo</option>
                <option value="main">Main Flow</option>
                <option value="support">Fluxo de Suporte</option>
                <option value="sales">Fluxo de Vendas</option>
                <option value="faq">Fluxo de FAQ</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                O usuário será redirecionado para o início deste fluxo
              </p>
            </div>
          )}

          {/* Target Node */}
          {jumpType === 'node' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nó de Destino
              </label>
              <input
                type="text"
                value={targetNode}
                onChange={(e) => setTargetNode(e.target.value)}
                placeholder="ID do nó de destino"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Informe o ID do nó para onde deseja pular (dentro do mesmo fluxo)
              </p>
            </div>
          )}

          {/* Visual Representation */}
          <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-center gap-3">
              <div className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium">
                Nó Atual
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-500 rounded-lg text-xs font-medium">
                {jumpType === 'flow'
                  ? targetFlow || 'Selecione Fluxo'
                  : targetNode || 'Selecione Nó'}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Como funciona o Jump
            </p>
            <div className="space-y-1.5 text-xs text-blue-800 dark:text-blue-400">
              <p>
                <strong>Outro Fluxo:</strong> Abandona o fluxo atual e inicia outro completamente
              </p>
              <p>
                <strong>Nó Específico:</strong> Pula para outro ponto do mesmo fluxo (cria loops
                ou atalhos)
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
          {/* Preserve Context */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="preserveContext"
              checked={preserveContext}
              onChange={(e) => setPreserveContext(e.target.checked)}
              className="mt-1 w-4 h-4 text-gray-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-gray-500"
            />
            <div className="flex-1">
              <label
                htmlFor="preserveContext"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Preservar contexto e variáveis
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {preserveContext
                  ? '✅ Todas as variáveis do fluxo atual serão mantidas'
                  : '❌ O novo fluxo iniciará com contexto limpo'}
              </p>
            </div>
          </div>

          {/* Warning for context */}
          {!preserveContext && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                ⚠️ Atenção
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-400">
                Se desativar "Preservar contexto", todas as variáveis criadas até agora serão
                perdidas. Isso pode quebrar referências em nós seguintes.
              </p>
            </div>
          )}

          {/* Use Cases */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              💡 Casos de Uso
            </p>
            <div className="space-y-2 text-xs text-purple-800 dark:text-purple-400">
              <div>
                <p className="font-medium">Redirecionar para departamento:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Depois de identificar o interesse, pular para fluxo específico (vendas, suporte)
                </p>
              </div>
              <div>
                <p className="font-medium">Criar loop:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Pular de volta para um nó anterior para repetir um processo
                </p>
              </div>
              <div>
                <p className="font-medium">Atalho condicional:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  Pular várias etapas se uma condição específica for atendida
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
              ℹ️ Sobre o Jump
            </p>
            <div className="space-y-2 text-xs text-green-800 dark:text-green-400">
              <p>
                O nó de Jump permite criar fluxos mais complexos e dinâmicos, redirecionando o
                usuário para diferentes partes do bot.
              </p>
              <p className="mt-2">
                <strong>Importante:</strong> Certifique-se de que o destino existe, caso contrário
                o fluxo será interrompido com erro.
              </p>
            </div>
          </div>

          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-xs font-medium text-orange-900 dark:text-orange-300 mb-2">
              ⚠️ Cuidado com Loops Infinitos
            </p>
            <p className="text-xs text-orange-800 dark:text-orange-400 mb-2">
              Se você criar um Jump de volta para o mesmo nó ou uma sequência circular sem
              condição de saída, o bot ficará preso em loop infinito.
            </p>
            <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/40 rounded text-xs text-orange-900 dark:text-orange-300">
              <strong>Solução:</strong> Sempre use condições ou contadores para garantir uma saída
              do loop.
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              💡 Informação
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Nós de Jump não geram variáveis de saída. Eles apenas redirecionam o fluxo de
              execução.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="jump" />;
}
