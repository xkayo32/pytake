'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { LayoutGrid, FileText, BarChart3, Plus, Trash2 } from 'lucide-react';

interface Button {
  id: string;
  title: string;
}

interface InteractiveButtonsPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

const generateDefaultVariableName = (nodeId: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `button_response_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function InteractiveButtonsProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: InteractiveButtonsPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [bodyText, setBodyText] = useState(data?.bodyText || '');
  const [footerText, setFooterText] = useState(data?.footerText || '');
  const [buttons, setButtons] = useState<Button[]>(
    data?.buttons || [
      { id: 'btn_1', title: 'Opção 1' },
      { id: 'btn_2', title: 'Opção 2' },
    ]
  );
  const [outputVariable, setOutputVariable] = useState(() => {
    return data?.outputVariable || generateDefaultVariableName(nodeId);
  });
  const [nodeType] = useState(data?.nodeType);
  const [label] = useState(data?.label);

  // Reinitialize when nodeId changes
  useEffect(() => {
    setBodyText(data?.bodyText || '');
    setFooterText(data?.footerText || '');
    setButtons(
      data?.buttons || [
        { id: 'btn_1', title: 'Opção 1' },
        { id: 'btn_2', title: 'Opção 2' },
      ]
    );
    const newVar = data?.outputVariable || generateDefaultVariableName(nodeId);
    setOutputVariable(newVar);
  }, [nodeId]);

  // Update parent (skip on first mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange(nodeId, {
      bodyText,
      footerText,
      buttons,
      outputVariable,
      nodeType,
      label,
    });
  }, [nodeId, bodyText, footerText, buttons, outputVariable]);

  const handleAddButton = () => {
    if (buttons.length < 3) {
      setButtons([
        ...buttons,
        { id: `btn_${buttons.length + 1}`, title: `Opção ${buttons.length + 1}` },
      ]);
    }
  };

  const handleUpdateButton = (index: number, field: keyof Button, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  const handleRemoveButton = (index: number) => {
    if (buttons.length > 1) {
      setButtons(buttons.filter((_, i) => i !== index));
    }
  };

  const tabs: Tab[] = [
    {
      id: 'content',
      label: 'Conteúdo',
      icon: FileText,
      content: (
        <div className="space-y-4">
          {/* Body Text */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Texto Principal (Body)
            </label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={4}
              placeholder="Digite o texto da mensagem... Use {{variavel}} para inserir variáveis"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {bodyText.length}/1024 caracteres (máximo WhatsApp)
            </p>
          </div>

          {/* Footer Text */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rodapé (Footer) - Opcional
            </label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Texto pequeno abaixo dos botões"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {footerText.length}/60 caracteres
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg">
            <p className="text-xs font-medium text-violet-900 dark:text-violet-300 mb-2">
              💡 Estrutura da Mensagem
            </p>
            <div className="space-y-1 text-xs text-violet-800 dark:text-violet-400">
              <p>
                <strong>Body:</strong> Texto principal (obrigatório)
              </p>
              <p>
                <strong>Footer:</strong> Texto menor abaixo dos botões (opcional)
              </p>
              <p>
                <strong>Botões:</strong> 1-3 botões de ação
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'buttons',
      label: 'Botões',
      icon: LayoutGrid,
      badge: buttons.length,
      content: (
        <div className="space-y-4">
          {/* Buttons List */}
          <div className="space-y-3">
            {buttons.map((button, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Botão {index + 1}
                  </span>
                  {buttons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(index)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remover botão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Button ID */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    ID do Botão
                  </label>
                  <input
                    type="text"
                    value={button.id}
                    onChange={(e) => handleUpdateButton(index, 'id', e.target.value)}
                    placeholder="btn_id"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ID único para identificar o botão clicado
                  </p>
                </div>

                {/* Button Title */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Texto do Botão
                  </label>
                  <input
                    type="text"
                    value={button.title}
                    onChange={(e) => handleUpdateButton(index, 'title', e.target.value)}
                    placeholder="Texto exibido no botão"
                    maxLength={20}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {button.title.length}/20 caracteres
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Button */}
          {buttons.length < 3 && (
            <button
              type="button"
              onClick={handleAddButton}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Botão ({buttons.length}/3)
            </button>
          )}

          {buttons.length >= 3 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-900 dark:text-yellow-300">
                ⚠️ Limite de 3 botões atingido (restrição do WhatsApp)
              </p>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Limites do WhatsApp
            </p>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <p>• Mínimo: 1 botão</p>
              <p>• Máximo: 3 botões</p>
              <p>• Texto do botão: máximo 20 caracteres</p>
              <p>• Os IDs devem ser únicos</p>
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
          {/* Output Variable */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Variável de Saída
            </label>
            <input
              type="text"
              value={outputVariable}
              onChange={(e) => setOutputVariable(e.target.value)}
              placeholder="button_response"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-violet-500'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-900 dark:text-red-400 focus:ring-red-500'
              }`}
            />
            {!validateSnakeCase(outputVariable) && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                ⚠️ Use apenas letras minúsculas, números e underscore (_). Deve começar com letra.
              </p>
            )}
          </div>

          {/* Variable Info */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
              💡 Saída deste nó:{' '}
              <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                {'{{ ' + outputVariable + ' }}'}
              </code>
            </p>
            <p className="text-xs text-green-800 dark:text-green-400 mb-2">
              O ID do botão clicado será armazenado nesta variável.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-green-800 dark:text-green-400">
              {buttons.map((btn, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                    {btn.id}
                  </code>
                  <span>→ Se usuário clicar em "{btn.title}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Example */}
          <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg">
            <p className="text-xs font-medium text-violet-900 dark:text-violet-300 mb-2">
              Como usar esta variável
            </p>
            <p className="text-xs text-violet-800 dark:text-violet-400 mb-2">
              Use em um nó de condição para verificar qual botão foi clicado:
            </p>
            <code className="block px-2 py-1.5 bg-violet-100 dark:bg-violet-900/40 rounded text-xs">
              Se {'{{ ' + outputVariable + ' }}'} == "{buttons[0]?.id || 'btn_1'}"
              <br />
              Então: Ação para botão 1
            </code>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="content" />;
}
