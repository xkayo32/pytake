use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookPayload {
    pub object: String,
    pub entry: Vec<WebhookEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookEntry {
    pub id: String,
    pub changes: Vec<WebhookChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookChange {
    pub value: WebhookValue,
    pub field: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookValue {
    pub messaging_product: String,
    pub metadata: WebhookMetadata,
    pub contacts: Option<Vec<Contact>>,
    pub messages: Option<Vec<WebhookMessage>>,
    pub statuses: Option<Vec<MessageStatus>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookMetadata {
    pub display_phone_number: String,
    pub phone_number_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub profile: ContactProfile,
    pub wa_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactProfile {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookMessage {
    pub id: String,
    pub from: String,
    pub to: String,
    pub timestamp: String,
    #[serde(rename = "type")]
    pub message_type: MessageType,
    pub text: Option<String>,
    pub interactive: Option<InteractiveData>,
    pub image: Option<MediaData>,
    pub document: Option<MediaData>,
    pub audio: Option<MediaData>,
    pub video: Option<MediaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    Text,
    Interactive,
    Image,
    Document,
    Audio,
    Video,
    Location,
    Contacts,
    Sticker,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveData {
    #[serde(rename = "type")]
    pub interactive_type: String,
    pub button_reply: Option<ButtonReply>,
    pub list_reply: Option<ListReply>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonReply {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListReply {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaData {
    pub id: String,
    pub mime_type: String,
    pub sha256: String,
    pub caption: Option<String>,
    pub filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageStatus {
    pub id: String,
    pub recipient_id: String,
    pub status: MessageStatusType,
    pub timestamp: String,
    pub conversation: Option<ConversationData>,
    pub pricing: Option<PricingData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageStatusType {
    Sent,
    Delivered,
    Read,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationData {
    pub id: String,
    pub expiration_timestamp: Option<String>,
    pub origin: ConversationOrigin,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationOrigin {
    #[serde(rename = "type")]
    pub origin_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingData {
    pub billable: bool,
    pub pricing_model: String,
    pub category: String,
}

// Estruturas para enviar mensagens

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageRequest {
    pub messaging_product: String,
    pub recipient_type: String,
    pub to: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub text: Option<TextMessage>,
    pub interactive: Option<InteractiveMessage>,
    pub image: Option<MediaMessage>,
    pub document: Option<MediaMessage>,
    pub audio: Option<MediaMessage>,
    pub video: Option<MediaMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextMessage {
    pub body: String,
    pub preview_url: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveMessage {
    #[serde(rename = "type")]
    pub interactive_type: String,
    pub header: Option<InteractiveHeader>,
    pub body: InteractiveBody,
    pub footer: Option<InteractiveFooter>,
    pub action: InteractiveAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveHeader {
    #[serde(rename = "type")]
    pub header_type: String,
    pub text: Option<String>,
    pub image: Option<MediaReference>,
    pub video: Option<MediaReference>,
    pub document: Option<MediaReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveBody {
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveFooter {
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveAction {
    pub buttons: Option<Vec<InteractiveButton>>,
    pub sections: Option<Vec<InteractiveSection>>,
    pub button: Option<String>, // For list messages
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveButton {
    #[serde(rename = "type")]
    pub button_type: String,
    pub reply: InteractiveButtonReply,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveButtonReply {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveSection {
    pub title: String,
    pub rows: Vec<InteractiveRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveRow {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaMessage {
    pub id: Option<String>,
    pub link: Option<String>,
    pub caption: Option<String>,
    pub filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaReference {
    pub id: Option<String>,
    pub link: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageResponse {
    pub messaging_product: String,
    pub contacts: Vec<ContactResponse>,
    pub messages: Vec<MessageResponse>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactResponse {
    pub input: String,
    pub wa_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageResponse {
    pub id: String,
}

// Implementações padrão para facilitar uso
impl Default for SendMessageRequest {
    fn default() -> Self {
        Self {
            messaging_product: "whatsapp".to_string(),
            recipient_type: "individual".to_string(),
            to: String::new(),
            message_type: "text".to_string(),
            text: None,
            interactive: None,
            image: None,
            document: None,
            audio: None,
            video: None,
        }
    }
}

impl InteractiveButton {
    pub fn new(id: String, title: String) -> Self {
        Self {
            button_type: "reply".to_string(),
            reply: InteractiveButtonReply { id, title },
        }
    }
}