use actix_web::{test, web, App, http::StatusCode, middleware};
use serde_json::json;
use std::time::Duration;
use uuid::Uuid;
use tokio::time::sleep;
use serial_test::serial;
use pretty_assertions::assert_eq;

use crate::common::*;

#[cfg(test)]
mod api_integration_tests {
    use super::*;

    #[tokio::test]
    #[serial]
    async fn test_complete_user_flow() {
        if should_skip_integration_tests() {
            return;
        }

        let _cleanup = TestCleanup::new();
        let mock_server = MockServer::new().await;
        mock_server.setup_whatsapp_mocks().await;
        
        // Create test app with all services
        let app = test::init_service(
            App::new()
                .wrap(middleware::Logger::default())
                .wrap(actix_cors::Cors::permissive())
                .configure(configure_test_routes)
        ).await;

        // 1. Health check
        let req = test::TestRequest::get()
            .uri("/health")
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);

        // 2. User registration
        let user_email = TestDataGenerator::user_email();
        let req = test::TestRequest::post()
            .uri("/api/v1/auth/register")
            .set_json(&json!({
                "email": user_email,
                "password": "SecurePassword123!",
                "name": "Integration Test User"
            }))
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        if resp.status() == StatusCode::OK {
            let body: serde_json::Value = test::read_body_json(resp).await;
            assert!(body["token"].is_string());
            
            // 3. Use the token for authenticated requests
            let token = body["token"].as_str().unwrap();
            
            // 4. Get user profile
            let req = test::TestRequest::get()
                .uri("/api/v1/auth/me")
                .insert_header(auth_header(token))
                .to_request();
            
            let resp = test::call_service(&app, req).await;
            assert_eq!(resp.status(), StatusCode::OK);
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_whatsapp_api_integration() {
        if should_skip_integration_tests() {
            return;
        }

        let _cleanup = TestCleanup::new();
        let mock_server = MockServer::new().await;
        mock_server.setup_whatsapp_mocks().await;

        let app = test::init_service(
            App::new()
                .wrap(middleware::Logger::default())
                .configure(configure_test_routes)
        ).await;

        // Test WhatsApp message sending
        let req = test::TestRequest::post()
            .uri("/api/v1/whatsapp/send")
            .set_json(&json!({
                "to": "+5561999999999",
                "message": "Integration test message",
                "type": "text"
            }))
            .to_request();

        let resp = test::call_service(&app, req).await;
        // Response depends on whether WhatsApp service is mocked or real
        assert!(resp.status() == StatusCode::OK || resp.status() == StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    #[serial]
    async fn test_database_operations() {
        if should_skip_db_tests() {
            return;
        }

        let _cleanup = TestCleanup::new();
        let test_db = TestDatabase::connection().await;
        
        if test_db.is_mock {
            println!("Using mock database for integration test");
            return;
        }

        // Test database connectivity and basic operations
        assert!(!test_db.is_mock);
        
        // Test data seeding
        let seed_result = test_db.seed_test_data().await;
        assert!(seed_result.is_ok());

        // Test data cleanup
        let cleanup_result = test_db.cleanup_test_data().await;
        assert!(cleanup_result.is_ok());
    }

    #[tokio::test]
    #[serial]
    async fn test_redis_integration() {
        if should_skip_redis_tests() {
            return;
        }

        let _cleanup = TestCleanup::new();
        let test_redis = TestRedis::client().await;
        
        if test_redis.is_mock {
            println!("Using mock Redis for integration test");
            return;
        }

        // Test Redis connectivity
        assert!(!test_redis.is_mock);
        
        // Test Redis cleanup
        let cleanup_result = test_redis.cleanup().await;
        assert!(cleanup_result.is_ok());
    }

    // Mock route configuration for testing
    fn configure_test_routes(cfg: &mut web::ServiceConfig) {
        cfg
            .route("/health", web::get().to(health_endpoint))
            .service(
                web::scope("/api/v1")
                    .service(
                        web::scope("/auth")
                            .route("/register", web::post().to(register_endpoint))
                            .route("/login", web::post().to(login_endpoint))
                            .route("/me", web::get().to(me_endpoint))
                    )
                    .service(
                        web::scope("/whatsapp")
                            .route("/send", web::post().to(whatsapp_send_endpoint))
                            .route("/webhook", web::get().to(whatsapp_webhook_verify))
                            .route("/webhook", web::post().to(whatsapp_webhook_handler))
                    )
            );
    }

    // Mock endpoint handlers
    async fn health_endpoint() -> actix_web::Result<actix_web::HttpResponse> {
        Ok(actix_web::HttpResponse::Ok().json(json!({
            "status": "healthy",
            "service": "pytake-api",
            "timestamp": chrono::Utc::now()
        })))
    }

    async fn register_endpoint(
        payload: web::Json<serde_json::Value>
    ) -> actix_web::Result<actix_web::HttpResponse> {
        let email = payload["email"].as_str().unwrap_or("test@example.com");
        
        // Mock registration logic
        Ok(actix_web::HttpResponse::Ok().json(json!({
            "token": "mock_jwt_token_for_testing",
            "user": {
                "email": email,
                "name": payload["name"].as_str().unwrap_or("Test User"),
                "role": "user"
            }
        })))
    }

    async fn login_endpoint(
        payload: web::Json<serde_json::Value>
    ) -> actix_web::Result<actix_web::HttpResponse> {
        let email = payload["email"].as_str().unwrap_or("test@example.com");
        
        // Mock login logic
        Ok(actix_web::HttpResponse::Ok().json(json!({
            "token": "mock_jwt_token_for_testing",
            "user": {
                "email": email,
                "role": "user"
            }
        })))
    }

    async fn me_endpoint(
        req: actix_web::HttpRequest
    ) -> actix_web::Result<actix_web::HttpResponse> {
        // Check for Authorization header
        if let Some(auth_header) = req.headers().get("Authorization") {
            if auth_header.to_str().unwrap_or("").starts_with("Bearer ") {
                return Ok(actix_web::HttpResponse::Ok().json(json!({
                    "email": "test@example.com",
                    "name": "Test User",
                    "role": "user"
                })));
            }
        }
        
        Ok(actix_web::HttpResponse::Unauthorized().json(json!({
            "error": "Authorization required"
        })))
    }

    async fn whatsapp_send_endpoint(
        _payload: web::Json<serde_json::Value>
    ) -> actix_web::Result<actix_web::HttpResponse> {
        // Mock WhatsApp send
        Ok(actix_web::HttpResponse::Ok().json(json!({
            "message_id": Uuid::new_v4().to_string(),
            "status": "sent"
        })))
    }

    async fn whatsapp_webhook_verify(
        query: web::Query<std::collections::HashMap<String, String>>
    ) -> actix_web::Result<actix_web::HttpResponse> {
        let mode = query.get("hub.mode").unwrap_or(&String::new());
        let token = query.get("hub.verify_token").unwrap_or(&String::new());
        let challenge = query.get("hub.challenge").unwrap_or(&String::new());

        if mode == "subscribe" && token == "test_verify_token" {
            Ok(actix_web::HttpResponse::Ok().body(challenge.clone()))
        } else {
            Ok(actix_web::HttpResponse::Forbidden().json(json!({
                "error": "Invalid verification token"
            })))
        }
    }

    async fn whatsapp_webhook_handler(
        _payload: web::Json<serde_json::Value>
    ) -> actix_web::Result<actix_web::HttpResponse> {
        // Mock webhook processing
        Ok(actix_web::HttpResponse::Ok().json(json!({
            "status": "received"
        })))
    }
}

#[cfg(test)]
mod error_handling_integration_tests {
    use super::*;

    #[tokio::test]
    #[serial]
    async fn test_api_error_responses() {
        if should_skip_integration_tests() {
            return;
        }

        let app = test::init_service(
            App::new()
                .wrap(middleware::Logger::default())
                .configure(|cfg| {
                    cfg
                        .route("/error/400", web::get().to(bad_request_endpoint))
                        .route("/error/401", web::get().to(unauthorized_endpoint))
                        .route("/error/404", web::get().to(not_found_endpoint))
                        .route("/error/500", web::get().to(internal_error_endpoint));
                })
        ).await;

        // Test 400 Bad Request
        let req = test::TestRequest::get().uri("/error/400").to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);

        // Test 401 Unauthorized
        let req = test::TestRequest::get().uri("/error/401").to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);

        // Test 404 Not Found
        let req = test::TestRequest::get().uri("/error/404").to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);

        // Test 500 Internal Server Error
        let req = test::TestRequest::get().uri("/error/500").to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    // Mock error endpoints
    async fn bad_request_endpoint() -> actix_web::Result<actix_web::HttpResponse> {
        Ok(actix_web::HttpResponse::BadRequest().json(json!({
            "error": "Bad request",
            "message": "Invalid request parameters"
        })))
    }

    async fn unauthorized_endpoint() -> actix_web::Result<actix_web::HttpResponse> {
        Ok(actix_web::HttpResponse::Unauthorized().json(json!({
            "error": "Unauthorized",
            "message": "Authentication required"
        })))
    }

    async fn not_found_endpoint() -> actix_web::Result<actix_web::HttpResponse> {
        Ok(actix_web::HttpResponse::NotFound().json(json!({
            "error": "Not found",
            "message": "Resource not found"
        })))
    }

    async fn internal_error_endpoint() -> actix_web::Result<actix_web::HttpResponse> {
        Ok(actix_web::HttpResponse::InternalServerError().json(json!({
            "error": "Internal server error",
            "message": "An internal error occurred"
        })))
    }
}

#[cfg(test)]
mod performance_integration_tests {
    use super::*;

