import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/slices/authSlice'
import { useEffect } from 'react'

// Pages
import LoginPage from '@/pages/auth/LoginPage'
import LandingPage from '@/pages/LandingPage'
import DocsPage from '@/pages/DocsPage'
import ApiPage from '@/pages/ApiPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ConversationsPage from '@/pages/conversations/ConversationsPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import WhatsAppShowcasePage from '@/pages/showcase/WhatsAppShowcasePage'

// Layout
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// Test components
import { ApiTest } from '@/components/ApiTest'
import { AuthTest } from '@/components/AuthTest'
import { WebSocketTest } from '@/components/WebSocketTest'
import WhatsAppTest from '@/components/WhatsAppTest'
import WebhookTest from '@/components/WebhookTest'

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

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background transition-colors duration-300">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/api" element={<ApiPage />} />
            <Route 
              path="/login" 
              element={
                isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <LoginPage />
              } 
            />
            <Route path="/test" element={<ApiTest />} />
            <Route path="/auth-test" element={<AuthTest />} />
            <Route path="/ws-test" element={<WebSocketTest />} />
            <Route path="/whatsapp-test" element={<WhatsAppTest />} />
            <Route path="/webhook-test" element={<WebhookTest />} />
            <Route path="/whatsapp-showcase" element={<WhatsAppShowcasePage />} />
            
            {/* Protected routes */}
            <Route path="/app" element={<ProtectedRoute />}>
              <Route path="/app" element={<Layout />}>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="conversations" element={<ConversationsPage />} />
                <Route path="conversations/:id" element={<ConversationsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
