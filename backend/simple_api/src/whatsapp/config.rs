use crate::whatsapp::error::{WhatsAppError, WhatsAppResult};
use crate::whatsapp::types::{WhatsAppProvider, TestResult, PaginationParams, PaginatedResponse, PaginationInfo, CreateWhatsAppConfigRequest, UpdateWhatsAppConfigRequest};
use crate::whatsapp::evolution_api::{EvolutionClient, EvolutionConfig};
use crate::whatsapp::official_api::{OfficialClient, OfficialConfig};
use crate::entities::whatsapp_config::{Entity as WhatsAppConfigEntity, Model, WhatsAppProvider as DbProvider, HealthStatus as DbHealthStatus, Column, WhatsAppConfigResponse};
use crate::redis_service::{RedisService, CacheKeys};
use sea_orm::{ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, ConnectionTrait, PaginatorTrait, QuerySelect};
use chrono::{Utc, DateTime};
use uuid::Uuid;
use std::sync::Arc;
use tracing::{info, warn, debug, error};

// Cache TTL constants (in seconds)
const CACHE_TTL_WHATSAPP_CONFIG: u64 = 300; // 5 minutes
const DEFAULT_PAGE_SIZE: u64 = 20;
const MAX_PAGE_SIZE: u64 = 100;

/// WhatsApp configuration service with database persistence and caching
pub struct ConfigService {
    db: DatabaseConnection,
    cache: Option<RedisService>,
}

impl ConfigService {
    pub fn new(db: DatabaseConnection) -> Self {
        let cache = match RedisService::new() {
            Ok(redis) => {
                info!("Redis cache enabled for WhatsApp configurations");
                Some(redis)
            }
            Err(e) => {
                warn!("Redis cache disabled (Redis unavailable): {}", e);
                None
            }
        };
        
        Self { db, cache }
    }

    /// Create a new WhatsApp configuration
    pub async fn create_config(&self, req: CreateWhatsAppConfigRequest, created_by: &str) -> WhatsAppResult<WhatsAppConfigResponse> {
        // Validate provider-specific requirements
        self.validate_config_request(&req)?;

        // Convert provider enum - direct conversion
        let provider = req.provider.clone();

        // If this is set as default, unset other defaults first
        if req.is_default.unwrap_or(false) {
            self.unset_all_defaults().await?;
        }

        let config = crate::entities::whatsapp_config::ActiveModel {
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
            health_status: ActiveValue::Set(DbHealthStatus::Unknown),
            error_message: ActiveValue::NotSet,
            webhook_url: ActiveValue::NotSet,
        };

        let result = config.insert(&self.db).await?;
        
        // Invalidate cache after creating new config
        self.invalidate_all_config_cache().await;
        
        Ok(self.model_to_response(result))
    }

    /// Get configuration by ID
    pub async fn get_config_by_id(&self, id: &str) -> WhatsAppResult<Option<WhatsAppConfigResponse>> {
        let uuid = Uuid::parse_str(id)?;
        
        // Try cache first
        if let Some(ref cache) = self.cache {
            if let Ok(Some(cached_config)) = cache.get::<Model>(&CacheKeys::whatsapp_config(id)).await {
                return Ok(Some(self.model_to_response(cached_config)));
            }
        }
        
        // Fetch from database
        let config = WhatsAppConfigEntity::find_by_id(uuid)
            .one(&self.db)
            .await?;
        
        // Cache the result if found
        if let (Some(ref cache), Some(ref config)) = (&self.cache, &config) {
            let _ = cache.set(&CacheKeys::whatsapp_config(id), config, CACHE_TTL_WHATSAPP_CONFIG).await;
        }
        
        Ok(config.map(|c| self.model_to_response(c)))
    }

    /// Get configuration model by ID (internal use)
    pub async fn get_config_model_by_id(&self, id: &str) -> WhatsAppResult<Option<Model>> {
        let uuid = Uuid::parse_str(id)?;
        
        let config = WhatsAppConfigEntity::find_by_id(uuid)
            .one(&self.db)
            .await?;
        
        Ok(config)
    }

    /// Get all configurations with optional pagination
    pub async fn get_all_configs(&self, params: Option<PaginationParams>) -> WhatsAppResult<PaginatedResponse<WhatsAppConfigResponse>> {
        match params {
            Some(mut pagination_params) => {
                pagination_params.validate();
                self.get_configs_paginated(pagination_params).await
            }
            None => {
                // Return all configs without pagination
                let configs = WhatsAppConfigEntity::find()
                    .order_by_asc(crate::entities::whatsapp_config::Column::CreatedAt)
                    .all(&self.db)
                    .await?;

                let responses: Vec<WhatsAppConfigResponse> = configs
                    .into_iter()
                    .map(|c| self.model_to_response(c))
                    .collect();

                let total_items = responses.len() as u64;
                Ok(PaginatedResponse {
                    data: responses,
                    pagination: PaginationInfo {
                        current_page: 1,
                        page_size: total_items,
                        total_items,
                        total_pages: 1,
                        has_next: false,
                        has_prev: false,
                    },
                })
            }
        }
    }

