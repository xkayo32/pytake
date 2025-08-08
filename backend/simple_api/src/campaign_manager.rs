use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sea_orm::{DatabaseConnection, Statement, FromQueryResult, ConnectionTrait};
use tracing::{info, error};
use dashmap::DashMap;
use utoipa::ToSchema;

// ===== DATA STRUCTURES =====

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Campaign {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub objective: CampaignObjective,
    pub status: CampaignStatus,
    pub created_by: Uuid,
    pub organization_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub paused_at: Option<DateTime<Utc>>,
    pub recurrence: Option<RecurrenceConfig>,
    pub throttle_config: ThrottleConfig,
    pub segmentation: ContactSegmentation,
    pub templates: Vec<MessageTemplate>,
    pub ab_test_config: Option<ABTestConfig>,
    pub metrics: CampaignMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum CampaignObjective {
    Engagement,
    Conversions,
    Retention,
    Acquisition,
    Informational,
    Promotional,
    Survey,
    Announcement,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CampaignStatus {
    Draft,
    Scheduled,
    Running,
    Paused,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RecurrenceConfig {
    pub frequency: RecurrenceFrequency,
    pub interval: i32, // Every N days/weeks/months
    pub end_type: RecurrenceEndType,
    pub max_occurrences: Option<i32>,
    pub end_date: Option<DateTime<Utc>>,
    pub days_of_week: Option<Vec<u8>>, // 0-6 (Sunday-Saturday)
    pub hour: u8, // 0-23
    pub minute: u8, // 0-59
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum RecurrenceFrequency {
    Daily,
    Weekly,
    Monthly,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum RecurrenceEndType {
    Never,
    After,
    On,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ThrottleConfig {
    pub messages_per_minute: u32,
    pub messages_per_hour: u32,
    pub messages_per_day: u32,
    pub delay_between_messages_ms: u64,
    pub respect_business_hours: bool,
    pub business_hours_start: Option<u8>,
    pub business_hours_end: Option<u8>,
    pub timezone_per_contact: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ContactSegmentation {
    pub include_all: bool,
    pub included_groups: Vec<String>,
    pub excluded_groups: Vec<String>,
    pub included_tags: Vec<String>,
    pub excluded_tags: Vec<String>,
    pub custom_filters: Vec<ContactFilter>,
    pub estimated_recipients: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ContactFilter {
    pub field: String,
    pub operator: FilterOperator,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum FilterOperator {
    Equals,
    NotEquals,
    Contains,
    NotContains,
    StartsWith,
    EndsWith,
    GreaterThan,
    LessThan,
    In,
    NotIn,
    IsEmpty,
    IsNotEmpty,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MessageTemplate {
    pub id: Uuid,
    pub name: String,
    pub content: String,
    pub template_type: MessageTemplateType,
    pub variables: Vec<String>,
    pub media_url: Option<String>,
    pub media_type: Option<String>,
    pub buttons: Option<Vec<MessageButton>>,
    pub ab_variant: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum MessageTemplateType {
    Text,
    Image,
    Video,
    Document,
    Audio,
    Location,
    Template,
    Interactive,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MessageButton {
    pub text: String,
    pub button_type: ButtonType,
    pub url: Option<String>,
    pub phone_number: Option<String>,
    pub payload: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ButtonType {
    Url,
    PhoneNumber,
    QuickReply,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ABTestConfig {
    pub enabled: bool,
    pub test_percentage: f64, // 0.0-100.0
    pub variants: Vec<ABTestVariant>,
    pub metric_to_optimize: ABTestMetric,
    pub minimum_sample_size: u32,
    pub significance_level: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ABTestVariant {
    pub name: String,
    pub percentage: f64,
    pub template_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ABTestMetric {
    OpenRate,
    ClickThroughRate,
    ConversionRate,
    EngagementRate,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CampaignMetrics {
    pub total_recipients: u64,
    pub messages_sent: u64,
    pub messages_delivered: u64,
    pub messages_read: u64,
    pub messages_failed: u64,
    pub clicks: u64,
    pub conversions: u64,
    pub unsubscribes: u64,
    pub complaints: u64,
    pub delivery_rate: f64,
    pub open_rate: f64,
    pub click_through_rate: f64,
    pub conversion_rate: f64,
    pub engagement_rate: f64,
    pub cost_per_conversion: Option<f64>,
    pub roi: Option<f64>,
    pub hourly_stats: HashMap<u8, HourlyStats>,
    pub daily_stats: HashMap<String, DailyStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct HourlyStats {
    pub hour: u8,
    pub sent: u64,
    pub delivered: u64,
    pub read: u64,
    pub clicks: u64,
    pub engagement_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DailyStats {
    pub date: String,
    pub sent: u64,
    pub delivered: u64,
    pub read: u64,
    pub clicks: u64,
    pub conversions: u64,
    pub engagement_rate: f64,
    pub conversion_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Contact {
    pub id: Uuid,
    pub phone_number: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub organization_id: Uuid,
    pub groups: Vec<String>,
    pub tags: Vec<String>,
    pub custom_fields: HashMap<String, String>,
    pub timezone: Option<String>,
    pub is_opted_out: bool,
    pub is_blacklisted: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_interaction: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ContactGroup {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub organization_id: Uuid,
    pub contact_count: u64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ===== REQUEST/RESPONSE STRUCTURES =====

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateCampaignRequest {
    pub name: String,
    pub description: String,
    pub objective: CampaignObjective,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub recurrence: Option<RecurrenceConfig>,
    pub throttle_config: ThrottleConfig,
    pub segmentation: ContactSegmentation,
    pub templates: Vec<CreateMessageTemplateRequest>,
    pub ab_test_config: Option<ABTestConfig>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateMessageTemplateRequest {
    pub name: String,
    pub content: String,
    pub template_type: MessageTemplateType,
    pub variables: Vec<String>,
    pub media_url: Option<String>,
    pub media_type: Option<String>,
    pub buttons: Option<Vec<MessageButton>>,
    pub ab_variant: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateCampaignRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub objective: Option<CampaignObjective>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub recurrence: Option<RecurrenceConfig>,
    pub throttle_config: Option<ThrottleConfig>,
    pub segmentation: Option<ContactSegmentation>,
    pub ab_test_config: Option<ABTestConfig>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ListCampaignsQuery {
    pub status: Option<CampaignStatus>,
    pub objective: Option<CampaignObjective>,
    pub created_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CampaignAnalytics {
    pub campaign_id: Uuid,
    pub campaign_name: String,
    pub status: CampaignStatus,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub metrics: CampaignMetrics,
    pub ab_test_results: Option<ABTestResults>,
    pub conversion_funnel: ConversionFunnel,
    pub performance_by_segment: HashMap<String, CampaignMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ABTestResults {
    pub test_status: ABTestStatus,
    pub winning_variant: Option<String>,
    pub confidence_level: f64,
    pub variants_performance: HashMap<String, VariantPerformance>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ABTestStatus {
    Running,
    Completed,
    Inconclusive,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VariantPerformance {
    pub variant_name: String,
    pub sample_size: u32,
    pub conversion_rate: f64,
    pub click_through_rate: f64,
    pub engagement_rate: f64,
    pub confidence_interval: (f64, f64),
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConversionFunnel {
    pub sent: u64,
    pub delivered: u64,
    pub opened: u64,
    pub clicked: u64,
    pub converted: u64,
    pub stages: Vec<FunnelStage>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FunnelStage {
    pub stage: String,
    pub count: u64,
    pub percentage: f64,
    pub drop_off_rate: f64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ImportContactsRequest {
    pub source: ContactImportSource,
    pub data: Vec<ImportContactData>,
    pub group_name: Option<String>,
    pub tags: Option<Vec<String>>,
    pub merge_strategy: MergeStrategy,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ContactImportSource {
    Csv,
    Json,
    Excel,
    Api,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ImportContactData {
    pub phone_number: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub custom_fields: Option<HashMap<String, String>>,
    pub timezone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum MergeStrategy {
    Skip,
    Update,
    Replace,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AddTagsRequest {
    pub tags: Vec<String>,
    pub contact_ids: Option<Vec<Uuid>>,
    pub phone_numbers: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ImportResult {
    pub total_processed: u32,
    pub successful_imports: u32,
    pub failed_imports: u32,
    pub skipped: u32,
    pub errors: Vec<ImportError>,
    pub created_group_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ImportError {
    pub row: u32,
    pub phone_number: String,
    pub error: String,
}

// ===== CAMPAIGN MANAGER SERVICE =====

pub struct CampaignManager {
    db: DatabaseConnection,
    campaigns: Arc<DashMap<Uuid, Campaign>>,
    contacts: Arc<DashMap<Uuid, Contact>>,
    contact_groups: Arc<DashMap<Uuid, ContactGroup>>,
    message_queue: Arc<RwLock<Vec<QueuedMessage>>>,
    throttle_state: Arc<DashMap<Uuid, ThrottleState>>,
}

#[derive(Debug, Clone)]
struct QueuedMessage {
    id: Uuid,
    campaign_id: Uuid,
    contact_id: Uuid,
    template_id: Uuid,
    scheduled_at: DateTime<Utc>,
    status: MessageStatus,
    retry_count: u8,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
enum MessageStatus {
    Queued,
    Sending,
    Sent,
    Delivered,
    Read,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone)]
struct ThrottleState {
    messages_sent_minute: u32,
    messages_sent_hour: u32,
    messages_sent_day: u32,
    last_reset_minute: DateTime<Utc>,
    last_reset_hour: DateTime<Utc>,
    last_reset_day: DateTime<Utc>,
}

impl CampaignManager {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            db,
            campaigns: Arc::new(DashMap::new()),
            contacts: Arc::new(DashMap::new()),
            contact_groups: Arc::new(DashMap::new()),
            message_queue: Arc::new(RwLock::new(Vec::new())),
            throttle_state: Arc::new(DashMap::new()),
        }
    }

    pub async fn migrate(&self) -> Result<(), sea_orm::DbErr> {
        // Create campaigns table
        let create_campaigns_table = Statement::from_string(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            CREATE TABLE IF NOT EXISTS campaigns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                description TEXT,
                objective VARCHAR NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'draft',
                created_by UUID NOT NULL,
                organization_id UUID NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                scheduled_at TIMESTAMP WITH TIME ZONE,
                started_at TIMESTAMP WITH TIME ZONE,
                completed_at TIMESTAMP WITH TIME ZONE,
                paused_at TIMESTAMP WITH TIME ZONE,
                recurrence_config JSONB,
                throttle_config JSONB NOT NULL,
                segmentation JSONB NOT NULL,
                ab_test_config JSONB,
                metrics JSONB DEFAULT '{}'::jsonb
            );
            "#.to_string()
        );

        self.db.execute(create_campaigns_table).await?;

        // Create message templates table
        let create_templates_table = Statement::from_string(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            CREATE TABLE IF NOT EXISTS message_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                name VARCHAR NOT NULL,
                content TEXT NOT NULL,
                template_type VARCHAR NOT NULL,
                variables JSONB DEFAULT '[]'::jsonb,
                media_url TEXT,
                media_type VARCHAR,
                buttons JSONB,
                ab_variant VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            "#.to_string()
        );

        self.db.execute(create_templates_table).await?;

        // Create contacts table
        let create_contacts_table = Statement::from_string(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            CREATE TABLE IF NOT EXISTS campaign_contacts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                phone_number VARCHAR NOT NULL,
                name VARCHAR,
                email VARCHAR,
                organization_id UUID NOT NULL,
                groups JSONB DEFAULT '[]'::jsonb,
                tags JSONB DEFAULT '[]'::jsonb,
                custom_fields JSONB DEFAULT '{}'::jsonb,
                timezone VARCHAR,
                is_opted_out BOOLEAN DEFAULT false,
                is_blacklisted BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                last_interaction TIMESTAMP WITH TIME ZONE,
                UNIQUE(phone_number, organization_id)
            );
            "#.to_string()
        );

        self.db.execute(create_contacts_table).await?;

        // Create contact groups table
        let create_groups_table = Statement::from_string(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            CREATE TABLE IF NOT EXISTS campaign_contact_groups (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR NOT NULL,
                description TEXT,
                organization_id UUID NOT NULL,
                contact_count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(name, organization_id)
            );
            "#.to_string()
        );

        self.db.execute(create_groups_table).await?;

        // Create campaign messages table for tracking
        let create_messages_table = Statement::from_string(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            CREATE TABLE IF NOT EXISTS campaign_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
                contact_id UUID NOT NULL REFERENCES campaign_contacts(id) ON DELETE CASCADE,
                template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
                phone_number VARCHAR NOT NULL,
                content TEXT NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'queued',
                scheduled_at TIMESTAMP WITH TIME ZONE,
                sent_at TIMESTAMP WITH TIME ZONE,
                delivered_at TIMESTAMP WITH TIME ZONE,
                read_at TIMESTAMP WITH TIME ZONE,
                clicked_at TIMESTAMP WITH TIME ZONE,
                converted_at TIMESTAMP WITH TIME ZONE,
                failed_at TIMESTAMP WITH TIME ZONE,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                ab_variant VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            "#.to_string()
        );

        self.db.execute(create_messages_table).await?;

        // Create indexes for performance
        let create_indexes = vec![
            "CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);",
            "CREATE INDEX IF NOT EXISTS idx_campaigns_organization ON campaigns(organization_id);",
            "CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_contacts_phone ON campaign_contacts(phone_number);",
            "CREATE INDEX IF NOT EXISTS idx_contacts_organization ON campaign_contacts(organization_id);",
            "CREATE INDEX IF NOT EXISTS idx_messages_campaign ON campaign_messages(campaign_id);",
            "CREATE INDEX IF NOT EXISTS idx_messages_status ON campaign_messages(status);",
            "CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON campaign_messages(scheduled_at);",
        ];

        for index in create_indexes {
            let stmt = Statement::from_string(sea_orm::DatabaseBackend::Postgres, index.to_string());
            self.db.execute(stmt).await?;
        }

        info!("Campaign management database migration completed successfully");
        Ok(())
    }

    // ===== CAMPAIGN MANAGEMENT =====

    pub async fn create_campaign(
        &self,
        user_id: Uuid,
        organization_id: Uuid,
        request: CreateCampaignRequest,
    ) -> Result<Campaign, CampaignError> {
        let campaign_id = Uuid::new_v4();
        let now = Utc::now();

        // Estimate recipients based on segmentation
        let estimated_recipients = self.estimate_recipients(&request.segmentation, organization_id).await?;

        // Create message templates
        let mut templates = Vec::new();
        for template_req in request.templates {
            let template = MessageTemplate {
                id: Uuid::new_v4(),
                name: template_req.name,
                content: template_req.content,
                template_type: template_req.template_type,
                variables: template_req.variables,
                media_url: template_req.media_url,
                media_type: template_req.media_type,
                buttons: template_req.buttons,
                ab_variant: template_req.ab_variant,
            };
            templates.push(template);
        }

        let mut segmentation = request.segmentation;
        segmentation.estimated_recipients = Some(estimated_recipients);

        let campaign = Campaign {
            id: campaign_id,
            name: request.name,
            description: request.description,
            objective: request.objective,
            status: CampaignStatus::Draft,
            created_by: user_id,
            organization_id,
            created_at: now,
            updated_at: now,
            scheduled_at: request.scheduled_at,
            started_at: None,
            completed_at: None,
            paused_at: None,
            recurrence: request.recurrence,
            throttle_config: request.throttle_config,
            segmentation,
            templates,
            ab_test_config: request.ab_test_config,
            metrics: CampaignMetrics::default(),
        };

        // Save to database
        self.save_campaign_to_db(&campaign).await?;

        // Cache in memory
        self.campaigns.insert(campaign_id, campaign.clone());

        info!("Created campaign: {} ({})", campaign.name, campaign_id);
        Ok(campaign)
    }

    pub async fn list_campaigns(
        &self,
        organization_id: Uuid,
        query: ListCampaignsQuery,
    ) -> Result<Vec<Campaign>, CampaignError> {
        // Build dynamic SQL query based on filters
        let mut sql = "SELECT * FROM campaigns WHERE organization_id = $1".to_string();
        let mut params: Vec<sea_orm::Value> = vec![organization_id.into()];
        let mut param_count = 1;

        if let Some(status) = &query.status {
            param_count += 1;
            sql.push_str(&format!(" AND status = ${}", param_count));
            params.push(format!("{:?}", status).to_lowercase().into());
        }

        if let Some(objective) = &query.objective {
            param_count += 1;
            sql.push_str(&format!(" AND objective = ${}", param_count));
            params.push(format!("{:?}", objective).to_lowercase().into());
        }

        if let Some(created_after) = query.created_after {
            param_count += 1;
            sql.push_str(&format!(" AND created_at >= ${}", param_count));
            params.push(created_after.into());
        }

        if let Some(created_before) = query.created_before {
            param_count += 1;
            sql.push_str(&format!(" AND created_at <= ${}", param_count));
            params.push(created_before.into());
        }

        // Add sorting
        let sort_by = query.sort_by.unwrap_or_else(|| "created_at".to_string());
        let sort_order = query.sort_order.unwrap_or_else(|| "DESC".to_string());
        sql.push_str(&format!(" ORDER BY {} {}", sort_by, sort_order));

        // Add pagination
        let limit = query.limit.unwrap_or(50).min(100);
        let offset = query.page.unwrap_or(0) * limit;
        param_count += 1;
        sql.push_str(&format!(" LIMIT ${}", param_count));
        params.push((limit as i64).into());
        param_count += 1;
        sql.push_str(&format!(" OFFSET ${}", param_count));
        params.push((offset as i64).into());

        #[derive(FromQueryResult)]
        struct CampaignRow {
            id: Uuid,
            name: String,
            description: Option<String>,
            objective: String,
            status: String,
            created_by: Uuid,
            organization_id: Uuid,
            created_at: DateTime<Utc>,
            updated_at: DateTime<Utc>,
            scheduled_at: Option<DateTime<Utc>>,
            started_at: Option<DateTime<Utc>>,
            completed_at: Option<DateTime<Utc>>,
            paused_at: Option<DateTime<Utc>>,
            recurrence_config: Option<serde_json::Value>,
            throttle_config: serde_json::Value,
            segmentation: serde_json::Value,
            ab_test_config: Option<serde_json::Value>,
            metrics: Option<serde_json::Value>,
        }

        let stmt = Statement::from_sql_and_values(sea_orm::DatabaseBackend::Postgres, sql, params);
        let rows = CampaignRow::find_by_statement(stmt).all(&self.db).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        let mut campaigns = Vec::new();
        for row in rows {
            let campaign = self.campaign_from_row_data(
                row.id, row.name, row.description, row.objective, row.status,
                row.created_by, row.organization_id, row.created_at, row.updated_at,
                row.scheduled_at, row.started_at, row.completed_at, row.paused_at,
                row.recurrence_config.as_ref(), &row.throttle_config, &row.segmentation,
                row.ab_test_config.as_ref(), row.metrics.as_ref()
            ).await?;
            campaigns.push(campaign);
        }

        Ok(campaigns)
    }

    pub async fn get_campaign(&self, campaign_id: Uuid, organization_id: Uuid) -> Result<Campaign, CampaignError> {
        // Try cache first
        if let Some(campaign) = self.campaigns.get(&campaign_id) {
            if campaign.organization_id == organization_id {
                return Ok(campaign.clone());
            }
        }

        // Fetch from database
        self.load_campaign_from_db(campaign_id, organization_id).await
    }

    pub async fn start_campaign(&self, campaign_id: Uuid, organization_id: Uuid) -> Result<Campaign, CampaignError> {
        let mut campaign = self.get_campaign(campaign_id, organization_id).await?;

        match campaign.status {
            CampaignStatus::Draft | CampaignStatus::Scheduled | CampaignStatus::Paused => {
                campaign.status = CampaignStatus::Running;
                campaign.started_at = Some(Utc::now());
                campaign.paused_at = None;
                campaign.updated_at = Utc::now();

                // Update database
                self.update_campaign_status(&campaign).await?;

                // Update cache
                self.campaigns.insert(campaign_id, campaign.clone());

                // Start message processing
                self.schedule_campaign_messages(&campaign).await?;

                info!("Started campaign: {} ({})", campaign.name, campaign_id);
                Ok(campaign)
            }
            _ => Err(CampaignError::InvalidStatus(format!(
                "Cannot start campaign in {:?} status",
                campaign.status
            ))),
        }
    }

    pub async fn pause_campaign(&self, campaign_id: Uuid, organization_id: Uuid) -> Result<Campaign, CampaignError> {
        let mut campaign = self.get_campaign(campaign_id, organization_id).await?;

        if campaign.status == CampaignStatus::Running {
            campaign.status = CampaignStatus::Paused;
            campaign.paused_at = Some(Utc::now());
            campaign.updated_at = Utc::now();

            // Update database
            self.update_campaign_status(&campaign).await?;

            // Update cache
            self.campaigns.insert(campaign_id, campaign.clone());

            // Cancel queued messages
            self.cancel_queued_messages(campaign_id).await?;

            info!("Paused campaign: {} ({})", campaign.name, campaign_id);
            Ok(campaign)
        } else {
            Err(CampaignError::InvalidStatus(format!(
                "Cannot pause campaign in {:?} status",
                campaign.status
            )))
        }
    }

    pub async fn get_campaign_analytics(
        &self,
        campaign_id: Uuid,
        organization_id: Uuid,
    ) -> Result<CampaignAnalytics, CampaignError> {
        let campaign = self.get_campaign(campaign_id, organization_id).await?;
        
        // Calculate real-time metrics
        let metrics = self.calculate_campaign_metrics(campaign_id).await?;
        let ab_test_results = if campaign.ab_test_config.is_some() {
            Some(self.calculate_ab_test_results(campaign_id).await?)
        } else {
            None
        };
        
        let conversion_funnel = self.calculate_conversion_funnel(campaign_id).await?;
        let performance_by_segment = self.calculate_performance_by_segment(campaign_id).await?;

        Ok(CampaignAnalytics {
            campaign_id,
            campaign_name: campaign.name,
            status: campaign.status,
            created_at: campaign.created_at,
            started_at: campaign.started_at,
            completed_at: campaign.completed_at,
            metrics,
            ab_test_results,
            conversion_funnel,
            performance_by_segment,
        })
    }

    // ===== CONTACT MANAGEMENT =====

    pub async fn import_contacts(
        &self,
        organization_id: Uuid,
        request: ImportContactsRequest,
    ) -> Result<ImportResult, CampaignError> {
        let mut successful_imports = 0;
        let mut failed_imports = 0;
        let mut skipped = 0;
        let mut errors = Vec::new();

        let mut created_group_id = None;

        // Create group if specified
        if let Some(group_name) = &request.group_name {
            created_group_id = Some(self.create_contact_group(organization_id, group_name.clone(), None).await?);
        }

        for (index, contact_data) in request.data.iter().enumerate() {
            let row = (index + 1) as u32;

            match self.import_single_contact(organization_id, contact_data, &request, created_group_id).await {
                Ok(imported) => {
                    if imported {
                        successful_imports += 1;
                    } else {
                        skipped += 1;
                    }
                }
                Err(e) => {
                    failed_imports += 1;
                    errors.push(ImportError {
                        row,
                        phone_number: contact_data.phone_number.clone(),
                        error: e.to_string(),
                    });
                }
            }
        }

        Ok(ImportResult {
            total_processed: request.data.len() as u32,
            successful_imports,
            failed_imports,
            skipped,
            errors,
            created_group_id,
        })
    }

    pub async fn add_tags_to_contacts(
        &self,
        organization_id: Uuid,
        request: AddTagsRequest,
    ) -> Result<u32, CampaignError> {
        let mut updated_count = 0;

        if let Some(contact_ids) = &request.contact_ids {
            for contact_id in contact_ids {
                if self.add_tags_to_contact_by_id(*contact_id, organization_id, &request.tags).await? {
                    updated_count += 1;
                }
            }
        }

        if let Some(phone_numbers) = &request.phone_numbers {
            for phone_number in phone_numbers {
                if self.add_tags_to_contact_by_phone(phone_number, organization_id, &request.tags).await? {
                    updated_count += 1;
                }
            }
        }

        Ok(updated_count)
    }

    // ===== PRIVATE HELPER METHODS =====

    async fn save_campaign_to_db(&self, campaign: &Campaign) -> Result<(), CampaignError> {
        let recurrence_json = match &campaign.recurrence {
            Some(r) => serde_json::to_value(r).map_err(|e| CampaignError::Serialization(e.to_string()))?,
            None => serde_json::Value::Null,
        };

        let throttle_json = serde_json::to_value(&campaign.throttle_config)
            .map_err(|e| CampaignError::Serialization(e.to_string()))?;

        let segmentation_json = serde_json::to_value(&campaign.segmentation)
            .map_err(|e| CampaignError::Serialization(e.to_string()))?;

        let ab_test_json = match &campaign.ab_test_config {
            Some(ab) => serde_json::to_value(ab).map_err(|e| CampaignError::Serialization(e.to_string()))?,
            None => serde_json::Value::Null,
        };

        let metrics_json = serde_json::to_value(&campaign.metrics)
            .map_err(|e| CampaignError::Serialization(e.to_string()))?;

        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            INSERT INTO campaigns (
                id, name, description, objective, status, created_by, organization_id,
                created_at, updated_at, scheduled_at, started_at, completed_at, paused_at,
                recurrence_config, throttle_config, segmentation, ab_test_config, metrics
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                objective = EXCLUDED.objective,
                status = EXCLUDED.status,
                updated_at = EXCLUDED.updated_at,
                scheduled_at = EXCLUDED.scheduled_at,
                started_at = EXCLUDED.started_at,
                completed_at = EXCLUDED.completed_at,
                paused_at = EXCLUDED.paused_at,
                recurrence_config = EXCLUDED.recurrence_config,
                throttle_config = EXCLUDED.throttle_config,
                segmentation = EXCLUDED.segmentation,
                ab_test_config = EXCLUDED.ab_test_config,
                metrics = EXCLUDED.metrics
            "#,
            vec![
                campaign.id.into(),
                campaign.name.clone().into(),
                campaign.description.clone().into(),
                format!("{:?}", campaign.objective).to_lowercase().into(),
                format!("{:?}", campaign.status).to_lowercase().into(),
                campaign.created_by.into(),
                campaign.organization_id.into(),
                campaign.created_at.into(),
                campaign.updated_at.into(),
                campaign.scheduled_at.into(),
                campaign.started_at.into(),
                campaign.completed_at.into(),
                campaign.paused_at.into(),
                recurrence_json.into(),
                throttle_json.into(),
                segmentation_json.into(),
                ab_test_json.into(),
                metrics_json.into(),
            ],
        );

        self.db.execute(stmt).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        // Save templates
        for template in &campaign.templates {
            self.save_template_to_db(campaign.id, template).await?;
        }

        Ok(())
    }

    async fn save_template_to_db(&self, campaign_id: Uuid, template: &MessageTemplate) -> Result<(), CampaignError> {
        let variables_json = serde_json::to_value(&template.variables)
            .map_err(|e| CampaignError::Serialization(e.to_string()))?;

        let buttons_json = match &template.buttons {
            Some(buttons) => serde_json::to_value(buttons).map_err(|e| CampaignError::Serialization(e.to_string()))?,
            None => serde_json::Value::Null,
        };

        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            INSERT INTO message_templates (
                id, campaign_id, name, content, template_type, variables, 
                media_url, media_type, buttons, ab_variant
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                content = EXCLUDED.content,
                template_type = EXCLUDED.template_type,
                variables = EXCLUDED.variables,
                media_url = EXCLUDED.media_url,
                media_type = EXCLUDED.media_type,
                buttons = EXCLUDED.buttons,
                ab_variant = EXCLUDED.ab_variant
            "#,
            vec![
                template.id.into(),
                campaign_id.into(),
                template.name.clone().into(),
                template.content.clone().into(),
                format!("{:?}", template.template_type).to_lowercase().into(),
                variables_json.into(),
                template.media_url.clone().into(),
                template.media_type.clone().into(),
                buttons_json.into(),
                template.ab_variant.clone().into(),
            ],
        );

        self.db.execute(stmt).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        Ok(())
    }

    async fn estimate_recipients(&self, segmentation: &ContactSegmentation, organization_id: Uuid) -> Result<u64, CampaignError> {
        if segmentation.include_all {
            let stmt = Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                "SELECT COUNT(*) as count FROM campaign_contacts WHERE organization_id = $1 AND is_opted_out = false AND is_blacklisted = false",
                vec![organization_id.into()],
            );

            #[derive(FromQueryResult)]
            struct CountResult {
                count: i64,
            }

            let result = CountResult::find_by_statement(stmt).one(&self.db).await
                .map_err(|e| CampaignError::Database(e.to_string()))?;

            Ok(result.map(|r| r.count as u64).unwrap_or(0))
        } else {
            // More complex estimation based on groups, tags, and filters
            // This is a simplified implementation
            Ok(0)
        }
    }

    async fn schedule_campaign_messages(&self, campaign: &Campaign) -> Result<(), CampaignError> {
        // Get target contacts based on segmentation
        let contacts = self.get_campaign_contacts(&campaign.segmentation, campaign.organization_id).await?;
        
        let mut queue = self.message_queue.write().await;
        
        for contact in contacts {
            // Select template (A/B testing logic would go here)
            let template = &campaign.templates[0]; // Simplified selection
            
            let queued_message = QueuedMessage {
                id: Uuid::new_v4(),
                campaign_id: campaign.id,
                contact_id: contact.id,
                template_id: template.id,
                scheduled_at: campaign.scheduled_at.unwrap_or_else(Utc::now),
                status: MessageStatus::Queued,
                retry_count: 0,
                created_at: Utc::now(),
            };
            
            queue.push(queued_message);
        }
        
        info!("Scheduled {} messages for campaign {}", queue.len(), campaign.id);
        Ok(())
    }

    async fn get_campaign_contacts(&self, _segmentation: &ContactSegmentation, organization_id: Uuid) -> Result<Vec<Contact>, CampaignError> {
        // Simplified implementation - get all contacts
        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT * FROM campaign_contacts WHERE organization_id = $1 AND is_opted_out = false AND is_blacklisted = false LIMIT 1000",
            vec![organization_id.into()],
        );

        #[derive(FromQueryResult)]
        struct ContactRow {
            id: Uuid,
            phone_number: String,
            name: Option<String>,
            email: Option<String>,
            organization_id: Uuid,
            groups: serde_json::Value,
            tags: serde_json::Value,
            custom_fields: serde_json::Value,
            timezone: Option<String>,
            is_opted_out: bool,
            is_blacklisted: bool,
            created_at: DateTime<Utc>,
            updated_at: DateTime<Utc>,
            last_interaction: Option<DateTime<Utc>>,
        }

        let rows = ContactRow::find_by_statement(stmt).all(&self.db).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        let mut contacts = Vec::new();
        for row in rows {
            let groups: Vec<String> = serde_json::from_value(row.groups).unwrap_or_default();
            let tags: Vec<String> = serde_json::from_value(row.tags).unwrap_or_default();
            let custom_fields: HashMap<String, String> = serde_json::from_value(row.custom_fields).unwrap_or_default();

            let contact = Contact {
                id: row.id,
                phone_number: row.phone_number,
                name: row.name,
                email: row.email,
                organization_id: row.organization_id,
                groups,
                tags,
                custom_fields,
                timezone: row.timezone,
                is_opted_out: row.is_opted_out,
                is_blacklisted: row.is_blacklisted,
                created_at: row.created_at,
                updated_at: row.updated_at,
                last_interaction: row.last_interaction,
            };
            contacts.push(contact);
        }

        Ok(contacts)
    }

    async fn cancel_queued_messages(&self, campaign_id: Uuid) -> Result<(), CampaignError> {
        let mut queue = self.message_queue.write().await;
        for message in queue.iter_mut() {
            if message.campaign_id == campaign_id && matches!(message.status, MessageStatus::Queued) {
                message.status = MessageStatus::Cancelled;
            }
        }
        Ok(())
    }

    async fn update_campaign_status(&self, campaign: &Campaign) -> Result<(), CampaignError> {
        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "UPDATE campaigns SET status = $1, updated_at = $2, started_at = $3, paused_at = $4, completed_at = $5 WHERE id = $6",
            vec![
                format!("{:?}", campaign.status).to_lowercase().into(),
                campaign.updated_at.into(),
                campaign.started_at.into(),
                campaign.paused_at.into(),
                campaign.completed_at.into(),
                campaign.id.into(),
            ],
        );

        self.db.execute(stmt).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        Ok(())
    }

    async fn campaign_from_row_data(
        &self,
        id: Uuid,
        name: String,
        description: Option<String>,
        objective: String,
        status: String,
        created_by: Uuid,
        organization_id: Uuid,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
        scheduled_at: Option<DateTime<Utc>>,
        started_at: Option<DateTime<Utc>>,
        completed_at: Option<DateTime<Utc>>,
        paused_at: Option<DateTime<Utc>>,
        recurrence_config: Option<&serde_json::Value>,
        throttle_config: &serde_json::Value,
        segmentation: &serde_json::Value,
        ab_test_config: Option<&serde_json::Value>,
        metrics: Option<&serde_json::Value>
    ) -> Result<Campaign, CampaignError> {
        let recurrence: Option<RecurrenceConfig> = match recurrence_config {
            Some(v) if !v.is_null() => serde_json::from_value(v.clone()).ok(),
            _ => None,
        };

        let throttle_config_parsed: ThrottleConfig = serde_json::from_value(throttle_config.clone())
            .map_err(|e| CampaignError::Deserialization(e.to_string()))?;

        let segmentation_parsed: ContactSegmentation = serde_json::from_value(segmentation.clone())
            .map_err(|e| CampaignError::Deserialization(e.to_string()))?;

        let ab_test_config_parsed: Option<ABTestConfig> = match ab_test_config {
            Some(v) if !v.is_null() => serde_json::from_value(v.clone()).ok(),
            _ => None,
        };

        let metrics_parsed: CampaignMetrics = match metrics {
            Some(v) => serde_json::from_value(v.clone()).unwrap_or_default(),
            None => CampaignMetrics::default(),
        };

        // Load templates
        let templates = self.load_campaign_templates(id).await?;

        let objective_enum = match objective.as_str() {
            "engagement" => CampaignObjective::Engagement,
            "conversions" => CampaignObjective::Conversions,
            "retention" => CampaignObjective::Retention,
            "acquisition" => CampaignObjective::Acquisition,
            "informational" => CampaignObjective::Informational,
            "promotional" => CampaignObjective::Promotional,
            "survey" => CampaignObjective::Survey,
            "announcement" => CampaignObjective::Announcement,
            _ => CampaignObjective::Engagement,
        };

        let status_enum = match status.as_str() {
            "draft" => CampaignStatus::Draft,
            "scheduled" => CampaignStatus::Scheduled,
            "running" => CampaignStatus::Running,
            "paused" => CampaignStatus::Paused,
            "completed" => CampaignStatus::Completed,
            "cancelled" => CampaignStatus::Cancelled,
            "failed" => CampaignStatus::Failed,
            _ => CampaignStatus::Draft,
        };

        Ok(Campaign {
            id,
            name,
            description: description.unwrap_or_default(),
            objective: objective_enum,
            status: status_enum,
            created_by,
            organization_id,
            created_at,
            updated_at,
            scheduled_at,
            started_at,
            completed_at,
            paused_at,
            recurrence,
            throttle_config: throttle_config_parsed,
            segmentation: segmentation_parsed,
            templates,
            ab_test_config: ab_test_config_parsed,
            metrics: metrics_parsed,
        })
    }

    async fn load_campaign_templates(&self, campaign_id: Uuid) -> Result<Vec<MessageTemplate>, CampaignError> {
        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT * FROM message_templates WHERE campaign_id = $1 ORDER BY created_at",
            vec![campaign_id.into()],
        );

        #[derive(FromQueryResult)]
        struct TemplateRow {
            id: Uuid,
            name: String,
            content: String,
            template_type: String,
            variables: serde_json::Value,
            media_url: Option<String>,
            media_type: Option<String>,
            buttons: Option<serde_json::Value>,
            ab_variant: Option<String>,
        }

        let rows = TemplateRow::find_by_statement(stmt).all(&self.db).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        let mut templates = Vec::new();
        for row in rows {
            let variables: Vec<String> = serde_json::from_value(row.variables).unwrap_or_default();
            let buttons: Option<Vec<MessageButton>> = match row.buttons {
                Some(v) if !v.is_null() => serde_json::from_value(v).ok(),
                _ => None,
            };

            let template_type = match row.template_type.as_str() {
                "text" => MessageTemplateType::Text,
                "image" => MessageTemplateType::Image,
                "video" => MessageTemplateType::Video,
                "document" => MessageTemplateType::Document,
                "audio" => MessageTemplateType::Audio,
                "location" => MessageTemplateType::Location,
                "template" => MessageTemplateType::Template,
                "interactive" => MessageTemplateType::Interactive,
                _ => MessageTemplateType::Text,
            };

            let template = MessageTemplate {
                id: row.id,
                name: row.name,
                content: row.content,
                template_type,
                variables,
                media_url: row.media_url,
                media_type: row.media_type,
                buttons,
                ab_variant: row.ab_variant,
            };
            templates.push(template);
        }

        Ok(templates)
    }

    async fn load_campaign_from_db(&self, campaign_id: Uuid, organization_id: Uuid) -> Result<Campaign, CampaignError> {
        #[derive(FromQueryResult)]
        struct CampaignRow {
            id: Uuid,
            name: String,
            description: Option<String>,
            objective: String,
            status: String,
            created_by: Uuid,
            organization_id: Uuid,
            created_at: DateTime<Utc>,
            updated_at: DateTime<Utc>,
            scheduled_at: Option<DateTime<Utc>>,
            started_at: Option<DateTime<Utc>>,
            completed_at: Option<DateTime<Utc>>,
            paused_at: Option<DateTime<Utc>>,
            recurrence_config: Option<serde_json::Value>,
            throttle_config: serde_json::Value,
            segmentation: serde_json::Value,
            ab_test_config: Option<serde_json::Value>,
            metrics: Option<serde_json::Value>,
        }

        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT * FROM campaigns WHERE id = $1 AND organization_id = $2",
            vec![campaign_id.into(), organization_id.into()],
        );

        let row = CampaignRow::find_by_statement(stmt).one(&self.db).await
            .map_err(|e| CampaignError::Database(e.to_string()))?
            .ok_or(CampaignError::NotFound)?;

        let campaign = self.campaign_from_row_data(
            row.id, row.name, row.description, row.objective, row.status,
            row.created_by, row.organization_id, row.created_at, row.updated_at,
            row.scheduled_at, row.started_at, row.completed_at, row.paused_at,
            row.recurrence_config.as_ref(), &row.throttle_config, &row.segmentation,
            row.ab_test_config.as_ref(), row.metrics.as_ref()
        ).await?;
        
        // Cache it
        self.campaigns.insert(campaign_id, campaign.clone());

        Ok(campaign)
    }

    async fn calculate_campaign_metrics(&self, _campaign_id: Uuid) -> Result<CampaignMetrics, CampaignError> {
        // This would calculate real-time metrics from campaign_messages table
        // Simplified implementation returns default metrics
        Ok(CampaignMetrics::default())
    }

    async fn calculate_ab_test_results(&self, _campaign_id: Uuid) -> Result<ABTestResults, CampaignError> {
        // Simplified implementation
        Ok(ABTestResults {
            test_status: ABTestStatus::Running,
            winning_variant: None,
            confidence_level: 0.0,
            variants_performance: HashMap::new(),
        })
    }

    async fn calculate_conversion_funnel(&self, _campaign_id: Uuid) -> Result<ConversionFunnel, CampaignError> {
        // Simplified implementation
        Ok(ConversionFunnel {
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            converted: 0,
            stages: Vec::new(),
        })
    }

    async fn calculate_performance_by_segment(&self, _campaign_id: Uuid) -> Result<HashMap<String, CampaignMetrics>, CampaignError> {
        // Simplified implementation
        Ok(HashMap::new())
    }

    async fn import_single_contact(
        &self,
        organization_id: Uuid,
        contact_data: &ImportContactData,
        request: &ImportContactsRequest,
        group_id: Option<Uuid>,
    ) -> Result<bool, CampaignError> {
        // Check if contact already exists
        let existing_contact = self.find_contact_by_phone(&contact_data.phone_number, organization_id).await?;

        match request.merge_strategy {
            MergeStrategy::Skip => {
                if existing_contact.is_some() {
                    return Ok(false); // Skipped
                }
            }
            MergeStrategy::Update | MergeStrategy::Replace => {
                // Continue with insert/update
            }
        }

        let contact_id = existing_contact
            .map(|c| c.id)
            .unwrap_or_else(Uuid::new_v4);

        let mut groups = Vec::new();
        if let Some(gid) = group_id {
            groups.push(gid.to_string());
        }

        let tags = request.tags.clone().unwrap_or_default();
        let custom_fields = contact_data.custom_fields.clone().unwrap_or_default();

        let groups_json = serde_json::to_value(&groups)
            .map_err(|e| CampaignError::Serialization(e.to_string()))?;
        let tags_json = serde_json::to_value(&tags)
            .map_err(|e| CampaignError::Serialization(e.to_string()))?;
        let custom_fields_json = serde_json::to_value(&custom_fields)
            .map_err(|e| CampaignError::Serialization(e.to_string()))?;

        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            INSERT INTO campaign_contacts (
                id, phone_number, name, email, organization_id, groups, tags, 
                custom_fields, timezone, is_opted_out, is_blacklisted
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, false)
            ON CONFLICT (phone_number, organization_id) DO UPDATE SET
                name = COALESCE(EXCLUDED.name, campaign_contacts.name),
                email = COALESCE(EXCLUDED.email, campaign_contacts.email),
                groups = EXCLUDED.groups,
                tags = EXCLUDED.tags,
                custom_fields = EXCLUDED.custom_fields,
                timezone = COALESCE(EXCLUDED.timezone, campaign_contacts.timezone),
                updated_at = NOW()
            "#,
            vec![
                contact_id.into(),
                contact_data.phone_number.clone().into(),
                contact_data.name.clone().into(),
                contact_data.email.clone().into(),
                organization_id.into(),
                groups_json.into(),
                tags_json.into(),
                custom_fields_json.into(),
                contact_data.timezone.clone().into(),
            ],
        );

        self.db.execute(stmt).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        Ok(true)
    }

    async fn find_contact_by_phone(&self, phone_number: &str, organization_id: Uuid) -> Result<Option<Contact>, CampaignError> {
        #[derive(FromQueryResult)]
        struct ContactRow {
            id: Uuid,
            phone_number: String,
            name: Option<String>,
            email: Option<String>,
            organization_id: Uuid,
            groups: serde_json::Value,
            tags: serde_json::Value,
            custom_fields: serde_json::Value,
            timezone: Option<String>,
            is_opted_out: bool,
            is_blacklisted: bool,
            created_at: DateTime<Utc>,
            updated_at: DateTime<Utc>,
            last_interaction: Option<DateTime<Utc>>,
        }

        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT * FROM campaign_contacts WHERE phone_number = $1 AND organization_id = $2",
            vec![phone_number.into(), organization_id.into()],
        );

        let row = ContactRow::find_by_statement(stmt).one(&self.db).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        if let Some(row) = row {
            let groups: Vec<String> = serde_json::from_value(row.groups).unwrap_or_default();
            let tags: Vec<String> = serde_json::from_value(row.tags).unwrap_or_default();
            let custom_fields: HashMap<String, String> = serde_json::from_value(row.custom_fields).unwrap_or_default();

            Ok(Some(Contact {
                id: row.id,
                phone_number: row.phone_number,
                name: row.name,
                email: row.email,
                organization_id: row.organization_id,
                groups,
                tags,
                custom_fields,
                timezone: row.timezone,
                is_opted_out: row.is_opted_out,
                is_blacklisted: row.is_blacklisted,
                created_at: row.created_at,
                updated_at: row.updated_at,
                last_interaction: row.last_interaction,
            }))
        } else {
            Ok(None)
        }
    }

    async fn create_contact_group(&self, organization_id: Uuid, name: String, description: Option<String>) -> Result<Uuid, CampaignError> {
        let group_id = Uuid::new_v4();

        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            r#"
            INSERT INTO campaign_contact_groups (id, name, description, organization_id)
            VALUES ($1, $2, $3, $4)
            "#,
            vec![
                group_id.into(),
                name.into(),
                description.into(),
                organization_id.into(),
            ],
        );

        self.db.execute(stmt).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        Ok(group_id)
    }

    async fn add_tags_to_contact_by_id(&self, contact_id: Uuid, organization_id: Uuid, new_tags: &[String]) -> Result<bool, CampaignError> {
        // Get current tags
        let stmt = Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT tags FROM campaign_contacts WHERE id = $1 AND organization_id = $2",
            vec![contact_id.into(), organization_id.into()],
        );

        #[derive(FromQueryResult)]
        struct TagsRow {
            tags: serde_json::Value,
        }

        let row = TagsRow::find_by_statement(stmt).one(&self.db).await
            .map_err(|e| CampaignError::Database(e.to_string()))?;

        if let Some(row) = row {
            let mut current_tags: Vec<String> = serde_json::from_value(row.tags).unwrap_or_default();
            
            // Add new tags (avoid duplicates)
            for tag in new_tags {
                if !current_tags.contains(tag) {
                    current_tags.push(tag.clone());
                }
            }

            let tags_json = serde_json::to_value(&current_tags)
                .map_err(|e| CampaignError::Serialization(e.to_string()))?;

            // Update contact
            let update_stmt = Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                "UPDATE campaign_contacts SET tags = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3",
                vec![tags_json.into(), contact_id.into(), organization_id.into()],
            );

            self.db.execute(update_stmt).await
                .map_err(|e| CampaignError::Database(e.to_string()))?;

            Ok(true)
        } else {
            Ok(false)
        }
    }

    async fn add_tags_to_contact_by_phone(&self, phone_number: &str, organization_id: Uuid, new_tags: &[String]) -> Result<bool, CampaignError> {
        if let Some(contact) = self.find_contact_by_phone(phone_number, organization_id).await? {
            self.add_tags_to_contact_by_id(contact.id, organization_id, new_tags).await
        } else {
            Ok(false)
        }
    }
}

// Default implementations
impl Default for CampaignMetrics {
    fn default() -> Self {
        Self {
            total_recipients: 0,
            messages_sent: 0,
            messages_delivered: 0,
            messages_read: 0,
            messages_failed: 0,
            clicks: 0,
            conversions: 0,
            unsubscribes: 0,
            complaints: 0,
            delivery_rate: 0.0,
            open_rate: 0.0,
            click_through_rate: 0.0,
            conversion_rate: 0.0,
            engagement_rate: 0.0,
            cost_per_conversion: None,
            roi: None,
            hourly_stats: HashMap::new(),
            daily_stats: HashMap::new(),
        }
    }
}

impl Default for ThrottleConfig {
    fn default() -> Self {
        Self {
            messages_per_minute: 10,
            messages_per_hour: 600,
            messages_per_day: 10000,
            delay_between_messages_ms: 1000,
            respect_business_hours: false,
            business_hours_start: None,
            business_hours_end: None,
            timezone_per_contact: false,
        }
    }
}

// ===== ERROR HANDLING =====

#[derive(Debug, thiserror::Error)]
pub enum CampaignError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Campaign not found")]
    NotFound,
    #[error("Invalid campaign status: {0}")]
    InvalidStatus(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Deserialization error: {0}")]
    Deserialization(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Contact already exists")]
    ContactAlreadyExists,
    #[error("Insufficient permissions")]
    Unauthorized,
}

// This trait and implementation were causing compilation issues, removed in favor of direct conversion

// ===== HTTP HANDLERS =====

/// Create a new campaign
/// 
/// Creates a new marketing campaign with specified configuration
#[utoipa::path(
    post,
    path = "/api/v1/campaigns",
    tag = "Campaigns",
    request_body = CreateCampaignRequest,
    responses(
        (status = 201, description = "Campaign created successfully", body = Campaign),
        (status = 400, description = "Invalid request data"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer" = []))
)]
pub async fn create_campaign(
    campaign_manager: web::Data<Arc<CampaignManager>>,
    request: web::Json<CreateCampaignRequest>,
) -> Result<HttpResponse> {
    // In a real implementation, extract user_id and organization_id from JWT token
    let user_id = Uuid::new_v4(); // Placeholder
    let organization_id = Uuid::new_v4(); // Placeholder

    match campaign_manager.create_campaign(user_id, organization_id, request.into_inner()).await {
        Ok(campaign) => {
            info!("Campaign created successfully: {}", campaign.id);
            Ok(HttpResponse::Created().json(campaign))
        }
        Err(e) => {
            error!("Failed to create campaign: {}", e);
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Failed to create campaign",
                "message": e.to_string()
            })))
        }
    }
}

/// List campaigns
/// 
/// Retrieves a list of campaigns with optional filtering
#[utoipa::path(
    get,
    path = "/api/v1/campaigns",
    tag = "Campaigns",
    params(
        ("status" = Option<CampaignStatus>, Query, description = "Filter by campaign status"),
        ("objective" = Option<CampaignObjective>, Query, description = "Filter by campaign objective"),
        ("created_after" = Option<String>, Query, description = "Filter campaigns created after date (ISO 8601)"),
        ("created_before" = Option<String>, Query, description = "Filter campaigns created before date (ISO 8601)"),
        ("page" = Option<u32>, Query, description = "Page number (0-based)"),
        ("limit" = Option<u32>, Query, description = "Number of items per page (max 100)"),
        ("sort_by" = Option<String>, Query, description = "Sort field"),
        ("sort_order" = Option<String>, Query, description = "Sort order (ASC/DESC)")
    ),
    responses(
        (status = 200, description = "List of campaigns", body = Vec<Campaign>),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer" = []))
)]
pub async fn list_campaigns(
    campaign_manager: web::Data<Arc<CampaignManager>>,
    query: web::Query<ListCampaignsQuery>,
) -> Result<HttpResponse> {
    // In a real implementation, extract organization_id from JWT token
    let organization_id = Uuid::new_v4(); // Placeholder

    match campaign_manager.list_campaigns(organization_id, query.into_inner()).await {
        Ok(campaigns) => Ok(HttpResponse::Ok().json(campaigns)),
        Err(e) => {
            error!("Failed to list campaigns: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list campaigns",
                "message": e.to_string()
            })))
        }
    }
}

/// Start a campaign
/// 
/// Starts a campaign and begins message delivery
#[utoipa::path(
    post,
    path = "/api/v1/campaigns/{id}/start",
    tag = "Campaigns",
    params(
        ("id" = Uuid, Path, description = "Campaign ID")
    ),
    responses(
        (status = 200, description = "Campaign started successfully", body = Campaign),
        (status = 404, description = "Campaign not found"),
        (status = 400, description = "Cannot start campaign in current status"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer" = []))
)]
pub async fn start_campaign(
    campaign_manager: web::Data<Arc<CampaignManager>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    // In a real implementation, extract organization_id from JWT token
    let organization_id = Uuid::new_v4(); // Placeholder

    match campaign_manager.start_campaign(campaign_id, organization_id).await {
        Ok(campaign) => {
            info!("Campaign started successfully: {}", campaign_id);
            Ok(HttpResponse::Ok().json(campaign))
        }
        Err(CampaignError::NotFound) => {
            Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Campaign not found"
            })))
        }
        Err(CampaignError::InvalidStatus(msg)) => {
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Cannot start campaign",
                "message": msg
            })))
        }
        Err(e) => {
            error!("Failed to start campaign {}: {}", campaign_id, e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to start campaign",
                "message": e.to_string()
            })))
        }
    }
}

/// Pause a campaign
/// 
/// Pauses a running campaign
#[utoipa::path(
    post,
    path = "/api/v1/campaigns/{id}/pause",
    tag = "Campaigns",
    params(
        ("id" = Uuid, Path, description = "Campaign ID")
    ),
    responses(
        (status = 200, description = "Campaign paused successfully", body = Campaign),
        (status = 404, description = "Campaign not found"),
        (status = 400, description = "Cannot pause campaign in current status"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer" = []))
)]
pub async fn pause_campaign(
    campaign_manager: web::Data<Arc<CampaignManager>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    // In a real implementation, extract organization_id from JWT token
    let organization_id = Uuid::new_v4(); // Placeholder

    match campaign_manager.pause_campaign(campaign_id, organization_id).await {
        Ok(campaign) => {
            info!("Campaign paused successfully: {}", campaign_id);
            Ok(HttpResponse::Ok().json(campaign))
        }
        Err(CampaignError::NotFound) => {
            Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Campaign not found"
            })))
        }
        Err(CampaignError::InvalidStatus(msg)) => {
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Cannot pause campaign",
                "message": msg
            })))
        }
        Err(e) => {
            error!("Failed to pause campaign {}: {}", campaign_id, e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to pause campaign",
                "message": e.to_string()
            })))
        }
    }
}

