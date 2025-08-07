use actix_web::{test, web, App, http::StatusCode};
use serde_json::json;
use crate::common::TestConfig;

#[actix_web::test]
async fn test_list_conversations() {
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("agent@pytake.com", "agent");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations", web::get().to(crate::agent_conversations::list_conversations))
    ).await;

    let req = test::TestRequest::get()
        .uri("/api/v1/conversations")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["conversations"].is_array());
    assert!(body["total"].is_number());
}

#[actix_web::test]
async fn test_create_conversation() {
    let config = TestConfig::new();
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("agent@pytake.com", "agent");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations", web::post().to(crate::agent_conversations::create_conversation))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/conversations")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&json!({
            "client_phone": config.test_phone_number,
            "client_name": "Test Client",
            "platform": "whatsapp",
            "initial_message": "Hello, I need help"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["id"].is_string());
    assert_eq!(body["client_phone"], config.test_phone_number);
    assert_eq!(body["status"], "pending");
}

#[actix_web::test]
async fn test_assign_conversation() {
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("agent@pytake.com", "agent");
    
    // First create a conversation
    let conv_id = uuid::Uuid::new_v4().to_string();
    conversation_storage.create_conversation(
        conv_id.clone(),
        "+5561994013828".to_string(),
        Some("Test Client".to_string()),
        "whatsapp".to_string()
    ).await;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations/{id}/assign", web::post().to(crate::agent_conversations::assign_conversation))
    ).await;

    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/assign", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&json!({
            "agent_id": "agent@pytake.com"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["message"], "Conversation assigned successfully");
}

#[actix_web::test]
async fn test_send_message_in_conversation() {
    let config = TestConfig::new();
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("agent@pytake.com", "agent");
    
    // Create a conversation first
    let conv_id = uuid::Uuid::new_v4().to_string();
    conversation_storage.create_conversation(
        conv_id.clone(),
        config.test_phone_number.clone(),
        Some("Test Client".to_string()),
        "whatsapp".to_string()
    ).await;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations/{id}/messages", web::post().to(crate::agent_conversations::send_message))
    ).await;

    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/messages", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&json!({
            "content": "Hello from agent",
            "type": "text"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["message_id"].is_string());
    assert_eq!(body["status"], "sent");
}

#[actix_web::test]
async fn test_resolve_conversation() {
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("agent@pytake.com", "agent");
    
    // Create a conversation
    let conv_id = uuid::Uuid::new_v4().to_string();
    conversation_storage.create_conversation(
        conv_id.clone(),
        "+5561994013828".to_string(),
        Some("Test Client".to_string()),
        "whatsapp".to_string()
    ).await;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations/{id}/resolve", web::post().to(crate::agent_conversations::resolve_conversation))
    ).await;

    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/resolve", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&json!({
            "resolution_notes": "Issue resolved successfully"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["message"], "Conversation resolved successfully");
}

#[actix_web::test]
async fn test_get_conversation_messages() {
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("agent@pytake.com", "agent");
    
    // Create conversation with messages
    let conv_id = uuid::Uuid::new_v4().to_string();
    conversation_storage.create_conversation(
        conv_id.clone(),
        "+5561994013828".to_string(),
        Some("Test Client".to_string()),
        "whatsapp".to_string()
    ).await;
    
    // Add some messages
    conversation_storage.add_message(
        conv_id.clone(),
        "Hello from client".to_string(),
        "client".to_string(),
        None
    ).await;
    
    conversation_storage.add_message(
        conv_id.clone(),
        "Hello from agent".to_string(),
        "agent".to_string(),
        Some("agent@pytake.com".to_string())
    ).await;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations/{id}/messages", web::get().to(crate::agent_conversations::get_messages))
    ).await;

    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/conversations/{}/messages", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["messages"].is_array());
    assert_eq!(body["messages"].as_array().unwrap().len(), 2);
}

#[actix_web::test]
async fn test_conversation_statistics() {
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("supervisor@pytake.com", "supervisor");
    
    // Create multiple conversations
    for i in 0..5 {
        let conv_id = format!("conv_{}", i);
        conversation_storage.create_conversation(
            conv_id.clone(),
            format!("+556199401382{}", i),
            Some(format!("Client {}", i)),
            "whatsapp".to_string()
        ).await;
        
        if i < 2 {
            conversation_storage.assign_to_agent(conv_id, "agent1@pytake.com".to_string()).await;
        }
    }
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations/stats", web::get().to(crate::agent_conversations::get_statistics))
    ).await;

    let req = test::TestRequest::get()
        .uri("/api/v1/conversations/stats")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["total_conversations"], 5);
    assert_eq!(body["active_conversations"], 2);
    assert_eq!(body["pending_conversations"], 3);
}

#[actix_web::test]
async fn test_conversation_transfer() {
    let conversation_storage = std::sync::Arc::new(crate::agent_conversations::ConversationStorage::new());
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("supervisor@pytake.com", "supervisor");
    
    // Create and assign conversation
    let conv_id = uuid::Uuid::new_v4().to_string();
    conversation_storage.create_conversation(
        conv_id.clone(),
        "+5561994013828".to_string(),
        Some("Test Client".to_string()),
        "whatsapp".to_string()
    ).await;
    
    conversation_storage.assign_to_agent(conv_id.clone(), "agent1@pytake.com".to_string()).await;
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(conversation_storage))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/conversations/{id}/transfer", web::post().to(crate::agent_conversations::transfer_conversation))
    ).await;

    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/conversations/{}/transfer", conv_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&json!({
            "from_agent": "agent1@pytake.com",
            "to_agent": "agent2@pytake.com",
            "reason": "Agent specialization needed"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["message"], "Conversation transferred successfully");
}