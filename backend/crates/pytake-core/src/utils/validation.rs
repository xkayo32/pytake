//! Validation utilities

use crate::errors::{CoreError, CoreResult};
use std::collections::HashMap;
use validator::ValidationErrors;

/// Validation result type
pub type ValidationResult = CoreResult<()>;

/// Enhanced validation trait that provides more context
pub trait ValidateWithContext {
    /// Validate with additional context information
    fn validate_with_context(&self, context: &ValidationContext) -> ValidationResult;
}

/// Validation context for providing additional information during validation
#[derive(Debug, Default)]
pub struct ValidationContext {
    /// Additional context data that can be used during validation
    pub data: HashMap<String, serde_json::Value>,
    /// Validation mode (strict, lenient, etc.)
    pub mode: ValidationMode,
}

/// Validation modes
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ValidationMode {
    /// Strict validation with all rules enforced
    Strict,
    /// Lenient validation with some rules relaxed
    Lenient,
    /// Draft mode with minimal validation
    Draft,
}

impl ValidationContext {
    /// Create a new validation context
    pub fn new() -> Self {
        Self {
            data: HashMap::new(),
            mode: ValidationMode::Strict,
        }
    }

    /// Create a validation context with specific mode
    pub fn with_mode(mode: ValidationMode) -> Self {
        Self {
            data: HashMap::new(),
            mode,
        }
    }

    /// Add context data
    pub fn with_data<K: Into<String>, V: Into<serde_json::Value>>(
        mut self, 
        key: K, 
        value: V
    ) -> Self {
        self.data.insert(key.into(), value.into());
        self
    }

    /// Get context data
    pub fn get_data(&self, key: &str) -> Option<&serde_json::Value> {
        self.data.get(key)
    }

    /// Check if validation mode is strict
    pub fn is_strict(&self) -> bool {
        self.mode == ValidationMode::Strict
    }

    /// Check if validation mode is lenient
    pub fn is_lenient(&self) -> bool {
        self.mode == ValidationMode::Lenient
    }

    /// Check if validation mode is draft
    pub fn is_draft(&self) -> bool {
        self.mode == ValidationMode::Draft
    }
}

impl Default for ValidationMode {
    fn default() -> Self {
        ValidationMode::Strict
    }
}

/// Validate an email address with business rules
pub fn validate_email(email: &str) -> ValidationResult {
    if email.is_empty() {
        return Err(CoreError::validation("Email cannot be empty"));
    }

    // Basic email format validation
    if !email.contains('@') || !email.contains('.') {
        return Err(CoreError::validation("Invalid email format"));
    }

    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return Err(CoreError::validation("Invalid email format"));
    }

    let local_part = parts[0];
    let domain_part = parts[1];

    // Validate local part
    if local_part.is_empty() || local_part.len() > 64 {
        return Err(CoreError::validation("Invalid email local part"));
    }

    // Validate domain part
    if domain_part.is_empty() || domain_part.len() > 255 {
        return Err(CoreError::validation("Invalid email domain"));
    }

    if !domain_part.contains('.') {
        return Err(CoreError::validation("Email domain must contain a dot"));
    }

    Ok(())
}

/// Validate a phone number with international format
pub fn validate_phone_number(phone: &str) -> ValidationResult {
    if phone.is_empty() {
        return Err(CoreError::validation("Phone number cannot be empty"));
    }

    if !phone.starts_with('+') {
        return Err(CoreError::validation("Phone number must start with +"));
    }

    let digits = &phone[1..];
    if digits.is_empty() {
        return Err(CoreError::validation("Phone number must contain digits after +"));
    }

    if !digits.chars().all(|c| c.is_ascii_digit()) {
        return Err(CoreError::validation("Phone number must contain only digits after +"));
    }

    if digits.len() < 7 || digits.len() > 15 {
        return Err(CoreError::validation("Phone number must be between 7 and 15 digits"));
    }

    Ok(())
}

