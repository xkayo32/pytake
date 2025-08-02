use std::path::{Path, PathBuf};
use std::io::Write;
use async_trait::async_trait;
use sha2::{Sha256, Digest};
use serde::{Deserialize, Serialize};
use tokio::fs;
use uuid::Uuid;
use crate::errors::{CoreError, CoreResult};

/// Supported media types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MediaType {
    Image,
    Video,
    Audio,
    Document,
    Sticker,
}

impl MediaType {
    pub fn from_mime_type(mime: &str) -> Option<Self> {
        match mime.split('/').next()? {
            "image" => Some(Self::Image),
            "video" => Some(Self::Video),
            "audio" => Some(Self::Audio),
            "application" => {
                if mime.contains("pdf") || mime.contains("document") 
                    || mime.contains("msword") || mime.contains("officedocument") {
                    Some(Self::Document)
                } else {
                    None
                }
            },
            _ => None,
        }
    }

    pub fn allowed_extensions(&self) -> &'static [&'static str] {
        match self {
            Self::Image => &["jpg", "jpeg", "png", "gif", "webp", "bmp"],
            Self::Video => &["mp4", "avi", "mov", "wmv", "flv", "3gp", "mkv"],
            Self::Audio => &["mp3", "wav", "ogg", "m4a", "aac", "wma", "opus"],
            Self::Document => &["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"],
            Self::Sticker => &["webp"],
        }
    }

    pub fn max_file_size(&self) -> u64 {
        match self {
            Self::Image => 5 * 1024 * 1024,      // 5MB
            Self::Video => 64 * 1024 * 1024,     // 64MB
            Self::Audio => 16 * 1024 * 1024,     // 16MB
            Self::Document => 100 * 1024 * 1024, // 100MB
            Self::Sticker => 500 * 1024,         // 500KB
        }
    }
}

/// Media upload request
#[derive(Debug, Serialize, Deserialize)]
pub struct MediaUploadRequest {
    pub filename: String,
    pub content_type: String,
    pub data: Vec<u8>,
    pub folder_path: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Media upload response
#[derive(Debug, Serialize, Deserialize)]
pub struct MediaUploadResponse {
    pub media_id: String,
    pub file_path: String,
    pub public_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub file_size: u64,
    pub file_hash: String,
    pub media_type: MediaType,
}

/// Media metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaMetadata {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_seconds: Option<u32>,
    pub format: Option<String>,
    pub codec: Option<String>,
    pub bitrate: Option<u32>,
}

/// Media service trait
#[async_trait]
pub trait MediaService: Send + Sync {
    /// Upload media file
    async fn upload(&self, request: MediaUploadRequest) -> CoreResult<MediaUploadResponse>;
    
    /// Get media by ID
    async fn get_media(&self, media_id: &str) -> CoreResult<MediaInfo>;
    
    /// Delete media
    async fn delete_media(&self, media_id: &str) -> CoreResult<()>;
    
    /// Generate thumbnail for image/video
    async fn generate_thumbnail(&self, media_id: &str) -> CoreResult<String>;
    
    /// Extract metadata from media file
    async fn extract_metadata(&self, media_id: &str) -> CoreResult<MediaMetadata>;
}

/// Media information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaInfo {
    pub media_id: String,
    pub filename: String,
    pub file_path: String,
    pub public_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub file_size: u64,
    pub file_hash: String,
    pub media_type: MediaType,
    pub mime_type: String,
    pub metadata: Option<MediaMetadata>,
    pub uploaded_at: chrono::DateTime<chrono::Utc>,
}

/// Local file system media service implementation
pub struct LocalMediaService {
    base_path: PathBuf,
    public_base_url: Option<String>,
}

impl LocalMediaService {
    pub fn new(base_path: impl AsRef<Path>, public_base_url: Option<String>) -> Self {
        Self {
            base_path: base_path.as_ref().to_path_buf(),
            public_base_url,
        }
    }

    fn generate_file_path(&self, filename: &str, folder: Option<&str>) -> PathBuf {
        let date = chrono::Utc::now();
        let year = date.format("%Y").to_string();
        let month = date.format("%m").to_string();
        let day = date.format("%d").to_string();
        
        let mut path = self.base_path.clone();
        
        if let Some(folder) = folder {
            path.push(folder);
        }
        
        path.push(year);
        path.push(month);
        path.push(day);
        
        // Generate unique filename
        let uuid = Uuid::new_v4();
        let extension = Path::new(filename)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("bin");
        
        path.push(format!("{}.{}", uuid, extension));
        path
    }

