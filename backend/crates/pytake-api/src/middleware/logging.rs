use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
    time::Instant,
};
use tracing::Span;

use crate::{http_span, logging};

/// Middleware for structured request/response logging
pub struct LoggingMiddleware;

impl<S, B> Transform<S, ServiceRequest> for LoggingMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = LoggingMiddlewareService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(LoggingMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

pub struct LoggingMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for LoggingMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let start_time = Instant::now();
        let method = req.method().to_string();
        let path = req.path().to_string();
        let query_string = req.query_string();
        let full_path = if query_string.is_empty() {
            path.clone()
        } else {
            format!("{}?{}", path, query_string)
        };

        // Get request ID from headers (set by request_id middleware)
        let request_id = req
            .headers()
            .get("x-request-id")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("unknown")
            .to_string();

        // Get remote address
        let remote_addr = req
            .connection_info()
            .realip_remote_addr()
            .map(|s| s.to_string());

        // Create a span for this request
        let span = http_span!(&method, &full_path, &request_id);
        let _entered = span.enter();

        // Log the incoming request
        logging::log_request(&method, &full_path, &request_id, remote_addr.as_deref());

        // Clone values for the async block
        let method_clone = method.clone();
        let path_clone = full_path.clone();
        let request_id_clone = request_id.clone();

        let service = Rc::clone(&self.service);

        Box::pin(async move {
            // Call the service
            let response = service.call(req).await;

            // Calculate duration
            let duration_ms = start_time.elapsed().as_millis();

            // Log the response
            match &response {
                Ok(res) => {
                    let status = res.status().as_u16();
                    
                    // Record span fields
                    Span::current().record("status_code", &status);
                    Span::current().record("response_time_ms", &duration_ms);

                    // Log the response
                    logging::log_response(
                        &method_clone,
                        &path_clone,
                        &request_id_clone,
                        status,
                        duration_ms,
                    );
                }
                Err(err) => {
                    // Record error in span
                    Span::current().record("error", &err.to_string());
                    Span::current().record("response_time_ms", &duration_ms);

                    // Log the error
                    logging::log_error(
                        err,
                        "Request processing failed",
                        Some(&request_id_clone),
                    );
                }
            }

            response
        })
    }
}

/// Factory function to create the logging middleware
pub fn logging_middleware() -> LoggingMiddleware {
    LoggingMiddleware
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};

    #[actix_web::test]
    async fn test_logging_middleware() {
        // Create test app with logging middleware
        let app = test::init_service(
            App::new()
                .wrap(logging_middleware())
                .route("/test", web::get().to(|| async { HttpResponse::Ok().finish() })),
        )
        .await;

        // Make a test request
        let req = test::TestRequest::get()
            .uri("/test")
            .insert_header(("x-request-id", "test-123"))
            .to_request();

        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}