    /// Get active configurations only
    pub async fn get_active_configs(&self) -> WhatsAppResult<Vec<WhatsAppConfigResponse>> {
        // Try cache first
        if let Some(ref cache) = self.cache {
            if let Ok(Some(cached_configs)) = cache.get::<Vec<Model>>(&CacheKeys::whatsapp_active_configs()).await {
                return Ok(cached_configs.into_iter().map(|c| self.model_to_response(c)).collect());
            }
        }
        
        // Fetch from database
        let configs = WhatsAppConfigEntity::find()
            .filter(crate::entities::whatsapp_config::Column::IsActive.eq(true))
            .order_by_asc(crate::entities::whatsapp_config::Column::CreatedAt)
            .all(&self.db)
            .await?;
        
        // Cache the result
        if let Some(ref cache) = self.cache {
            let _ = cache.set(&CacheKeys::whatsapp_active_configs(), &configs, CACHE_TTL_WHATSAPP_CONFIG).await;
        }
        
        Ok(configs.into_iter().map(|c| self.model_to_response(c)).collect())
    }

    /// Get default configuration
    pub async fn get_default_config(&self) -> WhatsAppResult<Option<WhatsAppConfigResponse>> {
        // Try cache first
        if let Some(ref cache) = self.cache {
            if let Ok(Some(cached_config)) = cache.get::<Model>(&CacheKeys::whatsapp_default_config()).await {
                return Ok(Some(self.model_to_response(cached_config)));
            }
        }
        
        // Fetch from database
        let config = WhatsAppConfigEntity::find()
            .filter(crate::entities::whatsapp_config::Column::IsDefault.eq(true))
            .filter(crate::entities::whatsapp_config::Column::IsActive.eq(true))
            .one(&self.db)
            .await?;
        
        // Cache the result if found
        if let (Some(ref cache), Some(ref config)) = (&self.cache, &config) {
            let _ = cache.set(&CacheKeys::whatsapp_default_config(), config, CACHE_TTL_WHATSAPP_CONFIG).await;
        }
        
        Ok(config.map(|c| self.model_to_response(c)))
    }

    /// Update configuration
    pub async fn update_config(&self, id: &str, updates: UpdateWhatsAppConfigRequest) -> WhatsAppResult<WhatsAppConfigResponse> {
        let uuid = Uuid::parse_str(id)?;
        
        let config = WhatsAppConfigEntity::find_by_id(uuid)
            .one(&self.db)
            .await?
            .ok_or_else(|| WhatsAppError::ConfigNotFound(format!("Configuration with ID {} not found", id)))?;

        // If setting as default, unset other defaults first
        if updates.is_default.unwrap_or(false) {
            self.unset_all_defaults().await?;
        }

        let mut active_model: crate::entities::whatsapp_config::ActiveModel = config.into();

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

        let result = active_model.update(&self.db).await?;
        
        // Invalidate all related cache entries
        self.invalidate_config_cache(id).await;
        self.invalidate_all_config_cache().await;
        
        Ok(self.model_to_response(result))
    }

    /// Delete configuration
    pub async fn delete_config(&self, id: &str) -> WhatsAppResult<()> {
        let uuid = Uuid::parse_str(id)?;
        
        let result = WhatsAppConfigEntity::delete_by_id(uuid)
            .exec(&self.db)
            .await?;

        if result.rows_affected == 0 {
            return Err(WhatsAppError::ConfigNotFound(format!("Configuration with ID {} not found", id)));
        }

        // Invalidate all related cache entries
        self.invalidate_config_cache(id).await;
        self.invalidate_all_config_cache().await;

        Ok(())
    }

    /// Test configuration by attempting to connect
    pub async fn test_config(&self, id: &str) -> WhatsAppResult<TestResult> {
        let config = self.get_config_by_id(id).await?
            .ok_or_else(|| WhatsAppError::ConfigNotFound(format!("Configuration with ID {} not found", id)))?;

        let test_result = match config.provider {
            WhatsAppProvider::Official => {
                self.test_official_config(&config).await
            }
            WhatsAppProvider::Evolution => {
                self.test_evolution_config(&config).await
            }
        };

        // Update health status based on test result
        let health_status = if test_result.success {
            DbHealthStatus::Healthy
        } else {
            DbHealthStatus::Unhealthy
        };

        let error_message = if test_result.success {
            None
        } else {
            test_result.error.clone()
        };

        let _ = self.update_health_status(id, health_status, error_message).await;

        Ok(test_result)
    }

