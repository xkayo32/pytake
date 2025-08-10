use actix_web::{test, web, App, http::StatusCode, middleware};
use serde_json::json;
use std::time::{Duration, Instant};
use std::collections::HashMap;
use uuid::Uuid;
use tokio::time::sleep;
use serial_test::serial;
use pretty_assertions::assert_eq;
use rstest::*;

use crate::common::*;

#[cfg(test)]
mod rate_limiter_tests {
    use super::*;

    // Mock rate limiter implementation
    #[derive(Clone)]
    pub struct MockRateLimiter {
        pub limits: std::sync::Arc<std::sync::RwLock<HashMap<String, (i64, Duration, Instant)>>>,
        pub should_fail: bool,
    }

    impl MockRateLimiter {
        pub fn new() -> Self {
            Self {
                limits: std::sync::Arc::new(std::sync::RwLock::new(HashMap::new())),
                should_fail: false,
            }
        }

        pub fn with_failure() -> Self {
            Self {
                limits: std::sync::Arc::new(std::sync::RwLock::new(HashMap::new())),
                should_fail: true,
            }
        }

        pub async fn check_rate_limit(&self, key: &str, max_requests: i64, window: Duration) -> Result<RateLimitResult, String> {
            if self.should_fail {
                return Err("Rate limiter service unavailable".to_string());
            }

            let now = Instant::now();
            let mut limits = self.limits.write().unwrap();

            match limits.get_mut(key) {
                Some((count, window_duration, start_time)) => {
                    if now.duration_since(*start_time) > *window_duration {
                        // Reset window
                        *count = 1;
                        *start_time = now;
                        Ok(RateLimitResult {
                            allowed: true,
                            requests_remaining: max_requests - 1,
                            reset_time: now + window,
                            retry_after: None,
                        })
                    } else if *count >= max_requests {
                        // Rate limit exceeded
                        let retry_after = *window_duration - now.duration_since(*start_time);
                        Ok(RateLimitResult {
                            allowed: false,
                            requests_remaining: 0,
                            reset_time: *start_time + *window_duration,
                            retry_after: Some(retry_after),
                        })
                    } else {
                        // Within limits
                        *count += 1;
                        Ok(RateLimitResult {
                            allowed: true,
                            requests_remaining: max_requests - *count,
                            reset_time: *start_time + *window_duration,
                            retry_after: None,
                        })
                    }
                }
                None => {
                    // First request for this key
                    limits.insert(key.to_string(), (1, window, now));
                    Ok(RateLimitResult {
                        allowed: true,
                        requests_remaining: max_requests - 1,
                        reset_time: now + window,
                        retry_after: None,
                    })
                }
            }
        }

        pub async fn reset_limit(&self, key: &str) -> Result<(), String> {
            if self.should_fail {
                return Err("Rate limiter service unavailable".to_string());
            }

            let mut limits = self.limits.write().unwrap();
            limits.remove(key);
            Ok(())
        }

        pub async fn get_current_usage(&self, key: &str) -> Result<Option<i64>, String> {
            if self.should_fail {
                return Err("Rate limiter service unavailable".to_string());
            }

            let limits = self.limits.read().unwrap();
            Ok(limits.get(key).map(|(count, _, _)| *count))
        }
    }

    #[derive(Debug, Clone, PartialEq)]
    pub struct RateLimitResult {
        pub allowed: bool,
        pub requests_remaining: i64,
        pub reset_time: Instant,
        pub retry_after: Option<Duration>,
    }

    #[fixture]
    fn rate_limiter() -> MockRateLimiter {
        MockRateLimiter::new()
    }

    #[fixture]
    fn failing_rate_limiter() -> MockRateLimiter {
        MockRateLimiter::with_failure()
    }

    #[rstest]
    #[tokio::test]
    async fn test_first_request_allowed(rate_limiter: MockRateLimiter) {
        let key = "user:123";
        let max_requests = 10;
        let window = Duration::from_secs(60);

        let result = rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
        
        assert!(result.allowed);
        assert_eq!(result.requests_remaining, 9);
        assert!(result.retry_after.is_none());
    }

    #[rstest]
    #[tokio::test]
    async fn test_multiple_requests_within_limit(rate_limiter: MockRateLimiter) {
        let key = "user:456";
        let max_requests = 5;
        let window = Duration::from_secs(60);

        // Make 5 requests (all should be allowed)
        for i in 0..5 {
            let result = rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
            assert!(result.allowed, "Request {} should be allowed", i + 1);
            assert_eq!(result.requests_remaining, max_requests - (i + 1));
        }
    }

