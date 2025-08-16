use anyhow::{Result, anyhow};
use reqwest::Client;
use serde_json;
use std::collections::HashMap;

pub mod types;
use types::*;

pub struct WhatsAppService {
    client: Client,
    access_token: String,
    phone_number_id: String,
    base_url: String,
}

impl WhatsAppService {
    pub fn new() -> Result<Self> {
        let access_token = std::env::var("WHATSAPP_ACCESS_TOKEN")
            .map_err(|_| anyhow!("WHATSAPP_ACCESS_TOKEN environment variable not set"))?;
        
        let phone_number_id = std::env::var("WHATSAPP_PHONE_NUMBER_ID")
            .map_err(|_| anyhow!("WHATSAPP_PHONE_NUMBER_ID environment variable not set"))?;

        let base_url = format!("https://graph.facebook.com/v18.0/{}", phone_number_id);

        Ok(Self {
            client: Client::new(),
            access_token,
            phone_number_id,
            base_url,
        })
    }

    /// Enviar mensagem de texto simples
    pub async fn send_text_message(&self, to: &str, text: &str) -> Result<SendMessageResponse> {
        let mut request = SendMessageRequest::default();
        request.to = to.to_string();
        request.message_type = "text".to_string();
        request.text = Some(TextMessage {
            body: text.to_string(),
            preview_url: Some(false),
        });

        self.send_message(request).await
    }

    /// Enviar mensagem com botões interativos
    pub async fn send_interactive_buttons(
        &self, 
        to: &str, 
        body: &str, 
        buttons: Vec<InteractiveButton>
    ) -> Result<SendMessageResponse> {
        if buttons.len() > 3 {
            return Err(anyhow!("WhatsApp supports maximum 3 buttons"));
        }

        let interactive_buttons: Vec<InteractiveButton> = buttons.into_iter()
            .map(|btn| InteractiveButton::new(btn.reply.id, btn.reply.title))
            .collect();

        let interactive = InteractiveMessage {
            interactive_type: "button".to_string(),
            header: None,
            body: InteractiveBody {
                text: body.to_string(),
            },
            footer: None,
            action: InteractiveAction {
                buttons: Some(interactive_buttons),
                sections: None,
                button: None,
            },
        };

        let mut request = SendMessageRequest::default();
        request.to = to.to_string();
        request.message_type = "interactive".to_string();
        request.interactive = Some(interactive);

        self.send_message(request).await
    }

    /// Enviar lista interativa
    pub async fn send_interactive_list(
        &self,
        to: &str,
        header: &str,
        body: &str,
        sections: Vec<InteractiveSection>,
    ) -> Result<SendMessageResponse> {
        if sections.is_empty() {
            return Err(anyhow!("List must have at least one section"));
        }

        let total_rows: usize = sections.iter().map(|s| s.rows.len()).sum();
        if total_rows > 10 {
            return Err(anyhow!("WhatsApp lists support maximum 10 rows total"));
        }

        let interactive = InteractiveMessage {
            interactive_type: "list".to_string(),
            header: Some(InteractiveHeader {
                header_type: "text".to_string(),
                text: Some(header.to_string()),
                image: None,
                video: None,
                document: None,
            }),
            body: InteractiveBody {
                text: body.to_string(),
            },
            footer: None,
            action: InteractiveAction {
                buttons: None,
                sections: Some(sections),
                button: Some("Ver Opções".to_string()),
            },
        };

        let mut request = SendMessageRequest::default();
        request.to = to.to_string();
        request.message_type = "interactive".to_string();
        request.interactive = Some(interactive);

        self.send_message(request).await
    }

    /// Enviar mensagem com mídia
    pub async fn send_media_message(
        &self,
        to: &str,
        media_type: &str,
        media_id_or_url: &str,
        caption: Option<&str>,
    ) -> Result<SendMessageResponse> {
        let media = MediaMessage {
            id: if media_id_or_url.starts_with("http") {
                None
            } else {
                Some(media_id_or_url.to_string())
            },
            link: if media_id_or_url.starts_with("http") {
                Some(media_id_or_url.to_string())
            } else {
                None
            },
            caption: caption.map(|c| c.to_string()),
            filename: None,
        };

        let mut request = SendMessageRequest::default();
        request.to = to.to_string();
        request.message_type = media_type.to_string();

        match media_type {
            "image" => request.image = Some(media),
            "document" => request.document = Some(media),
            "audio" => request.audio = Some(media),
            "video" => request.video = Some(media),
            _ => return Err(anyhow!("Unsupported media type: {}", media_type)),
        }

        self.send_message(request).await
    }

    /// Enviar template de mensagem
    pub async fn send_template_message(
        &self,
        to: &str,
        template_name: &str,
        language_code: &str,
        components: Option<Vec<serde_json::Value>>,
    ) -> Result<SendMessageResponse> {
        let mut template_data = serde_json::json!({
            "name": template_name,
            "language": {
                "code": language_code
            }
        });

        if let Some(components) = components {
            template_data["components"] = serde_json::Value::Array(components);
        }

        let payload = serde_json::json!({
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "template",
            "template": template_data
        });

        let url = format!("{}/messages", self.base_url);
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.access_token))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if response.status().is_success() {
            let result: SendMessageResponse = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(anyhow!("WhatsApp API error: {}", error_text))
        }
    }

    /// Marcar mensagem como lida
    pub async fn mark_message_as_read(&self, message_id: &str) -> Result<()> {
        let payload = serde_json::json!({
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        });

        let url = format!("{}/messages", self.base_url);
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.access_token))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Failed to mark message as read: {}", error_text));
        }

        Ok(())
    }

    /// Obter informações de mídia
    pub async fn get_media_info(&self, media_id: &str) -> Result<serde_json::Value> {
        let url = format!("https://graph.facebook.com/v18.0/{}", media_id);
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.access_token))
            .send()
            .await?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(anyhow!("Failed to get media info: {}", error_text))
        }
    }

    /// Download de mídia
    pub async fn download_media(&self, media_url: &str) -> Result<Vec<u8>> {
        let response = self.client
            .get(media_url)
            .header("Authorization", format!("Bearer {}", self.access_token))
            .send()
            .await?;

        if response.status().is_success() {
            let bytes = response.bytes().await?;
            Ok(bytes.to_vec())
        } else {
            let error_text = response.text().await?;
            Err(anyhow!("Failed to download media: {}", error_text))
        }
    }

    /// Enviar mensagem genérica (método interno)
    async fn send_message(&self, request: SendMessageRequest) -> Result<SendMessageResponse> {
        let url = format!("{}/messages", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.access_token))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if response.status().is_success() {
            let result: SendMessageResponse = response.json().await?;
            Ok(result)
        } else {
            let error_text = response.text().await?;
            Err(anyhow!("WhatsApp API error: {}", error_text))
        }
    }

    /// Verificar se número é válido no WhatsApp
    pub async fn check_contact(&self, phone_number: &str) -> Result<bool> {
        // Este endpoint pode não estar disponível em todas as versões da API
        // Por enquanto, retorna true (assumindo que o número é válido)
        Ok(true)
    }

    /// Obter perfil do usuário
    pub async fn get_user_profile(&self, phone_number: &str) -> Result<serde_json::Value> {
        // Funcionalidade limitada na API oficial
        // Retorna estrutura básica
        Ok(serde_json::json!({
            "wa_id": phone_number,
            "profile": {
                "name": "User"
            }
        }))
    }
}