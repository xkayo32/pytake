'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { Clock, Settings, Info } from 'lucide-react';

interface DelayPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

export default function DelayProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: DelayPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [duration, setDuration] = useState(data?.duration || 3);
  const [unit, setUnit] = useState(data?.unit || 'seconds');
  const [showTyping, setShowTyping] = useState(data?.showTyping ?? true);
  const [cancelable, setCancelable] = useState(data?.cancelable ?? false);
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setDuration(data?.duration || 3);
    setUnit(data?.unit || 'seconds');
    setShowTyping(data?.showTyping ?? true);
    setCancelable(data?.cancelable ?? false);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      duration,
      unit,
      showTyping,
      cancelable,
      nodeType,
      label,
    });
  }, [nodeId, duration, unit, showTyping, cancelable]);

  // Calculate total seconds for display
  const getTotalSeconds = () => {
    const multiplier = {
      seconds: 1,
      minutes: 60,
      hours: 3600,
      days: 86400,
    }[unit] || 1;
    return duration * multiplier;
  };

  // Format duration for display
  const formatDuration = () => {
    const unitLabels = {
      seconds: 'segundo(s)',
      minutes: 'minuto(s)',
      hours: 'hora(s)',
      days: 'dia(s)',
    };
    return `${duration} ${unitLabels[unit as keyof typeof unitLabels] || unit}`;
  };

  const tabs: Tab[] = [
    {
      id: 'config',
      label: 'Configuração',
      icon: Clock,
      content: (
        <div className="space-y-4">
          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duração do Atraso
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max={unit === 'seconds' ? 60 : unit === 'minutes' ? 30 : unit === 'hours' ? 24 : 30}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="seconds">Segundos</option>
                <option value="minutes">Minutos</option>
                <option value="hours">Horas</option>
                <option value="days">Dias</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ⏱️ Total: {formatDuration()} ({getTotalSeconds()} segundos)
            </p>
          </div>

          {/* Duration Limits Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              Limites de Duração
            </p>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <div className="flex justify-between">
                <span>Segundos:</span>
                <span className="font-medium">1 - 60</span>
              </div>
              <div className="flex justify-between">
                <span>Minutos:</span>
                <span className="font-medium">1 - 30</span>
              </div>
              <div className="flex justify-between">
                <span>Horas:</span>
                <span className="font-medium">1 - 24</span>
              </div>
              <div className="flex justify-between">
                <span>Dias:</span>
                <span className="font-medium">1 - 30</span>
              </div>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-100 dark:bg-cyan-900/40 rounded-full mb-2">
                <Clock className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatDuration()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {showTyping ? '💬 Mostrando "digitando..."' : '⏸️ Aguardando silenciosamente'}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'behavior',
      label: 'Comportamento',
      icon: Settings,
      content: (
        <div className="space-y-4">
          {/* Show Typing */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="showTyping"
              checked={showTyping}
              onChange={(e) => setShowTyping(e.target.checked)}
              className="mt-1 w-4 h-4 text-cyan-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex-1">
              <label
                htmlFor="showTyping"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Mostrar indicador "digitando..."
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {showTyping
                  ? '💬 O usuário verá que o bot está "digitando" durante o delay'
                  : '⏸️ Delay silencioso, sem indicação visual'}
              </p>
            </div>
          </div>

          {/* Cancelable */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <input
              type="checkbox"
              id="cancelable"
              checked={cancelable}
              onChange={(e) => setCancelable(e.target.checked)}
              className="mt-1 w-4 h-4 text-cyan-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex-1">
              <label
                htmlFor="cancelable"
                className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
              >
                Cancelável se usuário responder
              </label>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {cancelable
                  ? '⚡ Se o usuário enviar uma mensagem durante o delay, ele será cancelado'
                  : '⏳ O delay sempre será respeitado, mesmo que o usuário responda'}
              </p>
            </div>
          </div>

          {/* Use Cases */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-2">
              💡 Casos de Uso
            </p>
            <div className="space-y-2 text-xs text-purple-800 dark:text-purple-400">
              <div>
                <p className="font-medium">Simular digitação:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  2-3 segundos com "digitando..." ativo
                </p>
              </div>
              <div>
                <p className="font-medium">Aguardar processamento:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  10-30 segundos para processar algo no backend
                </p>
              </div>
              <div>
                <p className="font-medium">Follow-up automático:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  1-2 horas para enviar mensagem de acompanhamento
                </p>
              </div>
              <div>
                <p className="font-medium">Campanha com delay:</p>
                <p className="text-gray-600 dark:text-gray-400">
                  1 dia para enviar próxima mensagem da sequência
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
          <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg">
            <p className="text-xs font-medium text-cyan-900 dark:text-cyan-300 mb-2">
              Como funciona o nó de Atraso
            </p>
            <div className="space-y-2 text-xs text-cyan-800 dark:text-cyan-400">
              <div className="flex items-start gap-2">
                <span>1.</span>
                <span>O fluxo pausa neste nó pelo tempo configurado</span>
              </div>
              <div className="flex items-start gap-2">
                <span>2.</span>
                <span>Opcionalmente mostra indicador "digitando..." no WhatsApp</span>
              </div>
              <div className="flex items-start gap-2">
                <span>3.</span>
                <span>Após o delay, continua para o próximo nó conectado</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-xs font-medium text-yellow-900 dark:text-yellow-300 mb-2">
              ⚠️ Horário de Funcionamento
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-400 mb-2">
              Se o delay cair <strong>fora do horário</strong> de funcionamento:
            </p>
            <div className="space-y-1.5 text-xs text-yellow-800 dark:text-yellow-400">
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>O fluxo será <strong>pausado</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>Retomará automaticamente quando o horário iniciar</span>
              </div>
              <div className="flex items-start gap-2">
                <span>•</span>
                <span>O tempo restante do delay continuará a partir daí</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              💡 Dica de UX
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Para delays curtos (1-5 segundos), use com "digitando..." ativo para dar
              a sensação de que o bot está pensando ou escrevendo uma resposta elaborada.
              Para delays longos, considere enviar uma mensagem antes explicando a espera.
            </p>
          </div>

          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              ℹ️ Informação
            </p>
            <p className="text-xs text-green-800 dark:text-green-400">
              Nós de atraso não geram variáveis de saída. Eles apenas adicionam uma pausa temporal no fluxo.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="config" />;
}
