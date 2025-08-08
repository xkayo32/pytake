use actix_web::{web, HttpResponse};
use chrono::{DateTime, Datelike, NaiveTime, Utc, Timelike};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tracing::info;
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoResponse {
    pub id: String,
    pub name: String,
    pub trigger: TriggerType,
    pub response: ResponseAction,
    pub active: bool,
    pub priority: i32,
    pub business_hours_only: bool,
    pub delay_seconds: Option<u32>,
    pub max_uses_per_contact: Option<u32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TriggerType {
    Keyword { 
        words: Vec<String>,
        match_type: MatchType,
    },
    Pattern { 
        regex: String 
    },
    Welcome,
    Away,
    OutOfHours,
    NoAgent,
    Default,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MatchType {
    Exact,
    Contains,
    StartsWith,
    EndsWith,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action")]
pub enum ResponseAction {
    SendMessage { 
        text: String,
        buttons: Option<Vec<Button>>,
    },
    SendTemplate { 
        template_name: String,
        parameters: Option<Vec<String>>,
    },
    SendMenu { 
        title: String,
        options: Vec<MenuOption>,
    },
    TransferToAgent {
        department: Option<String>,
    },
    AddTag {
        tags: Vec<String>,
    },
    ExecuteFlow {
        flow_id: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Button {
    pub id: String,
    pub text: String,
    pub action: ButtonAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ButtonAction {
    Reply { text: String },
    Url { url: String },
    Call { phone: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuOption {
    pub id: String,
    pub number: String,
    pub text: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AutoResponder {
    rules: Arc<Mutex<Vec<AutoResponse>>>,
    usage_counter: Arc<Mutex<HashMap<String, HashMap<String, u32>>>>,
    business_hours: BusinessHours,
    default_responses: DefaultResponses,
}

#[derive(Debug, Clone)]
pub struct BusinessHours {
    pub enabled: bool,
    pub timezone: String,
    pub monday: Option<(NaiveTime, NaiveTime)>,
    pub tuesday: Option<(NaiveTime, NaiveTime)>,
    pub wednesday: Option<(NaiveTime, NaiveTime)>,
    pub thursday: Option<(NaiveTime, NaiveTime)>,
    pub friday: Option<(NaiveTime, NaiveTime)>,
    pub saturday: Option<(NaiveTime, NaiveTime)>,
    pub sunday: Option<(NaiveTime, NaiveTime)>,
}

impl Default for BusinessHours {
    fn default() -> Self {
        let start = NaiveTime::from_hms_opt(9, 0, 0).unwrap();
        let end = NaiveTime::from_hms_opt(18, 0, 0).unwrap();
        
        Self {
            enabled: true,
            timezone: "America/Sao_Paulo".to_string(),
            monday: Some((start, end)),
            tuesday: Some((start, end)),
            wednesday: Some((start, end)),
            thursday: Some((start, end)),
            friday: Some((start, end)),
            saturday: None,
            sunday: None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DefaultResponses {
    pub welcome: String,
    pub away: String,
    pub out_of_hours: String,
    pub no_agent: String,
    pub fallback: String,
}

impl Default for DefaultResponses {
    fn default() -> Self {
        Self {
            welcome: "Olá! Bem-vindo ao PyTake. Como posso ajudar você hoje?".to_string(),
            away: "No momento todos os nossos atendentes estão ocupados. Por favor, aguarde que em breve retornaremos.".to_string(),
            out_of_hours: "Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Deixe sua mensagem que responderemos assim que possível.".to_string(),
            no_agent: "Todos os nossos agentes estão ocupados. Você será atendido em breve.".to_string(),
            fallback: "Desculpe, não entendi sua mensagem. Digite MENU para ver as opções disponíveis ou AJUDA para falar com um atendente.".to_string(),
        }
    }
}

impl AutoResponder {
    pub fn new() -> Self {
        let mut responder = Self {
            rules: Arc::new(Mutex::new(Vec::new())),
            usage_counter: Arc::new(Mutex::new(HashMap::new())),
            business_hours: BusinessHours::default(),
            default_responses: DefaultResponses::default(),
        };
        
        // Adicionar regras padrão
        responder.add_default_rules();
        responder
    }

    fn add_default_rules(&mut self) {
        let mut rules = self.rules.lock().unwrap();
        
        // Regra de boas-vindas
        rules.push(AutoResponse {
            id: "welcome".to_string(),
            name: "Mensagem de Boas-vindas".to_string(),
            trigger: TriggerType::Welcome,
            response: ResponseAction::SendMessage {
                text: self.default_responses.welcome.clone(),
                buttons: Some(vec![
                    Button {
                        id: "menu".to_string(),
                        text: "Ver Menu".to_string(),
                        action: ButtonAction::Reply { text: "MENU".to_string() },
                    },
                    Button {
                        id: "support".to_string(),
                        text: "Suporte".to_string(),
                        action: ButtonAction::Reply { text: "SUPORTE".to_string() },
                    },
                ]),
            },
            active: true,
            priority: 100,
            business_hours_only: false,
            delay_seconds: Some(1),
            max_uses_per_contact: Some(1),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
        
        // Menu principal
        rules.push(AutoResponse {
            id: "menu".to_string(),
            name: "Menu Principal".to_string(),
            trigger: TriggerType::Keyword {
                words: vec!["menu".to_string(), "opcoes".to_string(), "opções".to_string()],
                match_type: MatchType::Contains,
            },
            response: ResponseAction::SendMenu {
                title: "Menu Principal".to_string(),
                options: vec![
                    MenuOption {
                        id: "1".to_string(),
                        number: "1".to_string(),
                        text: "Suporte Técnico".to_string(),
                        description: Some("Ajuda com problemas técnicos".to_string()),
                    },
                    MenuOption {
                        id: "2".to_string(),
                        number: "2".to_string(),
                        text: "Vendas".to_string(),
                        description: Some("Informações sobre produtos e preços".to_string()),
                    },
                    MenuOption {
                        id: "3".to_string(),
                        number: "3".to_string(),
                        text: "Financeiro".to_string(),
                        description: Some("Faturas e pagamentos".to_string()),
                    },
                    MenuOption {
                        id: "4".to_string(),
                        number: "4".to_string(),
                        text: "Falar com Atendente".to_string(),
                        description: Some("Conversar com um humano".to_string()),
                    },
                ],
            },
            active: true,
            priority: 90,
            business_hours_only: false,
            delay_seconds: None,
            max_uses_per_contact: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
        
        // Horário de funcionamento
        rules.push(AutoResponse {
            id: "hours".to_string(),
            name: "Horário de Funcionamento".to_string(),
            trigger: TriggerType::Keyword {
                words: vec!["horario".to_string(), "horário".to_string(), "funcionamento".to_string(), "atendimento".to_string()],
                match_type: MatchType::Contains,
            },
            response: ResponseAction::SendMessage {
                text: "📅 Nosso horário de atendimento:\n\n🕐 Segunda a Sexta: 9h às 18h\n🚫 Sábados e Domingos: Fechado\n\n💬 Fora do horário comercial, deixe sua mensagem que responderemos assim que possível!".to_string(),
                buttons: None,
            },
            active: true,
            priority: 80,
            business_hours_only: false,
            delay_seconds: None,
            max_uses_per_contact: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
        
        // Transferir para atendente
        rules.push(AutoResponse {
            id: "agent".to_string(),
            name: "Transferir para Atendente".to_string(),
            trigger: TriggerType::Keyword {
                words: vec!["atendente".to_string(), "humano".to_string(), "pessoa".to_string(), "ajuda".to_string(), "suporte".to_string()],
                match_type: MatchType::Contains,
            },
            response: ResponseAction::TransferToAgent {
                department: Some("support".to_string()),
            },
            active: true,
            priority: 70,
            business_hours_only: true,
            delay_seconds: None,
            max_uses_per_contact: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
        
        // Fora do horário comercial
        rules.push(AutoResponse {
            id: "out_of_hours".to_string(),
            name: "Fora do Horário".to_string(),
            trigger: TriggerType::OutOfHours,
            response: ResponseAction::SendMessage {
                text: self.default_responses.out_of_hours.clone(),
                buttons: None,
            },
            active: true,
            priority: 60,
            business_hours_only: false,
            delay_seconds: None,
            max_uses_per_contact: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
        
        // Resposta padrão (fallback)
        rules.push(AutoResponse {
            id: "fallback".to_string(),
            name: "Resposta Padrão".to_string(),
            trigger: TriggerType::Default,
            response: ResponseAction::SendMessage {
                text: self.default_responses.fallback.clone(),
                buttons: Some(vec![
                    Button {
                        id: "menu".to_string(),
                        text: "Menu".to_string(),
                        action: ButtonAction::Reply { text: "MENU".to_string() },
                    },
                    Button {
                        id: "help".to_string(),
                        text: "Ajuda".to_string(),
                        action: ButtonAction::Reply { text: "AJUDA".to_string() },
                    },
                ]),
            },
            active: true,
            priority: 0, // Menor prioridade
            business_hours_only: false,
            delay_seconds: Some(2),
            max_uses_per_contact: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        });
    }

    pub async fn process_message(&self, from: &str, message: &str, is_first_message: bool) -> Option<ResponseAction> {
        info!("Processing message from {} : '{}'", from, message);
        
        // Verificar se é primeira mensagem
        if is_first_message {
            if let Some(rule) = self.find_rule_by_trigger(TriggerType::Welcome) {
                if self.can_use_rule(from, &rule.id) {
                    self.increment_usage(from, &rule.id);
                    return Some(rule.response.clone());
                }
            }
        }
        
        // Verificar se está fora do horário comercial
        if !self.is_business_hours() {
            if let Some(rule) = self.find_rule_by_trigger(TriggerType::OutOfHours) {
                if rule.active {
                    return Some(rule.response.clone());
                }
            }
        }
        
        // Buscar regras por prioridade
        let mut rules = self.rules.lock().unwrap().clone();
        rules.sort_by(|a, b| b.priority.cmp(&a.priority));
        
        for rule in rules {
            if !rule.active {
                continue;
            }
            
            if rule.business_hours_only && !self.is_business_hours() {
                continue;
            }
            
            if !self.can_use_rule(from, &rule.id) {
                continue;
            }
            
            if self.matches_trigger(&rule.trigger, message) {
                self.increment_usage(from, &rule.id);
                info!("Matched rule: {} for message from {}", rule.name, from);
                return Some(rule.response.clone());
            }
        }
        
        // Se nenhuma regra específica, usar fallback
        if let Some(rule) = self.find_rule_by_trigger(TriggerType::Default) {
            if rule.active {
                return Some(rule.response.clone());
            }
        }
        
        None
    }

    fn matches_trigger(&self, trigger: &TriggerType, message: &str) -> bool {
        let message_lower = message.to_lowercase();
        
        match trigger {
            TriggerType::Keyword { words, match_type } => {
                for word in words {
                    let word_lower = word.to_lowercase();
                    let matched = match match_type {
                        MatchType::Exact => message_lower == word_lower,
                        MatchType::Contains => message_lower.contains(&word_lower),
                        MatchType::StartsWith => message_lower.starts_with(&word_lower),
                        MatchType::EndsWith => message_lower.ends_with(&word_lower),
                    };
                    
                    if matched {
                        return true;
                    }
                }
                false
            },
            TriggerType::Pattern { regex } => {
                if let Ok(re) = Regex::new(regex) {
                    re.is_match(message)
                } else {
                    false
                }
            },
            _ => false,
        }
    }

    fn find_rule_by_trigger(&self, trigger_type: TriggerType) -> Option<AutoResponse> {
        let rules = self.rules.lock().unwrap();
        rules.iter()
            .find(|r| std::mem::discriminant(&r.trigger) == std::mem::discriminant(&trigger_type))
            .cloned()
    }

    fn can_use_rule(&self, contact: &str, rule_id: &str) -> bool {
        let rules = self.rules.lock().unwrap();
        let rule = rules.iter().find(|r| r.id == rule_id);
        
        if let Some(rule) = rule {
            if let Some(max_uses) = rule.max_uses_per_contact {
                let counter = self.usage_counter.lock().unwrap();
                if let Some(contact_usage) = counter.get(contact) {
                    if let Some(count) = contact_usage.get(rule_id) {
                        return *count < max_uses;
                    }
                }
            }
        }
        
        true
    }

    fn increment_usage(&self, contact: &str, rule_id: &str) {
        let mut counter = self.usage_counter.lock().unwrap();
        let contact_usage = counter.entry(contact.to_string()).or_insert_with(HashMap::new);
        *contact_usage.entry(rule_id.to_string()).or_insert(0) += 1;
    }

    fn is_business_hours(&self) -> bool {
        if !self.business_hours.enabled {
            return true;
        }
        
        let now = Utc::now();
        let hour = now.hour();
        let minute = now.minute();
        let current_time = NaiveTime::from_hms_opt(hour, minute, 0).unwrap();
        
        let weekday = now.date_naive().weekday();
        let hours = match weekday {
            chrono::Weekday::Mon => self.business_hours.monday,
            chrono::Weekday::Tue => self.business_hours.tuesday,
            chrono::Weekday::Wed => self.business_hours.wednesday,
            chrono::Weekday::Thu => self.business_hours.thursday,
            chrono::Weekday::Fri => self.business_hours.friday,
            chrono::Weekday::Sat => self.business_hours.saturday,
            chrono::Weekday::Sun => self.business_hours.sunday,
        };
        
        if let Some((start, end)) = hours {
            current_time >= start && current_time <= end
        } else {
            false
        }
    }

    pub async fn add_rule(&self, rule: AutoResponse) -> Result<String, String> {
        let mut rules = self.rules.lock().unwrap();
        let rule_id = rule.id.clone();
        rules.push(rule);
        info!("Added auto-response rule: {}", rule_id);
        Ok(rule_id)
    }

    pub async fn update_rule(&self, rule_id: &str, updated_rule: AutoResponse) -> Result<(), String> {
        let mut rules = self.rules.lock().unwrap();
        if let Some(rule) = rules.iter_mut().find(|r| r.id == rule_id) {
            *rule = updated_rule;
            info!("Updated auto-response rule: {}", rule_id);
            Ok(())
        } else {
            Err("Rule not found".to_string())
        }
    }

    pub async fn delete_rule(&self, rule_id: &str) -> Result<(), String> {
        let mut rules = self.rules.lock().unwrap();
        if let Some(pos) = rules.iter().position(|r| r.id == rule_id) {
            rules.remove(pos);
            info!("Deleted auto-response rule: {}", rule_id);
            Ok(())
        } else {
            Err("Rule not found".to_string())
        }
    }

    pub async fn list_rules(&self) -> Vec<AutoResponse> {
        self.rules.lock().unwrap().clone()
    }

    pub async fn toggle_rule(&self, rule_id: &str, active: bool) -> Result<(), String> {
        let mut rules = self.rules.lock().unwrap();
        if let Some(rule) = rules.iter_mut().find(|r| r.id == rule_id) {
            rule.active = active;
            info!("Toggled auto-response rule {} to {}", rule_id, active);
            Ok(())
        } else {
            Err("Rule not found".to_string())
        }
    }

    pub async fn update_business_hours(&self, _hours: BusinessHours) {
        // Em produção, salvar no banco de dados
        info!("Business hours updated");
    }

    pub async fn reset_usage_counter(&self, contact: Option<String>) {
        let mut counter = self.usage_counter.lock().unwrap();
        if let Some(contact) = contact {
            counter.remove(&contact);
            info!("Reset usage counter for contact: {}", contact);
        } else {
            counter.clear();
            info!("Reset all usage counters");
        }
    }
}

// HTTP Handlers
pub async fn process_incoming_message(
    responder: web::Data<Arc<AutoResponder>>,
    payload: web::Json<IncomingMessage>,
) -> HttpResponse {
    let response = responder.process_message(
        &payload.from,
        &payload.message,
        payload.is_first_message.unwrap_or(false)
    ).await;
    
    match response {
        Some(action) => HttpResponse::Ok().json(json!({
            "success": true,
            "response": action
        })),
        None => HttpResponse::Ok().json(json!({
            "success": false,
            "message": "No matching rule found"
        }))
    }
}

pub async fn list_auto_responses(
    responder: web::Data<Arc<AutoResponder>>
) -> HttpResponse {
    let rules = responder.list_rules().await;
    HttpResponse::Ok().json(json!({
        "rules": rules,
        "total": rules.len()
    }))
}

pub async fn create_auto_response(
    responder: web::Data<Arc<AutoResponder>>,
    payload: web::Json<AutoResponse>,
) -> HttpResponse {
    match responder.add_rule(payload.into_inner()).await {
        Ok(id) => HttpResponse::Ok().json(json!({
            "success": true,
            "rule_id": id
        })),
        Err(e) => HttpResponse::BadRequest().json(json!({
            "error": e
        }))
    }
}

pub async fn update_auto_response(
    responder: web::Data<Arc<AutoResponder>>,
    path: web::Path<String>,
    payload: web::Json<AutoResponse>,
) -> HttpResponse {
    let rule_id = path.into_inner();
    match responder.update_rule(&rule_id, payload.into_inner()).await {
        Ok(_) => HttpResponse::Ok().json(json!({
            "success": true,
            "message": "Rule updated"
        })),
        Err(e) => HttpResponse::BadRequest().json(json!({
            "error": e
        }))
    }
}

pub async fn delete_auto_response(
    responder: web::Data<Arc<AutoResponder>>,
    path: web::Path<String>,
) -> HttpResponse {
    let rule_id = path.into_inner();
    match responder.delete_rule(&rule_id).await {
        Ok(_) => HttpResponse::Ok().json(json!({
            "success": true,
            "message": "Rule deleted"
        })),
        Err(e) => HttpResponse::BadRequest().json(json!({
            "error": e
        }))
    }
}

pub async fn toggle_auto_response(
    responder: web::Data<Arc<AutoResponder>>,
    path: web::Path<String>,
    payload: web::Json<ToggleRequest>,
) -> HttpResponse {
    let rule_id = path.into_inner();
    match responder.toggle_rule(&rule_id, payload.active).await {
        Ok(_) => HttpResponse::Ok().json(json!({
            "success": true,
            "message": "Rule toggled"
        })),
        Err(e) => HttpResponse::BadRequest().json(json!({
            "error": e
        }))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomingMessage {
    pub from: String,
    pub message: String,
    pub is_first_message: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ToggleRequest {
    pub active: bool,
}