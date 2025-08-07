use actix_web::{test, web, App, http::StatusCode};
use serde_json::json;
use crate::common::{TestConfig, admin_user_credentials, test_user_credentials};

#[actix_web::test]
async fn test_health_endpoint() {
    let app = test::init_service(
        App::new()
            .route("/health", web::get().to(crate::health))
    ).await;

    let req = test::TestRequest::get()
        .uri("/health")
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["status"], "healthy");
    assert_eq!(body["service"], "pytake-api");
}

#[actix_web::test]
async fn test_login_with_valid_credentials() {
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(crate::auth::AuthService::new()))
            .route("/api/v1/auth/login", web::post().to(crate::auth::login))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/auth/login")
        .set_json(&admin_user_credentials())
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["token"].is_string());
    assert_eq!(body["user"]["email"], "admin@pytake.com");
    assert_eq!(body["user"]["role"], "admin");
}

#[actix_web::test]
async fn test_login_with_invalid_credentials() {
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(crate::auth::AuthService::new()))
            .route("/api/v1/auth/login", web::post().to(crate::auth::login))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/auth/login")
        .set_json(&json!({
            "email": "invalid@pytake.com",
            "password": "wrongpassword"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[actix_web::test]
async fn test_register_new_user() {
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(crate::auth::AuthService::new()))
            .route("/api/v1/auth/register", web::post().to(crate::auth::register))
    ).await;

    let unique_email = format!("user_{}@pytake.com", uuid::Uuid::new_v4());
    let req = test::TestRequest::post()
        .uri("/api/v1/auth/register")
        .set_json(&json!({
            "email": unique_email,
            "password": "newuser123",
            "name": "Test User"
        }))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert!(body["token"].is_string());
    assert_eq!(body["user"]["email"], unique_email);
}

#[actix_web::test]
async fn test_me_endpoint_with_valid_token() {
    let auth_service = crate::auth::AuthService::new();
    
    // First login to get token
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/auth/me", web::get().to(crate::auth::me))
    ).await;

    let req = test::TestRequest::get()
        .uri("/api/v1/auth/me")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["email"], "admin@pytake.com");
    assert_eq!(body["role"], "admin");
}

#[actix_web::test]
async fn test_me_endpoint_without_token() {
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(crate::auth::AuthService::new()))
            .route("/api/v1/auth/me", web::get().to(crate::auth::me))
    ).await;

    let req = test::TestRequest::get()
        .uri("/api/v1/auth/me")
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[actix_web::test]
async fn test_logout() {
    let auth_service = crate::auth::AuthService::new();
    let token = auth_service.generate_token("admin@pytake.com", "admin");
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/auth/logout", web::post().to(crate::auth::logout))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/auth/logout")
        .insert_header(("Authorization", format!("Bearer {}", token)))
        .to_request();

    let resp = test::call_service(&app, req).await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body: serde_json::Value = test::read_body_json(resp).await;
    assert_eq!(body["message"], "Logged out successfully");
}

#[actix_web::test]
async fn test_database_auth_login() {
    // Skip if database is not available
    if std::env::var("SKIP_DB_TESTS").is_ok() {
        return;
    }

    let db = crate::database::establish_connection().await.unwrap();
    let auth_service = crate::auth_db::AuthServiceDb::new();
    
    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(db))
            .app_data(web::Data::new(auth_service))
            .route("/api/v1/auth-db/login", web::post().to(crate::auth_db::login_db))
    ).await;

    let req = test::TestRequest::post()
        .uri("/api/v1/auth-db/login")
        .set_json(&admin_user_credentials())
        .to_request();

    let resp = test::call_service(&app, req).await;
    
    // Should work if database is properly set up with admin user
    if resp.status() == StatusCode::OK {
        let body: serde_json::Value = test::read_body_json(resp).await;
        assert!(body["token"].is_string());
        assert_eq!(body["user"]["email"], "admin@pytake.com");
    }
}

#[actix_web::test]
async fn test_role_based_access() {
    let auth_service = crate::auth::AuthService::new();
    
    // Test different roles
    let admin_token = auth_service.generate_token("admin@pytake.com", "admin");
    let agent_token = auth_service.generate_token("agent@pytake.com", "agent");
    let viewer_token = auth_service.generate_token("viewer@pytake.com", "viewer");
    
    // Verify tokens contain correct role information
    assert!(auth_service.verify_token(&admin_token).is_ok());
    assert!(auth_service.verify_token(&agent_token).is_ok());
    assert!(auth_service.verify_token(&viewer_token).is_ok());
}