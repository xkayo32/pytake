use actix_multipart::Multipart;
use actix_web::{web, HttpResponse};
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::io::Write;

use crate::error::ApiError;
use crate::extractors::auth::AuthUser;
use crate::AppState;
use pytake_core::services::media_service::{
    MediaService, MediaUploadRequest, MediaType, MediaInfo, MediaMetadata
};

type ApiResult<T> = Result<T, ApiError>;

#[derive(Debug, Serialize)]
pub struct MediaUploadResponseDto {
    pub media_id: String,
    pub file_path: String,
    pub public_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub file_size: u64,
    pub file_hash: String,
    pub media_type: String,
}

#[derive(Debug, Deserialize)]
pub struct MediaListQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub media_type: Option<String>,
    pub folder: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MediaListResponse {
    pub media: Vec<MediaInfoDto>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, Serialize)]
pub struct PaginationInfo {
    pub page: u32,
    pub page_size: u32,
    pub total: u32,
    pub total_pages: u32,
}

#[derive(Debug, Serialize)]
pub struct MediaInfoDto {
    pub media_id: String,
    pub filename: String,
    pub file_path: String,
    pub public_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub file_size: u64,
    pub file_hash: String,
    pub media_type: String,
    pub mime_type: String,
    pub metadata: Option<MediaMetadataDto>,
    pub uploaded_at: String,
    pub uploaded_by: String,
}

#[derive(Debug, Serialize)]
pub struct MediaMetadataDto {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_seconds: Option<u32>,
    pub format: Option<String>,
    pub codec: Option<String>,
    pub bitrate: Option<u32>,
}

/// Upload media file
pub async fn upload_media(
    mut payload: Multipart,
    auth: AuthUser,
    state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let mut filename = None;
    let mut content_type = None;
    let mut file_data = Vec::new();
    let mut folder_path = None;
    let mut description = None;
    let mut tags = Vec::new();

    // Process multipart form
    while let Some(mut field) = payload.try_next().await? {
        let field_name = field.name().to_string();
        
        match field_name.as_str() {
            "file" => {
                filename = field.content_disposition().get_filename().map(String::from);
                content_type = field.content_type().map(|ct| ct.to_string());
                
                // Read file data
                while let Some(chunk) = field.try_next().await? {
                    file_data.extend_from_slice(&chunk);
                }
            }
            "folder" => {
                let mut data = Vec::new();
                while let Some(chunk) = field.try_next().await? {
                    data.extend_from_slice(&chunk);
                }
                folder_path = String::from_utf8(data).ok();
            }
            "description" => {
                let mut data = Vec::new();
                while let Some(chunk) = field.try_next().await? {
                    data.extend_from_slice(&chunk);
                }
                description = String::from_utf8(data).ok();
            }
            "tags" => {
                let mut data = Vec::new();
                while let Some(chunk) = field.try_next().await? {
                    data.extend_from_slice(&chunk);
                }
                if let Ok(tag_str) = String::from_utf8(data) {
                    tags = tag_str.split(',').map(|s| s.trim().to_string()).collect();
                }
            }
            _ => {}
        }
    }

    // Validate required fields
    let filename = filename.ok_or(ApiError::BadRequest("No file provided".to_string()))?;
    let content_type = content_type.ok_or(ApiError::BadRequest("No content type".to_string()))?;
    
    if file_data.is_empty() {
        return Err(ApiError::BadRequest("Empty file".to_string()));
    }

    // Create upload request
    let upload_request = MediaUploadRequest {
        filename,
        content_type,
        data: file_data,
        folder_path,
        description,
        tags: if tags.is_empty() { None } else { Some(tags) },
    };

    // Upload file using media service
    let response = state.media_service.upload(upload_request).await
        .map_err(|e| ApiError::InternalError(e.to_string()))?;

    // TODO: Save media info to database with user ID
    
    Ok(HttpResponse::Ok().json(MediaUploadResponseDto {
        media_id: response.media_id,
        file_path: response.file_path,
        public_url: response.public_url,
        thumbnail_url: response.thumbnail_url,
        file_size: response.file_size,
        file_hash: response.file_hash,
        media_type: format!("{:?}", response.media_type).to_lowercase(),
    }))
}

