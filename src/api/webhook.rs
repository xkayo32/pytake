use actix_web::{web, HttpResponse, Result, HttpRequest};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::flow::{FlowEngine, webhook::FlowWebhookHandler};
use crate::whatsapp::types::{WebhookPayload, WebhookMessage, MessageType, InteractiveData};
use crate::error::AppError;
use crate::auth::Claims;

#[derive(Deserialize)]
pub struct WebhookVerification {
    #[serde(rename = "hub.mode")]
    pub hub_mode: Option<String>,
    #[serde(rename = "hub.challenge")]
    pub hub_challenge: Option<String>,
    #[serde(rename = "hub.verify_token")]
    pub hub_verify_token: Option<String>,
}

/// Verificação do webhook (GET request)
pub async fn verify_webhook(
    req: HttpRequest,
    query: web::Query<WebhookVerification>,
) -> Result<HttpResponse, AppError> {
    let verify_token = std::env::var("WHATSAPP_WEBHOOK_VERIFY_TOKEN")
        .unwrap_or_else(|_| "your-verify-token".to_string());

    if let Some(mode) = &query.hub_mode {
        if mode == "subscribe" {
            if let Some(token) = &query.hub_verify_token {
                if token == &verify_token {
                    if let Some(challenge) = &query.hub_challenge {
                        return Ok(HttpResponse::Ok().body(challenge.clone()));
                    }
                }
            }
        }
    }

    Ok(HttpResponse::Forbidden().json(serde_json::json!({
        "error": "Forbidden"
    })))
}

/// Receber mensagens do webhook (POST request)
pub async fn receive_webhook(
    flow_engine: web::Data<Arc<FlowEngine>>,
    payload: web::Json<WebhookPayload>,
) -> Result<HttpResponse, AppError> {
    let webhook_handler = FlowWebhookHandler::new(flow_engine.get_ref().clone());

    // Processar cada entry no payload
    for entry in &payload.entry {
        for change in &entry.changes {
            if change.field == "messages" {
                // Processar mensagens recebidas
                if let Some(messages) = &change.value.messages {
                    for message in messages {
                        if let Err(e) = webhook_handler.handle_incoming_message(message.clone()).await {
                            eprintln!("Error processing message: {:?}", e);
                        }
                    }
                }

                // Processar status de mensagens
                if let Some(statuses) = &change.value.statuses {
                    for status in statuses {
                        // TODO: Processar status de mensagem (delivered, read, failed)
                        println!("Message status: {:?}", status);
                    }
                }
            }
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success"
    })))
}

/// Endpoint para simular clique em botão de template
pub async fn template_button_click(
    flow_engine: web::Data<Arc<FlowEngine>>,
    req: web::Json<TemplateButtonClickRequest>,
) -> Result<HttpResponse, AppError> {
    let webhook_handler = FlowWebhookHandler::new(flow_engine.get_ref().clone());

    webhook_handler.handle_template_button_click(
        req.contact_id.clone(),
        req.conversation_id.clone(),
        req.button_payload.clone(),
    ).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Button click processed"
    })))
}

/// Endpoint para simular resposta interativa
pub async fn simulate_interactive_response(
    flow_engine: web::Data<Arc<FlowEngine>>,
    req: web::Json<SimulateInteractiveRequest>,
) -> Result<HttpResponse, AppError> {
    let webhook_handler = FlowWebhookHandler::new(flow_engine.get_ref().clone());

    // Criar mensagem simulada
    let simulated_message = WebhookMessage {
        id: format!("sim_{}", uuid::Uuid::new_v4()),
        from: req.contact_id.clone(),
        to: "test_number".to_string(),
        timestamp: chrono::Utc::now().timestamp().to_string(),
        message_type: if req.selection_id.is_some() {
            MessageType::Interactive
        } else {
            MessageType::Text
        },
        text: req.text.clone(),
        interactive: req.selection_id.as_ref().map(|id| InteractiveData {
            interactive_type: "button_reply".to_string(),
            button_reply: Some(crate::whatsapp::types::ButtonReply {
                id: id.clone(),
                title: "Selected Option".to_string(),
            }),
            list_reply: None,
        }),
        image: None,
        document: None,
        audio: None,
        video: None,
    };

    webhook_handler.handle_incoming_message(simulated_message).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Interactive response processed"
    })))
}

/// Endpoint para testar flows com webhook simulado
pub async fn test_flow_webhook(
    flow_engine: web::Data<Arc<FlowEngine>>,
    req: web::Json<TestFlowWebhookRequest>,
) -> Result<HttpResponse, AppError> {
    let webhook_handler = FlowWebhookHandler::new(flow_engine.get_ref().clone());

    // Criar sequência de mensagens de teste
    let test_messages = vec![
        // Mensagem inicial
        WebhookMessage {
            id: "test_1".to_string(),
            from: req.contact_id.clone(),
            to: "test_number".to_string(),
            timestamp: chrono::Utc::now().timestamp().to_string(),
            message_type: MessageType::Text,
            text: Some(req.initial_message.clone()),
            interactive: None,
            image: None,
            document: None,
            audio: None,
            video: None,
        },
    ];

    let mut responses = Vec::new();
    
    for message in test_messages {
        match webhook_handler.handle_incoming_message(message).await {
            Ok(_) => responses.push("Message processed successfully"),
            Err(e) => responses.push(&format!("Error: {}", e)),
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "test_results": responses
    })))
}

