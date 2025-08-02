import React, { useState } from 'react';
import { Button } from './ui/button';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function AuthTest() {
  const [token, setToken] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<Record<string, string>>({});

  // Demo credentials
  const demoEmail = 'admin@pytake.com';
  const demoPassword = 'admin123';

  const makeAuthRequest = async (endpoint: string, method: string, body?: any, useAuth = false) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (useAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`http://localhost:8080/api/v1/auth${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return response.json();
  };

  const testLogin = async () => {
    const key = 'login';
    setLoading(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: '' }));
    setSuccess(prev => ({ ...prev, [key]: '' }));

    try {
      const response: AuthResponse = await makeAuthRequest('/login', 'POST', {
        email: demoEmail,
        password: demoPassword,
      });

      setToken(response.access_token);
      setUser(response.user);
      setSuccess(prev => ({ 
        ...prev, 
        [key]: `Login successful! Token received (${response.token_type})` 
      }));
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        [key]: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const testRegister = async () => {
    const key = 'register';
    setLoading(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: '' }));
    setSuccess(prev => ({ ...prev, [key]: '' }));

    try {
      const response: AuthResponse = await makeAuthRequest('/register', 'POST', {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      setSuccess(prev => ({ 
        ...prev, 
        [key]: `Registration successful! User: ${response.user.name}` 
      }));
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        [key]: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const testMe = async () => {
    const key = 'me';
    setLoading(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: '' }));
    setSuccess(prev => ({ ...prev, [key]: '' }));

    try {
      const response: User = await makeAuthRequest('/me', 'GET', null, true);
      setUser(response);
      setSuccess(prev => ({ 
        ...prev, 
        [key]: `User info retrieved successfully!` 
      }));
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        [key]: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const testLogout = async () => {
    const key = 'logout';
    setLoading(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: '' }));
    setSuccess(prev => ({ ...prev, [key]: '' }));

    try {
      await makeAuthRequest('/logout', 'POST', { access_token: token });
      setToken('');
      setUser(null);
      setSuccess(prev => ({ 
        ...prev, 
        [key]: `Logout successful!` 
      }));
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        [key]: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setSuccess(prev => ({ ...prev, copy: 'Token copied to clipboard!' }));
    setTimeout(() => {
      setSuccess(prev => ({ ...prev, copy: '' }));
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔐 Authentication API Test
        </h1>
        <p className="text-gray-600">
          Testing JWT authentication endpoints
        </p>
      </div>

      {/* Demo Credentials */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Demo Credentials</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <div><span className="font-medium">Email:</span> {demoEmail}</div>
          <div><span className="font-medium">Password:</span> {demoPassword}</div>
        </div>
      </div>

      {/* Current Token & User */}
      {(token || user) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">🎯 Current Session</h3>
          {user && (
            <div className="text-sm text-green-800 space-y-1 mb-3">
              <div><span className="font-medium">User:</span> {user.name} ({user.email})</div>
              <div><span className="font-medium">Role:</span> {user.role}</div>
              <div><span className="font-medium">ID:</span> {user.id}</div>
            </div>
          )}
          {token && (
            <div className="space-y-2">
              <div className="text-sm text-green-800">
                <span className="font-medium">Access Token:</span>
              </div>
              <div className="bg-white border rounded p-2 text-xs font-mono break-all">
                {token.substring(0, 50)}...
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyToken}>
                  📋 Copy Token
                </Button>
                {success.copy && (
                  <span className="text-green-600 text-sm self-center">
                    {success.copy}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auth Tests */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Login Test */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🔑 Login Test</h3>
          <div className="space-y-3">
            <Button
              onClick={testLogin}
              disabled={loading.login}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading.login ? '⏳ Logging in...' : '🔓 Test Login'}
            </Button>
            
            {errors.login && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                ❌ {errors.login}
              </div>
            )}
            
            {success.login && (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                ✅ {success.login}
              </div>
            )}
          </div>
        </div>

        {/* Register Test */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📝 Register Test</h3>
          <div className="space-y-3">
            <Button
              onClick={testRegister}
              disabled={loading.register}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading.register ? '⏳ Registering...' : '👤 Test Register'}
            </Button>
            
            {errors.register && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                ❌ {errors.register}
              </div>
            )}
            
            {success.register && (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                ✅ {success.register}
              </div>
            )}
          </div>
        </div>

        {/* Me Test */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">👤 Get User Info</h3>
          <div className="space-y-3">
            <Button
              onClick={testMe}
              disabled={loading.me || !token}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading.me ? '⏳ Getting info...' : '📋 Test /me'}
            </Button>
            
            {!token && (
              <div className="text-yellow-600 text-sm bg-yellow-50 p-2 rounded">
                ⚠️ Login first to get a token
              </div>
            )}
            
            {errors.me && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                ❌ {errors.me}
              </div>
            )}
            
            {success.me && (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                ✅ {success.me}
              </div>
            )}
          </div>
        </div>

        {/* Logout Test */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🚪 Logout Test</h3>
          <div className="space-y-3">
            <Button
              onClick={testLogout}
              disabled={loading.logout || !token}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {loading.logout ? '⏳ Logging out...' : '🔐 Test Logout'}
            </Button>
            
            {!token && (
              <div className="text-yellow-600 text-sm bg-yellow-50 p-2 rounded">
                ⚠️ Login first to get a token
              </div>
            )}
            
            {errors.logout && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                ❌ {errors.logout}
              </div>
            )}
            
            {success.logout && (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                ✅ {success.logout}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Sequence */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Recommended Test Sequence</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
            <span>Test <strong>Login</strong> with demo credentials to get access token</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
            <span>Test <strong>Get User Info</strong> to verify token works</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">3</span>
            <span>Test <strong>Register</strong> with new user (optional)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">4</span>
            <span>Test <strong>Logout</strong> to clear session</span>
          </div>
        </div>
      </div>
    </div>
  );
}