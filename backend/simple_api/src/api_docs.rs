use utoipa::{
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
    Modify, OpenApi,
};
use utoipa_swagger_ui::SwaggerUi;
use utoipa_redoc::{Redoc, Servable};
use utoipa_rapidoc::RapiDoc;
use actix_web::web;

// Import only the essential types for documentation
use crate::auth::{LoginRequest, RegisterRequest, AuthResponse, UserResponse};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "PyTake WhatsApp Business API",
        version = "1.0.0",
        description = "Complete WhatsApp Business automation platform with multi-provider support",
        contact(
            name = "PyTake Support",
            url = "https://pytake.com/support",
            email = "support@pytake.com"
        ),
        license(name = "MIT", url = "https://opensource.org/licenses/MIT")
    ),
    servers(
        (url = "http://localhost:8080", description = "Development server"),
        (url = "https://api.pytake.com", description = "Production server")
    ),
    paths(),
    components(schemas(
        // Authentication schemas
        LoginRequest, 
        RegisterRequest, 
        AuthResponse,
        UserResponse
    )),
    modifiers(&SecurityAddon),
    tags(
        (name = "Authentication", description = "User authentication and session management"),
        (name = "WhatsApp Config", description = "WhatsApp provider configuration management"),
        (name = "WhatsApp Operations", description = "Send messages and manage instances"),
        (name = "Health", description = "System health checks and monitoring")
    )
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.as_mut().unwrap();
        components.add_security_scheme(
            "bearer_auth",
            SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("Authorization"))),
        );
    }
}

/// Health check response
#[derive(serde::Serialize, utoipa::ToSchema)]
pub struct HealthCheckResponse {
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub service: String,
}

pub fn get_openapi_json() -> String {
    ApiDoc::openapi().to_pretty_json().unwrap_or_else(|_| "{}".to_string())
}

pub fn configure_docs(cfg: &mut web::ServiceConfig) {
    cfg
        .service(SwaggerUi::new("/docs/{_:.*}").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .service(Redoc::with_url("/redoc", ApiDoc::openapi()))
        .service(RapiDoc::new("/api-docs/openapi.json").path("/rapidoc"));
}