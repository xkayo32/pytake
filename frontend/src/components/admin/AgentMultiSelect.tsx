'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Users } from 'lucide-react';
import { usersAPI } from '@/lib/api';

export interface Agent {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface AgentMultiSelectProps {
  selectedAgentIds: string[];
  onChange: (agentIds: string[]) => void;
  departmentId?: string;
}

export default function AgentMultiSelect({
  selectedAgentIds,
  onChange,
  departmentId,
}: AgentMultiSelectProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgents();
  }, [departmentId]);

  useEffect(() => {
    // Filter agents based on search query
    const filtered = agents.filter(agent =>
      agent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredAgents(filtered);
  }, [searchQuery, agents]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      // Use axios client to ensure base URL, interceptors and auth headers are applied
      const params: any = { role: 'agent', is_active: true, limit: 100 };
      if (departmentId) params.department_id = departmentId;

      const response = await usersAPI.list(params);
      const data = response.data || [];
      setAgents(data);
      setFilteredAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
      setAgents([]);
      setFilteredAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    if (selectedAgentIds.includes(agentId)) {
      onChange(selectedAgentIds.filter(id => id !== agentId));
    } else {
      onChange([...selectedAgentIds, agentId]);
    }
  };

  const removeAgent = (agentId: string) => {
    onChange(selectedAgentIds.filter(id => id !== agentId));
  };

  const selectedAgents = agents.filter(agent => selectedAgentIds.includes(agent.id));

  return (
    <div className="space-y-2" ref={dropdownRef}>
      {/* Selected agents */}
      {selectedAgents.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          {selectedAgents.map(agent => (
            <div
              key={agent.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {agent.full_name}
              </span>
              <button
                type="button"
                onClick={() => removeAgent(agent.id)}
                className="text-gray-500 hover:text-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {selectedAgents.length === 0
                ? 'Selecione agentes'
                : `${selectedAgents.length} agente(s) selecionado(s)`}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar agentes..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>

            {/* Agent list */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Carregando agentes...
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {searchQuery ? 'Nenhum agente encontrado' : 'Nenhum agente disponível'}
                </div>
              ) : (
                <div className="py-2">
                  {filteredAgents.map(agent => {
                    const isSelected = selectedAgentIds.includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => toggleAgent(agent.id)}
                        className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {agent.full_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {agent.email}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
