//! Contact repository

use crate::entities::contact;
use crate::error::{DatabaseError, Result};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, 
    QueryFilter, QueryOrder, PaginatorTrait, Set, TransactionTrait
};
use uuid::Uuid;

/// Repository for managing contacts
pub struct ContactRepository<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> ContactRepository<'a> {
    /// Create a new contact repository
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    /// Create or update a contact
    pub async fn upsert(&self, phone: String, name: Option<String>) -> Result<contact::Model> {
        let existing = self.find_by_phone(&phone).await?;
        
        match existing {
            Some(mut contact) => {
                // Update existing contact
                let mut active: contact::ActiveModel = contact.clone().into();
                
                if let Some(n) = name {
                    if contact.name.is_none() || contact.name.as_ref() != Some(&n) {
                        active.name = Set(Some(n));
                        active.updated_at = Set(chrono::Utc::now());
                    }
                }
                
                active.update(self.db).await
                    .map_err(|e| DatabaseError::Query(e.to_string()))
            }
            None => {
                // Create new contact
                let contact = contact::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    phone_number: Set(phone),
                    whatsapp_id: Set(None),
                    has_whatsapp: Set(false),
                    whatsapp_verified_at: Set(None),
                    name: Set(name),
                    profile_picture_url: Set(None),
                    status_message: Set(None),
                    is_business: Set(false),
                    business_name: Set(None),
                    business_description: Set(None),
                    business_category: Set(None),
                    business_verified: Set(None),
                    tags: Set(vec![]),
                    notes: Set(None),
                    metadata: Set(serde_json::json!({})),
                    last_synced_at: Set(None),
                    sync_status: Set(Some("pending".to_string())),
                    sync_error: Set(None),
                    created_at: Set(chrono::Utc::now()),
                    updated_at: Set(chrono::Utc::now()),
                };

                contact.insert(self.db).await
                    .map_err(|e| DatabaseError::Query(e.to_string()))
            }
        }
    }

    /// Find contact by ID
    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<contact::Model>> {
        contact::Entity::find_by_id(id)
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Find contact by phone number
    pub async fn find_by_phone(&self, phone: &str) -> Result<Option<contact::Model>> {
        contact::Entity::find()
            .filter(contact::Column::PhoneNumber.eq(phone))
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Find contact by WhatsApp ID
    pub async fn find_by_whatsapp_id(&self, whatsapp_id: &str) -> Result<Option<contact::Model>> {
        contact::Entity::find()
            .filter(contact::Column::WhatsappId.eq(whatsapp_id))
            .one(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Get contacts that need sync
    pub async fn get_pending_sync(&self, limit: u64) -> Result<Vec<contact::Model>> {
        contact::Entity::find()
            .filter(
                contact::Column::SyncStatus.eq("pending")
                    .or(contact::Column::SyncStatus.eq("failed"))
            )
            .order_by_asc(contact::Column::LastSyncedAt)
            .limit(limit)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Get contacts for re-sync (last synced > 7 days ago)
    pub async fn get_stale_contacts(&self, limit: u64) -> Result<Vec<contact::Model>> {
        let seven_days_ago = chrono::Utc::now() - chrono::Duration::days(7);
        
        contact::Entity::find()
            .filter(contact::Column::SyncStatus.eq("completed"))
            .filter(contact::Column::LastSyncedAt.lt(seven_days_ago))
            .order_by_asc(contact::Column::LastSyncedAt)
            .limit(limit)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Update WhatsApp verification info
    pub async fn update_whatsapp_info(
        &self,
        phone: &str,
        whatsapp_id: Option<String>,
        has_whatsapp: bool,
        profile: Option<WhatsAppProfile>,
    ) -> Result<contact::Model> {
        let mut contact: contact::ActiveModel = match self.find_by_phone(phone).await? {
            Some(c) => c.into(),
            None => {
                // Create if doesn't exist
                return self.upsert(phone.to_string(), None).await;
            }
        };

        contact.whatsapp_id = Set(whatsapp_id);
        contact.has_whatsapp = Set(has_whatsapp);
        contact.whatsapp_verified_at = Set(Some(chrono::Utc::now()));
        contact.sync_status = Set(Some("completed".to_string()));
        contact.last_synced_at = Set(Some(chrono::Utc::now()));
        contact.sync_error = Set(None);

        if let Some(profile) = profile {
            if let Some(name) = profile.name {
                contact.name = Set(Some(name));
            }
            if let Some(picture) = profile.profile_picture_url {
                contact.profile_picture_url = Set(Some(picture));
            }
            if let Some(status) = profile.status_message {
                contact.status_message = Set(Some(status));
            }
            contact.is_business = Set(profile.is_business);
            if let Some(business) = profile.business {
                contact.business_name = Set(business.name);
                contact.business_description = Set(business.description);
                contact.business_category = Set(business.category);
                contact.business_verified = Set(business.verified);
            }
        }

        contact.updated_at = Set(chrono::Utc::now());

        contact.update(self.db).await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Mark sync as failed
    pub async fn mark_sync_failed(&self, phone: &str, error: &str) -> Result<()> {
        if let Some(contact) = self.find_by_phone(phone).await? {
            let mut active: contact::ActiveModel = contact.into();
            active.sync_status = Set(Some("failed".to_string()));
            active.sync_error = Set(Some(error.to_string()));
            active.updated_at = Set(chrono::Utc::now());
            
            active.update(self.db).await
                .map_err(|e| DatabaseError::Query(e.to_string()))?;
        }
        Ok(())
    }

    /// Batch verify contacts
    pub async fn batch_verify(&self, results: Vec<ContactVerifyResult>) -> Result<Vec<contact::Model>> {
        let tx = self.db.begin().await
            .map_err(|e| DatabaseError::Transaction(e.to_string()))?;

        let mut updated_contacts = Vec::new();

        for result in results {
            match self.update_whatsapp_info(
                &result.phone_number,
                result.whatsapp_id,
                result.has_whatsapp,
                result.profile,
            ).await {
                Ok(contact) => updated_contacts.push(contact),
                Err(e) => {
                    // Log error but continue with other contacts
                    tracing::error!("Failed to update contact {}: {}", result.phone_number, e);
                }
            }
        }

        tx.commit().await
            .map_err(|e| DatabaseError::Transaction(e.to_string()))?;

        Ok(updated_contacts)
    }

    /// Get all contacts with WhatsApp
    pub async fn get_whatsapp_contacts(&self, limit: u64, offset: u64) -> Result<Vec<contact::Model>> {
        contact::Entity::find()
            .filter(contact::Column::HasWhatsapp.eq(true))
            .order_by_desc(contact::Column::UpdatedAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Search contacts
    pub async fn search(&self, query: &str, limit: u64, offset: u64) -> Result<Vec<contact::Model>> {
        contact::Entity::find()
            .filter(
                contact::Column::PhoneNumber.contains(query)
                    .or(contact::Column::Name.contains(query))
                    .or(contact::Column::BusinessName.contains(query))
            )
            .order_by_desc(contact::Column::UpdatedAt)
            .limit(limit)
            .offset(offset)
            .all(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Count contacts
    pub async fn count_total(&self) -> Result<u64> {
        contact::Entity::find()
            .count(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }

    /// Count WhatsApp contacts
    pub async fn count_whatsapp(&self) -> Result<u64> {
        contact::Entity::find()
            .filter(contact::Column::HasWhatsapp.eq(true))
            .count(self.db)
            .await
            .map_err(|e| DatabaseError::Query(e.to_string()))
    }
}

/// WhatsApp profile information
#[derive(Debug, Clone)]
pub struct WhatsAppProfile {
    pub name: Option<String>,
    pub profile_picture_url: Option<String>,
    pub status_message: Option<String>,
    pub is_business: bool,
    pub business: Option<BusinessInfo>,
}

/// Business information
#[derive(Debug, Clone)]
pub struct BusinessInfo {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub verified: Option<bool>,
}

/// Contact verification result
#[derive(Debug, Clone)]
pub struct ContactVerifyResult {
    pub phone_number: String,
    pub whatsapp_id: Option<String>,
    pub has_whatsapp: bool,
    pub profile: Option<WhatsAppProfile>,
}