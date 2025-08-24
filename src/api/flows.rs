use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::flow::{
    FlowEngine, 
    FlowSession, 
    Flow, 
    FlowNode,
    FlowSessionStatus,
    session::SessionStats
};
use crate::auth::Claims;
use crate::error::AppError;
use crate::database::{DatabasePool, get_flow_by_id, list_flows as db_list_flows};

#[derive(Deserialize)]
pub struct StartFlowRequest {
    pub flow_id: String,
    pub contact_id: String,
    pub conversation_id: Option<String>,
    pub trigger_data: Option<std::collections::HashMap<String, serde_json::Value>>,
}

#[derive(Deserialize)]
pub struct ProcessResponseRequest {
    pub session_id: String,
    pub user_input: String,
    pub selection_id: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateFlowRequest {
    pub name: String,
    pub nodes: Vec<FlowNode>,
    pub variables: Option<std::collections::HashMap<String, serde_json::Value>>,
    pub timeout_minutes: Option<u32>,
}

#[derive(Deserialize)]
pub struct ListFlowsQuery {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Serialize)]
pub struct FlowExecutionResponse {
    pub session_id: String,
    pub status: FlowSessionStatus,
    pub current_node_id: String,
    pub variables: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Serialize)]
pub struct FlowListResponse {
    pub flows: Vec<FlowSummary>,
    pub total: usize,
}

#[derive(Serialize)]
pub struct FlowSummary {
    pub id: String,
    pub name: String,
    pub node_count: usize,
    pub active_sessions: u32,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct FlowDetailResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub trigger_type: String,
    pub trigger_config: serde_json::Value,
    pub flow_data: serde_json::Value,
    pub stats: serde_json::Value,
    pub tags: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub flow: Flow,
}

/// Iniciar execução de um flow
pub async fn start_flow(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
    req: web::Json<StartFlowRequest>,
) -> Result<HttpResponse, AppError> {
    let conversation_id = req.conversation_id.clone()
        .unwrap_or_else(|| format!("{}_{}", req.contact_id, Uuid::new_v4()));

    let session = flow_engine.start_flow(
        req.flow_id.clone(),
        req.contact_id.clone(),
        conversation_id,
        req.trigger_data.clone(),
    ).await?;

    let response = FlowExecutionResponse {
        session_id: session.id,
        status: session.status,
        current_node_id: session.current_node_id,
        variables: session.variables,
    };

    Ok(HttpResponse::Ok().json(response))
}

/// Processar resposta do usuário
pub async fn process_user_response(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
    req: web::Json<ProcessResponseRequest>,
) -> Result<HttpResponse, AppError> {
    flow_engine.process_user_response(
        req.session_id.clone(),
        req.user_input.clone(),
        req.selection_id.clone(),
    ).await?;

    // Buscar estado atualizado da sessão
    let session = flow_engine.session_manager
        .get_session(&req.session_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Session not found".to_string()))?;

    let response = FlowExecutionResponse {
        session_id: session.id,
        status: session.status,
        current_node_id: session.current_node_id,
        variables: session.variables,
    };

    Ok(HttpResponse::Ok().json(response))
}

/// Obter status de uma sessão
pub async fn get_session_status(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let session_id = path.into_inner();
    
    let session = flow_engine.session_manager
        .get_session(&session_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Session not found".to_string()))?;

    let response = FlowExecutionResponse {
        session_id: session.id,
        status: session.status,
        current_node_id: session.current_node_id,
        variables: session.variables,
    };

    Ok(HttpResponse::Ok().json(response))
}

/// Cancelar sessão de flow
pub async fn cancel_session(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let session_id = path.into_inner();
    
    flow_engine.session_manager
        .delete_session(&session_id)
        .await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Session cancelled successfully"
    })))
}

/// Listar sessões ativas
pub async fn list_active_sessions(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
) -> Result<HttpResponse, AppError> {
    let sessions = flow_engine.session_manager
        .list_active_sessions()
        .await?;

    Ok(HttpResponse::Ok().json(sessions))
}

/// Obter estatísticas das sessões
pub async fn get_session_stats(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
) -> Result<HttpResponse, AppError> {
    let stats = flow_engine.session_manager
        .get_session_stats()
        .await?;

    Ok(HttpResponse::Ok().json(stats))
}

/// Criar um novo flow
pub async fn create_flow(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
    req: web::Json<CreateFlowRequest>,
) -> Result<HttpResponse, AppError> {
    let flow = Flow {
        id: Uuid::new_v4().to_string(),
        name: req.name.clone(),
        nodes: req.nodes.clone(),
        variables: req.variables.clone().unwrap_or_default(),
        settings: crate::flow::FlowSettings {
            timeout_minutes: req.timeout_minutes,
            max_iterations: Some(20),
            fallback_node: None,
        },
    };

    flow_engine.load_flow(flow.clone()).await;

    Ok(HttpResponse::Created().json(flow))
}

