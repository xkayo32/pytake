use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, HttpResponse, Result,
    http::{header, StatusCode},
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use actix_governor::{Governor, GovernorConfigBuilder, KeyExtractor, PeerIpKeyExtractor};
use governor::{Quota, RateLimiter};
use nonzero_ext::*;
use tracing::{warn, debug};

/// Rate limiter configuration for different endpoint types
#[derive(Clone)]
pub struct RateLimitConfig {
    pub requests_per_minute: u32,
    pub burst_size: u32,
    pub identifier: &'static str,
}

impl RateLimitConfig {
    pub const AUTH: Self = Self {
        requests_per_minute: 5,
        burst_size: 10,
        identifier: "auth",
    };
    
    pub const WHATSAPP_SEND: Self = Self {
        requests_per_minute: 100,
        burst_size: 120,
        identifier: "whatsapp_send",
    };
    
    pub const CONFIG_UPDATE: Self = Self {
        requests_per_minute: 30,
        burst_size: 50,
        identifier: "config_update",
    };
    
    pub const DEFAULT: Self = Self {
        requests_per_minute: 1000,
        burst_size: 1200,
        identifier: "default",
    };
}

/// Create a rate limiter for a specific configuration
pub fn create_rate_limiter(config: RateLimitConfig) -> Governor<PeerIpKeyExtractor, impl governor::clock::Clock> {
    Governor::new(
        &GovernorConfigBuilder::default()
            .per_minute(config.requests_per_minute)
            .burst_size(config.burst_size)
            .finish()
            .unwrap()
    )
}

/// Custom key extractor that uses IP address + user ID if available
#[derive(Clone)]
pub struct UserOrIpKeyExtractor;

impl KeyExtractor for UserOrIpKeyExtractor {
    type Key = String;
    
    fn extract(&self, req: &ServiceRequest) -> Result<Self::Key, Error> {
        // Try to extract user ID from JWT token first
        if let Some(user_id) = extract_user_id_from_request(req) {
            return Ok(format!("user:{}", user_id));
        }
        
        // Fall back to IP address
        let peer_ip = req.peer_addr()
            .map(|addr| addr.ip().to_string())
            .unwrap_or_else(|| "unknown".to_string());
            
        Ok(format!("ip:{}", peer_ip))
    }
}

/// Extract user ID from JWT token in Authorization header
fn extract_user_id_from_request(req: &ServiceRequest) -> Option<String> {
    if let Some(auth_header) = req.headers().get(header::AUTHORIZATION) {
        if let Ok(auth_str) = auth_header.to_str() {
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..];
                return extract_user_id_from_jwt(token);
            }
        }
    }
    None
}

/// Simple JWT user ID extraction (without full validation for rate limiting purposes)
fn extract_user_id_from_jwt(token: &str) -> Option<String> {
    use base64::{Engine as _, engine::general_purpose};
    use serde_json::Value;
    
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    
    // Decode payload (without verification - just for rate limiting)
    if let Ok(payload_bytes) = general_purpose::STANDARD_NO_PAD.decode(parts[1]) {
        if let Ok(payload_str) = String::from_utf8(payload_bytes) {
            if let Ok(payload_json) = serde_json::from_str::<Value>(&payload_str) {
                if let Some(user_id) = payload_json.get("user_id").and_then(|v| v.as_str()) {
                    return Some(user_id.to_string());
                }
                if let Some(sub) = payload_json.get("sub").and_then(|v| v.as_str()) {
                    return Some(sub.to_string());
                }
            }
        }
    }
    
    None
}

/// Enhanced rate limiter that tracks specific endpoint usage
pub struct EnhancedRateLimiter {
    limiter: RateLimiter<String, governor::DefaultDirectRateLimiter, governor::clock::DefaultClock>,
    config: RateLimitConfig,
}

