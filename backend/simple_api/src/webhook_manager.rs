//! Sistema Avançado de Webhooks
//!
//! Este módulo implementa um sistema completo de webhooks com:
//! - Retry automático com backoff exponencial
//! - Assinatura HMAC-SHA256 para segurança
//! - Logging detalhado de todas tentativas
//! - Configuração por cliente/tenant
//! - Dead letter queue para webhooks falhados
//!
//! Arquitetura:
//! - WebhookManager: Coordena todas as operações
//! - WebhookEvent: Estrutura do evento a ser enviado
//! - WebhookConfig: Configuração por tenant/cliente
//! - RetryPolicy: Define políticas de retry
//! - DeadLetterQueue: Gerencia webhooks que falharam definitivamente

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use actix_web::{web, HttpResponse, HttpRequest, Result as ActixResult};
use serde::{Serialize, Deserialize};
use tokio::sync::{RwLock, Mutex};
use tokio::time::{sleep, Instant};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex;
use reqwest::Client;
// Note: backoff crate é importado mas não usado neste exemplo
use tracing::{info, warn, error, debug, instrument};
use base64::Engine;

type HmacSha256 = Hmac<Sha256>;

/// Erros relacionados ao sistema de webhooks
#[derive(thiserror::Error, Debug)]
pub enum WebhookError {
    #[error("Configuração não encontrada para o tenant: {tenant_id}")]
    ConfigNotFound { tenant_id: String },
    
    #[error("Erro de serialização: {0}")]
    SerializationError(#[from] serde_json::Error),
    
    #[error("Erro na requisição HTTP: {0}")]
    HttpError(#[from] reqwest::Error),
    
    #[error("Erro de assinatura: {message}")]
    SignatureError { message: String },
    
    #[error("URL inválida: {url}")]
    InvalidUrl { url: String },
    
    #[error("Tentativas de retry esgotadas para o webhook: {webhook_id}")]
    MaxRetriesExceeded { webhook_id: String },
    
    #[error("Erro interno: {0}")]
    InternalError(#[from] anyhow::Error),
}

/// Status de um evento de webhook
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum WebhookStatus {
    /// Pendente de envio
    Pending,
    /// Enviado com sucesso
    Success,
    /// Falha temporária, tentará novamente
    RetryPending,
    /// Falha permanente, movido para dead letter queue
    Failed,
    /// Cancelado
    Cancelled,
}

/// Severidade do evento para logging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Estrutura de um evento de webhook
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookEvent {
    /// ID único do evento
    pub id: String,
    /// ID do tenant/cliente
    pub tenant_id: String,
    /// Tipo do evento (ex: "message.sent", "user.created")
    pub event_type: String,
    /// Dados do evento
    pub payload: serde_json::Value,
    /// Timestamp de criação
    pub created_at: DateTime<Utc>,
    /// URL de destino (se diferente da configuração padrão)
    pub target_url: Option<String>,
    /// Headers personalizados
    pub custom_headers: HashMap<String, String>,
    /// Severidade do evento
    pub severity: EventSeverity,
    /// Contexto adicional
    pub context: HashMap<String, String>,
}

impl WebhookEvent {
    /// Cria um novo evento de webhook
    pub fn new(
        tenant_id: String,
        event_type: String,
        payload: serde_json::Value,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            tenant_id,
            event_type,
            payload,
            created_at: Utc::now(),
            target_url: None,
            custom_headers: HashMap::new(),
            severity: EventSeverity::Medium,
            context: HashMap::new(),
        }
    }
    
    /// Adiciona headers personalizados
    pub fn with_headers(mut self, headers: HashMap<String, String>) -> Self {
        self.custom_headers = headers;
        self
    }
    
    /// Define a severidade do evento
    pub fn with_severity(mut self, severity: EventSeverity) -> Self {
        self.severity = severity;
        self
    }
    
    /// Define uma URL específica para este evento
    pub fn with_target_url(mut self, url: String) -> Self {
        self.target_url = Some(url);
        self
    }
    
    /// Adiciona contexto ao evento
    pub fn with_context(mut self, key: String, value: String) -> Self {
        self.context.insert(key, value);
        self
    }
}

/// Política de retry para webhooks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryPolicy {
    /// Número máximo de tentativas
    pub max_retries: u32,
    /// Delay inicial (em segundos)
    pub initial_delay_seconds: u64,
    /// Multiplicador para backoff exponencial
    pub backoff_multiplier: f64,
    /// Delay máximo entre tentativas (em segundos)
    pub max_delay_seconds: u64,
    /// Jitter para evitar thundering herd
    pub jitter: bool,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 5,
            initial_delay_seconds: 1,
            backoff_multiplier: 2.0,
            max_delay_seconds: 300, // 5 minutos
            jitter: true,
        }
    }
}

