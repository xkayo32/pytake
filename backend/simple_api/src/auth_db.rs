use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey, Algorithm};
use sea_orm::DatabaseConnection;
use crate::database::{find_user_by_email, create_user, DbUser};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user id
    pub email: String,
    pub name: String,
    pub role: String,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

// JWT secret (in production, this should be from environment)
const JWT_SECRET: &str = "your-secret-key-change-this-in-production";

#[derive(Clone)]
pub struct AuthServiceDb {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl AuthServiceDb {
    pub fn new() -> Self {
        let encoding_key = EncodingKey::from_secret(JWT_SECRET.as_ref());
        let decoding_key = DecodingKey::from_secret(JWT_SECRET.as_ref());
        
        Self {
            encoding_key,
            decoding_key,
        }
    }
    
    fn hash_password(&self, password: &str) -> String {
        // Simple hash for demo - use proper password hashing in production
        format!("hashed_{}", password)
    }
    
    fn verify_password(&self, password: &str, hash: &str) -> bool {
        // Simple comparison for demo - use proper verification in production
        hash == &self.hash_password(password) || hash == password
    }
    
    fn generate_token(&self, user: &DbUser) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let expires_at = now + Duration::hours(24);
        
        let claims = Claims {
            sub: user.id.to_string(),
            email: user.email.clone(),
            name: user.full_name.clone().unwrap_or_else(|| "Unknown".to_string()),
            role: user.role.clone(),
            exp: expires_at.timestamp(),
            iat: now.timestamp(),
        };
        
        encode(&Header::default(), &claims, &self.encoding_key)
    }
    
    pub fn validate_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let validation = Validation::new(Algorithm::HS256);
        let token_data = decode::<Claims>(token, &self.decoding_key, &validation)?;
        Ok(token_data.claims)
    }
    
    pub async fn register(
        &self,
        db: &DatabaseConnection,
        email: String,
        password: String,
        name: String,
    ) -> Result<AuthResponse, String> {
        // Check if user already exists
        if let Ok(Some(_)) = find_user_by_email(db, &email).await {
            return Err("User already exists".to_string());
        }
        
        // Create new user
        let password_hash = self.hash_password(&password);
        let user = create_user(db, &email, &password_hash, &name, "agent")
            .await
            .map_err(|e| format!("Database error: {}", e))?;
        
        // Generate token
        let token = self.generate_token(&user).map_err(|e| e.to_string())?;
        let refresh_token = format!("refresh_{}", uuid::Uuid::new_v4());
        
        Ok(AuthResponse {
            access_token: token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in: 86400, // 24 hours
            user: UserInfo {
                id: user.id.to_string(),
                email: user.email,
                name: user.full_name.unwrap_or_else(|| "Unknown".to_string()),
                role: user.role,
            },
        })
    }
    
    pub async fn login(
        &self,
        db: &DatabaseConnection,
        email: String,
        password: String,
    ) -> Result<AuthResponse, String> {
        let user = find_user_by_email(db, &email)
            .await
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or("Invalid credentials")?;
        
        if !self.verify_password(&password, &user.password_hash) {
            return Err("Invalid credentials".to_string());
        }
        
        // Generate token
        let token = self.generate_token(&user).map_err(|e| e.to_string())?;
        let refresh_token = format!("refresh_{}", uuid::Uuid::new_v4());
        
        Ok(AuthResponse {
            access_token: token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in: 86400, // 24 hours
            user: UserInfo {
                id: user.id.to_string(),
                email: user.email,
                name: user.full_name.unwrap_or_else(|| "Unknown".to_string()),
                role: user.role,
            },
        })
    }
    
    pub async fn get_current_user(
        &self,
        db: &DatabaseConnection,
        token: &str,
    ) -> Result<UserInfo, String> {
        let claims = self.validate_token(token).map_err(|e| e.to_string())?;
        
        let user = find_user_by_email(db, &claims.email)
            .await
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or("User not found")?;
        
        Ok(UserInfo {
            id: user.id.to_string(),
            email: user.email,
            name: user.full_name.unwrap_or_else(|| "Unknown".to_string()),
            role: user.role,
        })
    }
}

// HTTP Handlers
pub async fn login_db(
    auth_service: web::Data<AuthServiceDb>,
    db: web::Data<DatabaseConnection>,
    request: web::Json<LoginRequest>,
) -> Result<HttpResponse> {
    tracing::info!("Login attempt for email: {}", request.email);
    
    match auth_service.login(&db, request.email.clone(), request.password.clone()).await {
        Ok(response) => {
            tracing::info!("Login successful for email: {}", request.email);
            Ok(HttpResponse::Ok().json(response))
        }
        Err(error) => {
            tracing::warn!("Login failed for email: {} - {}", request.email, error);
            Ok(HttpResponse::Unauthorized().json(json!({
                "error": error,
                "message": "Authentication failed"
            })))
        }
    }
}

pub async fn register_db(
    auth_service: web::Data<AuthServiceDb>,
    db: web::Data<DatabaseConnection>,
    request: web::Json<RegisterRequest>,
) -> Result<HttpResponse> {
    tracing::info!("Registration attempt for email: {}", request.email);
    
    match auth_service.register(
        &db,
        request.email.clone(),
        request.password.clone(),
        request.name.clone(),
    ).await {
        Ok(response) => {
            tracing::info!("Registration successful for email: {}", request.email);
            Ok(HttpResponse::Created().json(response))
        }
        Err(error) => {
            tracing::warn!("Registration failed for email: {} - {}", request.email, error);
            Ok(HttpResponse::BadRequest().json(json!({
                "error": error,
                "message": "Registration failed"
            })))
        }
    }
}

pub async fn me_db(
    auth_service: web::Data<AuthServiceDb>,
    db: web::Data<DatabaseConnection>,
    req: actix_web::HttpRequest,
) -> Result<HttpResponse> {
    // Extract token from Authorization header
    let auth_header = req.headers().get("Authorization");
    
    let token = match auth_header {
        Some(header) => {
            let header_str = header.to_str().unwrap_or("");
            if header_str.starts_with("Bearer ") {
                &header_str[7..]
            } else {
                return Ok(HttpResponse::Unauthorized().json(json!({
                    "error": "Invalid authorization header format"
                })));
            }
        }
        None => {
            return Ok(HttpResponse::Unauthorized().json(json!({
                "error": "Authorization header missing"
            })));
        }
    };
    
    match auth_service.get_current_user(&db, token).await {
        Ok(user) => Ok(HttpResponse::Ok().json(user)),
        Err(error) => Ok(HttpResponse::Unauthorized().json(json!({
            "error": error,
            "message": "Invalid token"
        })))
    }
}

pub async fn logout_db() -> Result<HttpResponse> {
    // In a real implementation, we would invalidate the token
    tracing::info!("User logged out");
    Ok(HttpResponse::Ok().json(json!({
        "message": "Logged out successfully"
    })))
}