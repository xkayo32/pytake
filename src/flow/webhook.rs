use super::*;
use super::engine::FlowEngine;
use crate::whatsapp::types::{WebhookMessage, MessageType};
use anyhow::{Result, anyhow};
use std::sync::Arc;

mod examples {
    pub mod negotiation_flow;
}
use examples::negotiation_flow::{create_negotiation_flow, create_negotiation_template};

pub struct FlowWebhookHandler {
    flow_engine: Arc<FlowEngine>,
}

impl FlowWebhookHandler {
    pub fn new(flow_engine: Arc<FlowEngine>) -> Self {
        Self { flow_engine }
    }

    /// Processar mensagem recebida do WhatsApp webhook
    pub async fn handle_incoming_message(&self, message: WebhookMessage) -> Result<()> {
        let contact_id = message.from.clone();
        let conversation_id = format!("{}_{}", message.from, message.to);
        
        // Verificar se existe sessão ativa para este contato
        if let Some(session) = self.flow_engine
            .session_manager
            .get_active_session_by_contact(&contact_id)
            .await? 
        {
            // Processar resposta do usuário em flow ativo
            match message.message_type {
                MessageType::Text => {
                    self.flow_engine.process_user_response(
                        session.id,
                        message.text.unwrap_or_default(),
                        None,
                    ).await?;
                }
                MessageType::Interactive => {
                    let selection_id = message.interactive
                        .and_then(|i| i.button_reply.or(i.list_reply))
                        .map(|r| r.id)
                        .unwrap_or_default();
                    
                    self.flow_engine.process_user_response(
                        session.id,
                        message.text.unwrap_or_default(),
                        Some(selection_id),
                    ).await?;
                }
                _ => {
                    // Outros tipos de mensagem (imagem, audio, etc)
                    // TODO: Implementar processamento de mídia
                }
            }
        } else {
            // Não há sessão ativa - verificar se deve iniciar um flow
            self.handle_new_message(&contact_id, &conversation_id, &message).await?;
        }

        Ok(())
    }

    /// Processar nova mensagem (sem sessão ativa)
    async fn handle_new_message(
        &self,
        contact_id: &str,
        conversation_id: &str,
        message: &WebhookMessage,
    ) -> Result<()> {
        let text = message.text.as_ref().unwrap_or(&String::new()).to_lowercase();
        
        // Palavras-chave que disparam o menu principal
        let menu_keywords = ["menu", "opções", "ajuda", "oi", "olá", "start", "começar"];
        
        if menu_keywords.iter().any(|&keyword| text.contains(keyword)) {
            // Iniciar flow do menu principal
            self.start_menu_flow(contact_id, conversation_id).await?;
        } else {
            // Analisar intenção com AI ou resposta padrão
            self.handle_intent_analysis(contact_id, conversation_id, &text).await?;
        }

        Ok(())
    }

    /// Iniciar flow do menu principal
    async fn start_menu_flow(&self, contact_id: &str, conversation_id: &str) -> Result<()> {
        let menu_flow = self.create_main_menu_flow();
        self.flow_engine.load_flow(menu_flow.clone()).await;
        
        self.flow_engine.start_flow(
            menu_flow.id,
            contact_id.to_string(),
            conversation_id.to_string(),
            None,
        ).await?;

        Ok(())
    }

    /// Analisar intenção da mensagem
    async fn handle_intent_analysis(&self, contact_id: &str, conversation_id: &str, text: &str) -> Result<()> {
        // Por enquanto, iniciar flow de análise inteligente
        let smart_flow = self.create_smart_support_flow();
        self.flow_engine.load_flow(smart_flow.clone()).await;
        
        let mut trigger_data = HashMap::new();
        trigger_data.insert("user_message".to_string(), serde_json::Value::String(text.to_string()));
        
        self.flow_engine.start_flow(
            smart_flow.id,
            contact_id.to_string(),
            conversation_id.to_string(),
            Some(trigger_data),
        ).await?;

        Ok(())
    }