    #[rstest]
    #[tokio::test]
    async fn test_rate_limit_exceeded(rate_limiter: MockRateLimiter) {
        let key = "user:789";
        let max_requests = 3;
        let window = Duration::from_secs(60);

        // Make 3 requests (all should be allowed)
        for i in 0..3 {
            let result = rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
            assert!(result.allowed, "Request {} should be allowed", i + 1);
        }

        // 4th request should be denied
        let result = rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
        assert!(!result.allowed);
        assert_eq!(result.requests_remaining, 0);
        assert!(result.retry_after.is_some());
    }

    #[rstest]
    #[tokio::test]
    async fn test_rate_limit_reset(rate_limiter: MockRateLimiter) {
        let key = "user:reset";
        let max_requests = 2;
        let window = Duration::from_secs(60);

        // Use up the limit
        for _ in 0..2 {
            rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
        }

        // Should be denied
        let result = rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
        assert!(!result.allowed);

        // Reset the limit
        rate_limiter.reset_limit(key).await.unwrap();

        // Should be allowed again
        let result = rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
        assert!(result.allowed);
        assert_eq!(result.requests_remaining, max_requests - 1);
    }

    #[rstest]
    #[tokio::test]
    async fn test_different_keys_independent(rate_limiter: MockRateLimiter) {
        let key1 = "user:111";
        let key2 = "user:222";
        let max_requests = 2;
        let window = Duration::from_secs(60);

        // Use up limit for key1
        for _ in 0..2 {
            rate_limiter.check_rate_limit(key1, max_requests, window).await.unwrap();
        }

        // key1 should be denied
        let result = rate_limiter.check_rate_limit(key1, max_requests, window).await.unwrap();
        assert!(!result.allowed);

        // key2 should still be allowed
        let result = rate_limiter.check_rate_limit(key2, max_requests, window).await.unwrap();
        assert!(result.allowed);
    }

    #[rstest]
    #[tokio::test]
    async fn test_current_usage_tracking(rate_limiter: MockRateLimiter) {
        let key = "user:usage";
        let max_requests = 10;
        let window = Duration::from_secs(60);

        // Initially no usage
        let usage = rate_limiter.get_current_usage(key).await.unwrap();
        assert_eq!(usage, None);

        // Make some requests
        for i in 1..=5 {
            rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
            let usage = rate_limiter.get_current_usage(key).await.unwrap();
            assert_eq!(usage, Some(i));
        }
    }

    #[rstest]
    #[tokio::test]
    async fn test_rate_limiter_failure_handling(failing_rate_limiter: MockRateLimiter) {
        let key = "user:fail";
        let max_requests = 10;
        let window = Duration::from_secs(60);

        let result = failing_rate_limiter.check_rate_limit(key, max_requests, window).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Rate limiter service unavailable");
    }
}

#[cfg(test)]
mod api_rate_limiting_tests {
    use super::*;
    use actix_web::{HttpRequest, HttpResponse, Result as ActixResult};

    // Mock rate limiting middleware
    async fn rate_limit_middleware(
        req: HttpRequest,
        rate_limiter: web::Data<MockRateLimiter>,
    ) -> ActixResult<HttpResponse> {
        // Extract client identifier (IP, user ID, API key, etc.)
        let client_id = get_client_identifier(&req);
        
        // Define rate limits based on endpoint or client type
        let (max_requests, window) = get_rate_limits(&req);
        
        match rate_limiter.check_rate_limit(&client_id, max_requests, window).await {
            Ok(result) if result.allowed => {
                // Add rate limit headers to response
                Ok(HttpResponse::Ok()
                    .insert_header(("X-RateLimit-Limit", max_requests.to_string()))
                    .insert_header(("X-RateLimit-Remaining", result.requests_remaining.to_string()))
                    .insert_header(("X-RateLimit-Reset", result.reset_time.elapsed().as_secs().to_string()))
                    .json(json!({ "message": "Request allowed" })))
            }
            Ok(result) => {
                // Rate limit exceeded
                let mut response = HttpResponse::TooManyRequests()
                    .insert_header(("X-RateLimit-Limit", max_requests.to_string()))
                    .insert_header(("X-RateLimit-Remaining", "0"))
                    .insert_header(("X-RateLimit-Reset", result.reset_time.elapsed().as_secs().to_string()));
                    
                if let Some(retry_after) = result.retry_after {
                    response = response.insert_header(("Retry-After", retry_after.as_secs().to_string()));
                }
                
                Ok(response.json(json!({
                    "error": "Rate limit exceeded",
                    "message": "Too many requests"
                })))
            }
            Err(_) => {
                // Rate limiter service error - allow request but log error
                Ok(HttpResponse::Ok().json(json!({ "message": "Request allowed (rate limiter unavailable)" })))
            }
        }
    }

