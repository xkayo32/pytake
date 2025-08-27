import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirmation } from '@/hooks/useConfirmation'

interface UseUnsavedChangesWarningProps {
  hasUnsavedChanges: boolean
  message?: string
}

export function useUnsavedChangesWarning({
  hasUnsavedChanges,
  message = 'Você tem alterações não salvas. Deseja descartar as alterações e sair?'
}: UseUnsavedChangesWarningProps) {
  const router = useRouter()
  const { confirm, ConfirmationDialog } = useConfirmation()

  useEffect(() => {
    // Prevenir navegação do browser (F5, fechar aba, etc)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }

    // Adicionar listener
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges, message])

  // Função para navegar com confirmação usando modal
  const navigateWithConfirmation = async (url: string) => {
    if (hasUnsavedChanges) {
      const confirmed = await confirm({
        title: 'Alterações não salvas',
        description: message,
        confirmText: 'Descartar alterações',
        cancelText: 'Continuar editando',
        variant: 'warning'
      })
      if (confirmed) {
        // Limpar o estado dirty antes de navegar
        return true
      }
      return false
    }
    return true
  }

  return { navigateWithConfirmation, ConfirmationDialog }
}