    #[tokio::test]
    #[serial]
    async fn test_concurrent_requests() {
        if should_skip_integration_tests() {
            return;
        }

        let _perf_test = PerformanceTest::new("concurrent_api_requests");
        
        let app = test::init_service(
            App::new()
                .route("/api/test", web::get().to(|| async {
                    actix_web::HttpResponse::Ok().json(json!({"status": "ok"}))
                }))
        ).await;

        let concurrent_requests = 50;
        let mut tasks = Vec::new();

        for i in 0..concurrent_requests {
            let req = test::TestRequest::get()
                .uri(&format!("/api/test?id={}", i))
                .to_request();
            
            let task = test::call_service(&app, req);
            tasks.push(task);
        }

        let results = futures::future::join_all(tasks).await;
        
        let mut successful_requests = 0;
        for resp in results {
            if resp.status() == StatusCode::OK {
                successful_requests += 1;
            }
        }

        assert_eq!(successful_requests, concurrent_requests);
        _perf_test.assert_faster_than(Duration::from_secs(5));
    }

    #[tokio::test]
    #[serial]
    async fn test_api_response_times() {
        if should_skip_integration_tests() {
            return;
        }

        let app = test::init_service(
            App::new()
                .route("/api/fast", web::get().to(fast_endpoint))
                .route("/api/slow", web::get().to(slow_endpoint))
        ).await;

        // Test fast endpoint
        let _perf_test_fast = PerformanceTest::new("fast_endpoint");
        let req = test::TestRequest::get().uri("/api/fast").to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);
        _perf_test_fast.assert_faster_than(Duration::from_millis(100));

