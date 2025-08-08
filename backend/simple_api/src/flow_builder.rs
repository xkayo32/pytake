use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque, HashSet};
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};
use tokio::time::{sleep, Duration as TokioDuration};
use utoipa::{ToSchema, OpenApi};

/// API Documentation for Flow Builder
#[derive(OpenApi)]
#[openapi(
    paths(),
    components(schemas(
        FlowDefinition, NodeDefinition, NodeType, Connection,
        MessageNodeData, QuestionNodeData, ConditionNodeData,
        ActionNodeData, WaitNodeData, IntegrationNodeData,
        TemplateNodeData, ExecutionContext, FlowSession,
        FlowValidationResult, ValidationError, FlowTemplate,
        FlowAnalytics, NodeMetrics, ExecutionMetrics,
        CreateFlowRequest, UpdateFlowRequest, TestFlowRequest,
        ExecuteFlowRequest, FlowInputRequest
    ))
)]
pub struct FlowBuilderApiDoc;

/// Flow definition with metadata and nodes
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FlowDefinition {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub version: u32,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
    pub nodes: Vec<NodeDefinition>,
    pub connections: Vec<Connection>,
    pub variables: HashMap<String, String>, // Variable definitions
    pub settings: FlowSettings,
}

/// Flow settings and configuration
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FlowSettings {
    pub timeout_minutes: u32,
    pub max_iterations: u32,
    pub enable_analytics: bool,
    pub enable_ab_testing: bool,
    pub retry_attempts: u32,
    pub error_handling: ErrorHandlingStrategy,
}

/// Error handling strategies
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ErrorHandlingStrategy {
    StopFlow,
    ContinueToNext,
    RetryNode,
    FallbackToHuman,
}

/// Node definition in a flow
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct NodeDefinition {
    pub id: Uuid,
    pub node_type: NodeType,
    pub position: Position,
    pub data: NodeData,
    pub metadata: NodeMetadata,
}

/// Position of a node in the visual editor
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

/// Node metadata for UI and analytics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct NodeMetadata {
    pub label: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub tags: Vec<String>,
}

/// Types of nodes available in the flow builder
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type")]
pub enum NodeType {
    Start,
    Message,
    Question,
    Condition,
    Action,
    Wait,
    End,
    Integration,
    Template,
}

/// Node data containing type-specific information
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type")]
pub enum NodeData {
    Start,
    Message(MessageNodeData),
    Question(QuestionNodeData),
    Condition(ConditionNodeData),
    Action(ActionNodeData),
    Wait(WaitNodeData),
    End(EndNodeData),
    Integration(IntegrationNodeData),
    Template(TemplateNodeData),
}

/// Message node data
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MessageNodeData {
    pub text: String,
    pub media_url: Option<String>,
    pub media_type: Option<String>, // image, audio, video, document
    pub delay_seconds: Option<u32>,
}

/// Question node data
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct QuestionNodeData {
    pub question: String,
    pub input_type: InputType,
    pub validation: Option<ValidationRule>,
    pub save_to_variable: String,
    pub timeout_seconds: Option<u32>,
    pub retry_message: Option<String>,
}

/// Input types for questions
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum InputType {
    Text,
    Number,
    Email,
    Phone,
    Date,
    Choice(Vec<String>),
    MultipleChoice(Vec<String>),
}

/// Validation rules for user input
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ValidationRule {
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub pattern: Option<String>, // Regex pattern
    pub custom_validator: Option<String>, // Custom validation logic
}

/// Condition node data for flow branching
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConditionNodeData {
    pub conditions: Vec<Condition>,
    pub operator: LogicalOperator, // AND, OR
}

/// Individual condition
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Condition {
    pub variable: String,
    pub operator: ComparisonOperator,
    pub value: String,
}

/// Logical operators for combining conditions
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum LogicalOperator {
    And,
    Or,
}

/// Comparison operators for conditions
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ComparisonOperator {
    Equals,
    NotEquals,
    Contains,
    NotContains,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    IsEmpty,
    IsNotEmpty,
}

/// Action node data for external operations
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ActionNodeData {
    pub action_type: ActionType,
    pub parameters: HashMap<String, String>,
    pub save_result_to: Option<String>,
}

/// Types of actions available
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ActionType {
    HttpRequest,
    DatabaseQuery,
    SendEmail,
    CreateTicket,
    UpdateCRM,
    CallWebhook,
    RunScript,
}

/// Wait node data for delays and timeouts
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WaitNodeData {
    pub wait_type: WaitType,
    pub duration_seconds: Option<u32>,
    pub condition: Option<String>,
}

/// Types of wait operations
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum WaitType {
    FixedDelay,
    UserInput,
    ExternalEvent,
    Condition,
}

/// End node data
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EndNodeData {
    pub success: bool,
    pub message: Option<String>,
    pub next_flow_id: Option<Uuid>,
}

/// Integration node data for external system calls
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IntegrationNodeData {
    pub integration_type: IntegrationType,
    pub endpoint: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body_template: Option<String>,
    pub response_mapping: HashMap<String, String>,
}

/// Types of integrations
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum IntegrationType {
    ERP,
    CRM,
    AI,
    Database,
    CustomAPI,
    WebService,
}

/// Template node data for WhatsApp message templates
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TemplateNodeData {
    pub template_name: String,
    pub language: String,
    pub parameters: HashMap<String, String>,
}

/// Connection between nodes
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Connection {
    pub id: Uuid,
    pub from_node: Uuid,
    pub to_node: Uuid,
    pub condition: Option<String>, // Condition for this connection
    pub label: Option<String>,
}