/// Get campaign analytics
/// 
/// Retrieves detailed analytics and performance metrics for a campaign
#[utoipa::path(
    get,
    path = "/api/v1/campaigns/{id}/analytics",
    tag = "Campaigns",
    params(
        ("id" = Uuid, Path, description = "Campaign ID")
    ),
    responses(
        (status = 200, description = "Campaign analytics", body = CampaignAnalytics),
        (status = 404, description = "Campaign not found"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer" = []))
)]
pub async fn get_campaign_analytics(
    campaign_manager: web::Data<Arc<CampaignManager>>,
    path: web::Path<Uuid>,
) -> Result<HttpResponse> {
    let campaign_id = path.into_inner();
    // In a real implementation, extract organization_id from JWT token
    let organization_id = Uuid::new_v4(); // Placeholder

    match campaign_manager.get_campaign_analytics(campaign_id, organization_id).await {
        Ok(analytics) => Ok(HttpResponse::Ok().json(analytics)),
        Err(CampaignError::NotFound) => {
            Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Campaign not found"
            })))
        }
        Err(e) => {
            error!("Failed to get campaign analytics for {}: {}", campaign_id, e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get campaign analytics",
                "message": e.to_string()
            })))
        }
    }
}

/// Import contacts
/// 
/// Imports contacts in bulk from various sources
#[utoipa::path(
    post,
    path = "/api/v1/contacts/import",
    tag = "Contacts",
    request_body = ImportContactsRequest,
    responses(
        (status = 200, description = "Contacts imported successfully", body = ImportResult),
        (status = 400, description = "Invalid request data"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer" = []))
)]
pub async fn import_contacts(
    campaign_manager: web::Data<Arc<CampaignManager>>,
    request: web::Json<ImportContactsRequest>,
) -> Result<HttpResponse> {
    // In a real implementation, extract organization_id from JWT token
    let organization_id = Uuid::new_v4(); // Placeholder

    match campaign_manager.import_contacts(organization_id, request.into_inner()).await {
        Ok(result) => {
            info!("Contacts import completed: {} successful, {} failed", 
                  result.successful_imports, result.failed_imports);
            Ok(HttpResponse::Ok().json(result))
        }
        Err(e) => {
            error!("Failed to import contacts: {}", e);
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Failed to import contacts",
                "message": e.to_string()
            })))
        }
    }
}