/// Configuração de webhooks por tenant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookConfig {
    /// ID do tenant
    pub tenant_id: String,
    /// URL base para webhooks
    pub base_url: String,
    /// Secret key para assinatura HMAC
    pub secret_key: String,
    /// Headers padrão a serem incluídos
    pub default_headers: HashMap<String, String>,
    /// Política de retry
    pub retry_policy: RetryPolicy,
    /// Timeout para requisições (em segundos)
    pub timeout_seconds: u64,
    /// Eventos habilitados
    pub enabled_events: Vec<String>,
    /// Se o webhook está ativo
    pub active: bool,
    /// Configurações de autenticação adicional
    pub auth_config: Option<AuthConfig>,
}

/// Configuração de autenticação para webhooks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    /// Tipo de autenticação (Bearer, Basic, ApiKey)
    pub auth_type: String,
    /// Token/key de autenticação
    pub token: String,
    /// Header para autenticação (padrão: Authorization)
    pub header_name: Option<String>,
}

impl WebhookConfig {
    /// Cria uma nova configuração de webhook
    pub fn new(tenant_id: String, base_url: String, secret_key: String) -> Self {
        Self {
            tenant_id,
            base_url,
            secret_key,
            default_headers: HashMap::new(),
            retry_policy: RetryPolicy::default(),
            timeout_seconds: 30,
            enabled_events: vec!["*".to_string()], // Todos os eventos por padrão
            active: true,
            auth_config: None,
        }
    }
    
    /// Verifica se um evento está habilitado
    pub fn is_event_enabled(&self, event_type: &str) -> bool {
        if !self.active {
            return false;
        }
        
        self.enabled_events.contains(&"*".to_string()) ||
        self.enabled_events.contains(&event_type.to_string()) ||
        self.enabled_events.iter().any(|pattern| {
            // Suporte para wildcards simples
            if pattern.ends_with("*") {
                let prefix = &pattern[..pattern.len()-1];
                event_type.starts_with(prefix)
            } else {
                false
            }
        })
    }
}

/// Tentativa de envio de webhook
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookAttempt {
    /// ID da tentativa
    pub id: String,
    /// ID do evento relacionado
    pub event_id: String,
    /// Número da tentativa (1-based)
    pub attempt_number: u32,
    /// Timestamp da tentativa
    pub attempted_at: DateTime<Utc>,
    /// Status HTTP da resposta (se houver)
    pub response_status: Option<u16>,
    /// Corpo da resposta (limitado)
    pub response_body: Option<String>,
    /// Tempo de resposta em ms
    pub response_time_ms: Option<u64>,
    /// Erro (se houver)
    pub error: Option<String>,
    /// Se foi bem-sucedida
    pub success: bool,
}

impl WebhookAttempt {
    /// Cria uma nova tentativa
    pub fn new(event_id: String, attempt_number: u32) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            event_id,
            attempt_number,
            attempted_at: Utc::now(),
            response_status: None,
            response_body: None,
            response_time_ms: None,
            error: None,
            success: false,
        }
    }
}

/// Entrada na Dead Letter Queue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeadLetterEntry {
    /// Evento que falhou
    pub event: WebhookEvent,
    /// Todas as tentativas realizadas
    pub attempts: Vec<WebhookAttempt>,
    /// Timestamp quando foi movido para DLQ
    pub failed_at: DateTime<Utc>,
    /// Razão da falha final
    pub failure_reason: String,
    /// Se pode ser reprocessado
    pub can_retry: bool,
}

/// Métricas de webhook
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct WebhookMetrics {
    /// Total de eventos processados
    pub total_events: u64,
    /// Eventos bem-sucedidos
    pub successful_events: u64,
    /// Eventos falhados
    pub failed_events: u64,
    /// Eventos em retry
    pub pending_retries: u64,
    /// Eventos na dead letter queue
    pub dead_letter_count: u64,
    /// Tempo médio de resposta (ms)
    pub avg_response_time_ms: f64,
    /// Timestamp da última atualização
    pub last_updated: DateTime<Utc>,
}

impl WebhookMetrics {
    /// Atualiza métricas com uma nova tentativa
    pub fn update_with_attempt(&mut self, attempt: &WebhookAttempt, is_final: bool) {
        if is_final {
            if attempt.success {
                self.successful_events += 1;
            } else {
                self.failed_events += 1;
            }
        }
        
        if let Some(response_time) = attempt.response_time_ms {
            // Média móvel simples
            let count = self.successful_events + self.failed_events;
            if count > 0 {
                self.avg_response_time_ms = 
                    (self.avg_response_time_ms * (count - 1) as f64 + response_time as f64) / count as f64;
            } else {
                self.avg_response_time_ms = response_time as f64;
            }
        }
        
        self.last_updated = Utc::now();
    }
}

