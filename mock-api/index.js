// Simple Mock API for PyTake Development
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-complete.json');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI setup
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PyTake API Documentation',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true
  }
};

app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerDocument, swaggerOptions));
app.get('/docs/', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Health endpoint
app.get('/health', (req, res) => {
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

// Status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({
    api_version: 'v1',
    environment: 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Auth login
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@pytake.com' && password === 'PyT@k3!Adm1n#2025$Str0ng') {
    res.json({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-jwt-token',
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

// Auth register
app.post('/api/v1/auth/register', (req, res) => {
  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: '123e4567-e89b-12d3-a456-new',
      email: req.body.email,
      name: req.body.name
    }
  });
});

// Auth refresh
app.post('/api/v1/auth/refresh', (req, res) => {
  res.json({
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-jwt-token',
    refresh_token: 'new-refresh-token'
  });
});

// Auth logout
app.post('/api/v1/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Auth me
app.get('/api/v1/auth/me', (req, res) => {
  res.json({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'admin@pytake.com',
    name: 'Admin User',
    role: 'admin',
    tenant_id: '123e4567-e89b-12d3-a456-426614174001',
    is_active: true,
    created_at: new Date().toISOString()
  });
});

// Update profile
app.put('/api/v1/auth/me', (req, res) => {
  res.json({
    message: 'Profile updated successfully',
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: req.body.email || 'admin@pytake.com',
      name: req.body.name || 'Admin User',
      role: 'admin'
    }
  });
});

// WhatsApp configs
app.get('/api/v1/whatsapp-configs', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'Main WhatsApp',
      phone_number: '+5511999999999',
      is_active: true
    }
  ]);
});

// WhatsApp send message
app.post('/api/v1/whatsapp/send', (req, res) => {
  res.json({
    message_id: 'wamid.123456789',
    status: 'sent',
    timestamp: new Date().toISOString()
  });
});

// WhatsApp config by ID
app.get('/api/v1/whatsapp-configs/:id', (req, res) => {
  res.json({
    id: req.params.id,
    name: 'Main WhatsApp',
    phone_number: '+5511999999999',
    is_active: true
  });
});

// Create WhatsApp config
app.post('/api/v1/whatsapp-configs', (req, res) => {
  res.status(201).json({
    id: '123e4567-e89b-12d3-a456-whatsapp',
    name: req.body.name,
    phone_number: req.body.phone_number,
    is_active: true
  });
});

// Update WhatsApp config
app.put('/api/v1/whatsapp-configs/:id', (req, res) => {
  res.json({
    id: req.params.id,
    message: 'Configuration updated successfully'
  });
});

// Delete WhatsApp config
app.delete('/api/v1/whatsapp-configs/:id', (req, res) => {
  res.status(204).send();
});

// Test WhatsApp config
app.post('/api/v1/whatsapp-configs/:id/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Configuração testada com sucesso',
    details: {
      phone_verified: true,
      webhook_reachable: true,
      api_connection: 'active'
    }
  });
});

// Activate WhatsApp config
app.post('/api/v1/whatsapp-configs/:id/activate', (req, res) => {
  res.json({
    message: 'Configuração ativada com sucesso',
    config_id: req.params.id,
    status: 'active'
  });
});

// Deactivate WhatsApp config
app.post('/api/v1/whatsapp-configs/:id/deactivate', (req, res) => {
  res.json({
    message: 'Configuração desativada com sucesso',
    config_id: req.params.id,
    status: 'inactive'
  });
});

// Get QR Code (Evolution API)
app.get('/api/v1/whatsapp-configs/:id/qrcode', (req, res) => {
  res.json({
    qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    status: 'waiting_scan',
    expires_in: 60
  });
});

// Get WhatsApp config status
app.get('/api/v1/whatsapp-configs/:id/status', (req, res) => {
  res.json({
    status: 'connected',
    phone_number: '+5511999999999',
    profile_name: 'Empresa PyTake',
    last_seen: new Date().toISOString(),
    battery: 85,
    is_business: true,
    connection_quality: 'excellent'
  });
});

