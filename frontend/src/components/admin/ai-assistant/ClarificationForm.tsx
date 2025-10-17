/**
 * ClarificationForm Component
 *
 * Displays clarification questions from AI with interactive answer options
 */

import { useState } from 'react';
import { Send, HelpCircle } from 'lucide-react';

interface ClarificationQuestion {
  question: string;
  options?: string[];
  field: string;
}

export interface ClarificationFormProps {
  questions: ClarificationQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isLoading?: boolean;
}

export default function ClarificationForm({
  questions,
  onSubmit,
  isLoading = false,
}: ClarificationFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all questions are answered
    const allAnswered = questions.every((q) => answers[q.field]?.trim());

    if (!allAnswered) {
      return;
    }

    onSubmit(answers);
  };

  const handleAnswerChange = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Preciso de mais informações
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Responda as perguntas abaixo para continuar
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((question, index) => (
          <div key={question.field} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              {index + 1}. {question.question}
            </label>

            {question.options && question.options.length > 0 ? (
              // Multiple choice
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                  >
                    <input
                      type="radio"
                      name={question.field}
                      value={option}
                      checked={answers[question.field] === option}
                      onChange={(e) => handleAnswerChange(question.field, e.target.value)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              // Free text
              <input
                type="text"
                value={answers[question.field] || ''}
                onChange={(e) => handleAnswerChange(question.field, e.target.value)}
                placeholder="Digite sua resposta..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            )}
          </div>
        ))}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || questions.some((q) => !answers[q.field]?.trim())}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {isLoading ? 'Enviando...' : 'Enviar Respostas'}
        </button>
      </form>
    </div>
  );
}
