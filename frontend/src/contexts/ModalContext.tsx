import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ModalConfig {
  id: string;
  title: string;
  description?: string;
  content?: React.ReactNode;
  type: 'alert' | 'confirm' | 'custom';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  isDangerous?: boolean;
  isLoading?: boolean;
}

interface ModalContextType {
  modals: ModalConfig[];
  openModal: (config: Omit<ModalConfig, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  updateModal: (id: string, config: Partial<ModalConfig>) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<ModalConfig[]>([]);

  const openModal = useCallback((config: Omit<ModalConfig, 'id'>): string => {
    const id = `modal-${Date.now()}-${Math.random()}`;
    const modal: ModalConfig = { ...config, id };

    setModals((prev) => [...prev, modal]);
    return id;
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  const updateModal = useCallback((id: string, config: Partial<ModalConfig>) => {
    setModals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...config } : m))
    );
  }, []);

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, closeAllModals, updateModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};
