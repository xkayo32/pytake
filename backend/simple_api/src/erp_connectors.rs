use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};
use async_trait::async_trait;
use dashmap::DashMap;
use leaky_bucket::RateLimiter;
use reqwest::Client;
use thiserror::Error;
use utoipa::ToSchema;
use backoff::{ExponentialBackoff, backoff::Backoff};

// =============================================================================
// Error Types
// =============================================================================

#[derive(Error, Debug)]
pub enum ErpError {
    #[error("Connection error: {message}")]
    Connection { message: String },
    #[error("Authentication failed: {message}")]
    Authentication { message: String },
    #[error("API error: {code} - {message}")]
    Api { code: i32, message: String },
    #[error("Rate limit exceeded")]
    RateLimit,
    #[error("Customer not found: {id}")]
    CustomerNotFound { id: String },
    #[error("Service not found: {id}")]
    ServiceNotFound { id: String },
    #[error("Configuration error: {message}")]
    Configuration { message: String },
    #[error("Cache error: {message}")]
    Cache { message: String },
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Other error: {message}")]
    Other { message: String },
}

pub type ErpResult<T> = Result<T, ErpError>;

// =============================================================================
// Domain Models - Unified Data Structures
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Customer {
    pub id: String,
    pub external_id: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub cpf_cnpj: String,
    pub address: CustomerAddress,
    pub status: CustomerStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub plan: Option<ServicePlan>,
    pub contracts: Vec<Contract>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CustomerAddress {
    pub street: String,
    pub number: String,
    pub complement: Option<String>,
    pub neighborhood: String,
    pub city: String,
    pub state: String,
    pub zip_code: String,
    pub coordinates: Option<Coordinates>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Coordinates {
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum CustomerStatus {
    Active,
    Inactive,
    Suspended,
    Cancelled,
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ServicePlan {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub speed_download: u32, // Mbps
    pub speed_upload: u32,   // Mbps
    pub price: f64,
    pub technology: ServiceTechnology,
    pub features: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ServiceTechnology {
    Fiber,
    Cable,
    Wireless,
    Satellite,
    Adsl,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Contract {
    pub id: String,
    pub customer_id: String,
    pub plan_id: String,
    pub status: ContractStatus,
    pub start_date: NaiveDate,
    pub end_date: Option<NaiveDate>,
    pub monthly_fee: f64,
    pub installation_fee: Option<f64>,
    pub equipment: Vec<Equipment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ContractStatus {
    Active,
    Inactive,
    Suspended,
    Cancelled,
    PendingInstallation,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Equipment {
    pub id: String,
    pub serial_number: String,
    pub model: String,
    pub mac_address: Option<String>,
    pub status: EquipmentStatus,
    pub installation_date: Option<NaiveDate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum EquipmentStatus {
    Active,
    Inactive,
    Faulty,
    Maintenance,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Invoice {
    pub id: String,
    pub customer_id: String,
    pub contract_id: Option<String>,
    pub number: String,
    pub amount: f64,
    pub due_date: NaiveDate,
    pub issue_date: NaiveDate,
    pub status: InvoiceStatus,
    pub items: Vec<InvoiceItem>,
    pub payment_method: Option<PaymentMethod>,
    pub barcode: Option<String>,
    pub pix_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum InvoiceStatus {
    Pending,
    Paid,
    Overdue,
    Cancelled,
    Partial,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InvoiceItem {
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum PaymentMethod {
    BankSlip,
    Pix,
    CreditCard,
    DebitCard,
    BankTransfer,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ServiceTicket {
    pub id: String,
    pub customer_id: String,
    pub title: String,
    pub description: String,
    pub category: TicketCategory,
    pub priority: TicketPriority,
    pub status: TicketStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub assigned_to: Option<String>,
    pub resolution: Option<String>,
    pub scheduled_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum TicketCategory {
    Technical,
    Commercial,
    Installation,
    Maintenance,
    Billing,
    Cancellation,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum TicketPriority {
    Low,
    Medium,
    High,
    Critical,
    Emergency,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum TicketStatus {
    Open,
    InProgress,
    Waiting,
    Resolved,
    Closed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ServiceStatus {
    pub customer_id: String,
    pub contract_id: String,
    pub is_active: bool,
    pub current_speed_download: Option<u32>,
    pub current_speed_upload: Option<u32>,
    pub signal_quality: Option<f32>, // 0.0 to 1.0
    pub last_online: Option<DateTime<Utc>>,
    pub uptime_percentage: Option<f32>,
    pub data_usage: Option<DataUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DataUsage {
    pub download_mb: u64,
    pub upload_mb: u64,
    pub total_mb: u64,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}

// =============================================================================
// ERP Configuration
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ErpConfig {
    pub provider: ErpProvider,
    pub base_url: String,
    pub api_key: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tenant_id: Option<String>,
    pub timeout_seconds: u64,
    pub rate_limit_per_minute: u32,
    pub retry_attempts: u32,
    pub cache_ttl_seconds: u64,
    pub custom_headers: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq, Eq, Hash)]
pub enum ErpProvider {
    HubSoft,
    IxcSoft,
    MkSolutions,
    SisGp,
}

impl ErpProvider {
    pub fn as_str(&self) -> &'static str {
        match self {
            ErpProvider::HubSoft => "hubsoft",
            ErpProvider::IxcSoft => "ixcsoft", 
            ErpProvider::MkSolutions => "mksolutions",
            ErpProvider::SisGp => "sisgp",
        }
    }
}

// =============================================================================
// Cache System
// =============================================================================

#[derive(Debug, Clone)]
struct CacheEntry<T> {
    data: T,
    expires_at: Instant,
}

#[derive(Debug)]
pub struct ErpCache {
    customers: DashMap<String, CacheEntry<Customer>>,
    invoices: DashMap<String, CacheEntry<Vec<Invoice>>>,
    service_status: DashMap<String, CacheEntry<ServiceStatus>>,
    tickets: DashMap<String, CacheEntry<Vec<ServiceTicket>>>,
    default_ttl: Duration,
}

impl ErpCache {
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            customers: DashMap::new(),
            invoices: DashMap::new(),
            service_status: DashMap::new(),
            tickets: DashMap::new(),
            default_ttl,
        }
    }

    pub fn get_customer(&self, key: &str) -> Option<Customer> {
        self.customers.get(key).and_then(|entry| {
            if entry.expires_at > Instant::now() {
                Some(entry.data.clone())
            } else {
                self.customers.remove(key);
                None
            }
        })
    }

    pub fn set_customer(&self, key: String, customer: Customer, ttl: Option<Duration>) {
        let expires_at = Instant::now() + ttl.unwrap_or(self.default_ttl);
        self.customers.insert(key, CacheEntry { data: customer, expires_at });
    }

    pub fn get_invoices(&self, key: &str) -> Option<Vec<Invoice>> {
        self.invoices.get(key).and_then(|entry| {
            if entry.expires_at > Instant::now() {
                Some(entry.data.clone())
            } else {
                self.invoices.remove(key);
                None
            }
        })
    }

    pub fn set_invoices(&self, key: String, invoices: Vec<Invoice>, ttl: Option<Duration>) {
        let expires_at = Instant::now() + ttl.unwrap_or(self.default_ttl);
        self.invoices.insert(key, CacheEntry { data: invoices, expires_at });
    }

    pub fn get_service_status(&self, key: &str) -> Option<ServiceStatus> {
        self.service_status.get(key).and_then(|entry| {
            if entry.expires_at > Instant::now() {
                Some(entry.data.clone())
            } else {
                self.service_status.remove(key);
                None
            }
        })
    }

    pub fn set_service_status(&self, key: String, status: ServiceStatus, ttl: Option<Duration>) {
        let expires_at = Instant::now() + ttl.unwrap_or(self.default_ttl);
        self.service_status.insert(key, CacheEntry { data: status, expires_at });
    }

    pub fn clear_customer(&self, key: &str) {
        self.customers.remove(key);
        self.invoices.remove(key);
        self.service_status.remove(key);
        self.tickets.remove(key);
    }

    pub fn cleanup_expired(&self) {
        let now = Instant::now();
        
        self.customers.retain(|_, entry| entry.expires_at > now);
        self.invoices.retain(|_, entry| entry.expires_at > now);
        self.service_status.retain(|_, entry| entry.expires_at > now);
        self.tickets.retain(|_, entry| entry.expires_at > now);
    }
}

// =============================================================================
// ERP Connector Trait
// =============================================================================

#[async_trait]
pub trait ErpConnector: Send + Sync {
    /// Get the provider type
    fn provider(&self) -> ErpProvider;

    /// Test the connection to the ERP
    async fn test_connection(&self) -> ErpResult<bool>;

    /// Get customer by CPF/CNPJ
    async fn get_customer_by_document(&self, cpf_cnpj: &str) -> ErpResult<Customer>;

    /// Get customer by ID
    async fn get_customer_by_id(&self, id: &str) -> ErpResult<Customer>;

    /// Get customer invoices
    async fn get_customer_invoices(&self, customer_id: &str, limit: Option<u32>) -> ErpResult<Vec<Invoice>>;

    /// Get customer service status
    async fn get_service_status(&self, customer_id: &str) -> ErpResult<ServiceStatus>;

    /// Create a service ticket
    async fn create_ticket(&self, ticket: CreateTicketRequest) -> ErpResult<ServiceTicket>;

    /// Get customer tickets
    async fn get_customer_tickets(&self, customer_id: &str, limit: Option<u32>) -> ErpResult<Vec<ServiceTicket>>;

    /// Update customer information
    async fn update_customer(&self, customer_id: &str, updates: UpdateCustomerRequest) -> ErpResult<Customer>;

    /// Get available service plans
    async fn get_service_plans(&self) -> ErpResult<Vec<ServicePlan>>;

    /// Schedule a technical visit
    async fn schedule_visit(&self, customer_id: &str, visit: ScheduleVisitRequest) -> ErpResult<ServiceTicket>;
}

// =============================================================================
// Request/Response Types
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTicketRequest {
    pub customer_id: String,
    pub title: String,
    pub description: String,
    pub category: TicketCategory,
    pub priority: TicketPriority,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<CustomerAddress>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ScheduleVisitRequest {
    pub preferred_date: DateTime<Utc>,
    pub description: String,
    pub contact_phone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ErpConnectionRequest {
    pub provider: ErpProvider,
    pub config: ErpConfig,
}

// =============================================================================
// ERP Manager - Main Orchestrator
// =============================================================================

pub struct ErpManager {
    connectors: DashMap<ErpProvider, Arc<dyn ErpConnector>>,
    rate_limiters: DashMap<ErpProvider, Arc<RateLimiter>>,
    cache: Arc<ErpCache>,
    http_client: Client,
}

impl ErpManager {
    pub fn new() -> Self {
        Self {
            connectors: DashMap::new(),
            rate_limiters: DashMap::new(),
            cache: Arc::new(ErpCache::new(Duration::from_secs(300))), // 5 minutes default TTL
            http_client: Client::new(),
        }
    }

    pub async fn register_connector(&self, connector: Arc<dyn ErpConnector>, config: &ErpConfig) -> ErpResult<()> {
        let provider = connector.provider();
        
        // Test connection before registering
        connector.test_connection().await?;
        
        // Create rate limiter
        let rate_limiter = RateLimiter::builder()
            .max(config.rate_limit_per_minute as usize)
            .refill(config.rate_limit_per_minute as usize)
            .interval(Duration::from_secs(60))
            .build();
        
        self.connectors.insert(provider.clone(), connector);
        self.rate_limiters.insert(provider, Arc::new(rate_limiter));
        
        Ok(())
    }

    pub async fn get_customer_by_document(&self, provider: ErpProvider, cpf_cnpj: &str) -> ErpResult<Customer> {
        let cache_key = format!("{}:customer:doc:{}", provider.as_str(), cpf_cnpj);
        
        // Check cache first
        if let Some(cached) = self.cache.get_customer(&cache_key) {
            return Ok(cached);
        }

        // Rate limiting
        self.check_rate_limit(&provider).await?;

        // Get connector and fetch data
        let connector = self.get_connector(&provider)?;
        let customer = self.retry_operation(|| async {
            connector.get_customer_by_document(cpf_cnpj).await
        }).await?;

        // Cache the result
        self.cache.set_customer(cache_key, customer.clone(), None);
        
        Ok(customer)
    }

    pub async fn get_customer_invoices(&self, provider: ErpProvider, customer_id: &str, limit: Option<u32>) -> ErpResult<Vec<Invoice>> {
        let cache_key = format!("{}:invoices:{}", provider.as_str(), customer_id);
        
        // Check cache first
        if let Some(cached) = self.cache.get_invoices(&cache_key) {
            return Ok(cached);
        }

        // Rate limiting
        self.check_rate_limit(&provider).await?;

        // Get connector and fetch data
        let connector = self.get_connector(&provider)?;
        let invoices = self.retry_operation(|| async {
            connector.get_customer_invoices(customer_id, limit).await
        }).await?;

        // Cache the result with shorter TTL for financial data
        self.cache.set_invoices(cache_key, invoices.clone(), Some(Duration::from_secs(60)));
        
        Ok(invoices)
    }

    pub async fn get_service_status(&self, provider: ErpProvider, customer_id: &str) -> ErpResult<ServiceStatus> {
        let cache_key = format!("{}:status:{}", provider.as_str(), customer_id);
        
        // Check cache first (short TTL for service status)
        if let Some(cached) = self.cache.get_service_status(&cache_key) {
            return Ok(cached);
        }

        // Rate limiting
        self.check_rate_limit(&provider).await?;

        // Get connector and fetch data
        let connector = self.get_connector(&provider)?;
        let status = self.retry_operation(|| async {
            connector.get_service_status(customer_id).await
        }).await?;

        // Cache with very short TTL for real-time data
        self.cache.set_service_status(cache_key, status.clone(), Some(Duration::from_secs(30)));
        
        Ok(status)
    }

    pub async fn create_ticket(&self, provider: ErpProvider, request: CreateTicketRequest) -> ErpResult<ServiceTicket> {
        // Rate limiting for write operations
        self.check_rate_limit(&provider).await?;

        // Get connector and create ticket
        let connector = self.get_connector(&provider)?;
        let ticket = self.retry_operation(|| async {
            connector.create_ticket(request.clone()).await
        }).await?;

        // Invalidate related cache entries
        self.cache.clear_customer(&request.customer_id);
        
        Ok(ticket)
    }

    async fn check_rate_limit(&self, provider: &ErpProvider) -> ErpResult<()> {
        if let Some(rate_limiter) = self.rate_limiters.get(provider) {
            if !rate_limiter.try_acquire(1) {
                return Err(ErpError::RateLimit);
            }
        }
        Ok(())
    }

    fn get_connector(&self, provider: &ErpProvider) -> ErpResult<Arc<dyn ErpConnector>> {
        self.connectors.get(provider)
            .map(|entry| entry.value().clone())
            .ok_or_else(|| ErpError::Configuration {
                message: format!("No connector registered for provider: {:?}", provider),
            })
    }

    async fn retry_operation<F, Fut, T>(&self, operation: F) -> ErpResult<T>
    where
        F: Fn() -> Fut,
        Fut: std::future::Future<Output = ErpResult<T>>,
    {
        let mut backoff = ExponentialBackoff::default();
        backoff.max_elapsed_time = Some(Duration::from_secs(60));

        loop {
            match operation().await {
                Ok(result) => return Ok(result),
                Err(err) => {
                    match err {
                        ErpError::RateLimit | ErpError::Connection { .. } => {
                            if let Some(delay) = backoff.next_backoff() {
                                tokio::time::sleep(delay).await;
                                continue;
                            }
                        }
                        _ => return Err(err),
                    }
                }
            }
            return Err(ErpError::Other { message: "Max retries exceeded".to_string() });
        }
    }

    pub async fn cleanup_cache(&self) {
        self.cache.cleanup_expired();
    }
}

// =============================================================================
// HubSoft Connector Implementation
// =============================================================================

pub struct HubSoftConnector {
    config: ErpConfig,
    client: Client,
}

impl HubSoftConnector {
    pub fn new(config: ErpConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()
            .unwrap();

        Self { config, client }
    }

    async fn make_request<T: for<'de> Deserialize<'de>>(&self, endpoint: &str) -> ErpResult<T> {
        let url = format!("{}/{}", self.config.base_url.trim_end_matches('/'), endpoint);
        
        let mut request = self.client.get(&url);
        
        if let Some(api_key) = &self.config.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        for (key, value) in &self.config.custom_headers {
            request = request.header(key, value);
        }

        let response = request.send().await?;
        
        if !response.status().is_success() {
            return Err(ErpError::Api {
                code: response.status().as_u16() as i32,
                message: response.text().await.unwrap_or_default(),
            });
        }

        let data: T = response.json().await?;
        Ok(data)
    }
}

#[async_trait]
impl ErpConnector for HubSoftConnector {
    fn provider(&self) -> ErpProvider {
        ErpProvider::HubSoft
    }

    async fn test_connection(&self) -> ErpResult<bool> {
        let result: Result<serde_json::Value, ErpError> = self.make_request("api/health").await;
        Ok(result.is_ok())
    }

    async fn get_customer_by_document(&self, cpf_cnpj: &str) -> ErpResult<Customer> {
        #[derive(Deserialize)]
        struct HubSoftCustomer {
            id: String,
            nome: String,
            email: Option<String>,
            telefone: Option<String>,
            cpf_cnpj: String,
            endereco: HubSoftAddress,
            status: String,
            plano: Option<HubSoftPlan>,
        }

        #[derive(Deserialize)]
        struct HubSoftAddress {
            logradouro: String,
            numero: String,
            complemento: Option<String>,
            bairro: String,
            cidade: String,
            uf: String,
            cep: String,
        }

        #[derive(Deserialize)]
        struct HubSoftPlan {
            id: String,
            nome: String,
            velocidade_download: u32,
            velocidade_upload: u32,
            valor: f64,
        }

        let endpoint = format!("api/clientes/documento/{}", cpf_cnpj);
        let hubsoft_customer: HubSoftCustomer = self.make_request(&endpoint).await?;

        let customer = Customer {
            id: hubsoft_customer.id.clone(),
            external_id: hubsoft_customer.id,
            name: hubsoft_customer.nome,
            email: hubsoft_customer.email,
            phone: hubsoft_customer.telefone,
            cpf_cnpj: hubsoft_customer.cpf_cnpj,
            address: CustomerAddress {
                street: hubsoft_customer.endereco.logradouro,
                number: hubsoft_customer.endereco.numero,
                complement: hubsoft_customer.endereco.complemento,
                neighborhood: hubsoft_customer.endereco.bairro,
                city: hubsoft_customer.endereco.cidade,
                state: hubsoft_customer.endereco.uf,
                zip_code: hubsoft_customer.endereco.cep,
                coordinates: None,
            },
            status: match hubsoft_customer.status.as_str() {
                "ativo" => CustomerStatus::Active,
                "inativo" => CustomerStatus::Inactive,
                "suspenso" => CustomerStatus::Suspended,
                "cancelado" => CustomerStatus::Cancelled,
                _ => CustomerStatus::Active,
            },
            created_at: Utc::now(), // HubSoft doesn't provide this
            updated_at: Utc::now(),
            plan: hubsoft_customer.plano.map(|p| ServicePlan {
                id: p.id,
                name: p.nome,
                description: None,
                speed_download: p.velocidade_download,
                speed_upload: p.velocidade_upload,
                price: p.valor,
                technology: ServiceTechnology::Fiber,
                features: vec![],
            }),
            contracts: vec![], // Would need separate API call
        };

        Ok(customer)
    }

    async fn get_customer_by_id(&self, _id: &str) -> ErpResult<Customer> {
        // Implementation would be similar to get_customer_by_document
        // For brevity, using placeholder
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_customer_invoices(&self, customer_id: &str, limit: Option<u32>) -> ErpResult<Vec<Invoice>> {
        #[derive(Deserialize)]
        struct HubSoftInvoice {
            id: String,
            numero: String,
            valor: f64,
            vencimento: String,
            emissao: String,
            status: String,
            codigo_barras: Option<String>,
        }

        let endpoint = format!("api/clientes/{}/faturas", customer_id);
        let invoices: Vec<HubSoftInvoice> = self.make_request(&endpoint).await?;

        let mut result = Vec::new();
        for inv in invoices.into_iter().take(limit.unwrap_or(50) as usize) {
            let due_date = NaiveDate::parse_from_str(&inv.vencimento, "%Y-%m-%d")
                .map_err(|_| ErpError::Other { message: "Invalid date format".to_string() })?;
            let issue_date = NaiveDate::parse_from_str(&inv.emissao, "%Y-%m-%d")
                .map_err(|_| ErpError::Other { message: "Invalid date format".to_string() })?;

            result.push(Invoice {
                id: inv.id,
                customer_id: customer_id.to_string(),
                contract_id: None,
                number: inv.numero,
                amount: inv.valor,
                due_date,
                issue_date,
                status: match inv.status.as_str() {
                    "pago" => InvoiceStatus::Paid,
                    "pendente" => InvoiceStatus::Pending,
                    "vencido" => InvoiceStatus::Overdue,
                    "cancelado" => InvoiceStatus::Cancelled,
                    _ => InvoiceStatus::Pending,
                },
                items: vec![], // Would need separate API call
                payment_method: None,
                barcode: inv.codigo_barras,
                pix_code: None,
            });
        }

        Ok(result)
    }

    async fn get_service_status(&self, customer_id: &str) -> ErpResult<ServiceStatus> {
        let endpoint = format!("api/clientes/{}/status", customer_id);
        
        #[derive(Deserialize)]
        struct HubSoftStatus {
            ativo: bool,
            velocidade_atual: Option<u32>,
            qualidade_sinal: Option<f32>,
            ultimo_online: Option<String>,
        }

        let status: HubSoftStatus = self.make_request(&endpoint).await?;

        Ok(ServiceStatus {
            customer_id: customer_id.to_string(),
            contract_id: "".to_string(), // Would need to fetch contract info
            is_active: status.ativo,
            current_speed_download: status.velocidade_atual,
            current_speed_upload: None,
            signal_quality: status.qualidade_sinal,
            last_online: status.ultimo_online.and_then(|s| {
                DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&Utc))
            }),
            uptime_percentage: None,
            data_usage: None,
        })
    }

    async fn create_ticket(&self, ticket: CreateTicketRequest) -> ErpResult<ServiceTicket> {
        // Implementation would make POST request to HubSoft API
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_customer_tickets(&self, customer_id: &str, limit: Option<u32>) -> ErpResult<Vec<ServiceTicket>> {
        // Implementation would fetch tickets from HubSoft API
        Ok(vec![])
    }

    async fn update_customer(&self, customer_id: &str, updates: UpdateCustomerRequest) -> ErpResult<Customer> {
        // Implementation would make PUT/PATCH request to HubSoft API
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_service_plans(&self) -> ErpResult<Vec<ServicePlan>> {
        let endpoint = "api/planos";
        
        #[derive(Deserialize)]
        struct HubSoftPlan {
            id: String,
            nome: String,
            descricao: Option<String>,
            velocidade_download: u32,
            velocidade_upload: u32,
            valor: f64,
        }

        let plans: Vec<HubSoftPlan> = self.make_request(endpoint).await?;
        
        Ok(plans.into_iter().map(|p| ServicePlan {
            id: p.id,
            name: p.nome,
            description: p.descricao,
            speed_download: p.velocidade_download,
            speed_upload: p.velocidade_upload,
            price: p.valor,
            technology: ServiceTechnology::Fiber,
            features: vec![],
        }).collect())
    }

    async fn schedule_visit(&self, customer_id: &str, visit: ScheduleVisitRequest) -> ErpResult<ServiceTicket> {
        // Implementation would create a scheduled visit ticket
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }
}

// =============================================================================
// IXCsoft Connector Implementation
// =============================================================================

pub struct IxcSoftConnector {
    config: ErpConfig,
    client: Client,
}

impl IxcSoftConnector {
    pub fn new(config: ErpConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()
            .unwrap();

        Self { config, client }
    }

    async fn make_soap_request<T: for<'de> Deserialize<'de>>(&self, method: &str, params: serde_json::Value) -> ErpResult<T> {
        // IXCsoft uses SOAP, but many also support REST
        // This is a simplified REST implementation
        let url = format!("{}/rest/{}", self.config.base_url.trim_end_matches('/'), method);
        
        let mut request = self.client.post(&url);
        
        if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
            request = request.basic_auth(username, Some(password));
        }

        let response = request.json(&params).send().await?;
        
        if !response.status().is_success() {
            return Err(ErpError::Api {
                code: response.status().as_u16() as i32,
                message: response.text().await.unwrap_or_default(),
            });
        }

        let data: T = response.json().await?;
        Ok(data)
    }
}

#[async_trait]
impl ErpConnector for IxcSoftConnector {
    fn provider(&self) -> ErpProvider {
        ErpProvider::IxcSoft
    }

    async fn test_connection(&self) -> ErpResult<bool> {
        let params = serde_json::json!({});
        let result: Result<serde_json::Value, ErpError> = self.make_soap_request("system.status", params).await;
        Ok(result.is_ok())
    }

    async fn get_customer_by_document(&self, cpf_cnpj: &str) -> ErpResult<Customer> {
        let params = serde_json::json!({
            "cpf_cnpj": cpf_cnpj
        });

        #[derive(Deserialize)]
        struct IxcCustomer {
            id: u32,
            razao: String,
            email: Option<String>,
            telefone_celular: Option<String>,
            cpf_cnpj: String,
            endereco: String,
            bairro: String,
            cidade: String,
            uf: String,
            cep: String,
            ativo: String,
        }

        let customer: IxcCustomer = self.make_soap_request("cliente.get", params).await?;

        Ok(Customer {
            id: customer.id.to_string(),
            external_id: customer.id.to_string(),
            name: customer.razao,
            email: customer.email,
            phone: customer.telefone_celular,
            cpf_cnpj: customer.cpf_cnpj,
            address: CustomerAddress {
                street: customer.endereco,
                number: "".to_string(), // IXC doesn't separate number
                complement: None,
                neighborhood: customer.bairro,
                city: customer.cidade,
                state: customer.uf,
                zip_code: customer.cep,
                coordinates: None,
            },
            status: if customer.ativo == "S" { CustomerStatus::Active } else { CustomerStatus::Inactive },
            created_at: Utc::now(),
            updated_at: Utc::now(),
            plan: None, // Would need separate call
            contracts: vec![],
        })
    }

    async fn get_customer_by_id(&self, _id: &str) -> ErpResult<Customer> {
        // Similar implementation to get_customer_by_document
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_customer_invoices(&self, customer_id: &str, limit: Option<u32>) -> ErpResult<Vec<Invoice>> {
        let params = serde_json::json!({
            "cliente_id": customer_id,
            "limit": limit.unwrap_or(50)
        });

        #[derive(Deserialize)]
        struct IxcInvoice {
            id: u32,
            numero: String,
            valor: f64,
            data_vencimento: String,
            data_emissao: String,
            situacao: String,
        }

        let invoices: Vec<IxcInvoice> = self.make_soap_request("fatura.listar", params).await?;

        let mut result = Vec::new();
        for inv in invoices {
            let due_date = NaiveDate::parse_from_str(&inv.data_vencimento, "%Y-%m-%d")
                .map_err(|_| ErpError::Other { message: "Invalid date format".to_string() })?;
            let issue_date = NaiveDate::parse_from_str(&inv.data_emissao, "%Y-%m-%d")
                .map_err(|_| ErpError::Other { message: "Invalid date format".to_string() })?;

            result.push(Invoice {
                id: inv.id.to_string(),
                customer_id: customer_id.to_string(),
                contract_id: None,
                number: inv.numero,
                amount: inv.valor,
                due_date,
                issue_date,
                status: match inv.situacao.as_str() {
                    "P" => InvoiceStatus::Paid,
                    "A" => InvoiceStatus::Pending,
                    "V" => InvoiceStatus::Overdue,
                    "C" => InvoiceStatus::Cancelled,
                    _ => InvoiceStatus::Pending,
                },
                items: vec![],
                payment_method: None,
                barcode: None,
                pix_code: None,
            });
        }

        Ok(result)
    }

    async fn get_service_status(&self, customer_id: &str) -> ErpResult<ServiceStatus> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn create_ticket(&self, ticket: CreateTicketRequest) -> ErpResult<ServiceTicket> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_customer_tickets(&self, customer_id: &str, limit: Option<u32>) -> ErpResult<Vec<ServiceTicket>> {
        Ok(vec![])
    }

    async fn update_customer(&self, customer_id: &str, updates: UpdateCustomerRequest) -> ErpResult<Customer> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_service_plans(&self) -> ErpResult<Vec<ServicePlan>> {
        let params = serde_json::json!({});
        
        #[derive(Deserialize)]
        struct IxcPlan {
            id: u32,
            nome: String,
            valor: f64,
            download: u32,
            upload: u32,
        }

        let plans: Vec<IxcPlan> = self.make_soap_request("plano.listar", params).await?;
        
        Ok(plans.into_iter().map(|p| ServicePlan {
            id: p.id.to_string(),
            name: p.nome,
            description: None,
            speed_download: p.download,
            speed_upload: p.upload,
            price: p.valor,
            technology: ServiceTechnology::Fiber,
            features: vec![],
        }).collect())
    }

    async fn schedule_visit(&self, customer_id: &str, visit: ScheduleVisitRequest) -> ErpResult<ServiceTicket> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }
}

// Placeholder implementations for MKSolutions and SisGP would follow similar patterns
// For brevity, I'm not implementing them fully here, but they would follow the same structure

pub struct MkSolutionsConnector {
    config: ErpConfig,
    client: Client,
}

impl MkSolutionsConnector {
    pub fn new(config: ErpConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()
            .unwrap();
        Self { config, client }
    }
}

#[async_trait]
impl ErpConnector for MkSolutionsConnector {
    fn provider(&self) -> ErpProvider {
        ErpProvider::MkSolutions
    }

    async fn test_connection(&self) -> ErpResult<bool> {
        Ok(true) // Placeholder
    }

    async fn get_customer_by_document(&self, _cpf_cnpj: &str) -> ErpResult<Customer> {
        Err(ErpError::Other { message: "MKSolutions connector not fully implemented".to_string() })
    }

    async fn get_customer_by_id(&self, _id: &str) -> ErpResult<Customer> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_customer_invoices(&self, _customer_id: &str, _limit: Option<u32>) -> ErpResult<Vec<Invoice>> {
        Ok(vec![])
    }

    async fn get_service_status(&self, _customer_id: &str) -> ErpResult<ServiceStatus> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn create_ticket(&self, _ticket: CreateTicketRequest) -> ErpResult<ServiceTicket> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_customer_tickets(&self, _customer_id: &str, _limit: Option<u32>) -> ErpResult<Vec<ServiceTicket>> {
        Ok(vec![])
    }

    async fn update_customer(&self, _customer_id: &str, _updates: UpdateCustomerRequest) -> ErpResult<Customer> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_service_plans(&self) -> ErpResult<Vec<ServicePlan>> {
        Ok(vec![])
    }

    async fn schedule_visit(&self, _customer_id: &str, _visit: ScheduleVisitRequest) -> ErpResult<ServiceTicket> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }
}

pub struct SisGpConnector {
    config: ErpConfig,
    client: Client,
}

impl SisGpConnector {
    pub fn new(config: ErpConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout_seconds))
            .build()
            .unwrap();
        Self { config, client }
    }
}

#[async_trait]
impl ErpConnector for SisGpConnector {
    fn provider(&self) -> ErpProvider {
        ErpProvider::SisGp
    }

    async fn test_connection(&self) -> ErpResult<bool> {
        Ok(true) // Placeholder
    }

    async fn get_customer_by_document(&self, _cpf_cnpj: &str) -> ErpResult<Customer> {
        Err(ErpError::Other { message: "SisGP connector not fully implemented".to_string() })
    }

    async fn get_customer_by_id(&self, _id: &str) -> ErpResult<Customer> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_customer_invoices(&self, _customer_id: &str, _limit: Option<u32>) -> ErpResult<Vec<Invoice>> {
        Ok(vec![])
    }

    async fn get_service_status(&self, _customer_id: &str) -> ErpResult<ServiceStatus> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn create_ticket(&self, _ticket: CreateTicketRequest) -> ErpResult<ServiceTicket> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_customer_tickets(&self, _customer_id: &str, _limit: Option<u32>) -> ErpResult<Vec<ServiceTicket>> {
        Ok(vec![])
    }

    async fn update_customer(&self, _customer_id: &str, _updates: UpdateCustomerRequest) -> ErpResult<Customer> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }

    async fn get_service_plans(&self) -> ErpResult<Vec<ServicePlan>> {
        Ok(vec![])
    }

    async fn schedule_visit(&self, _customer_id: &str, _visit: ScheduleVisitRequest) -> ErpResult<ServiceTicket> {
        Err(ErpError::Other { message: "Not implemented".to_string() })
    }
}

// =============================================================================
// Background Services
// =============================================================================

pub struct ErpSyncService {
    manager: Arc<ErpManager>,
}

impl ErpSyncService {
    pub fn new(manager: Arc<ErpManager>) -> Self {
        Self { manager }
    }

    pub async fn start_background_sync(&self) {
        let manager = self.manager.clone();
        
        // Cache cleanup task
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
            loop {
                interval.tick().await;
                manager.cleanup_cache().await;
            }
        });

        // TODO: Add periodic sync tasks for each ERP
        // - Sync customer data
        // - Sync invoices
        // - Sync service status
        // - Update cached data
    }
}

// =============================================================================
// Metrics and Monitoring
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ErpMetrics {
    pub provider: ErpProvider,
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub average_response_time_ms: f64,
    pub last_sync: Option<DateTime<Utc>>,
}

pub struct ErpMetricsCollector {
    metrics: DashMap<ErpProvider, ErpMetrics>,
}

impl ErpMetricsCollector {
    pub fn new() -> Self {
        Self {
            metrics: DashMap::new(),
        }
    }

    pub fn record_request(&self, provider: ErpProvider, success: bool, response_time: Duration) {
        let mut metrics = self.metrics.entry(provider.clone()).or_insert_with(|| ErpMetrics {
            provider: provider.clone(),
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            cache_hits: 0,
            cache_misses: 0,
            average_response_time_ms: 0.0,
            last_sync: None,
        });

        metrics.total_requests += 1;
        if success {
            metrics.successful_requests += 1;
        } else {
            metrics.failed_requests += 1;
        }

        // Update average response time
        let current_avg = metrics.average_response_time_ms;
        let new_time = response_time.as_millis() as f64;
        metrics.average_response_time_ms = (current_avg * (metrics.total_requests - 1) as f64 + new_time) / metrics.total_requests as f64;
    }

    pub fn record_cache_hit(&self, provider: ErpProvider) {
        if let Some(mut metrics) = self.metrics.get_mut(&provider) {
            metrics.cache_hits += 1;
        }
    }

    pub fn record_cache_miss(&self, provider: ErpProvider) {
        if let Some(mut metrics) = self.metrics.get_mut(&provider) {
            metrics.cache_misses += 1;
        }
    }

    pub fn get_metrics(&self, provider: &ErpProvider) -> Option<ErpMetrics> {
        self.metrics.get(provider).map(|entry| entry.clone())
    }

    pub fn get_all_metrics(&self) -> Vec<ErpMetrics> {
        self.metrics.iter().map(|entry| entry.value().clone()).collect()
    }
}