/// Execution context for a flow session
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ExecutionContext {
    pub session_id: Uuid,
    pub flow_id: Uuid,
    pub current_node: Uuid,
    pub variables: HashMap<String, String>,
    pub started_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub user_phone: String,
    pub conversation_history: Vec<ConversationEntry>,
    pub execution_path: Vec<Uuid>, // Track which nodes were executed
    pub retry_count: u32,
    pub status: ExecutionStatus,
}

/// Conversation entry for history
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConversationEntry {
    pub timestamp: DateTime<Utc>,
    pub message: String,
    pub sender: MessageSender,
    pub node_id: Option<Uuid>,
}

/// Message sender type
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum MessageSender {
    Bot,
    User,
    System,
}

/// Execution status
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ExecutionStatus {
    Running,
    WaitingForInput,
    Completed,
    Failed,
    Timeout,
    Cancelled,
}

/// Flow session management
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FlowSession {
    pub id: Uuid,
    pub flow_id: Uuid,
    pub user_phone: String,
    pub context: ExecutionContext,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

/// Flow validation result
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FlowValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationError>,
    pub performance_score: u32, // 0-100
}

/// Validation error or warning
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ValidationError {
    pub error_type: ValidationErrorType,
    pub message: String,
    pub node_id: Option<Uuid>,
    pub severity: Severity,
}

/// Types of validation errors
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ValidationErrorType {
    DeadEnd,
    UnreachableNode,
    MissingConnection,
    InvalidVariable,
    CircularReference,
    MissingStartNode,
    MultipleStartNodes,
    PerformanceIssue,
    SecurityIssue,
}

/// Severity levels
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum Severity {
    Error,
    Warning,
    Info,
}

/// Industry templates
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FlowTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub industry: Industry,
    pub use_case: String,
    pub flow_definition: FlowDefinition,
    pub preview_image: Option<String>,
    pub tags: Vec<String>,
}

/// Industry categories
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, ToSchema)]
pub enum Industry {
    ISP,
    ECommerce,
    Healthcare,
    Education,
    Delivery,
    Financial,
    RealEstate,
    Automotive,
    Retail,
    Generic,
}

/// Flow analytics data
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FlowAnalytics {
    pub flow_id: Uuid,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_executions: u64,
    pub successful_completions: u64,
    pub conversion_rate: f64,
    pub average_duration_minutes: f64,
    pub drop_off_points: Vec<NodeMetrics>,
    pub execution_metrics: ExecutionMetrics,
    pub ab_test_results: Option<ABTestResults>,
}

/// Metrics for individual nodes
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct NodeMetrics {
    pub node_id: Uuid,
    pub visits: u64,
    pub completions: u64,
    pub average_time_seconds: f64,
    pub drop_off_rate: f64,
    pub error_count: u64,
}

/// Overall execution metrics
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ExecutionMetrics {
    pub fastest_execution_seconds: f64,
    pub slowest_execution_seconds: f64,
    pub median_execution_seconds: f64,
    pub error_rate: f64,
    pub timeout_rate: f64,
    pub retry_rate: f64,
}

/// A/B test results
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ABTestResults {
    pub test_id: Uuid,
    pub variant_a_conversions: u64,
    pub variant_b_conversions: u64,
    pub confidence_level: f64,
    pub winner: Option<String>,
}

// Request/Response DTOs for API endpoints

/// Create flow request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateFlowRequest {
    pub name: String,
    pub description: Option<String>,
    pub template_id: Option<Uuid>,
}

/// Update flow request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateFlowRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub nodes: Option<Vec<NodeDefinition>>,
    pub connections: Option<Vec<Connection>>,
    pub variables: Option<HashMap<String, String>>,
    pub settings: Option<FlowSettings>,
}

/// Test flow request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct TestFlowRequest {
    pub test_phone: String,
    pub initial_variables: Option<HashMap<String, String>>,
}

/// Execute flow request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ExecuteFlowRequest {
    pub user_phone: String,
    pub initial_variables: Option<HashMap<String, String>>,
    pub webhook_url: Option<String>,
}

/// Flow input request (for user responses)
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FlowInputRequest {
    pub input: String,
    pub input_type: Option<String>,
}

/// Flow execution engine
pub struct FlowExecutionEngine {
    flows: HashMap<Uuid, FlowDefinition>,
    sessions: HashMap<Uuid, FlowSession>,
    templates: HashMap<Uuid, FlowTemplate>,
    analytics: HashMap<Uuid, FlowAnalytics>,
}

impl Default for FlowSettings {
    fn default() -> Self {
        FlowSettings {
            timeout_minutes: 30,
            max_iterations: 100,
            enable_analytics: true,
            enable_ab_testing: false,
            retry_attempts: 3,
            error_handling: ErrorHandlingStrategy::StopFlow,
        }
    }
}

impl FlowExecutionEngine {
    pub fn new() -> Self {
        Self {
            flows: HashMap::new(),
            sessions: HashMap::new(),
            templates: Self::create_default_templates(),
            analytics: HashMap::new(),
        }
    }

    /// Create a new flow
    pub fn create_flow(&mut self, request: CreateFlowRequest, created_by: String) -> Result<FlowDefinition, String> {
        let flow_id = Uuid::new_v4();
        let now = Utc::now();

        let flow = if let Some(template_id) = request.template_id {
            if let Some(template) = self.templates.get(&template_id) {
                let mut flow = template.flow_definition.clone();
                flow.id = flow_id;
                flow.name = request.name;
                flow.description = request.description;
                flow.created_at = now;
                flow.updated_at = now;
                flow.created_by = created_by;
                flow.version = 1;
                flow.is_published = false;
                flow
            } else {
                return Err("Template not found".to_string());
            }
        } else {
            FlowDefinition {
                id: flow_id,
                name: request.name,
                description: request.description,
                version: 1,
                is_published: false,
                created_at: now,
                updated_at: now,
                created_by,
                nodes: vec![Self::create_start_node_default()],
                connections: Vec::new(),
                variables: HashMap::new(),
                settings: FlowSettings::default(),
            }
        };

        self.flows.insert(flow_id, flow.clone());
        Ok(flow)
    }