/// Manager principal do sistema de webhooks
pub struct WebhookManager {
    /// Configurações por tenant
    configs: Arc<RwLock<HashMap<String, WebhookConfig>>>,
    /// Cliente HTTP reutilizável
    http_client: Client,
    /// Dead Letter Queue
    dead_letter_queue: Arc<RwLock<Vec<DeadLetterEntry>>>,
    /// Eventos pendentes de retry
    retry_queue: Arc<RwLock<HashMap<String, (WebhookEvent, Vec<WebhookAttempt>)>>>,
    /// Métricas por tenant
    metrics: Arc<RwLock<HashMap<String, WebhookMetrics>>>,
    /// Worker de retry em background
    retry_worker_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl WebhookManager {
    /// Cria uma nova instância do WebhookManager
    pub fn new() -> Arc<Self> {
        let manager = Arc::new(Self {
            configs: Arc::new(RwLock::new(HashMap::new())),
            http_client: Client::builder()
                .timeout(Duration::from_secs(60))
                .build()
                .expect("Failed to create HTTP client"),
            dead_letter_queue: Arc::new(RwLock::new(Vec::new())),
            retry_queue: Arc::new(RwLock::new(HashMap::new())),
            metrics: Arc::new(RwLock::new(HashMap::new())),
            retry_worker_handle: Arc::new(Mutex::new(None)),
        });
        
        // Inicia worker de retry
        manager.clone().start_retry_worker();
        
        manager
    }
    
    /// Configura webhook para um tenant
    #[instrument(skip(self))]
    pub async fn configure_tenant(&self, config: WebhookConfig) -> Result<(), WebhookError> {
        info!("Configurando webhook para tenant: {}", config.tenant_id);
        
        // Validação básica
        if config.base_url.is_empty() {
            return Err(WebhookError::InvalidUrl { 
                url: config.base_url.clone() 
            });
        }
        
        if config.secret_key.is_empty() {
            return Err(WebhookError::SignatureError {
                message: "Secret key não pode estar vazio".to_string(),
            });
        }
        
        let tenant_id = config.tenant_id.clone();
        
        // Armazena configuração
        {
            let mut configs = self.configs.write().await;
            configs.insert(tenant_id.clone(), config);
        }
        
        // Inicializa métricas se não existir
        {
            let mut metrics = self.metrics.write().await;
            metrics.entry(tenant_id.clone()).or_default();
        }
        
        info!("Webhook configurado com sucesso para tenant: {}", tenant_id);
        Ok(())
    }
    
    /// Obtém configuração de um tenant
    pub async fn get_tenant_config(&self, tenant_id: &str) -> Option<WebhookConfig> {
        let configs = self.configs.read().await;
        configs.get(tenant_id).cloned()
    }
    
    /// Remove configuração de um tenant
    pub async fn remove_tenant_config(&self, tenant_id: &str) -> bool {
        let mut configs = self.configs.write().await;
        configs.remove(tenant_id).is_some()
    }
    
    /// Lista todos os tenants configurados
    pub async fn list_tenants(&self) -> Vec<String> {
        let configs = self.configs.read().await;
        configs.keys().cloned().collect()
    }
    
    /// Envia um evento de webhook
    #[instrument(skip(self, event))]
    pub async fn send_event(&self, event: WebhookEvent) -> Result<String, WebhookError> {
        let event_id = event.id.clone();
        let tenant_id = event.tenant_id.clone();
        
        info!("Enviando webhook - Event: {}, Tenant: {}, Type: {}", 
              event_id, tenant_id, event.event_type);
        
        // Obtém configuração do tenant
        let config = self.get_tenant_config(&tenant_id).await
            .ok_or_else(|| WebhookError::ConfigNotFound { 
                tenant_id: tenant_id.clone() 
            })?;
        
        // Verifica se o evento está habilitado
        if !config.is_event_enabled(&event.event_type) {
            debug!("Evento {} não está habilitado para tenant {}", 
                   event.event_type, tenant_id);
            return Ok(event_id);
        }
        
        // Tenta enviar imediatamente
        let attempt = self.attempt_send(&event, &config, 1).await;
        
        if attempt.success {
            // Sucesso na primeira tentativa
            self.update_metrics(&tenant_id, &attempt, true).await;
            info!("Webhook enviado com sucesso - Event: {}", event_id);
            Ok(event_id)
        } else {
            // Adiciona à fila de retry
            info!("Webhook falhou, adicionando à fila de retry - Event: {}", event_id);
            {
                let mut retry_queue = self.retry_queue.write().await;
                retry_queue.insert(event_id.clone(), (event, vec![attempt]));
            }
            
            self.update_pending_retries_metric(&tenant_id, 1).await;
            Ok(event_id)
        }
    }
    
    /// Realiza uma tentativa de envio
    #[instrument(skip(self, event, config))]
    async fn attempt_send(&self, event: &WebhookEvent, config: &WebhookConfig, attempt_number: u32) -> WebhookAttempt {
        let mut attempt = WebhookAttempt::new(event.id.clone(), attempt_number);
        let start_time = Instant::now();
        
        debug!("Tentativa {} para evento {}", attempt_number, event.id);
        
        // Determina URL de destino
        let target_url = event.target_url.as_ref()
            .unwrap_or(&config.base_url)
            .clone();
        
        // Prepara payload
        let payload = match self.prepare_payload(event) {
            Ok(p) => p,
            Err(e) => {
                attempt.error = Some(format!("Erro na preparação do payload: {}", e));
                return attempt;
            }
        };
        
        // Calcula assinatura
        let signature = match self.calculate_signature(&payload, &config.secret_key) {
            Ok(s) => s,
            Err(e) => {
                attempt.error = Some(format!("Erro no cálculo da assinatura: {}", e));
                return attempt;
            }
        };
        
        // Prepara headers
        let mut headers = config.default_headers.clone();
        headers.extend(event.custom_headers.clone());
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers.insert("X-Webhook-Signature".to_string(), signature);
        headers.insert("X-Event-Type".to_string(), event.event_type.clone());
        headers.insert("X-Event-ID".to_string(), event.id.clone());
        headers.insert("X-Tenant-ID".to_string(), event.tenant_id.clone());
        headers.insert("X-Timestamp".to_string(), event.created_at.timestamp().to_string());
        
        // Adiciona autenticação se configurada
        if let Some(auth) = &config.auth_config {
            let header_name = auth.header_name.as_deref().unwrap_or("Authorization");
            let auth_value = match auth.auth_type.as_str() {
                "Bearer" => format!("Bearer {}", auth.token),
                "ApiKey" => auth.token.clone(),
                "Basic" => format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(&auth.token)),
                _ => auth.token.clone(),
            };
            headers.insert(header_name.to_string(), auth_value);
        }
        
        // Constrói requisição
        let mut request = self.http_client
            .post(&target_url)
            .timeout(Duration::from_secs(config.timeout_seconds))
            .body(payload);
        
        // Adiciona headers
        for (key, value) in headers {
            request = request.header(&key, &value);
        }
        
        // Envia requisição
        match request.send().await {
            Ok(response) => {
                let status = response.status().as_u16();
                let response_time = start_time.elapsed().as_millis() as u64;
                
                attempt.response_status = Some(status);
                attempt.response_time_ms = Some(response_time);
                
                // Lê corpo da resposta (limitado a 1KB)
                match response.text().await {
                    Ok(body) => {
                        let truncated_body = if body.len() > 1024 {
                            format!("{}...", &body[..1024])
                        } else {
                            body
                        };
                        attempt.response_body = Some(truncated_body);
                    }
                    Err(e) => {
                        warn!("Erro ao ler corpo da resposta: {}", e);
                    }
                }
                
                // Considera sucesso códigos 2xx
                attempt.success = (200..300).contains(&status);
                
                if attempt.success {
                    info!("Webhook enviado com sucesso - Event: {}, Status: {}, Time: {}ms", 
                          event.id, status, response_time);
                } else {
                    warn!("Webhook falhou - Event: {}, Status: {}, Time: {}ms", 
                          event.id, status, response_time);
                }
            }
            Err(e) => {
                let response_time = start_time.elapsed().as_millis() as u64;
                attempt.response_time_ms = Some(response_time);
                attempt.error = Some(e.to_string());
                
                error!("Erro na requisição do webhook - Event: {}, Error: {}, Time: {}ms", 
                       event.id, e, response_time);
            }
        }
        
        attempt
    }
    
