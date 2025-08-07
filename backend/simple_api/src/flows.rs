use actix_web::{web, HttpRequest, HttpResponse, Result, HttpMessage};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::info;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use crate::auth::Claims;

#[derive(Debug, Deserialize)]
pub struct CreateFlowRequest {
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<serde_json::Value>,
    pub edges: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFlowRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub nodes: Option<Vec<serde_json::Value>>,
    pub edges: Option<Vec<serde_json::Value>>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct FlowResponse {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub nodes: Vec<serde_json::Value>,
    pub edges: Vec<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_run: Option<DateTime<Utc>>,
    pub actions_count: usize,
}

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

// In-memory storage for flows (replace with database)
use std::sync::Mutex;
use lazy_static::lazy_static;
use std::collections::HashMap;

lazy_static! {
    static ref FLOWS: Mutex<HashMap<String, FlowResponse>> = Mutex::new(HashMap::new());
}

pub async fn create_flow(
    req: HttpRequest,
    data: web::Json<CreateFlowRequest>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    
    info!("Creating flow '{}' for user {}", data.name, claims.sub);
    
    let flow_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    
    let flow = FlowResponse {
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
        actions_count: data.nodes.len().saturating_sub(1),
    };
    
    FLOWS.lock().unwrap().insert(flow_id.clone(), flow.clone());
    
    Ok(HttpResponse::Created().json(flow))
}

pub async fn list_flows(
    req: HttpRequest,
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    
    info!("Listing flows for user {}", claims.sub);
    
    let flows = FLOWS.lock().unwrap();
    let user_flows: Vec<FlowSummary> = flows
        .values()
        .filter(|f| f.user_id == claims.sub)
        .map(|f| {
            // Extract trigger type from nodes
            let trigger = f.nodes.iter()
                .find(|n| {
                    n.get("type")
                        .and_then(|t| t.as_str())
                        .map(|t| t == "input" || t == "trigger")
                        .unwrap_or(false)
                })
                .and_then(|n| n.get("data"))
                .and_then(|d| d.get("config"))
                .and_then(|c| c.get("triggerType"))
                .and_then(|t| t.as_str())
                .unwrap_or("manual");
            
            FlowSummary {
                id: f.id.clone(),
                name: f.name.clone(),
                description: f.description.clone(),
                status: f.status.clone(),
                trigger: match trigger {
                    "manual" => "Manual",
                    "whatsapp" => "WhatsApp Message",
                    "schedule" => "Schedule",
                    "webhook" => "Webhook",
                    _ => trigger,
                }.to_string(),
                actions_count: f.actions_count,
                last_run: f.last_run,
                created_at: f.created_at,
                updated_at: f.updated_at,
            }
        })
        .collect();
    
    Ok(HttpResponse::Ok().json(json!({
        "flows": user_flows,
        "total": user_flows.len(),
        "page": 1,
        "per_page": 50
    })))
}

pub async fn get_flow(
    req: HttpRequest,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let flow_id = path.into_inner();
    
    info!("Getting flow {} for user {}", flow_id, claims.sub);
    
    let flows = FLOWS.lock().unwrap();
    
    match flows.get(&flow_id) {
        Some(flow) if flow.user_id == claims.sub => {
            Ok(HttpResponse::Ok().json(flow))
        }
        Some(_) => Ok(HttpResponse::Forbidden().json(json!({
            "error": "Access denied"
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Flow not found"
        })))
    }
}

pub async fn update_flow(
    req: HttpRequest,
    path: web::Path<String>,
    data: web::Json<UpdateFlowRequest>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let flow_id = path.into_inner();
    
    info!("Updating flow {} for user {}", flow_id, claims.sub);
    
    let mut flows = FLOWS.lock().unwrap();
    
    match flows.get_mut(&flow_id) {
        Some(flow) if flow.user_id == claims.sub => {
            if let Some(name) = &data.name {
                flow.name = name.clone();
            }
            if let Some(description) = &data.description {
                flow.description = Some(description.clone());
            }
            if let Some(nodes) = &data.nodes {
                flow.nodes = nodes.clone();
                flow.actions_count = nodes.len().saturating_sub(1);
            }
            if let Some(edges) = &data.edges {
                flow.edges = edges.clone();
            }
            if let Some(status) = &data.status {
                flow.status = status.clone();
            }
            flow.updated_at = Utc::now();
            
            Ok(HttpResponse::Ok().json(flow))
        }
        Some(_) => Ok(HttpResponse::Forbidden().json(json!({
            "error": "Access denied"
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Flow not found"
        })))
    }
}

pub async fn delete_flow(
    req: HttpRequest,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let flow_id = path.into_inner();
    
    info!("Deleting flow {} for user {}", flow_id, claims.sub);
    
    let mut flows = FLOWS.lock().unwrap();
    
    match flows.get(&flow_id) {
        Some(flow) if flow.user_id == claims.sub => {
            flows.remove(&flow_id);
            Ok(HttpResponse::NoContent().finish())
        }
        Some(_) => Ok(HttpResponse::Forbidden().json(json!({
            "error": "Access denied"
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Flow not found"
        })))
    }
}

pub async fn execute_flow(
    req: HttpRequest,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let flow_id = path.into_inner();
    
    info!("Executing flow {} for user {}", flow_id, claims.sub);
    
    let mut flows = FLOWS.lock().unwrap();
    
    match flows.get_mut(&flow_id) {
        Some(flow) if flow.user_id == claims.sub => {
            flow.last_run = Some(Utc::now());
            
            Ok(HttpResponse::Ok().json(json!({
                "flow_id": flow_id,
                "execution_id": Uuid::new_v4().to_string(),
                "status": "started",
                "started_at": Utc::now()
            })))
        }
        Some(_) => Ok(HttpResponse::Forbidden().json(json!({
            "error": "Access denied"
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Flow not found"
        })))
    }
}

pub async fn test_flow(
    req: HttpRequest,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let flow_id = path.into_inner();
    
    info!("Testing flow {} for user {}", flow_id, claims.sub);
    
    let flows = FLOWS.lock().unwrap();
    
    match flows.get(&flow_id) {
        Some(flow) if flow.user_id == claims.sub => {
            // Simulate test execution
            let results: Vec<serde_json::Value> = flow.nodes.iter()
                .map(|node| {
                    json!({
                        "node_id": node.get("id").and_then(|i| i.as_str()).unwrap_or("unknown"),
                        "status": "success",
                        "output": { "simulated": true }
                    })
                })
                .collect();
            
            Ok(HttpResponse::Ok().json(json!({
                "flow_id": flow_id,
                "test_id": Uuid::new_v4().to_string(),
                "status": "success",
                "results": results,
                "completed_at": Utc::now()
            })))
        }
        Some(_) => Ok(HttpResponse::Forbidden().json(json!({
            "error": "Access denied"
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Flow not found"
        })))
    }
}

pub async fn activate_flow(
    req: HttpRequest,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let flow_id = path.into_inner();
    
    info!("Activating flow {} for user {}", flow_id, claims.sub);
    
    let mut flows = FLOWS.lock().unwrap();
    
    match flows.get_mut(&flow_id) {
        Some(flow) if flow.user_id == claims.sub => {
            flow.status = "active".to_string();
            flow.updated_at = Utc::now();
            
            Ok(HttpResponse::Ok().json(json!({
                "id": flow_id,
                "status": "active",
                "activated_at": Utc::now()
            })))
        }
        Some(_) => Ok(HttpResponse::Forbidden().json(json!({
            "error": "Access denied"
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Flow not found"
        })))
    }
}

pub async fn pause_flow(
    req: HttpRequest,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let flow_id = path.into_inner();
    
    info!("Pausing flow {} for user {}", flow_id, claims.sub);
    
    let mut flows = FLOWS.lock().unwrap();
    
    match flows.get_mut(&flow_id) {
        Some(flow) if flow.user_id == claims.sub => {
            flow.status = "paused".to_string();
            flow.updated_at = Utc::now();
            
            Ok(HttpResponse::Ok().json(json!({
                "id": flow_id,
                "status": "paused",
                "paused_at": Utc::now()
            })))
        }
        Some(_) => Ok(HttpResponse::Forbidden().json(json!({
            "error": "Access denied"
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Flow not found"
        })))
    }
}

pub async fn archive_flow(
    req: HttpRequest,
    path: web::Path<String>
) -> Result<HttpResponse> {
    let extensions = req.extensions();
    let claims = extensions.get::<Claims>().unwrap();
    let flow_id = path.into_inner();
    
    info!("Archiving flow {} for user {}", flow_id, claims.sub);
    
    let mut flows = FLOWS.lock().unwrap();
    
    match flows.get_mut(&flow_id) {
        Some(flow) if flow.user_id == claims.sub => {
            flow.status = "archived".to_string();
            flow.updated_at = Utc::now();
            
            Ok(HttpResponse::Ok().json(json!({
                "id": flow_id,
                "status": "archived",
                "archived_at": Utc::now()
            })))
        }
        Some(_) => Ok(HttpResponse::Forbidden().json(json!({
            "error": "Access denied"
        }))),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Flow not found"
        })))
    }
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/flows")
            .route("", web::post().to(create_flow))
            .route("", web::get().to(list_flows))
            .route("/{id}", web::get().to(get_flow))
            .route("/{id}", web::put().to(update_flow))
            .route("/{id}", web::delete().to(delete_flow))
            .route("/{id}/execute", web::post().to(execute_flow))
            .route("/{id}/test", web::post().to(test_flow))
            .route("/{id}/activate", web::post().to(activate_flow))
            .route("/{id}/pause", web::post().to(pause_flow))
            .route("/{id}/archive", web::post().to(archive_flow))
    );
}