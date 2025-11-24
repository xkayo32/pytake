import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from '@lib/auth/AuthContext'
import ProtectedRoute from '@lib/auth/ProtectedRoute'
import Layout from '@components/layout/Layout'

// Páginas públicas - carregadas normalmente
import Login from '@pages/Login'
import Register from '@pages/Register'
import Home from '@pages/Home'

// Páginas protegidas - lazy loading para melhor performance
const Dashboard = lazy(() => import('@pages/Dashboard'))
const Flows = lazy(() => import('@pages/Flows'))
const FlowEdit = lazy(() => import('@pages/flows/FlowEdit'))
const Templates = lazy(() => import('@pages/Templates'))
const Contacts = lazy(() => import('@pages/Contacts'))
const Settings = lazy(() => import('@pages/Settings'))
const Profile = lazy(() => import('@pages/Profile'))
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

          {/* Rotas protegidas */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="/flows" element={<Suspense fallback={<PageLoader />}><Flows /></Suspense>} />
            <Route path="/flows/:id/edit" element={<Suspense fallback={<PageLoader />}><FlowEdit /></Suspense>} />
            <Route path="/templates" element={<Suspense fallback={<PageLoader />}><Templates /></Suspense>} />
            <Route path="/contacts" element={<Suspense fallback={<PageLoader />}><Contacts /></Suspense>} />
            <Route path="/automations" element={<Suspense fallback={<PageLoader />}><Automations /></Suspense>} />
            <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
          </Route>

          {/* Rota 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