    /// Update an existing flow
    pub fn update_flow(&mut self, flow_id: Uuid, request: UpdateFlowRequest) -> Result<FlowDefinition, String> {
        let flow = self.flows.get_mut(&flow_id).ok_or("Flow not found")?;

        if let Some(name) = request.name {
            flow.name = name;
        }
        if let Some(description) = request.description {
            flow.description = Some(description);
        }
        if let Some(nodes) = request.nodes {
            flow.nodes = nodes;
        }
        if let Some(connections) = request.connections {
            flow.connections = connections;
        }
        if let Some(variables) = request.variables {
            flow.variables = variables;
        }
        if let Some(settings) = request.settings {
            flow.settings = settings;
        }

        flow.updated_at = Utc::now();
        flow.version += 1;

        Ok(flow.clone())
    }

    /// Validate a flow
    pub fn validate_flow(&self, flow: &FlowDefinition) -> FlowValidationResult {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Check for start node
        let start_nodes: Vec<_> = flow.nodes.iter().filter(|n| matches!(n.node_type, NodeType::Start)).collect();
        if start_nodes.is_empty() {
            errors.push(ValidationError {
                error_type: ValidationErrorType::MissingStartNode,
                message: "Flow must have a start node".to_string(),
                node_id: None,
                severity: Severity::Error,
            });
        } else if start_nodes.len() > 1 {
            errors.push(ValidationError {
                error_type: ValidationErrorType::MultipleStartNodes,
                message: "Flow cannot have multiple start nodes".to_string(),
                node_id: None,
                severity: Severity::Error,
            });
        }

        // Check for dead ends
        for node in &flow.nodes {
            if matches!(node.node_type, NodeType::End) {
                continue;
            }

            let has_outgoing = flow.connections.iter().any(|c| c.from_node == node.id);
            if !has_outgoing {
                errors.push(ValidationError {
                    error_type: ValidationErrorType::DeadEnd,
                    message: format!("Node '{}' has no outgoing connections", node.metadata.label),
                    node_id: Some(node.id),
                    severity: Severity::Error,
                });
            }
        }

        // Check for unreachable nodes
        if !start_nodes.is_empty() {
            let reachable = self.find_reachable_nodes(flow, start_nodes[0].id);
            for node in &flow.nodes {
                if !reachable.contains(&node.id) && !matches!(node.node_type, NodeType::Start) {
                    warnings.push(ValidationError {
                        error_type: ValidationErrorType::UnreachableNode,
                        message: format!("Node '{}' is unreachable", node.metadata.label),
                        node_id: Some(node.id),
                        severity: Severity::Warning,
                    });
                }
            }
        }

        // Check for circular references
        if self.has_circular_references(flow) {
            errors.push(ValidationError {
                error_type: ValidationErrorType::CircularReference,
                message: "Flow contains circular references that could cause infinite loops".to_string(),
                node_id: None,
                severity: Severity::Error,
            });
        }

        // Calculate performance score
        let performance_score = self.calculate_performance_score(flow, &errors, &warnings);

        FlowValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
            performance_score,
        }
    }

    /// Execute a flow for a user
    pub async fn execute_flow(&mut self, flow_id: Uuid, request: ExecuteFlowRequest) -> Result<FlowSession, String> {
        let flow = self.flows.get(&flow_id).ok_or("Flow not found")?.clone();

        if !flow.is_published {
            return Err("Flow is not published".to_string());
        }

        // Validate flow before execution
        let validation = self.validate_flow(&flow);
        if !validation.is_valid {
            return Err("Flow validation failed".to_string());
        }

        // Find start node
        let start_node = flow.nodes.iter()
            .find(|n| matches!(n.node_type, NodeType::Start))
            .ok_or("No start node found")?;

        // Create execution context
        let session_id = Uuid::new_v4();
        let now = Utc::now();
        let timeout_duration = Duration::minutes(flow.settings.timeout_minutes as i64);

        let context = ExecutionContext {
            session_id,
            flow_id,
            current_node: start_node.id,
            variables: request.initial_variables.unwrap_or_default(),
            started_at: now,
            last_activity: now,
            user_phone: request.user_phone.clone(),
            conversation_history: Vec::new(),
            execution_path: vec![start_node.id],
            retry_count: 0,
            status: ExecutionStatus::Running,
        };

        let session = FlowSession {
            id: session_id,
            flow_id,
            user_phone: request.user_phone,
            context,
            created_at: now,
            expires_at: now + timeout_duration,
        };

        self.sessions.insert(session_id, session.clone());

        // Start execution
        self.process_next_node(session_id).await?;

        Ok(session)
    }

    /// Process user input in a flow session
    pub async fn process_user_input(&mut self, session_id: Uuid, input: FlowInputRequest) -> Result<(), String> {
        let session = self.sessions.get_mut(&session_id).ok_or("Session not found")?;
        
        // Check if session is expired
        if Utc::now() > session.expires_at {
            session.context.status = ExecutionStatus::Timeout;
            return Err("Session expired".to_string());
        }

        // Add user input to conversation history
        session.context.conversation_history.push(ConversationEntry {
            timestamp: Utc::now(),
            message: input.input.clone(),
            sender: MessageSender::User,
            node_id: Some(session.context.current_node),
        });

        session.context.last_activity = Utc::now();

        // Process the input based on current node type
        let flow = self.flows.get(&session.flow_id).ok_or("Flow not found")?.clone();
        let current_node = flow.nodes.iter()
            .find(|n| n.id == session.context.current_node)
            .ok_or("Current node not found")?;

        match &current_node.data {
            NodeData::Question(question_data) => {
                // Clone needed values before borrowing
                let question_validation = question_data.validation.clone();
                let save_to_variable = question_data.save_to_variable.clone();
                let retry_message = question_data.retry_message.clone();
                let input_value = input.input.clone();

                // Validate input
                let validation_result = if let Some(validation) = &question_validation {
                    Self::validate_input_static(&input_value, validation)
                } else {
                    Ok(())
                };

                // Handle validation failure
                if let Err(error) = validation_result {
                    // Send retry message
                    if let Some(retry_msg) = &retry_message {
                        let phone = session.user_phone.clone();
                        self.send_message_to_user(&phone, retry_msg).await?;
                    }
                    return Err(format!("Input validation failed: {}", error));
                }

                // Save input to variable
                session.context.variables.insert(save_to_variable, input_value);

                // Move to next node
                self.process_next_node(session_id).await?;
            },
            _ => {
                return Err("Current node is not waiting for input".to_string());
            }
        }

        Ok(())
    }

    /// Process the next node in the flow
    fn process_next_node(&mut self, session_id: Uuid) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + '_>> {
        Box::pin(async move {
        let session = self.sessions.get(&session_id).ok_or("Session not found")?.clone();
        let flow = self.flows.get(&session.flow_id).ok_or("Flow not found")?.clone();

        let current_node = flow.nodes.iter()
            .find(|n| n.id == session.context.current_node)
            .ok_or("Current node not found")?;

        match &current_node.data {
            NodeData::Start => {
                self.move_to_next_node(session_id, current_node.id).await?;
            },
            NodeData::Message(message_data) => {
                // Send message to user
                self.send_message_to_user(&session.user_phone, &message_data.text).await?;

                // Add delay if specified
                if let Some(delay) = message_data.delay_seconds {
                    sleep(TokioDuration::from_secs(delay as u64)).await;
                }

                self.move_to_next_node(session_id, current_node.id).await?;
            },
            NodeData::Question(question_data) => {
                // Send question to user
                self.send_message_to_user(&session.user_phone, &question_data.question).await?;

                // Set status to waiting for input
                let session = self.sessions.get_mut(&session_id).unwrap();
                session.context.status = ExecutionStatus::WaitingForInput;

                // Set timeout if specified
                if let Some(timeout) = question_data.timeout_seconds {
                    let session_id_clone = session_id;
                    tokio::spawn(async move {
                        sleep(TokioDuration::from_secs(timeout as u64)).await;
                        // Handle timeout logic here
                    });
                }
            },
            NodeData::Condition(condition_data) => {
                let result = self.evaluate_conditions(condition_data, &session.context.variables)?;
                let next_connection = flow.connections.iter()
                    .find(|c| c.from_node == current_node.id && 
                        c.condition.as_ref().map_or(true, |cond| cond == if result { "true" } else { "false" }))
                    .ok_or("No matching connection found for condition result")?;

                self.move_to_specific_node(session_id, next_connection.to_node).await?;
            },
            NodeData::Action(action_data) => {
                self.execute_action(session_id, action_data).await?;
                self.move_to_next_node(session_id, current_node.id).await?;
            },
            NodeData::Wait(wait_data) => {
                match wait_data.wait_type {
                    WaitType::FixedDelay => {
                        if let Some(duration) = wait_data.duration_seconds {
                            sleep(TokioDuration::from_secs(duration as u64)).await;
                        }
                        self.move_to_next_node(session_id, current_node.id).await?;
                    },
                    WaitType::UserInput => {
                        let session = self.sessions.get_mut(&session_id).unwrap();
                        session.context.status = ExecutionStatus::WaitingForInput;
                    },
                    _ => {
                        // Handle other wait types
                        self.move_to_next_node(session_id, current_node.id).await?;
                    }
                }
            },
            NodeData::Integration(integration_data) => {
                self.execute_integration(session_id, integration_data).await?;
                self.move_to_next_node(session_id, current_node.id).await?;
            },
            NodeData::Template(template_data) => {
                self.send_template_message(session_id, template_data).await?;
                self.move_to_next_node(session_id, current_node.id).await?;
            },
            NodeData::End(end_data) => {
                let (user_phone, variables) = {
                    let session = self.sessions.get_mut(&session_id).unwrap();
                    session.context.status = if end_data.success {
                        ExecutionStatus::Completed
                    } else {
                        ExecutionStatus::Failed
                    };
                    (session.user_phone.clone(), session.context.variables.clone())
                };

                if let Some(message) = &end_data.message {
                    self.send_message_to_user(&user_phone, message).await?;
                }

                // Start next flow if specified
                if let Some(next_flow_id) = end_data.next_flow_id {
                    let execute_request = ExecuteFlowRequest {
                        user_phone,
                        initial_variables: Some(variables),
                        webhook_url: None,
                    };
                    self.execute_flow(next_flow_id, execute_request).await?;
                }
            }
        }

        Ok(())
        })
    }

    /// Move to the next connected node
    fn move_to_next_node(&mut self, session_id: Uuid, current_node_id: Uuid) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + '_>> {
        Box::pin(async move {
        let session = self.sessions.get(&session_id).ok_or("Session not found")?.clone();
        let flow = self.flows.get(&session.flow_id).ok_or("Flow not found")?;

        let next_connection = flow.connections.iter()
            .find(|c| c.from_node == current_node_id)
            .ok_or("No outgoing connection found")?;

        self.move_to_specific_node(session_id, next_connection.to_node).await
        })
    }

    /// Move to a specific node
    fn move_to_specific_node(&mut self, session_id: Uuid, node_id: Uuid) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), String>> + '_>> {
        Box::pin(async move {
        let session = self.sessions.get_mut(&session_id).ok_or("Session not found")?;
        
        session.context.current_node = node_id;
        session.context.execution_path.push(node_id);
        session.context.last_activity = Utc::now();

        // Check for infinite loops
        if session.context.execution_path.len() > session.context.variables.get("max_iterations")
            .and_then(|v| v.parse().ok())
            .unwrap_or(100) {
            session.context.status = ExecutionStatus::Failed;
            return Err("Maximum iterations exceeded - possible infinite loop".to_string());
        }

        self.process_next_node(session_id).await
        })
    }

    /// Helper functions for flow operations

    fn create_start_node_default() -> NodeDefinition {
        NodeDefinition {
            id: Uuid::new_v4(),
            node_type: NodeType::Start,
            position: Position { x: 100.0, y: 100.0 },
            data: NodeData::Start,
            metadata: NodeMetadata {
                label: "Start".to_string(),
                description: Some("Flow starting point".to_string()),
                color: Some("#4CAF50".to_string()),
                icon: Some("play_arrow".to_string()),
                tags: vec!["start".to_string()],
            },
        }
    }

    fn find_reachable_nodes(&self, flow: &FlowDefinition, start_node: Uuid) -> HashSet<Uuid> {
        let mut reachable = HashSet::new();
        let mut queue = VecDeque::new();
        
        queue.push_back(start_node);
        reachable.insert(start_node);

        while let Some(node_id) = queue.pop_front() {
            for connection in &flow.connections {
                if connection.from_node == node_id && !reachable.contains(&connection.to_node) {
                    reachable.insert(connection.to_node);
                    queue.push_back(connection.to_node);
                }
            }
        }

        reachable
    }

    fn has_circular_references(&self, flow: &FlowDefinition) -> bool {
        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();

        for node in &flow.nodes {
            if !visited.contains(&node.id) {
                if self.has_cycle_util(flow, node.id, &mut visited, &mut rec_stack) {
                    return true;
                }
            }
        }

        false
    }

    fn has_cycle_util(&self, flow: &FlowDefinition, node_id: Uuid, visited: &mut HashSet<Uuid>, rec_stack: &mut HashSet<Uuid>) -> bool {
        visited.insert(node_id);
        rec_stack.insert(node_id);

        for connection in &flow.connections {
            if connection.from_node == node_id {
                if !visited.contains(&connection.to_node) {
                    if self.has_cycle_util(flow, connection.to_node, visited, rec_stack) {
                        return true;
                    }
                } else if rec_stack.contains(&connection.to_node) {
                    return true;
                }
            }
        }

        rec_stack.remove(&node_id);
        false
    }

    fn calculate_performance_score(&self, flow: &FlowDefinition, errors: &[ValidationError], warnings: &[ValidationError]) -> u32 {
        let mut score = 100u32;

        // Penalize errors and warnings
        score = score.saturating_sub(errors.len() as u32 * 20);
        score = score.saturating_sub(warnings.len() as u32 * 5);

        // Penalize complexity
        if flow.nodes.len() > 20 {
            score = score.saturating_sub(10);
        }
        if flow.connections.len() > 30 {
            score = score.saturating_sub(5);
        }

        score
    }

    fn evaluate_conditions(&self, condition_data: &ConditionNodeData, variables: &HashMap<String, String>) -> Result<bool, String> {
        let results: Vec<bool> = condition_data.conditions.iter()
            .map(|condition| self.evaluate_single_condition(condition, variables))
            .collect::<Result<Vec<_>, _>>()?;

        match condition_data.operator {
            LogicalOperator::And => Ok(results.iter().all(|&x| x)),
            LogicalOperator::Or => Ok(results.iter().any(|&x| x)),
        }
    }

    fn evaluate_single_condition(&self, condition: &Condition, variables: &HashMap<String, String>) -> Result<bool, String> {
        let variable_value = variables.get(&condition.variable)
            .ok_or_else(|| format!("Variable '{}' not found", condition.variable))?;

        match condition.operator {
            ComparisonOperator::Equals => Ok(variable_value == &condition.value),
            ComparisonOperator::NotEquals => Ok(variable_value != &condition.value),
            ComparisonOperator::Contains => Ok(variable_value.contains(&condition.value)),
            ComparisonOperator::NotContains => Ok(!variable_value.contains(&condition.value)),
            ComparisonOperator::GreaterThan => {
                let var_num: f64 = variable_value.parse().map_err(|_| "Variable is not a number")?;
                let cond_num: f64 = condition.value.parse().map_err(|_| "Condition value is not a number")?;
                Ok(var_num > cond_num)
            },
            ComparisonOperator::LessThan => {
                let var_num: f64 = variable_value.parse().map_err(|_| "Variable is not a number")?;
                let cond_num: f64 = condition.value.parse().map_err(|_| "Condition value is not a number")?;
                Ok(var_num < cond_num)
            },
            ComparisonOperator::GreaterThanOrEqual => {
                let var_num: f64 = variable_value.parse().map_err(|_| "Variable is not a number")?;
                let cond_num: f64 = condition.value.parse().map_err(|_| "Condition value is not a number")?;
                Ok(var_num >= cond_num)
            },
            ComparisonOperator::LessThanOrEqual => {
                let var_num: f64 = variable_value.parse().map_err(|_| "Variable is not a number")?;
                let cond_num: f64 = condition.value.parse().map_err(|_| "Condition value is not a number")?;
                Ok(var_num <= cond_num)
            },
            ComparisonOperator::IsEmpty => Ok(variable_value.is_empty()),
            ComparisonOperator::IsNotEmpty => Ok(!variable_value.is_empty()),
        }
    }

    fn validate_input_static(input: &str, validation: &ValidationRule) -> Result<(), String> {
        if let Some(min_len) = validation.min_length {
            if input.len() < min_len as usize {
                return Err(format!("Input must be at least {} characters", min_len));
            }
        }

        if let Some(max_len) = validation.max_length {
            if input.len() > max_len as usize {
                return Err(format!("Input must be at most {} characters", max_len));
            }
        }

        if let Some(pattern) = &validation.pattern {
            let regex = regex::Regex::new(pattern).map_err(|_| "Invalid regex pattern")?;
            if !regex.is_match(input) {
                return Err("Input does not match required pattern".to_string());
            }
        }

        Ok(())
    }

    fn validate_input(&self, input: &str, validation: &ValidationRule) -> Result<(), String> {
        Self::validate_input_static(input, validation)
    }

    async fn send_message_to_user(&self, phone: &str, message: &str) -> Result<(), String> {
        // Integrate with existing WhatsApp handlers
        println!("Sending message to {}: {}", phone, message);
        // TODO: Implement actual WhatsApp API integration
        Ok(())
    }

    async fn execute_action(&mut self, session_id: Uuid, action_data: &ActionNodeData) -> Result<(), String> {
        match action_data.action_type {
            ActionType::HttpRequest => {
                // Implement HTTP request
                println!("Executing HTTP request with parameters: {:?}", action_data.parameters);
            },
            ActionType::DatabaseQuery => {
                // Implement database query
                println!("Executing database query with parameters: {:?}", action_data.parameters);
            },
            ActionType::SendEmail => {
                // Implement email sending
                println!("Sending email with parameters: {:?}", action_data.parameters);
            },
            ActionType::CreateTicket => {
                // Implement ticket creation
                println!("Creating ticket with parameters: {:?}", action_data.parameters);
            },
            ActionType::UpdateCRM => {
                // Implement CRM update
                println!("Updating CRM with parameters: {:?}", action_data.parameters);
            },
            ActionType::CallWebhook => {
                // Implement webhook call
                println!("Calling webhook with parameters: {:?}", action_data.parameters);
            },
            ActionType::RunScript => {
                // Implement script execution
                println!("Running script with parameters: {:?}", action_data.parameters);
            },
        }

        // Save result to variable if specified
        if let Some(var_name) = &action_data.save_result_to {
            let session = self.sessions.get_mut(&session_id).unwrap();
            session.context.variables.insert(var_name.clone(), "action_result".to_string());
        }

        Ok(())
    }

    async fn execute_integration(&mut self, session_id: Uuid, integration_data: &IntegrationNodeData) -> Result<(), String> {
        match integration_data.integration_type {
            IntegrationType::ERP => {
                println!("Executing ERP integration to endpoint: {}", integration_data.endpoint);
            },
            IntegrationType::CRM => {
                println!("Executing CRM integration to endpoint: {}", integration_data.endpoint);
            },
            IntegrationType::AI => {
                println!("Executing AI integration to endpoint: {}", integration_data.endpoint);
            },
            IntegrationType::Database => {
                println!("Executing database integration to endpoint: {}", integration_data.endpoint);
            },
            IntegrationType::CustomAPI => {
                println!("Executing custom API integration to endpoint: {}", integration_data.endpoint);
            },
            IntegrationType::WebService => {
                println!("Executing web service integration to endpoint: {}", integration_data.endpoint);
            },
        }

        // Process response mapping
        for (var_name, json_path) in &integration_data.response_mapping {
            let session = self.sessions.get_mut(&session_id).unwrap();
            session.context.variables.insert(var_name.clone(), format!("response_value_{}", json_path));
        }

        Ok(())
    }

    async fn send_template_message(&self, session_id: Uuid, template_data: &TemplateNodeData) -> Result<(), String> {
        let session = self.sessions.get(&session_id).ok_or("Session not found")?;
        
        println!("Sending WhatsApp template '{}' to {}", template_data.template_name, session.user_phone);
        println!("Language: {}", template_data.language);
        println!("Parameters: {:?}", template_data.parameters);

        // TODO: Integrate with existing WhatsApp template functionality
        
        Ok(())
    }

    /// Create default industry templates
    fn create_default_templates() -> HashMap<Uuid, FlowTemplate> {
        let mut templates = HashMap::new();

        // ISP Support Template
        let isp_template_id = Uuid::new_v4();
        templates.insert(isp_template_id, FlowTemplate {
            id: isp_template_id,
            name: "ISP Technical Support".to_string(),
            description: "Automated technical support flow for internet service providers".to_string(),
            industry: Industry::ISP,
            use_case: "Technical Support".to_string(),
            flow_definition: Self::create_isp_support_flow(),
            preview_image: None,
            tags: vec!["support".to_string(), "technical".to_string(), "isp".to_string()],
        });

        // E-commerce Template
        let ecommerce_template_id = Uuid::new_v4();
        templates.insert(ecommerce_template_id, FlowTemplate {
            id: ecommerce_template_id,
            name: "E-commerce Order Support".to_string(),
            description: "Order tracking and customer support for e-commerce".to_string(),
            industry: Industry::ECommerce,
            use_case: "Order Support".to_string(),
            flow_definition: Self::create_ecommerce_support_flow(),
            preview_image: None,
            tags: vec!["ecommerce".to_string(), "orders".to_string(), "support".to_string()],
        });

        templates
    }

    fn create_isp_support_flow() -> FlowDefinition {
        // Create a sample ISP support flow
        let flow_id = Uuid::new_v4();
        let start_node_id = Uuid::new_v4();
        let welcome_msg_id = Uuid::new_v4();
        let problem_question_id = Uuid::new_v4();
        let condition_node_id = Uuid::new_v4();
        let restart_modem_id = Uuid::new_v4();
        let escalate_id = Uuid::new_v4();
        let end_node_id = Uuid::new_v4();

        FlowDefinition {
            id: flow_id,
            name: "ISP Technical Support".to_string(),
            description: Some("Automated technical support flow".to_string()),
            version: 1,
            is_published: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: "system".to_string(),
            nodes: vec![
                NodeDefinition {
                    id: start_node_id,
                    node_type: NodeType::Start,
                    position: Position { x: 100.0, y: 100.0 },
                    data: NodeData::Start,
                    metadata: NodeMetadata {
                        label: "Start".to_string(),
                        description: Some("Flow start".to_string()),
                        color: Some("#4CAF50".to_string()),
                        icon: Some("play_arrow".to_string()),
                        tags: vec!["start".to_string()],
                    },
                },
                NodeDefinition {
                    id: welcome_msg_id,
                    node_type: NodeType::Message,
                    position: Position { x: 100.0, y: 200.0 },
                    data: NodeData::Message(MessageNodeData {
                        text: "Olá! Bem-vindo ao suporte técnico. Vou ajudar você a resolver seu problema de internet.".to_string(),
                        media_url: None,
                        media_type: None,
                        delay_seconds: Some(1),
                    }),
                    metadata: NodeMetadata {
                        label: "Welcome Message".to_string(),
                        description: Some("Welcome the user".to_string()),
                        color: Some("#2196F3".to_string()),
                        icon: Some("message".to_string()),
                        tags: vec!["message".to_string()],
                    },
                },
                NodeDefinition {
                    id: problem_question_id,
                    node_type: NodeType::Question,
                    position: Position { x: 100.0, y: 300.0 },
                    data: NodeData::Question(QuestionNodeData {
                        question: "Qual problema você está enfrentando?\n1. Internet lenta\n2. Sem conexão\n3. Instabilidade\n4. Outro".to_string(),
                        input_type: InputType::Choice(vec!["1".to_string(), "2".to_string(), "3".to_string(), "4".to_string()]),
                        validation: None,
                        save_to_variable: "problem_type".to_string(),
                        timeout_seconds: Some(60),
                        retry_message: Some("Por favor, escolha uma opção válida (1, 2, 3 ou 4)".to_string()),
                    }),
                    metadata: NodeMetadata {
                        label: "Problem Type".to_string(),
                        description: Some("Ask about the problem type".to_string()),
                        color: Some("#FF9800".to_string()),
                        icon: Some("help".to_string()),
                        tags: vec!["question".to_string()],
                    },
                },
            ],
            connections: vec![
                Connection {
                    id: Uuid::new_v4(),
                    from_node: start_node_id,
                    to_node: welcome_msg_id,
                    condition: None,
                    label: None,
                },
                Connection {
                    id: Uuid::new_v4(),
                    from_node: welcome_msg_id,
                    to_node: problem_question_id,
                    condition: None,
                    label: None,
                },
            ],
            variables: HashMap::new(),
            settings: FlowSettings::default(),
        }
    }

    fn create_ecommerce_support_flow() -> FlowDefinition {
        // Create a sample e-commerce support flow
        let flow_id = Uuid::new_v4();
        let start_node_id = Uuid::new_v4();

        FlowDefinition {
            id: flow_id,
            name: "E-commerce Order Support".to_string(),
            description: Some("Order tracking and support flow".to_string()),
            version: 1,
            is_published: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            created_by: "system".to_string(),
            nodes: vec![
                NodeDefinition {
                    id: start_node_id,
                    node_type: NodeType::Start,
                    position: Position { x: 100.0, y: 100.0 },
                    data: NodeData::Start,
                    metadata: NodeMetadata {
                        label: "Start".to_string(),
                        description: Some("Flow start".to_string()),
                        color: Some("#4CAF50".to_string()),
                        icon: Some("play_arrow".to_string()),
                        tags: vec!["start".to_string()],
                    },
                },
            ],
            connections: Vec::new(),
            variables: HashMap::new(),
            settings: FlowSettings::default(),
        }
    }

    /// Get flow analytics
    pub fn get_flow_analytics(&self, flow_id: Uuid, start_date: DateTime<Utc>, end_date: DateTime<Utc>) -> Option<FlowAnalytics> {
        self.analytics.get(&flow_id).cloned()
    }

    /// Get all templates
    pub fn get_templates(&self) -> Vec<FlowTemplate> {
        self.templates.values().cloned().collect()
    }

    /// Get templates by industry
    pub fn get_templates_by_industry(&self, industry: Industry) -> Vec<FlowTemplate> {
        self.templates.values()
            .filter(|template| template.industry == industry)
            .cloned()
            .collect()
    }
}

