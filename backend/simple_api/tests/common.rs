use actix_web::{test, web, App};
use serde_json::json;

// Test configuration with real credentials from .env
pub struct TestConfig {
    pub whatsapp_phone_id: String,
    pub whatsapp_token: String,
    pub test_phone_number: String,
    pub jwt_secret: String,
    pub database_url: String,
}

impl TestConfig {
    pub fn new() -> Self {
        dotenvy::dotenv().ok();
        
        Self {
            whatsapp_phone_id: "574293335763643".to_string(),
            whatsapp_token: "EAAJLLK95RIUBPBxhYMQQGrHFhhVTgGrdMKLDbTXK3p1udVslhZBkVMgzF4MfBIklsRVZAKXu9sHqpELTaZAZAEDuctKSFFGnPYDXQUU1tq9fa2M20vGtApxp5zdIH39pQyIxEUwm4Mm2e7EfNTOtqnNVSoZAFoJZBv0sheUaMyCXSKzOhr0U9vQMCrN1kBiRMkqQZDZD".to_string(),
            test_phone_number: "+5561994013828".to_string(),
            jwt_secret: "development_jwt_secret_change_in_production".to_string(),
            database_url: "postgresql://pytake:pytake_dev@localhost:5432/pytake".to_string(),
        }
    }
}

// Helper function to create test app
pub async fn create_test_app() -> impl actix_web::dev::Service<
    actix_http::Request,
    Response = actix_web::dev::ServiceResponse,
    Error = actix_web::Error,
> {
    test::init_service(
        App::new()
            .wrap(actix_cors::Cors::permissive())
            .configure(|cfg| {
                // Configure your routes here
            })
    ).await
}

// Helper to create auth header
pub fn auth_header(token: &str) -> (String, String) {
    ("Authorization".to_string(), format!("Bearer {}", token))
}

// Helper to create test user credentials
pub fn test_user_credentials() -> serde_json::Value {
    json!({
        "email": "test@pytake.com",
        "password": "test123456"
    })
}

// Helper to create admin user credentials
pub fn admin_user_credentials() -> serde_json::Value {
    json!({
        "email": "admin@pytake.com",
        "password": "admin123"
    })
}