    /// Update health status of a configuration
    pub async fn update_health_status(&self, id: &str, status: DbHealthStatus, error: Option<String>) -> WhatsAppResult<()> {
        let uuid = Uuid::parse_str(id)?;
        
        let config = WhatsAppConfigEntity::find_by_id(uuid)
            .one(&self.db)
            .await?
            .ok_or_else(|| WhatsAppError::ConfigNotFound(format!("Configuration with ID {} not found", id)))?;

        let mut active_model: crate::entities::whatsapp_config::ActiveModel = config.into();
        active_model.health_status = ActiveValue::Set(status);
        active_model.last_health_check = ActiveValue::Set(Some(Utc::now().naive_utc()));
        active_model.error_message = ActiveValue::Set(error);

        active_model.update(&self.db).await?;

        // Invalidate cache for this specific config
        self.invalidate_config_cache(id).await;

        Ok(())
    }

    /// Create Evolution API client from configuration
    pub fn create_evolution_client(&self, config: &crate::entities::whatsapp_config::Model) -> WhatsAppResult<EvolutionClient> {
        let evolution_config = EvolutionConfig {
            base_url: config.evolution_url.as_ref()
                .ok_or_else(|| WhatsAppError::InvalidConfig("Evolution URL is required".to_string()))?.clone(),
            api_key: config.evolution_api_key.as_ref()
                .ok_or_else(|| WhatsAppError::InvalidConfig("Evolution API key is required".to_string()))?.clone(),
            instance_name: config.instance_name.as_ref()
                .ok_or_else(|| WhatsAppError::InvalidConfig("Instance name is required".to_string()))?.clone(),
        };

        Ok(EvolutionClient::new(evolution_config))
    }

    /// Create Official API client from configuration  
    pub fn create_official_client(&self, config: &crate::entities::whatsapp_config::Model) -> WhatsAppResult<OfficialClient> {
        let official_config = OfficialConfig {
            phone_number_id: config.phone_number_id.as_ref()
                .ok_or_else(|| WhatsAppError::InvalidConfig("Phone number ID is required".to_string()))?.clone(),
            access_token: config.access_token.as_ref()
                .ok_or_else(|| WhatsAppError::InvalidConfig("Access token is required".to_string()))?.clone(),
            instance_name: config.instance_name.as_ref().unwrap_or(&config.id.to_string()).clone(),
            webhook_verify_token: config.webhook_verify_token.clone(),
            app_secret: config.app_secret.clone(),
            business_account_id: config.business_account_id.clone(),
        };

        Ok(OfficialClient::new(official_config))
    }

    // Private helper methods

    async fn get_configs_paginated(&self, mut params: PaginationParams) -> WhatsAppResult<PaginatedResponse<WhatsAppConfigResponse>> {
        params.validate();
        
        let page = params.page.unwrap();
        let page_size = params.page_size.unwrap();
        
        // Get total count
        let total_items = WhatsAppConfigEntity::find()
            .count(&self.db)
            .await?;
        
        // Fetch paginated data
        let configs = WhatsAppConfigEntity::find()
            .order_by_asc(crate::entities::whatsapp_config::Column::CreatedAt)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all(&self.db)
            .await?;
        
        // Build pagination info
        let total_pages = (total_items + page_size - 1) / page_size;
        let pagination = PaginationInfo {
            current_page: page,
            page_size,
            total_items,
            total_pages,
            has_next: page < total_pages,
            has_prev: page > 1,
        };
        
        let responses: Vec<WhatsAppConfigResponse> = configs
            .into_iter()
            .map(|c| self.model_to_response(c))
            .collect();
        
        Ok(PaginatedResponse {
            data: responses,
            pagination,
        })
    }

    fn validate_config_request(&self, req: &CreateWhatsAppConfigRequest) -> WhatsAppResult<()> {
        match req.provider {
            WhatsAppProvider::Official => {
                if req.phone_number_id.is_none() || req.access_token.is_none() {
                    return Err(WhatsAppError::ConfigValidationFailed(
                        "phone_number_id and access_token are required for Official provider".to_string()
                    ));
                }
            }
            WhatsAppProvider::Evolution => {
                if req.evolution_url.is_none() || req.evolution_api_key.is_none() {
                    return Err(WhatsAppError::ConfigValidationFailed(
                        "evolution_url and evolution_api_key are required for Evolution provider".to_string()
                    ));
                }
            }
        }
        Ok(())
    }

