import React from 'react';
import { X, AlertCircle, AlertTriangle, Info, Loader } from 'lucide-react';
import { useModal } from '@contexts/ModalContext';

const getBackgroundColor = (type: string) => {
  switch (type) {
    case 'alert':
      return 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900';
    case 'confirm':
      return 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900';
    case 'custom':
      return 'bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-slate-900';
    default:
      return 'bg-white dark:bg-slate-800';
  }
};

const getHeaderColor = (type: string, isDangerous?: boolean) => {
  if (isDangerous) return 'bg-gradient-to-r from-red-600 to-rose-600 dark:from-red-700 dark:to-rose-700';
  switch (type) {
    case 'alert':
      return 'bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-700 dark:to-cyan-700';
    case 'confirm':
      return 'bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-700 dark:to-orange-700';
    case 'custom':
      return 'bg-gradient-to-r from-slate-600 to-gray-600 dark:from-slate-700 dark:to-gray-700';
    default:
      return 'bg-slate-100 dark:bg-slate-700';
  }
};

const getIcon = (type: string, isDangerous?: boolean) => {
  const iconProps = 'w-6 h-6';
  if (isDangerous) return <AlertTriangle className={`${iconProps} text-white`} />;
  switch (type) {
    case 'alert':
      return <Info className={`${iconProps} text-white`} />;
    case 'confirm':
      return <AlertCircle className={`${iconProps} text-white`} />;
    default:
      return null;
  }
};

interface ModalDialogProps {
  modalId: string;
}

const ModalDialog: React.FC<ModalDialogProps> = ({ modalId }) => {
  const { modals, closeModal, updateModal } = useModal();
  const modal = modals.find((m) => m.id === modalId);

  if (!modal) return null;

  const handleConfirm = async () => {
    if (modal.isLoading) return;

    if (modal.onConfirm) {
      updateModal(modalId, { isLoading: true });
      try {
        await modal.onConfirm();
      } finally {
        updateModal(modalId, { isLoading: false });
        closeModal(modalId);
      }
    } else {
      closeModal(modalId);
    }
  };

  const handleCancel = () => {
    if (modal.onCancel) {
      modal.onCancel();
    }
    closeModal(modalId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4 animate-fade-in">
      <div
        className={`${getBackgroundColor(
          modal.type
        )} rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-200`}
      >
        {/* Header */}
        <div className={`${getHeaderColor(modal.type, modal.isDangerous)} px-6 py-4 flex items-center gap-3`}>
          {getIcon(modal.type, modal.isDangerous)}
          <h2 className="text-lg font-bold text-white flex-1">{modal.title}</h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {modal.description && (
            <p className="text-gray-700 dark:text-gray-300 mb-4">{modal.description}</p>
          )}
          {modal.content && <div className="mb-4">{modal.content}</div>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 flex gap-3 justify-end border-t border-gray-200 dark:border-slate-700">
          {modal.type !== 'custom' || modal.cancelText ? (
            <button
              onClick={handleCancel}
              disabled={modal.isLoading}
              className="px-4 py-2 rounded-lg font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
            >
              {modal.cancelText || 'Cancelar'}
            </button>
          ) : null}

          {modal.type !== 'custom' || modal.confirmText ? (
            <button
              onClick={handleConfirm}
              disabled={modal.isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-white disabled:opacity-50 ${
                modal.isDangerous
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:shadow-lg hover:shadow-red-500/30'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:shadow-blue-500/30'
              }`}
            >
              {modal.isLoading && <Loader className="w-4 h-4 animate-spin" />}
              {modal.confirmText || 'Confirmar'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const ModalContainer: React.FC = () => {
  const { modals } = useModal();

  return (
    <>
      {modals.map((modal) => (
        <ModalDialog key={modal.id} modalId={modal.id} />
      ))}
    </>
  );
};
