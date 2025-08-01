//! JWT token generation and validation
//!
//! This module provides JWT token functionality for authentication
//! and authorization in the PyTake system.

use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{
    decode, encode, errors::Error as JwtError, Algorithm, DecodingKey, EncodingKey, Header,
    TokenData, Validation,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use uuid::Uuid;

/// JWT token configuration
#[derive(Debug, Clone)]
pub struct TokenConfig {
    /// Secret key for signing tokens
    pub secret: String,
    
    /// Token issuer
    pub issuer: String,
    
    /// Token audience
    pub audience: String,
    
    /// Access token expiration duration (default: 15 minutes)
    pub access_token_duration: Duration,
    
    /// Refresh token expiration duration (default: 7 days)
    pub refresh_token_duration: Duration,
    
    /// Algorithm for signing tokens (default: HS256)
    pub algorithm: Algorithm,
}

impl Default for TokenConfig {
    fn default() -> Self {
        Self {
            secret: "change-this-secret-in-production".to_string(),
            issuer: "pytake".to_string(),
            audience: "pytake-api".to_string(),
            access_token_duration: Duration::minutes(15),
            refresh_token_duration: Duration::days(7),
            algorithm: Algorithm::HS256,
        }
    }
}

/// JWT claims
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// Subject (user ID)
    pub sub: String,
    
    /// Issued at
    pub iat: i64,
    
    /// Expiration time
    pub exp: i64,
    
    /// Not before
    pub nbf: i64,
    
    /// Issuer
    pub iss: String,
    
    /// Audience
    pub aud: String,
    
    /// JWT ID
    pub jti: String,
    
    /// Token type (access or refresh)
    pub token_type: TokenType,
    
    /// User email
    pub email: String,
    
    /// User roles
    pub roles: Vec<String>,
    
    /// Custom claims
    #[serde(flatten)]
    pub custom: serde_json::Value,
}

/// Token type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TokenType {
    Access,
    Refresh,
}

/// Token generator
pub struct TokenGenerator {
    config: TokenConfig,
    encoding_key: EncodingKey,
}

impl TokenGenerator {
    /// Create a new token generator
    pub fn new(config: TokenConfig) -> Self {
        let encoding_key = EncodingKey::from_secret(config.secret.as_bytes());
        Self {
            config,
            encoding_key,
        }
    }
    
    /// Generate an access token
    pub fn generate_access_token(
        &self,
        user_id: &str,
        email: &str,
        roles: Vec<String>,
    ) -> Result<String, TokenError> {
        let now = Utc::now();
        let exp = now + self.config.access_token_duration;
        
        let claims = Claims {
            sub: user_id.to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
            nbf: now.timestamp(),
            iss: self.config.issuer.clone(),
            aud: self.config.audience.clone(),
            jti: Uuid::new_v4().to_string(),
            token_type: TokenType::Access,
            email: email.to_string(),
            roles,
            custom: serde_json::Value::Null,
        };
        
        self.encode_token(&claims)
    }
    
    /// Generate a refresh token
    pub fn generate_refresh_token(
        &self,
        user_id: &str,
        email: &str,
    ) -> Result<String, TokenError> {
        let now = Utc::now();
        let exp = now + self.config.refresh_token_duration;
        
        let claims = Claims {
            sub: user_id.to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
            nbf: now.timestamp(),
            iss: self.config.issuer.clone(),
            aud: self.config.audience.clone(),
            jti: Uuid::new_v4().to_string(),
            token_type: TokenType::Refresh,
            email: email.to_string(),
            roles: vec![],
            custom: serde_json::Value::Null,
        };
        
        self.encode_token(&claims)
    }
    
    /// Generate both access and refresh tokens
    pub fn generate_token_pair(
        &self,
        user_id: &str,
        email: &str,
        roles: Vec<String>,
    ) -> Result<(String, String), TokenError> {
        let access_token = self.generate_access_token(user_id, email, roles)?;
        let refresh_token = self.generate_refresh_token(user_id, email)?;
        Ok((access_token, refresh_token))
    }
    
    /// Encode token with claims
    fn encode_token(&self, claims: &Claims) -> Result<String, TokenError> {
        let header = Header::new(self.config.algorithm);
        encode(&header, claims, &self.encoding_key)
            .map_err(|e| TokenError::EncodingFailed(e.to_string()))
    }
}

/// Token validator
pub struct TokenValidator {
    config: TokenConfig,
    decoding_key: DecodingKey,
    validation: Validation,
}

