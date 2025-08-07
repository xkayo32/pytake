use sea_orm::{ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, ConnectionTrait};
use chrono::Utc;
use uuid::Uuid;
use crate::entities::whatsapp_config::{self, Entity as WhatsAppConfig, Model, WhatsAppProvider, HealthStatus};
use crate::whatsapp_management::{CreateWhatsAppConfigRequest, UpdateWhatsAppConfigRequest};

pub struct WhatsAppDbService {
    db: DatabaseConnection,
}

impl WhatsAppDbService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create_config(&self, req: CreateWhatsAppConfigRequest, created_by: &str) -> Result<Model, String> {
        // Convert from management enum to entity enum
        let provider = match req.provider {
            crate::whatsapp_management::WhatsAppProvider::Official => {
                if req.phone_number_id.is_none() || req.access_token.is_none() {
                    return Err("phone_number_id and access_token are required for Official provider".to_string());
                }
                WhatsAppProvider::Official
            }
            crate::whatsapp_management::WhatsAppProvider::Evolution => {
                if req.evolution_url.is_none() || req.evolution_api_key.is_none() {
                    return Err("evolution_url and evolution_api_key are required for Evolution provider".to_string());
                }
                WhatsAppProvider::Evolution
            }
        };

        // If this is set as default, unset other defaults first
        if req.is_default.unwrap_or(false) {
            self.unset_all_defaults().await.map_err(|e| format!("Failed to unset defaults: {}", e))?;
        }

        let config = whatsapp_config::ActiveModel {
            id: ActiveValue::Set(Uuid::new_v4()),
            name: ActiveValue::Set(req.name),
            provider: ActiveValue::Set(provider),
            phone_number_id: ActiveValue::Set(req.phone_number_id),
            access_token: ActiveValue::Set(req.access_token),
            webhook_verify_token: ActiveValue::Set(req.webhook_verify_token),
            app_secret: ActiveValue::Set(req.app_secret),
            business_account_id: ActiveValue::Set(req.business_account_id),
            evolution_url: ActiveValue::Set(req.evolution_url),
            evolution_api_key: ActiveValue::Set(req.evolution_api_key),
            instance_name: ActiveValue::Set(req.instance_name),
            is_active: ActiveValue::Set(req.is_active.unwrap_or(true)),
            is_default: ActiveValue::Set(req.is_default.unwrap_or(false)),
            created_at: ActiveValue::Set(Utc::now().naive_utc()),
            updated_at: ActiveValue::Set(Utc::now().naive_utc()),
            created_by: ActiveValue::Set(created_by.to_string()),
            last_health_check: ActiveValue::NotSet,
            health_status: ActiveValue::Set(HealthStatus::Unknown),
            error_message: ActiveValue::NotSet,
            webhook_url: ActiveValue::NotSet,
        };