    fn calculate_hash(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    fn validate_file(&self, filename: &str, content_type: &str, data: &[u8]) -> CoreResult<MediaType> {
        // Determine media type
        let media_type = MediaType::from_mime_type(content_type)
            .ok_or_else(|| CoreError::Validation(format!("Unsupported media type: {}", content_type)))?;
        
        // Check file extension
        let extension = Path::new(filename)
            .extension()
            .and_then(|ext| ext.to_str())
            .ok_or_else(|| CoreError::Validation("Missing file extension".into()))?;
        
        if !media_type.allowed_extensions().contains(&extension) {
            return Err(CoreError::Validation(
                format!("Invalid file extension '{}' for media type {:?}", extension, media_type)
            ));
        }
        
        // Check file size
        let file_size = data.len() as u64;
        if file_size > media_type.max_file_size() {
            return Err(CoreError::Validation(
                format!("File size {} exceeds maximum allowed size {} for {:?}", 
                    file_size, media_type.max_file_size(), media_type)
            ));
        }
        
        if file_size == 0 {
            return Err(CoreError::Validation("Empty file".into()));
        }
        
        Ok(media_type)
    }
}

#[async_trait]
impl MediaService for LocalMediaService {
    async fn upload(&self, request: MediaUploadRequest) -> CoreResult<MediaUploadResponse> {
        // Validate file
        let media_type = self.validate_file(&request.filename, &request.content_type, &request.data)?;
        
        // Generate file path
        let file_path = self.generate_file_path(&request.filename, request.folder_path.as_deref());
        
        // Create directories
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).await
                .map_err(|e| CoreError::Storage(format!("Failed to create directory: {}", e)))?;
        }
        
        // Calculate hash
        let file_hash = Self::calculate_hash(&request.data);
        
        // Write file
        fs::write(&file_path, &request.data).await
            .map_err(|e| CoreError::Storage(format!("Failed to write file: {}", e)))?;
        
        // Generate media ID
        let media_id = Uuid::new_v4().to_string();
        
        // Generate public URL if base URL is configured
        let public_url = self.public_base_url.as_ref().map(|base| {
            let relative_path = file_path.strip_prefix(&self.base_path)
                .unwrap_or(&file_path)
                .to_string_lossy()
                .replace('\\', "/");
            format!("{}/{}", base.trim_end_matches('/'), relative_path)
        });
        
        Ok(MediaUploadResponse {
            media_id,
            file_path: file_path.to_string_lossy().to_string(),
            public_url,
            thumbnail_url: None, // TODO: Generate thumbnail
            file_size: request.data.len() as u64,
            file_hash,
            media_type,
        })
    }
    
    async fn get_media(&self, media_id: &str) -> CoreResult<MediaInfo> {
        // TODO: Implement media retrieval from database
        Err(CoreError::NotFound(format!("Media {} not found", media_id)))
    }
    
    async fn delete_media(&self, media_id: &str) -> CoreResult<()> {
        // TODO: Implement media deletion
        Ok(())
    }
    
    async fn generate_thumbnail(&self, media_id: &str) -> CoreResult<String> {
        // TODO: Implement thumbnail generation using image/ffmpeg libraries
        Err(CoreError::NotImplemented("Thumbnail generation not implemented".into()))
    }
    
    async fn extract_metadata(&self, media_id: &str) -> CoreResult<MediaMetadata> {
        // TODO: Implement metadata extraction using appropriate libraries
        Ok(MediaMetadata {
            width: None,
            height: None,
            duration_seconds: None,
            format: None,
            codec: None,
            bitrate: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_media_upload() {
        let temp_dir = TempDir::new().unwrap();
        let service = LocalMediaService::new(temp_dir.path(), Some("http://localhost:8080/media".into()));
        
        let request = MediaUploadRequest {
            filename: "test.jpg".to_string(),
            content_type: "image/jpeg".to_string(),
            data: vec![0xFF, 0xD8, 0xFF, 0xE0], // JPEG header
            folder_path: None,
            description: None,
            tags: None,
        };
        
        let response = service.upload(request).await.unwrap();
        
        assert_eq!(response.media_type, MediaType::Image);
        assert_eq!(response.file_size, 4);
        assert!(response.public_url.is_some());
        
        // Verify file exists
        let file_exists = tokio::fs::metadata(&response.file_path).await.is_ok();
        assert!(file_exists);
    }
    
    #[tokio::test]
    async fn test_invalid_file_type() {
        let temp_dir = TempDir::new().unwrap();
        let service = LocalMediaService::new(temp_dir.path(), None);
        
        let request = MediaUploadRequest {
            filename: "test.exe".to_string(),
            content_type: "application/x-msdownload".to_string(),
            data: vec![0x4D, 0x5A], // EXE header
            folder_path: None,
            description: None,
            tags: None,
        };
        
        let result = service.upload(request).await;
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_file_size_limit() {
        let temp_dir = TempDir::new().unwrap();
        let service = LocalMediaService::new(temp_dir.path(), None);
        
        let request = MediaUploadRequest {
            filename: "large.jpg".to_string(),
            content_type: "image/jpeg".to_string(),
            data: vec![0; 10 * 1024 * 1024], // 10MB
            folder_path: None,
            description: None,
            tags: None,
        };
        
        let result = service.upload(request).await;
        assert!(result.is_err());
    }
}