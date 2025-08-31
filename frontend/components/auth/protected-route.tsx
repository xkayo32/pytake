'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuthContext } from '@/contexts/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        // Store the attempted URL to redirect after login
        sessionStorage.setItem('redirectAfterLogin', pathname)
        router.push('/login')
      } else if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
        // If user is authenticated and trying to access login/register, redirect to dashboard
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, router, pathname])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // If auth is required and user is not authenticated, show loading while redirect happens
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated and trying to access login/register, show loading while redirect happens
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecionando para dashboard...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Public pages that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register', 
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/pricing',
  '/', // Landing page
]

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  return (
    <ProtectedRoute requireAuth={!isPublicRoute}>
      {children}
    </ProtectedRoute>
  )
}