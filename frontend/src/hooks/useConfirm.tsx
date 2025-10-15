'use client';

import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolveCallback: ((value: boolean) => void) | null;
  open: (options: ConfirmOptions) => Promise<boolean>;
  close: (confirmed: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: null,
  resolveCallback: null,

  open: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolveCallback: resolve,
      });
    });
  },

  close: (confirmed) => {
    const { resolveCallback } = get();
    if (resolveCallback) {
      resolveCallback(confirmed);
    }
    set({
      isOpen: false,
      options: null,
      resolveCallback: null,
    });
  },
}));

export function useConfirm() {
  const open = useConfirmStore((state) => state.open);

  return {
    confirm: async (options: ConfirmOptions): Promise<boolean> => {
      return await open(options);
    },
  };
}