impl TokenValidator {
    /// Create a new token validator
    pub fn new(config: TokenConfig) -> Self {
        let decoding_key = DecodingKey::from_secret(config.secret.as_bytes());
        
        let mut validation = Validation::new(config.algorithm);
        validation.set_issuer(&[config.issuer.clone()]);
        validation.set_audience(&[config.audience.clone()]);
        validation.validate_exp = true;
        validation.validate_nbf = true;
        
        Self {
            config,
            decoding_key,
            validation,
        }
    }
    
    /// Validate and decode a token
    pub fn validate_token(&self, token: &str) -> Result<Claims, TokenError> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &self.validation)
            .map_err(|e| match e.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => TokenError::Expired,
                jsonwebtoken::errors::ErrorKind::InvalidToken => TokenError::Invalid,
                jsonwebtoken::errors::ErrorKind::InvalidSignature => TokenError::InvalidSignature,
                _ => TokenError::DecodingFailed(e.to_string()),
            })?;
        
        Ok(token_data.claims)
    }
    
    /// Validate an access token
    pub fn validate_access_token(&self, token: &str) -> Result<Claims, TokenError> {
        let claims = self.validate_token(token)?;
        
        if claims.token_type != TokenType::Access {
            return Err(TokenError::WrongTokenType);
        }
        
        Ok(claims)
    }
    
    /// Validate a refresh token
    pub fn validate_refresh_token(&self, token: &str) -> Result<Claims, TokenError> {
        let claims = self.validate_token(token)?;
        
        if claims.token_type != TokenType::Refresh {
            return Err(TokenError::WrongTokenType);
        }
        
        Ok(claims)
    }
    
    /// Check if a token is expired
    pub fn is_expired(&self, token: &str) -> bool {
        match self.validate_token(token) {
            Ok(claims) => {
                let exp = DateTime::<Utc>::from_timestamp(claims.exp, 0)
                    .unwrap_or_else(|| Utc::now());
                exp < Utc::now()
            }
            Err(_) => true,
        }
    }
}

/// Token-related errors
#[derive(Debug, thiserror::Error)]
pub enum TokenError {
    #[error("Token encoding failed: {0}")]
    EncodingFailed(String),
    
    #[error("Token decoding failed: {0}")]
    DecodingFailed(String),
    
    #[error("Token has expired")]
    Expired,
    
    #[error("Invalid token")]
    Invalid,
    
    #[error("Invalid token signature")]
    InvalidSignature,
    
    #[error("Wrong token type")]
    WrongTokenType,
    
    #[error("Token not found")]
    NotFound,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_config() -> TokenConfig {
        TokenConfig {
            secret: "test-secret-key".to_string(),
            issuer: "test-issuer".to_string(),
            audience: "test-audience".to_string(),
            access_token_duration: Duration::minutes(15),
            refresh_token_duration: Duration::days(7),
            algorithm: Algorithm::HS256,
        }
    }
    
    #[test]
    fn test_generate_access_token() {
        let config = create_test_config();
        let generator = TokenGenerator::new(config);
        
        let token = generator
            .generate_access_token("user123", "user@example.com", vec!["admin".to_string()])
            .unwrap();
        
        assert!(!token.is_empty());
    }
    
    #[test]
    fn test_validate_access_token() {
        let config = create_test_config();
        let generator = TokenGenerator::new(config.clone());
        let validator = TokenValidator::new(config);
        
        let token = generator
            .generate_access_token("user123", "user@example.com", vec!["admin".to_string()])
            .unwrap();
        
        let claims = validator.validate_access_token(&token).unwrap();
        assert_eq!(claims.sub, "user123");
        assert_eq!(claims.email, "user@example.com");
        assert_eq!(claims.roles, vec!["admin"]);
        assert_eq!(claims.token_type, TokenType::Access);
    }
    
    #[test]
    fn test_expired_token() {
        let mut config = create_test_config();
        config.access_token_duration = Duration::seconds(-1); // Already expired
        
        let generator = TokenGenerator::new(config.clone());
        let validator = TokenValidator::new(config);
        
        let token = generator
            .generate_access_token("user123", "user@example.com", vec![])
            .unwrap();
        
        assert!(validator.validate_access_token(&token).is_err());
        assert!(validator.is_expired(&token));
    }
    
    #[test]
    fn test_wrong_token_type() {
        let config = create_test_config();
        let generator = TokenGenerator::new(config.clone());
        let validator = TokenValidator::new(config);
        
        let refresh_token = generator
            .generate_refresh_token("user123", "user@example.com")
            .unwrap();
        
        // Try to validate refresh token as access token
        assert!(validator.validate_access_token(&refresh_token).is_err());
    }
}