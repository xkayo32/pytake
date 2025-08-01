use std::io;
use tracing::Level;
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter, Registry,
};

use crate::config::{ApiConfig, LogFormat};

/// Initialize the logging system based on configuration
pub fn init_logging(config: &ApiConfig) -> anyhow::Result<()> {
    // Create environment filter
    let env_filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new(&config.log_level))
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // Create the base subscriber
    let subscriber = Registry::default().with(env_filter);

    // Configure and apply the appropriate format
    match config.log_format {
        LogFormat::Json => {
            let json_layer = fmt::layer()
                .json()
                .with_current_span(true)
                .with_span_list(true)
                .with_target(true)
                .with_thread_ids(true)
                .with_thread_names(true)
                .with_file(true)
                .with_line_number(true)
                .with_span_events(FmtSpan::NEW | FmtSpan::CLOSE);

            subscriber.with(json_layer).init();
        }
        LogFormat::Pretty => {
            let pretty_layer = fmt::layer()
                .pretty()
                .with_target(true)
                .with_thread_ids(true)
                .with_file(true)
                .with_line_number(true)
                .with_span_events(FmtSpan::NEW | FmtSpan::CLOSE);

            subscriber.with(pretty_layer).init();
        }
        LogFormat::Compact => {
            let compact_layer = fmt::layer()
                .compact()
                .with_target(false)
                .with_thread_ids(false)
                .with_span_events(FmtSpan::CLOSE);

            subscriber.with(compact_layer).init();
        }
    }

    tracing::info!(
        app_name = config.app_name,
        environment = config.environment,
        log_level = %config.log_level,
        log_format = ?config.log_format,
        "Logging initialized"
    );

    Ok(())
}

/// Creates a span for HTTP requests with relevant fields
#[macro_export]
macro_rules! http_span {
    ($method:expr, $path:expr, $request_id:expr) => {
        tracing::info_span!(
            "http_request",
            method = %$method,
            path = %$path,
            request_id = %$request_id,
            status_code = tracing::field::Empty,
            response_time_ms = tracing::field::Empty,
            error = tracing::field::Empty,
        )
    };
}

/// Creates a span for database operations
#[macro_export]
macro_rules! db_span {
    ($operation:expr, $table:expr) => {
        tracing::info_span!(
            "db_operation",
            operation = %$operation,
            table = %$table,
            duration_ms = tracing::field::Empty,
            rows_affected = tracing::field::Empty,
            error = tracing::field::Empty,
        )
    };
}

/// Creates a span for external API calls
#[macro_export]
macro_rules! api_call_span {
    ($service:expr, $method:expr, $endpoint:expr) => {
        tracing::info_span!(
            "external_api_call",
            service = %$service,
            method = %$method,
            endpoint = %$endpoint,
            status_code = tracing::field::Empty,
            duration_ms = tracing::field::Empty,
            error = tracing::field::Empty,
        )
    };
}

/// Log request details
pub fn log_request(method: &str, path: &str, request_id: &str, remote_addr: Option<&str>) {
    tracing::info!(
        method = %method,
        path = %path,
        request_id = %request_id,
        remote_addr = remote_addr.unwrap_or("unknown"),
        "Incoming request"
    );
}

/// Log response details
pub fn log_response(
    method: &str,
    path: &str,
    request_id: &str,
    status_code: u16,
    duration_ms: u128,
) {
    match status_code {
        200..=299 => {
            tracing::info!(
                method = %method,
                path = %path,
                request_id = %request_id,
                status_code = status_code,
                duration_ms = duration_ms,
                "Request completed successfully"
            );
        }
        400..=499 => {
            tracing::warn!(
                method = %method,
                path = %path,
                request_id = %request_id,
                status_code = status_code,
                duration_ms = duration_ms,
                "Client error"
            );
        }
        500..=599 => {
            tracing::error!(
                method = %method,
                path = %path,
                request_id = %request_id,
                status_code = status_code,
                duration_ms = duration_ms,
                "Server error"
            );
        }
        _ => {
            tracing::info!(
                method = %method,
                path = %path,
                request_id = %request_id,
                status_code = status_code,
                duration_ms = duration_ms,
                "Request completed"
            );
        }
    }
}

