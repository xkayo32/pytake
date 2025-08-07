//! Flow management API handlers

use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{info, warn, error};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::middleware::error_handler::ApiError;
use crate::middleware::auth::Claims;
use crate::AppState;

/// Request structure for creating a flow
#[derive(Debug, Deserialize)]
pub struct CreateFlowRequest {
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<FlowNode>,
    pub edges: Vec<FlowEdge>,
}

/// Request structure for updating a flow
#[derive(Debug, Deserialize)]
pub struct UpdateFlowRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub nodes: Option<Vec<FlowNode>>,
    pub edges: Option<Vec<FlowEdge>>,
    pub status: Option<String>,
}

/// Flow node structure from frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlowNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub position: NodePosition,
    pub data: NodeData,
}

/// Node position
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NodePosition {
    pub x: f64,
    pub y: f64,
}

/// Node data
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NodeData {
    pub label: String,
    pub description: Option<String>,
    pub icon: String,
    pub color: String,
    pub config: serde_json::Value,
    #[serde(rename = "isConfigured")]
    pub is_configured: bool,
}

/// Flow edge structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlowEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "sourceHandle")]
    pub source_handle: Option<String>,
    #[serde(rename = "targetHandle")]
    pub target_handle: Option<String>,
}

/// Flow response structure
#[derive(Debug, Serialize)]
pub struct FlowResponse {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub nodes: Vec<FlowNode>,
    pub edges: Vec<FlowEdge>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_run: Option<DateTime<Utc>>,
    pub actions_count: usize,
}

/// List flows response
#[derive(Debug, Serialize)]
pub struct ListFlowsResponse {
    pub flows: Vec<FlowSummary>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
}

/// Flow summary for list view
#[derive(Debug, Serialize)]
pub struct FlowSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub trigger: String,
    pub actions_count: usize,
    pub last_run: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Create a new flow
pub async fn create_flow(
    req: HttpRequest,
    data: web::Json<CreateFlowRequest>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    info!("Creating flow '{}' for user {}", data.name, claims.sub);

    // TODO: Convert frontend flow format to backend flow entity
    // For now, we'll store the flow data as-is
    
    let flow_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    // Extract trigger type from nodes
    let trigger_type = data.nodes.iter()
        .find(|n| n.node_type == "input" || n.node_type == "trigger")
        .and_then(|n| n.data.config.get("triggerType"))
        .and_then(|t| t.as_str())
        .unwrap_or("manual")
        .to_string();

    let response = FlowResponse {
        id: flow_id.clone(),
        user_id: claims.sub.clone(),
        name: data.name.clone(),
        description: data.description.clone(),
        status: "draft".to_string(),
        nodes: data.nodes.clone(),
        edges: data.edges.clone(),
        created_at: now,
        updated_at: now,
        last_run: None,
        actions_count: data.nodes.len() - 1, // Subtract trigger node
    };

    // TODO: Save to database
    info!("Flow {} created successfully", flow_id);

    Ok(HttpResponse::Created().json(response))
}

/// List user's flows
pub async fn list_flows(
    req: HttpRequest,
    query: web::Query<ListFlowsQuery>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    info!("Listing flows for user {}", claims.sub);

    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(20);

    // TODO: Fetch from database
    // For now, return mock data
    let flows = vec![
        FlowSummary {
            id: Uuid::new_v4().to_string(),
            name: "Boas-vindas Automático".to_string(),
            description: Some("Envia mensagem de boas-vindas para novos contatos".to_string()),
            status: "active".to_string(),
            trigger: "WhatsApp Message".to_string(),
            actions_count: 3,
            last_run: Some(Utc::now() - chrono::Duration::minutes(30)),
            created_at: Utc::now() - chrono::Duration::days(7),
            updated_at: Utc::now() - chrono::Duration::days(1),
        },
        FlowSummary {
            id: Uuid::new_v4().to_string(),
            name: "Follow-up de Vendas".to_string(),
            description: Some("Acompanhamento automático após 24 horas".to_string()),
            status: "paused".to_string(),
            trigger: "Manual".to_string(),
            actions_count: 5,
            last_run: None,
            created_at: Utc::now() - chrono::Duration::days(3),
            updated_at: Utc::now() - chrono::Duration::hours(12),
        },
    ];

    let total = flows.len();

    let response = ListFlowsResponse {
        flows,
        total,
        page,
        per_page,
    };

    Ok(HttpResponse::Ok().json(response))
}

/// Get a single flow
pub async fn get_flow(
    req: HttpRequest,
    path: web::Path<String>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Getting flow {} for user {}", flow_id, claims.sub);

    // TODO: Fetch from database
    // For now, return mock data
    let response = FlowResponse {
        id: flow_id.clone(),
        user_id: claims.sub.clone(),
        name: "Boas-vindas Automático".to_string(),
        description: Some("Envia mensagem de boas-vindas para novos contatos".to_string()),
        status: "active".to_string(),
        nodes: vec![
            FlowNode {
                id: "trigger_1".to_string(),
                node_type: "input".to_string(),
                position: NodePosition { x: 250.0, y: 50.0 },
                data: NodeData {
                    label: "Início".to_string(),
                    description: Some("Nova mensagem recebida".to_string()),
                    icon: "Play".to_string(),
                    color: "#10b981".to_string(),
                    config: json!({ "triggerType": "whatsapp" }),
                    is_configured: true,
                },
            },
            FlowNode {
                id: "whatsapp_1".to_string(),
                node_type: "default".to_string(),
                position: NodePosition { x: 250.0, y: 200.0 },
                data: NodeData {
                    label: "Enviar WhatsApp".to_string(),
                    description: Some("Mensagem de boas-vindas".to_string()),
                    icon: "MessageCircle".to_string(),
                    color: "#22c55e".to_string(),
                    config: json!({
                        "messageType": "text",
                        "message": "Olá! 👋 Bem-vindo(a) ao nosso atendimento."
                    }),
                    is_configured: true,
                },
            },
        ],
        edges: vec![
            FlowEdge {
                id: "edge_trigger_whatsapp".to_string(),
                source: "trigger_1".to_string(),
                target: "whatsapp_1".to_string(),
                source_handle: None,
                target_handle: None,
            },
        ],
        created_at: Utc::now() - chrono::Duration::days(7),
        updated_at: Utc::now() - chrono::Duration::days(1),
        last_run: Some(Utc::now() - chrono::Duration::minutes(30)),
        actions_count: 1,
    };

    Ok(HttpResponse::Ok().json(response))
}