    /// Processar clique em botão de template
    pub async fn handle_template_button_click(
        &self,
        contact_id: String,
        conversation_id: String,
        button_payload: String,
    ) -> Result<()> {
        // Parse do payload: "start_flow:flow_id" ou "transfer:agent_id"
        let parts: Vec<&str> = button_payload.split(':').collect();
        
        match parts.as_slice() {
            ["start_flow", flow_id] => {
                // Carregar flow se for um dos flows especiais
                match *flow_id {
                    "negotiation_flow" => {
                        let negotiation_flow = create_negotiation_flow();
                        self.flow_engine.load_flow(negotiation_flow).await;
                    }
                    _ => {}
                }

                // Iniciar flow específico
                self.flow_engine.start_flow(
                    flow_id.to_string(),
                    contact_id,
                    conversation_id,
                    None,
                ).await?;
            }
            ["transfer", agent_id] => {
                // TODO: Implementar transferência para agente
                println!("Transfer to agent: {}", agent_id);
            }
            ["pix_payment"] => {
                // Processar pagamento PIX direto
                self.process_pix_payment(&contact_id, &conversation_id).await?;
            }
            _ => {
                return Err(anyhow!("Invalid button payload: {}", button_payload));
            }
        }

        Ok(())
    }

    /// Criar flow do menu principal
    fn create_main_menu_flow(&self) -> Flow {
        Flow {
            id: "main_menu".to_string(),
            name: "Menu Principal".to_string(),
            nodes: vec![
                FlowNode {
                    id: "start".to_string(),
                    node_type: "buttons".to_string(),
                    config: serde_json::to_value(ButtonsNode {
                        message: "🤖 Olá! Sou o assistente virtual da PyTake. Como posso ajudar você hoje?".to_string(),
                        buttons: vec![
                            ButtonOption {
                                id: Some("support".to_string()),
                                text: "🛠️ Suporte Técnico".to_string(),
                                next: Some("support_flow".to_string()),
                            },
                            ButtonOption {
                                id: Some("sales".to_string()),
                                text: "💰 Vendas".to_string(),
                                next: Some("sales_flow".to_string()),
                            },
                            ButtonOption {
                                id: Some("billing".to_string()),
                                text: "📄 Financeiro".to_string(),
                                next: Some("billing_flow".to_string()),
                            },
                        ],
                    }).unwrap(),
                    next: None,
                    conditions: Some([
                        ("support".to_string(), "support_message".to_string()),
                        ("sales".to_string(), "sales_message".to_string()),
                        ("billing".to_string(), "billing_message".to_string()),
                    ].into()),
                },
                FlowNode {
                    id: "support_message".to_string(),
                    node_type: "message".to_string(),
                    config: serde_json::to_value(MessageNode {
                        content: "🛠️ Conectando você com nossa equipe de suporte técnico...".to_string(),
                        media_type: None,
                        media_url: None,
                    }).unwrap(),
                    next: Some("end".to_string()),
                    conditions: None,
                },
                FlowNode {
                    id: "sales_message".to_string(),
                    node_type: "message".to_string(),
                    config: serde_json::to_value(MessageNode {
                        content: "💰 Redirecionando para nossa equipe comercial...".to_string(),
                        media_type: None,
                        media_url: None,
                    }).unwrap(),
                    next: Some("end".to_string()),
                    conditions: None,
                },
                FlowNode {
                    id: "billing_message".to_string(),
                    node_type: "message".to_string(),
                    config: serde_json::to_value(MessageNode {
                        content: "📄 Conectando com o departamento financeiro...".to_string(),
                        media_type: None,
                        media_url: None,
                    }).unwrap(),
                    next: Some("end".to_string()),
                    conditions: None,
                },
            ],
            variables: HashMap::new(),
            settings: FlowSettings {
                timeout_minutes: Some(30),
                max_iterations: Some(10),
                fallback_node: Some("end".to_string()),
            },
        }
    }

