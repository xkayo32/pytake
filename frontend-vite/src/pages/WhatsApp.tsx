import { useEffect, useState } from 'react';
import { whatsappAPI } from '../lib/api';

export default function WhatsApp() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Números WhatsApp</h1>
          <p className="text-gray-600 mt-1">Gerencie seus números do WhatsApp Business</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