/// Update a flow
pub async fn update_flow(
    req: HttpRequest,
    path: web::Path<String>,
    data: web::Json<UpdateFlowRequest>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Updating flow {} for user {}", flow_id, claims.sub);

    // TODO: Update in database
    // For now, return success
    let response = json!({
        "id": flow_id,
        "message": "Flow updated successfully",
        "updated_at": Utc::now()
    });

    Ok(HttpResponse::Ok().json(response))
}

/// Delete a flow
pub async fn delete_flow(
    req: HttpRequest,
    path: web::Path<String>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Deleting flow {} for user {}", flow_id, claims.sub);

    // TODO: Delete from database
    
    Ok(HttpResponse::NoContent().finish())
}

/// Execute a flow manually
pub async fn execute_flow(
    req: HttpRequest,
    path: web::Path<String>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Executing flow {} for user {}", flow_id, claims.sub);

    // TODO: Execute flow through flow engine
    
    let response = json!({
        "flow_id": flow_id,
        "execution_id": Uuid::new_v4().to_string(),
        "status": "started",
        "started_at": Utc::now()
    });

    Ok(HttpResponse::Ok().json(response))
}

/// Test a flow with sample data
pub async fn test_flow(
    req: HttpRequest,
    path: web::Path<String>,
    data: web::Json<serde_json::Value>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Testing flow {} for user {}", flow_id, claims.sub);

    // TODO: Run flow in test mode
    
    let response = json!({
        "flow_id": flow_id,
        "test_id": Uuid::new_v4().to_string(),
        "status": "success",
        "results": [
            {
                "node_id": "trigger_1",
                "status": "success",
                "output": { "triggered": true }
            },
            {
                "node_id": "whatsapp_1", 
                "status": "success",
                "output": { "message_sent": true }
            }
        ],
        "completed_at": Utc::now()
    });

    Ok(HttpResponse::Ok().json(response))
}

/// Get flow execution history
pub async fn get_flow_history(
    req: HttpRequest,
    path: web::Path<String>,
    query: web::Query<PaginationQuery>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Getting execution history for flow {} for user {}", flow_id, claims.sub);

    // TODO: Fetch from database
    
    let response = json!({
        "flow_id": flow_id,
        "executions": [],
        "total": 0,
        "page": query.page.unwrap_or(1),
        "per_page": query.per_page.unwrap_or(20)
    });

    Ok(HttpResponse::Ok().json(response))
}

/// Activate a flow
pub async fn activate_flow(
    req: HttpRequest,
    path: web::Path<String>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Activating flow {} for user {}", flow_id, claims.sub);

    // TODO: Update flow status in database
    
    let response = json!({
        "id": flow_id,
        "status": "active",
        "activated_at": Utc::now()
    });

    Ok(HttpResponse::Ok().json(response))
}

/// Pause a flow
pub async fn pause_flow(
    req: HttpRequest,
    path: web::Path<String>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Pausing flow {} for user {}", flow_id, claims.sub);

    // TODO: Update flow status in database
    
    let response = json!({
        "id": flow_id,
        "status": "paused",
        "paused_at": Utc::now()
    });

    Ok(HttpResponse::Ok().json(response))
}

/// Archive a flow
pub async fn archive_flow(
    req: HttpRequest,
    path: web::Path<String>,
    _state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>()
        .ok_or_else(|| ApiError::Unauthorized("Missing authentication".to_string()))?;

    let flow_id = path.into_inner();
    info!("Archiving flow {} for user {}", flow_id, claims.sub);

    // TODO: Update flow status in database
    
    let response = json!({
        "id": flow_id,
        "status": "archived",
        "archived_at": Utc::now()
    });

    Ok(HttpResponse::Ok().json(response))
}

/// Query parameters for listing flows
#[derive(Debug, Deserialize)]
pub struct ListFlowsQuery {
    pub page: Option<usize>,
    pub per_page: Option<usize>,
    pub status: Option<String>,
    pub search: Option<String>,
}

/// Generic pagination query
#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub page: Option<usize>,
    pub per_page: Option<usize>,
}

/// Configure flow routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg
        .route("", web::post().to(create_flow))
        .route("", web::get().to(list_flows))
        .route("/{id}", web::get().to(get_flow))
        .route("/{id}", web::put().to(update_flow))
        .route("/{id}", web::delete().to(delete_flow))
        .route("/{id}/execute", web::post().to(execute_flow))
        .route("/{id}/test", web::post().to(test_flow))
        .route("/{id}/history", web::get().to(get_flow_history))
        .route("/{id}/activate", web::post().to(activate_flow))
        .route("/{id}/pause", web::post().to(pause_flow))
        .route("/{id}/archive", web::post().to(archive_flow));
}