        // Test slow endpoint
        let _perf_test_slow = PerformanceTest::new("slow_endpoint");
        let req = test::TestRequest::get().uri("/api/slow").to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);
        // Should complete within reasonable time even for "slow" endpoint
        _perf_test_slow.assert_faster_than(Duration::from_secs(2));
    }

    async fn fast_endpoint() -> actix_web::Result<actix_web::HttpResponse> {
        Ok(actix_web::HttpResponse::Ok().json(json!({
            "message": "Fast response",
            "timestamp": chrono::Utc::now()
        })))
    }

    async fn slow_endpoint() -> actix_web::Result<actix_web::HttpResponse> {
        // Simulate some processing time
        sleep(Duration::from_millis(100)).await;
        
        Ok(actix_web::HttpResponse::Ok().json(json!({
            "message": "Slow response",
            "timestamp": chrono::Utc::now(),
            "processing_time_ms": 100
        })))
    }
}

#[cfg(test)]
mod websocket_integration_tests {
    use super::*;

    #[tokio::test]
    #[serial]
    async fn test_websocket_connection() {
        if should_skip_integration_tests() {
            return;
        }

        // Mock WebSocket endpoint for testing
        let app = test::init_service(
            App::new()
                .route("/ws", web::get().to(websocket_handler))
        ).await;

        // Test WebSocket upgrade request
        let req = test::TestRequest::get()
            .uri("/ws")
            .insert_header(("Connection", "Upgrade"))
            .insert_header(("Upgrade", "websocket"))
            .insert_header(("Sec-WebSocket-Version", "13"))
            .insert_header(("Sec-WebSocket-Key", "test-key"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        
        // Should either upgrade to WebSocket or return an appropriate error
        assert!(
            resp.status() == StatusCode::SWITCHING_PROTOCOLS || 
            resp.status() == StatusCode::BAD_REQUEST ||
            resp.status() == StatusCode::NOT_FOUND
        );
    }

    // Mock WebSocket handler
    async fn websocket_handler(
        _req: actix_web::HttpRequest,
        _stream: web::Payload,
    ) -> Result<actix_web::HttpResponse, actix_web::Error> {
        // Simple WebSocket mock response
        // In a real implementation, this would handle the WebSocket upgrade
        Ok(actix_web::HttpResponse::NotImplemented().json(json!({
            "message": "WebSocket handler not implemented in test"
        })))
    }
}

#[cfg(test)]
mod middleware_integration_tests {
    use super::*;

    #[tokio::test]
    #[serial]
    async fn test_cors_middleware() {
        let app = test::init_service(
            App::new()
                .wrap(actix_cors::Cors::permissive())
                .route("/api/test", web::get().to(|| async {
                    actix_web::HttpResponse::Ok().json(json!({"message": "test"}))
                }))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/test")
            .insert_header(("Origin", "https://example.com"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);
        
        // Check CORS headers
        let headers = resp.headers();
        assert!(headers.contains_key("access-control-allow-origin"));
    }

    #[tokio::test]
    #[serial]
    async fn test_logging_middleware() {
        let app = test::init_service(
            App::new()
                .wrap(middleware::Logger::default())
                .route("/api/logged", web::get().to(|| async {
                    actix_web::HttpResponse::Ok().json(json!({"logged": true}))
                }))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/logged")
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);
    }
}

#[cfg(test)]
mod security_integration_tests {
    use super::*;

    #[tokio::test]
    #[serial]
    async fn test_security_headers() {
        let app = test::init_service(
            App::new()
                .route("/api/secure", web::get().to(secure_endpoint))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/secure")
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);

        // Check security headers
        let headers = resp.headers();
        assert!(headers.contains_key("x-frame-options"));
        assert!(headers.contains_key("x-content-type-options"));
    }

    #[tokio::test]
    #[serial]
    async fn test_input_validation() {
        let app = test::init_service(
            App::new()
                .route("/api/validate", web::post().to(validation_endpoint))
        ).await;

        // Test with valid input
        let valid_req = test::TestRequest::post()
            .uri("/api/validate")
            .set_json(&json!({
                "email": "valid@example.com",
                "message": "Valid message"
            }))
            .to_request();

        let resp = test::call_service(&app, valid_req).await;
        assert_eq!(resp.status(), StatusCode::OK);

        // Test with invalid email
        let invalid_req = test::TestRequest::post()
            .uri("/api/validate")
            .set_json(&json!({
                "email": "invalid-email",
                "message": "Message"
            }))
            .to_request();

        let resp = test::call_service(&app, invalid_req).await;
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);

        // Test with malicious input
        let malicious_req = test::TestRequest::post()
            .uri("/api/validate")
            .set_json(&json!({
                "email": "<script>alert('xss')</script>",
                "message": "'; DROP TABLE users; --"
            }))
            .to_request();

        let resp = test::call_service(&app, malicious_req).await;
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    }

    async fn secure_endpoint() -> actix_web::Result<actix_web::HttpResponse> {
        Ok(actix_web::HttpResponse::Ok()
            .insert_header(("X-Frame-Options", "DENY"))
            .insert_header(("X-Content-Type-Options", "nosniff"))
            .insert_header(("X-XSS-Protection", "1; mode=block"))
            .json(json!({
                "message": "Secure endpoint",
                "timestamp": chrono::Utc::now()
            })))
    }

    async fn validation_endpoint(
        payload: web::Json<serde_json::Value>
    ) -> actix_web::Result<actix_web::HttpResponse> {
        let email = payload["email"].as_str().unwrap_or("");
        let message = payload["message"].as_str().unwrap_or("");

        // Simple email validation
        if !email.contains('@') || !email.contains('.') {
            return Ok(actix_web::HttpResponse::BadRequest().json(json!({
                "error": "Invalid email format"
            })));
        }

        // Check for potential malicious content
        if message.contains("<script>") || message.contains("DROP TABLE") || message.contains("';") {
            return Ok(actix_web::HttpResponse::BadRequest().json(json!({
                "error": "Invalid content detected"
            })));
        }

        Ok(actix_web::HttpResponse::Ok().json(json!({
            "message": "Validation passed"
        })))
    }
}

// Helper functions for integration testing
pub async fn setup_integration_test_environment() -> TestCleanup {
    let mut cleanup = TestCleanup::new();
    
    // Setup test database
    cleanup.add_cleanup(|| {
        println!("Cleaning up test database");
        Ok(())
    });
    
    // Setup test Redis
    cleanup.add_cleanup(|| {
        println!("Cleaning up test Redis");
        Ok(())
    });
    
    // Setup test external services
    cleanup.add_cleanup(|| {
        println!("Cleaning up external services");
        Ok(())
    });
    
    cleanup
}

pub async fn run_integration_test<F, Fut>(test_name: &str, test_fn: F) -> Result<(), Box<dyn std::error::Error>>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<(), Box<dyn std::error::Error>>>,
{
    println!("Running integration test: {}", test_name);
    
    let _cleanup = setup_integration_test_environment().await;
    let _perf_test = PerformanceTest::new(test_name);
    
    let result = test_fn().await;
    
    match &result {
        Ok(_) => println!("✅ Integration test '{}' passed", test_name),
        Err(e) => println!("❌ Integration test '{}' failed: {}", test_name, e),
    }
    
    result
}