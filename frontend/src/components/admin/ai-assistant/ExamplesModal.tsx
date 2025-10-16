/**
 * ExamplesModal Component
 *
 * Modal displaying example prompts for the AI Flow Assistant
 */

import { X, Lightbulb } from 'lucide-react';

export interface Example {
  title: string;
  description: string;
  prompt: string;
}

const EXAMPLES: Example[] = [
  {
    title: 'Qualificador de Leads - Imobiliária',
    description: 'Qualifica leads perguntando nome, interesse e orçamento',
    prompt:
      'Crie um chatbot para qualificar leads de imobiliária. Pergunte o nome, tipo de imóvel desejado (casa/apartamento), faixa de preço e bairro de interesse. Se o orçamento for acima de R$ 500k, transfira para vendedor. Caso contrário, adicione ao remarketing.',
  },
  {
    title: 'Catálogo de Produtos com Carrinho',
    description: 'E-commerce com navegação de produtos e checkout',
    prompt:
      'Preciso de um chatbot de e-commerce que mostre categorias de produtos, permita escolher produtos, adicionar ao carrinho, e finalizar pedido coletando nome, endereço e forma de pagamento.',
  },
  {
    title: 'Agendamento de Consultas Médicas',
    description: 'Sistema de agendamento para clínicas',
    prompt:
      'Crie um chatbot para agendar consultas médicas. Pergunte nome do paciente, tipo de consulta (primeira vez ou retorno), especialidade desejada, e mostre horários disponíveis. Confirme o agendamento e envie lembrete.',
  },
  {
    title: 'FAQ Automatizado de Suporte',
    description: 'Sistema inteligente de perguntas frequentes',
    prompt:
      'Preciso de um chatbot de suporte que responda perguntas frequentes sobre horário de funcionamento, formas de pagamento, política de trocas e prazos de entrega. Se não souber responder, transfira para atendente humano.',
  },
];

export interface ExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExample: (prompt: string) => void;
}

export default function ExamplesModal({
  isOpen,
  onClose,
  onSelectExample,
}: ExamplesModalProps) {
  if (!isOpen) return null;

  const handleSelect = (prompt: string) => {
    onSelectExample(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Exemplos de Prompts
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Clique em um exemplo para usar como base
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {EXAMPLES.map((example, index) => (
              <button
                key={index}
                onClick={() => handleSelect(example.prompt)}
                className="w-full text-left p-4 bg-gray-50 dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 rounded-xl transition-all group"
              >
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {example.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {example.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                  {example.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Você pode editar o prompt após selecioná-lo
          </p>
        </div>
      </div>
    </div>
  );
}
