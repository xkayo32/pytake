use serde::{Deserialize, Serialize};
use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web_httpauth::extractors::bearer::{BearerAuth, Config};
use actix_web_httpauth::extractors::AuthenticationError;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation};
use std::future::{ready, Ready};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // Subject (user id)
    pub email: String,    // User email
    pub tenant_id: String, // Tenant ID for multi-tenancy
    pub exp: usize,       // Expiration time
    pub iat: usize,       // Issued at
}

impl Claims {
    pub fn new(user_id: String, email: String, tenant_id: String) -> Self {
        let now = chrono::Utc::now();
        let exp = (now + chrono::Duration::hours(24)).timestamp() as usize;
        let iat = now.timestamp() as usize;

        Self {
            sub: user_id,
            email,
            tenant_id,
            exp,
            iat,
        }
    }
}

pub fn create_jwt(claims: &Claims) -> Result<String, jsonwebtoken::errors::Error> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let encoding_key = EncodingKey::from_secret(secret.as_ref());
    
    encode(&Header::default(), claims, &encoding_key)
}

pub fn verify_jwt(token: &str) -> Result<TokenData<Claims>, jsonwebtoken::errors::Error> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string());
    let decoding_key = DecodingKey::from_secret(secret.as_ref());
    let validation = Validation::default();
    
    decode::<Claims>(token, &decoding_key, &validation)
}

pub async fn jwt_validator(
    req: ServiceRequest,
    credentials: BearerAuth,
) -> Result<ServiceRequest, (Error, ServiceRequest)> {
    let token = credentials.token();
    
    match verify_jwt(token) {
        Ok(token_data) => {
            req.extensions_mut().insert(token_data.claims);
            Ok(req)
        }
        Err(_) => {
            let config = req
                .app_data::<Config>()
                .cloned()
                .unwrap_or_default();
            
            Err((AuthenticationError::from(config).into(), req))
        }
    }
}

// Middleware para extração de claims
use actix_web::{FromRequest, HttpRequest};
use std::pin::Pin;

impl FromRequest for Claims {
    type Error = actix_web::Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut actix_web::dev::Payload) -> Self::Future {
        if let Some(claims) = req.extensions().get::<Claims>() {
            ready(Ok(claims.clone()))
        } else {
            ready(Err(actix_web::error::ErrorUnauthorized("No valid token")))
        }
    }
}