// API Handlers

/// Create a new flow
pub async fn create_flow(
    request: web::Json<CreateFlowRequest>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let mut engine = engine.lock().unwrap();
    
    match engine.create_flow(request.into_inner(), "current_user".to_string()) {
        Ok(flow) => Ok(HttpResponse::Ok().json(flow)),
        Err(error) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": error
        }))),
    }
}

/// Get all flows
pub async fn get_flows(
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let engine = engine.lock().unwrap();
    let flows: Vec<_> = engine.flows.values().cloned().collect();
    Ok(HttpResponse::Ok().json(flows))
}

/// Get a specific flow
pub async fn get_flow(
    path: web::Path<Uuid>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let flow_id = path.into_inner();
    let engine = engine.lock().unwrap();
    
    match engine.flows.get(&flow_id) {
        Some(flow) => Ok(HttpResponse::Ok().json(flow)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Flow not found"
        }))),
    }
}

/// Update a flow
pub async fn update_flow(
    path: web::Path<Uuid>,
    request: web::Json<UpdateFlowRequest>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let flow_id = path.into_inner();
    let mut engine = engine.lock().unwrap();
    
    match engine.update_flow(flow_id, request.into_inner()) {
        Ok(flow) => Ok(HttpResponse::Ok().json(flow)),
        Err(error) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": error
        }))),
    }
}