/// List media files
pub async fn list_media(
    query: web::Query<MediaListQuery>,
    auth: AuthUser,
    state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    
    // TODO: Implement database query for media list
    // For now, return mock data
    let mock_media = vec![
        MediaInfoDto {
            media_id: Uuid::new_v4().to_string(),
            filename: "example.jpg".to_string(),
            file_path: "/media/2024/01/15/example.jpg".to_string(),
            public_url: Some("http://localhost:8080/media/2024/01/15/example.jpg".to_string()),
            thumbnail_url: Some("http://localhost:8080/media/2024/01/15/example_thumb.jpg".to_string()),
            file_size: 1024000,
            file_hash: "abc123def456".to_string(),
            media_type: "image".to_string(),
            mime_type: "image/jpeg".to_string(),
            metadata: Some(MediaMetadataDto {
                width: Some(1920),
                height: Some(1080),
                duration_seconds: None,
                format: Some("JPEG".to_string()),
                codec: None,
                bitrate: None,
            }),
            uploaded_at: chrono::Utc::now().to_rfc3339(),
            uploaded_by: auth.user_id.to_string(),
        },
    ];
    
    Ok(HttpResponse::Ok().json(MediaListResponse {
        media: mock_media,
        pagination: PaginationInfo {
            page,
            page_size,
            total: 1,
            total_pages: 1,
        },
    }))
}

/// Get media by ID
pub async fn get_media(
    media_id: web::Path<String>,
    auth: AuthUser,
    state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let media_info = state.media_service.get_media(&media_id).await
        .map_err(|e| ApiError::NotFound(format!("Media not found: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(MediaInfoDto {
        media_id: media_info.media_id,
        filename: media_info.filename,
        file_path: media_info.file_path,
        public_url: media_info.public_url,
        thumbnail_url: media_info.thumbnail_url,
        file_size: media_info.file_size,
        file_hash: media_info.file_hash,
        media_type: format!("{:?}", media_info.media_type).to_lowercase(),
        mime_type: media_info.mime_type,
        metadata: media_info.metadata.map(|m| MediaMetadataDto {
            width: m.width,
            height: m.height,
            duration_seconds: m.duration_seconds,
            format: m.format,
            codec: m.codec,
            bitrate: m.bitrate,
        }),
        uploaded_at: media_info.uploaded_at.to_rfc3339(),
        uploaded_by: auth.user_id.to_string(),
    }))
}

/// Delete media
pub async fn delete_media(
    media_id: web::Path<String>,
    auth: AuthUser,
    state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    // TODO: Check if user has permission to delete this media
    
    state.media_service.delete_media(&media_id).await
        .map_err(|e| ApiError::InternalError(e.to_string()))?;
    
    Ok(HttpResponse::NoContent().finish())
}

/// Generate thumbnail for media
pub async fn generate_thumbnail(
    media_id: web::Path<String>,
    auth: AuthUser,
    state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let thumbnail_url = state.media_service.generate_thumbnail(&media_id).await
        .map_err(|e| ApiError::InternalError(e.to_string()))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "thumbnail_url": thumbnail_url
    })))
}

/// Get media metadata
pub async fn get_media_metadata(
    media_id: web::Path<String>,
    auth: AuthUser,
    state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    let metadata = state.media_service.extract_metadata(&media_id).await
        .map_err(|e| ApiError::InternalError(e.to_string()))?;
    
    Ok(HttpResponse::Ok().json(MediaMetadataDto {
        width: metadata.width,
        height: metadata.height,
        duration_seconds: metadata.duration_seconds,
        format: metadata.format,
        codec: metadata.codec,
        bitrate: metadata.bitrate,
    }))
}

/// Serve media file (for local storage)
pub async fn serve_media(
    path: web::Path<String>,
    state: web::Data<AppState>,
) -> ApiResult<HttpResponse> {
    // Security: Prevent path traversal
    if path.contains("..") {
        return Err(ApiError::BadRequest("Invalid path".to_string()));
    }
    
    // TODO: Implement actual file serving
    // This would read the file from disk and return it with appropriate headers
    
    Ok(HttpResponse::NotImplemented().body("Media serving not implemented"))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/media")
            .route("/upload", web::post().to(upload_media))
            .route("", web::get().to(list_media))
            .route("/{media_id}", web::get().to(get_media))
            .route("/{media_id}", web::delete().to(delete_media))
            .route("/{media_id}/thumbnail", web::post().to(generate_thumbnail))
            .route("/{media_id}/metadata", web::get().to(get_media_metadata))
    )
    // Serve media files from /files path
    .route("/files/{path:.*}", web::get().to(serve_media));
}