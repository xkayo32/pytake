import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/slices/authSlice'

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}