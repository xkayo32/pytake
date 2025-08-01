//! Authentication middleware for protecting routes
//!
//! This middleware validates JWT tokens and ensures users have the required
//! permissions to access protected endpoints.

use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    error::ErrorUnauthorized,
    http::header,
    Error, HttpMessage,
};
use futures_util::future::{ready, LocalBoxFuture, Ready};
use pytake_core::auth::{AuthContext, Permission, Role};
use std::rc::Rc;

use crate::state::AppState;

/// Authentication middleware that validates JWT tokens
pub struct AuthMiddleware;

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = AuthMiddlewareService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddlewareService {
            service: Rc::new(service),
        }))
    }
}

pub struct AuthMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
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
        let service = Rc::clone(&self.service);

        Box::pin(async move {
            // Extract authorization header
            let auth_header = req
                .headers()
                .get(header::AUTHORIZATION)
                .and_then(|h| h.to_str().ok());

            let token = match auth_header {
                Some(auth) if auth.starts_with("Bearer ") => &auth[7..],
                _ => return Err(ErrorUnauthorized("Missing or invalid authorization header")),
            };

            // Get app state
            let app_state = req
                .app_data::<actix_web::web::Data<AppState>>()
                .ok_or_else(|| ErrorUnauthorized("Internal server error"))?;

            // Validate token and get auth context
            let auth_context = match app_state.auth_service().get_context(token).await {
                Ok(context) => context,
                Err(_) => return Err(ErrorUnauthorized("Invalid or expired token")),
            };

            // Store auth context in request extensions
            req.extensions_mut().insert(auth_context);

            // Continue with the request
            service.call(req).await
        })
    }
}

/// Permission guard that checks if the user has required permissions
pub struct RequirePermission {
    permission: Permission,
}

impl RequirePermission {
    pub fn new(permission: Permission) -> Self {
        Self { permission }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequirePermission
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = RequirePermissionService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequirePermissionService {
            service: Rc::new(service),
            permission: self.permission.clone(),
        }))
    }
}

pub struct RequirePermissionService<S> {
    service: Rc<S>,
    permission: Permission,
}

impl<S, B> Service<ServiceRequest> for RequirePermissionService<S>
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
        let service = Rc::clone(&self.service);
        let permission = self.permission.clone();

        Box::pin(async move {
            // Get auth context from request extensions
            let auth_context = req
                .extensions()
                .get::<AuthContext>()
                .ok_or_else(|| ErrorUnauthorized("Authentication required"))?;

            // Check permission
            if !auth_context.has_permission(&permission) {
                return Err(ErrorUnauthorized("Insufficient permissions"));
            }

            // Continue with the request
            service.call(req).await
        })
    }
}

/// Role guard that checks if the user has required role
pub struct RequireRole {
    roles: Vec<Role>,
}

impl RequireRole {
    pub fn new(role: Role) -> Self {
        Self { roles: vec![role] }
    }

    pub fn any(roles: Vec<Role>) -> Self {
        Self { roles }
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequireRole
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = RequireRoleService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequireRoleService {
            service: Rc::new(service),
            roles: self.roles.clone(),
        }))
    }
}

pub struct RequireRoleService<S> {
    service: Rc<S>,
    roles: Vec<Role>,
}

impl<S, B> Service<ServiceRequest> for RequireRoleService<S>
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
        let service = Rc::clone(&self.service);
        let required_roles = self.roles.clone();

        Box::pin(async move {
            // Get auth context from request extensions
            let auth_context = req
                .extensions()
                .get::<AuthContext>()
                .ok_or_else(|| ErrorUnauthorized("Authentication required"))?;

            // Check if user has any of the required roles
            let has_role = required_roles
                .iter()
                .any(|role| auth_context.has_role(role));

            if !has_role {
                return Err(ErrorUnauthorized("Insufficient role"));
            }

            // Continue with the request
            service.call(req).await
        })
    }
}

/// Extract auth context from request
pub struct AuthUser(pub AuthContext);

impl actix_web::FromRequest for AuthUser {
    type Error = Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(
        req: &actix_web::HttpRequest,
        _payload: &mut actix_web::dev::Payload,
    ) -> Self::Future {
        let auth_context = req
            .extensions()
            .get::<AuthContext>()
            .cloned()
            .ok_or_else(|| ErrorUnauthorized("Authentication required"));

        ready(auth_context.map(AuthUser))
    }
}

/// Helper functions for creating middleware
pub fn auth_middleware() -> AuthMiddleware {
    AuthMiddleware
}

pub fn require_permission(permission: Permission) -> RequirePermission {
    RequirePermission::new(permission)
}

pub fn require_role(role: Role) -> RequireRole {
    RequireRole::new(role)
}

pub fn require_any_role(roles: Vec<Role>) -> RequireRole {
    RequireRole::any(roles)
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, web, App, HttpResponse};
    use pytake_core::auth::{TokenConfig, TokenGenerator};

    async fn protected_endpoint(_user: AuthUser) -> HttpResponse {
        HttpResponse::Ok().json(serde_json::json!({
            "message": "Protected endpoint accessed"
        }))
    }

    #[actix_web::test]
    async fn test_auth_middleware_missing_header() {
        let app = test::init_service(
            App::new()
                .wrap(auth_middleware())
                .route("/protected", web::get().to(protected_endpoint)),
        )
        .await;

        let req = test::TestRequest::get().uri("/protected").to_request();
        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), 401);
    }

    #[actix_web::test]
    async fn test_auth_middleware_invalid_token() {
        let app = test::init_service(
            App::new()
                .wrap(auth_middleware())
                .route("/protected", web::get().to(protected_endpoint)),
        )
        .await;

        let req = test::TestRequest::get()
            .uri("/protected")
            .insert_header(("Authorization", "Bearer invalid-token"))
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), 401);
    }
}