'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { chatbotsAPI } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Chatbot {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_published: boolean;
  version: number;
  total_conversations: number;
  total_messages_sent: number;
  total_messages_received: number;
  created_at: string;
}

export default function ChatbotsPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadChatbots();
  }, [isAuthenticated, router]);

  const loadChatbots = async () => {
    setIsLoading(true);
    try {
      const response = await chatbotsAPI.list({});
      setChatbots(response.data.items);
    } catch (error) {
      console.error('Failed to load chatbots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (chatbotId: string, currentStatus: boolean) => {
    try {
      await chatbotsAPI.update(chatbotId, { is_active: !currentStatus });
      loadChatbots();
    } catch (error) {
      console.error('Failed to update chatbot:', error);
      alert('Erro ao atualizar chatbot');
    }
  };

  const publishChatbot = async (chatbotId: string) => {
    if (!confirm('Tem certeza que deseja publicar este chatbot?')) return;
    try {
      await chatbotsAPI.publish(chatbotId);
      loadChatbots();
    } catch (error) {
      console.error('Failed to publish chatbot:', error);
      alert('Erro ao publicar chatbot');
    }
  };

  const deleteChatbot = async (chatbotId: string) => {
    if (!confirm('Tem certeza que deseja excluir este chatbot?')) return;
    try {
      await chatbotsAPI.delete(chatbotId);
      loadChatbots();
    } catch (error) {
      console.error('Failed to delete chatbot:', error);
      alert('Erro ao excluir chatbot');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow dark:border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chatbots</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Automação inteligente de conversas</p>
          </div>
          <div className="flex gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Todos
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
              Ativos
            </button>
            <button className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
              Publicados
            </button>
          </div>
          <button
            onClick={() => alert('Builder de chatbot em desenvolvimento')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            + Novo Chatbot
          </button>
        </div>

        {/* Chatbots Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Carregando...</div>
        ) : chatbots.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhum chatbot encontrado</p>
            <button
              onClick={() => alert('Builder de chatbot em desenvolvimento')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Criar primeiro chatbot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chatbots.map((chatbot) => (
              <div key={chatbot.id} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 hover:shadow-lg transition-shadow">
                {/* Card Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{chatbot.name}</h3>
                    <div className="flex gap-2">
                      {chatbot.is_active && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                          Ativo
                        </span>
                      )}
                      {chatbot.is_published && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                          Publicado
                        </span>
                      )}
                    </div>
                  </div>
                  {chatbot.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{chatbot.description}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{chatbot.total_conversations}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Conversas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{chatbot.total_messages_sent}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Enviadas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{chatbot.total_messages_received}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Recebidas</p>
                    </div>
                  </div>
                </div>

                {/* Version Info */}
                <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Versão {chatbot.version} • Criado em {new Date(chatbot.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={() => router.push(`/chatbots/${chatbot.id}`)}
                    className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Editar Fluxo
                  </button>
                  <button
                    onClick={() => toggleActive(chatbot.id, chatbot.is_active)}
                    className={`px-3 py-2 text-sm rounded border ${
                      chatbot.is_active
                        ? 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                        : 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                    }`}
                  >
                    {chatbot.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                  <div className="relative group">
                    <button className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                      •••
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg dark:border dark:border-gray-700 hidden group-hover:block z-10">
                      {!chatbot.is_published && (
                        <button
                          onClick={() => publishChatbot(chatbot.id)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Publicar
                        </button>
                      )}
                      <button
                        onClick={() => alert('Duplicar em desenvolvimento')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Duplicar
                      </button>
                      <button
                        onClick={() => alert('Exportar em desenvolvimento')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Exportar
                      </button>
                      <hr className="my-1 dark:border-gray-700" />
                      <button
                        onClick={() => deleteChatbot(chatbot.id)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
