import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/slices/authSlice'
import { useEffect } from 'react'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ThemeProvider } from '@/contexts/ThemeContext'

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
import { WhatsAppConfigPage } from '@/pages/settings/WhatsAppConfigPage'
import { AgentWorkspace } from '@/pages/agent/AgentWorkspace'
import { RoleManagementPage } from '@/pages/admin/RoleManagementPage'

// Layout
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { RoleBasedRoute } from '@/components/auth/RoleBasedRoute'
import AccessDenied from '@/pages/errors/AccessDenied'
import NotFound from '@/pages/errors/NotFound'

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

  // Show loading screen during initial auth check
  if (isLoading && localStorage.getItem('accessToken')) {
    return (
      <QueryClientProvider client={queryClient}>
        <LoadingScreen />
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
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
                
                {/* Dashboard - All roles */}
                <Route 
                  path="dashboard" 
                  element={
                    <RoleBasedRoute requiredPermissions={['ViewDashboard']}>
                      <DashboardPage />
                    </RoleBasedRoute>
                  } 
                />
                
                {/* Conversations - All roles with ViewConversations */}
                <Route 
                  path="conversations" 
                  element={
                    <RoleBasedRoute requiredPermissions={['ViewConversations']}>
                      <ConversationsPage />
                    </RoleBasedRoute>
                  } 
                />
                <Route 
                  path="conversations/:id" 
                  element={
                    <RoleBasedRoute requiredPermissions={['ViewConversations', 'ViewMessages']}>
                      <ConversationsPage />
                    </RoleBasedRoute>
                  } 
                />
                
                {/* Analytics - Supervisor and Admin */}
                <Route 
                  path="analytics" 
                  element={
                    <RoleBasedRoute 
                      requiredPermissions={['ViewReports']}
                      fallbackComponent={AccessDenied}
                    >
                      <AnalyticsPage />
                    </RoleBasedRoute>
                  } 
                />
                
                {/* Settings - All authenticated users */}
                <Route path="settings" element={<SettingsPage />} />
                
                {/* WhatsApp Config - Admin and Supervisor only */}
                <Route 
                  path="settings/whatsapp" 
                  element={
                    <RoleBasedRoute requiredRoles={['Admin', 'Supervisor']}>
                      <WhatsAppConfigPage />
                    </RoleBasedRoute>
                  } 
                />
                
                {/* Agent Workspace - Agent role */}
                <Route 
                  path="agent" 
                  element={
                    <RoleBasedRoute requiredRoles={['Agent', 'Supervisor', 'Admin']}>
                      <AgentWorkspace />
                    </RoleBasedRoute>
                  } 
                />

                {/* Admin routes - Admin only */}
                <Route 
                  path="admin/roles" 
                  element={
                    <RoleBasedRoute requiredRoles={['Admin']}>
                      <RoleManagementPage />
                    </RoleBasedRoute>
                  } 
                />
                <Route 
                  path="admin/*" 
                  element={
                    <RoleBasedRoute requiredRoles={['Admin']}>
                      <div>Admin Panel - To be implemented</div>
                    </RoleBasedRoute>
                  } 
                />
              </Route>
            </Route>
            
            {/* Error pages */}
            <Route path="/403" element={<AccessDenied />} />
            <Route path="/404" element={<NotFound />} />
            
            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
