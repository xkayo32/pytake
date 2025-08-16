use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{DateTime, Utc};

pub mod engine;
pub mod nodes;
pub mod session;
pub mod webhook;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowSession {
    pub id: String,
    pub flow_id: String,
    pub contact_id: String,
    pub conversation_id: String,
    pub current_node_id: String,
    pub status: FlowSessionStatus,
    pub context: HashMap<String, serde_json::Value>,
    pub variables: HashMap<String, serde_json::Value>,
    pub started_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FlowSessionStatus {
    Active,
    Waiting,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowNode {
    pub id: String,
    pub node_type: String,
    pub config: serde_json::Value,
    pub next: Option<String>,
    pub conditions: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flow {
    pub id: String,
    pub name: String,
    pub nodes: Vec<FlowNode>,
    pub variables: HashMap<String, serde_json::Value>,
    pub settings: FlowSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowSettings {
    pub timeout_minutes: Option<u32>,
    pub max_iterations: Option<u32>,
    pub fallback_node: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuOption {
    pub id: String,
    pub label: String,
    pub value: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub action: Option<MenuAction>,
    pub target_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MenuAction {
    Flow,
    Message,
    Api,
    Transfer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InteractiveMessage {
    pub message_type: InteractiveMessageType,
    pub header: Option<MessageHeader>,
    pub body: String,
    pub footer: Option<String>,
    pub options: Vec<MenuOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InteractiveMessageType {
    Buttons,
    List,
    ReplyButtons,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageHeader {
    pub header_type: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowExecutionContext {
    pub session: FlowSession,
    pub flow: Flow,
    pub current_node: FlowNode,
    pub user_input: Option<String>,
    pub user_selection: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FlowExecutionResult {
    Continue(String), // next node id
    Wait,
    Complete,
    Error(String),
}