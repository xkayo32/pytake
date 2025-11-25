import { useToast } from '../contexts/ToastContext';
import { useModal } from '../contexts/ModalContext';
import React from 'react';

/**
 * Hook customizado para notificações tipo Toast
 * Uso: const notifications = useNotifications();
 *      notifications.success('Sucesso!');
 */
export const useNotifications = () => {
  const { addToast } = useToast();

  return {
    success: (message: string, duration?: number) =>
      addToast(message, 'success', duration),
    error: (message: string, duration?: number) =>
      addToast(message, 'error', duration),
    info: (message: string, duration?: number) =>
      addToast(message, 'info', duration),
    warning: (message: string, duration?: number) =>
      addToast(message, 'warning', duration),
    action: (message: string, label: string, onClick: () => void, duration?: number) =>
      addToast(message, 'info', duration, { label, onClick }),
  };
};

/**
 * Hook customizado para Modals
 * Uso: const dialog = useDialog();
 *      dialog.alert('Título', 'Descrição');
 */
export const useDialog = () => {
  const { openModal, closeModal, closeAllModals } = useModal();

  return {
    /**
     * Abre um modal de alerta simples
     */
    alert: (title: string, description?: string) => {
      return openModal({
        title,
        description,
        type: 'alert',
        confirmText: 'OK',
      });
    },

    /**
     * Abre um modal de confirmação
     */
    confirm: (
      title: string,
      description: string,
      onConfirm: () => void | Promise<void>,
      options?: {
        confirmText?: string;
        cancelText?: string;
      }
    ) => {
      return openModal({
        title,
        description,
        type: 'confirm',
        confirmText: options?.confirmText || 'Confirmar',
        cancelText: options?.cancelText || 'Cancelar',
        onConfirm,
      });
    },

    /**
     * Abre um modal de confirmação perigosa (delete, logout, etc)
     */
    dangerous: (
      title: string,
      description: string,
      onConfirm: () => void | Promise<void>,
      options?: {
        confirmText?: string;
        cancelText?: string;
      }
    ) => {
      return openModal({
        title,
        description,
        type: 'confirm',
        isDangerous: true,
        confirmText: options?.confirmText || 'Deletar',
        cancelText: options?.cancelText || 'Cancelar',
        onConfirm,
      });
    },

    /**
     * Abre um modal customizado com conteúdo JSX
     */
    custom: (
      title: string,
      content: React.ReactNode,
      options?: {
        description?: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm?: () => void | Promise<void>;
        onCancel?: () => void;
      }
    ) => {
      return openModal({
        title,
        content,
        type: 'custom',
        description: options?.description,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        onConfirm: options?.onConfirm,
        onCancel: options?.onCancel,
      });
    },

    /**
     * Fecha um modal específico
     */
    close: closeModal,

    /**
     * Fecha todos os modals
     */
    closeAll: closeAllModals,
  };
};
