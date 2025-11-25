import React from 'react';
import { ToastProvider } from '@contexts/ToastContext';
import { ModalProvider } from '@contexts/ModalContext';
import { ToastContainer } from './ui/toast';
import { ModalContainer } from './ui/modal';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <ModalProvider>
        {children}
        <ToastContainer />
        <ModalContainer />
      </ModalProvider>
    </ToastProvider>
  );
};
