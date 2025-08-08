use actix_web::{web, HttpResponse};
use chrono::{DateTime, Duration, Utc};
use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::env;

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthStatus {
    pub phone_number: Option<String>,
    pub verified_name: Option<String>,
    pub status: PhoneStatus,
    pub limits: MessagingLimits,
    pub health_score: u8,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PhoneStatus {
    pub phone_status: Option<String>,
    pub quality_rating: String,
    pub platform_type: Option<String>,
    pub name_status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessagingLimits {
    pub messaging_limit: String,
    pub rate_limit_tier: String,
    pub daily_limit: i64,
    pub remaining: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Analytics {
    pub period: Period,
    pub messages: MessageStats,
    pub conversations: ConversationStats,
    pub engagement: EngagementStats,
    pub costs: CostStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Period {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub days: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageStats {
    pub sent: i64,
    pub delivered: i64,
    pub read: i64,
    pub received: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationStats {
    pub total: i64,
    pub service: i64,
    pub business_initiated: i64,
    pub user_initiated: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EngagementStats {
    pub delivery_rate: String,
    pub read_rate: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CostStats {
    pub total: f64,
    pub currency: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QualityMetrics {
    pub quality_rating: String,
    pub quality_score: Option<f64>,
    pub recommendations: Vec<String>,
    pub risk_factors: Vec<String>,
    pub improvement_tips: Vec<String>,
    pub status: QualityStatus,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QualityStatus {
    pub is_healthy: bool,
    pub needs_attention: bool,
    pub blocked: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MetricsDashboard {
    pub overview: DashboardOverview,
    pub today: TodayStats,
    pub alerts: Vec<Alert>,
    pub recommendations: Vec<String>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardOverview {
    pub phone_number: Option<String>,
    pub verified_name: Option<String>,
    pub health_score: u8,
    pub quality_rating: String,
    pub tier: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TodayStats {
    pub messages_sent: i64,
    pub messages_delivered: i64,
    pub active_conversations: i64,
    pub delivery_rate: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Alert {
    pub alert_type: String,
    pub message: String,
}

// Handler para obter saúde do número
pub async fn get_phone_health() -> HttpResponse {
    let access_token = env::var("WHATSAPP_ACCESS_TOKEN")
        .unwrap_or_else(|_| "".to_string());
    let phone_number_id = env::var("WHATSAPP_PHONE_NUMBER_ID")
        .unwrap_or_else(|_| "574293335763643".to_string());
    
    let client = reqwest::Client::new();
    let url = format!(
        "https://graph.facebook.com/v21.0/{}", 
        phone_number_id
    );
    
    let params = [
        ("fields", "display_phone_number,verified_name,quality_rating,status,code_verification_status,platform_type,throughput,name_status")
    ];
    
    match client.get(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .query(&params)
        .send()
        .await
    {
        Ok(response) => {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                // Calcular health score
                let quality_rating = data["quality_rating"].as_str().unwrap_or("UNKNOWN");
                let health_score = calculate_health_score(quality_rating);
                
                let health_status = json!({
                    "phone_number": data["display_phone_number"],
                    "verified_name": data["verified_name"],
                    "status": {
                        "phone_status": data["status"],
                        "quality_rating": quality_rating,
                        "platform_type": data["platform_type"],
                        "name_status": data["name_status"]
                    },
                    "limits": {
                        "messaging_limit": "TIER_1",
                        "rate_limit_tier": "TIER_1",
                        "daily_limit": 1000,
                        "remaining": 950
                    },
                    "health_score": health_score,
                    "timestamp": Utc::now()
                });
                
                HttpResponse::Ok().json(health_status)
            } else {
                HttpResponse::InternalServerError().json(json!({
                    "error": "Failed to parse WhatsApp API response"
                }))
            }
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to fetch phone health: {}", e)
            }))
        }
    }
}

// Handler para obter analytics
pub async fn get_message_analytics(query: web::Query<HashMap<String, String>>) -> HttpResponse {
    let days = query.get("days")
        .and_then(|d| d.parse::<i64>().ok())
        .unwrap_or(7);
    
    let access_token = env::var("WHATSAPP_ACCESS_TOKEN")
        .unwrap_or_else(|_| "".to_string());
    let business_account_id = env::var("WHATSAPP_BUSINESS_ACCOUNT_ID")
        .unwrap_or_else(|_| "603204376199428".to_string());
    
    let end_date = Utc::now();
    let start_date = end_date - Duration::days(days);
    
    // Por enquanto retornar dados de exemplo
    // Em produção, fazer chamadas reais para API do Meta
    let analytics = json!({
        "period": {
            "start": start_date,
            "end": end_date,
            "days": days
        },
        "messages": {
            "sent": 1250,
            "delivered": 1200,
            "read": 980,
            "received": 850
        },
        "conversations": {
            "total": 125,
            "service": 50,
            "business_initiated": 45,
            "user_initiated": 30
        },
        "engagement": {
            "delivery_rate": "96.0%",
            "read_rate": "81.7%"
        },
        "costs": {
            "total": 12.50,
            "currency": "USD"
        }
    });
    
    HttpResponse::Ok().json(analytics)
}

// Handler para métricas de qualidade
pub async fn get_quality_metrics() -> HttpResponse {
    let access_token = env::var("WHATSAPP_ACCESS_TOKEN")
        .unwrap_or_else(|_| "".to_string());
    let phone_number_id = env::var("WHATSAPP_PHONE_NUMBER_ID")
        .unwrap_or_else(|_| "574293335763643".to_string());
    
    let client = reqwest::Client::new();
    let url = format!(
        "https://graph.facebook.com/v21.0/{}", 
        phone_number_id
    );
    
    match client.get(&url)
        .header("Authorization", format!("Bearer {}", access_token))
        .query(&[("fields", "quality_rating,quality_score,status")])
        .send()
        .await
    {
        Ok(response) => {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                let quality_rating = data["quality_rating"].as_str().unwrap_or("UNKNOWN");
                
                let quality = json!({
                    "quality_rating": quality_rating,
                    "quality_score": data["quality_score"],
                    "recommendations": generate_recommendations(quality_rating),
                    "risk_factors": identify_risk_factors(quality_rating),
                    "improvement_tips": [
                        "Responda mensagens em até 24 horas",
                        "Evite enviar mensagens não solicitadas",
                        "Use templates aprovados para mensagens iniciais",
                        "Mantenha conversas relevantes e úteis",
                        "Respeite horários comerciais apropriados"
                    ],
                    "status": {
                        "is_healthy": quality_rating == "HIGH" || quality_rating == "MEDIUM",
                        "needs_attention": quality_rating == "LOW",
                        "blocked": data["status"] == "BLOCKED"
                    }
                });
                
                HttpResponse::Ok().json(quality)
            } else {
                HttpResponse::InternalServerError().json(json!({
                    "error": "Failed to parse quality metrics"
                }))
            }
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to fetch quality metrics: {}", e)
            }))
        }
    }
}

// Handler para limites de mensagens
pub async fn get_messaging_limits() -> HttpResponse {
    let tier = "TIER_1"; // Obter do Meta API em produção
    
    let limits = json!({
        "messaging_limits": {
            "tier": tier,
            "daily_limit": get_tier_limit(tier),
            "current_usage": 50,
            "remaining": 950
        },
        "template_limits": {
            "daily_template_limit": "UNLIMITED",
            "templates_created": 5
        },
        "rate_limits": {
            "messages_per_second": get_rate_limit(tier),
            "business_initiated_per_day": get_tier_limit(tier),
            "user_initiated_window": "24 hours"
        },
        "upgrade_info": {
            "current_tier": tier,
            "next_tier": get_next_tier(tier),
            "requirements": get_tier_requirements(tier)
        }
    });
    
    HttpResponse::Ok().json(limits)
}

// Handler para dashboard completo
pub async fn get_metrics_dashboard() -> HttpResponse {
    // Coletar todas as métricas
    let health = get_phone_health().await;
    let analytics = get_message_analytics(web::Query(HashMap::new())).await;
    let quality = get_quality_metrics().await;
    let limits = get_messaging_limits().await;
    
    // Por enquanto, retornar dashboard de exemplo
    let dashboard = json!({
        "overview": {
            "phone_number": "+55 61 99401-3828",
            "verified_name": "PyTake",
            "health_score": 85,
            "quality_rating": "HIGH",
            "tier": "TIER_1"
        },
        "today": {
            "messages_sent": 125,
            "messages_delivered": 120,
            "active_conversations": 15,
            "delivery_rate": "96.0%"
        },
        "alerts": generate_alerts(),
        "recommendations": [
            "Continue mantendo alta qualidade nas conversas",
            "Considere implementar respostas automáticas para FAQ"
        ],
        "generated_at": Utc::now()
    });
    
    HttpResponse::Ok().json(dashboard)
}

// Funções auxiliares
fn calculate_health_score(quality_rating: &str) -> u8 {
    match quality_rating {
        "HIGH" => 100,
        "MEDIUM" => 80,
        "LOW" => 40,
        _ => 50
    }
}

fn generate_recommendations(quality_rating: &str) -> Vec<String> {
    match quality_rating {
        "LOW" => vec![
            "URGENTE: Melhorar qualidade das conversas para evitar bloqueio".to_string(),
            "Reduzir mensagens não solicitadas".to_string(),
            "Aumentar taxa de resposta dos clientes".to_string()
        ],
        "MEDIUM" => vec![
            "Manter boas práticas de mensageria".to_string(),
            "Monitorar feedback dos clientes".to_string()
        ],
        _ => vec!["Continue mantendo alta qualidade nas conversas".to_string()]
    }
}

fn identify_risk_factors(quality_rating: &str) -> Vec<String> {
    let mut risks = Vec::new();
    
    if quality_rating == "LOW" {
        risks.push("Quality rating baixo - risco de restrições".to_string());
    }
    
    risks
}

fn get_tier_limit(tier: &str) -> i64 {
    match tier {
        "TIER_0" => 250,
        "TIER_1" => 1000,
        "TIER_2" => 10000,
        "TIER_3" => 100000,
        _ => 1000
    }
}

fn get_rate_limit(tier: &str) -> i32 {
    match tier {
        "TIER_0" => 15,
        "TIER_1" => 40,
        "TIER_2" => 80,
        "TIER_3" => 200,
        _ => 40
    }
}

fn get_next_tier(current_tier: &str) -> &str {
    match current_tier {
        "TIER_0" => "TIER_1",
        "TIER_1" => "TIER_2",
        "TIER_2" => "TIER_3",
        "TIER_3" => "TIER_4",
        _ => "MAX_TIER"
    }
}

fn get_tier_requirements(tier: &str) -> Vec<String> {
    match tier {
        "TIER_0" => vec![
            "Verificar número de telefone".to_string(),
            "Manter quality rating alto".to_string()
        ],
        "TIER_1" => vec![
            "Enviar mais de 1000 mensagens".to_string(),
            "Manter baixa taxa de bloqueio".to_string()
        ],
        _ => vec!["Continuar com boas práticas".to_string()]
    }
}

fn generate_alerts() -> Vec<serde_json::Value> {
    vec![
        json!({
            "alert_type": "info",
            "message": "Sistema de métricas WhatsApp ativo"
        })
    ]
}