/// Delete a flow
pub async fn delete_flow(
    path: web::Path<Uuid>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let flow_id = path.into_inner();
    let mut engine = engine.lock().unwrap();
    
    match engine.flows.remove(&flow_id) {
        Some(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Flow deleted successfully"
        }))),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Flow not found"
        }))),
    }
}

/// Validate a flow
pub async fn validate_flow(
    path: web::Path<Uuid>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let flow_id = path.into_inner();
    let engine = engine.lock().unwrap();
    
    match engine.flows.get(&flow_id) {
        Some(flow) => {
            let validation_result = engine.validate_flow(flow);
            Ok(HttpResponse::Ok().json(validation_result))
        },
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Flow not found"
        }))),
    }
}

/// Test a flow
pub async fn test_flow(
    path: web::Path<Uuid>,
    request: web::Json<TestFlowRequest>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let flow_id = path.into_inner();
    let mut engine = engine.lock().unwrap();
    
    let execute_request = ExecuteFlowRequest {
        user_phone: request.test_phone.clone(),
        initial_variables: request.initial_variables.clone(),
        webhook_url: None,
    };
    
    match engine.execute_flow(flow_id, execute_request).await {
        Ok(session) => Ok(HttpResponse::Ok().json(session)),
        Err(error) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": error
        }))),
    }
}