/// Add tags to contacts
/// 
/// Adds tags to multiple contacts by ID or phone number
#[utoipa::path(
    post,
    path = "/api/v1/contacts/tags",
    tag = "Contacts",
    request_body = AddTagsRequest,
    responses(
        (status = 200, description = "Tags added successfully", body = u32),
        (status = 400, description = "Invalid request data"),
        (status = 401, description = "Unauthorized")
    ),
    security(("bearer" = []))
)]
pub async fn add_tags_to_contacts(
    campaign_manager: web::Data<Arc<CampaignManager>>,
    request: web::Json<AddTagsRequest>,
) -> Result<HttpResponse> {
    // In a real implementation, extract organization_id from JWT token
    let organization_id = Uuid::new_v4(); // Placeholder

    match campaign_manager.add_tags_to_contacts(organization_id, request.into_inner()).await {
        Ok(updated_count) => {
            info!("Added tags to {} contacts", updated_count);
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "updated_contacts": updated_count
            })))
        }
        Err(e) => {
            error!("Failed to add tags to contacts: {}", e);
            Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Failed to add tags to contacts",
                "message": e.to_string()
            })))
        }
    }
}

/// Configure campaign routes
pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/campaigns")
            .route("", web::post().to(create_campaign))
            .route("", web::get().to(list_campaigns))
            .route("/{id}/start", web::post().to(start_campaign))
            .route("/{id}/pause", web::post().to(pause_campaign))
            .route("/{id}/analytics", web::get().to(get_campaign_analytics))
    )
    .service(
        web::scope("/contacts")
            .route("/import", web::post().to(import_contacts))
            .route("/tags", web::post().to(add_tags_to_contacts))
    );
}