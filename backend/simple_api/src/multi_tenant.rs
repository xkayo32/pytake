use actix_web::{web, HttpResponse, Result, dev::ServiceRequest};
use actix_web_httpauth::extractors::bearer::BearerAuth;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use utoipa::ToSchema;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Tenant {
    pub id: Uuid,
    pub name: String,
    pub subdomain: String,
    pub plan: TenantPlan,
    pub status: TenantStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub limits: TenantLimits,
    pub settings: TenantSettings,
    pub billing_info: BillingInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum TenantPlan {
    Free,
    Starter,
    Pro,
    Enterprise,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum TenantStatus {
    Active,
    Suspended,
    Trial,
    Cancelled,
    PendingPayment,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TenantLimits {
    pub max_messages_per_month: u32,
    pub max_contacts: u32,
    pub max_users: u32,
    pub max_api_calls_per_minute: u32,
    pub max_webhook_endpoints: u32,
    pub max_storage_mb: u32,
    pub max_automations: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TenantSettings {
    pub timezone: String,
    pub language: String,
    pub webhook_secret: String,
    pub custom_domain: Option<String>,
    pub sso_enabled: bool,
    pub two_factor_required: bool,
    pub ip_whitelist: Vec<String>,
    pub data_retention_days: u32,
    pub encryption_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BillingInfo {
    pub plan_price: f64,
    pub billing_cycle: BillingCycle,
    pub next_billing_date: DateTime<Utc>,
    pub payment_method: Option<String>,
    pub discount_percent: f64,
    pub trial_end_date: Option<DateTime<Utc>>,
    pub usage_overage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum BillingCycle {
    Monthly,
    Yearly,
    PayAsYouGo,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TenantUser {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub email: String,
    pub role: TenantRole,
    pub permissions: Vec<Permission>,
    pub status: UserStatus,
    pub last_login: Option<DateTime<Utc>>,
    pub two_factor_enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum TenantRole {
    Owner,
    Admin,
    Manager,
    User,
    ReadOnly,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub enum Permission {
    ManageUsers,
    ManageBilling,
    ManageWhatsApp,
    ManageAutomations,
    ViewAnalytics,
    ManageIntegrations,
    ManageApiKeys,
    ViewAuditLogs,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum UserStatus {
    Active,
    Pending,
    Suspended,
    Inactive,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TenantApiKey {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub key_hash: String,
    pub permissions: Vec<String>,
    pub rate_limit: u32,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_used: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UsageMetrics {
    pub tenant_id: Uuid,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub messages_sent: u32,
    pub api_calls: u32,
    pub storage_used_mb: u32,
    pub active_users: u32,
    pub webhook_calls: u32,
    pub automation_runs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Invoice {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub amount: f64,
    pub currency: String,
    pub status: InvoiceStatus,
    pub billing_period_start: DateTime<Utc>,
    pub billing_period_end: DateTime<Utc>,
    pub due_date: DateTime<Utc>,
    pub paid_date: Option<DateTime<Utc>>,
    pub line_items: Vec<LineItem>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum InvoiceStatus {
    Draft,
    Pending,
    Paid,
    Overdue,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct LineItem {
    pub description: String,
    pub quantity: u32,
    pub unit_price: f64,
    pub total: f64,
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTenantRequest {
    pub name: String,
    pub subdomain: String,
    pub plan: TenantPlan,
    pub owner_email: String,
    pub owner_name: String,
    pub company_size: Option<String>,
    pub use_case: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateTenantRequest {
    pub name: Option<String>,
    pub settings: Option<TenantSettings>,
    pub limits: Option<TenantLimits>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddUserRequest {
    pub email: String,
    pub name: String,
    pub role: TenantRole,
    pub permissions: Vec<Permission>,
    pub send_invite: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpgradePlanRequest {
    pub new_plan: TenantPlan,
    pub billing_cycle: BillingCycle,
    pub payment_method: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateApiKeyRequest {
    pub name: String,
    pub permissions: Vec<String>,
    pub rate_limit: u32,
    pub expires_in_days: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ApiKeyResponse {
    pub id: Uuid,
    pub name: String,
    pub key: String, // Only returned once on creation
    pub permissions: Vec<String>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TenantResponse {
    pub tenant: Tenant,
    pub usage: UsageMetrics,
    pub users_count: u32,
    pub api_keys_count: u32,
}

// ============================================================================
// Multi-Tenant Context
// ============================================================================

#[derive(Debug, Clone)]
pub struct TenantContext {
    pub tenant_id: Uuid,
    pub tenant: Tenant,
    pub user_id: Option<Uuid>,
    pub user_role: Option<TenantRole>,
    pub api_key_id: Option<Uuid>,
    pub permissions: Vec<Permission>,
}

impl TenantContext {
    pub fn has_permission(&self, permission: &Permission) -> bool {
        self.permissions.contains(permission)
    }

    pub fn is_owner(&self) -> bool {
        matches!(self.user_role, Some(TenantRole::Owner))
    }

    pub fn is_admin(&self) -> bool {
        matches!(self.user_role, Some(TenantRole::Owner | TenantRole::Admin))
    }

    pub fn can_manage_users(&self) -> bool {
        self.has_permission(&Permission::ManageUsers) || self.is_admin()
    }

    pub fn can_manage_billing(&self) -> bool {
        self.has_permission(&Permission::ManageBilling) || self.is_owner()
    }
}

// ============================================================================
// Tenant Service
// ============================================================================

pub struct TenantService;

impl TenantService {
    pub async fn create_tenant(&self, request: CreateTenantRequest) -> Result<TenantResponse, TenantError> {
        // Validate subdomain uniqueness
        if self.subdomain_exists(&request.subdomain).await? {
            return Err(TenantError::SubdomainTaken);
        }

        let tenant_id = Uuid::new_v4();
        let now = Utc::now();

        // Create default limits based on plan
        let limits = self.get_plan_limits(&request.plan);
        
        // Generate secure keys
        let webhook_secret = self.generate_secure_key();
        let encryption_key = self.generate_encryption_key();

        let tenant = Tenant {
            id: tenant_id,
            name: request.name,
            subdomain: request.subdomain,
            plan: request.plan.clone(),
            status: TenantStatus::Trial,
            created_at: now,
            updated_at: now,
            limits,
            settings: TenantSettings {
                timezone: "UTC".to_string(),
                language: "en".to_string(),
                webhook_secret,
                custom_domain: None,
                sso_enabled: false,
                two_factor_required: false,
                ip_whitelist: vec![],
                data_retention_days: 365,
                encryption_key,
            },
            billing_info: BillingInfo {
                plan_price: self.get_plan_price(&request.plan),
                billing_cycle: BillingCycle::Monthly,
                next_billing_date: now + chrono::Duration::days(30),
                payment_method: None,
                discount_percent: 0.0,
                trial_end_date: Some(now + chrono::Duration::days(14)),
                usage_overage: 0.0,
            },
        };

        // Save tenant to database
        self.save_tenant(&tenant).await?;

        // Create owner user
        self.create_owner_user(tenant_id, &request.owner_email, &request.owner_name).await?;

        // Initialize tenant resources
        self.initialize_tenant_resources(tenant_id).await?;

        let usage = self.get_current_usage(tenant_id).await?;
        
        Ok(TenantResponse {
            tenant,
            usage,
            users_count: 1,
            api_keys_count: 0,
        })
    }

    pub async fn get_tenant(&self, tenant_id: Uuid) -> Result<TenantResponse, TenantError> {
        let tenant = self.find_tenant_by_id(tenant_id).await?
            .ok_or(TenantError::NotFound)?;
        
        let usage = self.get_current_usage(tenant_id).await?;
        let users_count = self.count_tenant_users(tenant_id).await?;
        let api_keys_count = self.count_tenant_api_keys(tenant_id).await?;

        Ok(TenantResponse {
            tenant,
            usage,
            users_count,
            api_keys_count,
        })
    }

    pub async fn update_tenant(&self, tenant_id: Uuid, request: UpdateTenantRequest) -> Result<TenantResponse, TenantError> {
        let mut tenant = self.find_tenant_by_id(tenant_id).await?
            .ok_or(TenantError::NotFound)?;

        if let Some(name) = request.name {
            tenant.name = name;
        }

        if let Some(settings) = request.settings {
            tenant.settings = settings;
        }

        if let Some(limits) = request.limits {
            tenant.limits = limits;
        }

        tenant.updated_at = Utc::now();
        
        self.save_tenant(&tenant).await?;
        
        self.get_tenant(tenant_id).await
    }

    pub async fn add_user(&self, tenant_id: Uuid, request: AddUserRequest) -> Result<TenantUser, TenantError> {
        // Check if user limit is reached
        let tenant = self.find_tenant_by_id(tenant_id).await?
            .ok_or(TenantError::NotFound)?;
        
        let current_users = self.count_tenant_users(tenant_id).await?;
        if current_users >= tenant.limits.max_users {
            return Err(TenantError::UserLimitReached);
        }

        // Check if user already exists
        if self.user_exists_in_tenant(tenant_id, &request.email).await? {
            return Err(TenantError::UserAlreadyExists);
        }

        let user = TenantUser {
            id: Uuid::new_v4(),
            tenant_id,
            email: request.email.clone(),
            role: request.role,
            permissions: request.permissions,
            status: if request.send_invite { UserStatus::Pending } else { UserStatus::Active },
            last_login: None,
            two_factor_enabled: false,
            created_at: Utc::now(),
        };

        self.save_tenant_user(&user).await?;

        if request.send_invite {
            self.send_user_invitation(&user, &request.name).await?;
        }

        Ok(user)
    }

    pub async fn upgrade_plan(&self, tenant_id: Uuid, request: UpgradePlanRequest) -> Result<TenantResponse, TenantError> {
        let mut tenant = self.find_tenant_by_id(tenant_id).await?
            .ok_or(TenantError::NotFound)?;

        // Validate upgrade path
        if !self.can_upgrade_to(&tenant.plan, &request.new_plan) {
            return Err(TenantError::InvalidUpgrade);
        }

        // Calculate new pricing
        let new_price = self.get_plan_price(&request.new_plan);
        let new_limits = self.get_plan_limits(&request.new_plan);

        // Update tenant
        tenant.plan = request.new_plan;
        tenant.limits = new_limits;
        tenant.billing_info.plan_price = new_price;
        tenant.billing_info.billing_cycle = request.billing_cycle;
        tenant.status = TenantStatus::Active;
        tenant.updated_at = Utc::now();

        // Process payment if needed
        if new_price > 0.0 {
            self.process_payment(tenant_id, new_price, &request.payment_method).await?;
        }

        self.save_tenant(&tenant).await?;

        self.get_tenant(tenant_id).await
    }

    pub async fn create_api_key(&self, tenant_id: Uuid, request: CreateApiKeyRequest) -> Result<ApiKeyResponse, TenantError> {
        let tenant = self.find_tenant_by_id(tenant_id).await?
            .ok_or(TenantError::NotFound)?;

        let current_keys = self.count_tenant_api_keys(tenant_id).await?;
        if current_keys >= tenant.limits.max_webhook_endpoints {
            return Err(TenantError::ApiKeyLimitReached);
        }

        let key = self.generate_api_key();
        let key_hash = self.hash_api_key(&key);
        
        let expires_at = request.expires_in_days.map(|days| {
            Utc::now() + chrono::Duration::days(days as i64)
        });

        let api_key = TenantApiKey {
            id: Uuid::new_v4(),
            tenant_id,
            name: request.name,
            key_hash,
            permissions: request.permissions.clone(),
            rate_limit: request.rate_limit,
            expires_at,
            last_used: None,
            created_at: Utc::now(),
            is_active: true,
        };

        self.save_api_key(&api_key).await?;

        Ok(ApiKeyResponse {
            id: api_key.id,
            name: api_key.name,
            key,
            permissions: request.permissions,
            expires_at,
        })
    }

    pub async fn get_usage_metrics(&self, tenant_id: Uuid, period_days: u32) -> Result<UsageMetrics, TenantError> {
        let end_date = Utc::now();
        let start_date = end_date - chrono::Duration::days(period_days as i64);

        // This would query your database for actual usage metrics
        Ok(UsageMetrics {
            tenant_id,
            period_start: start_date,
            period_end: end_date,
            messages_sent: 0, // Query from database
            api_calls: 0,
            storage_used_mb: 0,
            active_users: 0,
            webhook_calls: 0,
            automation_runs: 0,
        })
    }

    pub async fn get_billing_info(&self, tenant_id: Uuid) -> Result<BillingInfo, TenantError> {
        let tenant = self.find_tenant_by_id(tenant_id).await?
            .ok_or(TenantError::NotFound)?;
        
        Ok(tenant.billing_info)
    }

    // Helper methods (would be implemented with actual database operations)
    async fn subdomain_exists(&self, _subdomain: &str) -> Result<bool, TenantError> {
        Ok(false) // Implement database check
    }

    async fn save_tenant(&self, _tenant: &Tenant) -> Result<(), TenantError> {
        Ok(()) // Implement database save
    }

    async fn find_tenant_by_id(&self, _tenant_id: Uuid) -> Result<Option<Tenant>, TenantError> {
        Ok(None) // Implement database query
    }

    async fn create_owner_user(&self, _tenant_id: Uuid, _email: &str, _name: &str) -> Result<(), TenantError> {
        Ok(()) // Implement user creation
    }

    async fn initialize_tenant_resources(&self, _tenant_id: Uuid) -> Result<(), TenantError> {
        Ok(()) // Initialize default resources, databases, etc.
    }

    async fn get_current_usage(&self, tenant_id: Uuid) -> Result<UsageMetrics, TenantError> {
        self.get_usage_metrics(tenant_id, 30).await
    }

    async fn count_tenant_users(&self, _tenant_id: Uuid) -> Result<u32, TenantError> {
        Ok(0) // Implement database count
    }

    async fn count_tenant_api_keys(&self, _tenant_id: Uuid) -> Result<u32, TenantError> {
        Ok(0) // Implement database count
    }

    async fn user_exists_in_tenant(&self, _tenant_id: Uuid, _email: &str) -> Result<bool, TenantError> {
        Ok(false) // Implement database check
    }

    async fn save_tenant_user(&self, _user: &TenantUser) -> Result<(), TenantError> {
        Ok(()) // Implement database save
    }

    async fn send_user_invitation(&self, _user: &TenantUser, _name: &str) -> Result<(), TenantError> {
        Ok(()) // Implement email sending
    }

    async fn save_api_key(&self, _api_key: &TenantApiKey) -> Result<(), TenantError> {
        Ok(()) // Implement database save
    }

    async fn process_payment(&self, _tenant_id: Uuid, _amount: f64, _payment_method: &str) -> Result<(), TenantError> {
        Ok(()) // Implement payment processing
    }

    fn get_plan_limits(&self, plan: &TenantPlan) -> TenantLimits {
        match plan {
            TenantPlan::Free => TenantLimits {
                max_messages_per_month: 1000,
                max_contacts: 100,
                max_users: 2,
                max_api_calls_per_minute: 10,
                max_webhook_endpoints: 1,
                max_storage_mb: 100,
                max_automations: 3,
            },
            TenantPlan::Starter => TenantLimits {
                max_messages_per_month: 10000,
                max_contacts: 1000,
                max_users: 5,
                max_api_calls_per_minute: 100,
                max_webhook_endpoints: 3,
                max_storage_mb: 1000,
                max_automations: 10,
            },
            TenantPlan::Pro => TenantLimits {
                max_messages_per_month: 100000,
                max_contacts: 10000,
                max_users: 20,
                max_api_calls_per_minute: 1000,
                max_webhook_endpoints: 10,
                max_storage_mb: 10000,
                max_automations: 50,
            },
            TenantPlan::Enterprise => TenantLimits {
                max_messages_per_month: u32::MAX,
                max_contacts: u32::MAX,
                max_users: 100,
                max_api_calls_per_minute: 10000,
                max_webhook_endpoints: 50,
                max_storage_mb: 100000,
                max_automations: 200,
            },
        }
    }

    fn get_plan_price(&self, plan: &TenantPlan) -> f64 {
        match plan {
            TenantPlan::Free => 0.0,
            TenantPlan::Starter => 29.0,
            TenantPlan::Pro => 99.0,
            TenantPlan::Enterprise => 299.0,
        }
    }

    fn can_upgrade_to(&self, current: &TenantPlan, new: &TenantPlan) -> bool {
        use TenantPlan::*;
        matches!(
            (current, new),
            (Free, Starter | Pro | Enterprise) |
            (Starter, Pro | Enterprise) |
            (Pro, Enterprise)
        )
    }

    fn generate_secure_key(&self) -> String {
        format!("wh_{}", Uuid::new_v4().to_string().replace('-', ""))
    }

    fn generate_encryption_key(&self) -> String {
        format!("enc_{}", Uuid::new_v4().to_string().replace('-', ""))
    }

    fn generate_api_key(&self) -> String {
        format!("pk_{}", Uuid::new_v4().to_string().replace('-', ""))
    }

    fn hash_api_key(&self, _key: &str) -> String {
        // Implement proper hashing (e.g., with argon2)
        format!("hash_{}", Uuid::new_v4())
    }
}

// ============================================================================
// Tenant Middleware
// ============================================================================

pub struct TenantMiddleware;

impl TenantMiddleware {
    pub async fn extract_tenant_context(
        req: &ServiceRequest,
        auth: Option<BearerAuth>,
    ) -> Result<TenantContext, TenantError> {
        let tenant_service = TenantService;

        // Try to extract tenant from subdomain
        if let Some(host) = req.headers().get("host") {
            if let Ok(host_str) = host.to_str() {
                if let Some(subdomain) = Self::extract_subdomain(host_str) {
                    if let Some(tenant) = tenant_service.find_tenant_by_subdomain(&subdomain).await? {
                        return Self::build_context_for_tenant(tenant, auth, &tenant_service).await;
                    }
                }
            }
        }

        // Try to extract tenant from API key or JWT
        if let Some(auth) = auth {
            return Self::extract_from_auth(auth.token(), &tenant_service).await;
        }

        // Try to extract from X-Tenant-ID header
        if let Some(tenant_id_header) = req.headers().get("X-Tenant-ID") {
            if let Ok(tenant_id_str) = tenant_id_header.to_str() {
                if let Ok(tenant_id) = Uuid::parse_str(tenant_id_str) {
                    if let Some(tenant) = tenant_service.find_tenant_by_id(tenant_id).await? {
                        return Self::build_context_for_tenant(tenant, None, &tenant_service).await;
                    }
                }
            }
        }

        Err(TenantError::TenantNotFound)
    }

    fn extract_subdomain(host: &str) -> Option<String> {
        let parts: Vec<&str> = host.split('.').collect();
        if parts.len() >= 3 && !parts[0].is_empty() && parts[0] != "www" {
            Some(parts[0].to_string())
        } else {
            None
        }
    }

    async fn extract_from_auth(token: &str, tenant_service: &TenantService) -> Result<TenantContext, TenantError> {
        // Check if it's an API key
        if token.starts_with("pk_") {
            return Self::extract_from_api_key(token, tenant_service).await;
        }

        // Otherwise treat as JWT
        Self::extract_from_jwt(token, tenant_service).await
    }

    async fn extract_from_api_key(api_key: &str, tenant_service: &TenantService) -> Result<TenantContext, TenantError> {
        let key_info = tenant_service.find_api_key(api_key).await?
            .ok_or(TenantError::InvalidApiKey)?;

        if !key_info.is_active {
            return Err(TenantError::ApiKeyInactive);
        }

        if let Some(expires_at) = key_info.expires_at {
            if expires_at < Utc::now() {
                return Err(TenantError::ApiKeyExpired);
            }
        }

        let tenant = tenant_service.find_tenant_by_id(key_info.tenant_id).await?
            .ok_or(TenantError::NotFound)?;

        // Update last used
        tenant_service.update_api_key_last_used(key_info.id).await?;

        Ok(TenantContext {
            tenant_id: tenant.id,
            tenant,
            user_id: None,
            user_role: None,
            api_key_id: Some(key_info.id),
            permissions: key_info.permissions.into_iter()
                .filter_map(|p| serde_json::from_str(&format!("\"{}\"", p)).ok())
                .collect(),
        })
    }

    async fn extract_from_jwt(token: &str, _tenant_service: &TenantService) -> Result<TenantContext, TenantError> {
        // Implement JWT parsing and validation
        // Extract user_id and tenant_id from JWT claims
        let _claims = Self::validate_jwt(token)?;
        
        // For now, return a placeholder
        Err(TenantError::InvalidToken)
    }

    async fn build_context_for_tenant(
        tenant: Tenant,
        _auth: Option<BearerAuth>,
        _tenant_service: &TenantService,
    ) -> Result<TenantContext, TenantError> {
        Ok(TenantContext {
            tenant_id: tenant.id,
            tenant,
            user_id: None,
            user_role: None,
            api_key_id: None,
            permissions: vec![],
        })
    }

    fn validate_jwt(_token: &str) -> Result<HashMap<String, String>, TenantError> {
        // Implement JWT validation
        Err(TenantError::InvalidToken)
    }
}

// ============================================================================
// Error Types
// ============================================================================

#[derive(Debug, thiserror::Error)]
pub enum TenantError {
    #[error("Tenant not found")]
    NotFound,
    #[error("Tenant not found")]
    TenantNotFound,
    #[error("Subdomain already taken")]
    SubdomainTaken,
    #[error("User limit reached")]
    UserLimitReached,
    #[error("User already exists in tenant")]
    UserAlreadyExists,
    #[error("Invalid upgrade path")]
    InvalidUpgrade,
    #[error("API key limit reached")]
    ApiKeyLimitReached,
    #[error("Invalid API key")]
    InvalidApiKey,
    #[error("API key inactive")]
    ApiKeyInactive,
    #[error("API key expired")]
    ApiKeyExpired,
    #[error("Invalid token")]
    InvalidToken,
    #[error("Permission denied")]
    PermissionDenied,
    #[error("Database error: {0}")]
    Database(String),
    #[error("Payment error: {0}")]
    Payment(String),
    #[error("Email error: {0}")]
    Email(String),
}

// ============================================================================
// HTTP Handlers
// ============================================================================

/// Create a new tenant
#[utoipa::path(
    post,
    path = "/api/v1/tenants",
    request_body = CreateTenantRequest,
    responses(
        (status = 201, description = "Tenant created successfully", body = TenantResponse),
        (status = 400, description = "Invalid request"),
        (status = 409, description = "Subdomain already taken")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn create_tenant(
    tenant_request: web::Json<CreateTenantRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_service = TenantService;
    
    match tenant_service.create_tenant(tenant_request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Created().json(response)),
        Err(TenantError::SubdomainTaken) => Ok(HttpResponse::Conflict().json(serde_json::json!({
            "error": "Subdomain already taken"
        }))),
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Get tenant details
#[utoipa::path(
    get,
    path = "/api/v1/tenants/{tenant_id}",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    responses(
        (status = 200, description = "Tenant details", body = TenantResponse),
        (status = 404, description = "Tenant not found")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn get_tenant(
    path: web::Path<Uuid>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Ensure user can only access their own tenant or is super admin
    if ctx.tenant_id != tenant_id && !ctx.is_admin() {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.get_tenant(tenant_id).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(TenantError::NotFound) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Tenant not found"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Update tenant settings
#[utoipa::path(
    put,
    path = "/api/v1/tenants/{tenant_id}",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    request_body = UpdateTenantRequest,
    responses(
        (status = 200, description = "Tenant updated successfully", body = TenantResponse),
        (status = 403, description = "Permission denied"),
        (status = 404, description = "Tenant not found")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn update_tenant(
    path: web::Path<Uuid>,
    tenant_request: web::Json<UpdateTenantRequest>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Only owners and admins can update tenant
    if ctx.tenant_id != tenant_id || !ctx.is_admin() {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.update_tenant(tenant_id, tenant_request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(TenantError::NotFound) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Tenant not found"
        }))),
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Add user to tenant
#[utoipa::path(
    post,
    path = "/api/v1/tenants/{tenant_id}/users",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    request_body = AddUserRequest,
    responses(
        (status = 201, description = "User added successfully", body = TenantUser),
        (status = 403, description = "Permission denied"),
        (status = 409, description = "User already exists")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn add_tenant_user(
    path: web::Path<Uuid>,
    user_request: web::Json<AddUserRequest>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id || !ctx.can_manage_users() {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.add_user(tenant_id, user_request.into_inner()).await {
        Ok(user) => Ok(HttpResponse::Created().json(user)),
        Err(TenantError::UserLimitReached) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "User limit reached for this plan"
        }))),
        Err(TenantError::UserAlreadyExists) => Ok(HttpResponse::Conflict().json(serde_json::json!({
            "error": "User already exists in this tenant"
        }))),
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Get billing information
#[utoipa::path(
    get,
    path = "/api/v1/tenants/{tenant_id}/billing",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    responses(
        (status = 200, description = "Billing information", body = BillingInfo),
        (status = 403, description = "Permission denied"),
        (status = 404, description = "Tenant not found")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn get_billing_info(
    path: web::Path<Uuid>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id || !ctx.can_manage_billing() {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.get_billing_info(tenant_id).await {
        Ok(billing_info) => Ok(HttpResponse::Ok().json(billing_info)),
        Err(TenantError::NotFound) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Tenant not found"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Upgrade tenant plan
#[utoipa::path(
    post,
    path = "/api/v1/tenants/{tenant_id}/upgrade",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    request_body = UpgradePlanRequest,
    responses(
        (status = 200, description = "Plan upgraded successfully", body = TenantResponse),
        (status = 403, description = "Permission denied"),
        (status = 400, description = "Invalid upgrade path"),
        (status = 404, description = "Tenant not found")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn upgrade_plan(
    path: web::Path<Uuid>,
    upgrade_request: web::Json<UpgradePlanRequest>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id || !ctx.can_manage_billing() {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.upgrade_plan(tenant_id, upgrade_request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(TenantError::InvalidUpgrade) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid upgrade path"
        }))),
        Err(TenantError::NotFound) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Tenant not found"
        }))),
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Get usage metrics
#[utoipa::path(
    get,
    path = "/api/v1/tenants/{tenant_id}/usage",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID"),
        ("period_days" = Option<u32>, Query, description = "Period in days (default: 30)")
    ),
    responses(
        (status = 200, description = "Usage metrics", body = UsageMetrics),
        (status = 403, description = "Permission denied"),
        (status = 404, description = "Tenant not found")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn get_usage_metrics(
    path: web::Path<Uuid>,
    query: web::Query<serde_json::Value>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let period_days = query.get("period_days")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
        .unwrap_or(30);

    let tenant_service = TenantService;
    
    match tenant_service.get_usage_metrics(tenant_id, period_days).await {
        Ok(metrics) => Ok(HttpResponse::Ok().json(metrics)),
        Err(TenantError::NotFound) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Tenant not found"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Create API key
#[utoipa::path(
    post,
    path = "/api/v1/tenants/{tenant_id}/api-keys",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    request_body = CreateApiKeyRequest,
    responses(
        (status = 201, description = "API key created successfully", body = ApiKeyResponse),
        (status = 403, description = "Permission denied"),
        (status = 400, description = "API key limit reached")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn create_api_key(
    path: web::Path<Uuid>,
    key_request: web::Json<CreateApiKeyRequest>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id || !ctx.has_permission(&Permission::ManageApiKeys) {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.create_api_key(tenant_id, key_request.into_inner()).await {
        Ok(response) => Ok(HttpResponse::Created().json(response)),
        Err(TenantError::ApiKeyLimitReached) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "API key limit reached for this plan"
        }))),
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// List tenant users
#[utoipa::path(
    get,
    path = "/api/v1/tenants/{tenant_id}/users",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    responses(
        (status = 200, description = "List of tenant users", body = Vec<TenantUser>),
        (status = 403, description = "Permission denied")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn list_tenant_users(
    path: web::Path<Uuid>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id || !ctx.can_manage_users() {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.list_tenant_users(tenant_id).await {
        Ok(users) => Ok(HttpResponse::Ok().json(users)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// List tenant API keys
#[utoipa::path(
    get,
    path = "/api/v1/tenants/{tenant_id}/api-keys",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    responses(
        (status = 200, description = "List of API keys", body = Vec<TenantApiKey>),
        (status = 403, description = "Permission denied")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn list_api_keys(
    path: web::Path<Uuid>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id || !ctx.has_permission(&Permission::ManageApiKeys) {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.list_api_keys(tenant_id).await {
        Ok(keys) => Ok(HttpResponse::Ok().json(keys)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Delete API key
#[utoipa::path(
    delete,
    path = "/api/v1/tenants/{tenant_id}/api-keys/{key_id}",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID"),
        ("key_id" = Uuid, Path, description = "API key ID")
    ),
    responses(
        (status = 204, description = "API key deleted successfully"),
        (status = 403, description = "Permission denied"),
        (status = 404, description = "API key not found")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn delete_api_key(
    path: web::Path<(Uuid, Uuid)>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let (tenant_id, key_id) = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id || !ctx.has_permission(&Permission::ManageApiKeys) {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.delete_api_key(tenant_id, key_id).await {
        Ok(()) => Ok(HttpResponse::NoContent().finish()),
        Err(TenantError::NotFound) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "API key not found"
        }))),
        Err(e) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Get tenant invoices
#[utoipa::path(
    get,
    path = "/api/v1/tenants/{tenant_id}/invoices",
    params(
        ("tenant_id" = Uuid, Path, description = "Tenant ID")
    ),
    responses(
        (status = 200, description = "List of invoices", body = Vec<Invoice>),
        (status = 403, description = "Permission denied")
    ),
    tag = "Multi-Tenancy"
)]
pub async fn get_invoices(
    path: web::Path<Uuid>,
    tenant_ctx: web::ReqData<TenantContext>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = path.into_inner();
    let ctx = tenant_ctx.into_inner();
    
    // Check permissions
    if ctx.tenant_id != tenant_id || !ctx.can_manage_billing() {
        return Ok(HttpResponse::Forbidden().json(serde_json::json!({
            "error": "Permission denied"
        })));
    }

    let tenant_service = TenantService;
    
    match tenant_service.get_invoices(tenant_id).await {
        Ok(invoices) => Ok(HttpResponse::Ok().json(invoices)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

// ============================================================================
// Route Configuration
// ============================================================================

pub fn configure_tenant_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/tenants")
            .route("", web::post().to(create_tenant))
            .route("/{tenant_id}", web::get().to(get_tenant))
            .route("/{tenant_id}", web::put().to(update_tenant))
            .route("/{tenant_id}/users", web::post().to(add_tenant_user))
            .route("/{tenant_id}/users", web::get().to(list_tenant_users))
            .route("/{tenant_id}/billing", web::get().to(get_billing_info))
            .route("/{tenant_id}/upgrade", web::post().to(upgrade_plan))
            .route("/{tenant_id}/usage", web::get().to(get_usage_metrics))
            .route("/{tenant_id}/api-keys", web::post().to(create_api_key))
            .route("/{tenant_id}/api-keys", web::get().to(list_api_keys))
            .route("/{tenant_id}/api-keys/{key_id}", web::delete().to(delete_api_key))
            .route("/{tenant_id}/invoices", web::get().to(get_invoices))
    );
}

// Additional helper implementations for TenantService
impl TenantService {
    pub async fn find_tenant_by_subdomain(&self, _subdomain: &str) -> Result<Option<Tenant>, TenantError> {
        Ok(None) // Implement database query
    }

    pub async fn find_api_key(&self, _api_key: &str) -> Result<Option<TenantApiKey>, TenantError> {
        Ok(None) // Implement database query
    }

    pub async fn update_api_key_last_used(&self, _api_key_id: Uuid) -> Result<(), TenantError> {
        Ok(()) // Implement database update
    }

    pub async fn list_tenant_users(&self, _tenant_id: Uuid) -> Result<Vec<TenantUser>, TenantError> {
        Ok(vec![]) // Implement database query
    }

    pub async fn list_api_keys(&self, _tenant_id: Uuid) -> Result<Vec<TenantApiKey>, TenantError> {
        Ok(vec![]) // Implement database query
    }

    pub async fn delete_api_key(&self, _tenant_id: Uuid, _key_id: Uuid) -> Result<(), TenantError> {
        Ok(()) // Implement database delete
    }

    pub async fn get_invoices(&self, _tenant_id: Uuid) -> Result<Vec<Invoice>, TenantError> {
        Ok(vec![]) // Implement database query
    }
}