use actix_web::{test, web, App, middleware};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;
use sea_orm::{Database, DatabaseConnection, MockDatabase, MockExecResult};
use tokio::sync::OnceCell;
use std::sync::Arc;
use redis::Client as RedisClient;
use std::env;
use tokio::time::{sleep, Duration};

// Test configuration with environment-based settings
#[derive(Debug, Clone)]
pub struct TestConfig {
    pub whatsapp_phone_id: String,
    pub whatsapp_token: String,
    pub test_phone_number: String,
    pub jwt_secret: String,
    pub database_url: String,
    pub redis_url: String,
    pub test_database_url: String,
    pub enable_real_external_calls: bool,
}

impl TestConfig {
    pub fn new() -> Self {
        dotenvy::dotenv().ok();
        
        Self {
            whatsapp_phone_id: env::var("TEST_WHATSAPP_PHONE_ID")
                .unwrap_or_else(|_| "574293335763643".to_string()),
            whatsapp_token: env::var("TEST_WHATSAPP_TOKEN")
                .unwrap_or_else(|_| "test_token".to_string()),
            test_phone_number: env::var("TEST_PHONE_NUMBER")
                .unwrap_or_else(|_| "+5561994013828".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "test_jwt_secret_for_testing_only".to_string()),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://pytake:pytake_dev@localhost:5432/pytake".to_string()),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            test_database_url: env::var("TEST_DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://pytake:pytake_dev@localhost:5432/pytake_test".to_string()),
            enable_real_external_calls: env::var("ENABLE_REAL_EXTERNAL_CALLS")
                .unwrap_or_else(|_| "false".to_string()) == "true",
        }
    }
}

impl Default for TestConfig {
    fn default() -> Self {
        Self::new()
    }
}

// Test database utilities
pub struct TestDatabase {
    pub connection: DatabaseConnection,
    pub is_mock: bool,
}

impl TestDatabase {
    /// Creates a mock database for unit tests
    pub async fn mock() -> Self {
        let db = MockDatabase::new(sea_orm::DatabaseBackend::Postgres)
            .into_connection();
        
        Self {
            connection: db,
            is_mock: true,
        }
    }
    
    /// Creates a real test database connection (requires test DB to be running)
    pub async fn real() -> Result<Self, sea_orm::DbErr> {
        let config = TestConfig::new();
        let connection = Database::connect(&config.test_database_url).await?;
        
        Ok(Self {
            connection,
            is_mock: false,
        })
    }
    
    /// Returns a database connection, preferring real DB if available, falling back to mock
    pub async fn connection() -> Self {
        if env::var("SKIP_DB_TESTS").is_ok() {
            return Self::mock().await;
        }
        
        match Self::real().await {
            Ok(db) => db,
            Err(_) => {
                eprintln!("Warning: Could not connect to test database, using mock");
                Self::mock().await
            }
        }
    }
    
    /// Seeds the database with test data
    pub async fn seed_test_data(&self) -> Result<(), sea_orm::DbErr> {
        if self.is_mock {
            // For mock database, we don't need to seed
            return Ok(());
        }
        
        // TODO: Add actual seeding logic when entities are available
        Ok(())
    }
    
    /// Cleans up test data after tests
    pub async fn cleanup_test_data(&self) -> Result<(), sea_orm::DbErr> {
        if self.is_mock {
            return Ok(());
        }
        
        // TODO: Add cleanup logic when entities are available
        Ok(())
    }
}

// Test Redis utilities
pub struct TestRedis {
    pub client: Option<RedisClient>,
    pub is_mock: bool,
}

impl TestRedis {
    /// Creates a real Redis connection for integration tests
    pub async fn real() -> Result<Self, redis::RedisError> {
        let config = TestConfig::new();
        let client = redis::Client::open(config.redis_url)?;
        
        // Test the connection
        let mut conn = client.get_connection()?;
        redis::cmd("PING").execute(&mut conn);
        
        Ok(Self {
            client: Some(client),
            is_mock: false,
        })
    }
    