    /// Prepara payload JSON
    fn prepare_payload(&self, event: &WebhookEvent) -> Result<String, WebhookError> {
        let wrapper = serde_json::json!({
            "event_id": event.id,
            "event_type": event.event_type,
            "tenant_id": event.tenant_id,
            "timestamp": event.created_at.timestamp(),
            "data": event.payload,
            "severity": event.severity,
            "context": event.context
        });
        
        serde_json::to_string(&wrapper).map_err(WebhookError::from)
    }
    
    /// Calcula assinatura HMAC-SHA256
    fn calculate_signature(&self, payload: &str, secret: &str) -> Result<String, WebhookError> {
        let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
            .map_err(|e| WebhookError::SignatureError {
                message: format!("Erro ao criar HMAC: {}", e),
            })?;
        
        mac.update(payload.as_bytes());
        let result = mac.finalize();
        let signature = hex::encode(result.into_bytes());
        
        Ok(format!("sha256={}", signature))
    }
    
    /// Verifica assinatura de webhook recebido
    pub fn verify_signature(&self, payload: &str, signature: &str, secret: &str) -> bool {
        match self.calculate_signature(payload, secret) {
            Ok(expected) => {
                // Comparação constante no tempo para evitar timing attacks
                expected.len() == signature.len() &&
                expected.as_bytes().iter()
                    .zip(signature.as_bytes())
                    .fold(0, |acc, (a, b)| acc | (a ^ b)) == 0
            }
            Err(_) => false,
        }
    }
    
