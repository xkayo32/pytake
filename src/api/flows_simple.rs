use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::error_simple::AppError;
use crate::database_simple::{DatabasePool, get_flow_by_id, list_flows as db_list_flows};

#[derive(Deserialize)]
pub struct ListFlowsQuery {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Serialize)]
pub struct SimpleFlow {
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
pub struct FlowListResponse {
    pub flows: Vec<FlowSummary>,
    pub total: usize,
}

/// Obter detalhes de um flow
pub async fn get_flow(
    db_pool: web::Data<Arc<DatabasePool>>,
    path: web::Path<String>,
) -> Result<HttpResponse, AppError> {
    let flow_id = path.into_inner();
    
    log::info!("🔍 Buscando flow com ID: {}", flow_id);

    // Buscar o flow no PostgreSQL
    let flow_record = get_flow_by_id(&**db_pool, &flow_id).await?;
    
    match flow_record {
        Some(record) => {
            log::info!("✅ Flow encontrado: {}", record.name);
            
            let response = SimpleFlow {
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

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/flows")
            .route("", web::get().to(list_flows))
            .route("/{flow_id}", web::get().to(get_flow))
    );
}