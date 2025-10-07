import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import WhatsApp from './pages/WhatsApp';
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin/whatsapp"
          element={isAuthenticated ? <WhatsApp /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/admin/whatsapp" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