        config.insert(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn get_config_by_id(&self, id: &str) -> Result<Option<Model>, String> {
        let uuid = Uuid::parse_str(id).map_err(|_| "Invalid UUID format")?;
        
        WhatsAppConfig::find_by_id(uuid)
            .one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn get_all_configs(&self) -> Result<Vec<Model>, String> {
        WhatsAppConfig::find()
            .order_by_asc(whatsapp_config::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn get_active_configs(&self) -> Result<Vec<Model>, String> {
        WhatsAppConfig::find()
            .filter(whatsapp_config::Column::IsActive.eq(true))
            .order_by_asc(whatsapp_config::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn get_default_config(&self) -> Result<Option<Model>, String> {
        WhatsAppConfig::find()
            .filter(whatsapp_config::Column::IsDefault.eq(true))
            .filter(whatsapp_config::Column::IsActive.eq(true))
            .one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn get_config_by_phone_id(&self, phone_id: &str) -> Result<Option<Model>, String> {
        WhatsAppConfig::find()
            .filter(whatsapp_config::Column::IsActive.eq(true))
            .filter(whatsapp_config::Column::PhoneNumberId.eq(phone_id))
            .one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn get_config_by_instance(&self, instance_name: &str) -> Result<Option<Model>, String> {
        WhatsAppConfig::find()
            .filter(whatsapp_config::Column::IsActive.eq(true))
            .filter(whatsapp_config::Column::InstanceName.eq(instance_name))
            .one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn update_config(&self, id: &str, updates: UpdateWhatsAppConfigRequest) -> Result<Model, String> {
        let uuid = Uuid::parse_str(id).map_err(|_| "Invalid UUID format")?;
        
        let config = WhatsAppConfig::find_by_id(uuid)
            .one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or("Configuration not found")?;

        // If setting as default, unset other defaults first
        if updates.is_default.unwrap_or(false) {
            self.unset_all_defaults().await.map_err(|e| format!("Failed to unset defaults: {}", e))?;
        }

        let mut active_model: whatsapp_config::ActiveModel = config.into();

        // Update fields
        if let Some(name) = updates.name {
            active_model.name = ActiveValue::Set(name);
        }
        if let Some(phone_number_id) = updates.phone_number_id {
            active_model.phone_number_id = ActiveValue::Set(Some(phone_number_id));
        }
        if let Some(access_token) = updates.access_token {
            active_model.access_token = ActiveValue::Set(Some(access_token));
        }
        if let Some(webhook_verify_token) = updates.webhook_verify_token {
            active_model.webhook_verify_token = ActiveValue::Set(webhook_verify_token);
        }
        if let Some(app_secret) = updates.app_secret {
            active_model.app_secret = ActiveValue::Set(Some(app_secret));
        }
        if let Some(business_account_id) = updates.business_account_id {
            active_model.business_account_id = ActiveValue::Set(Some(business_account_id));
        }
        if let Some(evolution_url) = updates.evolution_url {
            active_model.evolution_url = ActiveValue::Set(Some(evolution_url));
        }
        if let Some(evolution_api_key) = updates.evolution_api_key {
            active_model.evolution_api_key = ActiveValue::Set(Some(evolution_api_key));
        }
        if let Some(instance_name) = updates.instance_name {
            active_model.instance_name = ActiveValue::Set(Some(instance_name));
        }
        if let Some(is_active) = updates.is_active {
            active_model.is_active = ActiveValue::Set(is_active);
        }
        if let Some(is_default) = updates.is_default {
            active_model.is_default = ActiveValue::Set(is_default);
        }

        active_model.updated_at = ActiveValue::Set(Utc::now().naive_utc());

        active_model.update(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn delete_config(&self, id: &str) -> Result<(), String> {
        let uuid = Uuid::parse_str(id).map_err(|_| "Invalid UUID format")?;
        
        let result = WhatsAppConfig::delete_by_id(uuid)
            .exec(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        if result.rows_affected == 0 {
            return Err("Configuration not found".to_string());
        }

        Ok(())
    }

    pub async fn update_health_status(&self, id: &str, status: HealthStatus, error: Option<String>) -> Result<(), String> {
        let uuid = Uuid::parse_str(id).map_err(|_| "Invalid UUID format")?;
        
        let config = WhatsAppConfig::find_by_id(uuid)
            .one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or("Configuration not found")?;

        let mut active_model: whatsapp_config::ActiveModel = config.into();
        active_model.health_status = ActiveValue::Set(status);
        active_model.last_health_check = ActiveValue::Set(Some(Utc::now().naive_utc()));
        active_model.error_message = ActiveValue::Set(error);

        active_model.update(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        Ok(())
    }

    async fn unset_all_defaults(&self) -> Result<(), sea_orm::DbErr> {
        use sea_orm::prelude::Expr;
        
        WhatsAppConfig::update_many()
            .col_expr(whatsapp_config::Column::IsDefault, Expr::value(false))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    /// Run database migration to create table
    pub async fn migrate(&self) -> Result<(), String> {
        // Create the migration SQL directly since include_str! doesn't work in Docker
        let migration_sql = r#"
-- Create whatsapp_configs table
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('official', 'evolution')),
    
    -- Official API fields
    phone_number_id VARCHAR(255),
    access_token TEXT,
    app_secret VARCHAR(255),
    business_account_id VARCHAR(255),
    
    -- Evolution API fields
    evolution_url VARCHAR(500),
    evolution_api_key VARCHAR(255),
    instance_name VARCHAR(255),
    
    -- Common fields
    webhook_verify_token VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(500),
    
    -- Management fields
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system',
    
    -- Health tracking
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'inactive')),
    error_message TEXT,
    
    -- Constraints
    UNIQUE(name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_active ON whatsapp_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_default ON whatsapp_configs(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_provider ON whatsapp_configs(provider);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_phone_id ON whatsapp_configs(phone_number_id) WHERE phone_number_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_instance ON whatsapp_configs(instance_name) WHERE instance_name IS NOT NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_configs_updated_at 
    BEFORE UPDATE ON whatsapp_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default configuration from environment (for migration)
INSERT INTO whatsapp_configs (
    name, 
    provider, 
    phone_number_id, 
    access_token, 
    webhook_verify_token,
    is_active,
    is_default,
    created_by
) VALUES (
    'Default Official API',
    'official',
    '574293335763643',
    'EAAJLLK95RIUBPBxhYMQQGrHFhhVTgGrdMKLDbTXK3p1udVslhZBkVMgzF4MfBIklsRVZAKXu9sHqpELTaZAZAEDuctKSFFGnPYDXQUU1tq9fa2M20vGtApxp5zdIH39pQyIxEUwm4Mm2e7EfNTOtqnNVSoZAFoJZBv0sheUaMyCXSKzOhr0U9vQMCrN1kBiRMkqQZDZD',
    'verify_token_dev_123',
    true,
    true,
    'migration'
) ON CONFLICT (name) DO NOTHING;
"#;
        
        self.db.execute_unprepared(migration_sql)
            .await
            .map_err(|e| format!("Migration failed: {}", e))?;
            
        Ok(())
    }
}