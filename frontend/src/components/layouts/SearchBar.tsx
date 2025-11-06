'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  type: 'conversation' | 'contact' | 'chatbot' | 'page';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon?: React.ReactNode;
}

export interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

// Mock de resultados recentes (em produção viria do localStorage)
const mockRecentSearches = [
  { label: 'Conversas abertas', query: 'status:open' },
  { label: 'Contatos VIP', query: 'tag:vip' },
];

// Mock de resultados populares
const mockPopularSearches = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Chatbots', href: '/admin/chatbots' },
  { label: 'Conversas', href: '/conversations' },
];

export function SearchBar({ className = '', placeholder = 'Buscar...', onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts (Ctrl+K ou Cmd+K)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      // ESC fecha o dropdown
      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Função de busca (mock - em produção faria chamada à API)
  async function handleSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    // Simula delay de API
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock de resultados (em produção viria da API)
    const mockResults: SearchResult[] = [
      {
        type: 'conversation',
        id: '1',
        title: `Conversa com João Silva - ${searchQuery}`,
        subtitle: 'Aberta há 2 horas',
        href: '/conversations/1',
      },
      {
        type: 'contact',
        id: '2',
        title: `Maria Santos - ${searchQuery}`,
        subtitle: '+55 11 98765-4321',
        href: '/admin/contacts/2',
      },
      {
        type: 'chatbot',
        id: '3',
        title: `Chatbot Vendas ${searchQuery}`,
        subtitle: 'Ativo',
        href: '/admin/chatbots/3',
      },
    ];

    setResults(mockResults);
    setIsLoading(false);
  }

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        handleSearch(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function handleInputChange(value: string) {
    setQuery(value);
    setIsOpen(true);
    onSearch?.(value);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }

  function handleResultClick(result: SearchResult) {
    router.push(result.href);
    setIsOpen(false);
    setQuery('');
  }

  function handleQuickSearchClick(href: string) {
    router.push(href);
    setIsOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="
            w-full pl-10 pr-20 py-2
            rounded-lg
            border border-gray-200 dark:border-dark-border
            bg-gray-50 dark:bg-dark-bg-tertiary
            text-gray-900 dark:text-white
            placeholder:text-gray-500 dark:placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            transition-all
          "
          aria-label="Busca global"
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Keyboard hint */}
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-200 dark:bg-dark-border text-xs text-gray-600 dark:text-gray-400 font-mono">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            absolute top-full left-0 right-0 mt-2
            bg-white dark:bg-dark-bg-secondary
            border border-gray-200 dark:border-dark-border
            rounded-xl shadow-lg
            max-h-96 overflow-y-auto
            z-50
          "
        >
          {/* Loading state */}
          {isLoading && (
            <div className="px-4 py-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Buscando...</p>
            </div>
          )}

          {/* Resultados da busca */}
          {!isLoading && results.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Resultados
              </p>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="
                    w-full px-4 py-3 text-left
                    hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
                    transition-colors
                    flex items-center gap-3
                  "
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Sem resultados */}
          {!isLoading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nenhum resultado encontrado para "{query}"
              </p>
            </div>
          )}

          {/* Estado vazio - Buscas recentes e populares */}
          {!isLoading && !query && (
            <div className="py-2">
              {/* Buscas recentes */}
              {mockRecentSearches.length > 0 && (
                <div className="mb-4">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Recentes
                  </p>
                  {mockRecentSearches.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleInputChange(item.query)}
                      className="
                        w-full px-4 py-2 text-left text-sm
                        text-gray-700 dark:text-gray-300
                        hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
                        transition-colors
                      "
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Buscas populares */}
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  Páginas populares
                </p>
                {mockPopularSearches.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickSearchClick(item.href)}
                    className="
                      w-full px-4 py-2 text-left text-sm
                      text-gray-700 dark:text-gray-300
                      hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary
                      transition-colors
                    "
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