/// Validate a URL
pub fn validate_url(url: &str) -> ValidationResult {
    if url.is_empty() {
        return Err(CoreError::validation("URL cannot be empty"));
    }

    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(CoreError::validation("URL must start with http:// or https://"));
    }

    // Basic URL structure validation
    if let Some(domain_start) = url.find("://") {
        let after_protocol = &url[domain_start + 3..];
        if after_protocol.is_empty() {
            return Err(CoreError::validation("URL must have a domain"));
        }
    }

    Ok(())
}

/// Validate a cron expression (basic validation)
pub fn validate_cron_expression(cron: &str) -> ValidationResult {
    if cron.is_empty() {
        return Err(CoreError::validation("Cron expression cannot be empty"));
    }

    let parts: Vec<&str> = cron.split_whitespace().collect();
    if parts.len() != 5 && parts.len() != 6 {
        return Err(CoreError::validation("Cron expression must have 5 or 6 parts"));
    }

    // Basic validation for each part (simplified)
    for (i, part) in parts.iter().enumerate() {
        if part.is_empty() {
            return Err(CoreError::validation(format!("Cron part {} cannot be empty", i + 1)));
        }

        // Allow wildcards, numbers, ranges, and lists
        if !part.chars().all(|c| {
            c.is_ascii_digit() || 
            c == '*' || 
            c == '-' || 
            c == ',' || 
            c == '/' ||
            c == '?'
        }) {
            return Err(CoreError::validation(format!("Invalid characters in cron part {}", i + 1)));
        }
    }

    Ok(())
}

/// Validate a JSON string
pub fn validate_json(json_str: &str) -> ValidationResult {
    if json_str.is_empty() {
        return Err(CoreError::validation("JSON string cannot be empty"));
    }

    serde_json::from_str::<serde_json::Value>(json_str)
        .map_err(|e| CoreError::validation(format!("Invalid JSON: {}", e)))?;

    Ok(())
}

/// Validate text length within bounds
pub fn validate_text_length(text: &str, min: usize, max: usize, field_name: &str) -> ValidationResult {
    let len = text.len();
    
    if len < min {
        return Err(CoreError::validation(
            format!("{} must be at least {} characters long", field_name, min)
        ));
    }
    
    if len > max {
        return Err(CoreError::validation(
            format!("{} cannot exceed {} characters", field_name, max)
        ));
    }
    
    Ok(())
}

/// Validate that a string is not empty or whitespace-only
pub fn validate_not_empty(text: &str, field_name: &str) -> ValidationResult {
    if text.trim().is_empty() {
        return Err(CoreError::validation(
            format!("{} cannot be empty or whitespace-only", field_name)
        ));
    }
    
    Ok(())
}

/// Validate that a value is within a numeric range
pub fn validate_numeric_range<T>(value: T, min: T, max: T, field_name: &str) -> ValidationResult 
where
    T: PartialOrd + std::fmt::Display,
{
    if value < min || value > max {
        return Err(CoreError::validation(
            format!("{} must be between {} and {}", field_name, min, max)
        ));
    }
    
    Ok(())
}

/// Convert validator::ValidationErrors to CoreError
pub fn validation_errors_to_core_error(errors: ValidationErrors) -> CoreError {
    let mut error_messages = Vec::new();
    
    for (field, field_errors) in errors.field_errors() {
        for error in field_errors {
            let message = if let Some(message) = &error.message {
                message.to_string()
            } else {
                format!("Validation error in field '{}'", field)
            };
            error_messages.push(message);
        }
    }
    
    CoreError::validation(error_messages.join("; "))
}

