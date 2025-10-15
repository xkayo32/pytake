'use client';

import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useConfirmStore } from '@/hooks/useConfirm';

export function ConfirmDialogProvider() {
  const { isOpen, options, close } = useConfirmStore();

  if (!options) return null;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );
}