/// Publish a flow
pub async fn publish_flow(
    path: web::Path<Uuid>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let flow_id = path.into_inner();
    let mut engine = engine.lock().unwrap();
    
    // Validate first to avoid borrow conflicts
    let validation_result = if let Some(flow) = engine.flows.get(&flow_id) {
        engine.validate_flow(flow)
    } else {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Flow not found"
        })));
    };

    if !validation_result.is_valid {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Cannot publish invalid flow",
            "validation_errors": validation_result.errors
        })));
    }

    match engine.flows.get_mut(&flow_id) {
        Some(flow) => {
            flow.is_published = true;
            flow.updated_at = Utc::now();
            
            Ok(HttpResponse::Ok().json(flow.clone()))
        },
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Flow not found"
        }))),
    }
}

/// Execute a flow
pub async fn execute_flow(
    path: web::Path<Uuid>,
    request: web::Json<ExecuteFlowRequest>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let flow_id = path.into_inner();
    let mut engine = engine.lock().unwrap();
    
    match engine.execute_flow(flow_id, request.into_inner()).await {
        Ok(session) => Ok(HttpResponse::Ok().json(session)),
        Err(error) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": error
        }))),
    }
}

/// Get flow session
pub async fn get_flow_session(
    path: web::Path<Uuid>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let session_id = path.into_inner();
    let engine = engine.lock().unwrap();
    
    match engine.sessions.get(&session_id) {
        Some(session) => Ok(HttpResponse::Ok().json(session)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Session not found"
        }))),
    }
}

