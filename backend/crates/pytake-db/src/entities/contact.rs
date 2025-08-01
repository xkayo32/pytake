//! Contact entity

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "contacts")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    
    // Phone number (unique identifier)
    pub phone_number: String,
    
    // WhatsApp info
    pub whatsapp_id: Option<String>,
    pub has_whatsapp: bool,
    pub whatsapp_verified_at: Option<DateTimeUtc>,
    
    // Profile info
    pub name: Option<String>,
    pub profile_picture_url: Option<String>,
    pub status_message: Option<String>,
    
    // Business info (if business account)
    pub is_business: bool,
    pub business_name: Option<String>,
    pub business_description: Option<String>,
    pub business_category: Option<String>,
    pub business_verified: Option<bool>,
    
    // Contact metadata
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub metadata: Json,
    
    // Sync info
    pub last_synced_at: Option<DateTimeUtc>,
    pub sync_status: Option<String>,
    pub sync_error: Option<String>,
    
    // Timestamps
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

// Sync status enum
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SyncStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

impl SyncStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

impl Model {
    /// Get sync status enum
    pub fn sync_status_enum(&self) -> Option<SyncStatus> {
        self.sync_status.as_ref()
            .and_then(|s| SyncStatus::from_str(s))
    }
    
    /// Check if contact needs sync
    pub fn needs_sync(&self) -> bool {
        match self.sync_status.as_deref() {
            Some("failed") | Some("pending") => true,
            Some("completed") => {
                // Re-sync if last sync was more than 7 days ago
                if let Some(last_sync) = self.last_synced_at {
                    let days_since_sync = (chrono::Utc::now() - last_sync).num_days();
                    days_since_sync > 7
                } else {
                    true
                }
            }
            _ => true,
        }
    }
    
    /// Get display name
    pub fn display_name(&self) -> &str {
        self.name.as_deref()
            .or(self.business_name.as_deref())
            .unwrap_or(&self.phone_number)
    }
    
    /// Check if contact is verified business
    pub fn is_verified_business(&self) -> bool {
        self.is_business && self.business_verified.unwrap_or(false)
    }
}