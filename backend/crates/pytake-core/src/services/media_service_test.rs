#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::media_service::{
        MediaType, MediaUploadRequest, LocalMediaService, MediaService
    };
    use tempfile::TempDir;

    #[test]
    fn test_media_type_from_mime() {
        assert_eq!(MediaType::from_mime_type("image/jpeg"), Some(MediaType::Image));
        assert_eq!(MediaType::from_mime_type("video/mp4"), Some(MediaType::Video));
        assert_eq!(MediaType::from_mime_type("audio/mpeg"), Some(MediaType::Audio));
        assert_eq!(MediaType::from_mime_type("application/pdf"), Some(MediaType::Document));
        assert_eq!(MediaType::from_mime_type("text/plain"), None);
    }

    #[test]
    fn test_media_type_extensions() {
        assert!(MediaType::Image.allowed_extensions().contains(&"jpg"));
        assert!(MediaType::Video.allowed_extensions().contains(&"mp4"));
        assert!(MediaType::Audio.allowed_extensions().contains(&"mp3"));
        assert!(MediaType::Document.allowed_extensions().contains(&"pdf"));
        assert!(MediaType::Sticker.allowed_extensions().contains(&"webp"));
    }

    #[test]
    fn test_file_size_limits() {
        assert_eq!(MediaType::Image.max_file_size(), 5 * 1024 * 1024);
        assert_eq!(MediaType::Video.max_file_size(), 64 * 1024 * 1024);
        assert_eq!(MediaType::Audio.max_file_size(), 16 * 1024 * 1024);
        assert_eq!(MediaType::Document.max_file_size(), 100 * 1024 * 1024);
        assert_eq!(MediaType::Sticker.max_file_size(), 500 * 1024);
    }

    #[tokio::test]
    async fn test_file_validation() {
        let temp_dir = TempDir::new().unwrap();
        let service = LocalMediaService::new(temp_dir.path(), None);
        
        // Valid image
        let valid_request = MediaUploadRequest {
            filename: "test.jpg".to_string(),
            content_type: "image/jpeg".to_string(),
            data: vec![0xFF, 0xD8, 0xFF, 0xE0], // JPEG header
            folder_path: None,
            description: None,
            tags: None,
        };
        
        assert!(service.upload(valid_request).await.is_ok());
        
        // Invalid extension
        let invalid_ext = MediaUploadRequest {
            filename: "test.exe".to_string(),
            content_type: "application/x-msdownload".to_string(),
            data: vec![0x4D, 0x5A], // EXE header
            folder_path: None,
            description: None,
            tags: None,
        };
        
        assert!(service.upload(invalid_ext).await.is_err());
        
        // Empty file
        let empty_file = MediaUploadRequest {
            filename: "empty.jpg".to_string(),
            content_type: "image/jpeg".to_string(),
            data: vec![],
            folder_path: None,
            description: None,
            tags: None,
        };
        
        assert!(service.upload(empty_file).await.is_err());
    }

    #[tokio::test]
    async fn test_file_hash_calculation() {
        let temp_dir = TempDir::new().unwrap();
        let service = LocalMediaService::new(temp_dir.path(), None);
        
        let data = b"Hello, World!";
        let request = MediaUploadRequest {
            filename: "test.txt".to_string(),
            content_type: "application/pdf".to_string(), // Treat as document
            data: data.to_vec(),
            folder_path: None,
            description: None,
            tags: None,
        };
        
        let response = service.upload(request).await.unwrap();
        
        // Known SHA-256 hash of "Hello, World!"
        assert_eq!(
            response.file_hash,
            "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"
        );
    }

    #[tokio::test]
    async fn test_folder_structure() {
        let temp_dir = TempDir::new().unwrap();
        let service = LocalMediaService::new(temp_dir.path(), None);
        
        let request = MediaUploadRequest {
            filename: "test.jpg".to_string(),
            content_type: "image/jpeg".to_string(),
            data: vec![0xFF, 0xD8, 0xFF, 0xE0],
            folder_path: Some("avatars".to_string()),
            description: None,
            tags: None,
        };
        
        let response = service.upload(request).await.unwrap();
        
        // Check that file path contains the folder structure
        assert!(response.file_path.contains("avatars"));
        
        // Verify file exists
        let file_exists = tokio::fs::metadata(&response.file_path).await.is_ok();
        assert!(file_exists);
    }

    #[tokio::test]
    async fn test_public_url_generation() {
        let temp_dir = TempDir::new().unwrap();
        let base_url = "https://example.com/media";
        let service = LocalMediaService::new(temp_dir.path(), Some(base_url.to_string()));
        
        let request = MediaUploadRequest {
            filename: "test.jpg".to_string(),
            content_type: "image/jpeg".to_string(),
            data: vec![0xFF, 0xD8, 0xFF, 0xE0],
            folder_path: None,
            description: None,
            tags: None,
        };
        
        let response = service.upload(request).await.unwrap();
        
        assert!(response.public_url.is_some());
        assert!(response.public_url.unwrap().starts_with(base_url));
    }
}