import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UseUnsavedChangesWarningProps {
  hasUnsavedChanges: boolean
  message?: string
}

export function useUnsavedChangesWarning({
  hasUnsavedChanges,
  message = 'Você tem alterações não salvas. Deseja sair sem salvar?'
}: UseUnsavedChangesWarningProps) {
  const router = useRouter()

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

  // Função para navegar com confirmação
  const navigateWithConfirmation = (url: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(message)
      if (confirmed) {
        // Limpar o estado dirty antes de navegar
        return true
      }
      return false
    }
    return true
  }

  return { navigateWithConfirmation }
}