/// Obter detalhes de um flow
pub async fn get_flow(
    db_pool: web::Data<Arc<DatabasePool>>,
    claims: web::ReqData<Claims>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let flow_id = path.into_inner();
    
    log::info!("🔍 Buscando flow com ID: {}", flow_id);

    // Buscar o flow no PostgreSQL
    let flow_record = get_flow_by_id(&**db_pool, &flow_id).await?;
    
    match flow_record {
        Some(record) => {
            log::info!("✅ Flow encontrado: {}", record.name);
            
            // Converter o registro do banco para o formato esperado pela API
            let flow = record.to_flow()?;
            
            // Criar resposta completa com informações adicionais
            let response = FlowDetailResponse {
                id: record.id.to_string(),
                name: record.name,
                description: record.description,
                status: record.status,
                trigger_type: record.trigger_type,
                trigger_config: record.trigger_config,
                flow_data: record.flow_data,
                stats: record.stats,
                tags: record.tags,
                created_at: record.created_at,
                updated_at: record.updated_at,
                // Campos computados para compatibilidade
                flow,
            };
            
            Ok(HttpResponse::Ok().json(response))
        }
        None => {
            log::warn!("❌ Flow não encontrado: {}", flow_id);
            Err(AppError::NotFound(format!("Flow with ID '{}' not found", flow_id)))
        }
    }
}

/// Listar flows disponíveis
pub async fn list_flows(
    db_pool: web::Data<Arc<DatabasePool>>,
    claims: web::ReqData<Claims>,
    query: web::Query<ListFlowsQuery>,
) -> Result<HttpResponse, AppError> {
    log::info!("📋 Listando flows");

    let limit = query.limit.map(|l| l as i64);
    let offset = query.offset.map(|o| o as i64);

    // Buscar flows no PostgreSQL
    let flow_records = db_list_flows(&**db_pool, limit, offset).await?;
    
    // Converter para formato de resposta
    let flows: Vec<FlowSummary> = flow_records.iter()
        .map(|record| {
            let node_count = if let Some(flow_data) = record.flow_data.as_object() {
                if let Some(nodes) = flow_data.get("nodes") {
                    nodes.as_array().map(|arr| arr.len()).unwrap_or(0)
                } else {
                    0
                }
            } else {
                0
            };

            FlowSummary {
                id: record.id.to_string(),
                name: record.name.clone(),
                node_count,
                active_sessions: 0, // TODO: Implementar contagem de sessões ativas
                created_at: record.created_at.to_rfc3339(),
            }
        })
        .collect();

    let response = FlowListResponse {
        total: flows.len(),
        flows,
    };

    log::info!("✅ Retornando {} flows", response.total);
    Ok(HttpResponse::Ok().json(response))
}

/// Testar execução de um flow
pub async fn test_flow(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let flow_id = path.into_inner();
    
    // Criar sessão de teste
    let test_contact_id = format!("test_{}", Uuid::new_v4());
    let test_conversation_id = format!("test_conv_{}", Uuid::new_v4());
    
    let session = flow_engine.start_flow(
        flow_id,
        test_contact_id,
        test_conversation_id,
        None,
    ).await?;

    let response = FlowExecutionResponse {
        session_id: session.id,
        status: session.status,
        current_node_id: session.current_node_id,
        variables: session.variables,
    };

    Ok(HttpResponse::Ok().json(response))
}

/// Obter sessão ativa por contato
pub async fn get_session_by_contact(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let contact_id = path.into_inner();
    
    let session = flow_engine.session_manager
        .get_active_session_by_contact(&contact_id)
        .await?;

    match session {
        Some(session) => {
            let response = FlowExecutionResponse {
                session_id: session.id,
                status: session.status,
                current_node_id: session.current_node_id,
                variables: session.variables,
            };
            Ok(HttpResponse::Ok().json(response))
        }
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "message": "No active session found for contact"
        })))
    }
}

/// Limpar sessões expiradas
pub async fn cleanup_expired_sessions(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
) -> Result<HttpResponse, AppError> {
    let cleaned_count = flow_engine.session_manager
        .cleanup_expired_sessions()
        .await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Cleanup completed",
        "cleaned_sessions": cleaned_count
    })))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/flows")
            .route("/start", web::post().to(start_flow))
            .route("/process", web::post().to(process_user_response))
            .route("/sessions/{session_id}", web::get().to(get_session_status))
            .route("/sessions/{session_id}/cancel", web::delete().to(cancel_session))
            .route("/sessions/active", web::get().to(list_active_sessions))
            .route("/sessions/stats", web::get().to(get_session_stats))
            .route("/sessions/contact/{contact_id}", web::get().to(get_session_by_contact))
            .route("/sessions/cleanup", web::post().to(cleanup_expired_sessions))
            .route("", web::post().to(create_flow))
            .route("", web::get().to(list_flows))
            .route("/{flow_id}", web::get().to(get_flow))
            .route("/{flow_id}/test", web::post().to(test_flow))
    );
}