//! Multi-platform messaging system
//!
//! This module provides a unified interface for messaging across different platforms
//! including WhatsApp, Instagram, Facebook Messenger, Telegram, and more.

pub mod platform;
pub mod traits;
pub mod whatsapp;

pub use platform::Platform;
pub use traits::{
    MessagingPlatform, MessageContent, MediaContent, ContactInfo, MessageContext,
    PlatformMessageResult, DeliveryStatus, PlatformCapabilities, MediaType,
    WebhookEventType, PlatformWebhookEvent, MessageConverter, MediaData,
    SystemMessageType, InteractionType, MessageButton, ButtonType,
    ParameterType, QuickReply, ListSection, ListRow, TemplateParameter,
    ContactName, ContactPhone, ContactEmail, ContactUrl, ContactAddress, ContactOrganization,
};
pub use whatsapp::WhatsAppPlatform;