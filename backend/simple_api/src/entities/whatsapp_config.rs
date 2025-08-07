use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use chrono::NaiveDateTime;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "whatsapp_configs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub provider: WhatsAppProvider,
    
    // Official API fields
    #[sea_orm(nullable)]
    pub phone_number_id: Option<String>,
    #[sea_orm(nullable)]
    pub access_token: Option<String>,
    #[sea_orm(nullable)]
    pub app_secret: Option<String>,
    #[sea_orm(nullable)]
    pub business_account_id: Option<String>,
    
    // Evolution API fields
    #[sea_orm(nullable)]
    pub evolution_url: Option<String>,
    #[sea_orm(nullable)]
    pub evolution_api_key: Option<String>,
    #[sea_orm(nullable)]
    pub instance_name: Option<String>,
    
    // Common fields
    pub webhook_verify_token: String,
    #[sea_orm(nullable)]
    pub webhook_url: Option<String>,
    
    // Management fields
    pub is_active: bool,
    pub is_default: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub created_by: String,
    
    // Health tracking
    #[sea_orm(nullable)]
    pub last_health_check: Option<NaiveDateTime>,
    pub health_status: HealthStatus,
    #[sea_orm(nullable)]
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(Some(50))")]
#[serde(rename_all = "lowercase")]
pub enum WhatsAppProvider {
    #[sea_orm(string_value = "official")]
    Official,
    #[sea_orm(string_value = "evolution")]
    Evolution,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(Some(20))")]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    #[sea_orm(string_value = "healthy")]
    Healthy,
    #[sea_orm(string_value = "unhealthy")]
    Unhealthy,
    #[sea_orm(string_value = "unknown")]
    Unknown,
    #[sea_orm(string_value = "inactive")]
    Inactive,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// Convert to response DTO without sensitive fields
    pub fn to_response(&self) -> WhatsAppConfigResponse {
        WhatsAppConfigResponse {
            id: self.id.to_string(),
            name: self.name.clone(),
            provider: self.provider.clone(),
            phone_number_id: self.phone_number_id.clone(),
            webhook_verify_token: self.webhook_verify_token.clone(),
            webhook_url: self.webhook_url.clone(),
            business_account_id: self.business_account_id.clone(),
            evolution_url: self.evolution_url.clone(),
            instance_name: self.instance_name.clone(),
            is_active: self.is_active,
            is_default: self.is_default,
            created_at: self.created_at,
            updated_at: self.updated_at,
            created_by: self.created_by.clone(),
            health_status: self.health_status.clone(),
            last_health_check: self.last_health_check,
            error_message: self.error_message.clone(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct WhatsAppConfigResponse {
    pub id: String,
    pub name: String,
    pub provider: WhatsAppProvider,
    pub phone_number_id: Option<String>,
    pub webhook_verify_token: String,
    pub webhook_url: Option<String>,
    pub business_account_id: Option<String>,
    pub evolution_url: Option<String>,
    pub instance_name: Option<String>,
    pub is_active: bool,
    pub is_default: bool,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
    pub created_by: String,
    pub health_status: HealthStatus,
    pub last_health_check: Option<NaiveDateTime>,
    pub error_message: Option<String>,
}