use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use futures_util::future::LocalBoxFuture;
use std::{
    future::{ready, Ready},
    rc::Rc,
};
use uuid::Uuid;

/// Middleware to add a unique request ID to each request
pub struct RequestId;

impl<S, B> Transform<S, ServiceRequest> for RequestId
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type InitError = ();
    type Transform = RequestIdMiddleware<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequestIdMiddleware {
            service: Rc::new(service),
        }))
    }
}

pub struct RequestIdMiddleware<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for RequestIdMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        let service = self.service.clone();

        Box::pin(async move {
            // Generate a unique request ID
            let request_id = Uuid::new_v4().to_string();

            // Add the request ID to the request extensions
            req.extensions_mut().insert(RequestIdValue(request_id.clone()));

            // Set the request ID in the response headers
            let mut res = service.call(req).await?;
            res.headers_mut().insert(
                actix_web::http::header::HeaderName::from_static("x-request-id"),
                actix_web::http::header::HeaderValue::from_str(&request_id).unwrap(),
            );

            Ok(res)
        })
    }
}

/// Wrapper type for the request ID value
#[derive(Debug, Clone)]
pub struct RequestIdValue(pub String);

impl RequestIdValue {
    pub fn get(&self) -> &str {
        &self.0
    }
}

/// Helper function to extract request ID from request extensions
pub fn get_request_id(req: &ServiceRequest) -> Option<String> {
    req.extensions()
        .get::<RequestIdValue>()
        .map(|id| id.0.clone())
}

/// Helper function to extract request ID from HTTP request
pub fn extract_request_id(req: &actix_web::HttpRequest) -> Option<String> {
    req.extensions()
        .get::<RequestIdValue>()
        .map(|id| id.0.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};

    async fn test_handler(req: actix_web::HttpRequest) -> HttpResponse {
        let request_id = extract_request_id(&req);
        HttpResponse::Ok().json(serde_json::json!({
            "request_id": request_id
        }))
    }

    #[actix_web::test]
    async fn test_request_id_middleware() {
        let app = test::init_service(
            App::new()
                .wrap(RequestId)
                .route("/test", web::get().to(test_handler)),
        )
        .await;

        let req = test::TestRequest::get().uri("/test").to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
        assert!(resp.headers().get("x-request-id").is_some());
    }
}