    fn get_client_identifier(req: &HttpRequest) -> String {
        // In a real implementation, this would extract client ID from:
        // - Authorization header (user ID)
        // - API key
        // - IP address
        // For testing, we'll use a mock identifier
        req.headers()
            .get("X-Client-ID")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("default_client")
            .to_string()
    }

    fn get_rate_limits(req: &HttpRequest) -> (i64, Duration) {
        // In a real implementation, this would determine limits based on:
        // - Endpoint path
        // - User tier/subscription
        // - API key type
        match req.path() {
            "/api/v1/whatsapp/send" => (100, Duration::from_secs(3600)), // 100 messages per hour
            "/api/v1/auth/login" => (5, Duration::from_secs(300)),        // 5 login attempts per 5 minutes
            "/api/v1/auth/register" => (3, Duration::from_secs(3600)),    // 3 registrations per hour
            _ => (1000, Duration::from_secs(3600)),                       // Default: 1000 requests per hour
        }
    }

    #[tokio::test]
    async fn test_api_rate_limiting_allowed() {
        let rate_limiter = MockRateLimiter::new();
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(rate_limiter))
                .route("/test", web::get().to(rate_limit_middleware))
        ).await;

        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("X-Client-ID", "test_user_1"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);

        // Check rate limit headers
        let headers = resp.headers();
        assert!(headers.contains_key("X-RateLimit-Limit"));
        assert!(headers.contains_key("X-RateLimit-Remaining"));
        assert!(headers.contains_key("X-RateLimit-Reset"));
    }

    #[tokio::test]
    async fn test_api_rate_limiting_exceeded() {
        let rate_limiter = MockRateLimiter::new();
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(rate_limiter))
                .route("/api/v1/auth/login", web::post().to(rate_limit_middleware))
        ).await;

        let client_id = "test_user_heavy";

        // Make requests up to the limit (5 for login endpoint)
        for i in 0..5 {
            let req = test::TestRequest::post()
                .uri("/api/v1/auth/login")
                .insert_header(("X-Client-ID", client_id))
                .to_request();

            let resp = test::call_service(&app, req).await;
            assert_eq!(resp.status(), StatusCode::OK, "Request {} should be allowed", i + 1);
        }

        // 6th request should be denied
        let req = test::TestRequest::post()
            .uri("/api/v1/auth/login")
            .insert_header(("X-Client-ID", client_id))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::TOO_MANY_REQUESTS);

        let headers = resp.headers();
        assert_eq!(headers.get("X-RateLimit-Remaining").unwrap().to_str().unwrap(), "0");
        assert!(headers.contains_key("Retry-After"));
    }

    #[tokio::test]
    async fn test_different_endpoints_different_limits() {
        let rate_limiter = MockRateLimiter::new();
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(rate_limiter))
                .route("/api/v1/whatsapp/send", web::post().to(rate_limit_middleware))
                .route("/api/v1/auth/login", web::post().to(rate_limit_middleware))
        ).await;

        let client_id = "test_user_endpoints";

        // Use up login rate limit (5 requests)
        for _ in 0..5 {
            let req = test::TestRequest::post()
                .uri("/api/v1/auth/login")
                .insert_header(("X-Client-ID", client_id))
                .to_request();
            test::call_service(&app, req).await;
        }

        // Login should now be rate limited
        let req = test::TestRequest::post()
            .uri("/api/v1/auth/login")
            .insert_header(("X-Client-ID", client_id))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::TOO_MANY_REQUESTS);

        // But WhatsApp send should still work (different limit)
        let req = test::TestRequest::post()
            .uri("/api/v1/whatsapp/send")
            .insert_header(("X-Client-ID", client_id))
            .to_request();
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), StatusCode::OK);
    }
}

#[cfg(test)]
mod distributed_rate_limiting_tests {
    use super::*;

    // Distributed rate limiter using Redis-like storage
    pub struct DistributedRateLimiter {
        cache: crate::redis_tests::MockRedisCache,
    }

    impl DistributedRateLimiter {
        pub fn new(cache: crate::redis_tests::MockRedisCache) -> Self {
            Self { cache }
        }

