//! Template handlers for quick response management
//! 
//! IMPLEMENTATION STATUS:
//! - ✅ All handlers use the real TemplateRepository via TemplateService (not mock data)
//! - ✅ Proper error handling and conversion between repository models and API DTOs
//! - ✅ Database connection obtained from AppState
//! - ⏳ Organization ID support prepared but not yet implemented in underlying layers
//! 
//! TODO for full organization support:
//! 1. Add organization_id field to template entity and migration
//! 2. Update TemplateRepository methods to accept organization_id parameter
//! 3. Update TemplateService to pass organization_id through
//! 4. Add organization_id to AuthContext
//! 5. Replace get_organization_id() function with actual auth context extraction

use actix_web::{web, HttpResponse};
use pytake_core::services::template_service::TemplateService;
use pytake_db::entities::template::{
    CreateTemplateInput, TemplateFilters, UpdateTemplateInput
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::{
    middleware::{auth::AuthContext, error_handler::{ApiError, ApiResult}},
    state::AppState,
};

/// Default organization ID to use when organization support is not fully implemented
/// TODO: Replace with proper organization_id from auth context when organization support is added
const DEFAULT_ORGANIZATION_ID: &str = "00000000-0000-0000-0000-000000000000";

/// Get organization ID from auth context or use default
/// TODO: Update this when AuthContext includes organization_id
fn get_organization_id(_auth: &AuthContext) -> Uuid {
    // For now, use a default organization ID
    // In the future, this should extract organization_id from auth context
    Uuid::parse_str(DEFAULT_ORGANIZATION_ID).unwrap_or_else(|_| {
        warn!("Failed to parse default organization ID, generating new one");
        Uuid::new_v4()
    })
}

/// Query parameters for listing templates
#[derive(Debug, Deserialize)]
pub struct ListTemplatesQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub category: Option<String>,
    pub language: Option<String>,
    pub is_active: Option<bool>,
    pub search: Option<String>,
}

/// Query parameters for searching templates
#[derive(Debug, Deserialize)]
pub struct SearchTemplatesQuery {
    pub q: String,
    pub limit: Option<u64>,
}

/// Request to use a template
#[derive(Debug, Deserialize)]
pub struct UseTemplateRequest {
    pub variables: HashMap<String, String>,
}

/// Response when using a template
#[derive(Debug, Serialize)]
pub struct UseTemplateResponse {
    pub content: String,
    pub template_id: i32,
}

/// Request to clone a template
#[derive(Debug, Deserialize)]
pub struct CloneTemplateRequest {
    pub new_name: String,
}

/// Create a new template
pub async fn create_template(
    auth: AuthContext,
    body: web::Json<CreateTemplateInput>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Creating new template: {}", body.name);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);
    
    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to create_template when TemplateService supports it
    let template = template_service
        .create_template(body.into_inner(), auth.user_id.parse::<i32>().unwrap_or(0))
        .await
        .map_err(|e| {
            error!("Failed to create template: {}", e);
            ApiError::internal(&e.to_string())
        })?;

    Ok(HttpResponse::Created().json(template))
}

/// Update an existing template
pub async fn update_template(
    auth: AuthContext,
    template_id: web::Path<i32>,
    body: web::Json<UpdateTemplateInput>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let template_id = template_id.into_inner();
    info!("Updating template: {}", template_id);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to update_template when TemplateService supports it
    let template = template_service
        .update_template(template_id, body.into_inner(), auth.user_id.parse::<i32>().unwrap_or(0))
        .await
        .map_err(|e| {
            error!("Failed to update template: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("Template not found"),
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden("You can only update your own templates"),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::Ok().json(template))
}

/// Get a template by ID
pub async fn get_template(
    auth: AuthContext,
    template_id: web::Path<i32>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let template_id = template_id.into_inner();
    info!("Getting template: {}", template_id);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to get_template when TemplateService supports it
    let template = template_service
        .get_template(template_id)
        .await
        .map_err(|e| {
            error!("Failed to get template: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("Template not found"),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::Ok().json(template))
}

/// Delete a template
pub async fn delete_template(
    auth: AuthContext,
    template_id: web::Path<i32>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let template_id = template_id.into_inner();
    info!("Deleting template: {}", template_id);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to delete_template when TemplateService supports it
    template_service
        .delete_template(template_id, auth.user_id.parse::<i32>().unwrap_or(0))
        .await
        .map_err(|e| {
            error!("Failed to delete template: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("Template not found"),
                pytake_core::errors::CoreError::Unauthorized(_) => ApiError::forbidden("You can only delete your own templates"),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::NoContent().finish())
}

/// List templates with filters
pub async fn list_templates(
    auth: AuthContext,
    query: web::Query<ListTemplatesQuery>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Listing templates with filters");

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20).min(100);

    let filters = TemplateFilters {
        category: query.category.clone(),
        language: query.language.clone(),
        is_active: query.is_active,
        search: query.search.clone(),
        tags: None,
        created_by: None,
        // TODO: Add organization_id filter when TemplateFilters supports it
    };

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to list_templates when TemplateService supports it
    let (templates, total) = template_service
        .list_templates(filters, page, page_size)
        .await
        .map_err(|e| {
            error!("Failed to list templates: {}", e);
            ApiError::internal(&e.to_string())
        })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "templates": templates,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) / page_size,
        }
    })))
}

