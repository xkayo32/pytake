use super::*;
use super::nodes::*;
use super::session::FlowSessionManager;
use crate::whatsapp::WhatsAppService;
use anyhow::{Result, anyhow};
use std::sync::Arc;
use tokio::sync::RwLock;
use regex::Regex;

pub struct FlowEngine {
    session_manager: Arc<FlowSessionManager>,
    whatsapp_service: Arc<WhatsAppService>,
    flows: Arc<RwLock<HashMap<String, Flow>>>,
}

impl FlowEngine {
    pub fn new(
        session_manager: Arc<FlowSessionManager>,
        whatsapp_service: Arc<WhatsAppService>,
    ) -> Self {
        Self {
            session_manager,
            whatsapp_service,
            flows: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Iniciar um novo flow
    pub async fn start_flow(
        &self,
        flow_id: String,
        contact_id: String,
        conversation_id: String,
        trigger_data: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<FlowSession> {
        let flows = self.flows.read().await;
        let flow = flows.get(&flow_id)
            .ok_or_else(|| anyhow!("Flow not found: {}", flow_id))?;
        
        // Encontrar node de entrada
        let start_node = flow.nodes.iter()
            .find(|n| n.node_type == "entry" || n.node_type == "trigger")
            .or_else(|| flow.nodes.first())
            .ok_or_else(|| anyhow!("No start node found in flow"))?;

        // Criar sessão
        let session = FlowSession {
            id: Uuid::new_v4().to_string(),
            flow_id: flow_id.clone(),
            contact_id: contact_id.clone(),
            conversation_id: conversation_id.clone(),
            current_node_id: start_node.id.clone(),
            status: FlowSessionStatus::Active,
            context: HashMap::new(),
            variables: trigger_data.unwrap_or_default(),
            started_at: Utc::now(),
            last_activity: Utc::now(),
            expires_at: flow.settings.timeout_minutes.map(|m| {
                Utc::now() + chrono::Duration::minutes(m as i64)
            }),
        };

        // Salvar sessão
        self.session_manager.save_session(&session).await?;

        // Executar primeiro node
        self.execute_node(session.clone(), flow.clone()).await?;

        Ok(session)
    }

    /// Processar resposta do usuário
    pub async fn process_user_response(
        &self,
        session_id: String,
        user_input: String,
        selection_id: Option<String>,
    ) -> Result<()> {
        let mut session = self.session_manager.get_session(&session_id).await?
            .ok_or_else(|| anyhow!("Session not found"))?;

        if session.status != FlowSessionStatus::Waiting {
            return Err(anyhow!("Session is not waiting for input"));
        }

        let flows = self.flows.read().await;
        let flow = flows.get(&session.flow_id)
            .ok_or_else(|| anyhow!("Flow not found"))?;

        // Processar input baseado no node atual
        let current_node = flow.nodes.iter()
            .find(|n| n.id == session.current_node_id)
            .ok_or_else(|| anyhow!("Current node not found"))?;

        match current_node.node_type.as_str() {
            "input" => {
                let input_node: InputNode = serde_json::from_value(current_node.config.clone())?;
                
                // Validar input
                if let Some(validation) = &input_node.validation {
                    self.validate_input(&user_input, validation)?;
                }

                // Salvar variável
                session.variables.insert(
                    input_node.variable,
                    serde_json::Value::String(user_input)
                );
            }
            "buttons" | "interactive_list" => {
                if let Some(selected_id) = selection_id {
                    session.variables.insert(
                        "selected_option".to_string(),
                        serde_json::Value::String(selected_id)
                    );
                }
            }
            _ => {}
        }

        session.status = FlowSessionStatus::Active;
        session.last_activity = Utc::now();
        
        self.session_manager.save_session(&session).await?;
        self.execute_node(session, flow.clone()).await?;

        Ok(())
    }

    /// Executar um node do flow
    async fn execute_node(&self, mut session: FlowSession, flow: Flow) -> Result<()> {
        let current_node = flow.nodes.iter()
            .find(|n| n.id == session.current_node_id)
            .ok_or_else(|| anyhow!("Node not found: {}", session.current_node_id))?;

        let execution_result = match current_node.node_type.as_str() {
            "message" => self.execute_message_node(&session, current_node).await?,
            "buttons" => self.execute_buttons_node(&session, current_node).await?,
            "interactive_list" => self.execute_list_node(&session, current_node).await?,
            "input" => self.execute_input_node(&session, current_node).await?,
            "switch" => self.execute_switch_node(&session, current_node).await?,
            "api" => self.execute_api_node(&session, current_node).await?,
            "ai_classifier" => self.execute_ai_classifier_node(&session, current_node).await?,
            "ai_response" => self.execute_ai_response_node(&session, current_node).await?,
            "end" => FlowExecutionResult::Complete,
            _ => FlowExecutionResult::Error(format!("Unknown node type: {}", current_node.node_type)),
        };

        match execution_result {
            FlowExecutionResult::Continue(next_node_id) => {
                session.current_node_id = next_node_id;
                session.last_activity = Utc::now();
                self.session_manager.save_session(&session).await?;
                
                // Executar próximo node
                self.execute_node(session, flow).await?;
            }
            FlowExecutionResult::Wait => {
                session.status = FlowSessionStatus::Waiting;
                session.last_activity = Utc::now();
                self.session_manager.save_session(&session).await?;
            }
            FlowExecutionResult::Complete => {
                session.status = FlowSessionStatus::Completed;
                session.last_activity = Utc::now();
                self.session_manager.save_session(&session).await?;
            }
            FlowExecutionResult::Error(error) => {
                session.status = FlowSessionStatus::Failed;
                session.context.insert("error".to_string(), serde_json::Value::String(error));
                self.session_manager.save_session(&session).await?;
            }
        }

        Ok(())
    }

    async fn execute_message_node(&self, session: &FlowSession, node: &FlowNode) -> Result<FlowExecutionResult> {
        let message_node: MessageNode = serde_json::from_value(node.config.clone())?;
        let content = self.replace_variables(&message_node.content, &session.variables);
        
        self.whatsapp_service.send_text_message(
            &session.contact_id,
            &content
        ).await?;

        Ok(FlowExecutionResult::Continue(
            node.next.clone().unwrap_or_else(|| "end".to_string())
        ))
    }

    async fn execute_buttons_node(&self, session: &FlowSession, node: &FlowNode) -> Result<FlowExecutionResult> {
        let buttons_node: ButtonsNode = serde_json::from_value(node.config.clone())?;
        let message = self.replace_variables(&buttons_node.message, &session.variables);
        
        let buttons: Vec<_> = buttons_node.buttons.iter().map(|btn| {
            crate::whatsapp::types::InteractiveButton {
                id: btn.id.clone().unwrap_or_else(|| btn.next.clone().unwrap_or_default()),
                title: btn.text.clone(),
            }
        }).collect();

        self.whatsapp_service.send_interactive_buttons(
            &session.contact_id,
            &message,
            buttons
        ).await?;

        Ok(FlowExecutionResult::Wait)
    }

    async fn execute_list_node(&self, session: &FlowSession, node: &FlowNode) -> Result<FlowExecutionResult> {
        let list_node: InteractiveListNode = serde_json::from_value(node.config.clone())?;
        let body = self.replace_variables(&list_node.content.body, &session.variables);
        
        let sections: Vec<_> = list_node.content.sections.iter().map(|section| {
            crate::whatsapp::types::InteractiveSection {
                title: section.title.clone(),
                rows: section.rows.iter().map(|row| {
                    crate::whatsapp::types::InteractiveRow {
                        id: row.id.clone(),
                        title: row.title.clone(),
                        description: row.description.clone(),
                    }
                }).collect(),
            }
        }).collect();

        self.whatsapp_service.send_interactive_list(
            &session.contact_id,
            &list_node.content.header,
            &body,
            sections
        ).await?;

        Ok(FlowExecutionResult::Wait)
    }

    async fn execute_input_node(&self, session: &FlowSession, node: &FlowNode) -> Result<FlowExecutionResult> {
        let input_node: InputNode = serde_json::from_value(node.config.clone())?;
        let message = self.replace_variables(&input_node.message, &session.variables);
        
        self.whatsapp_service.send_text_message(
            &session.contact_id,
            &message
        ).await?;

        Ok(FlowExecutionResult::Wait)
    }

    async fn execute_switch_node(&self, session: &FlowSession, node: &FlowNode) -> Result<FlowExecutionResult> {
        let switch_node: SwitchNode = serde_json::from_value(node.config.clone())?;
        let condition_value = self.replace_variables(&switch_node.condition, &session.variables);
        
        let next_node = switch_node.cases.get(&condition_value)
            .or_else(|| switch_node.cases.get("default"))
            .cloned()
            .unwrap_or_else(|| "end".to_string());

        Ok(FlowExecutionResult::Continue(next_node))
    }

    async fn execute_api_node(&self, session: &FlowSession, node: &FlowNode) -> Result<FlowExecutionResult> {
        let api_node: ApiNode = serde_json::from_value(node.config.clone())?;
        
        // TODO: Implementar chamada API
        // Por enquanto, apenas continua para o próximo node
        
        Ok(FlowExecutionResult::Continue(
            node.next.clone().unwrap_or_else(|| "end".to_string())
        ))
    }

    async fn execute_ai_classifier_node(&self, session: &FlowSession, node: &FlowNode) -> Result<FlowExecutionResult> {
        let ai_node: AIClassifierNode = serde_json::from_value(node.config.clone())?;
        
        // TODO: Implementar classificação com AI
        // Por enquanto, retorna valor padrão
        
        Ok(FlowExecutionResult::Continue(
            node.next.clone().unwrap_or_else(|| "end".to_string())
        ))
    }

    async fn execute_ai_response_node(&self, session: &FlowSession, node: &FlowNode) -> Result<FlowExecutionResult> {
        let ai_node: AIResponseNode = serde_json::from_value(node.config.clone())?;
        
        // TODO: Implementar resposta com AI
        // Por enquanto, apenas continua
        
        Ok(FlowExecutionResult::Continue(
            node.next.clone().unwrap_or_else(|| "end".to_string())
        ))
    }

    fn replace_variables(&self, text: &str, variables: &HashMap<String, serde_json::Value>) -> String {
        let re = Regex::new(r"\{\{(\w+)\}\}").unwrap();
        re.replace_all(text, |caps: &regex::Captures| {
            let var_name = &caps[1];
            variables.get(var_name)
                .and_then(|v| v.as_str())
                .unwrap_or(&caps[0])
                .to_string()
        }).to_string()
    }

    fn validate_input(&self, input: &str, validation: &str) -> Result<()> {
        let rules: Vec<&str> = validation.split(',').collect();
        
        for rule in rules {
            if rule.starts_with("min:") {
                let min_len: usize = rule[4..].parse()?;
                if input.len() < min_len {
                    return Err(anyhow!("Input too short"));
                }
            } else if rule.starts_with("max:") {
                let max_len: usize = rule[4..].parse()?;
                if input.len() > max_len {
                    return Err(anyhow!("Input too long"));
                }
            } else if rule == "email" {
                let email_re = Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
                if !email_re.is_match(input) {
                    return Err(anyhow!("Invalid email format"));
                }
            } else if rule == "cpf" {
                let cpf_re = Regex::new(r"^\d{11}$").unwrap();
                if !cpf_re.is_match(input) {
                    return Err(anyhow!("Invalid CPF format"));
                }
            }
        }
        
        Ok(())
    }

    pub async fn load_flow(&self, flow: Flow) {
        let mut flows = self.flows.write().await;
        flows.insert(flow.id.clone(), flow);
    }
}