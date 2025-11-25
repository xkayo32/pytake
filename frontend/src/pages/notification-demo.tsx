import React from 'react';
import { useNotifications, useDialog } from '@hooks/useNotification';
import { Button } from '@components/ui/button';

/**
 * Página de Demonstração de Modals e Toasts
 * Mostra exemplos práticos de como usar os componentes
 */
export default function NotificationDemo() {
  const notifications = useNotifications();
  const dialog = useDialog();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="section-title mb-2">Demonstração de Notificações</h1>
        <p className="section-subtitle mb-12">
          Exemplos de uso de Toasts e Modals para melhor UX
        </p>

        {/* Toasts Section */}
        <div className="card-interactive mb-8">
          <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">
            🔔 Toasts (Notificações Pop-up)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => notifications.success('Operação realizada com sucesso!')}
              className="btn-primary w-full"
            >
              Sucesso ✓
            </Button>

            <Button
              onClick={() => notifications.error('Ocorreu um erro ao processar!')}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:shadow-lg hover:shadow-red-500/30 text-white font-semibold py-2 px-4 rounded-lg w-full"
            >
              Erro ✗
            </Button>

            <Button
              onClick={() => notifications.info('Esta é uma notificação informativa')}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:shadow-blue-500/30 text-white font-semibold py-2 px-4 rounded-lg w-full"
            >
              Info ℹ
            </Button>

            <Button
              onClick={() => notifications.warning('Atenção: Verifique os dados')}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:shadow-lg hover:shadow-amber-500/30 text-white font-semibold py-2 px-4 rounded-lg w-full"
            >
              Aviso ⚠
            </Button>

            <Button
              onClick={() =>
                notifications.action(
                  'Arquivo baixado',
                  'Abrir',
                  () => alert('Abrindo arquivo...'),
                  5000
                )
              }
              className="btn-primary w-full md:col-span-2"
            >
              Action Toast 🎯
            </Button>
          </div>
        </div>

        {/* Modals Section */}
        <div className="card-interactive">
          <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">
            📱 Modals (Caixas de Diálogo)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => dialog.alert('Informação', 'Esta é uma notificação importante!')}
              className="btn-primary w-full"
            >
              Alert Modal
            </Button>

            <Button
              onClick={() =>
                dialog.confirm(
                  'Confirmar Ação',
                  'Tem certeza que deseja continuar?',
                  () => {
                    notifications.success('Ação confirmada!');
                  }
                )
              }
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:shadow-blue-500/30 text-white font-semibold py-2 px-4 rounded-lg w-full"
            >
              Confirm Modal
            </Button>

            <Button
              onClick={() =>
                dialog.dangerous(
                  'Deletar Item',
                  'Esta ação não pode ser desfeita. Tem certeza?',
                  async () => {
                    // Simular API call
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    notifications.success('Item deletado com sucesso!');
                  },
                  { confirmText: 'Deletar', cancelText: 'Cancelar' }
                )
              }
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:shadow-lg hover:shadow-red-500/30 text-white font-semibold py-2 px-4 rounded-lg w-full"
            >
              Dangerous Modal
            </Button>

            <Button
              onClick={() => {
                const customContent = (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        Conteúdo Customizado
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                        Você pode adicionar qualquer elemento JSX aqui!
                      </p>
                    </div>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                );

                dialog.custom('Formulário Customizado', customContent, {
                  confirmText: 'Enviar',
                  onConfirm: () => notifications.success('Formulário enviado!'),
                });
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/30 text-white font-semibold py-2 px-4 rounded-lg w-full"
            >
              Custom Modal
            </Button>
          </div>
        </div>

        {/* Code Examples */}
        <div className="mt-8 card-interactive">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">
            💻 Exemplos de Código
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-slate-900 dark:bg-slate-950 rounded-lg overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono">
                {`// Toast com sucesso
const notifications = useNotifications();
notifications.success('Salvo com sucesso!');

// Toast com ação
notifications.action(
  'Arquivo enviado',
  'Abrir',
  () => window.open('/file.pdf')
);`}
              </pre>
            </div>

            <div className="p-4 bg-slate-900 dark:bg-slate-950 rounded-lg overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono">
                {`// Modal de confirmação
const dialog = useDialog();
dialog.confirm(
  'Deletar item?',
  'Esta ação não pode ser desfeita.',
  async () => {
    await api.delete('/items/1');
    notifications.success('Deletado!');
  }
);`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
