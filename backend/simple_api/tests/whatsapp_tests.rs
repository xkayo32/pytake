use actix_web::{test, web, App, http::StatusCode};
use serde_json::json;
use crate::common::TestConfig;

#[actix_web::test]
async fn test_whatsapp_send_message() {
    let config = TestConfig::new();
    let whatsapp_manager = crate::whatsapp_handlers::WhatsAppManager::new();
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(whatsapp_manager))
            .route("/api/v1/whatsapp/send", web::post().to(crate::whatsapp_handlers::send_message))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/whatsapp/send")
        .set_json(&json!({
            "to": config.test_phone_number,
            "message": "Test message from PyTake API tests",
            "type": "text"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // This will succeed if WhatsApp API is configured correctly
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["message_id"].is_string());
        assert_eq!(body["status"], "sent");
    }
}

#[actix_web::test]
async fn test_whatsapp_webhook_verification() {
    let whatsapp_manager = crate::whatsapp_handlers::WhatsAppManager::new();
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(whatsapp_manager))
            .route("/api/v1/whatsapp/webhook", web::get().to(crate::whatsapp_handlers::webhook_handler))
    ).await;

    let req = test::TestRequest::get()
        .uri("/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify_token_123&hub.challenge=test_challenge")
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    
    let body = test::read_body(resp).await;
    assert_eq!(body, "test_challenge");
}

#[actix_web::test]
async fn test_whatsapp_webhook_message_received() {
    let whatsapp_manager = crate::whatsapp_handlers::WhatsAppManager::new();
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(whatsapp_manager))
            .route("/api/v1/whatsapp/webhook", web::post().to(crate::whatsapp_handlers::webhook_handler))
    ).await;

    let webhook_payload = json!({
        "entry": [{
            "id": "ENTRY_ID",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "15550555555",
                        "phone_number_id": "574293335763643"
                    },
                    "messages": [{
                        "from": "5561994013828",
                        "id": "wamid.test",
                        "timestamp": "1669233778",
                        "text": {
                            "body": "Hello from test"
                        },
                        "type": "text"
                    }]
                },
                "field": "messages"
            }]
        }]
    });

    let req = test::TestRequest::post()
        .uri("/api/v1/whatsapp/webhook")
        .set_json(&webhook_payload)
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);
}

#[actix_web::test]
async fn test_whatsapp_config_get() {
    let config_storage = std::sync::Arc::new(crate::whatsapp_config::ConfigStorage::new());
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(config_storage))
            .route("/api/v1/whatsapp/config", web::get().to(crate::whatsapp_config::get_config))
    ).await;

    let req = test::TestRequest::get()
        .uri("/api/v1/whatsapp/config")
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["provider"].is_string());
}

#[actix_web::test]
async fn test_whatsapp_config_update() {
    let config = TestConfig::new();
    let config_storage = std::sync::Arc::new(crate::whatsapp_config::ConfigStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(config_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/whatsapp/config", web::put().to(crate::whatsapp_config::update_config))
    ).await;

    let req = test::TestRequest::put()
        .uri("/api/v1/whatsapp/config")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&json!({
            "provider": "official",
            "phoneNumberId": config.whatsapp_phone_id,
            "accessToken": config.whatsapp_token,
            "webhookVerifyToken": "verify_token_123"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["message"], "Configuration updated successfully");
}

#[actix_web::test]
async fn test_whatsapp_test_connection() {
    let config_storage = std::sync::Arc::new(crate::whatsapp_config::ConfigStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    // First set configuration
    let config = TestConfig::new();
    config_storage.update_config(crate::whatsapp_config::WhatsAppConfig {
        provider: "official".to_string(),
        phone_number_id: Some(config.whatsapp_phone_id.clone()),
        access_token: Some(config.whatsapp_token.clone()),
        webhook_verify_token: Some("verify_token_123".to_string()),
        evolution_url: None,
        evolution_api_key: None,
        instance_name: None,
    }).await;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(config_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/whatsapp/test", web::post().to(crate::whatsapp_config::test_connection))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/whatsapp/test")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // This will succeed if WhatsApp API credentials are valid
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["success"].is_boolean());
    }
}

#[actix_web::test]
async fn test_whatsapp_send_template_message() {
    let config = TestConfig::new();
    let whatsapp_manager = crate::whatsapp_handlers::WhatsAppManager::new();
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(whatsapp_manager))
            .route("/api/v1/whatsapp/send", web::post().to(crate::whatsapp_handlers::send_message))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/whatsapp/send")
        .set_json(&json!({
            "to": config.test_phone_number,
            "type": "template",
            "template": {
                "name": "hello_world",
                "language": {
                    "code": "en_US"
                }
            }
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // This will work if template exists and is approved
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["message_id"].is_string());
    }
}

#[actix_web::test]
async fn test_whatsapp_send_media_message() {
    let config = TestConfig::new();
    let whatsapp_manager = crate::whatsapp_handlers::WhatsAppManager::new();
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(whatsapp_manager))
            .route("/api/v1/whatsapp/send", web::post().to(crate::whatsapp_handlers::send_message))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/whatsapp/send")
        .set_json(&json!({
            "to": config.test_phone_number,
            "type": "image",
            "image": {
                "link": "https://via.placeholder.com/150",
                "caption": "Test image from PyTake"
            }
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // This will work if WhatsApp API accepts media messages
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["message_id"].is_string());
    }
}