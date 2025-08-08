use actix::prelude::*;
use actix_web::{web, HttpRequest, HttpResponse, Result};
use actix_web_actors::ws;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use tokio::time::interval;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use utoipa::ToSchema;

// ==================== TYPES AND STRUCTURES ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DashboardMetrics {
    pub timestamp: DateTime<Utc>,
    pub messages_sent: u64,
    pub messages_received: u64,
    pub messages_failed: u64,
    pub active_conversations: u64,
    pub tickets_created: u64,
    pub campaigns_active: u64,
    pub ai_interactions: u64,
    pub erp_calls_success: u64,
    pub erp_calls_failed: u64,
    pub system_cpu_usage: f64,
    pub system_memory_usage: f64,
    pub database_connections: u32,
    pub websocket_connections: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DashboardEvent {
    pub event_type: EventType,
    pub timestamp: DateTime<Utc>,
    pub tenant_id: Option<String>,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum EventType {
    MessageSent,
    MessageReceived,
    MessageFailed,
    ConversationStarted,
    ConversationEnded,
    TicketCreated,
    TicketResolved,
    CampaignUpdate,
    AIInteraction,
    ERPCall,
    SystemAlert,
    UserAction,
    ConnectionStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Message)]
#[rtype(result = "()")]
pub struct WebSocketMessage {
    pub message_type: MessageType,
    pub payload: serde_json::Value,
    pub timestamp: DateTime<Utc>,
    pub room: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum MessageType {
    Metrics,
    Event,
    Alert,
    Subscription,
    Heartbeat,
    Error,
    Auth,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SubscriptionRequest {
    pub rooms: Vec<String>,
    pub event_types: Vec<EventType>,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AlertRule {
    pub id: String,
    pub name: String,
    pub condition: AlertCondition,
    pub threshold: f64,
    pub enabled: bool,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum AlertCondition {
    MessageFailureRate,
    ResponseTime,
    ConversationBacklog,
    SystemResourceUsage,
    ERPIntegrationDown,
    CustomMetric(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DashboardOverview {
    pub total_messages_today: u64,
    pub active_conversations: u64,
    pub response_time_avg: f64,
    pub success_rate: f64,
    pub top_channels: Vec<ChannelStats>,
    pub recent_events: Vec<DashboardEvent>,
    pub system_health: SystemHealth,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ChannelStats {
    pub channel: String,
    pub messages_sent: u64,
    pub messages_received: u64,
    pub success_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SystemHealth {
    pub status: String,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
    pub database_status: String,
    pub redis_status: String,
    pub services_status: Vec<ServiceStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ServiceStatus {
    pub name: String,
    pub status: String,
    pub response_time: f64,
    pub last_check: DateTime<Utc>,
}

// ==================== CONNECTION MANAGEMENT ====================

#[derive(Debug)]
pub struct DashboardConnection {
    pub id: String,
    pub addr: Recipient<WebSocketMessage>,
    pub subscriptions: HashSet<String>,
    pub tenant_id: Option<String>,
    pub last_heartbeat: Instant,
    pub authenticated: bool,
    pub user_id: Option<String>,
    pub rate_limit: RateLimit,
}

#[derive(Debug)]
pub struct RateLimit {
    pub requests: u32,
    pub window_start: Instant,
    pub max_requests: u32,
    pub window_duration: Duration,
}

impl RateLimit {
    pub fn new(max_requests: u32, window_duration: Duration) -> Self {
        Self {
            requests: 0,
            window_start: Instant::now(),
            max_requests,
            window_duration,
        }
    }

    pub fn check_and_increment(&mut self) -> bool {
        let now = Instant::now();
        if now.duration_since(self.window_start) > self.window_duration {
            self.requests = 0;
            self.window_start = now;
        }

        if self.requests >= self.max_requests {
            false
        } else {
            self.requests += 1;
            true
        }
    }
}

// ==================== DASHBOARD MANAGER ====================

#[derive(Message)]
#[rtype(result = "()")]
pub struct Connect {
    pub addr: Recipient<WebSocketMessage>,
    pub user_id: Option<String>,
    pub tenant_id: Option<String>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    pub id: String,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Subscribe {
    pub connection_id: String,
    pub rooms: Vec<String>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct Broadcast {
    pub message: WebSocketMessage,
    pub room: Option<String>,
    pub tenant_id: Option<String>,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct SendEvent {
    pub event: DashboardEvent,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct UpdateMetrics {
    pub metrics: DashboardMetrics,
}

pub struct DashboardManager {
    connections: HashMap<String, DashboardConnection>,
    rooms: HashMap<String, HashSet<String>>, // room -> connection_ids
    metrics_history: Vec<DashboardMetrics>,
    alert_rules: Vec<AlertRule>,
    event_buffer: Vec<DashboardEvent>,
}

impl Default for DashboardManager {
    fn default() -> Self {
        Self {
            connections: HashMap::new(),
            rooms: HashMap::new(),
            metrics_history: Vec::new(),
            alert_rules: Vec::new(),
            event_buffer: Vec::new(),
        }
    }
}

impl Actor for DashboardManager {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        // Start heartbeat check
        self.start_heartbeat_check(ctx);
        
        // Start metrics collection
        self.start_metrics_collection(ctx);
        
        // Start alert monitoring
        self.start_alert_monitoring(ctx);
        
        log::info!("Dashboard manager started");
    }
}

impl DashboardManager {
    pub fn new() -> Self {
        Self::default()
    }

    fn start_heartbeat_check(&self, ctx: &mut Context<Self>) {
        ctx.run_interval(Duration::from_secs(30), |act, _| {
            let now = Instant::now();
            let mut to_remove = Vec::new();

            for (id, conn) in &act.connections {
                if now.duration_since(conn.last_heartbeat) > Duration::from_secs(60) {
                    to_remove.push(id.clone());
                }
            }

            for id in to_remove {
                log::info!("Removing stale connection: {}", id);
                act.remove_connection(&id);
            }
        });
    }

    fn start_metrics_collection(&self, ctx: &mut Context<Self>) {
        ctx.run_interval(Duration::from_secs(5), |act, _| {
            let metrics = DashboardMetrics {
                timestamp: Utc::now(),
                messages_sent: rand::random::<u64>() % 1000,
                messages_received: rand::random::<u64>() % 1000,
                messages_failed: rand::random::<u64>() % 50,
                active_conversations: rand::random::<u64>() % 200,
                tickets_created: rand::random::<u64>() % 20,
                campaigns_active: rand::random::<u64>() % 10,
                ai_interactions: rand::random::<u64>() % 100,
                erp_calls_success: rand::random::<u64>() % 500,
                erp_calls_failed: rand::random::<u64>() % 10,
                system_cpu_usage: rand::random::<f64>() * 100.0,
                system_memory_usage: rand::random::<f64>() * 100.0,
                database_connections: act.connections.len() as u32,
                websocket_connections: act.connections.len() as u32,
            };

            // Store metrics (keep last 1000 entries)
            act.metrics_history.push(metrics.clone());
            if act.metrics_history.len() > 1000 {
                act.metrics_history.remove(0);
            }

            // Broadcast metrics to dashboard room
            let message = WebSocketMessage {
                message_type: MessageType::Metrics,
                payload: serde_json::to_value(&metrics).unwrap(),
                timestamp: Utc::now(),
                room: Some("dashboard".to_string()),
            };

            act.broadcast_to_room(&message, "dashboard");
        });
    }

    fn start_alert_monitoring(&self, ctx: &mut Context<Self>) {
        ctx.run_interval(Duration::from_secs(10), |act, _| {
            if let Some(latest_metrics) = act.metrics_history.last() {
                for rule in &act.alert_rules {
                    if !rule.enabled {
                        continue;
                    }

                    let should_alert = match rule.condition {
                        AlertCondition::MessageFailureRate => {
                            let total = latest_metrics.messages_sent + latest_metrics.messages_received;
                            if total > 0 {
                                let failure_rate = (latest_metrics.messages_failed as f64 / total as f64) * 100.0;
                                failure_rate > rule.threshold
                            } else {
                                false
                            }
                        },
                        AlertCondition::ResponseTime => {
                            // Simulated response time check
                            rand::random::<f64>() * 1000.0 > rule.threshold
                        },
                        AlertCondition::ConversationBacklog => {
                            latest_metrics.active_conversations as f64 > rule.threshold
                        },
                        AlertCondition::SystemResourceUsage => {
                            latest_metrics.system_cpu_usage > rule.threshold || 
                            latest_metrics.system_memory_usage > rule.threshold
                        },
                        AlertCondition::ERPIntegrationDown => {
                            let total_erp = latest_metrics.erp_calls_success + latest_metrics.erp_calls_failed;
                            if total_erp > 0 {
                                let failure_rate = (latest_metrics.erp_calls_failed as f64 / total_erp as f64) * 100.0;
                                failure_rate > rule.threshold
                            } else {
                                false
                            }
                        },
                        AlertCondition::CustomMetric(_) => {
                            // Custom metric evaluation would go here
                            false
                        },
                    };

                    if should_alert {
                        let alert_event = DashboardEvent {
                            event_type: EventType::SystemAlert,
                            timestamp: Utc::now(),
                            tenant_id: rule.tenant_id.clone(),
                            data: serde_json::json!({
                                "rule_id": rule.id,
                                "rule_name": rule.name,
                                "condition": rule.condition,
                                "threshold": rule.threshold,
                                "current_value": "N/A" // Would calculate actual value
                            }),
                        };

                        let message = WebSocketMessage {
                            message_type: MessageType::Alert,
                            payload: serde_json::to_value(&alert_event).unwrap(),
                            timestamp: Utc::now(),
                            room: Some("alerts".to_string()),
                        };

                        act.broadcast_to_room(&message, "alerts");
                    }
                }
            }
        });
    }

    fn remove_connection(&mut self, connection_id: &str) {
        if let Some(connection) = self.connections.remove(connection_id) {
            // Remove from all rooms
            for room_connections in self.rooms.values_mut() {
                room_connections.remove(connection_id);
            }

            log::info!("Connection {} removed (subscriptions: {:?})", 
                connection_id, connection.subscriptions);
        }
    }

    fn broadcast_to_room(&self, message: &WebSocketMessage, room: &str) {
        if let Some(connection_ids) = self.rooms.get(room) {
            for connection_id in connection_ids {
                if let Some(connection) = self.connections.get(connection_id) {
                    if connection.authenticated {
                        let _ = connection.addr.try_send(message.clone());
                    }
                }
            }
        }
    }

    fn broadcast_to_tenant(&self, message: &WebSocketMessage, tenant_id: &str) {
        for connection in self.connections.values() {
            if let Some(conn_tenant_id) = &connection.tenant_id {
                if conn_tenant_id == tenant_id && connection.authenticated {
                    let _ = connection.addr.try_send(message.clone());
                }
            }
        }
    }
}

impl Handler<Connect> for DashboardManager {
    type Result = ();

    fn handle(&mut self, msg: Connect, _: &mut Context<Self>) {
        let connection_id = Uuid::new_v4().to_string();
        
        let connection = DashboardConnection {
            id: connection_id.clone(),
            addr: msg.addr,
            subscriptions: HashSet::new(),
            tenant_id: msg.tenant_id,
            last_heartbeat: Instant::now(),
            authenticated: msg.user_id.is_some(), // Simple auth check
            user_id: msg.user_id,
            rate_limit: RateLimit::new(100, Duration::from_secs(60)), // 100 requests per minute
        };

        self.connections.insert(connection_id.clone(), connection);
        
        // Add to default dashboard room
        self.rooms.entry("dashboard".to_string())
            .or_insert_with(HashSet::new)
            .insert(connection_id.clone());

        log::info!("New connection established: {} (total: {})", 
            connection_id, self.connections.len());
    }
}

impl Handler<Disconnect> for DashboardManager {
    type Result = ();

    fn handle(&mut self, msg: Disconnect, _: &mut Context<Self>) {
        self.remove_connection(&msg.id);
    }
}

impl Handler<Subscribe> for DashboardManager {
    type Result = ();

    fn handle(&mut self, msg: Subscribe, _: &mut Context<Self>) {
        if let Some(connection) = self.connections.get_mut(&msg.connection_id) {
            if !connection.authenticated {
                return;
            }

            // Remove from old subscriptions
            for room in &connection.subscriptions {
                if let Some(room_connections) = self.rooms.get_mut(room) {
                    room_connections.remove(&msg.connection_id);
                }
            }

            // Add to new subscriptions
            connection.subscriptions.clear();
            for room in &msg.rooms {
                connection.subscriptions.insert(room.clone());
                self.rooms.entry(room.clone())
                    .or_insert_with(HashSet::new)
                    .insert(msg.connection_id.clone());
            }

            log::info!("Connection {} subscribed to rooms: {:?}", 
                msg.connection_id, msg.rooms);
        }
    }
}

impl Handler<Broadcast> for DashboardManager {
    type Result = ();

    fn handle(&mut self, msg: Broadcast, _: &mut Context<Self>) {
        if let Some(room) = &msg.room {
            self.broadcast_to_room(&msg.message, room);
        } else if let Some(tenant_id) = &msg.tenant_id {
            self.broadcast_to_tenant(&msg.message, tenant_id);
        } else {
            // Broadcast to all authenticated connections
            for connection in self.connections.values() {
                if connection.authenticated {
                    let _ = connection.addr.try_send(msg.message.clone());
                }
            }
        }
    }
}

impl Handler<SendEvent> for DashboardManager {
    type Result = ();

    fn handle(&mut self, msg: SendEvent, _: &mut Context<Self>) {
        // Store event in buffer (keep last 1000 events)
        self.event_buffer.push(msg.event.clone());
        if self.event_buffer.len() > 1000 {
            self.event_buffer.remove(0);
        }

        // Create WebSocket message
        let ws_message = WebSocketMessage {
            message_type: MessageType::Event,
            payload: serde_json::to_value(&msg.event).unwrap(),
            timestamp: Utc::now(),
            room: None,
        };

        // Broadcast based on event type and tenant
        let room = match msg.event.event_type {
            EventType::MessageSent | EventType::MessageReceived | EventType::MessageFailed => "messages",
            EventType::ConversationStarted | EventType::ConversationEnded => "conversations",
            EventType::TicketCreated | EventType::TicketResolved => "tickets",
            EventType::CampaignUpdate => "campaigns",
            EventType::AIInteraction => "ai",
            EventType::ERPCall => "erp",
            EventType::SystemAlert => "alerts",
            EventType::UserAction => "dashboard",
            EventType::ConnectionStatus => "system",
        };

        let mut broadcast_message = ws_message.clone();
        broadcast_message.room = Some(room.to_string());

        self.broadcast_to_room(&broadcast_message, room);

        // Also broadcast to tenant-specific room if applicable
        if let Some(tenant_id) = &msg.event.tenant_id {
            let tenant_room = format!("tenant/{}", tenant_id);
            broadcast_message.room = Some(tenant_room.clone());
            self.broadcast_to_room(&broadcast_message, &tenant_room);
        }
    }
}

impl Handler<UpdateMetrics> for DashboardManager {
    type Result = ();

    fn handle(&mut self, msg: UpdateMetrics, _: &mut Context<Self>) {
        // This is handled by the metrics collection interval
        // but could be used for external metric updates
        let ws_message = WebSocketMessage {
            message_type: MessageType::Metrics,
            payload: serde_json::to_value(&msg.metrics).unwrap(),
            timestamp: Utc::now(),
            room: Some("dashboard".to_string()),
        };

        self.broadcast_to_room(&ws_message, "dashboard");
    }
}

// ==================== WEBSOCKET ACTOR ====================

pub struct DashboardWebSocket {
    id: String,
    manager_addr: Addr<DashboardManager>,
    user_id: Option<String>,
    tenant_id: Option<String>,
}

impl Actor for DashboardWebSocket {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        // Register with dashboard manager
        self.manager_addr.do_send(Connect {
            addr: ctx.address().recipient(),
            user_id: self.user_id.clone(),
            tenant_id: self.tenant_id.clone(),
        });

        // Start heartbeat
        self.heartbeat(ctx);
    }

    fn stopping(&mut self, _: &mut Self::Context) -> Running {
        // Disconnect from manager
        self.manager_addr.do_send(Disconnect {
            id: self.id.clone(),
        });
        Running::Stop
    }
}

impl DashboardWebSocket {
    pub fn new(manager_addr: Addr<DashboardManager>, user_id: Option<String>, tenant_id: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            manager_addr,
            user_id,
            tenant_id,
        }
    }

    fn heartbeat(&self, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.run_interval(Duration::from_secs(25), |_act, ctx| {
            ctx.ping(b"");
        });
    }

    fn handle_text_message(&mut self, text: &str, ctx: &mut ws::WebsocketContext<Self>) {
        match serde_json::from_str::<WebSocketMessage>(text) {
            Ok(msg) => match msg.message_type {
                MessageType::Subscription => {
                    if let Ok(sub_req) = serde_json::from_value::<SubscriptionRequest>(msg.payload) {
                        self.manager_addr.do_send(Subscribe {
                            connection_id: self.id.clone(),
                            rooms: sub_req.rooms,
                        });
                    }
                },
                MessageType::Heartbeat => {
                    // Respond to client heartbeat
                    let response = WebSocketMessage {
                        message_type: MessageType::Heartbeat,
                        payload: serde_json::json!({"status": "ok"}),
                        timestamp: Utc::now(),
                        room: None,
                    };
                    ctx.text(serde_json::to_string(&response).unwrap());
                },
                MessageType::Auth => {
                    // Handle authentication
                    // In a real implementation, validate JWT token here
                    let response = WebSocketMessage {
                        message_type: MessageType::Auth,
                        payload: serde_json::json!({"authenticated": true}),
                        timestamp: Utc::now(),
                        room: None,
                    };
                    ctx.text(serde_json::to_string(&response).unwrap());
                },
                _ => {
                    // Handle other message types
                }
            },
            Err(e) => {
                let error_msg = WebSocketMessage {
                    message_type: MessageType::Error,
                    payload: serde_json::json!({"error": format!("Invalid message format: {}", e)}),
                    timestamp: Utc::now(),
                    room: None,
                };
                ctx.text(serde_json::to_string(&error_msg).unwrap());
            }
        }
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for DashboardWebSocket {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => ctx.pong(&msg),
            Ok(ws::Message::Pong(_)) => {},
            Ok(ws::Message::Text(text)) => self.handle_text_message(&text, ctx),
            Ok(ws::Message::Binary(_bin)) => {
                // Handle binary messages if needed
            },
            Ok(ws::Message::Close(reason)) => {
                ctx.close(reason);
                ctx.stop();
            },
            _ => ctx.stop(),
        }
    }
}

impl Handler<WebSocketMessage> for DashboardWebSocket {
    type Result = ();

    fn handle(&mut self, msg: WebSocketMessage, ctx: &mut Self::Context) {
        ctx.text(serde_json::to_string(&msg).unwrap());
    }
}

// ==================== REST API HANDLERS ====================

pub async fn dashboard_overview(
    manager: web::Data<Arc<RwLock<DashboardManager>>>,
) -> Result<HttpResponse> {
    let manager = manager.read().unwrap();
    
    let overview = DashboardOverview {
        total_messages_today: 1234,
        active_conversations: 45,
        response_time_avg: 1.2,
        success_rate: 98.5,
        top_channels: vec![
            ChannelStats {
                channel: "WhatsApp".to_string(),
                messages_sent: 800,
                messages_received: 750,
                success_rate: 99.1,
            },
            ChannelStats {
                channel: "Telegram".to_string(),
                messages_sent: 200,
                messages_received: 180,
                success_rate: 97.8,
            },
        ],
        recent_events: manager.event_buffer.iter().rev().take(10).cloned().collect(),
        system_health: SystemHealth {
            status: "healthy".to_string(),
            cpu_usage: 45.2,
            memory_usage: 62.1,
            disk_usage: 34.7,
            database_status: "connected".to_string(),
            redis_status: "connected".to_string(),
            services_status: vec![
                ServiceStatus {
                    name: "WhatsApp API".to_string(),
                    status: "online".to_string(),
                    response_time: 120.5,
                    last_check: Utc::now(),
                },
                ServiceStatus {
                    name: "ERP Integration".to_string(),
                    status: "online".to_string(),
                    response_time: 95.2,
                    last_check: Utc::now(),
                },
            ],
        },
    };

    Ok(HttpResponse::Ok().json(overview))
}

#[derive(Deserialize, ToSchema)]
pub struct MetricsPeriodQuery {
    pub period: String, // "1h", "24h", "7d", "30d"
    pub tenant_id: Option<String>,
}

pub async fn dashboard_metrics(
    query: web::Query<MetricsPeriodQuery>,
    manager: web::Data<Arc<RwLock<DashboardManager>>>,
) -> Result<HttpResponse> {
    let manager = manager.read().unwrap();
    
    // Filter metrics based on period
    let now = Utc::now();
    let period_duration = match query.period.as_str() {
        "1h" => chrono::Duration::hours(1),
        "24h" => chrono::Duration::hours(24),
        "7d" => chrono::Duration::days(7),
        "30d" => chrono::Duration::days(30),
        _ => chrono::Duration::hours(24),
    };
    
    let cutoff = now - period_duration;
    let filtered_metrics: Vec<&DashboardMetrics> = manager.metrics_history
        .iter()
        .filter(|m| m.timestamp > cutoff)
        .collect();

    Ok(HttpResponse::Ok().json(filtered_metrics))
}

pub async fn dashboard_alerts(
    manager: web::Data<Arc<RwLock<DashboardManager>>>,
) -> Result<HttpResponse> {
    let manager = manager.read().unwrap();
    
    // Return active alerts (last 24 hours)
    let now = Utc::now();
    let cutoff = now - chrono::Duration::hours(24);
    
    let alerts: Vec<&DashboardEvent> = manager.event_buffer
        .iter()
        .filter(|e| matches!(e.event_type, EventType::SystemAlert) && e.timestamp > cutoff)
        .collect();

    Ok(HttpResponse::Ok().json(alerts))
}

#[derive(Deserialize, ToSchema)]
pub struct CreateWidgetRequest {
    pub widget_type: String,
    pub title: String,
    pub config: serde_json::Value,
    pub position: WidgetPosition,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct WidgetPosition {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

pub async fn create_dashboard_widget(
    widget_req: web::Json<CreateWidgetRequest>,
) -> Result<HttpResponse> {
    // In a real implementation, save to database
    let widget_id = Uuid::new_v4().to_string();
    
    let response = serde_json::json!({
        "widget_id": widget_id,
        "message": "Widget created successfully"
    });

    Ok(HttpResponse::Created().json(response))
}

#[derive(Deserialize, ToSchema)]
pub struct ExportRequest {
    pub format: String, // "csv", "xlsx", "pdf"
    pub period: String,
    pub metrics: Vec<String>,
}

pub async fn export_dashboard_report(
    export_req: web::Json<ExportRequest>,
) -> Result<HttpResponse> {
    // In a real implementation, generate the report
    let report_id = Uuid::new_v4().to_string();
    
    let response = serde_json::json!({
        "report_id": report_id,
        "download_url": format!("/api/v1/dashboard/reports/{}", report_id),
        "expires_at": Utc::now() + chrono::Duration::hours(24)
    });

    Ok(HttpResponse::Ok().json(response))
}

// ==================== WEBSOCKET ENDPOINT ====================

pub async fn dashboard_websocket(
    req: HttpRequest,
    stream: web::Payload,
    manager: web::Data<Addr<DashboardManager>>,
) -> Result<HttpResponse> {
    // Extract user info from request (JWT token, headers, etc.)
    let user_id = req.headers()
        .get("X-User-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());
    
    let tenant_id = req.headers()
        .get("X-Tenant-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    ws::start(
        DashboardWebSocket::new(manager.get_ref().clone(), user_id, tenant_id),
        &req,
        stream,
    )
}

// ==================== CONFIGURATION AND SETUP ====================

pub fn configure_dashboard_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/dashboard")
            .route("/overview", web::get().to(dashboard_overview))
            .route("/metrics", web::get().to(dashboard_metrics))
            .route("/alerts", web::get().to(dashboard_alerts))
            .route("/widgets", web::post().to(create_dashboard_widget))
            .route("/export", web::post().to(export_dashboard_report))
    )
    .route("/ws/dashboard", web::get().to(dashboard_websocket));
}

pub async fn start_dashboard_manager() -> Addr<DashboardManager> {
    let manager = DashboardManager::new();
    manager.start()
}

// ==================== UTILITY FUNCTIONS ====================

pub fn create_sample_alert_rules() -> Vec<AlertRule> {
    vec![
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "High Message Failure Rate".to_string(),
            condition: AlertCondition::MessageFailureRate,
            threshold: 5.0, // 5% failure rate
            enabled: true,
            tenant_id: None,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "High CPU Usage".to_string(),
            condition: AlertCondition::SystemResourceUsage,
            threshold: 80.0, // 80% CPU usage
            enabled: true,
            tenant_id: None,
        },
        AlertRule {
            id: Uuid::new_v4().to_string(),
            name: "Conversation Backlog".to_string(),
            condition: AlertCondition::ConversationBacklog,
            threshold: 100.0, // 100 conversations
            enabled: true,
            tenant_id: None,
        },
    ]
}

// ==================== TESTING UTILITIES ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[actix::test]
    async fn test_dashboard_manager_connect() {
        let manager = DashboardManager::new().start();
        
        // Test connection
        // This would require setting up a proper test WebSocket connection
        // Implementation would go here
    }

    #[test]
    fn test_rate_limit() {
        let mut rate_limit = RateLimit::new(5, Duration::from_secs(60));
        
        // Should allow 5 requests
        for _ in 0..5 {
            assert!(rate_limit.check_and_increment());
        }
        
        // Should deny 6th request
        assert!(!rate_limit.check_and_increment());
    }

    #[test]
    fn test_websocket_message_serialization() {
        let message = WebSocketMessage {
            message_type: MessageType::Metrics,
            payload: serde_json::json!({"test": "data"}),
            timestamp: Utc::now(),
            room: Some("test_room".to_string()),
        };

        let serialized = serde_json::to_string(&message).unwrap();
        let deserialized: WebSocketMessage = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(
            std::mem::discriminant(&message.message_type),
            std::mem::discriminant(&deserialized.message_type)
        );
    }
}