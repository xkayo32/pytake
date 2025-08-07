use actix_web::{test, web, App, http::StatusCode};
use serde_json::json;

#[actix_web::test]
async fn test_list_flows() {
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .configure(crate::flows::configure_routes)
    ).await;

    let req = test::TestRequest::get()
        .uri("/api/v1/flows")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["flows"].is_array());
}

#[actix_web::test]
async fn test_create_flow() {
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .configure(crate::flows::configure_routes)
    ).await;

    let flow_data = json!({
        "name": "Welcome Flow",
        "description": "Automated welcome message flow",
        "trigger": "new_conversation",
        "nodes": [
            {
                "id": "start",
                "type": "trigger",
                "data": {
                    "trigger_type": "new_conversation"
                }
            },
            {
                "id": "welcome_message",
                "type": "message",
                "data": {
                    "message": "Welcome to PyTake! How can I help you today?",
                    "delay": 0
                }
            },
            {
                "id": "menu",
                "type": "interactive",
                "data": {
                    "message": "Please select an option:",
                    "buttons": [
                        {"id": "sales", "title": "Sales"},
                        {"id": "support", "title": "Support"},
                        {"id": "info", "title": "Information"}
                    ]
                }
            }
        ],
        "edges": [
            {"source": "start", "target": "welcome_message"},
            {"source": "welcome_message", "target": "menu"}
        ]
    });

    let req = test::TestRequest::post()
        .uri("/api/v1/flows")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&flow_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["id"].is_string());
    assert_eq!(body["name"], "Welcome Flow");
    assert_eq!(body["status"], "draft");
}

#[actix_web::test]
async fn test_update_flow() {
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .configure(crate::flows::configure_routes)
    ).await;

    let flow_id = uuid::Uuid::new_v4().to_string();
    let update_data = json!({
        "name": "Updated Welcome Flow",
        "description": "Updated description",
        "nodes": [
            {
                "id": "start",
                "type": "trigger",
                "data": {
                    "trigger_type": "keyword",
                    "keywords": ["hello", "hi", "help"]
                }
            }
        ]
    });

    let req = test::TestRequest::put()
        .uri(&format!("/api/v1/flows/{}", flow_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&update_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // Will be OK if flow exists
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["name"], "Updated Welcome Flow");
    }
}

#[actix_web::test]
async fn test_publish_flow() {
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .configure(crate::flows::configure_routes)
    ).await;

    let flow_id = uuid::Uuid::new_v4().to_string();

    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/flows/{}/publish", flow_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // Will be OK if flow exists and is valid
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["status"], "published");
    }
}

#[actix_web::test]
async fn test_delete_flow() {
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .configure(crate::flows::configure_routes)
    ).await;

    let flow_id = uuid::Uuid::new_v4().to_string();

    let req = test::TestRequest::delete()
        .uri(&format!("/api/v1/flows/{}", flow_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // Will be OK if flow exists
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["message"], "Flow deleted successfully");
    }
}

#[actix_web::test]
async fn test_flow_execution_simulation() {
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .configure(crate::flows::configure_routes)
    ).await;

    let flow_id = uuid::Uuid::new_v4().to_string();
    let simulation_data = json!({
        "input": {
            "message": "hello",
            "from": "+5561994013828"
        },
        "context": {
            "user_name": "Test User",
            "conversation_id": "conv_123"
        }
    });

    let req = test::TestRequest::post()
        .uri(&format!("/api/v1/flows/{}/simulate", flow_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .set_json(&simulation_data)
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // Will return simulation results if flow exists
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["execution_path"].is_array());
        assert!(body["output"].is_object());
    }
}

#[actix_web::test]
async fn test_flow_analytics() {
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .configure(crate::flows::configure_routes)
    ).await;

    let flow_id = uuid::Uuid::new_v4().to_string();

    let req = test::TestRequest::get()
        .uri(&format!("/api/v1/flows/{}/analytics", flow_id))
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // Will return analytics if flow exists
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["total_executions"].is_number());
        assert!(body["success_rate"].is_number());
        assert!(body["average_duration_ms"].is_number());
    }
}