/// Batch validate multiple items
pub fn batch_validate<T, F>(items: &[T], validator: F) -> ValidationResult
where
    F: Fn(&T) -> ValidationResult,
{
    let mut errors = Vec::new();
    
    for (index, item) in items.iter().enumerate() {
        if let Err(error) = validator(item) {
            errors.push(format!("Item {}: {}", index, error));
        }
    }
    
    if !errors.is_empty() {
        return Err(CoreError::validation(errors.join("; ")));
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        // Valid emails
        assert!(validate_email("test@example.com").is_ok());
        assert!(validate_email("user.name@domain.co.uk").is_ok());
        
        // Invalid emails
        assert!(validate_email("").is_err());
        assert!(validate_email("invalid").is_err());
        assert!(validate_email("@domain.com").is_err());
        assert!(validate_email("user@").is_err());
        assert!(validate_email("user@domain").is_err());
    }

    #[test]
    fn test_phone_number_validation() {
        // Valid phone numbers
        assert!(validate_phone_number("+1234567890").is_ok());
        assert!(validate_phone_number("+5511999887766").is_ok());
        
        // Invalid phone numbers
        assert!(validate_phone_number("").is_err());
        assert!(validate_phone_number("1234567890").is_err());
        assert!(validate_phone_number("+").is_err());
        assert!(validate_phone_number("+123").is_err());
        assert!(validate_phone_number("+12345678901234567").is_err());
        assert!(validate_phone_number("+123abc789").is_err());
    }

    #[test]
    fn test_url_validation() {
        // Valid URLs
        assert!(validate_url("http://example.com").is_ok());
        assert!(validate_url("https://api.example.com/v1").is_ok());
        
        // Invalid URLs
        assert!(validate_url("").is_err());
        assert!(validate_url("ftp://example.com").is_err());
        assert!(validate_url("http://").is_err());
        assert!(validate_url("https://").is_err());
    }

    #[test]
    fn test_cron_validation() {
        // Valid cron expressions
        assert!(validate_cron_expression("0 9 * * 1-5").is_ok());
        assert!(validate_cron_expression("*/15 * * * *").is_ok());
        assert!(validate_cron_expression("0 0 1 1 * 2023").is_ok()); // 6 parts
        
        // Invalid cron expressions
        assert!(validate_cron_expression("").is_err());
        assert!(validate_cron_expression("0 9 * *").is_err()); // Too few parts
        assert!(validate_cron_expression("0 9 * * * * *").is_err()); // Too many parts
    }

    #[test]
    fn test_json_validation() {
        // Valid JSON
        assert!(validate_json(r#"{"key": "value"}"#).is_ok());
        assert!(validate_json(r#"[1, 2, 3]"#).is_ok());
        assert!(validate_json(r#""simple string""#).is_ok());
        
        // Invalid JSON
        assert!(validate_json("").is_err());
        assert!(validate_json("{invalid}").is_err());
        assert!(validate_json(r#"{"key": value}"#).is_err());
    }

    #[test]
    fn test_text_length_validation() {
        assert!(validate_text_length("hello", 3, 10, "test").is_ok());
        assert!(validate_text_length("hi", 3, 10, "test").is_err()); // Too short
        assert!(validate_text_length("this is too long", 3, 10, "test").is_err()); // Too long
    }

    #[test]
    fn test_not_empty_validation() {
        assert!(validate_not_empty("hello", "test").is_ok());
        assert!(validate_not_empty("", "test").is_err());
        assert!(validate_not_empty("   ", "test").is_err());
        assert!(validate_not_empty("\t\n", "test").is_err());
    }

    #[test]
    fn test_numeric_range_validation() {
        assert!(validate_numeric_range(5, 1, 10, "test").is_ok());
        assert!(validate_numeric_range(0, 1, 10, "test").is_err()); // Too low
        assert!(validate_numeric_range(15, 1, 10, "test").is_err()); // Too high
    }

    #[test]
    fn test_validation_context() {
        let context = ValidationContext::new()
            .with_data("user_id", "123")
            .with_data("is_admin", true);
        
        assert_eq!(context.get_data("user_id"), Some(&serde_json::Value::String("123".to_string())));
        assert_eq!(context.get_data("is_admin"), Some(&serde_json::Value::Bool(true)));
        assert!(context.is_strict());
    }

    #[test]
    fn test_batch_validation() {
        let emails = vec!["test@example.com", "invalid", "user@domain.com"];
        
        let result = batch_validate(&emails, |email| validate_email(email));
        assert!(result.is_err()); // Should fail because of "invalid" email
        
        let valid_emails = vec!["test@example.com", "user@domain.com"];
        let result = batch_validate(&valid_emails, |email| validate_email(email));
        assert!(result.is_ok());
    }
}