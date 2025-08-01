use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// WhatsApp phone number with optional display name
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhoneNumber {
    pub number: String,
    pub display_name: Option<String>,
}

/// Contact information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub wa_id: String,
    pub profile_name: Option<String>,
}

/// Message status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MessageStatus {
    Sent,
    Delivered,
    Read,
    Failed,
}

/// Media object for messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Media {
    pub id: Option<String>,
    pub link: Option<String>,
    pub caption: Option<String>,
    pub filename: Option<String>,
    pub mime_type: Option<String>,
}

/// Text message content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextMessage {
    pub body: String,
    pub preview_url: Option<bool>,
}

/// Image message content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMessage {
    #[serde(flatten)]
    pub media: Media,
}

/// Document message content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMessage {
    #[serde(flatten)]
    pub media: Media,
}

/// Audio message content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioMessage {
    #[serde(flatten)]
    pub media: Media,
}

/// Video message content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMessage {
    #[serde(flatten)]
    pub media: Media,
}

/// Location message content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationMessage {
    pub longitude: f64,
    pub latitude: f64,
    pub name: Option<String>,
    pub address: Option<String>,
}

/// Template message component
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateComponent {
    #[serde(rename = "type")]
    pub component_type: String,
    pub sub_type: Option<String>,
    pub parameters: Vec<TemplateParameter>,
    pub index: Option<String>,
}

/// Template parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateParameter {
    #[serde(rename = "type")]
    pub param_type: String,
    pub text: Option<String>,
    pub currency: Option<TemplateCurrency>,
    pub date_time: Option<TemplateDateTime>,
    pub image: Option<Media>,
    pub document: Option<Media>,
    pub video: Option<Media>,
}

/// Template currency parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateCurrency {
    pub fallback_value: String,
    pub code: String,
    pub amount_1000: i64,
}

/// Template date time parameter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateDateTime {
    pub fallback_value: String,
}

/// Template language
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateLanguage {
    pub code: String,
    pub policy: Option<String>,
}

/// Template message content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateMessage {
    pub name: String,
    pub language: TemplateLanguage,
    pub components: Option<Vec<TemplateComponent>>,
}

/// Message content enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum MessageContent {
    Text(TextMessage),
    Image(ImageMessage),
    Document(DocumentMessage),
    Audio(AudioMessage),
    Video(VideoMessage),
    Location(LocationMessage),
    Template(TemplateMessage),
}

/// Outbound message structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub messaging_product: String,
    pub recipient_type: String,
    pub to: String,
    #[serde(flatten)]
    pub content: MessageContent,
    pub context: Option<MessageContext>,
}

/// Message context for replies
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageContext {
    pub message_id: String,
}

/// API response for sent messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageResponse {
    pub messaging_product: String,
    pub contacts: Vec<Contact>,
    pub messages: Vec<MessageStatus>,
}

/// Error response from WhatsApp API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppError {
    pub code: i32,
    pub title: String,
    pub message: String,
    pub error_data: Option<HashMap<String, serde_json::Value>>,
}

/// API error response structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: WhatsAppError,
}

impl Message {
    /// Create a new text message
    pub fn text<S: Into<String>>(to: S, body: S) -> Self {
        Self {
            messaging_product: "whatsapp".to_string(),
            recipient_type: "individual".to_string(),
            to: to.into(),
            content: MessageContent::Text(TextMessage {
                body: body.into(),
                preview_url: None,
            }),
            context: None,
        }
    }

    /// Create a new image message
    pub fn image<S: Into<String>>(to: S, media: Media) -> Self {
        Self {
            messaging_product: "whatsapp".to_string(),
            recipient_type: "individual".to_string(),
            to: to.into(),
            content: MessageContent::Image(ImageMessage { media }),
            context: None,
        }
    }

    /// Create a new document message
    pub fn document<S: Into<String>>(to: S, media: Media) -> Self {
        Self {
            messaging_product: "whatsapp".to_string(),
            recipient_type: "individual".to_string(),
            to: to.into(),
            content: MessageContent::Document(DocumentMessage { media }),
            context: None,
        }
    }

    /// Create a new template message
    pub fn template<S: Into<String>>(to: S, template: TemplateMessage) -> Self {
        Self {
            messaging_product: "whatsapp".to_string(),
            recipient_type: "individual".to_string(),
            to: to.into(),
            content: MessageContent::Template(template),
            context: None,
        }
    }

    /// Add context to make this a reply
    pub fn with_context(mut self, message_id: String) -> Self {
        self.context = Some(MessageContext { message_id });
        self
    }
}

impl Media {
    /// Create media from URL
    pub fn from_url<S: Into<String>>(url: S) -> Self {
        Self {
            id: None,
            link: Some(url.into()),
            caption: None,
            filename: None,
            mime_type: None,
        }
    }

    /// Create media from uploaded ID
    pub fn from_id<S: Into<String>>(id: S) -> Self {
        Self {
            id: Some(id.into()),
            link: None,
            caption: None,
            filename: None,
            mime_type: None,
        }
    }

    /// Add caption to media
    pub fn with_caption<S: Into<String>>(mut self, caption: S) -> Self {
        self.caption = Some(caption.into());
        self
    }

    /// Add filename to media
    pub fn with_filename<S: Into<String>>(mut self, filename: S) -> Self {
        self.filename = Some(filename.into());
        self
    }
}

/// Contact verification response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactVerifyResponse {
    pub contacts: Vec<ContactInfo>,
    pub messaging_product: String,
}

/// Contact information from verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactInfo {
    pub input: String,
    pub wa_id: String,
    pub status: ContactStatus,
}

/// Contact status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ContactStatus {
    Valid,
    Invalid,
    Processing,
    Failed,
}

/// Business profile information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessProfile {
    pub about: Option<String>,
    pub address: Option<String>,
    pub description: Option<String>,
    pub email: Option<String>,
    pub profile_picture_url: Option<String>,
    pub websites: Option<Vec<String>>,
    pub vertical: Option<String>,
    pub messaging_product: String,
}