    /// Criar flow de suporte inteligente
    fn create_smart_support_flow(&self) -> Flow {
        Flow {
            id: "smart_support".to_string(),
            name: "Suporte Inteligente".to_string(),
            nodes: vec![
                FlowNode {
                    id: "analyze_message".to_string(),
                    node_type: "ai_classifier".to_string(),
                    config: serde_json::to_value(AIClassifierNode {
                        model: "gpt-4".to_string(),
                        prompt: "Classifique a intenção do usuário: suporte_tecnico, vendas, financeiro, ou outros".to_string(),
                        input: "{{user_message}}".to_string(),
                        output: "intent".to_string(),
                    }).unwrap(),
                    next: Some("route_by_intent".to_string()),
                    conditions: None,
                },
                FlowNode {
                    id: "route_by_intent".to_string(),
                    node_type: "switch".to_string(),
                    config: serde_json::to_value(SwitchNode {
                        condition: "{{intent}}".to_string(),
                        cases: [
                            ("suporte_tecnico".to_string(), "technical_support".to_string()),
                            ("vendas".to_string(), "sales_flow".to_string()),
                            ("financeiro".to_string(), "billing_flow".to_string()),
                            ("default".to_string(), "ask_clarification".to_string()),
                        ].into(),
                    }).unwrap(),
                    next: None,
                    conditions: None,
                },
                FlowNode {
                    id: "ask_clarification".to_string(),
                    node_type: "ai_response".to_string(),
                    config: serde_json::to_value(AIResponseNode {
                        model: "gpt-4".to_string(),
                        prompt: "Responda educadamente pedindo mais detalhes sobre o que o usuário precisa".to_string(),
                        context: Some("{{conversation_history}}".to_string()),
                        max_tokens: Some(150),
                    }).unwrap(),
                    next: Some("show_menu".to_string()),
                    conditions: None,
                },
                FlowNode {
                    id: "show_menu".to_string(),
                    node_type: "buttons".to_string(),
                    config: serde_json::to_value(ButtonsNode {
                        message: "Para melhor atendê-lo, escolha uma das opções:".to_string(),
                        buttons: vec![
                            ButtonOption {
                                id: Some("support".to_string()),
                                text: "🛠️ Suporte".to_string(),
                                next: Some("end".to_string()),
                            },
                            ButtonOption {
                                id: Some("sales".to_string()),
                                text: "💰 Vendas".to_string(),
                                next: Some("end".to_string()),
                            },
                            ButtonOption {
                                id: Some("billing".to_string()),
                                text: "📄 Financeiro".to_string(),
                                next: Some("end".to_string()),
                            },
                        ],
                    }).unwrap(),
                    next: None,
                    conditions: None,
                },
            ],
            variables: HashMap::new(),
            settings: FlowSettings {
                timeout_minutes: Some(15),
                max_iterations: Some(5),
                fallback_node: Some("show_menu".to_string()),
            },
        }
    }

    /// Processar pagamento PIX direto
    async fn process_pix_payment(&self, contact_id: &str, conversation_id: &str) -> Result<()> {
        // Criar flow simples para pagamento PIX
        let pix_flow = self.create_pix_payment_flow();
        self.flow_engine.load_flow(pix_flow.clone()).await;
        
        self.flow_engine.start_flow(
            pix_flow.id,
            contact_id.to_string(),
            conversation_id.to_string(),
            None,
        ).await?;

        Ok(())
    }

    /// Criar flow simples para pagamento PIX
    fn create_pix_payment_flow(&self) -> Flow {
        Flow {
            id: "pix_payment_flow".to_string(),
            name: "Pagamento PIX".to_string(),
            nodes: vec![
                FlowNode {
                    id: "generate_pix".to_string(),
                    node_type: "api".to_string(),
                    config: serde_json::to_value(ApiNode {
                        endpoint: "/api/payments/generate-pix".to_string(),
                        method: "POST".to_string(),
                        headers: Some([("Authorization".to_string(), "Bearer {{api_token}}".to_string())].into()),
                        body: Some(serde_json::json!({
                            "contact_id": "{{contact_id}}",
                            "amount": "{{amount}}",
                            "description": "Pagamento de pendência"
                        })),
                        response_variable: Some("pix_data".to_string()),
                    }).unwrap(),
                    next: Some("send_pix_code".to_string()),
                    conditions: None,
                },
                FlowNode {
                    id: "send_pix_code".to_string(),
                    node_type: "message".to_string(),
                    config: serde_json::to_value(MessageNode {
                        content: "💳 PIX gerado com sucesso!\n\n📋 Código PIX:\n```{{pix_code}}```\n\n⏰ Válido por 30 minutos\n💰 Valor: R$ {{amount}}\n\n📱 Copie o código e cole no seu app bancário\n\n✅ O pagamento será confirmado automaticamente".to_string(),
                        media_type: None,
                        media_url: None,
                    }).unwrap(),
                    next: Some("end".to_string()),
                    conditions: None,
                },
            ],
            variables: HashMap::new(),
            settings: FlowSettings {
                timeout_minutes: Some(30),
                max_iterations: Some(5),
                fallback_node: None,
            },
        }
    }

    /// Enviar template de negociação para um contato
    pub async fn send_negotiation_template(
        &self,
        contact_id: &str,
        customer_name: &str,
        amount: &str,
    ) -> Result<()> {
        let template = create_negotiation_template();
        
        // Enviar template via WhatsApp API
        // TODO: Implementar envio de template real
        println!("Sending negotiation template to {} for amount {}", contact_id, amount);
        
        Ok(())
    }
}