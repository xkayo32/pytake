// Mock API Server for PyTake Development
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Add custom middleware
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Mock users database
const users = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'admin@pytake.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    is_active: true,
    permissions: ['all']
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174002',
    email: 'demo@pytake.net',
    password: 'Demo@123456',
    name: 'Demo User',
    role: 'user',
    tenant_id: '223e4567-e89b-12d3-a456-426614174003',
    is_active: true,
    permissions: ['read', 'write']
  },
  {
    id: '323e4567-e89b-12d3-a456-426614174004',
    email: 'test@pytake.com',
    password: 'Test@123',
    name: 'Test User',
    role: 'operator',
    tenant_id: '323e4567-e89b-12d3-a456-426614174005',
    is_active: true,
    permissions: ['read', 'write', 'manage_conversations']
  }
];

// Custom routes
server.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Find user by email and password
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({ id: user.id, email: user.email })).toString('base64') + '.mock-signature',
      refresh_token: 'refresh-' + Buffer.from(user.id).toString('base64'),
      user: {
        ...userWithoutPassword,
        created_at: new Date().toISOString()
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

server.post('/api/v1/auth/register', (req, res) => {
  const { email, password, name, tenant_name } = req.body;
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  
  if (existingUser) {
    res.status(409).json({
      error: {
        code: 'USER_EXISTS',
        message: 'Email already registered'
      }
    });
  } else {
    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      name,
      role: 'user',
      tenant_id: Date.now().toString() + '-tenant',
      is_active: true,
      permissions: ['read', 'write']
    };
    
    users.push(newUser);
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.json({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({ id: newUser.id, email: newUser.email })).toString('base64') + '.mock-signature',
      refresh_token: 'refresh-' + Buffer.from(newUser.id).toString('base64'),
      user: {
        ...userWithoutPassword,
        created_at: new Date().toISOString()
      }
    });
  }
});

server.get('/api/v1/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided'
      }
    });
    return;
  }
  
  // For mock, just return the first user
  const { password, ...userWithoutPassword } = users[0];
  res.json({
    ...userWithoutPassword,
    created_at: new Date().toISOString()
  });
});

server.post('/api/v1/auth/logout', (req, res) => {
  res.json({
    message: 'Logged out successfully'
  });
});

server.post('/api/v1/auth/refresh', (req, res) => {
  const { refresh_token } = req.body;
  
  if (refresh_token && refresh_token.startsWith('refresh-')) {
    res.json({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({ refreshed: true })).toString('base64') + '.new-mock-signature',
      refresh_token: 'refresh-' + Date.now()
    });
  } else {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid refresh token'
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