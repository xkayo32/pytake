'use client';

import { useEffect, useState } from 'react';
import { whatsappAPI, WhatsAppNumber } from '@/lib/api/whatsapp';
import { Phone, Plus, Edit, Trash2, CheckCircle, XCircle, Loader2, QrCode, Shield, ChevronDown } from 'lucide-react';
import { AddWhatsAppNumberModal } from '@/components/admin/AddWhatsAppNumberModal';
import { AddWhatsAppQRCodeModal } from '@/components/admin/AddWhatsAppQRCodeModal';
import { EditWhatsAppNumberModal } from '@/components/admin/EditWhatsAppNumberModal';

export default function WhatsAppPage() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddOfficialModal, setShowAddOfficialModal] = useState(false);
  const [showAddQRCodeModal, setShowAddQRCodeModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WhatsAppNumber | null>(null);

  useEffect(() => {
    loadNumbers();
  }, []);

  const loadNumbers = async () => {
    try {
      setIsLoading(true);
      const data = await whatsappAPI.list();
      setNumbers(data);
    } catch (error) {
      console.error('Failed to load WhatsApp numbers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este número WhatsApp?')) {
      return;
    }

    try {
      await whatsappAPI.delete(id);
      await loadNumbers();
    } catch (error) {
      console.error('Failed to delete number:', error);
      alert('Erro ao deletar número WhatsApp');
    }
  };

  const handleToggleActive = async (number: WhatsAppNumber) => {
    try {
      await whatsappAPI.update(number.id, {
        is_active: !number.is_active,
      });
      await loadNumbers();
    } catch (error) {
      console.error('Failed to toggle number status:', error);
      alert('Erro ao alterar status do número');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Números WhatsApp
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie os números WhatsApp conectados à sua organização
          </p>
        </div>
        {/* Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Adicionar Número
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Dropdown Menu */}
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10">
              <button
                onClick={() => {
                  setShowAddOfficialModal(true);
                  setShowAddMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 rounded-t-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">API Oficial (Meta)</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      WhatsApp Business Cloud API oficial
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowAddQRCodeModal(true);
                  setShowAddMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-b-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <QrCode className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">QR Code (Evolution API)</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Conexão via WhatsApp Web (gratuito)
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Numbers List */}
      {numbers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-12 text-center">
          <Phone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum número WhatsApp configurado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Adicione seu primeiro número WhatsApp para começar a usar o sistema
          </p>
          <button
            onClick={() => setShowAddMenu(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Adicionar Primeiro Número
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {numbers.map((number) => (
            <div
              key={number.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Phone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {number.display_name || number.phone_number}
                    </h3>

                    {/* Connection Type Tag */}
                    {number.connection_type === 'official' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">
                        <Shield className="h-3 w-3" />
                        API Oficial
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                        <QrCode className="h-3 w-3" />
                        QR Code
                      </span>
                    )}

                    {number.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Verificado
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Telefone</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {number.phone_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {number.status === 'connected' ? (
                          <>
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              Conectado
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 bg-gray-400 rounded-full" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Desconectado
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Qualidade
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {number.quality_rating || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Limite de Mensagens
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {number.messaging_limit || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {number.whatsapp_business_account_id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Business Account ID
                      </p>
                      <p className="text-sm font-mono text-gray-900 dark:text-white">
                        {number.whatsapp_business_account_id}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(number)}
                    className={`p-2 rounded-lg transition-colors ${
                      number.is_active
                        ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={number.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {number.is_active ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingNumber(number)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(number.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official API Modal */}
      <AddWhatsAppNumberModal
        isOpen={showAddOfficialModal}
        onClose={() => setShowAddOfficialModal(false)}
        onSuccess={loadNumbers}
      />

      {/* QR Code Modal */}
      <AddWhatsAppQRCodeModal
        isOpen={showAddQRCodeModal}
        onClose={() => setShowAddQRCodeModal(false)}
        onSuccess={loadNumbers}
      />

      {/* Edit Number Modal */}
      <EditWhatsAppNumberModal
        isOpen={!!editingNumber}
        number={editingNumber}
        onClose={() => setEditingNumber(null)}
        onSuccess={loadNumbers}
      />
    </div>
  );
}
