/*!
# WhatsApp Module

This module provides a comprehensive WhatsApp Business API integration for PyTake,
supporting both the Official WhatsApp Business API and Evolution API.

## Architecture

The module is organized into the following submodules:

- `error`: Common error types and error handling
- `types`: All data structures and type definitions
- `evolution_api`: Evolution API client implementation
- `official_api`: Official WhatsApp Business API client implementation
- `config`: Configuration management with database persistence
- `service`: Business logic layer that manages instances and messaging
- `handlers`: HTTP request handlers for REST API endpoints

## Key Features

- **Multi-provider support**: Works with both Official and Evolution APIs
- **Database-driven configuration**: Persistent configuration storage with caching
- **Instance management**: Create, manage, and monitor WhatsApp instances
- **Message sending**: Support for text, media, and template messages
- **Webhook handling**: Process incoming messages and status updates
- **Health monitoring**: Track instance health and performance metrics
- **Error handling**: Comprehensive error types with proper HTTP responses

## Usage Example

```rust
use crate::whatsapp::{ConfigService, WhatsAppService, WhatsAppProvider};

// Create services
let config_service = Arc::new(ConfigService::new(db_connection));
let whatsapp_service = Arc::new(WhatsAppService::new(config_service));

// Create a configuration
let config = CreateWhatsAppConfigRequest {
    name: "My WhatsApp".to_string(),
    provider: WhatsAppProvider::Official,
    phone_number_id: Some("123456789".to_string()),
    access_token: Some("token".to_string()),
    webhook_verify_token: "verify".to_string(),
    // ... other fields
};

// Send a message
let message = SendMessageRequest {
    to: "5511999999999".to_string(),
    message_type: MessageType::Text,
    text: Some("Hello World!".to_string()),
    // ... other fields
};

let response = whatsapp_service.send_message(message).await?;
```

## Route Configuration

The module provides both new organized routes and legacy routes for backward compatibility:

```rust
// New organized routes under /api/v1/whatsapp/
whatsapp::handlers::configure_routes(cfg);

// Legacy routes for backward compatibility
whatsapp::handlers::configure_legacy_routes(cfg);
```

## Error Handling

All operations return `WhatsAppResult<T>` which automatically converts to appropriate
HTTP responses when used in handlers. Custom error types include:

- `ConfigNotFound`: When a configuration doesn't exist
- `InstanceNotFound`: When an instance doesn't exist  
- `MessageSendFailed`: When message sending fails
- `ApiRequestFailed`: When API calls fail
- And many more specific error types

## Database Integration

The module uses Sea-ORM for database operations with automatic caching via Redis.
Configuration data is stored securely with sensitive fields excluded from API responses.

## Security Considerations

- Access tokens and API keys are never returned in API responses
- Webhook signatures are verified when app secrets are provided
- All sensitive data is properly handled and not logged
- Database queries use parameterized statements to prevent SQL injection
*/

pub mod error;
pub mod types;
pub mod evolution_api;
pub mod official_api;
pub mod config;
pub mod service;
pub mod handlers;

// Re-export commonly used types for convenience
pub use error::{WhatsAppError, WhatsAppResult};
pub use types::{
    WhatsAppProvider, HealthStatus, MessageType,
    CreateWhatsAppConfigRequest, UpdateWhatsAppConfigRequest, WhatsAppConfigResponse,
    CreateInstanceRequest, SendMessageRequest, MessageResponse,
    InstanceStatusResponse, TestResult,
    PaginationParams, PaginatedResponse
};
pub use config::ConfigService;
pub use service::WhatsAppService;
pub use handlers::{configure_routes, configure_legacy_routes};

/// Version information for the WhatsApp module
pub const VERSION: &str = "2.0.0";

/// Module metadata
pub const MODULE_INFO: &str = "PyTake WhatsApp Integration Module";

/// Supported WhatsApp API versions
pub const OFFICIAL_API_VERSION: &str = "v18.0";
pub const EVOLUTION_API_VERSION: &str = "v1.7.0";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_exports() {
        // Test that all major types are properly exported
        let _error = WhatsAppError::ConfigNotFound("test".to_string());
        let _provider = WhatsAppProvider::Official;
        let _status = HealthStatus::Healthy;
        let _message_type = MessageType::Text;
        
        // Version info should be accessible
        assert_eq!(VERSION, "2.0.0");
        assert!(!MODULE_INFO.is_empty());
        assert!(!OFFICIAL_API_VERSION.is_empty());
        assert!(!EVOLUTION_API_VERSION.is_empty());
    }

    #[test]
    fn test_error_conversion() {
        let error = WhatsAppError::ConfigNotFound("test config".to_string());
        let result: WhatsAppResult<()> = Err(error);
        assert!(result.is_err());
    }
}