'use client';

import { useEffect, useState } from 'react';
import { whatsappAPI, WhatsAppNumber } from '@/lib/api/whatsapp';
import { Phone, Plus, Edit, Trash2, CheckCircle, XCircle, Loader2, QrCode, Shield, ChevronDown, FileText, Bot, LayoutGrid, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AddWhatsAppNumberModal } from '@/components/admin/AddWhatsAppNumberModal';
import { AddWhatsAppQRCodeModal } from '@/components/admin/AddWhatsAppQRCodeModal';
import { EditWhatsAppNumberModal } from '@/components/admin/EditWhatsAppNumberModal';
import { EmptyState } from '@/components/admin/EmptyState';
import { chatbotsAPI } from '@/lib/api/chatbots';
import type { Chatbot } from '@/types/chatbot';

export default function WhatsAppPage() {
  const router = useRouter();
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddOfficialModal, setShowAddOfficialModal] = useState(false);
  const [showAddQRCodeModal, setShowAddQRCodeModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingNumber, setEditingNumber] = useState<WhatsAppNumber | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadNumbers();
    loadChatbots();
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

  const loadChatbots = async () => {
    try {
      const response = await chatbotsAPI.list({ limit: 100 });
      setChatbots(response.items || []);
    } catch (error) {
      console.error('Failed to load chatbots:', error);
      setChatbots([]);
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

  const handleSetDefaultChatbot = async (
    numberId: string,
    chatbotId: string | null
  ) => {
    try {
      await whatsappAPI.update(numberId, {
        default_chatbot_id: chatbotId,
      });
      await loadNumbers();
    } catch (error) {
      console.error('Failed to set default chatbot:', error);
      alert('Erro ao definir chatbot padrão');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-gray-900 dark:text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Button Row */}
      <div className="flex justify-between items-center gap-3">
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Visualização em Grade"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Visualização em Lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/whatsapp/templates')}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Gerenciar Templates
          </button>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar Número
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Dropdown Menu */}
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10 overflow-hidden">
              <button
                onClick={() => {
                  setShowAddOfficialModal(true);
                  setShowAddMenu(false);
                }}
                className="w-full px-5 py-4 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/20 dark:hover:to-cyan-900/20 transition-all border-b border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 dark:text-white mb-1">API Oficial (Meta)</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      WhatsApp Business Cloud API oficial da Meta
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowAddQRCodeModal(true);
                  setShowAddMenu(false);
                }}
                className="w-full px-5 py-4 text-left hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <QrCode className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 dark:text-white mb-1">QR Code (Evolution API)</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Conexão via WhatsApp Web - 100% gratuito
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Numbers List */}
      {numbers.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="Nenhum número WhatsApp configurado"
          description="Conecte seu primeiro número WhatsApp Business para começar a enviar e receber mensagens dos seus clientes"
          variant="gradient"
          action={{
            label: 'Adicionar Primeiro Número',
            onClick: () => setShowAddMenu(true),
            icon: Plus,
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid gap-6">
          {numbers.map((number) => (
            <div
              key={number.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:border dark:border-gray-700 p-7 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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

                  {/* Default Chatbot Selector */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Bot className="w-4 h-4" />
                      Chatbot Padrão
                    </label>
                    <select
                      value={number.default_chatbot_id || ''}
                      onChange={(e) =>
                        handleSetDefaultChatbot(number.id, e.target.value || null)
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                    >
                      <option value="">Nenhum chatbot padrão</option>
                      {chatbots.map((bot) => (
                        <option key={bot.id} value={bot.id}>
                          {bot.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Chatbot que responderá automaticamente as mensagens neste número
                    </p>
                  </div>
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
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Chatbot Padrão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Qualidade
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {numbers.map((number) => (
                  <tr
                    key={number.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {number.display_name || number.phone_number}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {number.phone_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
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
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={number.default_chatbot_id || ''}
                        onChange={(e) =>
                          handleSetDefaultChatbot(number.id, e.target.value || null)
                        }
                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Nenhum</option>
                        {chatbots.map((bot) => (
                          <option key={bot.id} value={bot.id}>
                            {bot.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {number.quality_rating || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
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
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
