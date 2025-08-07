//! Dashboard-specific handlers optimized for frontend components

use actix_web::{web, HttpResponse, Result as ActixResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc, Duration, Datelike};
use tracing::{info, error};
use uuid::Uuid;

// Request/Response Types for Dashboard

#[derive(Debug, Deserialize)]
pub struct DashboardQuery {
    pub period: Option<String>, // 7d, 30d, 90d
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct DashboardMetrics {
    pub active_conversations: MetricValue,
    pub total_messages: MetricValue,
    pub avg_response_time: MetricValue,
    pub customer_satisfaction: MetricValue,
    pub period: String,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct MetricValue {
    pub current: serde_json::Value,
    pub previous: serde_json::Value,
    pub change_percentage: f64,
    pub trend: String, // "up", "down", "stable"
}

#[derive(Debug, Serialize)]
pub struct ConversationChartData {
    pub date: String,
    pub total: u32,
    pub active: u32,
    pub resolved: u32,
    pub pending: u32,
}

#[derive(Debug, Serialize)]
pub struct ResponseTimeData {
    pub period: String,
    pub avg_response_time: u32, // minutes
    pub first_response: u32,    // minutes
    pub resolution: u32,        // minutes
}

#[derive(Debug, Serialize)]
pub struct ActivityItem {
    pub id: String,
    pub activity_type: String,
    pub title: String,
    pub description: String,
    pub timestamp: DateTime<Utc>,
    pub user: Option<String>,
    pub contact: Option<String>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize)]
pub struct QuickStats {
    pub conversations_started: u32,
    pub conversations_resolved: u32,
    pub resolution_rate: f64,
    pub new_contacts: u32,
    pub peak_hour: String,
    pub total_agents: u32,
    pub online_agents: u32,
}

// Handler Functions

/// Get comprehensive dashboard metrics
pub async fn get_dashboard_metrics(
    query: web::Query<DashboardQuery>,
) -> ActixResult<HttpResponse> {
    info!("Fetching dashboard metrics with period: {:?}", query.period);

    let period = query.period.as_deref().unwrap_or("7d");
    let (start_date, end_date) = calculate_date_range(period);

    // Mock data generation - replace with real database queries
    let metrics = generate_mock_dashboard_metrics(period, start_date, end_date);

    Ok(HttpResponse::Ok().json(metrics))
}

/// Get conversation chart data for the specified period
pub async fn get_conversation_chart(
    query: web::Query<DashboardQuery>,
) -> ActixResult<HttpResponse> {
    info!("Fetching conversation chart data");

    let period = query.period.as_deref().unwrap_or("7d");
    let (start_date, end_date) = calculate_date_range(period);

    let chart_data = generate_mock_conversation_chart(start_date, end_date);

    Ok(HttpResponse::Ok().json(chart_data))
}

/// Get response time data by time periods
pub async fn get_response_time_chart() -> ActixResult<HttpResponse> {
    info!("Fetching response time chart data");

    let response_data = generate_mock_response_time_data();

    Ok(HttpResponse::Ok().json(response_data))
}

/// Get recent activity feed
pub async fn get_recent_activity(
    query: web::Query<HashMap<String, String>>,
) -> ActixResult<HttpResponse> {
    info!("Fetching recent activity");

    let limit = query.get("limit")
        .and_then(|l| l.parse::<usize>().ok())
        .unwrap_or(10);

    let activities = generate_mock_activities(limit);

    Ok(HttpResponse::Ok().json(activities))
}

/// Get quick stats for today
pub async fn get_quick_stats() -> ActixResult<HttpResponse> {
    info!("Fetching quick stats");

    let stats = generate_mock_quick_stats();

    Ok(HttpResponse::Ok().json(stats))
}

/// Get real-time metrics (for auto-refresh)
pub async fn get_realtime_metrics() -> ActixResult<HttpResponse> {
    info!("Fetching real-time metrics");

    let realtime_data = serde_json::json!({
        "active_conversations": 127,
        "online_agents": 8,
        "pending_messages": 23,
        "average_wait_time": "1.2min",
        "system_load": 0.65,
        "last_updated": Utc::now()
    });

    Ok(HttpResponse::Ok().json(realtime_data))
}

// Helper Functions

fn calculate_date_range(period: &str) -> (DateTime<Utc>, DateTime<Utc>) {
    let end_date = Utc::now();
    let start_date = match period {
        "7d" => end_date - Duration::days(7),
        "30d" => end_date - Duration::days(30),
        "90d" => end_date - Duration::days(90),
        _ => end_date - Duration::days(7),
    };
    (start_date, end_date)
}

fn generate_mock_dashboard_metrics(
    period: &str,
    _start_date: DateTime<Utc>,
    _end_date: DateTime<Utc>,
) -> DashboardMetrics {
    // TODO: Replace with real database queries
    // For now returning empty/zero values instead of mock data
    DashboardMetrics {
        active_conversations: MetricValue {
            current: serde_json::Value::Number(0.into()),
            previous: serde_json::Value::Number(0.into()),
            change_percentage: 0.0,
            trend: "stable".to_string(),
        },
        total_messages: MetricValue {
            current: serde_json::Value::Number(0.into()),
            previous: serde_json::Value::Number(0.into()),
            change_percentage: 0.0,
            trend: "stable".to_string(),
        },
        avg_response_time: MetricValue {
            current: serde_json::Value::String("0min".to_string()),
            previous: serde_json::Value::String("0min".to_string()),
            change_percentage: 0.0,
            trend: "stable".to_string(),
        },
        customer_satisfaction: MetricValue {
            current: serde_json::Value::String("0%".to_string()),
            previous: serde_json::Value::String("0%".to_string()),
            change_percentage: 0.0,
            trend: "stable".to_string(),
        },
        period: period.to_string(),
        last_updated: Utc::now(),
    }
}

fn generate_mock_conversation_chart(
    start_date: DateTime<Utc>,
    end_date: DateTime<Utc>,
) -> Vec<ConversationChartData> {
    let mut data = Vec::new();
    let mut current = start_date.date_naive();
    let end = end_date.date_naive();

    while current <= end {
        // TODO: Replace with real database queries
        // For now returning empty data
        data.push(ConversationChartData {
            date: current.format("%d/%m").to_string(),
            total: 0,
            active: 0,
            resolved: 0,
            pending: 0,
        });

        current = current.succ_opt().unwrap_or(current);
    }

    data
}

fn generate_mock_response_time_data() -> Vec<ResponseTimeData> {
    vec![
        ResponseTimeData {
            period: "00-04h".to_string(),
            avg_response_time: 15,
            first_response: 8,
            resolution: 45,
        },
        ResponseTimeData {
            period: "04-08h".to_string(),
            avg_response_time: 12,
            first_response: 6,
            resolution: 38,
        },
        ResponseTimeData {
            period: "08-12h".to_string(),
            avg_response_time: 8,
            first_response: 3,
            resolution: 25,
        },
        ResponseTimeData {
            period: "12-16h".to_string(),
            avg_response_time: 6,
            first_response: 2,
            resolution: 22,
        },
        ResponseTimeData {
            period: "16-20h".to_string(),
            avg_response_time: 9,
            first_response: 4,
            resolution: 28,
        },
        ResponseTimeData {
            period: "20-24h".to_string(),
            avg_response_time: 18,
            first_response: 10,
            resolution: 52,
        },
    ]
}

fn generate_mock_activities(limit: usize) -> Vec<ActivityItem> {
    let mut activities = Vec::new();
    let activity_types = [
        ("message", "Nova mensagem recebida", "João Silva enviou: \"Olá, gostaria de saber sobre...\""),
        ("contact_added", "Novo contato adicionado", "Maria Santos foi adicionada aos contatos"),
        ("conversation_resolved", "Conversa resolvida", "Atendimento com Pedro finalizado com sucesso"),
        ("conversation_pending", "Conversa pendente", "Ana Costa aguarda retorno há 2 horas"),
        ("call", "Chamada perdida", "Tentativa de ligação não atendida"),
        ("alert", "Alerta de sistema", "Alta demanda detectada - considere adicionar mais agentes"),
    ];

    for i in 0..limit {
        let (activity_type, title, description) = &activity_types[i % activity_types.len()];
        
        let minutes_ago = (i * 15 + 5) as i64;
        let timestamp = Utc::now() - Duration::minutes(minutes_ago);

        activities.push(ActivityItem {
            id: Uuid::new_v4().to_string(),
            activity_type: activity_type.to_string(),
            title: title.to_string(),
            description: description.to_string(),
            timestamp,
            user: Some(format!("User {}", i + 1)),
            contact: Some(format!("+55 11 9999{:04}", i)),
            metadata: None,
        });
    }

    activities
}

fn generate_mock_quick_stats() -> QuickStats {
    QuickStats {
        conversations_started: 23,
        conversations_resolved: 18,
        resolution_rate: 78.3,
        new_contacts: 12,
        peak_hour: "14:30".to_string(),
        total_agents: 12,
        online_agents: 8,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_get_dashboard_metrics() {
        let app = test::init_service(
            App::new().route("/dashboard/metrics", web::get().to(get_dashboard_metrics))
        ).await;

        let req = test::TestRequest::get()
            .uri("/dashboard/metrics?period=7d")
            .to_request();
        let resp = test::call_service(&app, req).await;
        
        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_calculate_date_range() {
        let (start, end) = calculate_date_range("7d");
        let duration = end - start;
        assert!(duration.num_days() >= 6 && duration.num_days() <= 7);
    }
}