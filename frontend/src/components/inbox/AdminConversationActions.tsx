'use client';

import React, { useState, useEffect, useRef } from 'react';
import { conversationsAPI, usersAPI, departmentsAPI } from '@/lib/api';
import { Modal, ModalActions } from '@/components/admin/Modal';

interface ConfirmState {
  type: 'close' | 'transfer' | null;
  payload?: any;
}

interface Props {
  conversationId: string;
  onAction?: () => void; // callback to refresh list
}

export default function AdminConversationActions({ conversationId, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[] | null>(null);
  const [agentQuery, setAgentQuery] = useState<string>('');
  const [agentSkip, setAgentSkip] = useState<number>(0);
  const [agentsHasMore, setAgentsHasMore] = useState<boolean>(true);
  const [deptQuery, setDeptQuery] = useState<string>('');
  const [depts, setDepts] = useState<any[] | null>(null);
  const [deptSkip, setDeptSkip] = useState<number>(0);
  const [deptsHasMore, setDeptsHasMore] = useState<boolean>(true);
  const agentDebounce = useRef<number | undefined>(undefined);

  const [confirm, setConfirm] = useState<ConfirmState>({ type: null });
  const [reason, setReason] = useState<string>('');

  const toggle = () => setOpen(!open);

  const fetchAgents = async (opts?: { query?: string; reset?: boolean }) => {
    const q = opts?.query ?? agentQuery;
    const reset = opts?.reset ?? false;
    try {
      const limit = 25;
      const skip = reset ? 0 : agentSkip;
  // @ts-ignore: backend supports arbitrary query param but TS signature is narrow
  const res = await usersAPI.list({ role: 'agent', limit, skip, query: q });
      const list = res.data || [];
      setAgents((prev) => (reset ? list : [...(prev || []), ...list]));
      setAgentSkip(skip + list.length);
      setAgentsHasMore(list.length === limit);
    } catch (err) {
      console.error('Failed to load agents', err);
      if (opts?.reset) setAgents([]);
    }
  };

  const fetchDepartments = async (opts?: { query?: string; reset?: boolean }) => {
    const q = opts?.query ?? deptQuery;
    const reset = opts?.reset ?? false;
    try {
      const limit = 25;
      const skip = reset ? 0 : deptSkip;
      // @ts-ignore: allow passing search param
      const res = await departmentsAPI.list({ limit, skip, search: q });
      const list = res.data || [];
      setDepts((prev) => (reset ? list : [...(prev || []), ...list]));
      setDeptSkip(skip + list.length);
      setDeptsHasMore(list.length === limit);
    } catch (err) {
      console.error('Failed to load departments', err);
      if (opts?.reset) setDepts([]);
    }
  };

  const handleAssign = async (agentId: string) => {
    setLoading(true);
    try {
      await conversationsAPI.assign(conversationId, agentId);
      setOpen(false);
      onAction?.();
    } catch (err) {
      console.error('Assign failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (departmentId: string) => {
    // open confirm modal with payload department
    setConfirm({ type: 'transfer', payload: { departmentId } });
    setOpen(false);
  };

  const handleClose = async () => {
    // open confirm modal for close
    setConfirm({ type: 'close' });
    setOpen(false);
  };

  const doConfirm = async () => {
    setLoading(true);
    try {
      if (confirm.type === 'close') {
        await conversationsAPI.close(conversationId, reason || 'Closed by admin', true);
      } else if (confirm.type === 'transfer') {
        const depId = confirm.payload?.departmentId;
        await conversationsAPI.transfer(conversationId, depId, reason || 'Transfer by admin');
      }

      setConfirm({ type: null });
      setReason('');
      onAction?.();
    } catch (err) {
      console.error('Confirm action failed', err);
    } finally {
      setLoading(false);
    }
  };

  const openMenu = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await fetchAgents({ reset: true });
    await fetchDepartments({ reset: true });
    setOpen(true);
  };

  useEffect(() => {
    // debounce agent search
    window.clearTimeout(agentDebounce.current);
    agentDebounce.current = window.setTimeout(() => {
      setAgentSkip(0);
      fetchAgents({ query: agentQuery, reset: true });
    }, 300) as unknown as number;

    return () => window.clearTimeout(agentDebounce.current);
  }, [agentQuery]);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={openMenu}
        className="p-1 rounded hover:bg-gray-100 text-gray-600"
        aria-haspopup
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>

      {open && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
          <div className="py-1">
            <div className="px-3 py-2 text-xs text-gray-500">Ações</div>
            <div className="px-2">
              <div className="text-sm text-gray-700 mb-1">Atribuir a agente</div>
              <input value={agentQuery} onChange={(e) => setAgentQuery(e.target.value)} placeholder="Buscar agente..." className="w-full px-2 py-1 border rounded text-sm mb-2" onClick={(e) => e.stopPropagation()} />
              <div className="max-h-32 overflow-auto py-1">
                {agents === null ? (
                  <div className="text-xs text-gray-500 p-2">Carregando agentes...</div>
                ) : agents.length === 0 ? (
                  <div className="text-xs text-gray-500 p-2">Nenhum agente disponível</div>
                ) : (
                  agents.map((a: any) => (
                    <button
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); handleAssign(a.id); }}
                      className="w-full text-left px-2 py-1 hover:bg-gray-100 text-sm"
                    >
                      {a.full_name || a.email}
                    </button>
                  ))
                )}
              </div>
              {agentsHasMore && (
                <div className="text-center mt-1">
                  <button onClick={(e) => { e.stopPropagation(); fetchAgents(); }} className="text-xs text-purple-600">Carregar mais</button>
                </div>
              )}
            </div>

            <div className="border-t my-1" />

            <div className="px-2">
              <div className="text-sm text-gray-700 mb-1">Encaminhar para departamento</div>
              <input value={deptQuery} onChange={(e) => { setDeptQuery(e.target.value); setDeptSkip(0); }} placeholder="Buscar departamento..." className="w-full px-2 py-1 border rounded text-sm mb-2" onClick={(e) => e.stopPropagation()} />
              <div className="max-h-32 overflow-auto py-1">
                {depts === null ? (
                  <div className="text-xs text-gray-500 p-2">Carregando departamentos...</div>
                ) : depts.length === 0 ? (
                  <div className="text-xs text-gray-500 p-2">Nenhum departamento</div>
                ) : (
                  depts.map((d: any) => (
                    <button key={d.id} onClick={(e) => { e.stopPropagation(); handleTransfer(d.id); }} className="w-full text-left px-2 py-1 hover:bg-gray-100 text-sm">{d.name}</button>
                  ))
                )}
              </div>
              {deptsHasMore && (
                <div className="text-center mt-1">
                  <button onClick={(e) => { e.stopPropagation(); fetchDepartments(); }} className="text-xs text-purple-600">Carregar mais</button>
                </div>
              )}
            </div>

            <div className="border-t my-1" />

            <div className="px-2 py-2">
              <button onClick={(e) => { e.stopPropagation(); handleClose(); }} disabled={loading} className="w-full text-left px-2 py-1 hover:bg-gray-100 text-sm text-red-600">Encerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={!!confirm.type} onClose={() => setConfirm({ type: null })} title={confirm.type === 'close' ? 'Confirmar encerramento' : 'Confirmar encaminhamento'}>
        <p className="text-sm text-gray-600 mb-4">{confirm.type === 'close' ? 'Confirme o encerramento desta conversa. Opcional: informe um motivo.' : 'Confirme o encaminhamento desta conversa para o departamento selecionado.'}</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" className="w-full border rounded p-2 text-sm" />
        <ModalActions>
          <button onClick={() => setConfirm({ type: null })} className="px-4 py-2 bg-gray-100 rounded">Cancelar</button>
          <button onClick={doConfirm} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded">Confirmar</button>
        </ModalActions>
      </Modal>
    </div>
  );
}

function DepartmentList({ onSelect }: { onSelect: (id: string, e?: React.MouseEvent) => void }) {
  const [deps, setDeps] = useState<any[] | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await departmentsAPI.list({ limit: 100 });
        if (mounted) setDeps(res.data || []);
      } catch (err) {
        console.error('Failed to load departments', err);
        if (mounted) setDeps([]);
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (deps === null) return <div className="text-xs text-gray-500 p-2">Carregando...</div>;
  if (deps.length === 0) return <div className="text-xs text-gray-500 p-2">Nenhum departamento</div>;

  return (
    <div>
      {deps.map((d) => (
        <button key={d.id} onClick={(e) => onSelect(d.id, e)} className="w-full text-left px-2 py-1 hover:bg-gray-100 text-sm">{d.name}</button>
      ))}
    </div>
  );
}