    /// Creates a mock Redis client for unit tests
    pub fn mock() -> Self {
        Self {
            client: None,
            is_mock: true,
        }
    }
    
    /// Returns a Redis client, preferring real Redis if available
    pub async fn client() -> Self {
        if env::var("SKIP_REDIS_TESTS").is_ok() {
            return Self::mock();
        }
        
        match Self::real().await {
            Ok(redis) => redis,
            Err(_) => {
                eprintln!("Warning: Could not connect to Redis, using mock");
                Self::mock()
            }
        }
    }
    
    /// Cleans up test data from Redis
    pub async fn cleanup(&self) -> Result<(), redis::RedisError> {
        if self.is_mock {
            return Ok(());
        }
        
        if let Some(client) = &self.client {
            let mut conn = client.get_connection()?;
            // Delete all test keys (be careful in real environments!)
            redis::cmd("FLUSHDB").execute(&mut conn);
        }
        
        Ok(())
    }
}

// HTTP Mock Server utilities using wiremock
pub struct MockServer {
    pub server: wiremock::MockServer,
}

impl MockServer {
    pub async fn new() -> Self {
        Self {
            server: wiremock::MockServer::start().await,
        }
    }
    
    pub fn uri(&self) -> String {
        self.server.uri()
    }
    
    /// Sets up mock WhatsApp API responses
    pub async fn setup_whatsapp_mocks(&self) {
        use wiremock::{Mock, ResponseTemplate, matchers::{method, path}};
        
        // Mock send message endpoint
        Mock::given(method("POST"))
            .and(path("/messages"))
            .respond_with(ResponseTemplate::new(200)
                .set_body_json(json!({
                    "messaging_product": "whatsapp",
                    "messages": [{
                        "id": "test-message-id"
                    }]
                })))
            .mount(&self.server)
            .await;
            
        // Mock webhook verification
        Mock::given(method("GET"))
            .and(path("/webhook"))
            .respond_with(ResponseTemplate::new(200)
                .set_body_string("test-challenge"))
            .mount(&self.server)
            .await;
    }
    
    /// Sets up mock ERP system responses
    pub async fn setup_erp_mocks(&self) {
        use wiremock::{Mock, ResponseTemplate, matchers::{method, path_regex}};
        
        Mock::given(method("GET"))
            .and(path_regex(r"/api/customers/.*"))
            .respond_with(ResponseTemplate::new(200)
                .set_body_json(json!({
                    "id": "test-customer-id",
                    "name": "Test Customer",
                    "email": "test@example.com",
                    "phone": "+5561999999999"
                })))
            .mount(&self.server)
            .await;
    }
}

// Helper function to create test app with proper configuration
pub async fn create_test_app() -> impl actix_web::dev::Service<
    actix_http::Request,
    Response = actix_web::dev::ServiceResponse,
    Error = actix_web::Error,
> {
    let config = TestConfig::new();
    
    test::init_service(
        App::new()
            .wrap(actix_cors::Cors::permissive())
            .wrap(middleware::Logger::default())
            .app_data(web::Data::new(config))
            .configure(|cfg| {
                // Add test routes here
                cfg.route("/health", web::get().to(health_handler));
            })
    ).await
}

