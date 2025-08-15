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

// Mock WhatsApp Configs database
let whatsappConfigs = [
  {
    id: '1',
    tenant_id: '223e4567-e89b-12d3-a456-426614174003',
    phone_number_id: '',
    access_token: '',
    business_account_id: '',
    app_id: '',
    app_secret: '',
    webhook_verify_token: '',
    webhook_url: 'https://api.pytake.net/api/v1/whatsapp/webhook',
    status: 'disconnected',
    last_test: null,
    created_at: new Date().toISOString()
  }
];

// WhatsApp Configuration Routes
server.get('/api/v1/whatsapp-configs', (req, res) => {
  // TODO: Filter by tenant_id from JWT token
  const config = whatsappConfigs[0];
  res.json(config);
});

server.post('/api/v1/whatsapp-configs', (req, res) => {
  const { phone_number_id, access_token, business_account_id, app_id, app_secret, webhook_verify_token } = req.body;
  
  // Update existing config
  whatsappConfigs[0] = {
    ...whatsappConfigs[0],
    phone_number_id,
    access_token,
    business_account_id,
    app_id,
    app_secret,
    webhook_verify_token,
    status: 'connected',
    updated_at: new Date().toISOString()
  };
  
  res.json({
    message: 'Configuration saved successfully',
    config: whatsappConfigs[0]
  });
});

server.post('/api/v1/whatsapp-configs/:id/test', async (req, res) => {
  const { id } = req.params;
  const config = whatsappConfigs[0];
  
  if (!config.phone_number_id || !config.access_token) {
    return res.status(400).json({
      success: false,
      message: 'Missing configuration',
      error: {
        code: 'MISSING_CONFIG',
        message: 'Phone Number ID and Access Token are required'
      }
    });
  }
  
  try {
    // Test connection to Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,quality_rating&access_token=${config.access_token}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      whatsappConfigs[0].status = 'error';
      whatsappConfigs[0].last_test = new Date().toISOString();
      
      return res.status(400).json({
        success: false,
        message: 'Connection test failed',
        error: {
          code: error.error?.code || 'INVALID_CREDENTIALS',
          message: error.error?.message || 'Invalid Phone Number ID or Access Token'
        }
      });
    }
    
    const phoneData = await response.json();
    
    // Update status
    whatsappConfigs[0].status = 'connected';
    whatsappConfigs[0].last_test = new Date().toISOString();
    
    res.json({
      success: true,
      message: 'Connection test successful',
      data: {
        phone_numbers: [{
          id: phoneData.id,
          display_phone_number: phoneData.display_phone_number,
          verified_name: phoneData.verified_name,
          status: phoneData.code_verification_status || 'VERIFIED',
          quality_rating: phoneData.quality_rating || 'GREEN'
        }],
        business_info: {
          name: phoneData.verified_name,
          verified: true,
          timezone: 'America/Sao_Paulo'
        }
      }
    });
  } catch (error) {
    console.error('Test connection error:', error);
    whatsappConfigs[0].status = 'error';
    whatsappConfigs[0].last_test = new Date().toISOString();
    
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: {
        code: 'CONNECTION_ERROR',
        message: error.message || 'Failed to connect to WhatsApp API'
      }
    });
  }
});

// WhatsApp Send Message - Real Meta API Integration
server.post('/api/v1/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;
  const config = whatsappConfigs[0];
  
  // Validate WhatsApp config exists and is connected
  if (!config.phone_number_id || !config.access_token) {
    return res.status(400).json({
      error: {
        code: 'NOT_CONFIGURED',
        message: 'WhatsApp not configured or not connected'
      }
    });
  }
  
  try {
    // Format phone number (remove any non-digits and ensure it has country code)
    let phoneNumber = to.replace(/\D/g, '');
    if (!phoneNumber.startsWith('55')) {
      phoneNumber = '55' + phoneNumber;
    }
    
    // Send message via Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: message.text?.body || message
          }
        })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Meta API Send Error:', error);
      return res.status(400).json({
        error: {
          code: error.error?.code || 'SEND_FAILED',
          message: error.error?.message || 'Failed to send message'
        }
      });
    }
    
    const result = await response.json();
    res.json(result);
    
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({
      error: {
        code: 'SEND_ERROR',
        message: error.message || 'Failed to send message'
      }
    });
  }
});

// WhatsApp Webhook (for receiving messages)
server.get('/api/v1/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // Check if webhook is being verified
  if (mode === 'subscribe') {
    const expectedToken = whatsappConfigs[0].webhook_verify_token;
    
    if (token === expectedToken) {
      console.log('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed');
      res.status(403).send('Forbidden');
    }
  } else {
    res.status(400).send('Bad Request');
  }
});

server.post('/api/v1/whatsapp/webhook', (req, res) => {
  const body = req.body;
  
  console.log('Webhook received:', JSON.stringify(body, null, 2));
  
  // Process webhook data here
  // This would typically save messages to database, trigger flows, etc.
  
  res.status(200).send('EVENT_RECEIVED');
});

// Phone Numbers endpoint - Real Meta API Integration
server.get('/api/v1/whatsapp/phone-numbers', async (req, res) => {
  const config = whatsappConfigs[0];
  
  if (!config.phone_number_id || !config.access_token) {
    return res.json([]);
  }
  
  try {
    // Call Meta Graph API to get phone number details
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput,last_onboarded_time&access_token=${config.access_token}`
    );
    
    if (!response.ok) {
      console.error('Meta API Error:', await response.text());
      return res.json([]);
    }
    
    const phoneData = await response.json();
    
    // Format the response
    res.json([{
      id: phoneData.id || config.phone_number_id,
      display_phone_number: phoneData.display_phone_number || 'Unknown',
      verified_name: phoneData.verified_name || 'Not Verified',
      status: phoneData.code_verification_status || 'PENDING',
      quality_rating: phoneData.quality_rating || 'UNKNOWN',
      platform_type: phoneData.platform_type || 'CLOUD_API',
      throughput: phoneData.throughput || {}
    }]);
  } catch (error) {
    console.error('Error fetching phone numbers from Meta:', error);
    res.json([]);
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