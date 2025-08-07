use actix_web::{test, web, App, http::StatusCode};
use serde_json::json;
use crate::common::{TestConfig, admin_user_credentials};

/// Full integration test simulating a complete user journey
#[actix_web::test]
async fn test_complete_user_journey() {
    let config = TestConfig::new();
    
    // Initialize all services
    let auth_service = crate::auth::AuthService::new();
    let ws_manager = crate::websocket_improved::ConnectionManager::new();
    let whatsapp_manager = crate::whatsapp_handlers::WhatsAppManager::new();
    let config_storage = std::sync::Arc::new(crate::whatsapp_config::ConfigStorage::new());
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    
    // Build the complete app
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service.clone()))
            .app_data(web::Data::new(ws_manager.clone()))
            .app_data(web::Data::new(whatsapp_manager.clone()))
            .app_data(web::Data::new(config_storage.clone()))
            .app_data(web::Data::new(conversation_storage.clone()))
            .wrap(actix_cors::Cors::permissive())
            .configure(|cfg| {
                // Configure all routes
                cfg.service(
                    web::scope("/api/v1")
                        .service(
                            web::scope("/auth")
                                .route("/login", web::post().to(crate::auth::login))
                                .route("/me", web::get().to(crate::auth::me))
                        )
                        .configure(crate::whatsapp_config::configure_routes)
                        .configure(crate::agent_conversations::configure_routes)
                );
            })
    ).await;

    // Step 1: Admin login
    let login_req = test::TestRequest::post()
        .uri("/api/v1/auth/login")
        .set_json(&admin_user_credentials())
        .to_request();
    
    let login_resp = test::call_service(&app, login_req).await;
    assert_eq!(login_resp.status(), StatusCode::OK);
    
    let login_body: serde_json::Value = test::read_body_json(login_resp).await;
    let admin_token = login_body["token"].as_str().unwrap();
    
    // Step 2: Configure WhatsApp
    let config_req = test::TestRequest::put()
        .uri("/api/v1/whatsapp/config")
        .insert_header(("Authorization", format!("Bearer {}", admin_token)))
        .set_json(&json!({
            "provider": "official",
            "phoneNumberId": config.whatsapp_phone_id,
            "accessToken": config.whatsapp_token,
            "webhookVerifyToken": "verify_token_123"
        }))
        .to_request();
    
    let config_resp = test::call_service(&app, config_req).await;
    assert_eq!(config_resp.status(), StatusCode::OK);
    
    // Step 3: Create a conversation
    let conv_req = test::TestRequest::post()
        .uri("/api/v1/conversations")
        .insert_header(("Authorization", format!("Bearer {}", admin_token)))
        .set_json(&json!({
            "client_phone": config.test_phone_number,
            "client_name": "Integration Test Client",
            "platform": "whatsapp",
            "initial_message": "Hello, this is an integration test"
        }))
        .to_request();
    
    let conv_resp = test::call_service(&app, conv_req).await;
    assert_eq!(conv_resp.status(), StatusCode::OK);
    
    let conv_body: serde_json::Value = test::read_body_json(conv_resp).await;
    let conversation_id = conv_body["id"].as_str().unwrap();
    
    // Step 4: List conversations
    let list_req = test::TestRequest::get()
        .uri("/api/v1/conversations")
        .insert_header(("Authorization", format!("Bearer {}", admin_token)))
        .to_request();
    
    let list_resp = test::call_service(&app, list_req).await;
    assert_eq!(list_resp.status(), StatusCode::OK);
    
    let list_body: serde_json::Value = test::read_body_json(list_resp).await;
    assert!(list_body["conversations"].as_array().unwrap().len() > 0);
    
    // Step 5: Send a message in the conversation
    let msg_req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/messages", conversation_id))
        .insert_header(("Authorization", format!("Bearer {}", admin_token)))
        .set_json(&json!({
            "content": "Response from integration test",
            "type": "text"
        }))
        .to_request();
    
    let msg_resp = test::call_service(&app, msg_req).await;
    assert_eq!(msg_resp.status(), StatusCode::OK);
    
    // Step 6: Resolve the conversation
    let resolve_req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/resolve", conversation_id))
        .insert_header(("Authorization", format!("Bearer {}", admin_token)))
        .set_json(&json!({
            "resolution_notes": "Integration test completed successfully"
        }))
        .to_request();
    
    let resolve_resp = test::call_service(&app, resolve_req).await;
    assert_eq!(resolve_resp.status(), StatusCode::OK);
}