// Test route handlers
async fn health_handler() -> actix_web::Result<actix_web::HttpResponse> {
    Ok(actix_web::HttpResponse::Ok().json(json!({
        "status": "healthy",
        "service": "pytake-api",
        "timestamp": chrono::Utc::now(),
        "environment": "test"
    })))
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

// Test data generators
pub struct TestDataGenerator;

impl TestDataGenerator {
    pub fn user_email() -> String {
        format!("test_{}@pytake.com", Uuid::new_v4())
    }
    
    pub fn phone_number() -> String {
        format!("+556199{:07}", rand::random::<u32>() % 10000000)
    }
    
    pub fn conversation_id() -> String {
        Uuid::new_v4().to_string()
    }
    
    pub fn message_content() -> String {
        "Test message content".to_string()
    }
    
    pub fn whatsapp_message() -> serde_json::Value {
        json!({
            "messaging_product": "whatsapp",
            "to": Self::phone_number(),
            "type": "text",
            "text": {
                "body": Self::message_content()
            }
        })
    }
}

// Async test utilities
pub async fn wait_for_condition<F, Fut>(
    condition: F,
    timeout_secs: u64,
    check_interval_ms: u64,
) -> bool
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = bool>,
{
    let start = std::time::Instant::now();
    let timeout = Duration::from_secs(timeout_secs);
    let check_interval = Duration::from_millis(check_interval_ms);
    
    while start.elapsed() < timeout {
        if condition().await {
            return true;
        }
        sleep(check_interval).await;
    }
    
    false
}

// Test assertions helpers
pub fn assert_json_contains(actual: &serde_json::Value, expected: &serde_json::Value) {
    match (actual, expected) {
        (serde_json::Value::Object(actual_obj), serde_json::Value::Object(expected_obj)) => {
            for (key, expected_val) in expected_obj {
                assert!(actual_obj.contains_key(key), "Missing key: {}", key);
                assert_json_contains(&actual_obj[key], expected_val);
            }
        }
        (actual_val, expected_val) => {
            assert_eq!(actual_val, expected_val);
        }
    }
}

// Environment helpers for tests
pub fn is_ci() -> bool {
    env::var("CI").is_ok()
}

pub fn should_skip_integration_tests() -> bool {
    env::var("SKIP_INTEGRATION_TESTS").is_ok()
}

pub fn should_skip_db_tests() -> bool {
    env::var("SKIP_DB_TESTS").is_ok()
}

pub fn should_skip_redis_tests() -> bool {
    env::var("SKIP_REDIS_TESTS").is_ok()
}

pub fn should_skip_external_tests() -> bool {
    env::var("SKIP_EXTERNAL_TESTS").is_ok()
}

// Test cleanup utilities
pub struct TestCleanup {
    cleanup_fns: Vec<Box<dyn FnOnce() -> Result<(), Box<dyn std::error::Error + Send + Sync>>>>,
}

impl TestCleanup {
    pub fn new() -> Self {
        Self {
            cleanup_fns: Vec::new(),
        }
    }
    
    pub fn add_cleanup<F>(&mut self, cleanup_fn: F)
    where
        F: FnOnce() -> Result<(), Box<dyn std::error::Error + Send + Sync>> + 'static,
    {
        self.cleanup_fns.push(Box::new(cleanup_fn));
    }
    
    pub fn run_cleanup(self) {
        for cleanup_fn in self.cleanup_fns {
            if let Err(e) = cleanup_fn() {
                eprintln!("Cleanup failed: {}", e);
            }
        }
    }
}

impl Drop for TestCleanup {
    fn drop(&mut self) {
        // Move the cleanup functions out of self to call run_cleanup
        let cleanup_fns = std::mem::take(&mut self.cleanup_fns);
        let cleanup = TestCleanup { cleanup_fns };
        cleanup.run_cleanup();
    }
}

// Performance testing utilities
pub struct PerformanceTest {
    start_time: std::time::Instant,
    name: String,
}

impl PerformanceTest {
    pub fn new(name: &str) -> Self {
        Self {
            start_time: std::time::Instant::now(),
            name: name.to_string(),
        }
    }
    
    pub fn elapsed(&self) -> Duration {
        self.start_time.elapsed()
    }
    
    pub fn assert_faster_than(&self, max_duration: Duration) {
        let elapsed = self.elapsed();
        assert!(
            elapsed < max_duration,
            "Test '{}' took {:?}, expected less than {:?}",
            self.name,
            elapsed,
            max_duration
        );
    }
}

impl Drop for PerformanceTest {
    fn drop(&mut self) {
        println!("Test '{}' completed in {:?}", self.name, self.elapsed());
    }
}