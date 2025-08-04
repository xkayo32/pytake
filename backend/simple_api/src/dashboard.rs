use actix_web::{web, HttpRequest, HttpResponse, Result, HttpMessage};
use serde::Serialize;
use serde_json::json;
use chrono::{DateTime, Utc};
use tracing::info;
use crate::auth::Claims;

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_users: u32,
    pub active_users: u32,
    pub total_conversations: u32,
    pub active_conversations: u32,
    pub total_messages: u32,
    pub messages_today: u32,
    pub avg_response_time: f32,
    pub satisfaction_score: f32,
    pub system_uptime: String,
    pub api_requests_today: u32,
    pub webhook_events_today: u32,
}

#[derive(Debug, Serialize)]
pub struct SystemMetrics {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub disk_usage: f32,
    pub active_connections: u32,
    pub queue_size: u32,
}

#[derive(Debug, Serialize)]
pub struct AdminDashboardResponse {
    pub stats: DashboardStats,
    pub system_metrics: SystemMetrics,
    pub recent_activities: Vec<ActivityLog>,
    pub alerts: Vec<SystemAlert>,
}

#[derive(Debug, Serialize)]
pub struct SupervisorDashboardResponse {
    pub team_stats: TeamStats,
    pub agent_performance: Vec<AgentPerformance>,
    pub conversation_metrics: ConversationMetrics,
    pub response_time_trends: Vec<ResponseTimeTrend>,
}

#[derive(Debug, Serialize)]
pub struct AgentDashboardResponse {
    pub personal_stats: PersonalStats,
    pub today_metrics: TodayMetrics,
    pub recent_conversations: Vec<RecentConversation>,
    pub performance_trends: Vec<PerformanceTrend>,
}

#[derive(Debug, Serialize)]
pub struct TeamStats {
    pub total_agents: u32,
    pub active_agents: u32,
    pub avg_conversations_per_agent: f32,
    pub total_team_conversations: u32,
    pub team_response_time: f32,
    pub team_satisfaction: f32,
}