    /// Inicia worker de background para processar retries
    fn start_retry_worker(self: Arc<Self>) {
        let configs = self.configs.clone();
        let retry_queue = self.retry_queue.clone();
        let dead_letter_queue = self.dead_letter_queue.clone();
        let metrics = self.metrics.clone();
        let http_client = self.http_client.clone();
        let manager_ref = self.clone();
        let retry_worker_handle_ref = self.retry_worker_handle.clone();
        
        let handle = tokio::spawn(async move {
            info!("Worker de retry de webhooks iniciado");
            
            loop {
                // Processa retries a cada 5 segundos
                sleep(Duration::from_secs(5)).await;
                
                let events_to_retry: Vec<(String, WebhookEvent, Vec<WebhookAttempt>)> = {
                    let queue = retry_queue.read().await;
                    queue.iter()
                        .map(|(id, (event, attempts))| (id.clone(), event.clone(), attempts.clone()))
                        .collect()
                };
                
                for (event_id, event, attempts) in events_to_retry {
                    let tenant_id = event.tenant_id.clone();
                    
                    // Obtém configuração
                    let config = match {
                        let configs_guard = configs.read().await;
                        configs_guard.get(&tenant_id).cloned()
                    } {
                        Some(c) => c,
                        None => {
                            warn!("Configuração não encontrada para tenant {}, removendo evento da fila", tenant_id);
                            retry_queue.write().await.remove(&event_id);
                            continue;
                        }
                    };
                    
                    let retry_policy = &config.retry_policy;
                    let last_attempt = attempts.last().unwrap();
                    
                    // Verifica se deve tentar novamente
                    if attempts.len() as u32 >= retry_policy.max_retries {
                        // Move para dead letter queue
                        info!("Movendo webhook para dead letter queue - Event: {}", event_id);
                        
                        let dlq_entry = DeadLetterEntry {
                            event: event.clone(),
                            attempts: attempts.clone(),
                            failed_at: Utc::now(),
                            failure_reason: format!("Máximo de {} tentativas excedido", retry_policy.max_retries),
                            can_retry: true,
                        };
                        
                        dead_letter_queue.write().await.push(dlq_entry);
                        retry_queue.write().await.remove(&event_id);
                        
                        // Atualiza métricas
                        manager_ref.update_metrics(&tenant_id, last_attempt, true).await;
                        manager_ref.update_pending_retries_metric(&tenant_id, -1).await;
                        manager_ref.update_dead_letter_metric(&tenant_id, 1).await;
                        
                        continue;
                    }
                    
                    // Calcula delay para próxima tentativa
                    let attempt_number = attempts.len() as u32;
                    let delay = manager_ref.calculate_retry_delay(retry_policy, attempt_number);
                    
                    // Verifica se é hora de tentar novamente
                    let time_since_last = Utc::now().timestamp() - last_attempt.attempted_at.timestamp();
                    if time_since_last < delay.as_secs() as i64 {
                        continue; // Ainda não é hora
                    }
                    
                    debug!("Tentando reenvio - Event: {}, Attempt: {}", event_id, attempt_number + 1);
                    
                    // Realiza nova tentativa
                    let new_attempt = manager_ref.attempt_send(&event, &config, attempt_number + 1).await;
                    
                    if new_attempt.success {
                        // Sucesso! Remove da fila de retry
                        info!("Webhook reenviado com sucesso após {} tentativas - Event: {}", 
                              attempt_number + 1, event_id);
                        
                        retry_queue.write().await.remove(&event_id);
                        manager_ref.update_metrics(&tenant_id, &new_attempt, true).await;
                        manager_ref.update_pending_retries_metric(&tenant_id, -1).await;
                    } else {
                        // Ainda falhou, atualiza tentativas
                        debug!("Tentativa {} falhou para evento {}", attempt_number + 1, event_id);
                        
                        if let Some((_, attempts)) = retry_queue.write().await.get_mut(&event_id) {
                            attempts.push(new_attempt);
                        }
                    }
                }
            }
        });
        
        // Armazena o handle do worker no manager
        tokio::spawn(async move {
            let mut handle_guard = retry_worker_handle_ref.lock().await;
            *handle_guard = Some(handle);
        });
    }
    
    /// Calcula delay para retry com backoff exponencial
    fn calculate_retry_delay(&self, policy: &RetryPolicy, attempt_number: u32) -> Duration {
        let base_delay = policy.initial_delay_seconds as f64;
        let multiplier = policy.backoff_multiplier;
        let max_delay = policy.max_delay_seconds as f64;
        
        let delay = base_delay * multiplier.powi(attempt_number as i32 - 1);
        let delay = delay.min(max_delay);
        
        let final_delay = if policy.jitter {
            // Adiciona jitter de ±20%
            let jitter_range = delay * 0.2;
            let jitter = (rand::random::<f64>() - 0.5) * 2.0 * jitter_range;
            (delay + jitter).max(0.0)
        } else {
            delay
        };
        
        Duration::from_secs_f64(final_delay)
    }
    
    /// Atualiza métricas com uma tentativa
    async fn update_metrics(&self, tenant_id: &str, attempt: &WebhookAttempt, is_final: bool) {
        let mut metrics = self.metrics.write().await;
        let tenant_metrics = metrics.entry(tenant_id.to_string()).or_default();
        tenant_metrics.update_with_attempt(attempt, is_final);
    }
    
    /// Atualiza contador de retries pendentes
    async fn update_pending_retries_metric(&self, tenant_id: &str, delta: i64) {
        let mut metrics = self.metrics.write().await;
        let tenant_metrics = metrics.entry(tenant_id.to_string()).or_default();
        
        if delta > 0 {
            tenant_metrics.pending_retries += delta as u64;
        } else {
            tenant_metrics.pending_retries = tenant_metrics.pending_retries.saturating_sub((-delta) as u64);
        }
        
        tenant_metrics.last_updated = Utc::now();
    }
    