// Conversations
app.get('/api/v1/conversations', (req, res) => {
  res.json({
    data: [
      {
        id: '123e4567-e89b-12d3-a456-conv1',
        contact_phone: '+5511987654321',
        contact_name: 'João Silva',
        status: 'active',
        assigned_to: null,
        tags: ['lead', 'novo'],
        last_message_at: new Date().toISOString()
      },
      {
        id: '123e4567-e89b-12d3-a456-conv2',
        contact_phone: '+5511876543210',
        contact_name: 'Maria Santos',
        status: 'closed',
        assigned_to: '123e4567-e89b-12d3-a456-426614174000',
        tags: ['cliente'],
        last_message_at: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      pages: 1
    }
  });
});

// Conversation messages
app.get('/api/v1/conversations/:id/messages', (req, res) => {
  res.json([
    {
      id: '123e4567-e89b-12d3-a456-msg1',
      conversation_id: req.params.id,
      direction: 'inbound',
      type: 'text',
      content: 'Olá! Gostaria de saber mais sobre seus produtos.',
      status: 'read',
      created_at: new Date().toISOString()
    },
    {
      id: '123e4567-e89b-12d3-a456-msg2',
      conversation_id: req.params.id,
      direction: 'outbound',
      type: 'text',
      content: 'Olá! Claro, ficarei feliz em ajudar. Que tipo de produto você está procurando?',
      status: 'delivered',
      created_at: new Date(Date.now() + 60000).toISOString()
    }
  ]);
});

// Flows
app.get('/api/v1/flows', (req, res) => {
  res.json([
    {
      id: '123e4567-e89b-12d3-a456-flow1',
      name: 'Boas-vindas',
      description: 'Flow de boas-vindas para novos contatos',
      trigger_type: 'welcome',
      trigger_value: '',
      is_active: true,
      nodes: [],
      edges: []
    }
  ]);
});

// Create flow
app.post('/api/v1/flows', (req, res) => {
  res.status(201).json({
    id: '123e4567-e89b-12d3-a456-flow-new',
    name: req.body.name,
    description: req.body.description,
    trigger_type: req.body.trigger_type,
    is_active: false
  });
});

// Campaigns
app.get('/api/v1/campaigns', (req, res) => {
  res.json([
    {
      id: '123e4567-e89b-12d3-a456-camp1',
      name: 'Black Friday 2025',
      type: 'broadcast',
      status: 'scheduled',
      targeting: { segments: ['leads', 'clientes'] },
      message: { template: 'black_friday_promo' },
      metrics: { sent: 0, delivered: 0, opened: 0 }
    }
  ]);
});

// Create campaign
app.post('/api/v1/campaigns', (req, res) => {
  res.status(201).json({
    id: '123e4567-e89b-12d3-a456-camp-new',
    name: req.body.name,
    type: req.body.type || 'broadcast',
    status: 'draft'
  });
});

// Users
app.get('/api/v1/users', (req, res) => {
  res.json([
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'admin@pytake.com',
      name: 'Admin User',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]);
});

// WhatsApp Webhook verification
app.get('/api/v1/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === 'verify_token') {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// WhatsApp Webhook receiver
app.post('/api/v1/webhooks/whatsapp', (req, res) => {
  console.log('Webhook received:', JSON.stringify(req.body, null, 2));
  res.status(200).send('EVENT_RECEIVED');
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'PyTake Mock API',
    version: '1.0.0',
    status: 'running'
  });
});

// API OpenAPI JSON endpoint
app.get('/api-docs/openapi.json', (req, res) => {
  res.json(swaggerDocument);
});

// OpenAPI JSON
app.get('/api-docs/openapi-manual.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'PyTake Mock API',
      version: '1.0.0'
    },
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service is healthy'
            }
          }
        }
      }
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock API Server running on http://0.0.0.0:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /api/v1/status');
  console.log('  POST /api/v1/auth/login');
  console.log('  POST /api/v1/auth/register');
  console.log('  GET  /api/v1/whatsapp-configs');
  console.log('  GET  /api/v1/conversations');
  console.log('  GET  /docs/');
});