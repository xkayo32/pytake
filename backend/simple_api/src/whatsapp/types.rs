use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, NaiveDateTime};

/// WhatsApp provider types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, utoipa::ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum WhatsAppProvider {
    Official,   // WhatsApp Business API (Meta)
    Evolution,  // Evolution API
}

/// Health status for configurations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, utoipa::ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Healthy,
    Unhealthy,
    Unknown,
    Inactive,
}

/// Message types supported by WhatsApp
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    Text,
    Image,
    Audio,
    Video,
    Document,
    Location,
    Sticker,
    Template,
    Interactive,
}

// =============================================================================
// Configuration Types
// =============================================================================

/// Complete WhatsApp configuration
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct WhatsAppConfig {
    pub id: String,
    pub name: String,
    pub provider: WhatsAppProvider,
    pub phone_number_id: Option<String>,
    pub access_token: Option<String>,
    pub webhook_verify_token: String,
    pub webhook_url: Option<String>,
    pub app_secret: Option<String>,
    pub business_account_id: Option<String>,
    // Evolution API fields
    pub evolution_url: Option<String>,
    pub evolution_api_key: Option<String>,
    pub instance_name: Option<String>,
    // Management fields
    pub is_active: bool,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
    // Status tracking
    pub last_health_check: Option<DateTime<Utc>>,
    pub health_status: HealthStatus,
    pub error_message: Option<String>,
}

/// Request for creating new WhatsApp configuration
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateWhatsAppConfigRequest {
    pub name: String,
    pub provider: WhatsAppProvider,
    // Official API fields
    pub phone_number_id: Option<String>,
    pub access_token: Option<String>,
    pub webhook_verify_token: String,
    pub app_secret: Option<String>,
    pub business_account_id: Option<String>,
    // Evolution API fields
    pub evolution_url: Option<String>,
    pub evolution_api_key: Option<String>,
    pub instance_name: Option<String>,
    // Settings
    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
}

/// Request for updating WhatsApp configuration
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdateWhatsAppConfigRequest {
    pub name: Option<String>,
    pub phone_number_id: Option<String>,
    pub access_token: Option<String>,
    pub webhook_verify_token: Option<String>,
    pub app_secret: Option<String>,
    pub business_account_id: Option<String>,
    pub evolution_url: Option<String>,
    pub evolution_api_key: Option<String>,
    pub instance_name: Option<String>,
    pub is_active: Option<bool>,
    pub is_default: Option<bool>,
}

// WhatsAppConfigResponse is now provided by the entity module
// Re-export it for convenience
pub use crate::entities::whatsapp_config::WhatsAppConfigResponse;

// =============================================================================
// Instance Management Types
// =============================================================================

/// Request to create a new WhatsApp instance
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateInstanceRequest {
    pub provider: WhatsAppProvider,
    pub instance_name: String,
    pub config_id: Option<String>, // Reference to stored configuration
    pub evolution_config: Option<EvolutionConfigRequest>,
    pub official_config: Option<OfficialConfigRequest>,
}

#[derive(Debug, Deserialize)]
pub struct EvolutionConfigRequest {
    pub base_url: String,
    pub api_key: String,
}

#[derive(Debug, Deserialize)]
pub struct OfficialConfigRequest {
    pub phone_number_id: String,
    pub access_token: String,
    pub webhook_verify_token: String,
}

/// Instance status response
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct InstanceStatusResponse {
    pub instance_name: String,
    pub provider: WhatsAppProvider,
    pub connected: bool,
    pub qr_code: Option<String>,
    pub phone_number: Option<String>,
    pub last_seen: Option<DateTime<Utc>>,
}

/// Instance information from Evolution API
#[derive(Debug, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub instance_name: String,
    pub status: String,
    pub state: String,
    pub qrcode: Option<String>,
    pub connected: bool,
    pub number: Option<String>,
}

// =============================================================================
// Message Types
// =============================================================================

/// Send message request
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct SendMessageRequest {
    pub instance_name: Option<String>,
    pub config_id: Option<String>,
    pub to: String,
    pub message_type: MessageType,
    pub text: Option<String>,
    pub media_url: Option<String>,
    pub caption: Option<String>,
    pub template_name: Option<String>,
    pub template_params: Option<Vec<String>>,
}

/// Message response
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct MessageResponse {
    pub success: bool,
    pub message_id: String,
    pub to: String,
    pub instance_name: Option<String>,
    pub provider: WhatsAppProvider,
    pub timestamp: DateTime<Utc>,
}

// =============================================================================
// Evolution API Specific Types
// =============================================================================

/// Evolution API message response
#[derive(Debug, Deserialize)]
pub struct EvolutionMessageResponse {
    pub key: EvolutionMessageKey,
    pub message: EvolutionMessageContent,
    pub message_timestamp: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct EvolutionMessageKey {
    pub remote_jid: String,
    pub from_me: bool,
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct EvolutionMessageContent {
    pub conversation: Option<String>,
    pub image_message: Option<EvolutionMediaMessage>,
    pub video_message: Option<EvolutionMediaMessage>,
    pub audio_message: Option<EvolutionAudioMessage>,
    pub document_message: Option<EvolutionMediaMessage>,
}

#[derive(Debug, Deserialize)]
pub struct EvolutionMediaMessage {
    pub url: Option<String>,
    pub mimetype: Option<String>,
    pub caption: Option<String>,
    pub file_sha256: Option<String>,
    pub file_length: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub struct EvolutionAudioMessage {
    pub url: Option<String>,
    pub mimetype: Option<String>,
    pub file_sha256: Option<String>,
    pub file_length: Option<u64>,
    pub ptt: Option<bool>, // Push to talk (voice message)
}

// =============================================================================
// Official API Specific Types
// =============================================================================

/// Official API message response
#[derive(Debug, Deserialize)]
pub struct OfficialMessageResponse {
    pub messaging_product: String,
    pub contacts: Vec<OfficialContact>,
    pub messages: Vec<OfficialMessage>,
}

#[derive(Debug, Deserialize)]
pub struct OfficialContact {
    pub input: String,
    pub wa_id: String,
}

#[derive(Debug, Deserialize)]
pub struct OfficialMessage {
    pub id: String,
}

/// Phone number status from official API
#[derive(Debug, Deserialize)]
pub struct PhoneNumberStatus {
    pub verified_name: String,
    pub code_verification_status: String,
    pub display_phone_number: String,
    pub quality_rating: String,
    pub status: String,
}

// =============================================================================
// Webhook Types
// =============================================================================

/// Generic webhook event
#[derive(Debug, Deserialize)]
pub struct WebhookEvent {
    pub event: String,
    pub instance: Option<String>,
    pub data: serde_json::Value,
}

/// Webhook verification response
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct WebhookVerificationResponse {
    pub success: bool,
    pub challenge: Option<String>,
    pub message: String,
}

// =============================================================================
// Contact Types
// =============================================================================

/// Contact information
#[derive(Debug, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: Option<String>,
    pub number: String,
    pub is_business: bool,
    pub is_group: bool,
    pub profile_pic_url: Option<String>,
}

// =============================================================================
// Test and Validation Types
// =============================================================================

/// Test result for configuration validation
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct TestResult {
    pub success: bool,
    pub message: String,
    pub provider: WhatsAppProvider,
    pub details: Option<serde_json::Value>,
    pub error: Option<String>,
}

// =============================================================================
// Pagination Types
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationInfo {
    pub current_page: u64,
    pub page_size: u64,
    pub total_items: u64,
    pub total_pages: u64,
    pub has_next: bool,
    pub has_prev: bool,
}