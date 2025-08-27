import { useState, useCallback } from 'react'
import { ConfirmationDialog, ConfirmationDialogProps } from '@/components/ui/confirmation-dialog'

type ConfirmationOptions = Omit<ConfirmationDialogProps, 'open' | 'onOpenChange' | 'onConfirm' | 'onCancel'>

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmationOptions | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(options)
      setResolvePromise(() => resolve)
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolvePromise?.(true)
    setIsOpen(false)
    setOptions(null)
    setResolvePromise(null)
  }, [resolvePromise])

  const handleCancel = useCallback(() => {
    resolvePromise?.(false)
    setIsOpen(false)
    setOptions(null)
    setResolvePromise(null)
  }, [resolvePromise])

  const ConfirmationDialogComponent = useCallback(() => {
    if (!options) return null

    return (
      <ConfirmationDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleCancel()
        }}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        {...options}
      />
    )
  }, [isOpen, options, handleConfirm, handleCancel])

  return {
    confirm,
    ConfirmationDialog: ConfirmationDialogComponent
  }
}