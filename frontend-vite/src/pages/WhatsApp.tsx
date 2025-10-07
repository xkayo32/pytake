import { useEffect, useState } from 'react';
import { whatsappAPI } from '../lib/api';
import AddWhatsAppModal from '../components/modals/AddWhatsAppModal';
import { Trash2 } from 'lucide-react';

export default function WhatsApp() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadNumbers();
  }, []);

  const loadNumbers = async () => {
    try {
      setLoading(true);
      const response = await whatsappAPI.list();
      setNumbers(response.data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar números: ' + (err.message || 'Erro desconhecido'));
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este número?')) {
      return;
    }

    try {
      await whatsappAPI.delete(id);
      loadNumbers();
    } catch (err: any) {
      alert('Erro ao excluir número: ' + (err.message || 'Erro desconhecido'));
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Números WhatsApp</h1>
          <p className="text-gray-600 mt-1">Gerencie seus números do WhatsApp Business</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <span>+</span>
          Adicionar Número
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Carregando números...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          {numbers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">Nenhum número cadastrado.</p>
              <p className="text-sm text-gray-500 mt-1">Adicione seu primeiro número WhatsApp para começar</p>
            </div>
          ) : (
            <div className="divide-y">
              {numbers.map((number) => (
                <div key={number.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{number.display_name}</p>
                          <p className="text-sm text-gray-600">{number.phone_number}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          number.connection_type === 'official'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {number.connection_type === 'official' ? 'API Oficial' : 'QR Code'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(number.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir número"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add WhatsApp Modal */}
      <AddWhatsAppModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          loadNumbers();
        }}
      />
    </div>
  );
}