impl EnhancedRateLimiter {
    pub fn new(config: RateLimitConfig) -> Self {
        let quota = Quota::per_minute(nonzero!(config.requests_per_minute))
            .allow_burst(nonzero!(config.burst_size));
            
        Self {
            limiter: RateLimiter::direct(quota),
            config,
        }
    }
    
    /// Check if request is allowed and return rate limit info
    pub fn check_rate_limit(&self, key: &str) -> RateLimitResult {
        match self.limiter.check_key(key) {
            Ok(_) => RateLimitResult::Allowed,
            Err(not_until) => {
                let retry_after = not_until.wait_time_from(SystemTime::now());
                RateLimitResult::Limited(retry_after)
            }
        }
    }
}

#[derive(Debug)]
pub enum RateLimitResult {
    Allowed,
    Limited(Duration),
}

/// Middleware factory for enhanced rate limiting
pub struct EnhancedRateLimitMiddleware {
    limiter: Rc<EnhancedRateLimiter>,
}

impl EnhancedRateLimitMiddleware {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            limiter: Rc::new(EnhancedRateLimiter::new(config)),
        }
    }
}

impl<S, B> Transform<S, ServiceRequest> for EnhancedRateLimitMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = EnhancedRateLimitMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(EnhancedRateLimitMiddlewareService {
            service,
            limiter: self.limiter.clone(),
        }))
    }
}

pub struct EnhancedRateLimitMiddlewareService<S> {
    service: S,
    limiter: Rc<EnhancedRateLimiter>,
}

impl<S, B> Service<ServiceRequest> for EnhancedRateLimitMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let limiter = self.limiter.clone();
        
        // Extract key for rate limiting
        let key = UserOrIpKeyExtractor.extract(&req)
            .unwrap_or_else(|_| "unknown".to_string());
            
        debug!("Rate limiting check for key: {} on endpoint: {}", key, req.path());

        let fut = self.service.call(req);
        
        Box::pin(async move {
            match limiter.check_rate_limit(&key) {
                RateLimitResult::Allowed => {
                    debug!("Rate limit check passed for key: {}", key);
                    fut.await
                }
                RateLimitResult::Limited(retry_after) => {
                    warn!("Rate limit exceeded for key: {}, retry after: {:?}", key, retry_after);
                    
                    let retry_after_secs = retry_after.as_secs().max(1);
                    
                    let response = HttpResponse::TooManyRequests()
                        .insert_header(("Retry-After", retry_after_secs.to_string()))
                        .insert_header(("X-RateLimit-Limit", limiter.config.requests_per_minute.to_string()))
                        .insert_header(("X-RateLimit-Remaining", "0"))
                        .insert_header(("X-RateLimit-Reset", (SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() + retry_after_secs).to_string()))
                        .json(serde_json::json!({
                            "error": "Rate limit exceeded",
                            "message": format!("Too many requests. Limit: {} requests per minute. Try again after {} seconds.", 
                                limiter.config.requests_per_minute, retry_after_secs),
                            "retry_after": retry_after_secs,
                            "limit": limiter.config.requests_per_minute,
                            "endpoint_type": limiter.config.identifier
                        }));
                        
                    Ok(ServiceResponse::new(
                        req.into_parts().0,
                        response.map_into_left_body(),
                    ))
                }
            }
        })
    }
}

/// Helper function to create rate limiting middleware for specific configurations
pub fn auth_rate_limiter() -> EnhancedRateLimitMiddleware {
    EnhancedRateLimitMiddleware::new(RateLimitConfig::AUTH)
}

pub fn whatsapp_send_rate_limiter() -> EnhancedRateLimitMiddleware {
    EnhancedRateLimitMiddleware::new(RateLimitConfig::WHATSAPP_SEND)
}

pub fn config_update_rate_limiter() -> EnhancedRateLimitMiddleware {
    EnhancedRateLimitMiddleware::new(RateLimitConfig::CONFIG_UPDATE)
}

pub fn default_rate_limiter() -> EnhancedRateLimitMiddleware {
    EnhancedRateLimitMiddleware::new(RateLimitConfig::DEFAULT)
}