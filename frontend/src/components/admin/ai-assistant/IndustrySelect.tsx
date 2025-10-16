/**
 * IndustrySelect Component
 *
 * Autocomplete select for industry/sector with predefined suggestions
 */

import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, X } from 'lucide-react';

const INDUSTRIES = [
  'Imobiliária',
  'E-commerce',
  'Saúde',
  'Educação',
  'Finanças',
  'Varejo',
  'Restaurante',
  'Academia',
  'Salão de Beleza',
  'Consultoria',
  'Tecnologia',
  'Advocacia',
  'Contabilidade',
  'Marketing',
  'Hotelaria',
  'Turismo',
  'Automotivo',
  'Imobiliário',
  'Construção',
  'Outros',
];

export interface IndustrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function IndustrySelect({
  value,
  onChange,
  placeholder = 'Selecione ou digite...',
}: IndustrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter industries based on search query
  const filteredIndustries = INDUSTRIES.filter((industry) =>
    industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (industry: string) => {
    onChange(industry);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Building2 className="w-4 h-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : value}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        {value && !isOpen && (
          <button
            onClick={handleClear}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            type="button"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto"
          type="button"
        >
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredIndustries.length > 0 ? (
            <div className="py-1">
              {filteredIndustries.map((industry) => (
                <button
                  key={industry}
                  onClick={() => handleSelect(industry)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  type="button"
                >
                  {industry}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma indústria encontrada
            </div>
          )}

          {/* Custom option */}
          {searchQuery && !INDUSTRIES.includes(searchQuery) && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => handleSelect(searchQuery)}
                className="w-full px-3 py-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                type="button"
              >
                Usar "{searchQuery}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
