const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'pytake',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'pytake',
  password: process.env.POSTGRES_PASSWORD || 'L8RV1fe9DwP',
  port: process.env.POSTGRES_PORT || 5433,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database functions
const db = {
  // Get WhatsApp config (default or by ID)
  async getWhatsAppConfig(tenantId, configId = null) {
    try {
      let query, params;
      
      if (configId) {
        query = `
          SELECT * FROM whatsapp_configs 
          WHERE tenant_id = $1 AND id = $2
        `;
        params = [tenantId, configId];
      } else {
        query = `
          SELECT * FROM whatsapp_configs 
          WHERE tenant_id = $1 
          ORDER BY is_default DESC, created_at DESC 
          LIMIT 1
        `;
        params = [tenantId];
      }
      
      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting WhatsApp config:', error);
      throw error;
    }
  },

  // Get all WhatsApp configs for tenant
  async getAllWhatsAppConfigs(tenantId) {
    try {
      const query = `
        SELECT * FROM whatsapp_configs 
        WHERE tenant_id = $1 
        ORDER BY is_default DESC, created_at ASC
      `;
      const result = await pool.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting all WhatsApp configs:', error);
      throw error;
    }
  },

  // Save WhatsApp config
  async saveWhatsAppConfig(data) {
    try {
      const {
        id,
        tenant_id,
        phone_number_id,
        access_token,
        business_account_id,
        webhook_verify_token,
        name = 'WhatsApp Business',
        phone_number = phone_number_id ? 'Configured' : '',
        api_type = 'official',
        is_default = false
      } = data;

      // First ensure tenant exists
      await this.ensureTenantExists(tenant_id);

      if (id) {
        // Update existing config by ID
        if (is_default) {
          await this.unsetDefaultConfig(tenant_id);
        }
        
        const query = `
          UPDATE whatsapp_configs 
          SET 
            phone_number_id = $3,
            access_token = $4,
            business_account_id = $5,
            webhook_verify_token = $6,
            name = $7,
            phone_number = $8,
            is_default = $9,
            updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2
          RETURNING *
        `;
        const result = await pool.query(query, [
          tenant_id,
          id,
          phone_number_id,
          access_token,
          business_account_id,
          webhook_verify_token,
          name,
          phone_number,
          is_default
        ]);
        return result.rows[0];
      } else {
        // Create new config
        // If this is the first config for tenant, make it default
        const existingConfigs = await this.getAllWhatsAppConfigs(tenant_id);
        const makeDefault = existingConfigs.length === 0 || is_default;
        
        // If making this default, unset others
        if (makeDefault) {
          await this.unsetDefaultConfig(tenant_id);
        }
        
        const query = `
          INSERT INTO whatsapp_configs (
            tenant_id,
            name,
            phone_number,
            phone_number_id,
            business_account_id,
            access_token,
            webhook_verify_token,
            api_type,
            is_default
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        const result = await pool.query(query, [
          tenant_id,
          name,
          phone_number,
          phone_number_id,
          business_account_id,
          access_token,
          webhook_verify_token,
          api_type,
          makeDefault
        ]);
        return result.rows[0];
      }
    } catch (error) {
      console.error('Error saving WhatsApp config:', error);
      throw error;
    }
  },

  // Set config as default
  async setDefaultConfig(tenantId, configId) {
    try {
      // First unset all defaults for tenant
      await this.unsetDefaultConfig(tenantId);
      
      // Set the specified config as default
      const query = `
        UPDATE whatsapp_configs 
        SET is_default = true, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [tenantId, configId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error setting default config:', error);
      throw error;
    }
  },

  // Unset all default configs for tenant
  async unsetDefaultConfig(tenantId) {
    try {
      const query = `
        UPDATE whatsapp_configs 
        SET is_default = false
        WHERE tenant_id = $1
      `;
      await pool.query(query, [tenantId]);
    } catch (error) {
      console.error('Error unsetting default configs:', error);
      throw error;
    }
  },

  // Delete WhatsApp config
  async deleteWhatsAppConfig(tenantId, configId) {
    try {
      const query = `
        DELETE FROM whatsapp_configs 
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [tenantId, configId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting WhatsApp config:', error);
      throw error;
    }
  },

  // Update config status
  async updateConfigStatus(tenantId, status, lastTest = null) {
    try {
      const query = `
        UPDATE whatsapp_configs 
        SET 
          updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [tenantId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating config status:', error);
      throw error;
    }
  },

  // Ensure tenant exists
  async ensureTenantExists(tenantId) {
    try {
      const query = `
        INSERT INTO tenants (id, name, domain) 
        VALUES ($1, 'Demo Tenant', $2) 
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `;
      await pool.query(query, [tenantId, `tenant-${tenantId}`]);
    } catch (error) {
      console.error('Error ensuring tenant exists:', error);
      throw error;
    }
  },

  // Get default tenant ID
  async getDefaultTenantId() {
    try {
      const query = `SELECT id FROM tenants WHERE domain = 'localhost' LIMIT 1`;
      const result = await pool.query(query);
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error('Error getting default tenant:', error);
      return null;
    }
  },

  // Contact functions
  async getOrCreateContact(tenantId, phone, name = null) {
    const query = `
      INSERT INTO contacts (tenant_id, phone, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id, phone) 
      DO UPDATE SET 
        name = COALESCE(EXCLUDED.name, contacts.name),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`;
    
    const result = await pool.query(query, [tenantId, phone, name]);
    return result.rows[0];
  },

  async getContacts(tenantId) {
    const query = `
      SELECT c.*, 
             conv.unread_count,
             conv.last_message,
             conv.last_message_time
      FROM contacts c
      LEFT JOIN conversations conv ON c.id = conv.contact_id
      WHERE c.tenant_id = $1
      ORDER BY COALESCE(conv.last_message_time, c.created_at) DESC`;
    
    const result = await pool.query(query, [tenantId]);
    return result.rows;
  },

  // Conversation functions
  async getOrCreateConversation(tenantId, contactId, whatsappConfigId = null) {
    const query = `
      INSERT INTO conversations (tenant_id, contact_id, whatsapp_config_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id, contact_id) 
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *`;
    
    const result = await pool.query(query, [tenantId, contactId, whatsappConfigId]);
    return result.rows[0];
  },

  async updateConversation(conversationId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });
    
    values.push(conversationId);
    
    const query = `
      UPDATE conversations 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *`;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Message functions
  async saveMessage(message) {
    const query = `
      INSERT INTO messages (
        tenant_id, conversation_id, contact_id, whatsapp_message_id,
        content, type, media_url, media_mime_type, is_from_me, 
        status, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`;
    
    const values = [
      message.tenant_id,
      message.conversation_id,
      message.contact_id,
      message.whatsapp_message_id,
      message.content,
      message.type || 'text',
      message.media_url,
      message.media_mime_type,
      message.is_from_me || false,
      message.status || 'pending',
      message.metadata || {},
      message.timestamp || new Date()
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getMessages(conversationId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3`;
    
    const result = await pool.query(query, [conversationId, limit, offset]);
    return result.rows.reverse(); // Reverse to get chronological order
  },

  async updateMessageStatus(whatsappMessageId, status) {
    const query = `
      UPDATE messages 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE whatsapp_message_id = $2
      RETURNING *`;
    
    const result = await pool.query(query, [status, whatsappMessageId]);
    return result.rows[0];
  },

  // Template functions
  async getAllTemplates(tenantId) {
    const query = `
      SELECT wt.*, wc.name as config_name
      FROM whatsapp_templates wt
      LEFT JOIN whatsapp_configs wc ON wt.whatsapp_config_id = wc.id
      WHERE wt.tenant_id = $1
      ORDER BY wt.status, wt.created_at DESC`;
    
    const result = await pool.query(query, [tenantId]);
    return result.rows;
  },

  async getTemplate(tenantId, templateId) {
    const query = `
      SELECT wt.*, wc.name as config_name
      FROM whatsapp_templates wt
      LEFT JOIN whatsapp_configs wc ON wt.whatsapp_config_id = wc.id
      WHERE wt.tenant_id = $1 AND wt.id = $2`;
    
    const result = await pool.query(query, [tenantId, templateId]);
    return result.rows[0];
  },

  async saveTemplate(template) {
    const {
      id,
      tenant_id,
      whatsapp_config_id,
      meta_template_id,
      name,
      status = 'DRAFT',
      category = 'UTILITY',
      language = 'pt_BR',
      header_type,
      header_text,
      header_media_url,
      body_text,
      footer_text,
      buttons = [],
      variables = [],
      components = [],
      is_custom = true,
      tags = [],
      description
    } = template;

    if (id) {
      // Update existing template
      const query = `
        UPDATE whatsapp_templates 
        SET 
          meta_template_id = $3,
          name = $4,
          status = $5,
          category = $6,
          language = $7,
          header_type = $8,
          header_text = $9,
          header_media_url = $10,
          body_text = $11,
          footer_text = $12,
          buttons = $13,
          variables = $14,
          components = $15,
          tags = $16,
          description = $17,
          updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND id = $2
        RETURNING *`;
      
      const result = await pool.query(query, [
        tenant_id, id, meta_template_id, name, status, category, language,
        header_type, header_text, header_media_url, body_text, footer_text,
        JSON.stringify(buttons), JSON.stringify(variables), JSON.stringify(components),
        tags, description
      ]);
      return result.rows[0];
    } else {
      // Create new template
      const query = `
        INSERT INTO whatsapp_templates (
          tenant_id, whatsapp_config_id, meta_template_id, name, status, category, language,
          header_type, header_text, header_media_url, body_text, footer_text,
          buttons, variables, components, is_custom, tags, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`;
      
      const result = await pool.query(query, [
        tenant_id, whatsapp_config_id, meta_template_id, name, status, category, language,
        header_type, header_text, header_media_url, body_text, footer_text,
        JSON.stringify(buttons), JSON.stringify(variables), JSON.stringify(components),
        is_custom, tags, description
      ]);
      return result.rows[0];
    }
  },

  async deleteTemplate(tenantId, templateId) {
    const query = `
      DELETE FROM whatsapp_templates 
      WHERE tenant_id = $1 AND id = $2
      RETURNING *`;
    
    const result = await pool.query(query, [tenantId, templateId]);
    return result.rows[0];
  },

  async syncMetaTemplates(tenantId, metaTemplates) {
    // Atualizar templates existentes com dados do Meta
    for (const metaTemplate of metaTemplates) {
      const query = `
        INSERT INTO whatsapp_templates (
          tenant_id, meta_template_id, name, status, category, language,
          body_text, components, is_custom
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
        ON CONFLICT (tenant_id, name) 
        DO UPDATE SET 
          meta_template_id = EXCLUDED.meta_template_id,
          status = EXCLUDED.status,
          category = EXCLUDED.category,
          language = EXCLUDED.language,
          components = EXCLUDED.components,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`;
      
      const bodyComponent = metaTemplate.components?.find(c => c.type === 'BODY');
      const bodyText = bodyComponent?.text || metaTemplate.name;
      
      await pool.query(query, [
        tenantId,
        metaTemplate.id,
        metaTemplate.name,
        metaTemplate.status,
        metaTemplate.category,
        metaTemplate.language,
        bodyText,
        JSON.stringify(metaTemplate.components || [])
      ]);
    }
  },

  async recordTemplateSend(templateSend) {
    const query = `
      INSERT INTO template_sends (
        tenant_id, template_id, contact_id, conversation_id, message_id,
        whatsapp_message_id, template_name, language, variables_used, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`;
    
    const result = await pool.query(query, [
      templateSend.tenant_id,
      templateSend.template_id,
      templateSend.contact_id,
      templateSend.conversation_id,
      templateSend.message_id,
      templateSend.whatsapp_message_id,
      templateSend.template_name,
      templateSend.language,
      JSON.stringify(templateSend.variables_used || {}),
      templateSend.status || 'SENT'
    ]);
    
    // Atualizar contador de uso do template
    await pool.query(`
      UPDATE whatsapp_templates 
      SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [templateSend.template_id]);
    
    return result.rows[0];
  },

  async getTemplateMetrics(tenantId, templateId = null, days = 30) {
    let query = `
      SELECT 
        wt.name,
        wt.status,
        COUNT(ts.id) as total_sends,
        COUNT(CASE WHEN ts.status = 'DELIVERED' THEN 1 END) as delivered,
        COUNT(CASE WHEN ts.status = 'READ' THEN 1 END) as read,
        ROUND(AVG(CASE WHEN ts.cost_usd IS NOT NULL THEN ts.cost_usd END), 6) as avg_cost,
        DATE_TRUNC('day', ts.sent_at) as date
      FROM whatsapp_templates wt
      LEFT JOIN template_sends ts ON wt.id = ts.template_id
      WHERE wt.tenant_id = $1
        AND ($2::uuid IS NULL OR wt.id = $2)
        AND ts.sent_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY wt.id, wt.name, wt.status, DATE_TRUNC('day', ts.sent_at)
      ORDER BY date DESC`;
    
    const result = await pool.query(query, [tenantId, templateId]);
    return result.rows;
  },

  async getTemplateById(templateId, tenantId) {
    const query = `
      SELECT * FROM whatsapp_templates 
      WHERE id = $1::uuid AND tenant_id = $2::uuid
    `;
    const result = await pool.query(query, [templateId, tenantId]);
    return result.rows[0];
  },

  async updateTemplateStatus(templateId, tenantId, status) {
    const query = `
      UPDATE whatsapp_templates 
      SET status = $1::varchar, 
          updated_at = CURRENT_TIMESTAMP,
          approved_at = CASE WHEN $1::varchar = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE approved_at END
      WHERE id = $2::uuid AND tenant_id = $3::uuid
      RETURNING *
    `;
    const result = await pool.query(query, [status, templateId, tenantId]);
    return result.rows[0];
  },

  async recordTemplateSend(data) {
    const query = `
      INSERT INTO template_sends (
        template_id, tenant_id, message_id, to_phone, 
        contact_name, template_data, status, created_at
      ) VALUES (
        $1::uuid, $2::uuid, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
      ) RETURNING *
    `;
    
    const result = await pool.query(query, [
      data.template_id,
      data.tenant_id,
      data.message_id,
      data.to_phone,
      data.contact_name,
      JSON.stringify(data.template_data),
      data.status
    ]);
    
    // Also increment template usage count
    await pool.query(`
      UPDATE whatsapp_templates 
      SET usage_count = usage_count + 1,
          last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1::uuid
    `, [data.template_id]);
    
    return result.rows[0];
  },

  async updateTemplateSendStatus(sendId, status) {
    const query = `
      UPDATE template_sends 
      SET status = $1,
          delivered_at = CASE WHEN $1 = 'DELIVERED' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
          read_at = CASE WHEN $1 = 'READ' THEN CURRENT_TIMESTAMP ELSE read_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2::uuid
      RETURNING *
    `;
    const result = await pool.query(query, [status, sendId]);
    return result.rows[0];
  },

  async createContact(tenantId, contactData) {
    const { name, phone, email } = contactData;
    const query = `
      INSERT INTO contacts (tenant_id, name, phone, email, created_at, updated_at)
      VALUES ($1::uuid, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await pool.query(query, [tenantId, name, phone, email]);
    return result.rows[0];
  },

  async getContactById(tenantId, contactId) {
    const query = `
      SELECT c.*, 
             conv.unread_count,
             conv.last_message,
             conv.last_message_time
      FROM contacts c
      LEFT JOIN conversations conv ON c.id = conv.contact_id
      WHERE c.tenant_id = $1::uuid AND c.id = $2::uuid
    `;
    const result = await pool.query(query, [tenantId, contactId]);
    return result.rows[0];
  },

  async updateContact(tenantId, contactId, contactData) {
    const { name, phone, email } = contactData;
    const query = `
      UPDATE contacts 
      SET name = $3, phone = $4, email = $5, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1::uuid AND id = $2::uuid
      RETURNING *
    `;
    const result = await pool.query(query, [tenantId, contactId, name, phone, email]);
    return result.rows[0];
  },

  async deleteContact(tenantId, contactId) {
    const query = `
      DELETE FROM contacts 
      WHERE tenant_id = $1::uuid AND id = $2::uuid
      RETURNING *
    `;
    const result = await pool.query(query, [tenantId, contactId]);
    return result.rows[0];
  },

  // Flow functions
  async getFlows(tenantId) {
    const query = `
      SELECT * FROM flows 
      WHERE tenant_id = $1::uuid
      ORDER BY status DESC, created_at DESC
    `;
    const result = await pool.query(query, [tenantId]);
    return result.rows;
  },

  async getFlowById(tenantId, flowId) {
    const query = `
      SELECT * FROM flows 
      WHERE tenant_id = $1::uuid AND id = $2::uuid
    `;
    const result = await pool.query(query, [tenantId, flowId]);
    return result.rows[0];
  },

  async createFlow(tenantId, flowData) {
    const { name, description, trigger_type, trigger_config, flow_data, tags } = flowData;
    const query = `
      INSERT INTO flows (
        tenant_id, name, description, status, 
        trigger_type, trigger_config, flow_data, tags
      ) VALUES (
        $1::uuid, $2, $3, 'draft', $4, $5, $6, $7
      ) RETURNING *
    `;
    const result = await pool.query(query, [
      tenantId, name, description, trigger_type,
      JSON.stringify(trigger_config || {}),
      JSON.stringify(flow_data || { nodes: [], edges: [] }),
      tags || []
    ]);
    return result.rows[0];
  },

  async updateFlow(tenantId, flowId, flowData) {
    const { name, description, trigger_type, trigger_config, flow_data, tags, status } = flowData;
    const query = `
      UPDATE flows SET
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        trigger_type = COALESCE($5, trigger_type),
        trigger_config = COALESCE($6, trigger_config),
        flow_data = COALESCE($7, flow_data),
        tags = COALESCE($8, tags),
        status = COALESCE($9, status),
        activated_at = CASE WHEN $9 = 'active' AND status != 'active' THEN CURRENT_TIMESTAMP ELSE activated_at END,
        deactivated_at = CASE WHEN $9 != 'active' AND status = 'active' THEN CURRENT_TIMESTAMP ELSE deactivated_at END
      WHERE tenant_id = $1::uuid AND id = $2::uuid
      RETURNING *
    `;
    const result = await pool.query(query, [
      tenantId, flowId, name, description, trigger_type,
      trigger_config ? JSON.stringify(trigger_config) : null,
      flow_data ? JSON.stringify(flow_data) : null,
      tags, status
    ]);
    return result.rows[0];
  },

  async deleteFlow(tenantId, flowId) {
    const query = `
      DELETE FROM flows 
      WHERE tenant_id = $1::uuid AND id = $2::uuid
      RETURNING *
    `;
    const result = await pool.query(query, [tenantId, flowId]);
    return result.rows[0];
  },

  async getActiveFlowsByTrigger(tenantId, triggerType, keyword = null) {
    let query;
    let params;
    
    if (triggerType === 'keyword' && keyword) {
      query = `
        SELECT * FROM flows 
        WHERE tenant_id = $1::uuid 
          AND status = 'active' 
          AND trigger_type = 'keyword'
          AND trigger_config->>'keywords' ILIKE $2
        ORDER BY created_at ASC
      `;
      params = [tenantId, `%${keyword}%`];
    } else {
      query = `
        SELECT * FROM flows 
        WHERE tenant_id = $1::uuid 
          AND status = 'active' 
          AND trigger_type = $2
        ORDER BY created_at ASC
      `;
      params = [tenantId, triggerType];
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  },

  async createFlowExecution(data) {
    const query = `
      INSERT INTO flow_executions (
        flow_id, tenant_id, conversation_id, contact_id,
        trigger_data, status, current_node_id, execution_data
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8
      ) RETURNING *
    `;
    const result = await pool.query(query, [
      data.flow_id, data.tenant_id, data.conversation_id, data.contact_id,
      JSON.stringify(data.trigger_data || {}),
      data.status || 'running',
      data.current_node_id,
      JSON.stringify(data.execution_data || {})
    ]);
    
    // Update flow stats
    await pool.query(`
      UPDATE flows 
      SET stats = jsonb_set(
        stats, 
        '{executions}', 
        to_jsonb(COALESCE((stats->>'executions')::int, 0) + 1)
      )
      WHERE id = $1::uuid
    `, [data.flow_id]);
    
    return result.rows[0];
  },

  async updateFlowExecution(executionId, updates) {
    const query = `
      UPDATE flow_executions SET
        status = COALESCE($2, status),
        current_node_id = COALESCE($3, current_node_id),
        execution_data = COALESCE($4, execution_data),
        error_message = COALESCE($5, error_message),
        completed_at = CASE WHEN $2 IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END,
        duration_ms = CASE WHEN $2 IN ('completed', 'failed', 'cancelled') 
          THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000 
          ELSE duration_ms END
      WHERE id = $1::uuid
      RETURNING *
    `;
    const result = await pool.query(query, [
      executionId,
      updates.status,
      updates.current_node_id,
      updates.execution_data ? JSON.stringify(updates.execution_data) : null,
      updates.error_message
    ]);
    
    // Update flow success rate if completed
    if (updates.status === 'completed') {
      const execution = result.rows[0];
      await pool.query(`
        UPDATE flows 
        SET stats = jsonb_set(
          stats, 
          '{successRate}', 
          to_jsonb(
            ROUND(
              (
                SELECT COUNT(*)::numeric * 100 / NULLIF(COUNT(*), 0)
                FROM flow_executions
                WHERE flow_id = $1::uuid AND status = 'completed'
              ) / 
              NULLIF((
                SELECT COUNT(*)::numeric
                FROM flow_executions
                WHERE flow_id = $1::uuid
              ), 0),
              1
            )
          )
        )
        WHERE id = $1::uuid
      `, [execution.flow_id]);
    }
    
    return result.rows[0];
  },

  async addFlowExecutionLog(log) {
    const query = `
      INSERT INTO flow_execution_logs (
        execution_id, node_id, node_type, input_data,
        output_data, status, error_message, duration_ms
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *
    `;
    const result = await pool.query(query, [
      log.execution_id, log.node_id, log.node_type,
      JSON.stringify(log.input_data || {}),
      JSON.stringify(log.output_data || {}),
      log.status, log.error_message, log.duration_ms
    ]);
    return result.rows[0];
  }
};

module.exports = { pool, db };