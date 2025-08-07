use utoipa::{
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
    Modify, OpenApi,
};
use utoipa_swagger_ui::SwaggerUi;
use utoipa_redoc::{Redoc, Servable};
use utoipa_rapidoc::RapiDoc;
use actix_web::web;

// Import all the request/response types for documentation
use crate::auth::{LoginRequest, RegisterRequest, AuthResponse, UserResponse};
use crate::whatsapp_management::{
    CreateWhatsAppConfigRequest, UpdateWhatsAppConfigRequest, 
    WhatsAppConfig, WhatsAppConfigResponse, HealthStatus, WhatsAppProvider
};
use crate::whatsapp_handlers::{SendMessageRequest, CreateInstanceRequest};
use crate::entities::whatsapp_config::Model as WhatsAppConfigModel;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "PyTake Backend API",
        version = "1.0.0",
        description = "Complete WhatsApp Business API Integration with Database-Driven Configuration Management",
        contact(
            name = "PyTake Team",
            email = "admin@pytake.com"
        ),
        license(
            name = "MIT"
        )
    ),
    servers(
        (url = "http://localhost:8080", description = "Local development server"),
        (url = "https://api.pytake.com", description = "Production server")
    ),
    paths(
        // Health & Status
        crate::health,
        crate::status,
        crate::root,
        
        // Authentication - In-Memory
        crate::auth::login,
        crate::auth::register,
        crate::auth::me,
        crate::auth::logout,
        
        // Authentication - Database
        crate::auth_db::login_db,
        crate::auth_db::register_db,
        crate::auth_db::me_db,
        crate::auth_db::logout_db,
        
        // WhatsApp Configuration Management
        crate::whatsapp_db_handlers::list_configs,
        crate::whatsapp_db_handlers::get_config,
        crate::whatsapp_db_handlers::create_config,
        crate::whatsapp_db_handlers::update_config,
        crate::whatsapp_db_handlers::delete_config,
        crate::whatsapp_db_handlers::test_config,
        crate::whatsapp_db_handlers::get_default_config,
        crate::whatsapp_db_handlers::set_default_config,
        
        // WhatsApp Operations
        crate::whatsapp_handlers::create_instance,
        crate::whatsapp_handlers::get_instance_status,
        crate::whatsapp_handlers::get_qr_code,
        crate::whatsapp_handlers::send_message,
        crate::whatsapp_handlers::list_instances,
        crate::whatsapp_handlers::delete_instance,
        crate::whatsapp_handlers::webhook_handler,
        
        // WebSocket
        crate::websocket_improved::websocket_stats,
        
        // Agent Conversations
        crate::agent_conversations::get_agent_conversations,
        crate::agent_conversations::get_conversation_messages,
        crate::agent_conversations::assign_conversation,
        crate::agent_conversations::resolve_conversation,
        
        // Dashboard
        crate::dashboard::get_dashboard_metrics,
        crate::dashboard::get_conversation_analytics,
        crate::dashboard::get_agent_performance,
        
        // Flows
        crate::flows::list_flows,
        crate::flows::get_flow,
        crate::flows::create_flow,
        crate::flows::update_flow,
        crate::flows::delete_flow,
        crate::flows::test_flow,
    ),
    components(
        schemas(
            // Auth Schemas
            LoginRequest,
            RegisterRequest,
            AuthResponse,
            UserResponse,
            
            // WhatsApp Config Schemas
            CreateWhatsAppConfigRequest,
            UpdateWhatsAppConfigRequest,
            WhatsAppConfig,
            WhatsAppConfigResponse,
            WhatsAppConfigModel,
            HealthStatus,
            WhatsAppProvider,
            
            // WhatsApp Operation Schemas
            SendMessageRequest,
            CreateInstanceRequest,
            
            // Common Response Schemas
            ErrorResponse,
            SuccessResponse,
            HealthCheckResponse,
            StatusResponse,
        )
    ),
    modifiers(&SecurityAddon),
    tags(
        (name = "Health", description = "Health check and status endpoints"),
        (name = "Authentication", description = "User authentication and authorization"),
        (name = "WhatsApp Config", description = "WhatsApp configuration management"),
        (name = "WhatsApp Operations", description = "WhatsApp messaging operations"),
        (name = "WebSocket", description = "Real-time WebSocket connections"),
        (name = "Agent", description = "Agent conversation management"),
        (name = "Dashboard", description = "Analytics and metrics"),
        (name = "Flows", description = "Conversation flow builder"),
    )
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("Authorization"))),
            )
        }
    }
}

