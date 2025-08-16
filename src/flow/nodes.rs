use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageNode {
    pub content: String,
    pub media_type: Option<String>,
    pub media_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonsNode {
    pub message: String,
    pub buttons: Vec<ButtonOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonOption {
    pub id: Option<String>,
    pub text: String,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveListNode {
    pub content: ListContent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListContent {
    pub header: String,
    pub body: String,
    pub footer: Option<String>,
    pub sections: Vec<ListSection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListSection {
    pub title: String,
    pub rows: Vec<ListRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListRow {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputNode {
    pub message: String,
    pub variable: String,
    pub validation: Option<String>,
    pub input_type: Option<String>, // text, number, email, etc
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwitchNode {
    pub condition: String, // {{variable_name}}
    pub cases: HashMap<String, String>, // value -> next_node_id
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiNode {
    pub endpoint: String,
    pub method: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<serde_json::Value>,
    pub response_variable: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIClassifierNode {
    pub model: String, // gpt-4, claude, etc
    pub prompt: String,
    pub input: String, // {{user_message}}
    pub output: String, // variable name to store result
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponseNode {
    pub model: String,
    pub prompt: String,
    pub context: Option<String>, // {{conversation_history}}
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionNode {
    pub condition: String,
    pub true_next: String,
    pub false_next: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DelayNode {
    pub duration_seconds: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseNode {
    pub operation: DatabaseOperation,
    pub table: String,
    pub query: Option<String>,
    pub data: Option<HashMap<String, serde_json::Value>>,
    pub result_variable: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DatabaseOperation {
    Select,
    Insert,
    Update,
    Delete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequestNode {
    pub url: String,
    pub method: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub timeout_seconds: Option<u32>,
    pub response_variable: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferNode {
    pub agent_id: Option<String>,
    pub department: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookNode {
    pub url: String,
    pub method: String,
    pub payload: HashMap<String, serde_json::Value>,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileUploadNode {
    pub allowed_types: Vec<String>, // image, document, audio, video
    pub max_size_mb: Option<u32>,
    pub storage_path: String,
    pub file_variable: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailNode {
    pub to: String, // can use variables
    pub subject: String,
    pub body: String,
    pub template: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleNode {
    pub trigger_at: String, // datetime or cron expression
    pub action: ScheduleAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScheduleAction {
    SendMessage { message: String },
    StartFlow { flow_id: String },
    CallWebhook { url: String },
}