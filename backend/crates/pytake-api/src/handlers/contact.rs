//! Contact management handlers

use crate::error::ApiResult;
use crate::state::AppState;
use crate::auth::UserId;
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use pytake_db::repositories::contact::{ContactRepository, ContactVerifyResult, WhatsAppProfile, BusinessInfo};
use pytake_core::queue::{MessageQueue, JobType, QueueJob, Priority};
use tracing::{info, error};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct ListContactsQuery {
    pub search: Option<String>,
    pub has_whatsapp: Option<bool>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct ContactListResponse {
    pub contacts: Vec<ContactResponse>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
}

#[derive(Debug, Serialize)]
pub struct ContactResponse {
    pub id: Uuid,
    pub phone_number: String,
    pub whatsapp_id: Option<String>,
    pub has_whatsapp: bool,
    pub name: Option<String>,
    pub profile_picture_url: Option<String>,
    pub status_message: Option<String>,
    pub is_business: bool,
    pub business_name: Option<String>,
    pub tags: Vec<String>,
    pub sync_status: Option<String>,
    pub last_synced_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SyncContactsRequest {
    pub phone_numbers: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContactRequest {
    pub name: Option<String>,
    pub tags: Option<Vec<String>>,
    pub notes: Option<String>,
}

/// List contacts
pub async fn list_contacts(
    app_state: web::Data<AppState>,
    query: web::Query<ListContactsQuery>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let contact_repo = ContactRepository::new(&app_state.db);
    
    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let (contacts, total) = if let Some(search) = &query.search {
        // Search contacts
        let results = contact_repo.search(search, per_page, offset).await?;
        let count = contact_repo.count_total().await?;
        (results, count)
    } else if query.has_whatsapp == Some(true) {
        // Get WhatsApp contacts only
        let results = contact_repo.get_whatsapp_contacts(per_page, offset).await?;
        let count = contact_repo.count_whatsapp().await?;
        (results, count)
    } else {
        // Get all contacts - for now we'll use search with empty string
        let results = contact_repo.search("", per_page, offset).await?;
        let count = contact_repo.count_total().await?;
        (results, count)
    };

    let response_contacts: Vec<ContactResponse> = contacts
        .into_iter()
        .map(|c| ContactResponse {
            id: c.id,
            phone_number: c.phone_number,
            whatsapp_id: c.whatsapp_id,
            has_whatsapp: c.has_whatsapp,
            name: c.name,
            profile_picture_url: c.profile_picture_url,
            status_message: c.status_message,
            is_business: c.is_business,
            business_name: c.business_name,
            tags: c.tags,
            sync_status: c.sync_status,
            last_synced_at: c.last_synced_at.map(|dt| dt.to_rfc3339()),
            created_at: c.created_at.to_rfc3339(),
            updated_at: c.updated_at.to_rfc3339(),
        })
        .collect();

    Ok(HttpResponse::Ok().json(ContactListResponse {
        contacts: response_contacts,
        total,
        page,
        per_page,
    }))
}

/// Get contact by ID
pub async fn get_contact(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let contact_id = path.into_inner();
    let contact_repo = ContactRepository::new(&app_state.db);
    
    match contact_repo.find_by_id(contact_id).await? {
        Some(contact) => {
            let response = ContactResponse {
                id: contact.id,
                phone_number: contact.phone_number,
                whatsapp_id: contact.whatsapp_id,
                has_whatsapp: contact.has_whatsapp,
                name: contact.name,
                profile_picture_url: contact.profile_picture_url,
                status_message: contact.status_message,
                is_business: contact.is_business,
                business_name: contact.business_name,
                tags: contact.tags,
                sync_status: contact.sync_status,
                last_synced_at: contact.last_synced_at.map(|dt| dt.to_rfc3339()),
                created_at: contact.created_at.to_rfc3339(),
                updated_at: contact.updated_at.to_rfc3339(),
            };
            Ok(HttpResponse::Ok().json(response))
        }
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Contact not found"
        }))),
    }
}

