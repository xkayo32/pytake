use actix_cors::Cors;
use actix_web::http::{header, Method};

/// Setup CORS middleware based on configuration
pub fn setup_cors(config: &crate::config::CorsConfig) -> Cors {
    let mut cors = Cors::default();

    // Configure allowed origins
    for origin in &config.allowed_origins {
        if origin == "*" {
            cors = cors.allow_any_origin();
        } else {
            cors = cors.allowed_origin(origin);
        }
    }

    // Configure allowed methods
    let mut methods = Vec::new();
    for method_str in &config.allowed_methods {
        match method_str.to_uppercase().as_str() {
            "GET" => methods.push(Method::GET),
            "POST" => methods.push(Method::POST),
            "PUT" => methods.push(Method::PUT),
            "DELETE" => methods.push(Method::DELETE),
            "PATCH" => methods.push(Method::PATCH),
            "OPTIONS" => methods.push(Method::OPTIONS),
            "HEAD" => methods.push(Method::HEAD),
            _ => tracing::warn!("Unknown HTTP method in CORS config: {}", method_str),
        }
    }
    cors = cors.allowed_methods(methods);

    // Configure allowed headers
    let mut headers = Vec::new();
    for header_str in &config.allowed_headers {
        match header_str.to_lowercase().as_str() {
            "content-type" => headers.push(header::CONTENT_TYPE),
            "authorization" => headers.push(header::AUTHORIZATION),
            "x-requested-with" => headers.push(header::HeaderName::from_static("x-requested-with")),
            "accept" => headers.push(header::ACCEPT),
            "origin" => headers.push(header::ORIGIN),
            "user-agent" => headers.push(header::USER_AGENT),
            _ => {
                if let Ok(header_name) = header::HeaderName::try_from(header_str.as_str()) {
                    headers.push(header_name);
                } else {
                    tracing::warn!("Invalid header name in CORS config: {}", header_str);
                }
            }
        }
    }
    cors = cors.allowed_headers(headers);

    // Configure exposed headers
    let mut expose_headers = Vec::new();
    for header_str in &config.expose_headers {
        match header_str.to_lowercase().as_str() {
            "x-total-count" => expose_headers.push(header::HeaderName::from_static("x-total-count")),
            "x-request-id" => expose_headers.push(header::HeaderName::from_static("x-request-id")),
            "location" => expose_headers.push(header::LOCATION),
            "etag" => expose_headers.push(header::ETAG),
            _ => {
                if let Ok(header_name) = header::HeaderName::try_from(header_str.as_str()) {
                    expose_headers.push(header_name);
                } else {
                    tracing::warn!("Invalid expose header name in CORS config: {}", header_str);
                }
            }
        }
    }
    if !expose_headers.is_empty() {
        cors = cors.expose_headers(expose_headers);
    }

    // Configure max age
    if let Some(max_age) = config.max_age {
        cors = cors.max_age(max_age);
    }

    // Configure credentials support
    if config.supports_credentials {
        cors = cors.supports_credentials();
    }

    cors
}

/// Create a permissive CORS configuration for development
pub fn development_cors() -> Cors {
    Cors::default()
        .allow_any_origin()
        .allow_any_method()
        .allow_any_header()
        .supports_credentials()
        .max_age(3600)
}

/// Create a restrictive CORS configuration for production
pub fn production_cors(allowed_origins: Vec<String>) -> Cors {
    let mut cors = Cors::default()
        .allowed_methods(vec![Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allowed_headers(vec![
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::ACCEPT,
            header::HeaderName::from_static("x-requested-with"),
        ])
        .expose_headers(vec![
            header::HeaderName::from_static("x-total-count"),
            header::HeaderName::from_static("x-request-id"),
        ])
        .supports_credentials()
        .max_age(3600);

    for origin in allowed_origins {
        cors = cors.allowed_origin(&origin);
    }

    cors
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::CorsConfig;

    #[test]
    fn test_setup_cors_with_config() {
        let config = CorsConfig {
            allowed_origins: vec!["http://localhost:3000".to_string()],
            allowed_methods: vec!["GET".to_string(), "POST".to_string()],
            allowed_headers: vec!["content-type".to_string(), "authorization".to_string()],
            expose_headers: vec!["x-total-count".to_string()],
            max_age: Some(3600),
            supports_credentials: true,
        };

        let _cors = setup_cors(&config);
        // Note: Can't easily test the actual CORS configuration without integration tests
        // This test mainly ensures the function doesn't panic
    }

    #[test]
    fn test_development_cors() {
        let _cors = development_cors();
        // Note: Can't easily test the actual CORS configuration without integration tests
        // This test mainly ensures the function doesn't panic
    }

    #[test]
    fn test_production_cors() {
        let origins = vec!["https://example.com".to_string()];
        let _cors = production_cors(origins);
        // Note: Can't easily test the actual CORS configuration without integration tests
        // This test mainly ensures the function doesn't panic
    }
}