/// Enviar template de negociação
pub async fn send_negotiation_template(
    flow_engine: web::Data<Arc<FlowEngine>>,
    claims: web::ReqData<Claims>,
    req: web::Json<SendNegotiationTemplateRequest>,
) -> Result<HttpResponse, AppError> {
    let webhook_handler = FlowWebhookHandler::new(flow_engine.get_ref().clone());

    webhook_handler.send_negotiation_template(
        &req.contact_id,
        &req.customer_name,
        &req.amount,
    ).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Negotiation template sent successfully",
        "contact_id": req.contact_id,
        "amount": req.amount
    })))
}

/// Simular cenário completo de negociação
pub async fn simulate_negotiation_scenario(
    flow_engine: web::Data<Arc<FlowEngine>>,
    req: web::Json<SimulateNegotiationRequest>,
) -> Result<HttpResponse, AppError> {
    let webhook_handler = FlowWebhookHandler::new(flow_engine.get_ref().clone());
    
    let mut responses = Vec::new();
    
    // 1. Simular clique no botão "Negociar" do template
    let template_click = webhook_handler.handle_template_button_click(
        req.contact_id.clone(),
        format!("conv_{}", req.contact_id),
        "start_flow:negotiation_flow".to_string(),
    ).await;
    
    match template_click {
        Ok(_) => responses.push("Template button clicked - negotiation flow started"),
        Err(e) => responses.push(&format!("Error starting flow: {}", e)),
    }
    
    // 2. Se especificou uma opção, simular seleção
    if let Some(option) = &req.selected_option {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        
        let option_response = WebhookMessage {
            id: "sim_nego_1".to_string(),
            from: req.contact_id.clone(),
            to: "test_number".to_string(),
            timestamp: chrono::Utc::now().timestamp().to_string(),
            message_type: MessageType::Interactive,
            text: None,
            interactive: Some(InteractiveData {
                interactive_type: "list_reply".to_string(),
                button_reply: None,
                list_reply: Some(crate::whatsapp::types::ListReply {
                    id: option.clone(),
                    title: "Opção selecionada".to_string(),
                    description: None,
                }),
            }),
            image: None,
            document: None,
            audio: None,
            video: None,
        };
        
        match webhook_handler.handle_incoming_message(option_response).await {
            Ok(_) => responses.push(&format!("Option '{}' selected successfully", option)),
            Err(e) => responses.push(&format!("Error processing option: {}", e)),
        }
    }
    
    // 3. Se for proposta customizada, simular input
    if let Some(proposal) = &req.custom_proposal {
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
        
        let proposal_message = WebhookMessage {
            id: "sim_nego_2".to_string(),
            from: req.contact_id.clone(),
            to: "test_number".to_string(),
            timestamp: chrono::Utc::now().timestamp().to_string(),
            message_type: MessageType::Text,
            text: Some(proposal.clone()),
            interactive: None,
            image: None,
            document: None,
            audio: None,
            video: None,
        };
        
        match webhook_handler.handle_incoming_message(proposal_message).await {
            Ok(_) => responses.push(&format!("Custom proposal '{}' submitted", proposal)),
            Err(e) => responses.push(&format!("Error processing proposal: {}", e)),
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Negotiation scenario simulated",
        "steps": responses
    })))
}

#[derive(Deserialize)]
pub struct TemplateButtonClickRequest {
    pub contact_id: String,
    pub conversation_id: String,
    pub button_payload: String,
}

#[derive(Deserialize)]
pub struct SimulateInteractiveRequest {
    pub contact_id: String,
    pub text: Option<String>,
    pub selection_id: Option<String>,
}

#[derive(Deserialize)]
pub struct TestFlowWebhookRequest {
    pub contact_id: String,
    pub initial_message: String,
}

#[derive(Deserialize)]
pub struct SendNegotiationTemplateRequest {
    pub contact_id: String,
    pub customer_name: String,
    pub amount: String,
    pub payment_type: Option<String>,
}

#[derive(Deserialize)]
pub struct SimulateNegotiationRequest {
    pub contact_id: String,
    pub selected_option: Option<String>, // discount_30, installment_2x, custom_proposal, etc
    pub custom_proposal: Option<String>, // texto da proposta se for custom
}

pub fn configure_webhook_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/webhook")
            .route("/whatsapp", web::get().to(verify_webhook))
            .route("/whatsapp", web::post().to(receive_webhook))
            .route("/template-button", web::post().to(template_button_click))
            .route("/simulate-interactive", web::post().to(simulate_interactive_response))
            .route("/test-flow", web::post().to(test_flow_webhook))
            .route("/send-negotiation-template", web::post().to(send_negotiation_template))
            .route("/simulate-negotiation", web::post().to(simulate_negotiation_scenario))
    );
}