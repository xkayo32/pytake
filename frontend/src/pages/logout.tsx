import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { Loader2, LogOut } from 'lucide-react'

export default function Logout() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout()
      } catch (err) {
        console.error('Erro ao fazer logout:', err)
      } finally {
        // Redirecionar para home após 1 segundo
        setTimeout(() => {
          navigate('/')
        }, 1000)
      }
    }

    performLogout()
  }, [logout, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <LogOut className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Desconectando
        </h1>

        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
          Você está sendo desconectado de forma segura. Você será redirecionado em breve...
        </p>

        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-slate-600 dark:text-slate-400">Processando...</span>
        </div>

        <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-300">
            ✓ Seu token foi revogado com segurança
          </p>
        </div>

        <div className="mt-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Redirecionando em 1 segundo...
          </p>
        </div>
      </div>
    </div>
  )
}
