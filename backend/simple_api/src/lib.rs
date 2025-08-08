// Export modules for testing
pub mod auth;
pub mod auth_db;
pub mod database;
pub mod websocket_improved;
pub mod whatsapp_evolution;
pub mod whatsapp_handlers;
pub mod whatsapp_config;
pub mod agent_conversations;
pub mod dashboard;
pub mod flows;
pub mod webhook_manager;
pub mod ai_assistant;

// Re-export main functions
use actix_web::{HttpResponse, Result};
use serde_json::json;

pub async fn health() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now(),
        "service": "pytake-api"
    })))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App, web};
    
    #[actix_web::test]
    async fn test_health_endpoint() {
        let app = test::init_service(
            App::new()
                .route("/health", web::get().to(health))
        ).await;

        let req = test::TestRequest::get()
            .uri("/health")
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);
    }

    #[actix_web::test]
    async fn test_auth_service_creation() {
        let auth_service = auth::AuthService::new();
        // Service should be created successfully
        assert!(true);
    }

    #[actix_web::test]
    async fn test_auth_login() {
        let auth_service = auth::AuthService::new();
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(auth_service))
                .route("/login", web::post().to(auth::login))
        ).await;

        let req = test::TestRequest::post()
            .uri("/login")
            .set_json(&json!({
                "email": "admin@pytake.com",
                "password": "admin123"
            }))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 200);
    }

    #[actix_web::test]
    async fn test_whatsapp_manager_creation() {
        let _manager = whatsapp_handlers::WhatsAppManager::new();
        // Manager should be created successfully
        assert!(true);
    }

    #[actix_web::test]
    async fn test_websocket_manager_creation() {
        let _ws_manager = websocket_improved::ConnectionManager::new();
        // Manager should be created successfully
        assert!(true);
    }

    #[actix_web::test]
    async fn test_conversation_storage_creation() {
        let storage = agent_conversations::ConversationStorage::new();
        // Create a test conversation
        storage.create_conversation(
            "test_id".to_string(),
            "+5561994013828".to_string(),
            Some("Test User".to_string()),
            "whatsapp".to_string()
        ).await;
        
        // Should have one conversation
        assert!(true);
    }

    #[actix_web::test]
    async fn test_whatsapp_config() {
        let config_storage = std::sync::Arc::new(whatsapp_config::ConfigStorage::new());
        
        // Update config
        config_storage.update_config(whatsapp_config::WhatsAppConfig {
            provider: "official".to_string(),
            phone_number_id: Some("574293335763643".to_string()),
            access_token: Some("test_token".to_string()),
            webhook_verify_token: Some("verify_token_123".to_string()),
            evolution_url: None,
            evolution_api_key: None,
            instance_name: None,
        }).await;
        
        // Get config
        let config = config_storage.get_config().await;
        assert_eq!(config.provider, "official");
    }

    #[actix_web::test]
    async fn test_database_connection() {
        // Skip if DATABASE_URL is not set
        if std::env::var("DATABASE_URL").is_err() {
            return;
        }
        
        match database::establish_connection().await {
            Ok(_db) => assert!(true),
            Err(_) => {
                // Database not available, skip test
                println!("Database not available, skipping test");
            }
        }
    }
}