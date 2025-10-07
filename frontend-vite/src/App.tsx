import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import WhatsApp from './pages/WhatsApp';
import AdminLayout from './components/layouts/AdminLayout';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';

function App() {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    console.log('🛡️ ProtectedRoute - isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
      console.log('❌ Não autenticado, redirecionando para /login');
      return <Navigate to="/login" replace />;
    }
    console.log('✅ Autenticado, renderizando conteúdo protegido');
    return <AdminLayout>{children}</AdminLayout>;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin routes with layout */}
        <Route path="/admin/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
