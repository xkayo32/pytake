import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from '@lib/auth/AuthContext'
import ProtectedRoute from '@lib/auth/ProtectedRoute'
import Layout from '@components/layout/Layout'

// Páginas públicas - carregadas normalmente
import Login from '@pages/Login'
import Register from '@pages/Register'
import Home from '@pages/Home'
import Logout from '@pages/logout'

// Páginas protegidas - lazy loading para melhor performance
const Dashboard = lazy(() => import('@pages/dashboard'))
const Conversations = lazy(() => import('@pages/conversations'))
const Templates = lazy(() => import('@pages/templates'))
const Campaigns = lazy(() => import('@pages/campaigns'))
const Broadcast = lazy(() => import('@pages/broadcast'))
const Reports = lazy(() => import('@pages/reports'))
const Users = lazy(() => import('@pages/users'))
const Settings = lazy(() => import('@pages/settings'))
const Integrations = lazy(() => import('@pages/integrations'))
const APIValidation = lazy(() => import('@pages/api-validation'))
const Profile = lazy(() => import('@pages/Profile'))
const Flows = lazy(() => import('@pages/Flows'))
const FlowEdit = lazy(() => import('@pages/flows/FlowEdit'))
const Contacts = lazy(() => import('@pages/Contacts'))
const Automations = lazy(() => import('@pages/Automations'))
const Analytics = lazy(() => import('@pages/Analytics'))

// Componente de carregamento
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
        </div>
        <p className="text-slate-600 dark:text-slate-400">Carregando...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/logout" element={<Logout />} />

          {/* Rotas protegidas */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />

            {/* Conversations */}
            <Route path="/conversations" element={<Suspense fallback={<PageLoader />}><Conversations /></Suspense>} />

            {/* Templates */}
            <Route path="/templates" element={<Suspense fallback={<PageLoader />}><Templates /></Suspense>} />
            <Route path="/templates/create" element={<Suspense fallback={<PageLoader />}><Templates /></Suspense>} />
            <Route path="/templates/:id" element={<Suspense fallback={<PageLoader />}><Templates /></Suspense>} />

            {/* Campaigns */}
            <Route path="/campaigns" element={<Suspense fallback={<PageLoader />}><Campaigns /></Suspense>} />
            <Route path="/campaigns/create" element={<Suspense fallback={<PageLoader />}><Campaigns /></Suspense>} />
            <Route path="/campaigns/:id" element={<Suspense fallback={<PageLoader />}><Campaigns /></Suspense>} />

            {/* Broadcast */}
            <Route path="/broadcast" element={<Suspense fallback={<PageLoader />}><Broadcast /></Suspense>} />

            {/* Reports */}
            <Route path="/reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />

            {/* Users */}
            <Route path="/users" element={<Suspense fallback={<PageLoader />}><Users /></Suspense>} />

            {/* Settings */}
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />

            {/* Integrations */}
            <Route path="/integrations" element={<Suspense fallback={<PageLoader />}><Integrations /></Suspense>} />

            {/* API Validation */}
            <Route path="/api-validation" element={<Suspense fallback={<PageLoader />}><APIValidation /></Suspense>} />

            {/* Legacy routes - keep for compatibility */}
            <Route path="/flows" element={<Suspense fallback={<PageLoader />}><Flows /></Suspense>} />
            <Route path="/flows/:id/edit" element={<Suspense fallback={<PageLoader />}><FlowEdit /></Suspense>} />
            <Route path="/contacts" element={<Suspense fallback={<PageLoader />}><Contacts /></Suspense>} />
            <Route path="/automations" element={<Suspense fallback={<PageLoader />}><Automations /></Suspense>} />
            <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
            <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
          </Route>

          {/* Rota 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
