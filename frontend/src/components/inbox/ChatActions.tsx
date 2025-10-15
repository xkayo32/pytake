'use client';

import { useState } from 'react';
import { conversationsAPI, usersAPI, departmentsAPI } from '@/lib/api';

interface ChatActionsProps {
  conversationId: string;
  currentStatus: string;
  currentAgentId?: string;
  onActionComplete?: () => void;
}

export default function ChatActions({
  conversationId,
  currentStatus,
  currentAgentId,
  onActionComplete,
}: ChatActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [showCloseMenu, setShowCloseMenu] = useState(false);

  const [agents, setAgents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [transferNote, setTransferNote] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [closeResolved, setCloseResolved] = useState(true);

  const handleAssignClick = async () => {
    if (agents.length === 0 && !loadingAgents) {
      setLoadingAgents(true);
      try {
        const response = await usersAPI.list({ role: 'agent', is_active: true });
        setAgents(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar agentes:', error);
      } finally {
        setLoadingAgents(false);
      }
    }
    setShowAssignMenu(!showAssignMenu);
    setShowTransferMenu(false);
    setShowCloseMenu(false);
  };

  const handleTransferClick = async () => {
    if (departments.length === 0 && !loadingDepartments) {
      setLoadingDepartments(true);
      try {
        const response = await departmentsAPI.listActive();
        setDepartments(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar departamentos:', error);
      } finally {
        setLoadingDepartments(false);
      }
    }
    setShowTransferMenu(!showTransferMenu);
    setShowAssignMenu(false);
    setShowCloseMenu(false);
  };

  const handleCloseClick = () => {
    setShowCloseMenu(!showCloseMenu);
    setShowAssignMenu(false);
    setShowTransferMenu(false);
  };

  const handleAssign = async (agentId: string) => {
    setIsLoading(true);
    try {
      await conversationsAPI.assign(conversationId, agentId);
      setShowAssignMenu(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Erro ao atribuir conversa:', error);
      alert('Erro ao atribuir conversa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async (departmentId: string) => {
    setIsLoading(true);
    try {
      await conversationsAPI.transfer(conversationId, departmentId, transferNote || undefined);
      setShowTransferMenu(false);
      setTransferNote('');
      onActionComplete?.();
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      alert('Erro ao transferir conversa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    setIsLoading(true);
    try {
      await conversationsAPI.close(conversationId, closeReason || undefined, closeResolved);
      setShowCloseMenu(false);
      setCloseReason('');
      onActionComplete?.();
    } catch (error) {
      console.error('Erro ao encerrar conversa:', error);
      alert('Erro ao encerrar conversa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show actions if conversation is closed
  if (currentStatus === 'closed') {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-sm text-gray-600">Conversa encerrada</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* Assign Button */}
        <button
          onClick={handleAssignClick}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>👤</span>
          <span>Atribuir</span>
        </button>

        {/* Transfer Button */}
        <button
          onClick={handleTransferClick}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>↔️</span>
          <span>Transferir</span>
        </button>

        {/* Close Button */}
        <button
          onClick={handleCloseClick}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>✕</span>
          <span>Encerrar</span>
        </button>
      </div>

      {/* Assign Menu */}
      {showAssignMenu && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Atribuir para agente</h3>

          {loadingAgents ? (
            <div className="py-4 text-center text-sm text-gray-500">Carregando agentes...</div>
          ) : agents.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">Nenhum agente disponível</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAssign(agent.id)}
                  disabled={isLoading || agent.id === currentAgentId}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    agent.id === currentAgentId
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 cursor-not-allowed'
                      : 'hover:bg-gray-50 border border-transparent'
                  } disabled:opacity-50`}
                >
                  <div className="font-medium">{agent.full_name}</div>
                  <div className="text-xs text-gray-500">{agent.email}</div>
                  {agent.id === currentAgentId && (
                    <div className="text-xs text-purple-600 mt-1">Atribuída atualmente</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transfer Menu */}
      {showTransferMenu && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Transferir para departamento</h3>

          {loadingDepartments ? (
            <div className="py-4 text-center text-sm text-gray-500">Carregando departamentos...</div>
          ) : departments.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">Nenhum departamento disponível</div>
          ) : (
            <>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => handleTransfer(dept.id)}
                    disabled={isLoading}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 border border-transparent transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium">{dept.name}</div>
                    {dept.description && (
                      <div className="text-xs text-gray-500">{dept.description}</div>
                    )}
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nota (opcional)
                </label>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Motivo da transferência..."
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Close Menu */}
      {showCloseMenu && (
        <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Encerrar conversa</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Motivo (opcional)
              </label>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Motivo do encerramento..."
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="resolved"
                checked={closeResolved}
                onChange={(e) => setCloseResolved(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="resolved" className="text-sm text-gray-700">
                Marcar como resolvida
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCloseMenu(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Encerrando...' : 'Encerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
