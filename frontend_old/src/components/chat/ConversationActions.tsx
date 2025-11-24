'use client';

import React from 'react';
import { UserPlus, Send, XCircle, MessageSquareText } from 'lucide-react';

interface QuickActionsProps {
  agents: any[];
  departments: any[];
  selectedAgent: string;
  selectedDepartment: string;
  transferNote: string;
  closeReason: string;
  isLoading: boolean;
  onAgentChange: (agentId: string) => void;
  onDepartmentChange: (deptId: string) => void;
  onTransferNoteChange: (note: string) => void;
  onCloseReasonChange: (reason: string) => void;
  onAssign: () => void;
  onTransfer: () => void;
  onClose: () => void;
  onTemplate: () => void;
  isWindowExpired: boolean;
  conversationStatus?: string;
}

export default function ConversationActions({
  agents,
  departments,
  selectedAgent,
  selectedDepartment,
  transferNote,
  closeReason,
  isLoading,
  onAgentChange,
  onDepartmentChange,
  onTransferNoteChange,
  onCloseReasonChange,
  onAssign,
  onTransfer,
  onClose,
  onTemplate,
  isWindowExpired,
  conversationStatus,
}: QuickActionsProps) {
  return (
    <div className="space-y-4">
      {/* Assign Agent */}
      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Atribuir Agente
        </label>
        <div className="flex gap-2">
          <select
            value={selectedAgent}
            onChange={(e) => onAgentChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Selecione um agente...</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name || agent.email}
              </option>
            ))}
          </select>
          <button
            onClick={onAssign}
            disabled={!selectedAgent || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Atribuir</span>
          </button>
        </div>
      </div>

      {/* Transfer Department */}
      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Send className="w-4 h-4" />
          Encaminhar Departamento
        </label>
        <div className="space-y-3">
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Selecione um departamento...</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <textarea
            value={transferNote}
            onChange={(e) => onTransferNoteChange(e.target.value)}
            placeholder="Nota do encaminhamento (opcional)..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <button
            onClick={onTransfer}
            disabled={!selectedDepartment || isLoading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Encaminhar
          </button>
        </div>
      </div>

      {/* Template Message */}
      {isWindowExpired && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <button
            onClick={onTemplate}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
          >
            <MessageSquareText className="w-4 h-4" />
            Enviar Template
          </button>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
            A janela de 24h expirou. Use templates para reengajar.
          </p>
        </div>
      )}

      {/* Close Conversation */}
      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          Encerrar Conversa
        </label>
        <div className="space-y-3">
          <textarea
            value={closeReason}
            onChange={(e) => onCloseReasonChange(e.target.value)}
            placeholder="Motivo do encerramento..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <button
            onClick={onClose}
            disabled={isLoading || conversationStatus === 'closed'}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Encerrar
          </button>
        </div>
      </div>
    </div>
  );
}
