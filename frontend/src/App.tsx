import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@lib/auth/AuthContext'
import ProtectedRoute from '@lib/auth/ProtectedRoute'
import Layout from '@components/layout/Layout'

// Páginas públicas
import Login from '@pages/Login'
import Register from '@pages/Register'
import Home from '@pages/Home'

// Páginas protegidas
import Dashboard from '@pages/Dashboard'
import Flows from '@pages/Flows'
import FlowEdit from '@pages/flows/FlowEdit'
import Templates from '@pages/Templates'
import Contacts from '@pages/Contacts'
import Settings from '@pages/Settings'
import Profile from '@pages/Profile'
import Automations from '@pages/Automations'
import Analytics from '@pages/Analytics'

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/flows" element={<Flows />} />
            <Route path="/flows/:id/edit" element={<FlowEdit />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Rota 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