/// Log error with context
pub fn log_error<E: std::fmt::Display>(
    error: &E,
    context: &str,
    request_id: Option<&str>,
) {
    if let Some(id) = request_id {
        tracing::error!(
            error = %error,
            context = %context,
            request_id = %id,
            "Error occurred"
        );
    } else {
        tracing::error!(
            error = %error,
            context = %context,
            "Error occurred"
        );
    }
}

/// Structured logging for application events
pub mod events {
    /// Log application startup
    pub fn app_starting(name: &str, version: &str, environment: &str) {
        tracing::info!(
            app_name = %name,
            version = %version,
            environment = %environment,
            event = "app_starting",
            "Application starting"
        );
    }

    /// Log application ready
    pub fn app_ready(name: &str, bind_address: &str) {
        tracing::info!(
            app_name = %name,
            bind_address = %bind_address,
            event = "app_ready",
            "Application ready to accept requests"
        );
    }

    /// Log application shutdown
    pub fn app_stopping(name: &str, reason: Option<&str>) {
        tracing::info!(
            app_name = %name,
            reason = reason.unwrap_or("normal"),
            event = "app_stopping",
            "Application shutting down"
        );
    }

    /// Log database connection established
    pub fn database_connected(database_url: &str) {
        // Mask sensitive parts of the URL
        let masked_url = mask_database_url(database_url);
        tracing::info!(
            database_url = %masked_url,
            event = "database_connected",
            "Database connection established"
        );
    }

    /// Log authentication success
    pub fn auth_success(user_id: &str, method: &str) {
        tracing::info!(
            user_id = %user_id,
            auth_method = %method,
            event = "auth_success",
            "User authenticated successfully"
        );
    }

    /// Log authentication failure
    pub fn auth_failure(username: Option<&str>, method: &str, reason: &str) {
        tracing::warn!(
            username = username.unwrap_or("unknown"),
            auth_method = %method,
            reason = %reason,
            event = "auth_failure",
            "Authentication failed"
        );
    }

    /// Log API rate limit exceeded
    pub fn rate_limit_exceeded(client_id: &str, endpoint: &str) {
        tracing::warn!(
            client_id = %client_id,
            endpoint = %endpoint,
            event = "rate_limit_exceeded",
            "Rate limit exceeded"
        );
    }

    /// Log webhook received
    pub fn webhook_received(source: &str, event_type: &str) {
        tracing::info!(
            source = %source,
            event_type = %event_type,
            event = "webhook_received",
            "Webhook received"
        );
    }

    /// Log message sent
    pub fn message_sent(recipient: &str, message_type: &str) {
        tracing::info!(
            recipient = %recipient,
            message_type = %message_type,
            event = "message_sent",
            "Message sent successfully"
        );
    }

    /// Log flow execution
    pub fn flow_executed(flow_id: &str, trigger: &str, duration_ms: u128) {
        tracing::info!(
            flow_id = %flow_id,
            trigger = %trigger,
            duration_ms = duration_ms,
            event = "flow_executed",
            "Flow executed successfully"
        );
    }
}

/// Helper function to mask sensitive parts of database URL
fn mask_database_url(url: &str) -> String {
    if let Ok(parsed) = url::Url::parse(url) {
        let username = parsed.username();
        let host = parsed.host_str().unwrap_or("unknown");
        let path = parsed.path();
        format!("{}://{}@{}{}", parsed.scheme(), username, host, path)
    } else {
        "invalid_url".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_database_url() {
        let url = "postgres://user:password@localhost:5432/database";
        let masked = mask_database_url(url);
        assert_eq!(masked, "postgres://user@localhost/database");
        assert!(!masked.contains("password"));
    }

    #[test]
    fn test_mask_invalid_url() {
        let url = "not a valid url";
        let masked = mask_database_url(url);
        assert_eq!(masked, "invalid_url");
    }
}