    /// Atualiza contador de dead letter queue
    async fn update_dead_letter_metric(&self, tenant_id: &str, delta: i64) {
        let mut metrics = self.metrics.write().await;
        let tenant_metrics = metrics.entry(tenant_id.to_string()).or_default();
        
        if delta > 0 {
            tenant_metrics.dead_letter_count += delta as u64;
        } else {
            tenant_metrics.dead_letter_count = tenant_metrics.dead_letter_count.saturating_sub((-delta) as u64);
        }
        
        tenant_metrics.last_updated = Utc::now();
    }
    
    /// Obtém métricas de um tenant
    pub async fn get_tenant_metrics(&self, tenant_id: &str) -> Option<WebhookMetrics> {
        let metrics = self.metrics.read().await;
        metrics.get(tenant_id).cloned()
    }
    
    /// Obtém métricas de todos os tenants
    pub async fn get_all_metrics(&self) -> HashMap<String, WebhookMetrics> {
        let metrics = self.metrics.read().await;
        metrics.clone()
    }
    
    /// Lista eventos na dead letter queue
    pub async fn list_dead_letter_events(&self, tenant_id: Option<&str>) -> Vec<DeadLetterEntry> {
        let dlq = self.dead_letter_queue.read().await;
        match tenant_id {
            Some(tid) => dlq.iter()
                .filter(|entry| entry.event.tenant_id == tid)
                .cloned()
                .collect(),
            None => dlq.clone(),
        }
    }
    
    /// Reprocessa evento da dead letter queue
    pub async fn retry_dead_letter_event(&self, event_id: &str) -> Result<String, WebhookError> {
        let event = {
            let mut dlq = self.dead_letter_queue.write().await;
            let pos = dlq.iter().position(|entry| entry.event.id == event_id);
            
            match pos {
                Some(index) => {
                    let entry = dlq.remove(index);
                    if !entry.can_retry {
                        return Err(WebhookError::InternalError(
                            anyhow::anyhow!("Evento não pode ser reprocessado")
                        ));
                    }
                    entry.event
                }
                None => {
                    return Err(WebhookError::InternalError(
                        anyhow::anyhow!("Evento não encontrado na dead letter queue")
                    ));
                }
            }
        };
        
        info!("Reprocessando evento da dead letter queue: {}", event_id);
        self.update_dead_letter_metric(&event.tenant_id, -1).await;
        self.send_event(event).await
    }
    
    /// Limpa dead letter queue de um tenant
    pub async fn clear_dead_letter_queue(&self, tenant_id: &str) -> usize {
        let mut dlq = self.dead_letter_queue.write().await;
        let initial_len = dlq.len();
        dlq.retain(|entry| entry.event.tenant_id != tenant_id);
        let removed = initial_len - dlq.len();
        
        if removed > 0 {
            self.update_dead_letter_metric(tenant_id, -(removed as i64)).await;
        }
        
        removed
    }
    
    /// Para o worker de retry (para testes)
    #[cfg(test)]
    pub async fn stop_retry_worker(&self) {
        let mut handle = self.retry_worker_handle.lock().await;
        if let Some(h) = handle.take() {
            h.abort();
        }
    }
}

// Default implementation removed due to Arc<WebhookManager> return type from new()

// ===== HANDLERS HTTP =====

/// Request para configurar webhook
#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigureWebhookRequest {
    pub tenant_id: String,
    pub base_url: String,
    pub secret_key: String,
    pub default_headers: Option<HashMap<String, String>>,
    pub retry_policy: Option<RetryPolicy>,
    pub timeout_seconds: Option<u64>,
    pub enabled_events: Option<Vec<String>>,
    pub active: Option<bool>,
    pub auth_config: Option<AuthConfig>,
}

/// Request para enviar webhook
#[derive(Debug, Serialize, Deserialize)]
pub struct SendWebhookRequest {
    pub tenant_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub target_url: Option<String>,
    pub custom_headers: Option<HashMap<String, String>>,
    pub severity: Option<EventSeverity>,
    pub context: Option<HashMap<String, String>>,
}

/// Response padrão
#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub timestamp: DateTime<Utc>,
}

impl<T> WebhookResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            timestamp: Utc::now(),
        }
    }
    
    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
            timestamp: Utc::now(),
        }
    }
}

/// Configura webhook para um tenant
pub async fn configure_webhook(
    webhook_manager: web::Data<WebhookManager>,
    request: web::Json<ConfigureWebhookRequest>,
) -> ActixResult<HttpResponse> {
    let req = request.into_inner();
    
    let mut config = WebhookConfig::new(
        req.tenant_id.clone(),
        req.base_url,
        req.secret_key,
    );
    
    // Aplica configurações opcionais
    if let Some(headers) = req.default_headers {
        config.default_headers = headers;
    }
    
    if let Some(policy) = req.retry_policy {
        config.retry_policy = policy;
    }
    
    if let Some(timeout) = req.timeout_seconds {
        config.timeout_seconds = timeout;
    }
    
    if let Some(events) = req.enabled_events {
        config.enabled_events = events;
    }
    
    if let Some(active) = req.active {
        config.active = active;
    }
    
    if let Some(auth) = req.auth_config {
        config.auth_config = Some(auth);
    }
    
    match webhook_manager.configure_tenant(config).await {
        Ok(()) => Ok(HttpResponse::Ok().json(
            WebhookResponse::success("Webhook configurado com sucesso")
        )),
        Err(e) => Ok(HttpResponse::BadRequest().json(
            WebhookResponse::<()>::error(e.to_string())
        )),
    }
}

