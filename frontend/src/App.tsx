import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth, useTokenRefresh } from './stores/authStore';
import { ROUTES } from './utils/constants';

// Layout Components
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AgentWorkspace from './pages/AgentWorkspace';
import Settings from './pages/Settings';
import FlowBuilder from './pages/FlowBuilder';
import CampaignManager from './pages/CampaignManager';

// Loading Component
import LoadingSpinner from './components/ui/LoadingSpinner';

// Styles
import './styles/globals.css';

const App: React.FC = () => {
  const { isAuthenticated, isLoading, initializeAuth, error } = useAuth();
  
  // Setup automatic token refresh
  useTokenRefresh();

  // Initialize authentication on app startup
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Show loading screen while initializing auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Initializing PyTake...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10B981',
                color: '#fff',
              },
            },
            error: {
              style: {
                background: '#EF4444',
                color: '#fff',
              },
            },
          }}
        />

        {/* Main Application Routes */}
        <Routes>
          {/* Public Routes */}
          <Route
            path={ROUTES.LOGIN}
            element={
              isAuthenticated ? (
                <Navigate to={ROUTES.DASHBOARD} replace />
              ) : (
                <Login />
              )
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - Default protected route */}
            <Route
              index
              element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />
            
            <Route
              path="dashboard"
              element={
                <ProtectedRoute requiredPermission="view_dashboard">
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Agent Workspace */}
            <Route
              path="agent"
              element={
                <ProtectedRoute requiredPermission="access_agent_workspace">
                  <AgentWorkspace />
                </ProtectedRoute>
              }
            />

            {/* Flow Builder */}
            <Route
              path="flows"
              element={
                <ProtectedRoute requiredRole="supervisor">
                  <FlowBuilder />
                </ProtectedRoute>
              }
            />

            {/* Campaign Manager */}
            <Route
              path="campaigns"
              element={
                <ProtectedRoute requiredRole="supervisor">
                  <CampaignManager />
                </ProtectedRoute>
              }
            />

            {/* Settings */}
            <Route
              path="settings"
              element={<Settings />}
            />

            {/* Catch all other routes under protected area */}
            <Route
              path="*"
              element={<Navigate to={ROUTES.DASHBOARD} replace />}
            />
          </Route>

          {/* Catch all unmatched routes */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <Navigate to={ROUTES.DASHBOARD} replace />
              ) : (
                <Navigate to={ROUTES.LOGIN} replace />
              )
            }
          />
        </Routes>

        {/* Global Error Handler */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
      </div>
    </Router>
  );
};

export default App;