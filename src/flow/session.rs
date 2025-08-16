use super::*;
use anyhow::{Result, anyhow};
use redis::AsyncCommands;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct FlowSessionManager {
    redis_client: Arc<redis::Client>,
    cache: Arc<RwLock<HashMap<String, FlowSession>>>,
}

impl FlowSessionManager {
    pub fn new(redis_url: &str) -> Result<Self> {
        let redis_client = redis::Client::open(redis_url)?;
        
        Ok(Self {
            redis_client: Arc::new(redis_client),
            cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    pub async fn save_session(&self, session: &FlowSession) -> Result<()> {
        // Salvar no Redis
        let mut conn = self.redis_client.get_async_connection().await?;
        let session_json = serde_json::to_string(session)?;
        let key = format!("flow_session:{}", session.id);
        
        // TTL de 24 horas por padrão
        let ttl = session.expires_at
            .map(|exp| (exp - Utc::now()).num_seconds())
            .unwrap_or(86400);
        
        conn.setex(&key, ttl, session_json).await?;
        
        // Salvar no cache local
        let mut cache = self.cache.write().await;
        cache.insert(session.id.clone(), session.clone());
        
        // Indexar por contact_id para lookup rápido
        let contact_key = format!("flow_session_by_contact:{}", session.contact_id);
        conn.setex(&contact_key, ttl, &session.id).await?;
        
        Ok(())
    }

    pub async fn get_session(&self, session_id: &str) -> Result<Option<FlowSession>> {
        // Tentar buscar do cache primeiro
        {
            let cache = self.cache.read().await;
            if let Some(session) = cache.get(session_id) {
                return Ok(Some(session.clone()));
            }
        }
        
        // Buscar do Redis
        let mut conn = self.redis_client.get_async_connection().await?;
        let key = format!("flow_session:{}", session_id);
        
        let session_json: Option<String> = conn.get(&key).await?;
        if let Some(json) = session_json {
            let session: FlowSession = serde_json::from_str(&json)?;
            
            // Atualizar cache
            let mut cache = self.cache.write().await;
            cache.insert(session.id.clone(), session.clone());
            
            Ok(Some(session))
        } else {
            Ok(None)
        }
    }

    pub async fn get_active_session_by_contact(&self, contact_id: &str) -> Result<Option<FlowSession>> {
        let mut conn = self.redis_client.get_async_connection().await?;
        let contact_key = format!("flow_session_by_contact:{}", contact_id);
        
        let session_id: Option<String> = conn.get(&contact_key).await?;
        if let Some(id) = session_id {
            self.get_session(&id).await
        } else {
            Ok(None)
        }
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<()> {
        // Remover do Redis
        let mut conn = self.redis_client.get_async_connection().await?;
        
        // Buscar sessão para obter contact_id
        if let Some(session) = self.get_session(session_id).await? {
            let key = format!("flow_session:{}", session_id);
            let contact_key = format!("flow_session_by_contact:{}", session.contact_id);
            
            conn.del(&key).await?;
            conn.del(&contact_key).await?;
        }
        
        // Remover do cache
        let mut cache = self.cache.write().await;
        cache.remove(session_id);
        
        Ok(())
    }

    pub async fn list_active_sessions(&self) -> Result<Vec<FlowSession>> {
        let mut conn = self.redis_client.get_async_connection().await?;
        let pattern = "flow_session:*";
        let keys: Vec<String> = conn.keys(pattern).await?;
        
        let mut sessions = Vec::new();
        for key in keys {
            if let Ok(Some(json)) = conn.get::<String, Option<String>>(&key).await {
                if let Ok(session) = serde_json::from_str::<FlowSession>(&json) {
                    if session.status == FlowSessionStatus::Active || session.status == FlowSessionStatus::Waiting {
                        sessions.push(session);
                    }
                }
            }
        }
        
        Ok(sessions)
    }

    pub async fn cleanup_expired_sessions(&self) -> Result<u32> {
        let mut conn = self.redis_client.get_async_connection().await?;
        let pattern = "flow_session:*";
        let keys: Vec<String> = conn.keys(pattern).await?;
        
        let mut cleaned_count = 0;
        let now = Utc::now();
        
        for key in keys {
            if let Ok(Some(json)) = conn.get::<String, Option<String>>(&key).await {
                if let Ok(session) = serde_json::from_str::<FlowSession>(&json) {
                    if let Some(expires_at) = session.expires_at {
                        if now > expires_at {
                            self.delete_session(&session.id).await?;
                            cleaned_count += 1;
                        }
                    } else {
                        // Sessões sem expiração que estão inativas há mais de 24h
                        let inactive_duration = now - session.last_activity;
                        if inactive_duration.num_hours() > 24 {
                            self.delete_session(&session.id).await?;
                            cleaned_count += 1;
                        }
                    }
                }
            }
        }
        
        // Limpar cache local também
        let mut cache = self.cache.write().await;
        cache.retain(|_, session| {
            if let Some(expires_at) = session.expires_at {
                now <= expires_at
            } else {
                (now - session.last_activity).num_hours() <= 24
            }
        });
        
        Ok(cleaned_count)
    }

    pub async fn get_session_stats(&self) -> Result<SessionStats> {
        let sessions = self.list_active_sessions().await?;
        
        let mut stats = SessionStats {
            total_active: 0,
            waiting_for_input: 0,
            executing: 0,
            by_flow: HashMap::new(),
        };
        
        for session in sessions {
            stats.total_active += 1;
            
            match session.status {
                FlowSessionStatus::Waiting => stats.waiting_for_input += 1,
                FlowSessionStatus::Active => stats.executing += 1,
                _ => {}
            }
            
            *stats.by_flow.entry(session.flow_id).or_insert(0) += 1;
        }
        
        Ok(stats)
    }
}

#[derive(Debug, Serialize)]
pub struct SessionStats {
    pub total_active: u32,
    pub waiting_for_input: u32,
    pub executing: u32,
    pub by_flow: HashMap<String, u32>,
}