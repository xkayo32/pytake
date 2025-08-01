//! Contact synchronization service

use crate::errors::{CoreError, CoreResult};
use crate::queue::{MessageQueue, JobType, QueueJob};
// Contact verification types moved to core to avoid cyclic dependency
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContactVerifyResult {
    pub phone_number: String,
    pub whatsapp_id: Option<String>,
    pub has_whatsapp: bool,
    pub profile: Option<WhatsAppProfile>,
}

/// WhatsApp profile information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatsAppProfile {
    pub name: Option<String>,
    pub profile_picture_url: Option<String>,
    pub status_message: Option<String>,
    pub is_business: bool,
    pub business: Option<BusinessInfo>,
}

/// Business information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessInfo {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub verified: Option<bool>,
}
use pytake_whatsapp::client::WhatsAppClient;
use pytake_whatsapp::types::{ContactInfo, ContactStatus};
use std::sync::Arc;
use tracing::{info, error, debug, warn};

/// Contact synchronization service
pub struct ContactSyncService {
    whatsapp_client: Arc<WhatsAppClient>,
    queue: Arc<dyn MessageQueue>,
}

impl ContactSyncService {
    /// Create new contact sync service
    pub fn new(
        whatsapp_client: Arc<WhatsAppClient>,
        queue: Arc<dyn MessageQueue>,
    ) -> Self {
        Self {
            whatsapp_client,
            queue,
        }
    }

    /// Process contact sync job
    pub async fn process_sync_job(&self, phone_numbers: Vec<String>) -> CoreResult<()> {
        if phone_numbers.is_empty() {
            return Ok(());
        }

        info!("Starting contact sync for {} numbers", phone_numbers.len());

        // Verify contacts with WhatsApp
        match self.whatsapp_client.batch_verify_contacts(phone_numbers.clone()).await {
            Ok(results) => {
                // Process verification results
                let verify_results = self.process_verification_results(results).await?;
                
                // Queue update job
                let job = JobType::UpdateContactsInfo {
                    results: verify_results,
                };
                
                self.queue.enqueue(QueueJob::new(job)).await?;
                
                info!("Contact sync completed successfully");
                Ok(())
            }
            Err(e) => {
                error!("Failed to verify contacts: {}", e);
                
                // Queue retry for failed contacts
                for phone in phone_numbers {
                    let job = JobType::SyncContactFailed {
                        phone_number: phone,
                        error: e.to_string(),
                    };
                    self.queue.enqueue(QueueJob::new(job)).await?;
                }
                
                Err(CoreError::WhatsAppApi(e.to_string()))
            }
        }
    }

    /// Process single contact sync
    pub async fn sync_single_contact(&self, phone_number: &str) -> CoreResult<ContactVerifyResult> {
        debug!("Syncing single contact: {}", phone_number);

        match self.whatsapp_client.verify_contact(phone_number).await {
            Ok(info) => {
                let profile = if info.status == ContactStatus::Valid {
                    // Try to get additional profile info
                    self.fetch_contact_profile(&info.wa_id).await
                } else {
                    None
                };

                Ok(ContactVerifyResult {
                    phone_number: phone_number.to_string(),
                    whatsapp_id: if info.status == ContactStatus::Valid {
                        Some(info.wa_id)
                    } else {
                        None
                    },
                    has_whatsapp: info.status == ContactStatus::Valid,
                    profile,
                })
            }
            Err(e) => {
                error!("Failed to verify contact {}: {}", phone_number, e);
                Err(CoreError::WhatsAppApi(e.to_string()))
            }
        }
    }

    /// Process verification results
    async fn process_verification_results(
        &self,
        results: Vec<ContactInfo>,
    ) -> CoreResult<Vec<ContactVerifyResult>> {
        let mut verify_results = Vec::new();

        for info in results {
            let profile = if info.status == ContactStatus::Valid {
                self.fetch_contact_profile(&info.wa_id).await
            } else {
                None
            };

            verify_results.push(ContactVerifyResult {
                phone_number: info.input,
                whatsapp_id: if info.status == ContactStatus::Valid {
                    Some(info.wa_id)
                } else {
                    None
                },
                has_whatsapp: info.status == ContactStatus::Valid,
                profile,
            });
        }

        Ok(verify_results)
    }

    /// Fetch contact profile information
    async fn fetch_contact_profile(&self, wa_id: &str) -> Option<WhatsAppProfile> {
        // Note: WhatsApp API may not provide profile info for all contacts
        // This is a placeholder for when profile API becomes available
        debug!("Fetching profile for WhatsApp ID: {}", wa_id);
        
        // For now, return basic profile
        Some(WhatsAppProfile {
            name: None,
            profile_picture_url: None,
            status_message: None,
            is_business: false,
            business: None,
        })
    }

    /// Schedule contact sync for stale contacts
    pub async fn schedule_stale_contacts_sync(&self, limit: u64) -> CoreResult<()> {
        info!("Scheduling sync for stale contacts");

        let job = JobType::SyncStaleContacts { limit };
        self.queue.enqueue(QueueJob::new(job)).await?;

        Ok(())
    }

    /// Get business profile info
    pub async fn get_business_profile(&self, phone_number_id: Option<&str>) -> CoreResult<Option<WhatsAppProfile>> {
        match self.whatsapp_client.get_business_profile(phone_number_id).await {
            Ok(profile) => {
                Ok(Some(WhatsAppProfile {
                    name: profile.about,
                    profile_picture_url: profile.profile_picture_url,
                    status_message: profile.description.clone(),
                    is_business: true,
                    business: Some(BusinessInfo {
                        name: None,
                        description: profile.description,
                        category: profile.vertical,
                        verified: Some(true),
                    }),
                }))
            }
            Err(e) => {
                warn!("Failed to get business profile: {}", e);
                Ok(None)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::queue::MockMessageQueue;
    use pytake_whatsapp::WhatsAppConfig;

    #[tokio::test]
    async fn test_contact_sync_service() {
        let config = WhatsAppConfig::default();
        let client = WhatsAppClient::new(config).unwrap();
        let queue = Arc::new(MockMessageQueue::new());
        
        let service = ContactSyncService::new(Arc::new(client), queue);
        
        // Test empty sync
        assert!(service.process_sync_job(vec![]).await.is_ok());
    }
}