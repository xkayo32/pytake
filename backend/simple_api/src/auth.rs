use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey, Algorithm};

// Temporary in-memory user storage (would be database in production)
type UserStore = Arc<Mutex<HashMap<String, User>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
    pub password_hash: String,
    pub role: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user id
    pub email: String,
    pub name: String,
    pub role: String,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

// JWT secret (in production, this should be from environment)
const JWT_SECRET: &str = "your-secret-key-change-this-in-production";

#[derive(Clone)]
pub struct AuthService {
    users: UserStore,
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl AuthService {
    pub fn new() -> Self {
        let users = Arc::new(Mutex::new(HashMap::new()));
        let encoding_key = EncodingKey::from_secret(JWT_SECRET.as_ref());
        let decoding_key = DecodingKey::from_secret(JWT_SECRET.as_ref());
        
        // Add demo users for development
        let mut user_map = users.lock().unwrap();
        
        // Admin user
        user_map.insert(
            "admin@pytake.com".to_string(),
            User {
                id: "user_001".to_string(),
                email: "admin@pytake.com".to_string(),
                name: "Admin User".to_string(),
                password_hash: "admin123".to_string(), // In production, this should be hashed
                role: "admin".to_string(),
                created_at: Utc::now().to_rfc3339(),
            }
        );
        
        // Supervisor user
        user_map.insert(
            "supervisor@pytake.com".to_string(),
            User {
                id: "user_002".to_string(),
                email: "supervisor@pytake.com".to_string(),
                name: "Supervisor User".to_string(),
                password_hash: "supervisor123".to_string(),
                role: "supervisor".to_string(),
                created_at: Utc::now().to_rfc3339(),
            }
        );
        
        // Agent user
        user_map.insert(
            "agent@pytake.com".to_string(),
            User {
                id: "user_003".to_string(),
                email: "agent@pytake.com".to_string(),
                name: "Agent User".to_string(),
                password_hash: "agent123".to_string(),
                role: "agent".to_string(),
                created_at: Utc::now().to_rfc3339(),
            }
        );
        
        // Viewer user
        user_map.insert(
            "viewer@pytake.com".to_string(),
            User {
                id: "user_004".to_string(),
                email: "viewer@pytake.com".to_string(),
                name: "Viewer User".to_string(),
                password_hash: "viewer123".to_string(),
                role: "viewer".to_string(),
                created_at: Utc::now().to_rfc3339(),
            }
        );
        
        drop(user_map);
        
        Self {
            users,
            encoding_key,
            decoding_key,
        }
    }
    
    fn hash_password(&self, password: &str) -> String {
        // In production, use proper password hashing like argon2
        format!("hashed_{}", password)
    }
    
    fn verify_password(&self, password: &str, hash: &str) -> bool {
        // Simple comparison for demo - use proper verification in production
        hash == &self.hash_password(password) || hash == password
    }
    
    fn generate_token(&self, user: &User) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let expires_at = now + Duration::hours(24);
        
        let claims = Claims {
            sub: user.id.clone(),
            email: user.email.clone(),
            name: user.name.clone(),
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
    
    pub fn register(&self, email: String, password: String, name: String) -> Result<AuthResponse, String> {
        let mut users = self.users.lock().unwrap();
        
        // Check if user already exists
        if users.contains_key(&email) {
            return Err("User already exists".to_string());
        }
        
        // Create new user
        let user = User {
            id: format!("user_{}", uuid::Uuid::new_v4().to_string().replace("-", "")),
            email: email.clone(),
            name,
            password_hash: self.hash_password(&password),
            role: "agent".to_string(),
            created_at: Utc::now().to_rfc3339(),
        };
        
        // Generate token
        let token = self.generate_token(&user).map_err(|e| e.to_string())?;
        let refresh_token = format!("refresh_{}", uuid::Uuid::new_v4());
        
        let response = AuthResponse {
            access_token: token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in: 86400, // 24 hours
            user: UserInfo {
                id: user.id.clone(),
                email: user.email.clone(),
                name: user.name.clone(),
                role: user.role.clone(),
            },
        };
        
        // Store user
        users.insert(email, user);
        
        Ok(response)
    }
    
    pub fn login(&self, email: String, password: String) -> Result<AuthResponse, String> {
        let users = self.users.lock().unwrap();
        
        let user = users.get(&email).ok_or("Invalid credentials")?;
        
        if !self.verify_password(&password, &user.password_hash) {
            return Err("Invalid credentials".to_string());
        }
        
        // Generate token
        let token = self.generate_token(user).map_err(|e| e.to_string())?;
        let refresh_token = format!("refresh_{}", uuid::Uuid::new_v4());
        
        Ok(AuthResponse {
            access_token: token,
            refresh_token,
            token_type: "Bearer".to_string(),
            expires_in: 86400, // 24 hours
            user: UserInfo {
                id: user.id.clone(),
                email: user.email.clone(),
                name: user.name.clone(),
                role: user.role.clone(),
            },
        })
    }
    
    pub fn get_current_user(&self, token: &str) -> Result<UserInfo, String> {
        let claims = self.validate_token(token).map_err(|e| e.to_string())?;
        
        Ok(UserInfo {
            id: claims.sub,
            email: claims.email,
            name: claims.name,
            role: claims.role,
        })
    }
}

// HTTP Handlers
pub async fn login(
    auth_service: web::Data<AuthService>,
    request: web::Json<LoginRequest>,
) -> Result<HttpResponse> {
    tracing::info!("Login attempt for email: {}", request.email);
    
    match auth_service.login(request.email.clone(), request.password.clone()) {
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

pub async fn register(
    auth_service: web::Data<AuthService>,
    request: web::Json<RegisterRequest>,
) -> Result<HttpResponse> {
    tracing::info!("Registration attempt for email: {}", request.email);
    
    match auth_service.register(
        request.email.clone(),
        request.password.clone(),
        request.name.clone(),
    ) {
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

pub async fn me(
    auth_service: web::Data<AuthService>,
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
    
    match auth_service.get_current_user(token) {
        Ok(user) => Ok(HttpResponse::Ok().json(user)),
        Err(error) => Ok(HttpResponse::Unauthorized().json(json!({
            "error": error,
            "message": "Invalid token"
        })))
    }
}

pub async fn logout() -> Result<HttpResponse> {
    // In a real implementation, we would invalidate the token
    tracing::info!("User logged out");
    Ok(HttpResponse::Ok().json(json!({
        "message": "Logged out successfully"
    })))
}