        pub async fn check_rate_limit(&self, key: &str, max_requests: i64, window_secs: u64) -> Result<RateLimitResult, String> {
            let window_key = format!("rate_limit:{}:{}", key, self.current_window(window_secs));
            
            // Increment counter
            let current_count = self.cache.incr(&window_key).await?;
            
            // Set expiration on first request
            if current_count == 1 {
                self.cache.expire(&window_key, Duration::from_secs(window_secs)).await?;
            }
            
            let allowed = current_count <= max_requests;
            let requests_remaining = (max_requests - current_count).max(0);
            
            Ok(RateLimitResult {
                allowed,
                requests_remaining,
                reset_time: Instant::now() + Duration::from_secs(window_secs),
                retry_after: if allowed { None } else { Some(Duration::from_secs(window_secs)) },
            })
        }

        pub async fn get_current_usage(&self, key: &str, window_secs: u64) -> Result<i64, String> {
            let window_key = format!("rate_limit:{}:{}", key, self.current_window(window_secs));
            
            let count = self.cache.get(&window_key).await?
                .and_then(|v| v.parse::<i64>().ok())
                .unwrap_or(0);
            
            Ok(count)
        }

        pub async fn reset_limit(&self, key: &str, window_secs: u64) -> Result<(), String> {
            let window_key = format!("rate_limit:{}:{}", key, self.current_window(window_secs));
            self.cache.del(&window_key).await?;
            Ok(())
        }

        fn current_window(&self, window_secs: u64) -> u64 {
            chrono::Utc::now().timestamp() as u64 / window_secs
        }
    }

    #[tokio::test]
    async fn test_distributed_rate_limiting() {
        let cache = crate::redis_tests::MockRedisCache::new();
        let rate_limiter = DistributedRateLimiter::new(cache);

        let key = "api_key:abc123";
        let max_requests = 10;
        let window_secs = 60;

        // First request should be allowed
        let result = rate_limiter.check_rate_limit(key, max_requests, window_secs).await.unwrap();
        assert!(result.allowed);
        assert_eq!(result.requests_remaining, 9);

        // Check current usage
        let usage = rate_limiter.get_current_usage(key, window_secs).await.unwrap();
        assert_eq!(usage, 1);

        // Make more requests
        for i in 2..=10 {
            let result = rate_limiter.check_rate_limit(key, max_requests, window_secs).await.unwrap();
            assert!(result.allowed, "Request {} should be allowed", i);
            
            let usage = rate_limiter.get_current_usage(key, window_secs).await.unwrap();
            assert_eq!(usage, i);
        }

        // 11th request should be denied
        let result = rate_limiter.check_rate_limit(key, max_requests, window_secs).await.unwrap();
        assert!(!result.allowed);
        assert_eq!(result.requests_remaining, 0);
    }

    #[tokio::test]
    async fn test_sliding_window_rate_limiting() {
        let cache = crate::redis_tests::MockRedisCache::new();
        let rate_limiter = DistributedRateLimiter::new(cache);

        let key = "sliding_window_test";
        let max_requests = 5;
        let window_secs = 10; // Short window for testing

        // Fill up the current window
        for _ in 0..5 {
            rate_limiter.check_rate_limit(key, max_requests, window_secs).await.unwrap();
        }

        // Should be rate limited
        let result = rate_limiter.check_rate_limit(key, max_requests, window_secs).await.unwrap();
        assert!(!result.allowed);

        // Wait for next window (in real implementation, this would be handled by Redis expiration)
        // For the mock, we'll simulate by resetting
        rate_limiter.reset_limit(key, window_secs).await.unwrap();

        // Should be allowed again in new window
        let result = rate_limiter.check_rate_limit(key, max_requests, window_secs).await.unwrap();
        assert!(result.allowed);
    }
}

#[cfg(test)]
mod adaptive_rate_limiting_tests {
    use super::*;

    // Adaptive rate limiter that adjusts limits based on system load
    pub struct AdaptiveRateLimiter {
        base_limiter: MockRateLimiter,
        system_load: std::sync::Arc<std::sync::RwLock<f64>>, // 0.0 to 1.0
    }

    impl AdaptiveRateLimiter {
        pub fn new() -> Self {
            Self {
                base_limiter: MockRateLimiter::new(),
                system_load: std::sync::Arc::new(std::sync::RwLock::new(0.0)),
            }
        }

        pub fn set_system_load(&self, load: f64) {
            let mut system_load = self.system_load.write().unwrap();
            *system_load = load.clamp(0.0, 1.0);
        }