/// Test webhook processing pipeline
#[actix_web::test]
async fn test_webhook_processing_pipeline() {
    let config = TestConfig::new();
    let whatsapp_manager = crate::whatsapp_handlers::WhatsAppManager::new();
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let ws_manager = crate::websocket_improved::ConnectionManager::new();
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(whatsapp_manager))
            .app_data(web::Data::new(conversation_storage.clone()))
            .app_data(web::Data::new(ws_manager.clone()))
            .route("/api/v1/whatsapp/webhook", web::post().to(crate::whatsapp_handlers::webhook_handler))
    ).await;

    // Simulate incoming WhatsApp message
    let webhook_payload = json!({
        "entry": [{
            "id": "ENTRY_ID",
            "changes": [{
                "value": {
                    "messaging_product": "whatsapp",
                    "metadata": {
                        "display_phone_number": "15550555555",
                        "phone_number_id": config.whatsapp_phone_id
                    },
                    "messages": [{
                        "from": config.test_phone_number.replace("+", ""),
                        "id": "wamid.integration_test",
                        "timestamp": chrono::Utc::now().timestamp().to_string(),
                        "text": {
                            "body": "Integration test message"
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
    
    // Verify conversation was created
    let conversations = conversation_storage.list_all().await;
    assert!(conversations.iter().any(|c| c.client_phone.contains(&config.test_phone_number.replace("+", ""))));
}

/// Test multi-agent workflow
#[actix_web::test]
async fn test_multi_agent_workflow() {
    let config = TestConfig::new();
    let auth_service = crate::auth::AuthService::new();
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    
    // Create tokens for different roles
    let supervisor_token = auth_service.generate_token("supervisor@pytake.com", "supervisor");
    let agent1_token = auth_service.generate_token("agent1@pytake.com", "agent");
    let agent2_token = auth_service.generate_token("agent2@pytake.com", "agent");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .app_data(web::Data::new(conversation_storage.clone()))
            .configure(crate::agent_conversations::configure_routes)
    ).await;
    
    // Supervisor creates conversation
    let create_req = test::TestRequest::post()
        .uri("/api/v1/conversations")
        .insert_header(("Authorization", format!("Bearer {}", supervisor_token)))
        .set_json(&json!({
            "client_phone": config.test_phone_number,
            "client_name": "Multi-agent Test Client",
            "platform": "whatsapp",
            "initial_message": "Need help with complex issue"
        }))
        .to_request();
    
    let create_resp = test::call_service(&app, create_req).await;
    assert_eq!(create_resp.status(), StatusCode::OK);
    
    let conv_body: serde_json::Value = test::read_body_json(create_resp).await;
    let conv_id = conv_body["id"].as_str().unwrap();
    
    // Assign to agent1
    let assign1_req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/assign", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", supervisor_token)))
        .set_json(&json!({
            "agent_id": "agent1@pytake.com"
        }))
        .to_request();
    
    let assign1_resp = test::call_service(&app, assign1_req).await;
    assert_eq!(assign1_resp.status(), StatusCode::OK);
    
    // Agent1 sends message
    let msg1_req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/messages", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", agent1_token)))
        .set_json(&json!({
            "content": "Hello, I'm agent 1. How can I help?",
            "type": "text"
        }))
        .to_request();
    
    let msg1_resp = test::call_service(&app, msg1_req).await;
    assert_eq!(msg1_resp.status(), StatusCode::OK);
    
    // Transfer to agent2
    let transfer_req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/transfer", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", supervisor_token)))
        .set_json(&json!({
            "from_agent": "agent1@pytake.com",
            "to_agent": "agent2@pytake.com",
            "reason": "Specialized assistance needed"
        }))
        .to_request();
    
    let transfer_resp = test::call_service(&app, transfer_req).await;
    assert_eq!(transfer_resp.status(), StatusCode::OK);
    
    // Agent2 resolves
    let resolve_req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/resolve", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", agent2_token)))
        .set_json(&json!({
            "resolution_notes": "Issue resolved by specialist"
        }))
        .to_request();
    
    let resolve_resp = test::call_service(&app, resolve_req).await;
    assert_eq!(resolve_resp.status(), StatusCode::OK);
}

/// Test rate limiting and security
#[actix_web::test]
async fn test_rate_limiting_and_security() {
    let auth_service = crate::auth::AuthService::new();
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/auth/login", web::post().to(crate::auth::login))
    ).await;
    
    // Attempt multiple failed logins
    for i in 0..10 {
        let req = test::TestRequest::post()
            .uri("/api/v1/auth/login")
            .set_json(&json!({
                "email": format!("attacker{}@test.com", i),
                "password": "wrongpassword"
            }))
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
    }
    
    // Test SQL injection attempt
    let sql_injection_req = test::TestRequest::post()
        .uri("/api/v1/auth/login")
        .set_json(&json!({
            "email": "admin' OR '1'='1",
            "password": "' OR '1'='1"
        }))
        .to_request();
    
    let sql_resp = test::call_service(&app, sql_injection_req).await;
    assert_eq!(sql_resp.status(), StatusCode::UNAUTHORIZED);
    
    // Test XSS attempt
    let xss_req = test::TestRequest::post()
        .uri("/api/v1/auth/login")
        .set_json(&json!({
            "email": "<script>alert('XSS')</script>",
            "password": "test"
        }))
        .to_request();
    
    let xss_resp = test::call_service(&app, xss_req).await;
    assert_eq!(xss_resp.status(), StatusCode::UNAUTHORIZED);
}

/// Test performance under load
#[actix_web::test]
async fn test_performance_under_load() {
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage.clone()))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations", web::get().to(crate::agent_conversations::list_conversations))
    ).await;
    
    // Create multiple conversations
    for i in 0..100 {
        conversation_storage.create_conversation(
            format!("perf_test_{}", i),
            format!("+556199401{:04}", i),
            Some(format!("Client {}", i)),
            "whatsapp".to_string()
        ).await;
    }
    
    // Measure response time
    let start = std::time::Instant::now();
    
    let req = test::TestRequest::get()
        .uri("/api/v1/conversations?limit=100")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();
    
    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);
    
    let duration = start.elapsed();
    
    // Response should be under 1 second even with 100 conversations
    assert!(duration.as_secs() < 1);
    
    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["conversations"].as_array().unwrap().len(), 100);
}