use actix_web::{web, HttpResponse};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration as TokioDuration};
use tracing::{info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueuedMessage {
    pub id: String,
    pub to: String,
    pub message_type: MessageType,
    pub content: MessageContent,
    pub status: MessageStatus,
    pub attempts: u32,
    pub max_attempts: u32,
    pub created_at: DateTime<Utc>,
    pub scheduled_for: Option<DateTime<Utc>>,
    pub last_attempt_at: Option<DateTime<Utc>>,
    pub next_retry_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
    pub metadata: HashMap<String, String>,
    pub priority: Priority,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Text,
    Template,
    Media,
    Interactive,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageContent {
    Text { body: String },
    Template { 
        name: String, 
        language: String,
        parameters: Option<Vec<String>> 
    },
    Media {
        media_type: String,
        url: String,
        caption: Option<String>,
    },
    Interactive {
        interactive_type: String,
        body: serde_json::Value,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MessageStatus {
    Pending,
    Processing,
    Sent,
    Delivered,
    Read,
    Failed,
    Scheduled,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Priority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

#[derive(Debug, Clone)]
pub struct MessageQueue {
    queues: Arc<Mutex<HashMap<Priority, VecDeque<QueuedMessage>>>>,
    processing: Arc<Mutex<HashMap<String, QueuedMessage>>>,
    completed: Arc<Mutex<VecDeque<QueuedMessage>>>,
    failed: Arc<Mutex<VecDeque<QueuedMessage>>>,
    rate_limiter: Arc<RateLimiter>,
    retry_policy: RetryPolicy,
}

#[derive(Debug, Clone)]
pub struct RateLimiter {
    tier: Arc<Mutex<String>>,
    messages_sent_today: Arc<Mutex<u32>>,
    last_reset: Arc<Mutex<DateTime<Utc>>>,
    messages_per_second: Arc<Mutex<f32>>,
    last_message_time: Arc<Mutex<Option<DateTime<Utc>>>>,
}

#[derive(Debug, Clone)]
pub struct RetryPolicy {
    pub max_attempts: u32,
    pub base_delay_ms: u64,
    pub max_delay_ms: u64,
    pub exponential_base: f32,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_attempts: 5,
            base_delay_ms: 1000,      // 1 segundo
            max_delay_ms: 300000,     // 5 minutos
            exponential_base: 2.0,
        }
    }
}

impl MessageQueue {
    pub fn new() -> Self {
        let mut queues = HashMap::new();
        queues.insert(Priority::Critical, VecDeque::new());
        queues.insert(Priority::High, VecDeque::new());
        queues.insert(Priority::Normal, VecDeque::new());
        queues.insert(Priority::Low, VecDeque::new());

        Self {
            queues: Arc::new(Mutex::new(queues)),
            processing: Arc::new(Mutex::new(HashMap::new())),
            completed: Arc::new(Mutex::new(VecDeque::with_capacity(1000))),
            failed: Arc::new(Mutex::new(VecDeque::with_capacity(100))),
            rate_limiter: Arc::new(RateLimiter::new("TIER_1")),
            retry_policy: RetryPolicy::default(),
        }
    }

    pub async fn enqueue(&self, mut message: QueuedMessage) -> Result<String, String> {
        message.id = uuid::Uuid::new_v4().to_string();
        message.created_at = Utc::now();
        message.status = MessageStatus::Pending;
        
        // Se tem agendamento futuro
        if let Some(scheduled) = message.scheduled_for {
            if scheduled > Utc::now() {
                message.status = MessageStatus::Scheduled;
            }
        }

        let mut queues = self.queues.lock().unwrap();
        if let Some(queue) = queues.get_mut(&message.priority) {
            let msg_id = message.id.clone();
            queue.push_back(message);
            info!("Message {} enqueued with priority {:?}", msg_id, Priority::Normal);
            Ok(msg_id)
        } else {
            Err("Failed to enqueue message".to_string())
        }
    }

    pub async fn process_queue(&self) {
        loop {
            // Verificar rate limit
            if !self.rate_limiter.can_send_message().await {
                sleep(TokioDuration::from_millis(100)).await;
                continue;
            }

            // Buscar próxima mensagem por prioridade
            let message = self.get_next_message().await;
            
            if let Some(mut msg) = message {
                // Mover para processing
                self.mark_processing(&msg.id, msg.clone()).await;
                
                // Tentar enviar
                match self.send_message(&msg).await {
                    Ok(_) => {
                        msg.status = MessageStatus::Sent;
                        self.mark_completed(msg).await;
                    }
                    Err(e) => {
                        msg.attempts += 1;
                        msg.last_attempt_at = Some(Utc::now());
                        msg.error = Some(e.to_string());
                        
                        if msg.attempts >= msg.max_attempts {
                            msg.status = MessageStatus::Failed;
                            self.mark_failed(msg).await;
                        } else {
                            // Calcular próximo retry com backoff exponencial
                            let delay = self.calculate_retry_delay(msg.attempts);
                            msg.next_retry_at = Some(Utc::now() + Duration::milliseconds(delay as i64));
                            msg.status = MessageStatus::Pending;
                            
                            // Re-enfileirar para retry
                            self.requeue_for_retry(msg).await;
                        }
                    }
                }
            } else {
                // Nenhuma mensagem para processar
                sleep(TokioDuration::from_millis(500)).await;
            }
        }
    }

    async fn get_next_message(&self) -> Option<QueuedMessage> {
        let mut queues = self.queues.lock().unwrap();
        
        // Verificar por prioridade (Critical -> High -> Normal -> Low)
        for priority in [Priority::Critical, Priority::High, Priority::Normal, Priority::Low].iter() {
            if let Some(queue) = queues.get_mut(priority) {
                // Verificar mensagens agendadas
                while let Some(msg) = queue.front() {
                    if let Some(scheduled) = msg.scheduled_for {
                        if scheduled > Utc::now() {
                            // Ainda não é hora
                            break;
                        }
                    }
                    
                    if let Some(retry_at) = msg.next_retry_at {
                        if retry_at > Utc::now() {
                            // Ainda não é hora do retry
                            break;
                        }
                    }
                    
                    return queue.pop_front();
                }
            }
        }
        
        None
    }

    async fn mark_processing(&self, id: &str, message: QueuedMessage) {
        let mut processing = self.processing.lock().unwrap();
        processing.insert(id.to_string(), message);
    }

    async fn mark_completed(&self, message: QueuedMessage) {
        let mut processing = self.processing.lock().unwrap();
        processing.remove(&message.id);
        
        let mut completed = self.completed.lock().unwrap();
        if completed.len() >= 1000 {
            completed.pop_front();
        }
        completed.push_back(message);
        
        self.rate_limiter.increment_counter().await;
    }

    async fn mark_failed(&self, message: QueuedMessage) {
        let mut processing = self.processing.lock().unwrap();
        processing.remove(&message.id);
        
        let mut failed = self.failed.lock().unwrap();
        if failed.len() >= 100 {
            failed.pop_front();
        }
        failed.push_back(message);
    }

    async fn requeue_for_retry(&self, message: QueuedMessage) {
        let mut processing = self.processing.lock().unwrap();
        processing.remove(&message.id);
        
        let mut queues = self.queues.lock().unwrap();
        if let Some(queue) = queues.get_mut(&message.priority) {
            queue.push_back(message);
        }
    }

    fn calculate_retry_delay(&self, attempt: u32) -> u64 {
        let delay = self.retry_policy.base_delay_ms as f32 
            * self.retry_policy.exponential_base.powi(attempt as i32 - 1);
        delay.min(self.retry_policy.max_delay_ms as f32) as u64
    }

    async fn send_message(&self, message: &QueuedMessage) -> Result<(), String> {
        // Aqui integrar com WhatsApp API real
        // Por enquanto, simular envio
        
        info!("Sending message {} to {}", message.id, message.to);
        
        // Simular latência de rede
        sleep(TokioDuration::from_millis(100)).await;
        
        // Simular 95% de sucesso
        if rand::random::<f32>() > 0.05 {
            Ok(())
        } else {
            Err("Network error".to_string())
        }
    }

    pub async fn get_queue_stats(&self) -> QueueStats {
        let queues = self.queues.lock().unwrap();
        let processing = self.processing.lock().unwrap();
        let completed = self.completed.lock().unwrap();
        let failed = self.failed.lock().unwrap();
        
        let mut pending_by_priority = HashMap::new();
        for (priority, queue) in queues.iter() {
            pending_by_priority.insert(priority.clone(), queue.len());
        }
        
        QueueStats {
            pending_total: queues.values().map(|q| q.len()).sum(),
            pending_by_priority,
            processing: processing.len(),
            completed: completed.len(),
            failed: failed.len(),
            rate_limit: self.rate_limiter.get_current_limits().await,
        }
    }

    pub async fn cancel_message(&self, message_id: &str) -> Result<(), String> {
        let mut queues = self.queues.lock().unwrap();
        
        for queue in queues.values_mut() {
            if let Some(pos) = queue.iter().position(|m| m.id == message_id) {
                let mut msg = queue.remove(pos).unwrap();
                msg.status = MessageStatus::Cancelled;
                return Ok(());
            }
        }
        
        Err("Message not found".to_string())
    }

    pub async fn get_message_status(&self, message_id: &str) -> Option<MessageInfo> {
        // Verificar em processing
        if let Some(msg) = self.processing.lock().unwrap().get(message_id) {
            return Some(MessageInfo::from(msg.clone()));
        }
        
        // Verificar em queues
        let queues = self.queues.lock().unwrap();
        for queue in queues.values() {
            if let Some(msg) = queue.iter().find(|m| m.id == message_id) {
                return Some(MessageInfo::from(msg.clone()));
            }
        }
        
        // Verificar em completed
        if let Some(msg) = self.completed.lock().unwrap()
            .iter().find(|m| m.id == message_id) {
            return Some(MessageInfo::from(msg.clone()));
        }
        
        // Verificar em failed
        if let Some(msg) = self.failed.lock().unwrap()
            .iter().find(|m| m.id == message_id) {
            return Some(MessageInfo::from(msg.clone()));
        }
        
        None
    }
}

impl RateLimiter {
    pub fn new(tier: &str) -> Self {
        Self {
            tier: Arc::new(Mutex::new(tier.to_string())),
            messages_sent_today: Arc::new(Mutex::new(0)),
            last_reset: Arc::new(Mutex::new(Utc::now())),
            messages_per_second: Arc::new(Mutex::new(Self::get_rate_for_tier(tier))),
            last_message_time: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn can_send_message(&self) -> bool {
        // Resetar contador diário se necessário
        self.check_daily_reset().await;
        
        // Verificar limite diário
        let daily_limit = self.get_daily_limit().await;
        let sent_today = *self.messages_sent_today.lock().unwrap();
        
        if sent_today >= daily_limit {
            warn!("Daily message limit reached: {}/{}", sent_today, daily_limit);
            return false;
        }
        
        // Verificar rate limit por segundo
        let now = Utc::now();
        let mut last_time = self.last_message_time.lock().unwrap();
        
        if let Some(last) = *last_time {
            let elapsed = (now - last).num_milliseconds() as f32;
            let min_interval = 1000.0 / *self.messages_per_second.lock().unwrap();
            
            if elapsed < min_interval {
                return false;
            }
        }
        
        *last_time = Some(now);
        true
    }

    async fn check_daily_reset(&self) {
        let now = Utc::now();
        let mut last_reset = self.last_reset.lock().unwrap();
        
        if now.date_naive() != last_reset.date_naive() {
            *self.messages_sent_today.lock().unwrap() = 0;
            *last_reset = now;
            info!("Daily message counter reset");
        }
    }

    async fn increment_counter(&self) {
        let mut count = self.messages_sent_today.lock().unwrap();
        *count += 1;
    }

    async fn get_daily_limit(&self) -> u32 {
        let tier = self.tier.lock().unwrap();
        match tier.as_str() {
            "TIER_0" => 250,
            "TIER_1" => 1000,
            "TIER_2" => 10000,
            "TIER_3" => 100000,
            _ => 1000,
        }
    }

    fn get_rate_for_tier(tier: &str) -> f32 {
        match tier {
            "TIER_0" => 15.0,
            "TIER_1" => 40.0,
            "TIER_2" => 80.0,
            "TIER_3" => 200.0,
            _ => 40.0,
        }
    }

    pub async fn update_tier(&self, new_tier: &str) {
        *self.tier.lock().unwrap() = new_tier.to_string();
        *self.messages_per_second.lock().unwrap() = Self::get_rate_for_tier(new_tier);
        info!("Rate limiter updated to tier: {}", new_tier);
    }

    pub async fn get_current_limits(&self) -> RateLimitInfo {
        let tier = self.tier.lock().unwrap().clone();
        let sent_today = *self.messages_sent_today.lock().unwrap();
        let daily_limit = self.get_daily_limit().await;
        
        RateLimitInfo {
            tier,
            messages_sent_today: sent_today,
            daily_limit,
            remaining_today: daily_limit - sent_today,
            messages_per_second: *self.messages_per_second.lock().unwrap(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueueStats {
    pub pending_total: usize,
    pub pending_by_priority: HashMap<Priority, usize>,
    pub processing: usize,
    pub completed: usize,
    pub failed: usize,
    pub rate_limit: RateLimitInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RateLimitInfo {
    pub tier: String,
    pub messages_sent_today: u32,
    pub daily_limit: u32,
    pub remaining_today: u32,
    pub messages_per_second: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageInfo {
    pub id: String,
    pub to: String,
    pub status: MessageStatus,
    pub attempts: u32,
    pub created_at: DateTime<Utc>,
    pub last_attempt_at: Option<DateTime<Utc>>,
    pub next_retry_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
}

impl From<QueuedMessage> for MessageInfo {
    fn from(msg: QueuedMessage) -> Self {
        Self {
            id: msg.id,
            to: msg.to,
            status: msg.status,
            attempts: msg.attempts,
            created_at: msg.created_at,
            last_attempt_at: msg.last_attempt_at,
            next_retry_at: msg.next_retry_at,
            error: msg.error,
        }
    }
}

// Handlers HTTP
pub async fn enqueue_message(
    queue: web::Data<Arc<MessageQueue>>,
    payload: web::Json<QueueMessageRequest>,
) -> HttpResponse {
    let message = QueuedMessage {
        id: String::new(),
        to: payload.to.clone(),
        message_type: payload.message_type.clone(),
        content: payload.content.clone(),
        status: MessageStatus::Pending,
        attempts: 0,
        max_attempts: payload.max_attempts.unwrap_or(5),
        created_at: Utc::now(),
        scheduled_for: payload.scheduled_for,
        last_attempt_at: None,
        next_retry_at: None,
        error: None,
        metadata: payload.metadata.clone().unwrap_or_default(),
        priority: payload.priority.clone().unwrap_or(Priority::Normal),
    };
    
    match queue.enqueue(message).await {
        Ok(id) => HttpResponse::Ok().json(json!({
            "success": true,
            "message_id": id,
            "status": "queued"
        })),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e
        }))
    }
}

pub async fn get_queue_statistics(
    queue: web::Data<Arc<MessageQueue>>
) -> HttpResponse {
    let stats = queue.get_queue_stats().await;
    HttpResponse::Ok().json(stats)
}

pub async fn get_message_info(
    queue: web::Data<Arc<MessageQueue>>,
    path: web::Path<String>,
) -> HttpResponse {
    let message_id = path.into_inner();
    
    match queue.get_message_status(&message_id).await {
        Some(info) => HttpResponse::Ok().json(info),
        None => HttpResponse::NotFound().json(json!({
            "error": "Message not found"
        }))
    }
}

pub async fn cancel_queued_message(
    queue: web::Data<Arc<MessageQueue>>,
    path: web::Path<String>,
) -> HttpResponse {
    let message_id = path.into_inner();
    
    match queue.cancel_message(&message_id).await {
        Ok(_) => HttpResponse::Ok().json(json!({
            "success": true,
            "message": "Message cancelled"
        })),
        Err(e) => HttpResponse::BadRequest().json(json!({
            "error": e
        }))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueueMessageRequest {
    pub to: String,
    pub message_type: MessageType,
    pub content: MessageContent,
    pub priority: Option<Priority>,
    pub scheduled_for: Option<DateTime<Utc>>,
    pub max_attempts: Option<u32>,
    pub metadata: Option<HashMap<String, String>>,
}