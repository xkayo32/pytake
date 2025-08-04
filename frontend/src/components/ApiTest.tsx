import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface ApiResponse {
  status: string;
  message?: string;
  service?: string;
  version?: string;
  timestamp?: string;
  endpoints?: any;
  cors_enabled?: boolean;
}

export function ApiTest() {
  const [health, setHealth] = useState<ApiResponse | null>(null);
  const [status, setStatus] = useState<ApiResponse | null>(null);
  const [root, setRoot] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const testEndpoint = async (endpoint: string, key: string) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: '' }));
    
    try {
      const response = await fetch(`http://localhost:8080${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      
      switch(key) {
        case 'health':
          setHealth(data);
          break;
        case 'status':
          setStatus(data);
          break;
        case 'root':
          setRoot(data);
          break;
      }
    } catch (error) {
      setErrors(prev => ({ 
        ...prev, 
        [key]: error instanceof Error ? error.message : 'Unknown error' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const testAll = () => {
    testEndpoint('/health', 'health');
    testEndpoint('/api/v1/status', 'status');
    testEndpoint('/', 'root');
  };

  useEffect(() => {
    // Auto-test on component mount
    testAll();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔗 PyTake API Connection Test
        </h1>
        <p className="text-gray-600">
          Testing frontend-backend integration
        </p>
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={testAll}
          className="bg-blue-600 hover:bg-blue-700"
        >
          🔄 Test All Endpoints
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Health Check */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Health Check</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testEndpoint('/health', 'health')}
              disabled={loading.health}
            >
              {loading.health ? '⏳' : '🔄'}
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Endpoint:</span> <code>/health</code>
            </div>
            
            {errors.health ? (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                ❌ {errors.health}
              </div>
            ) : health ? (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded space-y-1">
                <div>✅ Status: {health.status}</div>
                <div>🕒 Time: {new Date(health.timestamp || '').toLocaleTimeString()}</div>
                <div>🔧 Service: {health.service}</div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                No data yet...
              </div>
            )}
          </div>
        </div>

        {/* Status Check */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">API Status</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testEndpoint('/api/v1/status', 'status')}
              disabled={loading.status}
            >
              {loading.status ? '⏳' : '🔄'}
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Endpoint:</span> <code>/api/v1/status</code>
            </div>
            
            {errors.status ? (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                ❌ {errors.status}
              </div>
            ) : status ? (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded space-y-1">
                <div>✅ Status: {status.status}</div>
                <div>📦 Version: {status.version}</div>
                <div>🔧 Service: {status.service}</div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                No data yet...
              </div>
            )}
          </div>
        </div>

        {/* Root Endpoint */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">API Info</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testEndpoint('/', 'root')}
              disabled={loading.root}
            >
              {loading.root ? '⏳' : '🔄'}
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Endpoint:</span> <code>/</code>
            </div>
            
            {errors.root ? (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                ❌ {errors.root}
              </div>
            ) : root ? (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded space-y-1">
                <div>✅ Message: {root.message}</div>
                <div>📦 Version: {root.version}</div>
                <div>🌐 CORS: {root.cors_enabled ? 'Enabled' : 'Disabled'}</div>
                {root.endpoints && (
                  <div className="mt-2">
                    <div className="font-medium">Available endpoints:</div>
                    <ul className="text-xs space-y-1 mt-1">
                      {Object.entries(root.endpoints).map(([name, url]) => (
                        <li key={name}>• {name}: <code>{url as string}</code></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">
                No data yet...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">🎯 Integration Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Frontend</div>
            <div className="text-green-600">✅ Running (localhost:3000)</div>
          </div>
          <div>
            <div className="font-medium">Backend</div>
            <div className={health ? "text-green-600" : "text-gray-500"}>
              {health ? "✅ Connected (localhost:8080)" : "⏳ Testing..."}
            </div>
          </div>
          <div>
            <div className="font-medium">CORS</div>
            <div className={root?.cors_enabled ? "text-green-600" : "text-gray-500"}>
              {root?.cors_enabled ? "✅ Enabled" : "⏳ Testing..."}
            </div>
          </div>
          <div>
            <div className="font-medium">API Version</div>
            <div className={status?.version ? "text-green-600" : "text-gray-500"}>
              {status?.version || "⏳ Testing..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}