/// Envia evento de webhook
pub async fn send_webhook(
    webhook_manager: web::Data<WebhookManager>,
    request: web::Json<SendWebhookRequest>,
) -> ActixResult<HttpResponse> {
    let req = request.into_inner();
    
    let mut event = WebhookEvent::new(
        req.tenant_id,
        req.event_type,
        req.payload,
    );
    
    // Aplica configurações opcionais
    if let Some(url) = req.target_url {
        event = event.with_target_url(url);
    }
    
    if let Some(headers) = req.custom_headers {
        event = event.with_headers(headers);
    }
    
    if let Some(severity) = req.severity {
        event = event.with_severity(severity);
    }
    
    if let Some(context) = req.context {
        for (key, value) in context {
            event = event.with_context(key, value);
        }
    }
    
    match webhook_manager.send_event(event).await {
        Ok(event_id) => Ok(HttpResponse::Ok().json(
            WebhookResponse::success(serde_json::json!({
                "event_id": event_id,
                "message": "Evento enviado para processamento"
            }))
        )),
        Err(e) => Ok(HttpResponse::BadRequest().json(
            WebhookResponse::<()>::error(e.to_string())
        )),
    }
}

/// Lista configurações de webhooks
pub async fn list_webhook_configs(
    webhook_manager: web::Data<WebhookManager>,
) -> ActixResult<HttpResponse> {
    let tenants = webhook_manager.list_tenants().await;
    let mut configs = Vec::new();
    
    for tenant_id in tenants {
        if let Some(config) = webhook_manager.get_tenant_config(&tenant_id).await {
            // Remove secret_key por segurança
            let mut safe_config = config;
            safe_config.secret_key = "***".to_string();
            configs.push(safe_config);
        }
    }
    
    Ok(HttpResponse::Ok().json(
        WebhookResponse::success(configs)
    ))
}

/// Obtém métricas de webhooks
pub async fn get_webhook_metrics(
    webhook_manager: web::Data<WebhookManager>,
    path: web::Path<String>,
) -> ActixResult<HttpResponse> {
    let tenant_id = path.into_inner();
    
    match webhook_manager.get_tenant_metrics(&tenant_id).await {
        Some(metrics) => Ok(HttpResponse::Ok().json(
            WebhookResponse::success(metrics)
        )),
        None => Ok(HttpResponse::NotFound().json(
            WebhookResponse::<()>::error("Tenant não encontrado".to_string())
        )),
    }
}

/// Lista eventos na dead letter queue
pub async fn list_dead_letter_events(
    webhook_manager: web::Data<WebhookManager>,
    query: web::Query<HashMap<String, String>>,
) -> ActixResult<HttpResponse> {
    let tenant_id = query.get("tenant_id").map(|s| s.as_str());
    let events = webhook_manager.list_dead_letter_events(tenant_id).await;
    
    Ok(HttpResponse::Ok().json(
        WebhookResponse::success(events)
    ))
}

/// Reprocessa evento da dead letter queue
pub async fn retry_dead_letter_event(
    webhook_manager: web::Data<WebhookManager>,
    path: web::Path<String>,
) -> ActixResult<HttpResponse> {
    let event_id = path.into_inner();
    
    match webhook_manager.retry_dead_letter_event(&event_id).await {
        Ok(new_event_id) => Ok(HttpResponse::Ok().json(
            WebhookResponse::success(serde_json::json!({
                "event_id": new_event_id,
                "message": "Evento reprocessado com sucesso"
            }))
        )),
        Err(e) => Ok(HttpResponse::BadRequest().json(
            WebhookResponse::<()>::error(e.to_string())
        )),
    }
}

/// Remove configuração de webhook
pub async fn remove_webhook_config(
    webhook_manager: web::Data<WebhookManager>,
    path: web::Path<String>,
) -> ActixResult<HttpResponse> {
    let tenant_id = path.into_inner();
    
    if webhook_manager.remove_tenant_config(&tenant_id).await {
        Ok(HttpResponse::Ok().json(
            WebhookResponse::success("Configuração removida com sucesso")
        ))
    } else {
        Ok(HttpResponse::NotFound().json(
            WebhookResponse::<()>::error("Tenant não encontrado".to_string())
        ))
    }
}

