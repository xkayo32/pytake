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
use crate::ai_assistant::{
    ChatRequest, ChatResponse, AnalyzeRequest, AnalyzeResponse,
    IntentClassificationRequest, IntentClassificationResponse, CustomPrompt,
    CreatePromptRequest, AIProvider, AnalysisType, IntentAlternative
};
use crate::campaign_manager::{
    Campaign, CampaignObjective, CampaignStatus, CreateCampaignRequest, 
    ListCampaignsQuery, UpdateCampaignRequest, CampaignAnalytics, 
    ImportContactsRequest, ImportResult, AddTagsRequest, Contact, 
    ContactGroup, MessageTemplate, MessageTemplateType, RecurrenceConfig, 
    ThrottleConfig, ContactSegmentation, ABTestConfig, CampaignMetrics,
    ImportContactData, ContactImportSource, MergeStrategy
};
use crate::multi_tenant::{
    Tenant, TenantPlan, TenantStatus, TenantLimits, TenantSettings,
    BillingInfo, BillingCycle, TenantUser, TenantRole, Permission,
    UserStatus, TenantApiKey, UsageMetrics, Invoice, InvoiceStatus,
    LineItem, CreateTenantRequest, UpdateTenantRequest, AddUserRequest,
    UpgradePlanRequest, CreateApiKeyRequest, ApiKeyResponse, TenantResponse
};
use crate::flow_builder::{
    FlowDefinition, NodeDefinition, NodeType, Connection, FlowSettings,
    ErrorHandlingStrategy, Position, NodeMetadata, NodeData, 
    MessageNodeData, QuestionNodeData, ConditionNodeData, ActionNodeData,
    WaitNodeData, EndNodeData, IntegrationNodeData, TemplateNodeData,
    InputType, ValidationRule, Condition, LogicalOperator, ComparisonOperator,
    ActionType, WaitType, IntegrationType, ExecutionContext, FlowSession,
    ConversationEntry, MessageSender, ExecutionStatus, FlowValidationResult,
    ValidationError, ValidationErrorType, Severity, FlowTemplate, Industry,
    FlowAnalytics, NodeMetrics, ExecutionMetrics, ABTestResults,
    CreateFlowRequest, UpdateFlowRequest, TestFlowRequest,
    ExecuteFlowRequest, FlowInputRequest
};

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
        // TODO: Add utoipa::path attributes to handlers to enable auto-documentation
        // For now, leaving empty to allow compilation
    ),
    components(
        schemas(
            // Common Response Schemas
            ErrorResponse,
            SuccessResponse,
            HealthCheckResponse,
            StatusResponse,
            
            // Auth schemas
            LoginRequest,
            RegisterRequest, 
            AuthResponse,
            UserResponse,
            
            // WhatsApp Config schemas
            CreateWhatsAppConfigRequest,
            UpdateWhatsAppConfigRequest,
            WhatsAppConfig,
            WhatsAppConfigResponse,
            HealthStatus,
            WhatsAppProvider,
            
            // WhatsApp Operation schemas
            SendMessageRequest,
            CreateInstanceRequest,
            
            // AI Assistant schemas
            ChatRequest,
            ChatResponse,
            AnalyzeRequest,
            AnalyzeResponse,
            IntentClassificationRequest,
            IntentClassificationResponse,
            CustomPrompt,
            CreatePromptRequest,
            AIProvider,
            AnalysisType,
            IntentAlternative,
            
            // Campaign Management schemas
            Campaign,
            CampaignObjective,
            CampaignStatus,
            CreateCampaignRequest,
            ListCampaignsQuery,
            UpdateCampaignRequest,
            CampaignAnalytics,
            ImportContactsRequest,
            ImportResult,
            AddTagsRequest,
            Contact,
            ContactGroup,
            MessageTemplate,
            MessageTemplateType,
            RecurrenceConfig,
            ThrottleConfig,
            ContactSegmentation,
            ABTestConfig,
            CampaignMetrics,
            ImportContactData,
            ContactImportSource,
            MergeStrategy,
            
            // Multi-tenancy schemas
            Tenant,
            TenantPlan,
            TenantStatus,
            TenantLimits,
            TenantSettings,
            BillingInfo,
            BillingCycle,
            TenantUser,
            TenantRole,
            Permission,
            UserStatus,
            TenantApiKey,
            UsageMetrics,
            Invoice,
            InvoiceStatus,
            LineItem,
            CreateTenantRequest,
            UpdateTenantRequest,
            AddUserRequest,
            UpgradePlanRequest,
            CreateApiKeyRequest,
            ApiKeyResponse,
            TenantResponse,
            
            // Flow Builder schemas
            FlowDefinition,
            NodeDefinition, 
            NodeType,
            Connection,
            FlowSettings,
            ErrorHandlingStrategy,
            Position,
            NodeMetadata,
            NodeData,
            MessageNodeData,
            QuestionNodeData,
            ConditionNodeData,
            ActionNodeData,
            WaitNodeData,
            EndNodeData,
            IntegrationNodeData,
            TemplateNodeData,
            InputType,
            ValidationRule,
            Condition,
            LogicalOperator,
            ComparisonOperator,
            ActionType,
            WaitType,
            IntegrationType,
            ExecutionContext,
            FlowSession,
            ConversationEntry,
            MessageSender,
            ExecutionStatus,
            FlowValidationResult,
            ValidationError,
            ValidationErrorType,
            Severity,
            FlowTemplate,
            Industry,
            FlowAnalytics,
            NodeMetrics,
            ExecutionMetrics,
            ABTestResults,
            CreateFlowRequest,
            UpdateFlowRequest,
            TestFlowRequest,
            ExecuteFlowRequest,
            FlowInputRequest,
            
            // TODO: WhatsAppConfigModel requires special handling as SeaORM entity
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
        (name = "Flow Builder", description = "Visual drag-and-drop chatbot flow builder with execution engine"),
        (name = "AI Assistant", description = "AI-powered chat, analysis and intent classification"),
        (name = "Campaigns", description = "Mass messaging campaign management"),
        (name = "Contacts", description = "Contact and group management"),
        (name = "Multi-Tenancy", description = "Multi-tenant organization management with billing and user roles"),
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
        nav-bg-color='#2c3e50'
        primary-color='#3498db'
        regular-font='Inter, system-ui, sans-serif'
        mono-font='Fira Code, monospace'
        font-size="default"
        use-path-in-nav-bar="false"
        nav-hover-bg-color='#34495e'
        nav-accent-color='#e74c3c'
        nav-text-color='#ecf0f1'
        layout="row"
        render-style="view"
        schema-style="tree"
        schema-expand-level="2"
        schema-description-expanded="true"
        default-schema-tab="model"
        response-area-height="400px"
        fetch-credentials='same-origin'
        update-route="true"
        route-prefix='#'
        sort-tags="false"
        sort-endpoints-by="method"
    >
        <div slot="logo" style="display: flex; align-items: center; padding: 12px;">
            <span style='color: #fff; font-size: 20px; font-weight: bold;'>🚀 PyTake API</span>
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