/// Send input to flow session
pub async fn send_flow_input(
    path: web::Path<Uuid>,
    request: web::Json<FlowInputRequest>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let session_id = path.into_inner();
    let mut engine = engine.lock().unwrap();
    
    match engine.process_user_input(session_id, request.into_inner()).await {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Input processed successfully"
        }))),
        Err(error) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": error
        }))),
    }
}

/// Get flow templates
pub async fn get_flow_templates(
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let engine = engine.lock().unwrap();
    let templates = engine.get_templates();
    Ok(HttpResponse::Ok().json(templates))
}

/// Get flow analytics
pub async fn get_flow_analytics(
    path: web::Path<Uuid>,
    engine: web::Data<std::sync::Arc<std::sync::Mutex<FlowExecutionEngine>>>,
) -> Result<HttpResponse, actix_web::Error> {
    let flow_id = path.into_inner();
    let engine = engine.lock().unwrap();
    
    let start_date = Utc::now() - Duration::days(30);
    let end_date = Utc::now();
    
    match engine.get_flow_analytics(flow_id, start_date, end_date) {
        Some(analytics) => Ok(HttpResponse::Ok().json(analytics)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Analytics not found"
        }))),
    }
}

/// Configure flow routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/flows")
            .route("", web::post().to(create_flow))
            .route("", web::get().to(get_flows))
            .route("/{id}", web::get().to(get_flow))
            .route("/{id}", web::put().to(update_flow))
            .route("/{id}", web::delete().to(delete_flow))
            .route("/{id}/validate", web::post().to(validate_flow))
            .route("/{id}/test", web::post().to(test_flow))
            .route("/{id}/publish", web::post().to(publish_flow))
            .route("/{id}/execute", web::post().to(execute_flow))
            .route("/{id}/analytics", web::get().to(get_flow_analytics))
            .route("/sessions/{session_id}", web::get().to(get_flow_session))
            .route("/sessions/{session_id}/input", web::post().to(send_flow_input))
            .route("/templates", web::get().to(get_flow_templates))
    );
}