'use client';

import { useState } from 'react';
import { Modal, ModalActions } from './Modal';
import { ActionButton } from './ActionButton';
import { Tag, Plus, X } from 'lucide-react';

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tags: string[]) => Promise<void>;
  currentTags?: string[];
  contactName?: string;
}

export function TagsModal({
  isOpen,
  onClose,
  onSave,
  currentTags = [],
  contactName,
}: TagsModalProps) {
  const [tags, setTags] = useState<string[]>(currentTags);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Tags sugeridas comuns
  const suggestedTags = [
    'VIP',
    'Lead Quente',
    'Lead Frio',
    'Cliente',
    'Prospect',
    'Oportunidade',
    'Perdido',
    'Inativo',
    'Interessado',
    'Aguardando Contato',
  ];

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();

    if (!trimmedTag) {
      setError('Tag não pode estar vazia');
      return;
    }

    if (tags.includes(trimmedTag)) {
      setError('Esta tag já foi adicionada');
      return;
    }

    if (trimmedTag.length > 50) {
      setError('Tag muito longa (máx. 50 caracteres)');
      return;
    }

    setTags([...tags, trimmedTag]);
    setNewTag('');
    setError('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(newTag);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSave(tags);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar tags:', error);
      setError('Erro ao salvar tags. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tagColors = [
    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  ];

  const getTagColor = (index: number) => {
    return tagColors[index % tagColors.length];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciar Tags"
      description={contactName ? `Adicione ou remova tags de ${contactName}` : 'Adicione ou remova tags do contato'}
      size="md"
    >
      <div className="space-y-6">
        {/* Input para adicionar nova tag */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Adicionar Tag
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newTag}
                onChange={(e) => {
                  setNewTag(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
                placeholder="Digite uma tag e pressione Enter"
              />
            </div>
            <button
              type="button"
              onClick={() => handleAddTag(newTag)}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>

        {/* Tags Atuais */}
        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags Atuais ({tags.length})
            </label>
            <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[60px]">
              {tags.map((tag, index) => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${getTagColor(index)}`}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags Sugeridas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags Sugeridas
          </label>
          <div className="flex flex-wrap gap-2">
            {suggestedTags
              .filter((tag) => !tags.includes(tag))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-gray-900 dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  + {tag}
                </button>
              ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1 text-xs text-blue-800 dark:text-blue-300">
            <p className="font-medium">Dica:</p>
            <p className="mt-1">Use tags para organizar e segmentar seus contatos. Você pode filtrar por tags nas listagens e criar campanhas direcionadas.</p>
          </div>
        </div>
      </div>

      <ModalActions>
        <ActionButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </ActionButton>
        <ActionButton
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Tags'}
        </ActionButton>
      </ModalActions>
    </Modal>
  );
}