// Common response schemas
#[derive(serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct ErrorResponse {
    pub error: String,
    pub message: Option<String>,
    pub code: Option<i32>,
}

#[derive(serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct SuccessResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

#[derive(serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct HealthCheckResponse {
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub service: String,
}

#[derive(serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct StatusResponse {
    pub status: String,
    pub version: String,
    pub service: String,
    pub features: Vec<String>,
}

/// Configure API documentation routes
pub fn configure_docs(cfg: &mut web::ServiceConfig) {
    cfg
        // Swagger UI - Primary documentation interface
        .service(
            SwaggerUi::new("/docs/{_:.*}")
                .url("/api-docs/openapi.json", ApiDoc::openapi())
                .config(utoipa_swagger_ui::Config::default()
                    .try_it_out_enabled(true)
                    .filter(true)
                    .sort_alphabetically(true)
                    .deep_linking(true)
                    .display_request_duration(true)
                    .show_extensions(true)
                    .show_common_extensions(true)
                    .default_models_expand_depth(2)
                    .default_model_expand_depth(2)
                    .doc_expansion("list")
                ),
        )
        // ReDoc - Alternative documentation with better search
        .service(
            Redoc::with_url("/redoc", ApiDoc::openapi())
                .custom_html(CUSTOM_REDOC_HTML),
        )
        // RapiDoc - Modern documentation interface
        .service(
            RapiDoc::new("/api-docs/openapi.json")
                .path("/rapidoc")
                .custom_html(CUSTOM_RAPIDOC_HTML),
        );
}

const CUSTOM_REDOC_HTML: &str = r#"<!DOCTYPE html>
<html>
<head>
    <title>PyTake API Documentation - ReDoc</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { margin: 0; padding: 0; }
        #redoc-container { height: 100vh; }
    </style>
</head>
<body>
    <div id="redoc-container"></div>
    <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js"></script>
    <script>
        Redoc.init('/api-docs/openapi.json', {
            theme: {
                colors: { primary: { main: '#1976d2' } },
                typography: { fontSize: '16px', fontFamily: 'Inter, system-ui, sans-serif' }
            },
            scrollYOffset: 50,
            hideDownloadButton: false,
            disableSearch: false,
            expandResponses: '200,201',
            requiredPropsFirst: true,
            sortPropsAlphabetically: true,
            showExtensions: true,
            hideSingleRequestSampleTab: false,
            jsonSampleExpandLevel: 2,
            hideSchemaTitles: false,
            simpleOneOfTypeLabel: false,
            menuToggle: true,
            suppressWarnings: false,
            payloadSampleIdx: 0,
            expandSingleSchemaField: false,
            generatedPayloadSamplesMaxDepth: 10
        }, document.getElementById('redoc-container'));
    </script>
</body>
</html>"#;

const CUSTOM_RAPIDOC_HTML: &str = r#"<!DOCTYPE html>
<html>
<head>
    <title>PyTake API Documentation - RapiDoc</title>
    <meta charset="utf-8">
    <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
</head>
<body>
    <rapi-doc 
        spec-url="/api-docs/openapi.json"
        theme="dark"
        render-style="view"
        style="height:100vh; width:100%"
        show-header="true"
        allow-try="true"
        allow-authentication="true"
        allow-server-selection="true"
        show-info="true"
        show-components="true"
        nav-bg-color="#2c3e50"
        primary-color="#3498db"
        regular-font="Inter, system-ui, sans-serif"
        mono-font="'Fira Code', monospace"
        font-size="default"
        use-path-in-nav-bar="false"
        nav-hover-bg-color="#34495e"
        nav-accent-color="#e74c3c"
        nav-text-color="#ecf0f1"
        layout="row"
        render-style="view"
        schema-style="tree"
        schema-expand-level="2"
        schema-description-expanded="true"
        default-schema-tab="model"
        response-area-height="400px"
        fetch-credentials="same-origin"
        update-route="true"
        route-prefix="#"
        sort-tags="false"
        sort-endpoints-by="method"
    >
        <div slot="logo" style="display: flex; align-items: center; padding: 12px;">
            <span style="color: #fff; font-size: 20px; font-weight: bold;">🚀 PyTake API</span>
        </div>
    </rapi-doc>
</body>
</html>"#;

/// Generate OpenAPI JSON specification
pub fn get_openapi_json() -> String {
    ApiDoc::openapi().to_pretty_json().unwrap_or_else(|_| "{}".to_string())
}

/// Generate OpenAPI YAML specification
pub fn get_openapi_yaml() -> String {
    serde_yaml::to_string(&ApiDoc::openapi()).unwrap_or_else(|_| "".to_string())
}