        pub async fn check_rate_limit(&self, key: &str, base_max_requests: i64, window: Duration) -> Result<RateLimitResult, String> {
            let system_load = *self.system_load.read().unwrap();
            
            // Reduce rate limit based on system load
            let load_factor = 1.0 - (system_load * 0.8); // Reduce by up to 80% under high load
            let adjusted_max_requests = (base_max_requests as f64 * load_factor) as i64;
            let adjusted_max_requests = adjusted_max_requests.max(1); // At least 1 request
            
            self.base_limiter.check_rate_limit(key, adjusted_max_requests, window).await
        }

        pub fn get_system_load(&self) -> f64 {
            *self.system_load.read().unwrap()
        }
    }

    #[tokio::test]
    async fn test_adaptive_rate_limiting_low_load() {
        let adaptive_limiter = AdaptiveRateLimiter::new();
        adaptive_limiter.set_system_load(0.2); // Low load

        let key = "adaptive_test_low";
        let base_max_requests = 10;
        let window = Duration::from_secs(60);

        // Under low load, should allow close to full rate
        let result = adaptive_limiter.check_rate_limit(key, base_max_requests, window).await.unwrap();
        assert!(result.allowed);
        // With 20% load, rate should be reduced by 16% (20% * 0.8)
        // So 10 requests becomes ~8 requests, leaving 7 remaining after first request
        assert!(result.requests_remaining >= 7);
    }

    #[tokio::test]
    async fn test_adaptive_rate_limiting_high_load() {
        let adaptive_limiter = AdaptiveRateLimiter::new();
        adaptive_limiter.set_system_load(0.9); // High load

        let key = "adaptive_test_high";
        let base_max_requests = 10;
        let window = Duration::from_secs(60);

        // Under high load, rate should be significantly reduced
        let result = adaptive_limiter.check_rate_limit(key, base_max_requests, window).await.unwrap();
        assert!(result.allowed);
        // With 90% load, rate should be reduced by 72% (90% * 0.8)
        // So 10 requests becomes ~3 requests, leaving 2 remaining after first request
        assert!(result.requests_remaining <= 3);
    }

    #[tokio::test]
    async fn test_adaptive_rate_limiting_load_changes() {
        let adaptive_limiter = AdaptiveRateLimiter::new();
        
        // Start with low load
        adaptive_limiter.set_system_load(0.1);
        assert_eq!(adaptive_limiter.get_system_load(), 0.1);

        // Increase load
        adaptive_limiter.set_system_load(0.8);
        assert_eq!(adaptive_limiter.get_system_load(), 0.8);

        // Test clamping
        adaptive_limiter.set_system_load(1.5);
        assert_eq!(adaptive_limiter.get_system_load(), 1.0);

        adaptive_limiter.set_system_load(-0.5);
        assert_eq!(adaptive_limiter.get_system_load(), 0.0);
    }
}

#[cfg(test)]
mod performance_tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limiter_performance() {
        let _perf_test = PerformanceTest::new("rate_limiter_check");
        let rate_limiter = MockRateLimiter::new();

        let key = "perf_test_user";
        let max_requests = 1000;
        let window = Duration::from_secs(3600);

        // Test single rate limit check performance
        let result = rate_limiter.check_rate_limit(key, max_requests, window).await.unwrap();
        assert!(result.allowed);

        _perf_test.assert_faster_than(Duration::from_millis(1));
    }

    #[tokio::test]
    async fn test_concurrent_rate_limiting() {
        let _perf_test = PerformanceTest::new("concurrent_rate_limiting");
        let rate_limiter = std::sync::Arc::new(MockRateLimiter::new());

        let concurrent_requests = 100;
        let mut tasks = Vec::new();

        for i in 0..concurrent_requests {
            let limiter = rate_limiter.clone();
            let key = format!("concurrent_user_{}", i % 10); // 10 different users
            
            let task = tokio::spawn(async move {
                limiter.check_rate_limit(&key, 50, Duration::from_secs(60)).await
            });
            tasks.push(task);
        }

        let results = futures::future::join_all(tasks).await;
        
        let mut successful_checks = 0;
        for result in results {
            if result.is_ok() && result.unwrap().is_ok() {
                successful_checks += 1;
            }
        }

        assert!(successful_checks > 0);
        _perf_test.assert_faster_than(Duration::from_secs(1));
    }
}

// Integration test with the actual rate limiter service
#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    #[serial]
    async fn test_rate_limiter_with_redis() {
        if should_skip_redis_tests() {
            return;
        }

        let test_redis = TestRedis::client().await;
        if test_redis.is_mock {
            println!("Skipping Redis rate limiter integration test - Redis not available");
            return;
        }

        // This would test with real Redis if available
        // For now, we'll just verify the connection was successful
        assert!(!test_redis.is_mock);
    }
}