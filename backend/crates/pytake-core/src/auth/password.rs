//! Password hashing and verification using Argon2
//!
//! This module provides secure password hashing and verification
//! using the Argon2id algorithm, which is the recommended choice
//! for password hashing.

use argon2::{
    password_hash::{
        rand_core::OsRng, PasswordHash, PasswordHasher as _, PasswordVerifier as _,
        SaltString, Error as Argon2Error,
    },
    Argon2, Algorithm, Params, Version,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use zeroize::Zeroize;

/// Password hashing configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasswordConfig {
    /// Memory cost in KiB (default: 65536 = 64 MiB)
    pub memory_cost: u32,
    
    /// Number of iterations (default: 3)
    pub time_cost: u32,
    
    /// Degree of parallelism (default: 4)
    pub parallelism: u32,
    
    /// Output hash length (default: 32)
    pub output_length: Option<usize>,
}

impl Default for PasswordConfig {
    fn default() -> Self {
        Self {
            memory_cost: 65536,  // 64 MiB
            time_cost: 3,
            parallelism: 4,
            output_length: Some(32),
        }
    }
}

/// Password hasher using Argon2id
#[derive(Clone)]
pub struct PasswordHasher {
    argon2: Arc<Argon2<'static>>,
}

impl PasswordHasher {
    /// Create a new password hasher with default configuration
    pub fn new() -> Self {
        Self::with_config(&PasswordConfig::default())
    }
    
    /// Create a new password hasher with custom configuration
    pub fn with_config(config: &PasswordConfig) -> Self {
        let params = Params::new(
            config.memory_cost,
            config.time_cost,
            config.parallelism,
            config.output_length,
        )
        .expect("Invalid Argon2 parameters");
        
        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
        
        Self {
            argon2: Arc::new(argon2),
        }
    }
    
    /// Hash a password
    pub fn hash_password(&self, password: &str) -> Result<String, PasswordError> {
        // Validate password
        self.validate_password(password)?;
        
        // Generate a random salt
        let salt = SaltString::generate(&mut OsRng);
        
        // Hash the password
        let password_hash = self.argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| PasswordError::HashingFailed(e.to_string()))?;
        
        Ok(password_hash.to_string())
    }
    
    /// Validate password requirements
    fn validate_password(&self, password: &str) -> Result<(), PasswordError> {
        if password.len() < 8 {
            return Err(PasswordError::TooShort);
        }
        
        if password.len() > 128 {
            return Err(PasswordError::TooLong);
        }
        
        if password.chars().all(|c| c.is_ascii_lowercase()) {
            return Err(PasswordError::TooWeak(
                "Password must contain uppercase letters".to_string()
            ));
        }
        
        if !password.chars().any(|c| c.is_ascii_digit()) {
            return Err(PasswordError::TooWeak(
                "Password must contain at least one digit".to_string()
            ));
        }
        
        Ok(())
    }
}

impl Default for PasswordHasher {
    fn default() -> Self {
        Self::new()
    }
}

/// Password verifier
pub struct PasswordVerifier {
    argon2: Arc<Argon2<'static>>,
}

impl PasswordVerifier {
    /// Create a new password verifier
    pub fn new() -> Self {
        // Use default Argon2 for verification (params are encoded in the hash)
        Self {
            argon2: Arc::new(Argon2::default()),
        }
    }
    
    /// Verify a password against a hash
    pub fn verify_password(
        &self,
        password: &str,
        hash: &str,
    ) -> Result<(), PasswordError> {
        // Parse the password hash
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| PasswordError::InvalidHash(e.to_string()))?;
        
        // Verify the password
        self.argon2
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| PasswordError::VerificationFailed)?;
        
        Ok(())
    }
}

impl Default for PasswordVerifier {
    fn default() -> Self {
        Self::new()
    }
}

/// Password-related errors
#[derive(Debug, thiserror::Error)]
pub enum PasswordError {
    #[error("Password is too short (minimum 8 characters)")]
    TooShort,
    
    #[error("Password is too long (maximum 128 characters)")]
    TooLong,
    
    #[error("Password is too weak: {0}")]
    TooWeak(String),
    
    #[error("Password hashing failed: {0}")]
    HashingFailed(String),
    
    #[error("Invalid password hash: {0}")]
    InvalidHash(String),
    
    #[error("Password verification failed")]
    VerificationFailed,
}

/// Secure string wrapper that zeroes memory on drop
pub struct SecureString(String);

impl SecureString {
    pub fn new(s: String) -> Self {
        Self(s)
    }
    
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Drop for SecureString {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

impl From<String> for SecureString {
    fn from(s: String) -> Self {
        Self::new(s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_password_hashing() {
        let hasher = PasswordHasher::new();
        let password = "MySecureP@ssw0rd";
        
        let hash = hasher.hash_password(password).unwrap();
        assert!(!hash.is_empty());
        assert!(hash.starts_with("$argon2id$"));
    }
    
    #[test]
    fn test_password_verification() {
        let hasher = PasswordHasher::new();
        let verifier = PasswordVerifier::new();
        let password = "MySecureP@ssw0rd";
        
        let hash = hasher.hash_password(password).unwrap();
        
        // Verify correct password
        assert!(verifier.verify_password(password, &hash).is_ok());
        
        // Verify incorrect password
        assert!(verifier.verify_password("WrongPassword123", &hash).is_err());
    }
    
    #[test]
    fn test_password_validation() {
        let hasher = PasswordHasher::new();
        
        // Too short
        assert!(hasher.hash_password("Short1").is_err());
        
        // No uppercase
        assert!(hasher.hash_password("alllowercase123").is_err());
        
        // No digits
        assert!(hasher.hash_password("NoDigitsHere").is_err());
        
        // Valid password
        assert!(hasher.hash_password("ValidP@ssw0rd").is_ok());
    }
    
    #[test]
    fn test_different_hashes_for_same_password() {
        let hasher = PasswordHasher::new();
        let password = "MySecureP@ssw0rd";
        
        let hash1 = hasher.hash_password(password).unwrap();
        let hash2 = hasher.hash_password(password).unwrap();
        
        // Hashes should be different due to random salt
        assert_ne!(hash1, hash2);
        
        // But both should verify correctly
        let verifier = PasswordVerifier::new();
        assert!(verifier.verify_password(password, &hash1).is_ok());
        assert!(verifier.verify_password(password, &hash2).is_ok());
    }
}