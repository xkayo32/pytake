'use client';

import { useState, useEffect, useRef } from 'react';
import PropertyTabs, { Tab } from './PropertyTabs';
import { List, FileText, BarChart3, Plus, Trash2 } from 'lucide-react';

interface ListItem {
  id: string;
  title: string;
  description: string;
}

interface InteractiveListPropertiesProps {
  nodeId: string;
  data: any;
  onChange: (nodeId: string, data: any) => void;
  chatbotId: string;
}

const generateDefaultVariableName = (nodeId: string): string => {
  const shortId = nodeId.slice(-4).replace(/-/g, '');
  return `list_response_${shortId}`;
};

const validateSnakeCase = (value: string): boolean => {
  return /^[a-z][a-z0-9_]*$/.test(value);
};

export default function InteractiveListProperties({
  nodeId,
  data,
  onChange,
  chatbotId,
}: InteractiveListPropertiesProps) {
  const isFirstMount = useRef(true);

  // State variables
  const [bodyText, setBodyText] = useState(data?.bodyText || '');
  const [buttonText, setButtonText] = useState(data?.buttonText || 'Ver Opções');
  const [footerText, setFooterText] = useState(data?.footerText || '');
  const [listItems, setListItems] = useState<ListItem[]>(
    data?.listItems || [
      { id: 'item_1', title: 'Opção 1', description: '' },
      { id: 'item_2', title: 'Opção 2', description: '' },
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
    setButtonText(data?.buttonText || 'Ver Opções');
    setFooterText(data?.footerText || '');
    setListItems(
      data?.listItems || [
        { id: 'item_1', title: 'Opção 1', description: '' },
        { id: 'item_2', title: 'Opção 2', description: '' },
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
      buttonText,
      footerText,
      listItems,
      outputVariable,
      nodeType,
      label,
    });
  }, [nodeId, bodyText, buttonText, footerText, listItems, outputVariable]);

  const handleAddItem = () => {
    if (listItems.length < 10) {
      setListItems([
        ...listItems,
        { id: `item_${listItems.length + 1}`, title: `Opção ${listItems.length + 1}`, description: '' },
      ]);
    }
  };

  const handleUpdateItem = (index: number, field: keyof ListItem, value: string) => {
    const newItems = [...listItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setListItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (listItems.length > 1) {
      setListItems(listItems.filter((_, i) => i !== index));
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
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {bodyText.length}/1024 caracteres
            </p>
          </div>

          {/* Button Text */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Texto do Botão Principal
            </label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Ver Opções"
              maxLength={20}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {buttonText.length}/20 caracteres - Botão que abre a lista
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
              placeholder="Texto pequeno abaixo do botão"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {footerText.length}/60 caracteres
            </p>
          </div>

          {/* Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs font-medium text-slate-900 dark:text-slate-300 mb-2">
              💡 Como funciona a lista interativa
            </p>
            <div className="space-y-1 text-xs text-slate-800 dark:text-slate-400">
              <p>1. Usuário vê a mensagem com um botão</p>
              <p>2. Ao clicar no botão, uma lista se abre</p>
              <p>3. Usuário seleciona um item da lista</p>
              <p>4. ID do item escolhido é armazenado na variável</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'list',
      label: 'Lista',
      icon: List,
      badge: listItems.length,
      content: (
        <div className="space-y-4">
          {/* List Items */}
          <div className="space-y-3">
            {listItems.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Item {index + 1}
                  </span>
                  {listItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remover item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Item ID */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    ID do Item
                  </label>
                  <input
                    type="text"
                    value={item.id}
                    onChange={(e) => handleUpdateItem(index, 'id', e.target.value)}
                    placeholder="item_id"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>

                {/* Item Title */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                    placeholder="Título do item"
                    maxLength={24}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.title.length}/24 caracteres
                  </p>
                </div>

                {/* Item Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                    placeholder="Descrição curta"
                    maxLength={72}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.description.length}/72 caracteres
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item */}
          {listItems.length < 10 && (
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/30 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Item ({listItems.length}/10)
            </button>
          )}

          {listItems.length >= 10 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-900 dark:text-yellow-300">
                ⚠️ Limite de 10 itens atingido (restrição do WhatsApp)
              </p>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Limites do WhatsApp
            </p>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <p>• Mínimo: 1 item</p>
              <p>• Máximo: 10 itens</p>
              <p>• Título: máximo 24 caracteres</p>
              <p>• Descrição: máximo 72 caracteres</p>
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
              placeholder="list_response"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent ${
                validateSnakeCase(outputVariable)
                  ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-slate-500'
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
              O ID do item selecionado será armazenado nesta variável.
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-green-800 dark:text-green-400 max-h-40 overflow-y-auto">
              {listItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <code className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 rounded">
                    {item.id}
                  </code>
                  <span>→ Se usuário escolher "{item.title}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Example */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs font-medium text-slate-900 dark:text-slate-300 mb-2">
              Como usar esta variável
            </p>
            <p className="text-xs text-slate-800 dark:text-slate-400 mb-2">
              Use em um nó de condição para verificar qual item foi selecionado:
            </p>
            <code className="block px-2 py-1.5 bg-slate-100 dark:bg-slate-900/40 rounded text-xs">
              Se {'{{ ' + outputVariable + ' }}'} == "{listItems[0]?.id || 'item_1'}"
              <br />
              Então: Ação para item 1
            </code>
          </div>
        </div>
      ),
    },
  ];

  return <PropertyTabs tabs={tabs} defaultTab="content" />;
}
