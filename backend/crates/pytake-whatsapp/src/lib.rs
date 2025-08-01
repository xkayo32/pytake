//! # pytake-whatsapp
//!
//! A Rust crate for interacting with the WhatsApp Business Platform Cloud API.
//! 
//! This crate provides a high-level, async interface for:
//! - Sending text, image, document, and template messages
//! - Uploading and downloading media
//! - Processing webhook notifications
//! - Verifying webhook signatures
//! 
//! ## Quick Start
//! 
//! ```rust,no_run
//! use pytake_whatsapp::{WhatsAppClient, WhatsAppConfig};
//! 
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let config = WhatsAppConfig {
//!         access_token: "your_access_token".to_string(),
//!         phone_number_id: "your_phone_number_id".to_string(),
//!         ..Default::default()
//!     };
//!     
//!     let client = WhatsAppClient::new(config)?;
//!     
//!     // Send a text message
//!     client.send_text_message("1234567890", "Hello from Rust!").await?;
//!     
//!     Ok(())
//! }
//! ```

pub mod client;
pub mod types;
pub mod webhook;

// Re-export main types for convenience
pub use client::{WhatsAppClient, WhatsAppConfig, WhatsAppError, MediaUploadResponse, MediaInfoResponse};
pub use types::{
    Contact, Media, Message, MessageContent, MessageResponse, MessageStatus, 
    TemplateMessage, TemplateLanguage, TemplateComponent, TemplateParameter,
    TextMessage, ImageMessage, DocumentMessage, AudioMessage, VideoMessage,
    LocationMessage, PhoneNumber
};
pub use webhook::{
    WebhookProcessor, WebhookPayload, WebhookEntry, WebhookChange, WebhookValue,
    InboundMessage, MessageStatusUpdate, WebhookChallenge,
    WebhookVerificationError, WebhookProcessingError
};

/// Result type alias for WhatsApp operations
pub type Result<T> = std::result::Result<T, WhatsAppError>;