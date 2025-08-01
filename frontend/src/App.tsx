import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/slices/authSlice'
import { useEffect } from 'react'

// Pages
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ConversationsPage from '@/pages/conversations/ConversationsPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import SettingsPage from '@/pages/settings/SettingsPage'

// Layout
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  const { isAuthenticated, getCurrentUser, isLoading } = useAuthStore()

  useEffect(() => {
    // Try to get current user on app start if we have a token
    const token = localStorage.getItem('accessToken')
    if (token && !isAuthenticated) {
      getCurrentUser()
    }
  }, [getCurrentUser, isAuthenticated])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
              } 
            />
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="conversations" element={<ConversationsPage />} />
                <Route path="conversations/:id" element={<ConversationsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
