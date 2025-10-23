'use client';

import { useState } from 'react';
import { conversationsAPI, usersAPI, departmentsAPI } from '@/lib/api';
import { Modal, ModalActions } from '@/components/admin/Modal';
import { UserPlus, Send, XCircle } from 'lucide-react';

interface QuickActionsProps {
  conversationId: string;
  onSuccess?: () => void;
}

export default function QuickActions({ conversationId, onSuccess }: QuickActionsProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [agents, setAgents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const loadAgents = async () => {
    try {
      const res = await usersAPI.list({ role: 'agent', is_active: true, limit: 50 });
      setAgents(res.data || []);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentsAPI.list({ is_active: true, limit: 50 });
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedAgent) return;
    setLoading(true);
    try {
      await conversationsAPI.assign(conversationId, selectedAgent);
      setShowAssignModal(false);
      setSelectedAgent('');
      onSuccess?.();
    } catch (err) {
      console.error('Assign failed:', err);
      alert('Erro ao atribuir conversa');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedDepartment) return;
    setLoading(true);
    try {
      await conversationsAPI.transfer(conversationId, selectedDepartment, reason || undefined);
      setShowTransferModal(false);
      setSelectedDepartment('');
      setReason('');
      onSuccess?.();
    } catch (err) {
      console.error('Transfer failed:', err);
      alert('Erro ao encaminhar conversa');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    setLoading(true);
    try {
      await conversationsAPI.close(conversationId, reason || 'Encerrada pelo admin', true);
      setShowCloseModal(false);
      setReason('');
      onSuccess?.();
    } catch (err) {
      console.error('Close failed:', err);
      alert('Erro ao encerrar conversa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            loadAgents();
            setShowAssignModal(true);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          title="Atribuir a um agente"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Atribuir
        </button>
        
        <button
          onClick={() => {
            loadDepartments();
            setShowTransferModal(true);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
          title="Encaminhar para departamento"
        >
          <Send className="w-3.5 h-3.5" />
          Encaminhar
        </button>
        
        <button
          onClick={() => setShowCloseModal(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          title="Encerrar conversa"
        >
          <XCircle className="w-3.5 h-3.5" />
          Encerrar
        </button>
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Atribuir Conversa"
        description="Selecione um agente para assumir esta conversa"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Agente
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Selecione um agente...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name || agent.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ModalActions>
          <button
            onClick={() => setShowAssignModal(false)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedAgent || loading}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Atribuindo...' : 'Atribuir'}
          </button>
        </ModalActions>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Encaminhar Conversa"
        description="Selecione um departamento para encaminhar"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Departamento
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Selecione um departamento...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motivo (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Informe o motivo do encaminhamento..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        <ModalActions>
          <button
            onClick={() => setShowTransferModal(false)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedDepartment || loading}
            className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Encaminhando...' : 'Encaminhar'}
          </button>
        </ModalActions>
      </Modal>

      {/* Close Modal */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Encerrar Conversa"
        description="Confirme o encerramento desta conversa"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motivo (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Informe o motivo do encerramento..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        <ModalActions>
          <button
            onClick={() => setShowCloseModal(false)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Encerrando...' : 'Encerrar'}
          </button>
        </ModalActions>
      </Modal>
    </>
  );
}
