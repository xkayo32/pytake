use actix_web::{web, HttpResponse, Result as ActixResult};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use utoipa::ToSchema;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

use crate::erp_connectors::{
    ErpManager, ErpProvider, ErpConfig, Customer, Invoice, ServiceStatus, ServiceTicket,
    CreateTicketRequest, ScheduleVisitRequest, ServicePlan,
    ErpError, HubSoftConnector, IxcSoftConnector, MkSolutionsConnector,
    SisGpConnector, ErpMetricsCollector, ErpMetrics
};
use crate::auth::AuthService;

// =============================================================================
// Request/Response Types
// =============================================================================

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ErpConnectRequest {
    pub provider: ErpProvider,
    pub base_url: String,
    pub api_key: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tenant_id: Option<String>,
    pub timeout_seconds: Option<u64>,
    pub rate_limit_per_minute: Option<u32>,
    pub retry_attempts: Option<u32>,
    pub cache_ttl_seconds: Option<u64>,
    pub custom_headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ErpConnectResponse {
    pub success: bool,
    pub message: String,
    pub provider: ErpProvider,
    pub connection_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CustomerSearchRequest {
    pub cpf_cnpj: Option<String>,
    pub customer_id: Option<String>,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CustomerSearchResponse {
    pub customers: Vec<Customer>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct InvoiceListRequest {
    pub limit: Option<u32>,
    pub status: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct InvoiceListResponse {
    pub invoices: Vec<Invoice>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ServiceStatusResponse {
    pub status: ServiceStatus,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TicketListResponse {
    pub tickets: Vec<ServiceTicket>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateTicketResponse {
    pub ticket: ServiceTicket,
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ServicePlansResponse {
    pub plans: Vec<ServicePlan>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ErpHealthResponse {
    pub provider: ErpProvider,
    pub status: String,
    pub last_check: DateTime<Utc>,
    pub response_time_ms: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ErpMetricsResponse {
    pub metrics: Vec<ErpMetrics>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
    pub message: String,
    pub timestamp: DateTime<Utc>,
}

// =============================================================================
// Application State
// =============================================================================

#[derive(Clone)]
pub struct ErpState {
    pub manager: Arc<ErpManager>,
    pub metrics: Arc<ErpMetricsCollector>,
    pub auth: Arc<AuthService>,
}

// =============================================================================
// HTTP Handlers
// =============================================================================

/// Connect to an ERP provider
#[utoipa::path(
    post,
    path = "/api/v1/erp/connect/{provider}",
    tag = "ERP Integration",
    params(
        ("provider" = ErpProvider, Path, description = "ERP provider to connect to")
    ),
    request_body = ErpConnectRequest,
    responses(
        (status = 200, description = "Successfully connected to ERP", body = ErpConnectResponse),
        (status = 400, description = "Invalid request parameters", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn connect_erp(
    path: web::Path<String>,
    req: web::Json<ErpConnectRequest>,
    data: web::Data<ErpState>,
) -> ActixResult<HttpResponse> {
    let provider_str = path.into_inner();
    let provider = match provider_str.to_lowercase().as_str() {
        "hubsoft" => ErpProvider::HubSoft,
        "ixcsoft" => ErpProvider::IxcSoft,
        "mksolutions" => ErpProvider::MkSolutions,
        "sisgp" => ErpProvider::SisGp,
        _ => {
            return Ok(HttpResponse::BadRequest().json(ErrorResponse {
                error: "INVALID_PROVIDER".to_string(),
                code: "E001".to_string(),
                message: format!("Invalid ERP provider: {}", provider_str),
                timestamp: Utc::now(),
            }));
        }
    };

    let config = ErpConfig {
        provider: provider.clone(),
        base_url: req.base_url.clone(),
        api_key: req.api_key.clone(),
        username: req.username.clone(),
        password: req.password.clone(),
        tenant_id: req.tenant_id.clone(),
        timeout_seconds: req.timeout_seconds.unwrap_or(30),
        rate_limit_per_minute: req.rate_limit_per_minute.unwrap_or(60),
        retry_attempts: req.retry_attempts.unwrap_or(3),
        cache_ttl_seconds: req.cache_ttl_seconds.unwrap_or(300),
        custom_headers: req.custom_headers.clone().unwrap_or_default(),
    };

    // Create connector based on provider
    let connector: Arc<dyn crate::erp_connectors::ErpConnector> = match provider {
        ErpProvider::HubSoft => Arc::new(HubSoftConnector::new(config.clone())),
        ErpProvider::IxcSoft => Arc::new(IxcSoftConnector::new(config.clone())),
        ErpProvider::MkSolutions => Arc::new(MkSolutionsConnector::new(config.clone())),
        ErpProvider::SisGp => Arc::new(SisGpConnector::new(config.clone())),
    };

    match data.manager.register_connector(connector, &config).await {
        Ok(_) => {
            let connection_id = Uuid::new_v4().to_string();
            Ok(HttpResponse::Ok().json(ErpConnectResponse {
                success: true,
                message: "Successfully connected to ERP".to_string(),
                provider,
                connection_id: Some(connection_id),
            }))
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(ErrorResponse {
            error: "CONNECTION_FAILED".to_string(),
            code: "E002".to_string(),
            message: format!("Failed to connect to ERP: {}", e),
            timestamp: Utc::now(),
        })),
    }
}

/// Get customer by CPF/CNPJ
#[utoipa::path(
    get,
    path = "/api/v1/erp/{provider}/customers/{cpf_cnpj}",
    tag = "ERP Integration",
    params(
        ("provider" = String, Path, description = "ERP provider"),
        ("cpf_cnpj" = String, Path, description = "Customer CPF or CNPJ")
    ),
    responses(
        (status = 200, description = "Customer found", body = Customer),
        (status = 404, description = "Customer not found", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn get_customer(
    path: web::Path<(String, String)>,
    data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let (provider_str, cpf_cnpj) = path.into_inner();
    let provider = match parse_provider(&provider_str) {
        Ok(provider) => provider,
        Err(error_response) => return Ok(HttpResponse::BadRequest().json(error_response)),
    };

    let start = std::time::Instant::now();
    
    match data.manager.get_customer_by_document(provider.clone(), &cpf_cnpj).await {
        Ok(customer) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, true, elapsed);
            Ok(HttpResponse::Ok().json(customer))
        }
        Err(ErpError::CustomerNotFound { .. }) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, false, elapsed);
            Ok(HttpResponse::NotFound().json(ErrorResponse {
                error: "CUSTOMER_NOT_FOUND".to_string(),
                code: "E003".to_string(),
                message: format!("Customer with CPF/CNPJ {} not found", cpf_cnpj),
                timestamp: Utc::now(),
            }))
        }
        Err(e) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, false, elapsed);
            Ok(HttpResponse::InternalServerError().json(ErrorResponse {
                error: "ERP_ERROR".to_string(),
                code: "E004".to_string(),
                message: format!("ERP error: {}", e),
                timestamp: Utc::now(),
            }))
        }
    }
}

/// Get customer invoices
#[utoipa::path(
    get,
    path = "/api/v1/erp/{provider}/customers/{customer_id}/invoices",
    tag = "ERP Integration",
    params(
        ("provider" = String, Path, description = "ERP provider"),
        ("customer_id" = String, Path, description = "Customer ID"),
        ("limit" = Option<u32>, Query, description = "Maximum number of invoices to return")
    ),
    responses(
        (status = 200, description = "Customer invoices", body = InvoiceListResponse),
        (status = 404, description = "Customer not found", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn get_customer_invoices(
    path: web::Path<(String, String)>,
    query: web::Query<InvoiceListRequest>,
    data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let (provider_str, customer_id) = path.into_inner();
    let provider = match parse_provider(&provider_str) {
        Ok(provider) => provider,
        Err(error_response) => return Ok(HttpResponse::BadRequest().json(error_response)),
    };

    let start = std::time::Instant::now();

    match data.manager.get_customer_invoices(provider.clone(), &customer_id, query.limit).await {
        Ok(invoices) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, true, elapsed);
            
            let response = InvoiceListResponse {
                total: invoices.len(),
                invoices,
            };
            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, false, elapsed);
            Ok(HttpResponse::InternalServerError().json(ErrorResponse {
                error: "ERP_ERROR".to_string(),
                code: "E005".to_string(),
                message: format!("Failed to get invoices: {}", e),
                timestamp: Utc::now(),
            }))
        }
    }
}

/// Get customer service status
#[utoipa::path(
    get,
    path = "/api/v1/erp/{provider}/customers/{customer_id}/status",
    tag = "ERP Integration",
    params(
        ("provider" = String, Path, description = "ERP provider"),
        ("customer_id" = String, Path, description = "Customer ID")
    ),
    responses(
        (status = 200, description = "Service status", body = ServiceStatusResponse),
        (status = 404, description = "Customer not found", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn get_service_status(
    path: web::Path<(String, String)>,
    data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let (provider_str, customer_id) = path.into_inner();
    let provider = match parse_provider(&provider_str) {
        Ok(provider) => provider,
        Err(error_response) => return Ok(HttpResponse::BadRequest().json(error_response)),
    };

    let start = std::time::Instant::now();

    match data.manager.get_service_status(provider.clone(), &customer_id).await {
        Ok(status) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, true, elapsed);
            
            let response = ServiceStatusResponse {
                status,
                last_updated: Utc::now(),
            };
            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, false, elapsed);
            Ok(HttpResponse::InternalServerError().json(ErrorResponse {
                error: "ERP_ERROR".to_string(),
                code: "E006".to_string(),
                message: format!("Failed to get service status: {}", e),
                timestamp: Utc::now(),
            }))
        }
    }
}

/// Create a service ticket
#[utoipa::path(
    post,
    path = "/api/v1/erp/{provider}/tickets",
    tag = "ERP Integration",
    params(
        ("provider" = String, Path, description = "ERP provider")
    ),
    request_body = CreateTicketRequest,
    responses(
        (status = 200, description = "Ticket created successfully", body = CreateTicketResponse),
        (status = 400, description = "Invalid request parameters", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn create_ticket(
    path: web::Path<String>,
    req: web::Json<CreateTicketRequest>,
    data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let provider_str = path.into_inner();
    let provider = match parse_provider(&provider_str) {
        Ok(provider) => provider,
        Err(error_response) => return Ok(HttpResponse::BadRequest().json(error_response)),
    };

    let start = std::time::Instant::now();

    match data.manager.create_ticket(provider.clone(), req.into_inner()).await {
        Ok(ticket) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, true, elapsed);
            
            let response = CreateTicketResponse {
                ticket,
                success: true,
                message: "Ticket created successfully".to_string(),
            };
            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            let elapsed = start.elapsed();
            data.metrics.record_request(provider, false, elapsed);
            Ok(HttpResponse::InternalServerError().json(ErrorResponse {
                error: "ERP_ERROR".to_string(),
                code: "E007".to_string(),
                message: format!("Failed to create ticket: {}", e),
                timestamp: Utc::now(),
            }))
        }
    }
}

/// Get service plans
#[utoipa::path(
    get,
    path = "/api/v1/erp/{provider}/plans",
    tag = "ERP Integration",
    params(
        ("provider" = String, Path, description = "ERP provider")
    ),
    responses(
        (status = 200, description = "Service plans", body = ServicePlansResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn get_service_plans(
    path: web::Path<String>,
    _data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let provider_str = path.into_inner();
    let _provider = match parse_provider(&provider_str) {
        Ok(provider) => provider,
        Err(error_response) => return Ok(HttpResponse::BadRequest().json(error_response)),
    };

    // This would need to be implemented in the manager
    let response = ServicePlansResponse {
        plans: vec![], // Placeholder
        total: 0,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

/// Get ERP health status
#[utoipa::path(
    get,
    path = "/api/v1/erp/{provider}/health",
    tag = "ERP Integration",
    params(
        ("provider" = String, Path, description = "ERP provider")
    ),
    responses(
        (status = 200, description = "ERP health status", body = ErpHealthResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn get_erp_health(
    path: web::Path<String>,
    _data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let provider_str = path.into_inner();
    let provider = match parse_provider(&provider_str) {
        Ok(provider) => provider,
        Err(error_response) => return Ok(HttpResponse::BadRequest().json(error_response)),
    };

    // This would need to be implemented to check actual ERP health
    let response = ErpHealthResponse {
        provider,
        status: "healthy".to_string(),
        last_check: Utc::now(),
        response_time_ms: Some(150.0),
    };
    
    Ok(HttpResponse::Ok().json(response))
}

/// Get ERP metrics
#[utoipa::path(
    get,
    path = "/api/v1/erp/metrics",
    tag = "ERP Integration",
    responses(
        (status = 200, description = "ERP metrics", body = ErpMetricsResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn get_erp_metrics(
    data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let metrics = data.metrics.get_all_metrics();
    
    let response = ErpMetricsResponse { metrics };
    Ok(HttpResponse::Ok().json(response))
}

/// Advanced customer search
#[utoipa::path(
    post,
    path = "/api/v1/erp/{provider}/customers/search",
    tag = "ERP Integration",
    params(
        ("provider" = String, Path, description = "ERP provider")
    ),
    request_body = CustomerSearchRequest,
    responses(
        (status = 200, description = "Search results", body = CustomerSearchResponse),
        (status = 400, description = "Invalid search parameters", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn search_customers(
    path: web::Path<String>,
    req: web::Json<CustomerSearchRequest>,
    data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let provider_str = path.into_inner();
    let provider = match parse_provider(&provider_str) {
        Ok(provider) => provider,
        Err(error_response) => return Ok(HttpResponse::BadRequest().json(error_response)),
    };

    // For now, only support CPF/CNPJ search
    if let Some(cpf_cnpj) = &req.cpf_cnpj {
        match data.manager.get_customer_by_document(provider, cpf_cnpj).await {
            Ok(customer) => {
                let response = CustomerSearchResponse {
                    customers: vec![customer],
                    total: 1,
                };
                Ok(HttpResponse::Ok().json(response))
            }
            Err(_) => {
                let response = CustomerSearchResponse {
                    customers: vec![],
                    total: 0,
                };
                Ok(HttpResponse::Ok().json(response))
            }
        }
    } else {
        Ok(HttpResponse::BadRequest().json(ErrorResponse {
            error: "INVALID_SEARCH_PARAMS".to_string(),
            code: "E008".to_string(),
            message: "At least one search parameter must be provided".to_string(),
            timestamp: Utc::now(),
        }))
    }
}

/// Schedule a technical visit
#[utoipa::path(
    post,
    path = "/api/v1/erp/{provider}/customers/{customer_id}/schedule-visit",
    tag = "ERP Integration",
    params(
        ("provider" = String, Path, description = "ERP provider"),
        ("customer_id" = String, Path, description = "Customer ID")
    ),
    request_body = ScheduleVisitRequest,
    responses(
        (status = 200, description = "Visit scheduled successfully", body = ServiceTicket),
        (status = 400, description = "Invalid request parameters", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_token" = [])
    )
)]
pub async fn schedule_visit(
    path: web::Path<(String, String)>,
    _req: web::Json<ScheduleVisitRequest>,
    _data: web::Data<ErpState>,
    ) -> ActixResult<HttpResponse> {
    let (provider_str, _customer_id) = path.into_inner();
    let _provider = match parse_provider(&provider_str) {
        Ok(provider) => provider,
        Err(error_response) => return Ok(HttpResponse::BadRequest().json(error_response)),
    };

    // This would need to be implemented in the manager
    Ok(HttpResponse::InternalServerError().json(ErrorResponse {
        error: "NOT_IMPLEMENTED".to_string(),
        code: "E009".to_string(),
        message: "Visit scheduling not yet implemented".to_string(),
        timestamp: Utc::now(),
    }))
}

// =============================================================================
// Helper Functions
// =============================================================================

fn parse_provider(provider_str: &str) -> Result<ErpProvider, ErrorResponse> {
    match provider_str.to_lowercase().as_str() {
        "hubsoft" => Ok(ErpProvider::HubSoft),
        "ixcsoft" => Ok(ErpProvider::IxcSoft),
        "mksolutions" => Ok(ErpProvider::MkSolutions),
        "sisgp" => Ok(ErpProvider::SisGp),
        _ => Err(ErrorResponse {
            error: "INVALID_PROVIDER".to_string(),
            code: "E001".to_string(),
            message: format!("Invalid ERP provider: {}", provider_str),
            timestamp: Utc::now(),
        }),
    }
}

// =============================================================================
// Route Configuration
// =============================================================================

pub fn configure_erp_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/erp")
            .route("/connect/{provider}", web::post().to(connect_erp))
            .route("/metrics", web::get().to(get_erp_metrics))
            .route("/{provider}/health", web::get().to(get_erp_health))
            .route("/{provider}/plans", web::get().to(get_service_plans))
            .route("/{provider}/customers/{cpf_cnpj}", web::get().to(get_customer))
            .route("/{provider}/customers/search", web::post().to(search_customers))
            .route("/{provider}/customers/{customer_id}/invoices", web::get().to(get_customer_invoices))
            .route("/{provider}/customers/{customer_id}/status", web::get().to(get_service_status))
            .route("/{provider}/customers/{customer_id}/schedule-visit", web::post().to(schedule_visit))
            .route("/{provider}/tickets", web::post().to(create_ticket))
    );
}

// =============================================================================
// WhatsApp Integration Handlers (for ISP Use Cases)
// =============================================================================

// WhatsApp integration would be added here when needed
// use crate::whatsapp_handlers::WhatsAppState;

/// Handle WhatsApp message for ISP customer service
pub async fn handle_isp_whatsapp_message(
    message: &str,
    _phone: &str,
    erp_state: &ErpState,
    // whatsapp_state: &WhatsAppState, // Will be used when WhatsApp integration is needed
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let message_lower = message.to_lowercase();
    let message_lower = message_lower.trim();
    
    // Extract CPF/CNPJ from message
    let cpf_cnpj = extract_cpf_cnpj(message)?;
    
    match message_lower {
        msg if msg.contains("fatura") || msg.contains("boleto") || msg.contains("conta") => {
            handle_invoice_request(&cpf_cnpj, erp_state).await
        },
        msg if msg.contains("internet") || msg.contains("velocidade") || msg.contains("conexão") => {
            handle_service_status_request(&cpf_cnpj, erp_state).await
        },
        msg if msg.contains("problema") || msg.contains("suporte") || msg.contains("técnico") => {
            handle_support_request(&cpf_cnpj, message, erp_state).await
        },
        msg if msg.contains("plano") || msg.contains("mudar") || msg.contains("upgrade") => {
            handle_plan_request(erp_state).await
        },
        _ => {
            Ok("Olá! Sou o assistente virtual do seu provedor de internet. 

Posso ajudá-lo com:
🧾 *Faturas e boletos*
🌐 *Status da internet*
🛠️ *Suporte técnico*
📋 *Informações sobre planos*

Por favor, informe seu CPF para que eu possa localizá-lo em nosso sistema.".to_string())
        }
    }
}

async fn handle_invoice_request(
    cpf_cnpj: &str,
    erp_state: &ErpState,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // Try different ERP providers (in real implementation, you'd know which one to use)
    for provider in [ErpProvider::HubSoft, ErpProvider::IxcSoft] {
        if let Ok(customer) = erp_state.manager.get_customer_by_document(provider.clone(), cpf_cnpj).await {
            if let Ok(invoices) = erp_state.manager.get_customer_invoices(provider, &customer.id, Some(3)).await {
                if invoices.is_empty() {
                    return Ok("Você está em dia com suas faturas! 🎉".to_string());
                }

                let mut response = format!("💳 *Suas últimas faturas, {}:*\n\n", customer.name);
                
                for invoice in invoices.iter().take(3) {
                    let status_emoji = match invoice.status {
                        crate::erp_connectors::InvoiceStatus::Paid => "✅",
                        crate::erp_connectors::InvoiceStatus::Pending => "⏰",
                        crate::erp_connectors::InvoiceStatus::Overdue => "🔴",
                        _ => "ℹ️",
                    };
                    
                    let status_text = match invoice.status {
                        crate::erp_connectors::InvoiceStatus::Paid => "Paga",
                        crate::erp_connectors::InvoiceStatus::Pending => "Pendente",
                        crate::erp_connectors::InvoiceStatus::Overdue => "Vencida",
                        _ => "Outros",
                    };

                    response.push_str(&format!(
                        "{} *Fatura #{}\n   Valor: R$ {:.2}\n   Vencimento: {}\n   Status: {}*\n\n",
                        status_emoji,
                        invoice.number,
                        invoice.amount,
                        invoice.due_date.format("%d/%m/%Y"),
                        status_text
                    ));
                }

                response.push_str("Para segunda via ou mais informações, digite *2ª via*");
                return Ok(response);
            }
        }
    }
    
    Ok("Não consegui encontrar suas faturas. Por favor, verifique se o CPF está correto ou entre em contato com nosso suporte.".to_string())
}

async fn handle_service_status_request(
    cpf_cnpj: &str,
    erp_state: &ErpState,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // Try different ERP providers
    for provider in [ErpProvider::HubSoft, ErpProvider::IxcSoft] {
        if let Ok(customer) = erp_state.manager.get_customer_by_document(provider.clone(), cpf_cnpj).await {
            if let Ok(status) = erp_state.manager.get_service_status(provider, &customer.id).await {
                let status_emoji = if status.is_active { "🟢" } else { "🔴" };
                let status_text = if status.is_active { "Ativa" } else { "Inativa" };
                
                let mut response = format!(
                    "🌐 *Status da sua internet, {}:*\n\n{} *Conexão: {}*\n",
                    customer.name, status_emoji, status_text
                );

                if let Some(speed) = status.current_speed_download {
                    response.push_str(&format!("📊 *Velocidade atual: {} Mbps*\n", speed));
                }

                if let Some(quality) = status.signal_quality {
                    let quality_percent = (quality * 100.0) as u8;
                    let quality_emoji = match quality_percent {
                        90..=100 => "🟢",
                        70..=89 => "🟡",
                        _ => "🔴",
                    };
                    response.push_str(&format!("📶 *Qualidade do sinal: {}% {}*\n", quality_percent, quality_emoji));
                }

                if let Some(last_online) = status.last_online {
                    response.push_str(&format!("⏰ *Último acesso: {}*\n", 
                        last_online.format("%d/%m/%Y às %H:%M")));
                }

                if !status.is_active {
                    response.push_str("\n❗ *Sua conexão está inativa. Para suporte técnico, digite 'suporte'.*");
                }

                return Ok(response);
            }
        }
    }
    
    Ok("Não consegui verificar o status da sua conexão. Por favor, verifique se o CPF está correto ou entre em contato com nosso suporte.".to_string())
}

async fn handle_support_request(
    cpf_cnpj: &str,
    message: &str,
    erp_state: &ErpState,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    // Try different ERP providers to find customer
    for provider in [ErpProvider::HubSoft, ErpProvider::IxcSoft] {
        if let Ok(customer) = erp_state.manager.get_customer_by_document(provider.clone(), cpf_cnpj).await {
            // Create a support ticket
            let ticket_request = CreateTicketRequest {
                customer_id: customer.id.clone(),
                title: "Suporte via WhatsApp".to_string(),
                description: format!("Cliente {} reportou via WhatsApp: {}", customer.name, message),
                category: crate::erp_connectors::TicketCategory::Technical,
                priority: crate::erp_connectors::TicketPriority::Medium,
            };

            match erp_state.manager.create_ticket(provider, ticket_request).await {
                Ok(ticket) => {
                    return Ok(format!(
                        "🎫 *Chamado criado com sucesso!*\n\nOlá {}, seu chamado foi registrado:\n\n📋 *Protocolo:* #{}\n⏰ *Abertura:* {}\n🔧 *Categoria:* Suporte Técnico\n\n*Nossa equipe entrará em contato em breve.*\n\nPara acompanhar seu chamado, guarde este número de protocolo.",
                        customer.name,
                        ticket.id,
                        ticket.created_at.format("%d/%m/%Y às %H:%M")
                    ));
                }
                Err(_) => {
                    return Ok(format!(
                        "Olá {}! Registrei sua solicitação de suporte.\n\n*Nossa equipe técnica entrará em contato em breve.*\n\nEm caso de emergência, ligue para nosso suporte: (11) 4000-0000",
                        customer.name
                    ));
                }
            }
        }
    }
    
    Ok("Para abrir um chamado de suporte, preciso localizar você em nosso sistema. Por favor, confirme seu CPF.".to_string())
}

async fn handle_plan_request(
    _erp_state: &ErpState,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let response = "📋 *Nossos planos disponíveis:*

🚀 *Plano Básico - 100 Mbps*
   💰 R$ 79,90/mês
   📡 Fibra óptica

🚀 *Plano Família - 200 Mbps*
   💰 R$ 99,90/mês
   📡 Fibra óptica + WiFi 6

🚀 *Plano Premium - 500 Mbps*
   💰 R$ 149,90/mês
   📡 Fibra óptica + WiFi 6 + IP fixo

Para mais informações ou mudança de plano, fale com nosso comercial: (11) 3000-0000

*Ou digite seu CPF que te ajudo a verificar ofertas especiais!*";

    Ok(response.to_string())
}

fn extract_cpf_cnpj(message: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    use regex::Regex;
    
    // Look for CPF pattern (11 digits)
    let cpf_regex = Regex::new(r"\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b")?;
    if let Some(captures) = cpf_regex.captures(message) {
        return Ok(captures[1].replace(".", "").replace("-", ""));
    }
    
    // Look for CNPJ pattern (14 digits)
    let cnpj_regex = Regex::new(r"\b(\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2})\b")?;
    if let Some(captures) = cnpj_regex.captures(message) {
        return Ok(captures[1].replace(".", "").replace("/", "").replace("-", ""));
    }
    
    // Look for just digits (fallback)
    let digit_regex = Regex::new(r"\b(\d{11}|\d{14})\b")?;
    if let Some(captures) = digit_regex.captures(message) {
        return Ok(captures[1].to_string());
    }
    
    Err("CPF/CNPJ não encontrado na mensagem".into())
}