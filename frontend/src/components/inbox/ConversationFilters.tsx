'use client';

import { useState, useEffect } from 'react';

interface ConversationFiltersProps {
  onFilterChange: (filters: {
    status: string;
    search: string;
    assignedToMe: boolean;
  }) => void;
  initialStatus?: string;
  initialSearch?: string;
  initialAssignedToMe?: boolean;
}

export default function ConversationFilters({
  onFilterChange,
  initialStatus = 'all',
  initialSearch = '',
  initialAssignedToMe = false,
}: ConversationFiltersProps) {
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [assignedToMe, setAssignedToMe] = useState(initialAssignedToMe);

  // Notify parent when filters change
  useEffect(() => {
    onFilterChange({ status, search, assignedToMe });
  }, [status, search, assignedToMe]);

  const statusOptions = [
    { value: 'all', label: 'Todas', icon: '💬' },
    { value: 'open', label: 'Abertas', icon: '🟢' },
    { value: 'active', label: 'Ativas', icon: '🔵' },
    { value: 'queued', label: 'Na Fila', icon: '🟡' },
    { value: 'closed', label: 'Encerradas', icon: '⚪' },
  ];

  return (
    <div className="p-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar por nome ou número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Status Filter - Horizontal Pills */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatus(option.value)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-all duration-200
              ${
                status === option.value
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <span>{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* Assigned to Me Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Minhas conversas
          </span>
        </div>
        <button
          onClick={() => setAssignedToMe(!assignedToMe)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${assignedToMe ? 'bg-purple-600' : 'bg-gray-300'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${assignedToMe ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Active Filters Summary */}
      {(status !== 'all' || search || assignedToMe) && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            {search && <span>Busca ativa • </span>}
            {status !== 'all' && <span>Filtro ativo • </span>}
            {assignedToMe && <span>Minhas conversas</span>}
          </div>
          <button
            onClick={() => {
              setStatus('all');
              setSearch('');
              setAssignedToMe(false);
            }}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
