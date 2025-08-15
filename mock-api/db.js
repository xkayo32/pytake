const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'pytake_admin',
  host: 'postgres',
  database: process.env.POSTGRES_DB || 'pytake_production',
  password: process.env.POSTGRES_PASSWORD || 'Odc7/ffNnTnG4hkbwV+Sx2ZgK61rXW2r9U2o7Rd25DU=',
  port: 5432,
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
  }
};

module.exports = { pool, db };