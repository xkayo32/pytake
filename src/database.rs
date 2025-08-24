use sqlx::{PgPool, postgres::PgPoolOptions, Row};
use std::env;
use crate::error::AppError;
use crate::flow::Flow;
use uuid::Uuid;
use serde_json::Value;

pub type DatabasePool = PgPool;

pub async fn create_connection_pool() -> Result<DatabasePool, AppError> {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://pytake:pytake_dev@localhost:5432/pytake".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    // Test the connection
    sqlx::query("SELECT 1")
        .execute(&pool)
        .await?;

    log::info!("✅ Connected to PostgreSQL database");
    Ok(pool)
}

pub async fn list_flows(pool: &DatabasePool, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<FlowDbRecord>, AppError> {
    let query = r#"
        SELECT 
            id,
            name,
            description,
            status,
            trigger_type,
            trigger_config,
            flow_data,
            stats,
            tags,
            created_at,
            updated_at
        FROM flows 
        ORDER BY updated_at DESC
        LIMIT $1 OFFSET $2
    "#;

    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    let rows = sqlx::query(query)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

    let mut flows = Vec::new();
    for row in rows {
        let flow_record = FlowDbRecord {
            id: row.get("id"),
            name: row.get("name"),
            description: row.try_get("description").unwrap_or(None),
            status: row.get("status"),
            trigger_type: row.get("trigger_type"),
            trigger_config: row.get("trigger_config"),
            flow_data: row.get("flow_data"),
            stats: row.try_get("stats").unwrap_or(Value::Null),
            tags: row.try_get("tags").unwrap_or(Vec::new()),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };
        flows.push(flow_record);
    }

    Ok(flows)
}

pub async fn get_flow_by_id(pool: &DatabasePool, flow_id: &str) -> Result<Option<FlowDbRecord>, AppError> {
    let query = r#"
        SELECT 
            id,
            name,
            description,
            status,
            trigger_type,
            trigger_config,
            flow_data,
            stats,
            tags,
            created_at,
            updated_at
        FROM flows 
        WHERE id = $1
    "#;

    let flow_uuid = Uuid::parse_str(flow_id)
        .map_err(|_| AppError::BadRequest("Invalid flow ID format".to_string()))?;

    let row = sqlx::query(query)
        .bind(flow_uuid)
        .fetch_optional(pool)
        .await?;

    match row {
        Some(row) => {
            let flow_record = FlowDbRecord {
                id: row.get("id"),
                name: row.get("name"),
                description: row.try_get("description").unwrap_or(None),
                status: row.get("status"),
                trigger_type: row.get("trigger_type"),
                trigger_config: row.get("trigger_config"),
                flow_data: row.get("flow_data"),
                stats: row.try_get("stats").unwrap_or(Value::Null),
                tags: row.try_get("tags").unwrap_or(Vec::new()),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };
            Ok(Some(flow_record))
        }
        None => Ok(None)
    }
}

#[derive(Debug, Clone)]
pub struct FlowDbRecord {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub trigger_type: String,
    pub trigger_config: Value,
    pub flow_data: Value,
    pub stats: Value,
    pub tags: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl FlowDbRecord {
    pub fn to_flow(&self) -> Result<Flow, AppError> {
        let flow_data = self.flow_data.as_object()
            .ok_or_else(|| AppError::DatabaseError("Invalid flow_data format".to_string()))?;

        let nodes_value = flow_data.get("nodes")
            .ok_or_else(|| AppError::DatabaseError("Missing nodes in flow_data".to_string()))?;
        
        let edges_value = flow_data.get("edges")
            .ok_or_else(|| AppError::DatabaseError("Missing edges in flow_data".to_string()))?;

        let nodes: Vec<crate::flow::FlowNode> = serde_json::from_value(nodes_value.clone())?;
        
        // Extract variables from stats or set default
        let variables = if let Some(stats_obj) = self.stats.as_object() {
            if let Some(vars) = stats_obj.get("variables") {
                serde_json::from_value(vars.clone()).unwrap_or_default()
            } else {
                std::collections::HashMap::new()
            }
        } else {
            std::collections::HashMap::new()
        };

        Ok(Flow {
            id: self.id.to_string(),
            name: self.name.clone(),
            nodes,
            variables,
            settings: crate::flow::FlowSettings {
                timeout_minutes: Some(30), // Default timeout
                max_iterations: Some(20),
                fallback_node: None,
            },
        })
    }
}