/// Sync contacts with WhatsApp
pub async fn sync_contacts(
    app_state: web::Data<AppState>,
    data: web::Json<SyncContactsRequest>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let phone_numbers = data.into_inner().phone_numbers;
    
    if phone_numbers.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "No phone numbers provided"
        })));
    }

    if phone_numbers.len() > 100 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Maximum 100 phone numbers can be synced at once"
        })));
    }

    info!("Syncing {} contacts", phone_numbers.len());

    // Create contact records if they don't exist
    let contact_repo = ContactRepository::new(&app_state.db);
    for phone in &phone_numbers {
        contact_repo.upsert(phone.clone(), None).await?;
    }

    // Queue sync job
    let job = QueueJob::new(JobType::SyncContacts {
        phone_numbers: phone_numbers.clone(),
    })
    .with_priority(Priority::High);

    app_state.queue.enqueue(job).await?;

    Ok(HttpResponse::Accepted().json(serde_json::json!({
        "message": "Contact sync initiated",
        "count": phone_numbers.len()
    })))
}

/// Update contact
pub async fn update_contact(
    app_state: web::Data<AppState>,
    path: web::Path<Uuid>,
    data: web::Json<UpdateContactRequest>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let contact_id = path.into_inner();
    let contact_repo = ContactRepository::new(&app_state.db);
    
    match contact_repo.find_by_id(contact_id).await? {
        Some(mut contact) => {
            // Update fields
            let mut active: pytake_db::entities::contact::ActiveModel = contact.clone().into();
            
            if let Some(name) = data.name.clone() {
                active.name = sea_orm::Set(Some(name));
            }
            
            if let Some(tags) = data.tags.clone() {
                active.tags = sea_orm::Set(tags);
            }
            
            if let Some(notes) = data.notes.clone() {
                active.notes = sea_orm::Set(Some(notes));
            }
            
            active.updated_at = sea_orm::Set(chrono::Utc::now());
            
            use sea_orm::ActiveModelTrait;
            let updated = active.update(&app_state.db).await?;
            
            let response = ContactResponse {
                id: updated.id,
                phone_number: updated.phone_number,
                whatsapp_id: updated.whatsapp_id,
                has_whatsapp: updated.has_whatsapp,
                name: updated.name,
                profile_picture_url: updated.profile_picture_url,
                status_message: updated.status_message,
                is_business: updated.is_business,
                business_name: updated.business_name,
                tags: updated.tags,
                sync_status: updated.sync_status,
                last_synced_at: updated.last_synced_at.map(|dt| dt.to_rfc3339()),
                created_at: updated.created_at.to_rfc3339(),
                updated_at: updated.updated_at.to_rfc3339(),
            };
            
            Ok(HttpResponse::Ok().json(response))
        }
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Contact not found"
        }))),
    }
}

/// Sync all stale contacts
pub async fn sync_stale_contacts(
    app_state: web::Data<AppState>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    info!("Initiating stale contacts sync");

    // Queue sync job for stale contacts
    let job = QueueJob::new(JobType::SyncStaleContacts {
        limit: 100, // Process 100 stale contacts at a time
    })
    .with_priority(Priority::Low);

    app_state.queue.enqueue(job).await?;

    Ok(HttpResponse::Accepted().json(serde_json::json!({
        "message": "Stale contacts sync initiated"
    })))
}

/// Get contact sync stats
pub async fn get_sync_stats(
    app_state: web::Data<AppState>,
    _user_id: UserId,
) -> ApiResult<HttpResponse> {
    let contact_repo = ContactRepository::new(&app_state.db);
    
    let total = contact_repo.count_total().await?;
    let whatsapp = contact_repo.count_whatsapp().await?;
    
    // Get pending sync count
    let pending = contact_repo.get_pending_sync(1000).await?.len() as u64;
    
    // Get stale contacts count
    let stale = contact_repo.get_stale_contacts(1000).await?.len() as u64;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "total_contacts": total,
        "whatsapp_contacts": whatsapp,
        "pending_sync": pending,
        "stale_contacts": stale,
        "sync_percentage": if total > 0 { (whatsapp as f64 / total as f64 * 100.0) } else { 0.0 }
    })))
}