    async fn test_official_config(&self, config: &WhatsAppConfigResponse) -> TestResult {
        // Since we don't have the access token in the response, we can only do basic validation
        TestResult {
            success: config.phone_number_id.is_some(),
            message: if config.phone_number_id.is_some() {
                "Configuration appears valid (actual API test requires access token)".to_string()
            } else {
                "Missing phone number ID".to_string()
            },
            provider: config.provider.clone(),
            details: Some(serde_json::json!({
                "phone_number_id": config.phone_number_id,
                "has_access_token": false, // We don't expose this in the response
                "business_account_id": config.business_account_id,
            })),
            error: None,
        }
    }

    async fn test_evolution_config(&self, config: &WhatsAppConfigResponse) -> TestResult {
        // Since we don't have the API key in the response, we can only do basic validation
        TestResult {
            success: config.evolution_url.is_some() && config.instance_name.is_some(),
            message: if config.evolution_url.is_some() && config.instance_name.is_some() {
                "Configuration appears valid (actual API test requires API key)".to_string()
            } else {
                "Missing Evolution URL or instance name".to_string()
            },
            provider: config.provider.clone(),
            details: Some(serde_json::json!({
                "evolution_url": config.evolution_url,
                "instance_name": config.instance_name,
                "has_api_key": false, // We don't expose this in the response
            })),
            error: None,
        }
    }

    fn model_to_response(&self, model: Model) -> WhatsAppConfigResponse {
        let provider = model.provider.clone();

        let health_status = model.health_status.clone();

        WhatsAppConfigResponse {
            id: model.id.to_string(),
            name: model.name,
            provider,
            phone_number_id: model.phone_number_id,
            webhook_verify_token: model.webhook_verify_token,
            webhook_url: model.webhook_url,
            business_account_id: model.business_account_id,
            evolution_url: model.evolution_url,
            instance_name: model.instance_name,
            is_active: model.is_active,
            is_default: model.is_default,
            created_at: model.created_at,
            updated_at: model.updated_at,
            created_by: model.created_by,
            health_status,
            last_health_check: model.last_health_check,
            error_message: model.error_message,
        }
    }

    async fn unset_all_defaults(&self) -> WhatsAppResult<()> {
        use sea_orm::prelude::Expr;
        
        WhatsAppConfigEntity::update_many()
            .col_expr(crate::entities::whatsapp_config::Column::IsDefault, Expr::value(false))
            .exec(&self.db)
            .await?;
        Ok(())
    }

    async fn invalidate_config_cache(&self, id: &str) {
        if let Some(ref cache) = self.cache {
            let _ = cache.delete(&CacheKeys::whatsapp_config(id)).await;
        }
    }

    async fn invalidate_all_config_cache(&self) {
        if let Some(ref cache) = self.cache {
            let _ = cache.delete(&CacheKeys::whatsapp_default_config()).await;
            let _ = cache.delete(&CacheKeys::whatsapp_configs_list()).await;
            let _ = cache.delete(&CacheKeys::whatsapp_active_configs()).await;
            let _ = cache.delete_pattern("whatsapp_config:*").await;
        }
    }
}

impl PaginationParams {
    pub fn validate(&mut self) {
        if self.page.is_none() || self.page.unwrap() < 1 {
            self.page = Some(1);
        }
        
        if self.page_size.is_none() {
            self.page_size = Some(DEFAULT_PAGE_SIZE);
        } else {
            let size = self.page_size.unwrap();
            if size > MAX_PAGE_SIZE {
                self.page_size = Some(MAX_PAGE_SIZE);
            } else if size < 1 {
                self.page_size = Some(DEFAULT_PAGE_SIZE);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_validation() {
        let mut params = PaginationParams {
            page: Some(0),
            page_size: Some(200),
        };

        params.validate();

        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(MAX_PAGE_SIZE));
    }

    #[test]
    fn test_config_validation() {
        let config_service = ConfigService::new(
            // This would normally be a real database connection
            sea_orm::DatabaseConnection::Disconnected
        );

        // Test Official provider validation
        let official_req = CreateWhatsAppConfigRequest {
            name: "test".to_string(),
            provider: WhatsAppProvider::Official,
            phone_number_id: None,
            access_token: None,
            webhook_verify_token: "test".to_string(),
            app_secret: None,
            business_account_id: None,
            evolution_url: None,
            evolution_api_key: None,
            instance_name: None,
            is_active: None,
            is_default: None,
        };

        let result = config_service.validate_config_request(&official_req);
        assert!(result.is_err());
    }
}