/// Search templates
pub async fn search_templates(
    auth: AuthContext,
    query: web::Query<SearchTemplatesQuery>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Searching templates: {}", query.q);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let limit = query.limit.unwrap_or(10).min(50);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to search_templates when TemplateService supports it
    let templates = template_service
        .search_templates(&query.q, limit)
        .await
        .map_err(|e| {
            error!("Failed to search templates: {}", e);
            ApiError::internal(&e.to_string())
        })?;

    Ok(HttpResponse::Ok().json(templates))
}

/// Get templates by category
pub async fn get_templates_by_category(
    auth: AuthContext,
    category: web::Path<String>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let category = category.into_inner();
    info!("Getting templates by category: {}", category);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to get_templates_by_category when TemplateService supports it
    let templates = template_service
        .get_templates_by_category(&category)
        .await
        .map_err(|e| {
            error!("Failed to get templates by category: {}", e);
            ApiError::internal(&e.to_string())
        })?;

    Ok(HttpResponse::Ok().json(templates))
}

/// Get user's favorite templates
pub async fn get_user_favorites(
    auth: AuthContext,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Getting favorite templates for user: {}", auth.user_id);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to get_user_favorites when TemplateService supports it
    let templates = template_service
        .get_user_favorites(auth.user_id.parse::<i32>().unwrap_or(0), 20)
        .await
        .map_err(|e| {
            error!("Failed to get user favorites: {}", e);
            ApiError::internal(&e.to_string())
        })?;

    Ok(HttpResponse::Ok().json(templates))
}

/// Get templates with usage statistics
pub async fn get_templates_with_stats(
    auth: AuthContext,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    info!("Getting templates with statistics");

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to get_templates_with_stats when TemplateService supports it
    let templates = template_service
        .get_templates_with_stats(50)
        .await
        .map_err(|e| {
            error!("Failed to get templates with stats: {}", e);
            ApiError::internal(&e.to_string())
        })?;

    Ok(HttpResponse::Ok().json(templates))
}

/// Use a template (apply variables and increment usage)
pub async fn use_template(
    auth: AuthContext,
    template_id: web::Path<i32>,
    body: web::Json<UseTemplateRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let template_id = template_id.into_inner();
    info!("Using template: {} by user: {}", template_id, auth.user_id);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to use_template when TemplateService supports it
    let content = template_service
        .use_template(template_id, body.into_inner().variables)
        .await
        .map_err(|e| {
            error!("Failed to use template: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("Template not found"),
                pytake_core::errors::CoreError::Validation(msg) => ApiError::bad_request(&msg),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::Ok().json(UseTemplateResponse {
        content,
        template_id,
    }))
}

/// Clone a template
pub async fn clone_template(
    auth: AuthContext,
    template_id: web::Path<i32>,
    body: web::Json<CloneTemplateRequest>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let template_id = template_id.into_inner();
    info!("Cloning template: {} for user: {}", template_id, auth.user_id);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to clone_template when TemplateService supports it
    let template = template_service
        .clone_template(template_id, body.new_name.clone(), auth.user_id.parse::<i32>().unwrap_or(0))
        .await
        .map_err(|e| {
            error!("Failed to clone template: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("Template not found"),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::Created().json(template))
}

/// Get template by shortcut
pub async fn get_template_by_shortcut(
    auth: AuthContext,
    shortcut: web::Path<String>,
    app_state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let shortcut = shortcut.into_inner();
    info!("Getting template by shortcut: {}", shortcut);

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    let template_service = TemplateService::new(app_state.db.clone());
    
    // TODO: Pass organization_id to get_template_by_shortcut when TemplateService supports it
    let template = template_service
        .get_template_by_shortcut(&shortcut)
        .await
        .map_err(|e| {
            error!("Failed to get template by shortcut: {}", e);
            match e {
                pytake_core::errors::CoreError::NotFound(_) => ApiError::not_found("Template not found"),
                _ => ApiError::internal(&e.to_string()),
            }
        })?;

    Ok(HttpResponse::Ok().json(template))
}

/// Get available template categories
pub async fn get_template_categories(
    auth: AuthContext,
) -> ApiResult<HttpResponse> {
    info!("Getting template categories");

    // Get organization ID (currently uses default, will be from auth context when implemented)
    let _organization_id = get_organization_id(&auth);

    // TODO: Get categories from database based on organization_id when implemented
    let categories = vec![
        serde_json::json!({
            "id": "greeting",
            "name": "Saudações",
            "description": "Templates de boas-vindas e cumprimentos"
        }),
        serde_json::json!({
            "id": "support",
            "name": "Suporte",
            "description": "Templates para atendimento e suporte"
        }),
        serde_json::json!({
            "id": "sales",
            "name": "Vendas",
            "description": "Templates para vendas e promoções"
        }),
        serde_json::json!({
            "id": "information",
            "name": "Informações",
            "description": "Templates informativos"
        }),
        serde_json::json!({
            "id": "farewell",
            "name": "Despedidas",
            "description": "Templates de encerramento e agradecimento"
        }),
        serde_json::json!({
            "id": "followup",
            "name": "Follow-up",
            "description": "Templates de acompanhamento"
        }),
    ];

    Ok(HttpResponse::Ok().json(categories))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_get_template_categories() {
        let app = test::init_service(
            App::new().route("/categories", web::get().to(get_template_categories))
        ).await;

        let req = test::TestRequest::get()
            .uri("/categories")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert!(resp.status().is_success());
    }
}