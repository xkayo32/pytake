import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast, ToastType } from '@contexts/ToastContext';

const getToastStyles = (type: ToastType) => {
  const base =
    'flex items-center gap-4 px-6 py-4 rounded-lg shadow-lg backdrop-blur-sm animate-fade-in text-sm font-medium transition-all duration-200';

  switch (type) {
    case 'success':
      return `${base} bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-100 border border-green-200 dark:border-green-800`;
    case 'error':
      return `${base} bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 text-red-800 dark:text-red-100 border border-red-200 dark:border-red-800`;
    case 'warning':
      return `${base} bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-800 dark:text-amber-100 border border-amber-200 dark:border-amber-800`;
    case 'info':
    default:
      return `${base} bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-800 dark:text-blue-100 border border-blue-200 dark:border-blue-800`;
  }
};

const getToastIcon = (type: ToastType) => {
  const iconProps = 'w-5 h-5 flex-shrink-0';
  switch (type) {
    case 'success':
      return <CheckCircle className={`${iconProps} text-green-600 dark:text-green-400`} />;
    case 'error':
      return <AlertCircle className={`${iconProps} text-red-600 dark:text-red-400`} />;
    case 'warning':
      return <AlertTriangle className={`${iconProps} text-amber-600 dark:text-amber-400`} />;
    case 'info':
    default:
      return <Info className={`${iconProps} text-blue-600 dark:text-blue-400`} />;
  }
};

interface ToastItemProps {
  toast: ReturnType<typeof useToast>['toasts'][0];
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const { removeToast } = useToast();

  return (
    <div className={getToastStyles(toast.type)}>
      <div className="flex-shrink-0">{getToastIcon(toast.type)}</div>

      <div className="flex-1">
        <p>{toast.message}</p>
      </div>

      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            removeToast(toast.id);
          }}
          className="flex-shrink-0 ml-4 font-semibold underline hover:opacity-75 transition-opacity"
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-3 z-50 pointer-events-none max-w-sm">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
};