#[derive(Debug, Serialize)]
pub struct AgentPerformance {
    pub agent_id: String,
    pub agent_name: String,
    pub conversations_handled: u32,
    pub avg_response_time: f32,
    pub satisfaction_score: f32,
    pub status: String,
    pub last_activity: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ConversationMetrics {
    pub total_today: u32,
    pub resolved_today: u32,
    pub pending: u32,
    pub avg_resolution_time: f32,
    pub escalation_rate: f32,
}

#[derive(Debug, Serialize)]
pub struct ResponseTimeTrend {
    pub hour: u8,
    pub avg_time: f32,
    pub volume: u32,
}

#[derive(Debug, Serialize)]
pub struct PersonalStats {
    pub conversations_assigned: u32,
    pub conversations_resolved: u32,
    pub messages_sent: u32,
    pub avg_response_time: f32,
    pub satisfaction_score: f32,
    pub productivity_score: f32,
}

#[derive(Debug, Serialize)]
pub struct TodayMetrics {
    pub conversations_handled: u32,
    pub messages_sent: u32,
    pub first_response_time: f32,
    pub resolution_rate: f32,
}

#[derive(Debug, Serialize)]
pub struct RecentConversation {
    pub id: String,
    pub contact_name: String,
    pub status: String,
    pub last_message: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct PerformanceTrend {
    pub date: String,
    pub conversations: u32,
    pub response_time: f32,
    pub satisfaction: f32,
}

#[derive(Debug, Serialize)]
pub struct ActivityLog {
    pub id: String,
    pub user: String,
    pub action: String,
    pub description: String,
    pub timestamp: DateTime<Utc>,
    pub severity: String,
}

#[derive(Debug, Serialize)]
pub struct SystemAlert {
    pub id: String,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub timestamp: DateTime<Utc>,
    pub resolved: bool,
}

// Get real dashboard stats (replace with actual database queries)
async fn get_dashboard_stats() -> DashboardStats {
    // TODO: Replace with actual database queries
    // For now using placeholder values that would come from DB
    DashboardStats {
        total_users: 0, // SELECT COUNT(*) FROM users
        active_users: 0, // SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL '24 hours'
        total_conversations: 0, // SELECT COUNT(*) FROM conversations
        active_conversations: 0, // SELECT COUNT(*) FROM conversations WHERE status = 'active'
        total_messages: 0, // SELECT COUNT(*) FROM messages
        messages_today: 0, // SELECT COUNT(*) FROM messages WHERE created_at >= CURRENT_DATE
        avg_response_time: 0.0, // SELECT AVG(response_time) FROM conversations
        satisfaction_score: 0.0, // SELECT AVG(rating) FROM conversation_ratings
        system_uptime: "0d 0h 0m".to_string(), // System uptime from process
        api_requests_today: 0, // SELECT COUNT(*) FROM api_logs WHERE date = CURRENT_DATE
        webhook_events_today: 0, // SELECT COUNT(*) FROM webhook_events WHERE date = CURRENT_DATE
    }
}

async fn get_system_metrics() -> SystemMetrics {
    // TODO: Get real system metrics
    SystemMetrics {
        cpu_usage: 0.0, // Get from system monitoring
        memory_usage: 0.0, // Get from system monitoring  
        disk_usage: 0.0, // Get from system monitoring
        active_connections: 0, // Get from connection pool
        queue_size: 0, // Get from message queue
    }
}

async fn get_team_stats() -> TeamStats {
    // TODO: Replace with actual database queries
    TeamStats {
        total_agents: 0, // SELECT COUNT(*) FROM users WHERE role = 'agent'
        active_agents: 0, // SELECT COUNT(*) FROM users WHERE role = 'agent' AND status = 'online'
        avg_conversations_per_agent: 0.0, // SELECT AVG(conversation_count) FROM agent_stats
        total_team_conversations: 0, // SELECT COUNT(*) FROM conversations WHERE assigned_agent IS NOT NULL
        team_response_time: 0.0, // SELECT AVG(response_time) FROM conversations
        team_satisfaction: 0.0, // SELECT AVG(rating) FROM conversation_ratings
    }
}

async fn get_personal_stats() -> PersonalStats {
    // TODO: Replace with actual database queries for logged in agent
    PersonalStats {
        conversations_assigned: 0, // SELECT COUNT(*) FROM conversations WHERE assigned_agent = ?
        conversations_resolved: 0, // SELECT COUNT(*) FROM conversations WHERE assigned_agent = ? AND status = 'resolved'
        messages_sent: 0, // SELECT COUNT(*) FROM messages WHERE sender_type = 'agent' AND sender_id = ?
        avg_response_time: 0.0, // SELECT AVG(response_time) FROM conversations WHERE assigned_agent = ?
        satisfaction_score: 0.0, // SELECT AVG(rating) FROM conversation_ratings JOIN conversations ON conversation_id WHERE assigned_agent = ?
        productivity_score: 0.0, // Calculate based on metrics
    }
}

// API Endpoints
pub async fn get_admin_dashboard(
    _req: HttpRequest,
) -> Result<HttpResponse> {
    info!("Getting admin dashboard data");
    
    let response = AdminDashboardResponse {
        stats: get_dashboard_stats().await,
        system_metrics: get_system_metrics().await,
        recent_activities: vec![], // TODO: Get from database
        alerts: vec![], // TODO: Get from monitoring system
    };
    
    Ok(HttpResponse::Ok().json(response))
}

pub async fn get_supervisor_dashboard(
    _req: HttpRequest,
) -> Result<HttpResponse> {
    info!("Getting supervisor dashboard data");
    
    let response = SupervisorDashboardResponse {
        team_stats: get_team_stats().await,
        agent_performance: vec![], // TODO: Get from database with agent queries
        conversation_metrics: ConversationMetrics {
            total_today: 0, // TODO: SELECT COUNT(*) FROM conversations WHERE DATE(created_at) = CURRENT_DATE
            resolved_today: 0, // TODO: SELECT COUNT(*) FROM conversations WHERE DATE(resolved_at) = CURRENT_DATE
            pending: 0, // TODO: SELECT COUNT(*) FROM conversations WHERE status = 'pending'
            avg_resolution_time: 0.0, // TODO: SELECT AVG(resolution_time) FROM conversations WHERE resolved_at IS NOT NULL
            escalation_rate: 0.0, // TODO: Calculate escalation rate
        },
        response_time_trends: vec![], // TODO: Get hourly response time trends from database
    };
    
    Ok(HttpResponse::Ok().json(response))
}

pub async fn get_agent_dashboard(
    req: HttpRequest,
) -> Result<HttpResponse> {
    info!("Getting agent dashboard data");
    
    // Extract agent info from JWT if needed
    let extensions = req.extensions();
    let _claims = extensions.get::<Claims>();
    
    let response = AgentDashboardResponse {
        personal_stats: get_personal_stats().await,
        today_metrics: TodayMetrics {
            conversations_handled: 0, // TODO: Get from database for logged in agent
            messages_sent: 0, // TODO: Count messages sent today by agent
            first_response_time: 0.0, // TODO: Calculate average first response time
            resolution_rate: 0.0, // TODO: Calculate resolution rate for agent
        },
        recent_conversations: vec![], // TODO: Get recent conversations assigned to agent
        performance_trends: vec![], // TODO: Get performance trends for agent over time
    };
    
    Ok(HttpResponse::Ok().json(response))
}

pub async fn get_viewer_dashboard(
    _req: HttpRequest,
) -> Result<HttpResponse> {
    info!("Getting viewer dashboard data");
    
    // Viewers get read-only summary data
    let response = json!({
        "summary_stats": {
            "total_conversations": 0, // TODO: Get from database
            "resolved_today": 0, // TODO: Get from database
            "avg_response_time": 0.0, // TODO: Get from database
            "satisfaction_score": 0.0 // TODO: Get from database
        },
        "reports": [] // TODO: Generate reports from database data
    });
    
    Ok(HttpResponse::Ok().json(response))
}

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/dashboard")
            .route("/admin", web::get().to(get_admin_dashboard))
            .route("/supervisor", web::get().to(get_supervisor_dashboard))
            .route("/agent", web::get().to(get_agent_dashboard))
            .route("/viewer", web::get().to(get_viewer_dashboard))
    );
}