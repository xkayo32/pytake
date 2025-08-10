import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

// Lazy load pages for better performance
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Auth pages
const AuthPage = lazy(() => import('./pages/AuthPage'));
const LoginForm = lazy(() => import('./components/auth/LoginForm'));
const RegisterForm = lazy(() => import('./components/auth/RegisterForm'));

// Main pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AgentWorkspace = lazy(() => import('./pages/AgentWorkspace'));
const CampaignManager = lazy(() => import('./pages/CampaignManager'));
const FlowBuilder = lazy(() => import('./pages/FlowBuilder'));
const ContactManager = lazy(() => import('./pages/ContactManager'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Settings sub-pages
const GeneralSettings = lazy(() => import('./components/settings/GeneralSettings'));
const WhatsAppSettings = lazy(() => import('./components/settings/WhatsAppSettings'));
const UserManagement = lazy(() => import('./components/settings/UserManagement'));
const IntegrationSettings = lazy(() => import('./components/settings/IntegrationSettings'));
const SecuritySettings = lazy(() => import('./components/settings/SecuritySettings'));
const NotificationSettings = lazy(() => import('./components/settings/NotificationSettings'));
const BillingSettings = lazy(() => import('./components/settings/BillingSettings'));
const AuditLogs = lazy(() => import('./components/settings/AuditLogs'));

// Campaign sub-pages
const CampaignList = lazy(() => import('./components/campaigns/CampaignList'));
const CampaignEditor = lazy(() => import('./components/campaigns/CampaignEditor'));
const TemplateManager = lazy(() => import('./components/campaigns/TemplateManager'));
const CampaignAnalytics = lazy(() => import('./components/campaigns/CampaignAnalytics'));

// Flow sub-pages
const FlowList = lazy(() => import('./components/flows/FlowList'));
const FlowEditor = lazy(() => import('./components/flows/FlowEditor'));

// Loading wrapper component
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  }>
    {children}
  </Suspense>
);

// Root layout with auth check
const RootLayout = () => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <Layout><Outlet /></Layout>;
};

// Auth layout
const AuthLayout = () => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  
  // Auth routes
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/auth/login" replace />,
      },
      {
        path: 'login',
        element: (
          <SuspenseWrapper>
            <AuthPage>
              <LoginForm />
            </AuthPage>
          </SuspenseWrapper>
        ),
      },
      {
        path: 'register',
        element: (
          <SuspenseWrapper>
            <AuthPage>
              <RegisterForm />
            </AuthPage>
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Main application routes
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Dashboard
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <Dashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Agent Workspace
      {
        path: 'agent',
        element: (
          <ProtectedRoute requiredPermissions={[{ resource: 'conversations', action: 'read' }]}>
            <SuspenseWrapper>
              <AgentWorkspace />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
        children: [
          {
            path: ':conversationId',
            element: <Outlet />,
          },
        ],
      },

      // Campaigns
      {
        path: 'campaigns',
        element: (
          <ProtectedRoute requiredPermissions={[{ resource: 'campaigns', action: 'read' }]}>
            <SuspenseWrapper>
              <CampaignManager />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: (
              <SuspenseWrapper>
                <CampaignList />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'new',
            element: (
              <ProtectedRoute requiredPermissions={[{ resource: 'campaigns', action: 'create' }]}>
                <SuspenseWrapper>
                  <CampaignEditor />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <ProtectedRoute requiredPermissions={[{ resource: 'campaigns', action: 'update' }]}>
                <SuspenseWrapper>
                  <CampaignEditor />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/analytics',
            element: (
              <SuspenseWrapper>
                <CampaignAnalytics />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'templates',
            element: (
              <ProtectedRoute requiredPermissions={[{ resource: 'templates', action: 'read' }]}>
                <SuspenseWrapper>
                  <TemplateManager />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Flows
      {
        path: 'flows',
        element: (
          <ProtectedRoute requiredPermissions={[{ resource: 'flows', action: 'read' }]}>
            <SuspenseWrapper>
              <FlowBuilder />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: (
              <SuspenseWrapper>
                <FlowList />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'new',
            element: (
              <ProtectedRoute requiredPermissions={[{ resource: 'flows', action: 'create' }]}>
                <SuspenseWrapper>
                  <FlowEditor />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <ProtectedRoute requiredPermissions={[{ resource: 'flows', action: 'update' }]}>
                <SuspenseWrapper>
                  <FlowEditor />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
        ],
      },

      // Contacts
      {
        path: 'contacts',
        element: (
          <ProtectedRoute requiredPermissions={[{ resource: 'contacts', action: 'read' }]}>
            <SuspenseWrapper>
              <ContactManager />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Analytics
      {
        path: 'analytics',
        element: (
          <ProtectedRoute requiredPermissions={[{ resource: 'analytics', action: 'read' }]}>
            <SuspenseWrapper>
              <AnalyticsPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // Settings
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <SettingsPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/settings/general" replace />,
          },
          {
            path: 'general',
            element: (
              <SuspenseWrapper>
                <GeneralSettings />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'whatsapp',
            element: (
              <ProtectedRoute requiredPermissions={[{ resource: 'whatsapp', action: 'read' }]}>
                <SuspenseWrapper>
                  <WhatsAppSettings />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
          {
            path: 'users',
            element: (
              <ProtectedRoute requiredRoles={['Owner', 'Admin']}>
                <SuspenseWrapper>
                  <UserManagement />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
          {
            path: 'integrations',
            element: (
              <ProtectedRoute requiredPermissions={[{ resource: 'integrations', action: 'read' }]}>
                <SuspenseWrapper>
                  <IntegrationSettings />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
          {
            path: 'security',
            element: (
              <ProtectedRoute requiredRoles={['Owner', 'Admin']}>
                <SuspenseWrapper>
                  <SecuritySettings />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
          {
            path: 'notifications',
            element: (
              <SuspenseWrapper>
                <NotificationSettings />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'billing',
            element: (
              <ProtectedRoute requiredRoles={['Owner', 'Admin']}>
                <SuspenseWrapper>
                  <BillingSettings />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
          {
            path: 'audit',
            element: (
              <ProtectedRoute requiredRoles={['Owner', 'Admin']}>
                <SuspenseWrapper>
                  <AuditLogs />
                </SuspenseWrapper>
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },

  // Catch-all route
  {
    path: '*',
    element: (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-400 dark:text-gray-600">404</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mt-4">Página não encontrada</p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    ),
  },
]);