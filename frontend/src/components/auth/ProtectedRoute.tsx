import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/slices/authSlice'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore()

  // Se ainda está carregando a autenticação, mostra loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}