// Mock API Server for PyTake Development
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Add custom middleware
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Custom routes
server.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@pytake.com' && password === 'admin123') {
    res.json({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.mock-jwt-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@pytake.com',
        name: 'Admin User',
        role: 'admin',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001'
      }
    });
  } else {
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  }
});

server.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      whatsapp: 'ready'
    }
  });
});

server.get('/api/v1/status', (req, res) => {
  res.json({
    api_version: 'v1',
    environment: 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// WebSocket endpoint placeholder
server.get('/ws', (req, res) => {
  res.json({
    message: 'WebSocket endpoint - use ws:// protocol'
  });
});

// Use default router for other endpoints
server.use(router);

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock API Server is running on http://0.0.0.0:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/v1/auth/login');
  console.log('  GET  /health');
  console.log('  GET  /api/v1/status');
  console.log('  Plus all REST endpoints for resources in db.json');
});