/// Webhook endpoint para receber callbacks (exemplo)
pub async fn receive_webhook(
    webhook_manager: web::Data<WebhookManager>,
    req: HttpRequest,
    body: web::Bytes,
) -> ActixResult<HttpResponse> {
    let tenant_id = req.headers()
        .get("X-Tenant-ID")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("default");
        
    let signature = req.headers()
        .get("X-Webhook-Signature")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    
    // Obtém configuração para verificação
    let config = match webhook_manager.get_tenant_config(tenant_id).await {
        Some(c) => c,
        None => {
            return Ok(HttpResponse::Unauthorized().json(
                WebhookResponse::<()>::error("Tenant não configurado".to_string())
            ));
        }
    };
    
    // Verifica assinatura
    let payload = String::from_utf8_lossy(&body);
    if !webhook_manager.verify_signature(&payload, signature, &config.secret_key) {
        warn!("Assinatura inválida para webhook recebido de tenant: {}", tenant_id);
        return Ok(HttpResponse::Unauthorized().json(
            WebhookResponse::<()>::error("Assinatura inválida".to_string())
        ));
    }
    
    info!("Webhook recebido e verificado para tenant: {}", tenant_id);
    
    Ok(HttpResponse::Ok().json(
        WebhookResponse::success("Webhook recebido com sucesso")
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::{timeout, Duration as TokioDuration};
    
    #[tokio::test]
    async fn test_webhook_manager_creation() {
        let manager = WebhookManager::new();
        assert!(manager.list_tenants().await.is_empty());
    }
    
    #[tokio::test]
    async fn test_webhook_configuration() {
        let manager = WebhookManager::new();
        
        let config = WebhookConfig::new(
            "test-tenant".to_string(),
            "https://example.com/webhook".to_string(),
            "test-secret".to_string(),
        );
        
        assert!(manager.configure_tenant(config).await.is_ok());
        assert_eq!(manager.list_tenants().await.len(), 1);
        
        let retrieved = manager.get_tenant_config("test-tenant").await;
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().base_url, "https://example.com/webhook");
    }
    
    #[tokio::test]
    async fn test_event_enabled_check() {
        let mut config = WebhookConfig::new(
            "test".to_string(),
            "https://example.com".to_string(),
            "secret".to_string(),
        );
        
        // Todos os eventos habilitados por padrão
        assert!(config.is_event_enabled("user.created"));
        assert!(config.is_event_enabled("order.completed"));
        
        // Eventos específicos
        config.enabled_events = vec!["user.created".to_string(), "user.*".to_string()];
        assert!(config.is_event_enabled("user.created"));
        assert!(config.is_event_enabled("user.updated"));
        assert!(!config.is_event_enabled("order.completed"));
        
        // Webhook inativo
        config.active = false;
        assert!(!config.is_event_enabled("user.created"));
    }
    
    #[tokio::test]
    async fn test_signature_calculation() {
        let manager = WebhookManager::new();
        let payload = r#"{"test": "data"}"#;
        let secret = "test-secret";
        
        let signature = manager.calculate_signature(payload, secret).unwrap();
        assert!(signature.starts_with("sha256="));
        
        // Verifica que a mesma entrada produz a mesma assinatura
        let signature2 = manager.calculate_signature(payload, secret).unwrap();
        assert_eq!(signature, signature2);
        
        // Verifica verificação
        assert!(manager.verify_signature(payload, &signature, secret));
        assert!(!manager.verify_signature(payload, &signature, "wrong-secret"));
        assert!(!manager.verify_signature(payload, "wrong-signature", secret));
    }
    
    #[tokio::test]
    async fn test_retry_delay_calculation() {
        let manager = WebhookManager::new();
        let policy = RetryPolicy {
            max_retries: 3,
            initial_delay_seconds: 1,
            backoff_multiplier: 2.0,
            max_delay_seconds: 60,
            jitter: false,
        };
        
        let delay1 = manager.calculate_retry_delay(&policy, 1);
        let delay2 = manager.calculate_retry_delay(&policy, 2);
        let delay3 = manager.calculate_retry_delay(&policy, 3);
        
        assert_eq!(delay1, Duration::from_secs(1));
        assert_eq!(delay2, Duration::from_secs(2));
        assert_eq!(delay3, Duration::from_secs(4));
    }
    
    #[tokio::test]
    async fn test_payload_preparation() {
        let manager = WebhookManager::new();
        
        let event = WebhookEvent::new(
            "test-tenant".to_string(),
            "test.event".to_string(),
            serde_json::json!({"key": "value"}),
        );
        
        let payload = manager.prepare_payload(&event).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&payload).unwrap();
        
        assert_eq!(parsed["event_type"], "test.event");
        assert_eq!(parsed["tenant_id"], "test-tenant");
        assert_eq!(parsed["data"]["key"], "value");
        assert!(parsed["timestamp"].is_number());
    }
    
    #[tokio::test]
    async fn test_metrics_update() {
        let manager = WebhookManager::new();
        
        let attempt = WebhookAttempt {
            id: "test".to_string(),
            event_id: "event".to_string(),
            attempt_number: 1,
            attempted_at: Utc::now(),
            response_status: Some(200),
            response_body: None,
            response_time_ms: Some(100),
            error: None,
            success: true,
        };
        
        manager.update_metrics("test-tenant", &attempt, true).await;
        
        let metrics = manager.get_tenant_metrics("test-tenant").await.unwrap();
        assert_eq!(metrics.successful_events, 1);
        assert_eq!(metrics.avg_response_time_ms, 100.0);
    }
}