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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Números WhatsApp</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando números...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            {numbers.length === 0 ? (
              <p className="text-gray-600">Nenhum número cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {numbers.map((number) => (
                  <div key={number.id} className="border p-4 rounded">
                    <p className="font-semibold">{number.display_name}</p>
                    <p className="text-sm text-gray-600">{number.phone_number}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Tipo: {number.connection_type === 'official' ? 'API Oficial' : 'QR Code'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
