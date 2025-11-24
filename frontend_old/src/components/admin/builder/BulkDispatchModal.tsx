"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { X, Upload, Calendar, Play, Clock, Plus, Trash2, Info } from "lucide-react";
import api from "@/lib/api";
import type { Flow } from "@/lib/types/flow";

type RecipientRow = {
  phone: string;
  name?: string;
  email?: string;
  company?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  flow: Flow;
}

// Util: normalize phone to digits only
const normalizePhone = (v: string) => v.replace(/\D+/g, "");

// Very small CSV parser for comma- or semicolon-separated values
function parseCSV(text: string): RecipientRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = (k: string) => headers.findIndex((h) => h === k);
  const iPhone = idx("phone") >= 0 ? idx("phone") : idx("whatsapp");

  const rows: RecipientRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map((p) => p.trim());
    const phone = iPhone >= 0 ? parts[iPhone] : parts[0];
    if (!phone) continue;
    rows.push({
      phone: normalizePhone(phone),
      name: headers.includes("name") ? parts[idx("name")] : undefined,
      email: headers.includes("email") ? parts[idx("email")] : undefined,
      company: headers.includes("company") ? parts[idx("company")] : undefined,
    });
  }
  return rows;
}

export default function BulkDispatchModal({ isOpen, onClose, chatbotId, flow }: Props) {
  const [whatsappNumbers, setWhatsappNumbers] = useState<Array<{ id: string; name?: string; phone_number?: string }>>([]);
  const [selectedNumberId, setSelectedNumberId] = useState<string>("");

  const [inputMode, setInputMode] = useState<"list" | "csv">("list");
  const [listText, setListText] = useState<string>("");
  const [csvText, setCsvText] = useState<string>("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  type MapRow = {
    varName: string;
    source: 'csv' | 'contact' | 'const';
    key?: string; // header name or contact field
    constValue?: string;
  };
  const [mappings, setMappings] = useState<MapRow[]>([]);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await api.get('/whatsapp/numbers');
        const items = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
        setWhatsappNumbers(items);
        if (items?.[0]?.id) setSelectedNumberId(items[0].id);
      } catch (e) {
        console.error("Erro ao carregar números WhatsApp", e);
      }
    })();
  }, [isOpen]);

  const parsedRows: RecipientRow[] = useMemo(() => {
    if (inputMode === "list") {
      return listText
        .split(/\r?\n/)
        .map((l) => normalizePhone(l))
        .filter(Boolean)
        .map((phone) => ({ phone }));
    }
    if (csvText.trim()) return parseCSV(csvText);
    return [];
  }, [inputMode, listText, csvText]);

  // Detect headers from CSV text
  useEffect(() => {
    if (!csvText.trim()) {
      setCsvHeaders([]);
      return;
    }
    const firstLine = csvText.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
    if (!firstLine) {
      setCsvHeaders([]);
      return;
    }
    const sep = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
    const headers = firstLine.split(sep).map((h) => h.trim().toLowerCase());
    setCsvHeaders(headers);
  }, [csvText]);

  // Helpers for mapping suggestions and rendering
  const CONTACT_FIELDS = [
    { key: 'name', label: 'Nome (contact.name)' },
    { key: 'email', label: 'Email (contact.email)' },
    { key: 'company', label: 'Empresa (contact.company)' },
    { key: 'whatsapp_id', label: 'WhatsApp ID (contact.whatsapp_id)' },
    { key: 'phone_number', label: 'Telefone alternativo (contact.phone_number)' },
  ];

  const canMapCsvHeaderToContact = (header: string) => ['name','email','company','whatsapp','phone','phone_number'].includes(header);

  const canSubmit = parsedRows.length > 0 && !!selectedNumberId && !!flow?.id;

  const handleFileUpload = useCallback(async (file: File) => {
    const text = await file.text();
    setCsvText(text);
    setInputMode("csv");
  }, []);

  const ensureContacts = useCallback(async (rows: RecipientRow[]): Promise<string[]> => {
    const ids: string[] = [];
    for (const row of rows) {
      const whatsapp_id = row.phone;
      try {
  const created = await api.post('/contacts', { whatsapp_id, name: row.name, email: row.email });
        const id = created?.data?.id;
        if (id) ids.push(id);
        continue;
      } catch (e: any) {
        // If conflict (already exists), try to find via search
        try {
          const found = await api.get('/contacts', { params: { query: whatsapp_id, limit: 1 } });
          const id = found?.data?.[0]?.id;
          if (id) ids.push(id);
          continue;
        } catch (err) {
          console.error("Erro ao buscar contato existente", err);
        }
      }
    }
    return ids;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // 1) Garantir contatos criados/encontrados
      const contactIds = await ensureContacts(parsedRows);
      if (contactIds.length === 0) {
        throw new Error("Nenhum contato válido encontrado");
      }

      // 2) Montar variable_mapping com base nos mapeamentos
      // Backend espera strings-template: "{{contact.field}}" ou valores estáticos
      const variable_mapping: Record<string, string> = {};
      for (const m of mappings) {
        if (!m.varName) continue;
        if (m.source === 'const') {
          variable_mapping[m.varName] = m.constValue ?? '';
        } else if (m.source === 'contact') {
          if (!m.key) continue;
          variable_mapping[m.varName] = `{{contact.${m.key}}}`;
        } else if (m.source === 'csv') {
          if (!m.key) continue;
          const h = m.key.toLowerCase();
          if (['name','email','company'].includes(h)) {
            variable_mapping[m.varName] = `{{contact.${h}}}`;
          } else if (['whatsapp','phone','phone_number'].includes(h)) {
            // map to whatsapp_id or phone_number
            const field = h === 'phone_number' ? 'phone_number' : 'whatsapp_id';
            variable_mapping[m.varName] = `{{contact.${field}}}`;
          } else {
            // Futuro: usar attributes quando backend suportar atualização
            // Usamos template para attributes, mas hoje tende a retornar vazio
            variable_mapping[m.varName] = `{{contact.attributes.${h}}}`;
          }
        }
      }

      // 3) Criar automação
      const name = `Disparo ${new Date().toLocaleString()}`;
      const payload = {
        name,
        description: `Criado pelo Builder para o fluxo ${flow.name}`,
        chatbot_id: chatbotId,
        flow_id: flow.id,
        whatsapp_number_id: selectedNumberId,
        trigger_type: scheduleEnabled ? "scheduled" : "manual",
        trigger_config: scheduleEnabled && scheduleAt ? { scheduled_at: scheduleAt } : {},
        audience_type: "custom",
        audience_config: { contact_ids: contactIds },
        variable_mapping,
        rate_limit_per_hour: 500,
      } as any;

  const created = await api.post('/flow-automations', payload);
      const automationId = created?.data?.id;

      if (!automationId) throw new Error("Falha ao criar automação");

      // 3) Se não for agendado, iniciar agora
      if (!scheduleEnabled) {
  await api.post(`/flow-automations/${automationId}/start`);
        setSuccessMessage("Disparo iniciado com sucesso!");
      } else {
        setSuccessMessage("Automação criada e agendada.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.detail || e?.message || "Erro ao criar/agendar automação");
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, ensureContacts, parsedRows, chatbotId, flow, selectedNumberId, scheduleEnabled, scheduleAt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Agendar disparo do fluxo</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Seleção do número WhatsApp */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Número do WhatsApp</label>
            <select
              value={selectedNumberId}
              onChange={(e) => setSelectedNumberId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {whatsappNumbers.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name || n.phone_number || n.id}
                </option>
              ))}
            </select>
          </div>

          {/* Modo de entrada */}
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode("list")}
              className={`px-3 py-1.5 text-sm rounded-lg border ${inputMode === "list" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-300 dark:border-gray-700"}`}
            >
              Lista simples
            </button>
            <button
              onClick={() => setInputMode("csv")}
              className={`px-3 py-1.5 text-sm rounded-lg border ${inputMode === "csv" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-gray-300 dark:border-gray-700"}`}
            >
              CSV (phone,name,email,company)
            </button>
          </div>

          {inputMode === "list" ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cole os números (um por linha)</label>
              <textarea
                value={listText}
                onChange={(e) => setListText(e.target.value)}
                rows={6}
                placeholder="5511999999999\n5511888888888"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-sm"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Cole o CSV</label>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Importar arquivo
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                </label>
              </div>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={8}
                placeholder="phone,name,email,company\n5511999999999,Fulano,fulano@exemplo.com,Empresa"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-xs"
              />

              {/* Mapping UI */}
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div>
                    <p>Mapeie colunas do CSV ou campos do contato para variáveis do fluxo.</p>
                    {csvHeaders.some((h) => !canMapCsvHeaderToContact(h)) && (
                      <p className="mt-1">Colunas não padrão serão tentadas via {'{{contact.attributes.*}}'}; hoje podem ficar vazias até habilitarmos atributos no backend.</p>
                    )}
                  </div>
                </div>

                {mappings.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={m.varName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, varName: v } : row));
                      }}
                      placeholder="Nome da variável (ex.: customer_name)"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    />

                    <select
                      value={m.source}
                      onChange={(e) => {
                        const src = e.target.value as MapRow['source'];
                        setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, source: src, key: undefined, constValue: '' } : row));
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="csv">Coluna CSV</option>
                      <option value="contact">Campo do contato</option>
                      <option value="const">Constante</option>
                    </select>

                    {m.source === 'csv' && (
                      <select
                        value={m.key || ''}
                        onChange={(e) => {
                          const key = e.target.value;
                          setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, key } : row));
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      >
                        <option value="" disabled>Selecione a coluna</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    )}

                    {m.source === 'contact' && (
                      <select
                        value={m.key || ''}
                        onChange={(e) => {
                          const key = e.target.value;
                          setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, key } : row));
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      >
                        <option value="" disabled>Selecione o campo</option>
                        {CONTACT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                    )}

                    {m.source === 'const' && (
                      <input
                        value={m.constValue || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMappings((prev) => prev.map((row, i) => i === idx ? { ...row, constValue: v } : row));
                        }}
                        placeholder="Valor constante"
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                      />
                    )}

                    <button
                      onClick={() => setMappings((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div>
                  <button
                    onClick={() => setMappings((prev) => [...prev, { varName: '', source: 'csv' }])}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Adicionar variável
                  </button>
                </div>

                {/* Preview */}
                {mappings.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="font-medium mb-1">Prévia (primeiras 3 linhas)</div>
                    <div className="space-y-1">
                      {parsedRows.slice(0, 3).map((row, i) => (
                        <div key={i} className="flex flex-wrap gap-3">
                          {mappings.map((m, j) => {
                            const label = m.varName || `var${j+1}`;
                            let value = '';
                            if (m.source === 'const') value = m.constValue || '';
                            if (m.source === 'contact') {
                              if (m.key === 'name') value = row.name || '';
                              else if (m.key === 'email') value = row.email || '';
                              else if (m.key === 'company') value = row.company || '';
                              else if (m.key === 'whatsapp_id') value = row.phone;
                              else if (m.key === 'phone_number') value = row.phone;
                            }
                            if (m.source === 'csv' && m.key) {
                              const h = m.key.toLowerCase();
                              if (h === 'phone' || h === 'whatsapp') value = row.phone;
                              else if (h === 'name') value = row.name || '';
                              else if (h === 'email') value = row.email || '';
                              else if (h === 'company') value = row.company || '';
                              else value = '';
                            }
                            return (
                              <div key={j} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
                                <span className="font-mono">{label}</span> = <span className="font-mono">{value || '(vazio)'}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agendamento */}
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} />
              Agendar para uma data/hora
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                disabled={!scheduleEnabled}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>{parsedRows.length} destinatário(s) pronto(s).</p>
            {inputMode === 'csv' && csvHeaders.length > 0 && (
              <p>Headers detectados: {csvHeaders.join(', ')}</p>
            )}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
          )}
          {successMessage && (
            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{successMessage}</div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700">Cancelar</button>
          <button
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50 flex items-center gap-2"
          >
            {scheduleEnabled ? (
              <>
                <Clock className="w-4 h-4" /> Agendar
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Iniciar agora
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
