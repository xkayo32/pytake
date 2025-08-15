// Mock API Server for PyTake Development
const jsonServer = require('json-server');
const { db, pool } = require('./db');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Add custom middleware
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Add CORS middleware for frontend
server.use((req, res, next) => {
  // Allow specific origins with credentials
  const allowedOrigins = [
    'https://app.pytake.net',
    'http://localhost:3002',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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

server.get('/api/v1/auth/me', (req, res) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided'
      }
    });
  }
  
  // For mock, just return the first user
  const { password, ...userWithoutPassword } = users[0];
  res.json({
    ...userWithoutPassword,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
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

// Default tenant ID for development
const DEFAULT_TENANT_ID = '223e4567-e89b-12d3-a456-426614174003';

// WhatsApp Configuration Routes - Real Database
server.get('/api/v1/whatsapp-configs', async (req, res) => {
  try {
    // TODO: Get tenant_id from JWT token
    const tenantId = DEFAULT_TENANT_ID;
    
    const configs = await db.getAllWhatsAppConfigs(tenantId);
    
    if (configs.length === 0) {
      return res.json([]);
    }
    
    const formattedConfigs = configs.map(config => ({
      id: config.id,
      tenant_id: config.tenant_id,
      name: config.name,
      phone_number_id: config.phone_number_id || '',
      access_token: config.access_token || '',
      business_account_id: config.business_account_id || '',
      app_id: '',
      app_secret: '',
      webhook_verify_token: config.webhook_verify_token || '',
      webhook_url: 'https://api.pytake.net/api/v1/whatsapp/webhook',
      status: config.phone_number_id ? 'connected' : 'disconnected',
      is_default: config.is_default || false,
      last_test: config.updated_at,
      created_at: config.created_at,
      updated_at: config.updated_at
    }));
    
    res.json(formattedConfigs);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single WhatsApp config (default or by ID)
server.get('/api/v1/whatsapp-configs/:id', async (req, res) => {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const configId = req.params.id === 'default' ? null : req.params.id;
    
    const config = await db.getWhatsAppConfig(tenantId, configId);
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json({
      id: config.id,
      tenant_id: config.tenant_id,
      name: config.name,
      phone_number_id: config.phone_number_id || '',
      access_token: config.access_token || '',
      business_account_id: config.business_account_id || '',
      app_id: '',
      app_secret: '',
      webhook_verify_token: config.webhook_verify_token || '',
      webhook_url: 'https://api.pytake.net/api/v1/whatsapp/webhook',
      status: config.phone_number_id ? 'connected' : 'disconnected',
      is_default: config.is_default || false,
      last_test: config.updated_at,
      created_at: config.created_at,
      updated_at: config.updated_at
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

server.post('/api/v1/whatsapp-configs', async (req, res) => {
  try {
    const { id, name, phone_number_id, access_token, business_account_id, app_id, app_secret, webhook_verify_token, is_default } = req.body;
    
    // TODO: Get tenant_id from JWT token
    const tenantId = DEFAULT_TENANT_ID;
    
    const config = await db.saveWhatsAppConfig({
      id,
      tenant_id: tenantId,
      name: name || 'WhatsApp Business',
      phone_number_id,
      access_token,
      business_account_id,
      webhook_verify_token,
      is_default: is_default || false
    });
    
    res.json({
      message: 'Configuration saved successfully',
      config: {
        id: config.id,
        tenant_id: config.tenant_id,
        name: config.name,
        phone_number_id: config.phone_number_id,
        access_token: config.access_token,
        business_account_id: config.business_account_id,
        webhook_verify_token: config.webhook_verify_token,
        webhook_url: 'https://api.pytake.net/api/v1/whatsapp/webhook',
        status: 'connected',
        is_default: config.is_default,
        created_at: config.created_at,
        updated_at: config.updated_at
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Set config as default
server.put('/api/v1/whatsapp-configs/:id/default', async (req, res) => {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const configId = req.params.id;
    
    const config = await db.setDefaultConfig(tenantId, configId);
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json({
      message: 'Default configuration updated',
      config: {
        id: config.id,
        tenant_id: config.tenant_id,
        name: config.name,
        is_default: config.is_default,
        updated_at: config.updated_at
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update default configuration' });
  }
});

// Delete WhatsApp config
server.delete('/api/v1/whatsapp-configs/:id', async (req, res) => {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const configId = req.params.id;
    
    const deletedConfig = await db.deleteWhatsAppConfig(tenantId, configId);
    
    if (!deletedConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json({
      message: 'Configuration deleted successfully',
      deleted_config: {
        id: deletedConfig.id,
        name: deletedConfig.name
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

server.post('/api/v1/whatsapp-configs/:id/test', async (req, res) => {
  try {
    // TODO: Get tenant_id from JWT token
    const tenantId = DEFAULT_TENANT_ID;
    
    const config = await db.getWhatsAppConfig(tenantId);
    
    if (!config || !config.phone_number_id || !config.access_token) {
      return res.status(400).json({
        success: false,
        message: 'Missing configuration',
        error: {
          code: 'MISSING_CONFIG',
          message: 'Phone Number ID and Access Token are required'
        }
      });
    }
    
    // Test connection to Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${config.phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,quality_rating&access_token=${config.access_token}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      
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

// WhatsApp Template Management - Get all templates
server.get('/api/v1/whatsapp/templates/manage', async (req, res) => {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const templates = await db.getAllTemplates(tenantId);
    
    // Format templates for management interface
    const formattedTemplates = templates.map(template => ({
      ...template,
      buttons: typeof template.buttons === 'string' ? JSON.parse(template.buttons) : template.buttons,
      variables: typeof template.variables === 'string' ? JSON.parse(template.variables) : template.variables,
      components: typeof template.components === 'string' ? JSON.parse(template.components) : template.components
    }));
    
    res.json(formattedTemplates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save/Create template
server.post('/api/v1/whatsapp/templates/manage', async (req, res) => {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const template = {
      ...req.body,
      tenant_id: tenantId
    };
    
    const savedTemplate = await db.saveTemplate(template);
    
    res.json({
      message: 'Template saved successfully',
      template: {
        ...savedTemplate,
        buttons: typeof savedTemplate.buttons === 'string' ? JSON.parse(savedTemplate.buttons) : savedTemplate.buttons,
        variables: typeof savedTemplate.variables === 'string' ? JSON.parse(savedTemplate.variables) : savedTemplate.variables,
        components: typeof savedTemplate.components === 'string' ? JSON.parse(savedTemplate.components) : savedTemplate.components
      }
    });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Send message using template
server.post('/api/v1/whatsapp/send-template', async (req, res) => {
  try {
    const { template_id, to_phone, variables } = req.body
    const tenantId = DEFAULT_TENANT_ID
    
    // Get template from database
    const template = await db.getTemplateById(template_id, tenantId)
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' })
    }
    
    if (template.status !== 'APPROVED') {
      return res.status(400).json({ 
        error: 'Only approved templates can be used to send messages',
        current_status: template.status 
      })
    }
    
    // Build message text with variables
    let messageText = template.body_text
    if (template.header_text) {
      messageText = template.header_text + '\n\n' + messageText
    }
    if (template.footer_text) {
      messageText = messageText + '\n\n' + template.footer_text
    }
    
    // Replace variables
    Object.entries(variables || {}).forEach(([num, value]) => {
      messageText = messageText.replace(new RegExp(`\\{\\{${num}\\}\\}`, 'g'), value)
    })
    
    // In production, this would call WhatsApp API
    // For now, simulate the send
    console.log('Sending WhatsApp message:', {
      to: to_phone,
      template: template.name,
      message: messageText
    })
    
    // Record the send in database
    const sendRecord = await db.recordTemplateSend({
      template_id,
      tenant_id: tenantId,
      to_phone,
      contact_name: variables['1'] || 'Unknown',
      template_data: variables,
      status: 'SENT',
      message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })
    
    // Simulate WhatsApp webhook for delivery (after 2 seconds)
    setTimeout(async () => {
      if (sendRecord) {
        await db.updateTemplateSendStatus(sendRecord.id, 'DELIVERED')
        console.log(`Message ${sendRecord.message_id} delivered to ${to_phone}`)
      }
    }, 2000)
    
    // Simulate WhatsApp webhook for read (after 5 seconds)
    setTimeout(async () => {
      if (sendRecord) {
        await db.updateTemplateSendStatus(sendRecord.id, 'READ')
        console.log(`Message ${sendRecord.message_id} read by ${to_phone}`)
      }
    }, 5000)
    
    res.json({ 
      success: true,
      message_id: sendRecord?.message_id,
      status: 'SENT',
      message: 'Template message sent successfully',
      preview: messageText,
      delivery_time: '2-5 seconds (demo mode)'
    })
    
  } catch (error) {
    console.error('Error sending template message:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Submit template for Meta approval
server.post('/api/v1/whatsapp/templates/submit/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tenantId = DEFAULT_TENANT_ID
    
    // Get template from database
    const template = await db.getTemplateById(id, tenantId)
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' })
    }
    
    if (template.status !== 'DRAFT') {
      return res.status(400).json({ 
        error: 'Only draft templates can be submitted for approval',
        current_status: template.status 
      })
    }
    
    // Validate template has required fields
    if (!template.body_text || !template.name) {
      return res.status(400).json({ 
        error: 'Template must have name and body text' 
      })
    }
    
    // In production, this would call Meta API
    // For now, simulate the submission
    console.log('Submitting template to Meta:', {
      name: template.name,
      category: template.category,
      language: template.language,
      components: []
    })
    
    // Update template status to PENDING
    await db.updateTemplateStatus(id, tenantId, 'PENDING')
    
    // In production, Meta would send webhook when approved/rejected
    // For demo, auto-approve after 5 seconds
    setTimeout(async () => {
      await db.updateTemplateStatus(id, tenantId, 'APPROVED')
      console.log(`Template ${template.name} auto-approved (demo mode)`)
    }, 5000)
    
    res.json({ 
      message: 'Template submitted for Meta approval',
      status: 'PENDING',
      template_id: id,
      estimated_review_time: '1-24 hours',
      demo_note: 'In demo mode, template will be auto-approved in 5 seconds'
    })
    
  } catch (error) {
    console.error('Error submitting template:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete template
server.delete('/api/v1/whatsapp/templates/manage/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const tenantId = DEFAULT_TENANT_ID;
    
    const deletedTemplate = await db.deleteTemplate(tenantId, templateId);
    
    if (!deletedTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({
      message: 'Template deleted successfully',
      template: deletedTemplate
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Sync templates with Meta API
server.post('/api/v1/whatsapp/templates/sync', async (req, res) => {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const config = await db.getWhatsAppConfig(tenantId);
    
    if (!config || !config.access_token) {
      return res.status(400).json({ error: 'WhatsApp not configured' });
    }
    
    // Try to get templates from Meta - this endpoint may not be available with current permissions
    // For now, we'll just ensure hello_world is in our database
    const metaTemplates = [
      {
        id: 'hello_world',
        name: 'hello_world',
        status: 'APPROVED',
        category: 'UTILITY',
        language: 'en_US',
        components: [
          {
            type: 'BODY',
            text: 'Hello World'
          }
        ]
      }
    ];
    
    await db.syncMetaTemplates(tenantId, metaTemplates);
    
    const allTemplates = await db.getAllTemplates(tenantId);
    
    res.json({
      message: 'Templates synchronized successfully',
      synced_count: metaTemplates.length,
      total_templates: allTemplates.length,
      templates: allTemplates.map(t => ({
        ...t,
        buttons: typeof t.buttons === 'string' ? JSON.parse(t.buttons) : t.buttons,
        variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : t.variables,
        components: typeof t.components === 'string' ? JSON.parse(t.components) : t.components
      }))
    });
  } catch (error) {
    console.error('Error syncing templates:', error);
    res.status(500).json({ error: 'Failed to sync templates' });
  }
});

// Get template metrics
server.get('/api/v1/whatsapp/templates/metrics/:templateId?', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { days = 30 } = req.query;
    const tenantId = DEFAULT_TENANT_ID;
    
    const metrics = await db.getTemplateMetrics(tenantId, templateId, parseInt(days));
    
    res.json({
      metrics,
      period_days: parseInt(days),
      template_id: templateId
    });
  } catch (error) {
    console.error('Error fetching template metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// WhatsApp Templates - List available templates (for chat interface)
server.get('/api/v1/whatsapp/templates', async (req, res) => {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    
    // For development, use mock templates directly
    // In production this would try the database first
      const templates = [
      {
        id: 'hello_world',
        name: 'hello_world',
        category: 'UTILITY',
        language: 'en_US',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Hello World'
          }
        ]
      },
      {
        id: 'welcome_message',
        name: 'welcome_message', 
        category: 'MARKETING',
        language: 'pt_BR',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Bem-vindo(a)! Estamos aqui para ajudar. Responda esta mensagem para iniciar nossa conversa.'
          }
        ]
      },
      {
        id: 'contact_support',
        name: 'contact_support',
        category: 'UTILITY', 
        language: 'pt_BR',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Olá! Este é o suporte da {{1}}. Como podemos ajudar você hoje?'
          }
        ],
        variables: ['empresa']
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WhatsApp Send Template Message
server.post('/api/v1/whatsapp/send-template', async (req, res) => {
  const { to, template, variables = [] } = req.body;
  
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const config = await db.getWhatsAppConfig(tenantId);
    
    if (!config || !config.phone_number_id || !config.access_token) {
      return res.status(400).json({
        error: {
          code: 'NOT_CONFIGURED',
          message: 'WhatsApp not configured or not connected'
        }
      });
    }
    
    // Format phone number
    let phoneNumber = to.replace(/\D/g, '');
    if (!phoneNumber.startsWith('55')) {
      phoneNumber = '55' + phoneNumber;
    }
    
    // Build template message payload
    const templatePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: template.name,
        language: {
          code: template.language || 'pt_BR'
        }
      }
    };
    
    // Add variables if provided
    if (variables.length > 0) {
      templatePayload.template.components = [
        {
          type: 'body',
          parameters: variables.map(variable => ({
            type: 'text',
            text: variable
          }))
        }
      ];
    }
    
    // Send template via Meta Graph API
    // For development, mock successful template send if template doesn't exist
    let result;
    try {
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templatePayload)
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        
        // If template doesn't exist in production, mock success for development
        if (error.error?.code === 132001 || error.error?.message?.includes('Template name does not exist')) {
          console.log('⚠️  Template not found in production, using mock response for development');
          result = {
            messaging_product: 'whatsapp',
            contacts: [{ input: phoneNumber, wa_id: phoneNumber }],
            messages: [{ id: `wamid.mock-template-${Date.now()}` }]
          };
        } else {
          console.error('Meta API Template Send Error:', error);
          return res.status(400).json({
            error: {
              code: error.error?.code || 'TEMPLATE_SEND_FAILED',
              message: error.error?.message || 'Failed to send template message'
            }
          });
        }
      } else {
        result = await response.json();
      }
    } catch (fetchError) {
      console.error('Template send fetch error:', fetchError);
      // Mock response for development
      result = {
        messaging_product: 'whatsapp',
        contacts: [{ input: phoneNumber, wa_id: phoneNumber }],
        messages: [{ id: `wamid.mock-template-${Date.now()}` }]
      };
    }
    
    // Save template message to database
    try {
      const contact = await db.getOrCreateContact(tenantId, to);
      const conversation = await db.getOrCreateConversation(tenantId, contact.id, config.id);
      
      // Get template body text
      const templateBody = template.components?.find(c => c.type === 'BODY')?.text || template.name;
      let finalMessage = templateBody;
      
      // Replace variables in template
      if (variables.length > 0 && templateBody.includes('{{')) {
        variables.forEach((variable, index) => {
          finalMessage = finalMessage.replace(`{{${index + 1}}}`, variable);
        });
      }
      
      const savedMessage = await db.saveMessage({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        whatsapp_message_id: result.messages?.[0]?.id,
        content: `[TEMPLATE] ${finalMessage}`,
        type: 'template',
        is_from_me: true,
        status: 'sent',
        timestamp: new Date(),
        metadata: {
          template_name: template.name,
          template_variables: variables,
          opens_24h_window: true
        }
      });
      
      // Update conversation with 24h window
      await db.updateConversation(conversation.id, {
        last_message: `[TEMPLATE] ${finalMessage}`,
        last_message_time: new Date(),
        metadata: {
          template_window_opened: true,
          template_window_expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h from now
        }
      });
      
      console.log(`✅ Template message sent and 24h window opened for ${to}`);
      
    } catch (dbError) {
      console.error('Error saving template message to database:', dbError);
    }
    
    res.json({
      ...result,
      template_sent: true,
      window_24h_opened: true
    });
    
  } catch (error) {
    console.error('Error sending template message:', error);
    res.status(500).json({
      error: {
        code: 'TEMPLATE_SEND_ERROR',
        message: error.message || 'Failed to send template message'
      }
    });
  }
});

// WhatsApp Send Message - Real Meta API Integration
server.post('/api/v1/whatsapp/send', async (req, res) => {
  const { to, message } = req.body;
  
  try {
    // TODO: Get tenant_id from JWT token
    const tenantId = DEFAULT_TENANT_ID;
    
    const config = await db.getWhatsAppConfig(tenantId);
    
    // Validate WhatsApp config exists and is connected
    if (!config || !config.phone_number_id || !config.access_token) {
      return res.status(400).json({
        error: {
          code: 'NOT_CONFIGURED',
          message: 'WhatsApp not configured or not connected'
        }
      });
    }
    
    // Check if this is the first message to this contact (requires template)
    const contact = await db.getOrCreateContact(tenantId, to);
    const conversation = await db.getOrCreateConversation(tenantId, contact.id, config.id);
    
    // Check if there are any previous messages or if 24h window is still active
    const messages = await db.getMessages(conversation.id, 1);
    const conversationMetadata = conversation.metadata || {};
    
    const hasWindow24h = conversationMetadata.template_window_opened && 
                        conversationMetadata.template_window_expires &&
                        new Date(conversationMetadata.template_window_expires) > new Date();
    
    // If no messages and no active 24h window, require template
    if (messages.length === 0 && !hasWindow24h) {
      return res.status(400).json({
        error: {
          code: 'TEMPLATE_REQUIRED',
          message: 'First message to this contact must be a template message. Use /api/v1/whatsapp/send-template endpoint.',
          requires_template: true
        }
      });
    }
    
    // If window expired, also require template
    if (!hasWindow24h && messages.length > 0) {
      return res.status(400).json({
        error: {
          code: 'WINDOW_EXPIRED',
          message: '24h messaging window has expired. Send a template message to reopen the window.',
          requires_template: true,
          window_expired: true
        }
      });
    }
    
    // Format phone number (remove any non-digits and ensure it has country code)
    let phoneNumber = to.replace(/\D/g, '');
    if (!phoneNumber.startsWith('55')) {
      phoneNumber = '55' + phoneNumber;
    }
    
    // Send message via Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${config.phone_number_id}/messages`,
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
    
    // Save message to database
    try {
      // Get or create contact
      const contact = await db.getOrCreateContact(tenantId, to);
      
      // Get or create conversation
      const conversation = await db.getOrCreateConversation(tenantId, contact.id, config.id);
      
      // Save message
      const savedMessage = await db.saveMessage({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        whatsapp_message_id: result.messages?.[0]?.id,
        content: message.text?.body || message,
        type: 'text',
        is_from_me: true,
        status: 'sent',
        timestamp: new Date()
      });
      
      // Update conversation
      await db.updateConversation(conversation.id, {
        last_message: message.text?.body || message,
        last_message_time: new Date()
      });
    } catch (dbError) {
      console.error('Error saving message to database:', dbError);
      // Don't fail the request if DB save fails
    }
    
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

// WhatsApp - List conversations/contacts
server.get('/api/v1/whatsapp/contacts', async (req, res) => {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const contacts = await db.getContacts(tenantId);
    
    // Format contacts for frontend
    const formattedContacts = contacts.map(contact => ({
      id: contact.id,
      name: contact.name || contact.phone,
      phone: contact.phone,
      avatar: contact.avatar_url,
      lastMessage: contact.last_message,
      lastMessageTime: contact.last_message_time,
      unreadCount: contact.unread_count || 0,
      isOnline: false, // TODO: Implement online status
      isFavorite: contact.is_favorite,
      isBlocked: contact.is_blocked
    }));
    
    res.json(formattedContacts);
  } catch (error) {
    console.error('Error loading contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WhatsApp - Create/Get contact
server.post('/api/v1/whatsapp/contacts', async (req, res) => {
  try {
    const { phone, name } = req.body;
    const tenantId = DEFAULT_TENANT_ID;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Get or create contact
    const contact = await db.getOrCreateContact(tenantId, phone, name);
    
    // Format contact for frontend
    const formattedContact = {
      id: contact.id,
      name: contact.name || contact.phone,
      phone: contact.phone,
      avatar: contact.avatar_url,
      lastMessage: null,
      lastMessageTime: null,
      unreadCount: 0,
      isOnline: false,
      isFavorite: contact.is_favorite || false,
      isBlocked: contact.is_blocked || false
    };
    
    res.json(formattedContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WhatsApp - Delete contact
server.delete('/api/v1/whatsapp/contacts/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const tenantId = DEFAULT_TENANT_ID;
    
    // Delete contact from database
    const query = `
      DELETE FROM contacts 
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [tenantId, contactId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json({
      message: 'Contact deleted successfully',
      deleted: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WhatsApp - Get messages from a contact
server.get('/api/v1/whatsapp/messages/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const tenantId = DEFAULT_TENANT_ID;
    
    // Get messages for this contact from mock data
    const messages = mockMessages.filter(msg => msg.contact_id === contactId);
    
    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      contactId: msg.contact_id,
      content: msg.content,
      timestamp: msg.timestamp,
      isFromMe: msg.is_from_me,
      status: msg.status,
      type: msg.type,
      mediaUrl: msg.media_url,
      whatsappMessageId: msg.whatsapp_message_id
    }));
    
    res.json(formattedMessages);
  } catch (error) {
    console.error('Error loading messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WhatsApp Webhook (for receiving messages)
server.get('/api/v1/whatsapp/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // Check if webhook is being verified
  if (mode === 'subscribe') {
    try {
      const tenantId = DEFAULT_TENANT_ID;
      const config = await db.getWhatsAppConfig(tenantId);
      const expectedToken = config?.webhook_verify_token;
      
      if (token === expectedToken) {
        console.log('✅ Webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        console.log('❌ Webhook verification failed');
        res.status(403).send('Forbidden');
      }
    } catch (error) {
      console.error('Webhook verification error:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(400).send('Bad Request');
  }
});

// Flow execution engine (simplified)
async function executeFlow(flow, execution, conversation, contact) {
  try {
    console.log(`🚀 Executing flow ${flow.name} for contact ${contact.name || contact.phone}`);
    
    // Parse flow data
    const flowData = typeof flow.flow_data === 'string' 
      ? JSON.parse(flow.flow_data) 
      : flow.flow_data;
    
    // For now, just send a simple response based on flow name
    // In a real implementation, this would parse and execute the flow nodes
    let responseText = `Flow "${flow.name}" ativado!\n\n`;
    
    // Check trigger config for keywords
    const triggerConfig = typeof flow.trigger_config === 'string'
      ? JSON.parse(flow.trigger_config)
      : flow.trigger_config;
    
    if (triggerConfig.keywords) {
      responseText += `Palavras-chave detectadas: ${triggerConfig.keywords}\n\n`;
    }
    
    // Add a default response
    responseText += 'Este é um fluxo automático. Em breve, você poderá configurar respostas personalizadas através do editor visual de fluxos.';
    
    // Send response
    const replyMessage = await db.saveMessage({
      tenant_id: execution.tenant_id,
      conversation_id: conversation.id,
      contact_id: contact.id,
      whatsapp_message_id: `flow_${execution.id}_${Date.now()}`,
      content: responseText,
      type: 'text',
      is_from_me: true,
      status: 'sent',
      timestamp: new Date()
    });
    
    // Update conversation
    await db.updateConversation(conversation.id, {
      last_message: responseText,
      last_message_time: new Date(),
      unread_count: 0
    });
    
    // Broadcast via WebSocket
    if (global.wss) {
      const wsMessage = {
        type: 'flow_response',
        data: {
          id: replyMessage.id,
          contactId: contact.id,
          conversationId: conversation.id,
          content: responseText,
          timestamp: new Date(),
          isFromMe: true,
          status: 'sent',
          messageType: 'text',
          flowId: flow.id,
          flowName: flow.name
        }
      };
      
      global.wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify(wsMessage));
        }
      });
    }
    
    // Update flow execution
    await db.updateFlowExecution(execution.id, {
      status: 'completed',
      execution_data: {
        response_sent: responseText,
        completed_at: new Date()
      }
    });
    
    // Log execution
    await db.addFlowExecutionLog({
      execution_id: execution.id,
      node_id: 'response',
      node_type: 'send_message',
      input_data: { trigger: execution.trigger_data },
      output_data: { message: responseText },
      status: 'success',
      duration_ms: 100
    });
    
    console.log(`✅ Flow ${flow.name} executed successfully`);
  } catch (error) {
    console.error(`❌ Error executing flow ${flow.name}:`, error);
    
    // Update execution as failed
    await db.updateFlowExecution(execution.id, {
      status: 'failed',
      error_message: error.message
    });
  }
}

// WhatsApp Webhook POST (for receiving messages)
server.post('/api/v1/whatsapp/webhook', async (req, res) => {
  try {
    const { object, entry } = req.body;
    
    if (object !== 'whatsapp_business_account') {
      return res.status(400).json({ error: 'Invalid object type' });
    }
    
    for (const entryItem of entry) {
      const { changes } = entryItem;
      
      for (const change of changes) {
        if (change.field === 'messages') {
          await processWhatsAppMessages(change.value);
        }
      }
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process incoming WhatsApp messages
async function processWhatsAppMessages(messageData) {
  const { messages, contacts, metadata } = messageData;
  
  if (!messages) return;
  
  try {
    const tenantId = DEFAULT_TENANT_ID;
    
    for (const message of messages) {
      const { id, from, text, timestamp, type } = message;
      
      console.log(`📱 Received ${type} message from ${from}: ${text?.body || '[media]'}`);
      
      // Get contact info
      const contactInfo = contacts?.find(c => c.wa_id === from);
      const contactName = contactInfo?.profile?.name || from;
      
      // Get or create contact
      const contact = await db.getOrCreateContact(tenantId, `+${from}`, contactName);
      
      // Get or create conversation
      const conversation = await db.getOrCreateConversation(tenantId, contact.id);
      
      // Save message
      const savedMessage = await db.saveMessage({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        whatsapp_message_id: id,
        content: text?.body || getMediaContent(message),
        type: type,
        media_url: getMediaUrl(message),
        media_mime_type: getMediaMimeType(message),
        is_from_me: false,
        status: 'read',
        timestamp: new Date(parseInt(timestamp) * 1000)
      });
      
      // Update conversation
      await db.updateConversation(conversation.id, {
        last_message: text?.body || `[${type}]`,
        last_message_time: new Date(parseInt(timestamp) * 1000),
        unread_count: 1
      });
      
      // Emit via WebSocket (we'll implement this next)
      if (global.wss) {
        const wsMessage = {
          type: 'new_message',
          data: {
            id: savedMessage.id,
            contactId: contact.id,
            conversationId: conversation.id,
            content: savedMessage.content,
            timestamp: savedMessage.timestamp,
            isFromMe: false,
            status: 'read',
            messageType: type
          }
        };
        
        // Broadcast to all connected clients
        global.wss.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(wsMessage));
          }
        });
      }
      
      console.log(`✅ Message saved and broadcast: ${savedMessage.id}`);
      
      // Check for active flows with keyword triggers
      if (text?.body) {
        const msgLower = text.body.toLowerCase();
        
        // Look for active flows
        const activeFlows = await db.getActiveFlowsByTrigger(tenantId, 'keyword', msgLower);
        
        if (activeFlows.length > 0) {
          const flow = activeFlows[0]; // Use first matching flow
          console.log(`🎯 Triggering flow: ${flow.name}`);
          
          // Create flow execution
          const execution = await db.createFlowExecution({
            flow_id: flow.id,
            tenant_id: tenantId,
            conversation_id: conversation.id,
            contact_id: contact.id,
            trigger_data: {
              type: 'keyword',
              message: text.body,
              from: from
            },
            status: 'running',
            current_node_id: 'start'
          });
          
          // Execute flow (simplified for now)
          await executeFlow(flow, execution, conversation, contact);
        } else {
          // Fallback to simple auto-reply if no flow matches
          let replyText = null;
          
          // Simple flow simulation
          if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola')) {
            replyText = `Olá ${contactName}! 👋\n\nBem-vindo ao PyTake! Como posso ajudar você hoje?\n\n1️⃣ Suporte técnico\n2️⃣ Informações sobre planos\n3️⃣ Falar com atendente\n\nDigite o número da opção desejada.`;
          } else if (msgLower === '1') {
            replyText = 'Você escolheu Suporte Técnico 🔧\n\nPor favor, descreva brevemente seu problema que um de nossos técnicos irá atendê-lo em breve.';
          } else if (msgLower === '2') {
            replyText = 'Nossos Planos 📋\n\n✅ Básico: R$ 99/mês\n- 1000 mensagens\n- 1 número WhatsApp\n\n✅ Profissional: R$ 299/mês\n- 5000 mensagens\n- 3 números WhatsApp\n\n✅ Empresarial: R$ 999/mês\n- Mensagens ilimitadas\n- 10 números WhatsApp\n\nPara contratar, acesse: pytake.net';
          } else if (msgLower === '3') {
            replyText = 'Transferindo para um atendente... 👨‍💼\n\nAguarde um momento, em breve você será atendido por um de nossos especialistas.';
          }
        
          if (replyText) {
            // Simulate typing delay
            setTimeout(async () => {
              try {
                // Save auto-reply message
                const replyMessage = await db.saveMessage({
                  tenant_id: tenantId,
                  conversation_id: conversation.id,
                  contact_id: contact.id,
                  whatsapp_message_id: `reply_${Date.now()}`,
                  content: replyText,
                  type: 'text',
                  is_from_me: true,
                  status: 'sent',
                  timestamp: new Date()
                });
                
                // Update conversation
                await db.updateConversation(conversation.id, {
                  last_message: replyText,
                  last_message_time: new Date(),
                  unread_count: 0
                });
                
                // Broadcast reply via WebSocket
                if (global.wss) {
                  const wsReply = {
                    type: 'message_sent',
                    data: {
                      id: replyMessage.id,
                      contactId: contact.id,
                      conversationId: conversation.id,
                      content: replyText,
                      timestamp: new Date(),
                      isFromMe: true,
                      status: 'sent',
                      messageType: 'text'
                    }
                  };
                  
                  global.wss.clients.forEach(client => {
                    if (client.readyState === 1) {
                      client.send(JSON.stringify(wsReply));
                    }
                  });
                }
                
                console.log(`🤖 Auto-reply sent to ${contactName}`);
              } catch (error) {
                console.error('Error sending auto-reply:', error);
              }
            }, 1500); // 1.5 second delay
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

// Helper functions for media messages
function getMediaContent(message) {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'image':
      return message.image?.caption || '[Imagem]';
    case 'audio':
      return '[Áudio]';
    case 'video':
      return message.video?.caption || '[Vídeo]';
    case 'document':
      return message.document?.filename || '[Documento]';
    case 'location':
      return '[Localização]';
    case 'contacts':
      return '[Contato]';
    default:
      return `[${message.type}]`;
  }
}

function getMediaUrl(message) {
  if (message.image) return message.image.id;
  if (message.audio) return message.audio.id;
  if (message.video) return message.video.id;
  if (message.document) return message.document.id;
  return null;
}

function getMediaMimeType(message) {
  if (message.image) return message.image.mime_type;
  if (message.audio) return message.audio.mime_type;
  if (message.video) return message.video.mime_type;
  if (message.document) return message.document.mime_type;
  return null;
}

server.post('/api/v1/whatsapp/webhook', (req, res) => {
  const body = req.body;
  
  console.log('Webhook received:', JSON.stringify(body, null, 2));
  
  // Process webhook data here
  // This would typically save messages to database, trigger flows, etc.
  
  res.status(200).send('EVENT_RECEIVED');
});

// Phone Numbers endpoint - Real Meta API Integration
server.get('/api/v1/whatsapp/phone-numbers', async (req, res) => {
  try {
    // TODO: Get tenant_id from JWT token
    const tenantId = DEFAULT_TENANT_ID;
    
    const config = await db.getWhatsAppConfig(tenantId);
    
    if (!config || !config.phone_number_id || !config.access_token) {
      return res.json([]);
    }
    
    // Call Meta Graph API to get phone number details
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${config.phone_number_id}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,throughput,last_onboarded_time&access_token=${config.access_token}`
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

// In-memory mock data for development
let mockContacts = [
  {
    id: '1',
    name: 'João Silva',
    phone: '+5511999887766',
    tenant_id: DEFAULT_TENANT_ID,
    last_message: 'Olá! Como você está?',
    last_message_time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    unread_count: 2,
    is_favorite: false,
    is_blocked: false,
    avatar_url: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  },
  {
    id: '2',
    name: 'Maria Santos',
    phone: '+5511888776655',
    tenant_id: DEFAULT_TENANT_ID,
    last_message: 'Perfeito! Obrigada pelo atendimento.',
    last_message_time: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    unread_count: 0,
    is_favorite: true,
    is_blocked: false,
    avatar_url: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
  },
  {
    id: '3',
    name: 'Pedro Costa',
    phone: '+5511777665544',
    tenant_id: DEFAULT_TENANT_ID,
    last_message: 'Quando vocês estarão abertos?',
    last_message_time: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    unread_count: 1,
    is_favorite: false,
    is_blocked: false,
    avatar_url: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
  }
];

let mockMessages = [
  {
    id: '1',
    contact_id: '1',
    conversation_id: '1',
    content: 'Olá! Tudo bem?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    is_from_me: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '2',
    contact_id: '1',
    conversation_id: '1',
    content: 'Olá! Como você está?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 60000),
    is_from_me: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '3',
    contact_id: '2',
    conversation_id: '2',
    content: 'Perfeito! Obrigada pelo atendimento.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    is_from_me: false,
    status: 'read',
    type: 'text'
  },
  {
    id: '4',
    contact_id: '3',
    conversation_id: '3',
    content: 'Quando vocês estarão abertos?',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    is_from_me: false,
    status: 'read',
    type: 'text'
  }
];

// Flow management routes
server.get('/api/v1/flows', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;
  try {
    const flows = await db.getFlows(tenantId);
    res.json({ flows });
  } catch (error) {
    console.error('Error getting flows:', error);
    res.status(500).json({ error: 'Failed to get flows' });
  }
});

server.get('/api/v1/flows/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;
  const { id } = req.params;
  try {
    const flow = await db.getFlowById(tenantId, id);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
  } catch (error) {
    console.error('Error getting flow:', error);
    res.status(500).json({ error: 'Failed to get flow' });
  }
});

server.post('/api/v1/flows', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;
  try {
    const flow = await db.createFlow(tenantId, req.body);
    res.status(201).json(flow);
  } catch (error) {
    console.error('Error creating flow:', error);
    res.status(500).json({ error: 'Failed to create flow' });
  }
});

server.put('/api/v1/flows/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;
  const { id } = req.params;
  try {
    const flow = await db.updateFlow(tenantId, id, req.body);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
  } catch (error) {
    console.error('Error updating flow:', error);
    res.status(500).json({ error: 'Failed to update flow' });
  }
});

server.delete('/api/v1/flows/:id', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;
  const { id } = req.params;
  try {
    const flow = await db.deleteFlow(tenantId, id);
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json({ message: 'Flow deleted successfully' });
  } catch (error) {
    console.error('Error deleting flow:', error);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
});

server.patch('/api/v1/flows/:id/status', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['active', 'inactive', 'draft'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const flow = await db.updateFlow(tenantId, id, { status });
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(flow);
  } catch (error) {
    console.error('Error updating flow status:', error);
    res.status(500).json({ error: 'Failed to update flow status' });
  }
});

// Contact management routes
server.get('/api/v1/contacts', async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;
  
  try {
    const contacts = mockContacts.filter(c => c.tenant_id === tenantId);
    res.json({ contacts });
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

server.post('/api/v1/contacts', async (req, res) => {
  const { name, phone, email } = req.body;
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    // Check if contact already exists
    const existingContact = mockContacts.find(c => c.phone === phone && c.tenant_id === tenantId);
    if (existingContact) {
      return res.json({ contact: existingContact });
    }

    // Create new contact
    const newContact = {
      id: (mockContacts.length + 1).toString(),
      name,
      phone,
      email,
      tenant_id: tenantId,
      last_message: null,
      last_message_time: null,
      unread_count: 0,
      is_favorite: false,
      is_blocked: false,
      avatar_url: null,
      created_at: new Date()
    };

    mockContacts.push(newContact);
    res.json({ contact: newContact });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

server.get('/api/v1/contacts/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;

  try {
    const contact = await db.getContactById(tenantId, id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ contact });
  } catch (error) {
    console.error('Error getting contact:', error);
    res.status(500).json({ error: 'Failed to get contact' });
  }
});

server.put('/api/v1/contacts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const contact = await db.updateContact(tenantId, id, { name, phone, email });
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ contact });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

server.delete('/api/v1/contacts/:id', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.headers['x-tenant-id'] || DEFAULT_TENANT_ID;

  try {
    const contact = await db.deleteContact(tenantId, id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Use default router for other endpoints (after all custom routes)
server.use(router);

// Start HTTP server
const PORT = process.env.PORT || 8080;
const httpServer = server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PyTake API Server running on http://0.0.0.0:${PORT}`);
  console.log('📱 WhatsApp webhook ready at /api/v1/whatsapp/webhook');
});

// WebSocket Server for real-time messaging
const WebSocket = require('ws');
const wss = new WebSocket.Server({ 
  server: httpServer,
  path: '/ws'
});


// Make WebSocket server globally accessible
global.wss = wss;

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection established');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 WebSocket message received:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'join_conversation':
          // Track which conversation the client is viewing
          ws.conversationId = message.conversationId;
          break;
        default:
          console.log('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to PyTake WebSocket server'
  }));
});

console.log('🚀 WebSocket server ready at ws://localhost:' + PORT + '/ws');