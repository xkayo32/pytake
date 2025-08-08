use actix_web::{web, HttpResponse, HttpRequest, Result as ActixResult};
use anyhow::{anyhow, Context, Result};
use backoff::{future::retry, ExponentialBackoff};
use base64::{Engine as _, engine::general_purpose};
use chrono::{DateTime, NaiveDate, Utc};
use dashmap::DashMap;
use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{error, info, warn};
use utoipa::ToSchema;

// =============================================================================
// Core Types and Configuration
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GoogleConfig {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub scopes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GoogleTokens {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
    pub token_type: String,
    pub scope: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GoogleServiceAccount {
    pub user_id: String,
    pub tenant_id: String,
    pub service: GoogleService,
    pub tokens: GoogleTokens,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum GoogleService {
    Sheets,
    Calendar,
    Drive,
    All,
}

impl ToString for GoogleService {
    fn to_string(&self) -> String {
        match self {
            Self::Sheets => "sheets".to_string(),
            Self::Calendar => "calendar".to_string(),
            Self::Drive => "drive".to_string(),
            Self::All => "all".to_string(),
        }
    }
}

// =============================================================================
// Google Sheets Types
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SheetData {
    pub spreadsheet_id: String,
    pub sheet_name: String,
    pub range: String,
    pub values: Vec<Vec<String>>,
    pub major_dimension: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SheetUpdateRequest {
    pub spreadsheet_id: String,
    pub range: String,
    pub values: Vec<Vec<String>>,
    pub value_input_option: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CampaignMetrics {
    pub campaign_id: String,
    pub name: String,
    pub messages_sent: u32,
    pub messages_delivered: u32,
    pub messages_read: u32,
    pub responses_received: u32,
    pub conversion_rate: f64,
    pub cost_per_message: f64,
    pub total_cost: f64,
    pub date_range_start: DateTime<Utc>,
    pub date_range_end: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Contact {
    pub id: Option<String>,
    pub name: String,
    pub phone: String,
    pub email: Option<String>,
    pub company: Option<String>,
    pub tags: Vec<String>,
    pub last_contact: Option<DateTime<Utc>>,
    pub status: String,
}

// =============================================================================
// Google Calendar Types
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CalendarEvent {
    pub id: Option<String>,
    pub summary: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start: EventDateTime,
    pub end: EventDateTime,
    pub attendees: Vec<Attendee>,
    pub recurrence: Option<Vec<String>>,
    pub timezone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EventDateTime {
    #[serde(rename = "dateTime")]
    pub date_time: Option<DateTime<Utc>>,
    pub date: Option<NaiveDate>,
    #[serde(rename = "timeZone")]
    pub time_zone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Attendee {
    pub email: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(rename = "responseStatus")]
    pub response_status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TechnicianVisit {
    pub customer_id: String,
    pub customer_name: String,
    pub customer_address: String,
    pub customer_phone: String,
    pub technician_id: String,
    pub technician_name: String,
    pub visit_type: String,
    pub scheduled_datetime: DateTime<Utc>,
    pub estimated_duration: i32, // minutes
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TimeSlot {
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub available: bool,
    pub technician_id: Option<String>,
}

// =============================================================================
// Google Drive Types
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DriveFile {
    pub id: String,
    pub name: String,
    pub mime_type: String,
    pub size: Option<u64>,
    pub created_time: DateTime<Utc>,
    pub modified_time: DateTime<Utc>,
    pub web_view_link: Option<String>,
    pub web_content_link: Option<String>,
    pub parents: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DriveFolder {
    pub id: String,
    pub name: String,
    pub path: String,
    pub tenant_id: String,
    pub client_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FileUploadRequest {
    pub name: String,
    pub parent_folder_id: Option<String>,
    pub content: Vec<u8>,
    pub mime_type: String,
    pub share_with: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ShareRequest {
    pub file_id: String,
    pub email: String,
    pub role: String, // reader, writer, commenter
    pub send_notification: bool,
    pub message: Option<String>,
}

// =============================================================================
// Request/Response Types
// =============================================================================

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AuthUrlRequest {
    pub service: GoogleService,
    pub tenant_id: String,
    pub user_id: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AuthUrlResponse {
    pub auth_url: String,
    pub state: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CallbackRequest {
    pub code: String,
    pub state: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CallbackResponse {
    pub success: bool,
    pub message: String,
    pub tokens: Option<GoogleTokens>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SheetsReadRequest {
    pub spreadsheet_id: String,
    pub range: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SheetsReadResponse {
    pub data: SheetData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CalendarEventRequest {
    pub event: CalendarEvent,
    pub calendar_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CalendarEventResponse {
    pub event_id: String,
    pub calendar_link: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DriveUploadResponse {
    pub file_id: String,
    pub file_name: String,
    pub web_view_link: String,
    pub share_url: Option<String>,
}

// =============================================================================
// Error Types
// =============================================================================

#[derive(Debug, thiserror::Error)]
pub enum GoogleIntegrationError {
    #[error("Authentication error: {0}")]
    AuthError(String),
    
    #[error("API quota exceeded: {0}")]
    QuotaExceeded(String),
    
    #[error("Rate limit exceeded: {0}")]
    RateLimitExceeded(String),
    
    #[error("Invalid token: {0}")]
    InvalidToken(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Resource not found: {0}")]
    NotFound(String),
    
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("Internal error: {0}")]
    InternalError(String),
}

// =============================================================================
// Main Google Integrations Manager
// =============================================================================

pub struct GoogleIntegrationsManager {
    client: Client,
    config: GoogleConfig,
    token_cache: Arc<DashMap<String, GoogleTokens>>, // user_id -> tokens
    rate_limiter: Arc<RwLock<HashMap<String, DateTime<Utc>>>>, // service -> last_request
}

impl GoogleIntegrationsManager {
    pub fn new(config: GoogleConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            config,
            token_cache: Arc::new(DashMap::new()),
            rate_limiter: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    // =============================================================================
    // OAuth 2.0 Implementation
    // =============================================================================

    pub async fn generate_auth_url(&self, service: GoogleService, user_id: String, tenant_id: String) -> Result<(String, String)> {
        let state = format!("{}:{}:{}", service.to_string(), user_id, tenant_id);
        let state_encoded = general_purpose::STANDARD.encode(state);

        let scopes = match service {
            GoogleService::Sheets => vec![
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive.file"
            ],
            GoogleService::Calendar => vec![
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events"
            ],
            GoogleService::Drive => vec![
                "https://www.googleapis.com/auth/drive",
                "https://www.googleapis.com/auth/drive.file"
            ],
            GoogleService::All => vec![
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive",
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events"
            ],
        };

        let auth_url = format!(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&access_type=offline&approval_prompt=force",
            self.config.client_id,
            urlencoding::encode(&self.config.redirect_uri),
            urlencoding::encode(&scopes.join(" ")),
            state_encoded
        );

        Ok((auth_url, state_encoded))
    }

    pub async fn handle_oauth_callback(&self, code: String, state: String) -> Result<GoogleTokens> {
        let state_decoded = String::from_utf8(general_purpose::STANDARD.decode(state)?)?;
        let parts: Vec<&str> = state_decoded.split(':').collect();
        
        if parts.len() != 3 {
            return Err(anyhow!("Invalid state parameter"));
        }

        let user_id = parts[1].to_string();

        let params = [
            ("client_id", &self.config.client_id),
            ("client_secret", &self.config.client_secret),
            ("code", &code),
            ("grant_type", &"authorization_code".to_string()),
            ("redirect_uri", &self.config.redirect_uri),
        ];

        let response = self.client
            .post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("OAuth token exchange failed: {}", error_text));
        }

        let token_response: Value = response.json().await?;
        
        let tokens = GoogleTokens {
            access_token: token_response["access_token"]
                .as_str()
                .ok_or_else(|| anyhow!("Missing access token"))?
                .to_string(),
            refresh_token: token_response["refresh_token"]
                .as_str()
                .map(|s| s.to_string()),
            expires_in: token_response["expires_in"]
                .as_i64()
                .unwrap_or(3600),
            token_type: token_response["token_type"]
                .as_str()
                .unwrap_or("Bearer")
                .to_string(),
            scope: token_response["scope"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            expires_at: Utc::now() + chrono::Duration::seconds(
                token_response["expires_in"].as_i64().unwrap_or(3600)
            ),
        };

        // Cache the tokens
        self.token_cache.insert(user_id, tokens.clone());

        Ok(tokens)
    }

    async fn refresh_access_token(&self, user_id: &str, refresh_token: &str) -> Result<GoogleTokens> {
        let params = [
            ("client_id", &self.config.client_id),
            ("client_secret", &self.config.client_secret),
            ("refresh_token", &refresh_token.to_string()),
            ("grant_type", &"refresh_token".to_string()),
        ];

        let response = self.client
            .post("https://oauth2.googleapis.com/token")
            .form(&params)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow!("Token refresh failed: {}", error_text));
        }

        let token_response: Value = response.json().await?;
        
        let tokens = GoogleTokens {
            access_token: token_response["access_token"]
                .as_str()
                .ok_or_else(|| anyhow!("Missing access token"))?
                .to_string(),
            refresh_token: Some(refresh_token.to_string()),
            expires_in: token_response["expires_in"]
                .as_i64()
                .unwrap_or(3600),
            token_type: token_response["token_type"]
                .as_str()
                .unwrap_or("Bearer")
                .to_string(),
            scope: token_response["scope"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            expires_at: Utc::now() + chrono::Duration::seconds(
                token_response["expires_in"].as_i64().unwrap_or(3600)
            ),
        };

        // Update cache
        self.token_cache.insert(user_id.to_string(), tokens.clone());

        Ok(tokens)
    }

    async fn get_valid_token(&self, user_id: &str) -> Result<String> {
        if let Some(mut tokens) = self.token_cache.get_mut(user_id) {
            if tokens.expires_at > Utc::now() + chrono::Duration::minutes(5) {
                return Ok(tokens.access_token.clone());
            }

            // Token is expired or about to expire, refresh it
            if let Some(refresh_token) = &tokens.refresh_token {
                let new_tokens = self.refresh_access_token(user_id, refresh_token).await?;
                *tokens = new_tokens.clone();
                return Ok(new_tokens.access_token);
            }
        }

        Err(anyhow!("No valid token found for user: {}", user_id))
    }

    // =============================================================================
    // Rate Limiting and Error Handling
    // =============================================================================

    async fn check_rate_limit(&self, service: &str) -> Result<()> {
        let mut rate_limiter = self.rate_limiter.write().await;
        
        if let Some(last_request) = rate_limiter.get(service) {
            let min_interval = Duration::from_millis(100); // 10 requests per second max
            let elapsed = Utc::now().signed_duration_since(*last_request);
            
            if elapsed < chrono::Duration::from_std(min_interval).unwrap() {
                tokio::time::sleep(min_interval).await;
            }
        }

        rate_limiter.insert(service.to_string(), Utc::now());
        Ok(())
    }

    async fn make_google_request(&self, user_id: &str, service: &str, url: &str, method: &str, body: Option<Value>) -> Result<Response> {
        self.check_rate_limit(service).await?;
        
        let token = self.get_valid_token(user_id).await?;
        let url = url.to_string();
        let method = method.to_string();
        let client = self.client.clone();
        let token_clone = token.clone();
        
        let backoff_strategy = ExponentialBackoff {
            max_elapsed_time: Some(Duration::from_secs(30)),
            ..Default::default()
        };

        retry(backoff_strategy, || async {
            let mut request_builder = match method.as_str() {
                "GET" => client.get(&url),
                "POST" => client.post(&url),
                "PUT" => client.put(&url),
                "DELETE" => client.delete(&url),
                "PATCH" => client.patch(&url),
                _ => return Err(backoff::Error::Permanent(anyhow!("Invalid HTTP method: {}", method))),
            };

            request_builder = request_builder.bearer_auth(&token_clone);

            if let Some(body) = &body {
                request_builder = request_builder.json(body);
            }

            let response = request_builder.send().await
                .map_err(|e| backoff::Error::Transient {
                    err: anyhow!("Request failed: {}", e),
                    retry_after: None,
                })?;

            match response.status().as_u16() {
                200..=299 => Ok(response),
                429 => {
                    warn!("Rate limit exceeded for service: {}", service);
                    Err(backoff::Error::Transient {
                        err: anyhow!("Rate limit exceeded"),
                        retry_after: Some(Duration::from_secs(1)),
                    })
                },
                401 => {
                    // Token might be expired, try to refresh
                    Err(backoff::Error::Transient {
                        err: anyhow!("Unauthorized - token may be expired"),
                        retry_after: None,
                    })
                },
                403 => Err(backoff::Error::Permanent(anyhow!("Permission denied"))),
                404 => Err(backoff::Error::Permanent(anyhow!("Resource not found"))),
                400 => Err(backoff::Error::Permanent(anyhow!("Invalid request"))),
                _ => {
                    let status = response.status();
                    let text = response.text().await.unwrap_or_default();
                    Err(backoff::Error::Transient {
                        err: anyhow!("HTTP {}: {}", status, text),
                        retry_after: None,
                    })
                }
            }
        }).await
    }

    // =============================================================================
    // Google Sheets Integration
    // =============================================================================

    pub async fn read_sheet(&self, user_id: &str, spreadsheet_id: &str, range: &str) -> Result<SheetData> {
        let url = format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}",
            spreadsheet_id, urlencoding::encode(range)
        );

        let response = self.make_google_request(user_id, "sheets", &url, "GET", None).await?;
        let data: Value = response.json().await?;

        let values = data["values"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|row| {
                row.as_array()
                    .unwrap_or(&vec![])
                    .iter()
                    .map(|cell| cell.as_str().unwrap_or("").to_string())
                    .collect()
            })
            .collect();

        Ok(SheetData {
            spreadsheet_id: spreadsheet_id.to_string(),
            sheet_name: range.split('!').next().unwrap_or("").to_string(),
            range: range.to_string(),
            values,
            major_dimension: data["majorDimension"].as_str().unwrap_or("ROWS").to_string(),
        })
    }

    pub async fn update_sheet(&self, user_id: &str, request: &SheetUpdateRequest) -> Result<()> {
        let url = format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}?valueInputOption={}",
            request.spreadsheet_id,
            urlencoding::encode(&request.range),
            request.value_input_option
        );

        let body = json!({
            "values": request.values,
            "majorDimension": "ROWS"
        });

        self.make_google_request(user_id, "sheets", &url, "PUT", Some(body)).await?;
        Ok(())
    }

    pub async fn create_sheet(&self, user_id: &str, title: &str) -> Result<String> {
        let url = "https://sheets.googleapis.com/v4/spreadsheets";
        
        let body = json!({
            "properties": {
                "title": title
            }
        });

        let response = self.make_google_request(user_id, "sheets", url, "POST", Some(body)).await?;
        let data: Value = response.json().await?;

        Ok(data["spreadsheetId"].as_str().unwrap_or("").to_string())
    }

    pub async fn export_campaign_metrics_to_sheets(&self, user_id: &str, metrics: &[CampaignMetrics]) -> Result<String> {
        // Create a new spreadsheet for the campaign metrics
        let sheet_id = self.create_sheet(user_id, &format!("Campaign Metrics - {}", Utc::now().format("%Y-%m-%d"))).await?;

        // Prepare headers
        let headers = vec![
            "Campaign ID".to_string(),
            "Name".to_string(),
            "Messages Sent".to_string(),
            "Messages Delivered".to_string(),
            "Messages Read".to_string(),
            "Responses Received".to_string(),
            "Conversion Rate".to_string(),
            "Cost per Message".to_string(),
            "Total Cost".to_string(),
            "Start Date".to_string(),
            "End Date".to_string(),
        ];

        // Prepare data rows
        let mut values = vec![headers];
        for metric in metrics {
            values.push(vec![
                metric.campaign_id.clone(),
                metric.name.clone(),
                metric.messages_sent.to_string(),
                metric.messages_delivered.to_string(),
                metric.messages_read.to_string(),
                metric.responses_received.to_string(),
                format!("{:.2}%", metric.conversion_rate * 100.0),
                format!("R$ {:.2}", metric.cost_per_message),
                format!("R$ {:.2}", metric.total_cost),
                metric.date_range_start.format("%Y-%m-%d").to_string(),
                metric.date_range_end.format("%Y-%m-%d").to_string(),
            ]);
        }

        let update_request = SheetUpdateRequest {
            spreadsheet_id: sheet_id.clone(),
            range: "A1:K1000".to_string(),
            values,
            value_input_option: "USER_ENTERED".to_string(),
        };

        self.update_sheet(user_id, &update_request).await?;

        Ok(format!("https://docs.google.com/spreadsheets/d/{}", sheet_id))
    }

    pub async fn import_contacts_from_sheets(&self, user_id: &str, spreadsheet_id: &str) -> Result<Vec<Contact>> {
        let sheet_data = self.read_sheet(user_id, spreadsheet_id, "A:G").await?;
        let mut contacts = Vec::new();

        // Skip header row
        for row in sheet_data.values.iter().skip(1) {
            if row.len() >= 2 {
                let contact = Contact {
                    id: None,
                    name: row.get(0).cloned().unwrap_or_default(),
                    phone: row.get(1).cloned().unwrap_or_default(),
                    email: row.get(2).cloned(),
                    company: row.get(3).cloned(),
                    tags: row.get(4)
                        .cloned()
                        .unwrap_or_default()
                        .split(',')
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect(),
                    last_contact: row.get(5)
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                    status: row.get(6).cloned().unwrap_or_else(|| "active".to_string()),
                };

                if !contact.phone.is_empty() {
                    contacts.push(contact);
                }
            }
        }

        Ok(contacts)
    }

    // =============================================================================
    // Google Calendar Integration
    // =============================================================================

    pub async fn create_calendar_event(&self, user_id: &str, event: &CalendarEvent, calendar_id: Option<&str>) -> Result<String> {
        let calendar_id = calendar_id.unwrap_or("primary");
        let url = format!(
            "https://www.googleapis.com/calendar/v3/calendars/{}/events",
            urlencoding::encode(calendar_id)
        );

        let body = serde_json::to_value(event)?;
        let response = self.make_google_request(user_id, "calendar", &url, "POST", Some(body)).await?;
        let data: Value = response.json().await?;

        Ok(data["id"].as_str().unwrap_or("").to_string())
    }

    pub async fn list_calendar_events(&self, user_id: &str, calendar_id: Option<&str>, start_date: DateTime<Utc>, end_date: DateTime<Utc>) -> Result<Vec<CalendarEvent>> {
        let calendar_id = calendar_id.unwrap_or("primary");
        let url = format!(
            "https://www.googleapis.com/calendar/v3/calendars/{}/events?timeMin={}&timeMax={}",
            urlencoding::encode(calendar_id),
            start_date.to_rfc3339(),
            end_date.to_rfc3339()
        );

        let response = self.make_google_request(user_id, "calendar", &url, "GET", None).await?;
        let data: Value = response.json().await?;

        let mut events = Vec::new();
        if let Some(items) = data["items"].as_array() {
            for item in items {
                if let Ok(event) = serde_json::from_value::<CalendarEvent>(item.clone()) {
                    events.push(event);
                }
            }
        }

        Ok(events)
    }

    pub async fn schedule_technician_visit(&self, user_id: &str, visit: &TechnicianVisit) -> Result<String> {
        let event = CalendarEvent {
            id: None,
            summary: format!("Visita Técnica - {}", visit.customer_name),
            description: Some(format!(
                "Cliente: {}\nTelefone: {}\nEndereço: {}\nTécnico: {}\nTipo: {}\nNotas: {}",
                visit.customer_name,
                visit.customer_phone,
                visit.customer_address,
                visit.technician_name,
                visit.visit_type,
                visit.notes.as_deref().unwrap_or("Nenhuma")
            )),
            location: Some(visit.customer_address.clone()),
            start: EventDateTime {
                date_time: Some(visit.scheduled_datetime),
                date: None,
                time_zone: Some("America/Sao_Paulo".to_string()),
            },
            end: EventDateTime {
                date_time: Some(visit.scheduled_datetime + chrono::Duration::minutes(visit.estimated_duration as i64)),
                date: None,
                time_zone: Some("America/Sao_Paulo".to_string()),
            },
            attendees: vec![
                Attendee {
                    email: format!("{}@company.com", visit.technician_id), // Assume email format
                    display_name: Some(visit.technician_name.clone()),
                    response_status: None,
                }
            ],
            recurrence: None,
            timezone: "America/Sao_Paulo".to_string(),
        };

        self.create_calendar_event(user_id, &event, None).await
    }

    pub async fn check_technician_availability(&self, user_id: &str, date: NaiveDate, technician_id: &str) -> Result<Vec<TimeSlot>> {
        let start_datetime = date.and_hms_opt(8, 0, 0).unwrap().and_utc(); // 8 AM
        let end_datetime = date.and_hms_opt(18, 0, 0).unwrap().and_utc(); // 6 PM

        let events = self.list_calendar_events(user_id, None, start_datetime, end_datetime).await?;

        // Filter events for the specific technician
        let technician_events: Vec<_> = events.into_iter()
            .filter(|event| {
                event.attendees.iter().any(|attendee| 
                    attendee.email.contains(technician_id)
                )
            })
            .collect();

        // Generate time slots (1-hour intervals)
        let mut time_slots = Vec::new();
        let mut current = start_datetime;

        while current < end_datetime {
            let slot_end = current + chrono::Duration::hours(1);
            
            let is_available = !technician_events.iter().any(|event| {
                if let (Some(event_start), Some(event_end)) = (&event.start.date_time, &event.end.date_time) {
                    current < *event_end && slot_end > *event_start
                } else {
                    false
                }
            });

            time_slots.push(TimeSlot {
                start_time: current,
                end_time: slot_end,
                available: is_available,
                technician_id: Some(technician_id.to_string()),
            });

            current = slot_end;
        }

        Ok(time_slots)
    }

    // =============================================================================
    // Google Drive Integration
    // =============================================================================

    pub async fn create_drive_folder(&self, user_id: &str, name: &str, parent_id: Option<&str>) -> Result<String> {
        let url = "https://www.googleapis.com/drive/v3/files";

        let mut metadata = json!({
            "name": name,
            "mimeType": "application/vnd.google-apps.folder"
        });

        if let Some(parent_id) = parent_id {
            metadata["parents"] = json!([parent_id]);
        }

        let response = self.make_google_request(user_id, "drive", url, "POST", Some(metadata)).await?;
        let data: Value = response.json().await?;

        Ok(data["id"].as_str().unwrap_or("").to_string())
    }

    pub async fn upload_file_to_drive(&self, user_id: &str, request: &FileUploadRequest) -> Result<DriveFile> {
        // First, upload the file metadata
        let metadata_url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
        
        let mut metadata = json!({
            "name": request.name,
            "mimeType": request.mime_type
        });

        if let Some(parent_id) = &request.parent_folder_id {
            metadata["parents"] = json!([parent_id]);
        }

        let token = self.get_valid_token(user_id).await?;
        
        // Start resumable upload
        let init_response = self.client
            .post(metadata_url)
            .bearer_auth(&token)
            .json(&metadata)
            .header("X-Upload-Content-Type", &request.mime_type)
            .header("X-Upload-Content-Length", request.content.len())
            .send()
            .await?;

        let upload_url = init_response
            .headers()
            .get("Location")
            .and_then(|h| h.to_str().ok())
            .ok_or_else(|| anyhow!("No upload URL received"))?;

        // Upload the actual content
        let upload_response = self.client
            .put(upload_url)
            .header("Content-Type", &request.mime_type)
            .body(request.content.clone())
            .send()
            .await?;

        if !upload_response.status().is_success() {
            let error_text = upload_response.text().await?;
            return Err(anyhow!("File upload failed: {}", error_text));
        }

        let file_data: Value = upload_response.json().await?;
        let drive_file = DriveFile {
            id: file_data["id"].as_str().unwrap_or("").to_string(),
            name: file_data["name"].as_str().unwrap_or("").to_string(),
            mime_type: file_data["mimeType"].as_str().unwrap_or("").to_string(),
            size: file_data["size"].as_str().and_then(|s| s.parse().ok()),
            created_time: file_data["createdTime"]
                .as_str()
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(Utc::now),
            modified_time: file_data["modifiedTime"]
                .as_str()
                .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(Utc::now),
            web_view_link: file_data["webViewLink"].as_str().map(|s| s.to_string()),
            web_content_link: file_data["webContentLink"].as_str().map(|s| s.to_string()),
            parents: file_data["parents"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .filter_map(|v| v.as_str())
                .map(|s| s.to_string())
                .collect(),
        };

        // Share the file if requested
        for email in &request.share_with {
            let _ = self.share_file(user_id, &drive_file.id, email, "reader", false, None).await;
        }

        Ok(drive_file)
    }

    pub async fn share_file(&self, user_id: &str, file_id: &str, email: &str, role: &str, send_notification: bool, message: Option<&str>) -> Result<()> {
        let url = format!(
            "https://www.googleapis.com/drive/v3/files/{}/permissions",
            file_id
        );

        let mut body = json!({
            "type": "user",
            "role": role,
            "emailAddress": email,
            "sendNotificationEmail": send_notification
        });

        if let Some(msg) = message {
            body["emailMessage"] = json!(msg);
        }

        self.make_google_request(user_id, "drive", &url, "POST", Some(body)).await?;
        Ok(())
    }

    pub async fn list_drive_files(&self, user_id: &str, folder_id: Option<&str>, page_size: Option<u32>) -> Result<Vec<DriveFile>> {
        let mut url = "https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents)".to_string();
        
        if let Some(folder_id) = folder_id {
            url.push_str(&format!("&q='{}'%20in%20parents", folder_id));
        }

        if let Some(size) = page_size {
            url.push_str(&format!("&pageSize={}", size));
        }

        let response = self.make_google_request(user_id, "drive", &url, "GET", None).await?;
        let data: Value = response.json().await?;

        let mut files = Vec::new();
        if let Some(items) = data["files"].as_array() {
            for item in items {
                if let Ok(file) = serde_json::from_value::<DriveFile>(item.clone()) {
                    files.push(file);
                }
            }
        }

        Ok(files)
    }

    // =============================================================================
    // Automation Workflows
    // =============================================================================

    pub async fn daily_metrics_export(&self, user_id: &str, tenant_id: &str) -> Result<String> {
        info!("Running daily metrics export for tenant: {}", tenant_id);

        // This would typically fetch real metrics from your database
        let sample_metrics = vec![
            CampaignMetrics {
                campaign_id: "camp_001".to_string(),
                name: "Promoção de Verão".to_string(),
                messages_sent: 1000,
                messages_delivered: 980,
                messages_read: 750,
                responses_received: 150,
                conversion_rate: 0.15,
                cost_per_message: 0.25,
                total_cost: 250.0,
                date_range_start: Utc::now() - chrono::Duration::days(1),
                date_range_end: Utc::now(),
            },
        ];

        self.export_campaign_metrics_to_sheets(user_id, &sample_metrics).await
    }

    pub async fn backup_conversations_to_drive(&self, user_id: &str, tenant_id: &str) -> Result<String> {
        info!("Starting conversation backup for tenant: {}", tenant_id);

        // Create backup folder structure
        let backup_folder_name = format!("PyTake_Backup_{}", Utc::now().format("%Y_%m_%d"));
        let backup_folder_id = self.create_drive_folder(user_id, &backup_folder_name, None).await?;

        // This would typically export conversation data from your database
        let backup_data = json!({
            "tenant_id": tenant_id,
            "backup_date": Utc::now().to_rfc3339(),
            "conversations": [],
            "messages": [],
            "contacts": [],
        });

        let backup_content = serde_json::to_string_pretty(&backup_data)?;
        let upload_request = FileUploadRequest {
            name: format!("conversations_backup_{}.json", Utc::now().format("%Y%m%d_%H%M%S")),
            parent_folder_id: Some(backup_folder_id.clone()),
            content: backup_content.into_bytes(),
            mime_type: "application/json".to_string(),
            share_with: vec![], // Add admin emails if needed
        };

        let backup_file = self.upload_file_to_drive(user_id, &upload_request).await?;

        Ok(backup_file.web_view_link.unwrap_or_else(|| {
            format!("https://drive.google.com/file/d/{}/view", backup_file.id)
        }))
    }

    pub async fn generate_weekly_report(&self, user_id: &str, tenant_id: &str) -> Result<String> {
        info!("Generating weekly report for tenant: {}", tenant_id);

        let sheet_title = format!("Relatório Semanal - {}", Utc::now().format("%Y-%m-%d"));
        let sheet_id = self.create_sheet(user_id, &sheet_title).await?;

        // Create comprehensive weekly report
        let headers = vec![
            vec!["RELATÓRIO SEMANAL PYTAKE".to_string()],
            vec!["".to_string()],
            vec!["RESUMO EXECUTIVO".to_string()],
            vec!["Métrica".to_string(), "Valor".to_string(), "Variação".to_string()],
            vec!["Total de Mensagens".to_string(), "5,432".to_string(), "+12%".to_string()],
            vec!["Taxa de Entrega".to_string(), "98.5%".to_string(), "+0.3%".to_string()],
            vec!["Taxa de Leitura".to_string(), "85.2%".to_string(), "+2.1%".to_string()],
            vec!["Conversões".to_string(), "234".to_string(), "+18%".to_string()],
            vec!["".to_string()],
            vec!["CAMPANHAS ATIVAS".to_string()],
            vec!["Nome".to_string(), "Status".to_string(), "Performance".to_string()],
            vec!["Promoção de Verão".to_string(), "Ativa".to_string(), "Excelente".to_string()],
            vec!["Follow-up Vendas".to_string(), "Ativa".to_string(), "Bom".to_string()],
        ];

        let update_request = SheetUpdateRequest {
            spreadsheet_id: sheet_id.clone(),
            range: "A1:C20".to_string(),
            values: headers,
            value_input_option: "USER_ENTERED".to_string(),
        };

        self.update_sheet(user_id, &update_request).await?;

        Ok(format!("https://docs.google.com/spreadsheets/d/{}", sheet_id))
    }
}

// =============================================================================
// API Handlers
// =============================================================================

pub async fn generate_auth_url_handler(
    data: web::Data<GoogleIntegrationsManager>,
    req: web::Json<AuthUrlRequest>,
) -> ActixResult<HttpResponse> {
    match data.generate_auth_url(req.service.clone(), req.user_id.clone(), req.tenant_id.clone()).await {
        Ok((auth_url, state)) => Ok(HttpResponse::Ok().json(AuthUrlResponse { auth_url, state })),
        Err(e) => {
            error!("Failed to generate auth URL: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to generate auth URL",
                "message": e.to_string()
            })))
        }
    }
}

pub async fn oauth_callback_handler(
    data: web::Data<GoogleIntegrationsManager>,
    req: web::Json<CallbackRequest>,
) -> ActixResult<HttpResponse> {
    match data.handle_oauth_callback(req.code.clone(), req.state.clone()).await {
        Ok(tokens) => Ok(HttpResponse::Ok().json(CallbackResponse {
            success: true,
            message: "Authentication successful".to_string(),
            tokens: Some(tokens),
        })),
        Err(e) => {
            error!("OAuth callback failed: {}", e);
            Ok(HttpResponse::BadRequest().json(CallbackResponse {
                success: false,
                message: format!("Authentication failed: {}", e),
                tokens: None,
            }))
        }
    }
}

pub async fn read_sheets_handler(
    data: web::Data<GoogleIntegrationsManager>,
    path: web::Path<String>,
    req: web::Json<SheetsReadRequest>,
    _http_req: HttpRequest,
) -> ActixResult<HttpResponse> {
    let user_id = path.into_inner();
    
    match data.read_sheet(&user_id, &req.spreadsheet_id, &req.range).await {
        Ok(sheet_data) => Ok(HttpResponse::Ok().json(SheetsReadResponse { data: sheet_data })),
        Err(e) => {
            error!("Failed to read sheet: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to read sheet",
                "message": e.to_string()
            })))
        }
    }
}

pub async fn update_sheets_handler(
    data: web::Data<GoogleIntegrationsManager>,
    path: web::Path<String>,
    req: web::Json<SheetUpdateRequest>,
) -> ActixResult<HttpResponse> {
    let user_id = path.into_inner();
    
    match data.update_sheet(&user_id, &req).await {
        Ok(_) => Ok(HttpResponse::Ok().json(json!({
            "success": true,
            "message": "Sheet updated successfully"
        }))),
        Err(e) => {
            error!("Failed to update sheet: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to update sheet",
                "message": e.to_string()
            })))
        }
    }
}

pub async fn create_calendar_event_handler(
    data: web::Data<GoogleIntegrationsManager>,
    path: web::Path<String>,
    req: web::Json<CalendarEventRequest>,
) -> ActixResult<HttpResponse> {
    let user_id = path.into_inner();
    
    match data.create_calendar_event(&user_id, &req.event, req.calendar_id.as_deref()).await {
        Ok(event_id) => {
            let calendar_link = format!("https://calendar.google.com/calendar/event?eid={}", event_id);
            Ok(HttpResponse::Ok().json(CalendarEventResponse { event_id, calendar_link }))
        },
        Err(e) => {
            error!("Failed to create calendar event: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to create calendar event",
                "message": e.to_string()
            })))
        }
    }
}

pub async fn upload_drive_file_handler(
    data: web::Data<GoogleIntegrationsManager>,
    path: web::Path<String>,
    req: web::Json<FileUploadRequest>,
) -> ActixResult<HttpResponse> {
    let user_id = path.into_inner();
    
    match data.upload_file_to_drive(&user_id, &req).await {
        Ok(file) => Ok(HttpResponse::Ok().json(DriveUploadResponse {
            file_id: file.id,
            file_name: file.name,
            web_view_link: file.web_view_link.unwrap_or_default(),
            share_url: file.web_content_link,
        })),
        Err(e) => {
            error!("Failed to upload file to Drive: {}", e);
            Ok(HttpResponse::InternalServerError().json(json!({
                "error": "Failed to upload file",
                "message": e.to_string()
            })))
        }
    }
}

// =============================================================================
// Configuration and Initialization
// =============================================================================

pub fn configure_google_integrations(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1/google")
            .route("/auth", web::post().to(generate_auth_url_handler))
            .route("/callback", web::post().to(oauth_callback_handler))
            .route("/sheets/{user_id}", web::get().to(read_sheets_handler))
            .route("/sheets/{user_id}/update", web::post().to(update_sheets_handler))
            .route("/calendar/{user_id}/events", web::post().to(create_calendar_event_handler))
            .route("/drive/{user_id}/upload", web::post().to(upload_drive_file_handler))
    );
}

async fn get_google_config_cached() -> Result<GoogleConfig> {
    Ok(GoogleConfig {
        client_id: std::env::var("GOOGLE_CLIENT_ID")
            .context("GOOGLE_CLIENT_ID not set")?,
        client_secret: std::env::var("GOOGLE_CLIENT_SECRET")
            .context("GOOGLE_CLIENT_SECRET not set")?,
        redirect_uri: std::env::var("GOOGLE_REDIRECT_URI")
            .unwrap_or_else(|_| "http://localhost:8080/api/v1/google/callback".to_string()),
        scopes: vec![
            "https://www.googleapis.com/auth/spreadsheets".to_string(),
            "https://www.googleapis.com/auth/drive".to_string(),
            "https://www.googleapis.com/auth/calendar".to_string(),
        ],
    })
}

pub async fn create_google_integrations_manager() -> Result<GoogleIntegrationsManager> {
    let config = get_google_config_cached().await?;
    Ok(GoogleIntegrationsManager::new(config))
}