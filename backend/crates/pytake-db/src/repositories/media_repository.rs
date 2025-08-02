use crate::entities::{prelude::*, media};
use sea_orm::*;
use uuid::Uuid;
use chrono::Utc;

#[derive(Clone, Debug)]
pub struct MediaRepository {
    db: DatabaseConnection,
}

impl MediaRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Create a new media file record
    pub async fn create(
        &self,
        organization_id: Uuid,
        uploaded_by: Uuid,
        file_name: String,
        original_name: String,
        file_path: String,
        mime_type: String,
        file_size: i64,
        file_hash: String,
        media_type: String,
        public_url: Option<String>,
        thumbnail_url: Option<String>,
        folder_path: Option<String>,
        tags: Option<Vec<String>>,
        description: Option<String>,
        metadata: Option<serde_json::Value>,
    ) -> Result<media::Model, DbErr> {
        let media = media::ActiveModel {
            id: Set(Uuid::new_v4()),
            organization_id: Set(organization_id),
            uploaded_by: Set(uploaded_by),
            file_name: Set(file_name),
            original_name: Set(original_name),
            file_path: Set(file_path),
            public_url: Set(public_url),
            thumbnail_url: Set(thumbnail_url),
            mime_type: Set(mime_type),
            file_size: Set(file_size),
            file_hash: Set(file_hash),
            media_type: Set(media_type),
            folder_path: Set(folder_path),
            tags: Set(tags),
            description: Set(description),
            metadata: Set(metadata.unwrap_or_else(|| serde_json::json!({}))),
            usage_count: Set(0),
            last_used_at: Set(None),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            ..Default::default()
        };

        media.insert(&self.db).await
    }

    /// Find media by ID
    pub async fn find_by_id(
        &self,
        id: Uuid,
        organization_id: Uuid,
    ) -> Result<Option<media::Model>, DbErr> {
        Media::find()
            .filter(media::Column::Id.eq(id))
            .filter(media::Column::OrganizationId.eq(organization_id))
            .one(&self.db)
            .await
    }

    /// Find media by file hash (for deduplication)
    pub async fn find_by_hash(
        &self,
        hash: &str,
        organization_id: Uuid,
    ) -> Result<Option<media::Model>, DbErr> {
        Media::find()
            .filter(media::Column::FileHash.eq(hash))
            .filter(media::Column::OrganizationId.eq(organization_id))
            .one(&self.db)
            .await
    }

    /// List media with pagination and filters
    pub async fn list(
        &self,
        organization_id: Uuid,
        page: u64,
        page_size: u64,
        media_type: Option<String>,
        folder: Option<String>,
        search: Option<String>,
    ) -> Result<(Vec<media::Model>, u64), DbErr> {
        let mut query = Media::find()
            .filter(media::Column::OrganizationId.eq(organization_id));

        if let Some(mt) = media_type {
            query = query.filter(media::Column::MediaType.eq(mt));
        }

        if let Some(f) = folder {
            query = query.filter(media::Column::FolderPath.eq(f));
        }

        if let Some(search_term) = search {
            query = query.filter(
                Condition::any()
                    .add(media::Column::FileName.contains(&search_term))
                    .add(media::Column::OriginalName.contains(&search_term))
                    .add(media::Column::Description.contains(&search_term))
            );
        }

        let paginator = query
            .order_by_desc(media::Column::CreatedAt)
            .paginate(&self.db, page_size);

        let total = paginator.num_items().await?;
        let media_files = paginator.fetch_page(page - 1).await?;

        Ok((media_files, total))
    }

    /// Update media metadata
    pub async fn update(
        &self,
        id: Uuid,
        organization_id: Uuid,
        description: Option<String>,
        tags: Option<Vec<String>>,
        folder_path: Option<String>,
    ) -> Result<media::Model, DbErr> {
        let media = Media::find()
            .filter(media::Column::Id.eq(id))
            .filter(media::Column::OrganizationId.eq(organization_id))
            .one(&self.db)
            .await?
            .ok_or(DbErr::RecordNotFound("Media not found".to_string()))?;

        let mut active_model: media::ActiveModel = media.into();

        if let Some(d) = description {
            active_model.description = Set(Some(d));
        }
        if let Some(t) = tags {
            active_model.tags = Set(Some(t));
        }
        if let Some(f) = folder_path {
            active_model.folder_path = Set(Some(f));
        }

        active_model.updated_at = Set(Utc::now());
        active_model.update(&self.db).await
    }

    /// Delete media file
    pub async fn delete(
        &self,
        id: Uuid,
        organization_id: Uuid,
    ) -> Result<(), DbErr> {
        Media::delete_many()
            .filter(media::Column::Id.eq(id))
            .filter(media::Column::OrganizationId.eq(organization_id))
            .exec(&self.db)
            .await?;

        Ok(())
    }

    /// Increment usage count and update last used timestamp
    pub async fn increment_usage(
        &self,
        id: Uuid,
    ) -> Result<(), DbErr> {
        Media::update_many()
            .filter(media::Column::Id.eq(id))
            .col_expr(
                media::Column::UsageCount,
                Expr::col(media::Column::UsageCount).add(1),
            )
            .col_expr(media::Column::LastUsedAt, Expr::value(Utc::now()))
            .exec(&self.db)
            .await?;

        Ok(())
    }

    /// Get media by folder
    pub async fn get_by_folder(
        &self,
        organization_id: Uuid,
        folder: &str,
    ) -> Result<Vec<media::Model>, DbErr> {
        Media::find()
            .filter(media::Column::OrganizationId.eq(organization_id))
            .filter(media::Column::FolderPath.eq(folder))
            .order_by_desc(media::Column::CreatedAt)
            .all(&self.db)
            .await
    }

    /// Get total storage used by organization
    pub async fn get_storage_usage(
        &self,
        organization_id: Uuid,
    ) -> Result<i64, DbErr> {
        let result = Media::find()
            .select_only()
            .column_as(media::Column::FileSize.sum(), "total_size")
            .filter(media::Column::OrganizationId.eq(organization_id))
            .into_tuple::<Option<i64>>()
            .one(&self.db)
            .await?;

        Ok(result.flatten().unwrap_or(0))
    }

    /// Get storage usage by media type
    pub async fn get_storage_by_type(
        &self,
        organization_id: Uuid,
    ) -> Result<Vec<(String, i64, i64)>, DbErr> {
        let results = Media::find()
            .select_only()
            .column(media::Column::MediaType)
            .column_as(media::Column::FileSize.sum(), "total_size")
            .column_as(media::Column::Id.count(), "file_count")
            .filter(media::Column::OrganizationId.eq(organization_id))
            .group_by(media::Column::MediaType)
            .into_tuple::<(String, Option<i64>, i64)>()
            .all(&self.db)
            .await?;

        Ok(results.into_iter()
            .map(|(media_type, size, count)| (media_type, size.unwrap_or(0), count))
            .collect())
    }

    /// Search media by tags
    pub async fn search_by_tags(
        &self,
        organization_id: Uuid,
        tags: Vec<String>,
    ) -> Result<Vec<media::Model>, DbErr> {
        // PostgreSQL specific: using @> operator for array contains
        let query = format!(
            "SELECT * FROM media_files 
             WHERE organization_id = $1 
             AND tags @> $2::text[] 
             ORDER BY created_at DESC"
        );

        let media_files = Media::find()
            .from_raw_sql(Statement::from_sql_and_values(
                sea_orm::DatabaseBackend::Postgres,
                &query,
                vec![
                    organization_id.into(),
                    serde_json::to_value(&tags).unwrap().into(),
                ],
            ))
            .all(&self.db)
            .await?;

        Ok(media_files)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::*;

    #[tokio::test]
    async fn test_media_crud() {
        let db = setup_test_db().await;
        let repo = MediaRepository::new(db);
        
        let org_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        
        // Create
        let media = repo.create(
            org_id,
            user_id,
            "test_123.jpg".to_string(),
            "test.jpg".to_string(),
            "/media/2024/01/test_123.jpg".to_string(),
            "image/jpeg".to_string(),
            1024000,
            "abc123def456".to_string(),
            "image".to_string(),
            Some("https://example.com/media/test_123.jpg".to_string()),
            Some("https://example.com/media/test_123_thumb.jpg".to_string()),
            Some("avatars".to_string()),
            Some(vec!["profile".to_string(), "avatar".to_string()]),
            Some("User profile picture".to_string()),
            Some(serde_json::json!({
                "width": 800,
                "height": 600
            })),
        ).await.unwrap();
        
        assert_eq!(media.file_name, "test_123.jpg");
        assert_eq!(media.media_type, "image");
        
        // Find by ID
        let found = repo.find_by_id(media.id, org_id).await.unwrap();
        assert!(found.is_some());
        
        // Find by hash
        let by_hash = repo.find_by_hash("abc123def456", org_id).await.unwrap();
        assert!(by_hash.is_some());
        
        // Update
        let updated = repo.update(
            media.id,
            org_id,
            Some("Updated description".to_string()),
            None,
            None,
        ).await.unwrap();
        
        assert_eq!(updated.description, Some("Updated description".to_string()));
        
        // Increment usage
        repo.increment_usage(media.id).await.unwrap();
        
        let after_usage = repo.find_by_id(media.id, org_id).await.unwrap().unwrap();
        assert_eq!(after_usage.usage_count, 1);
        assert!(after_usage.last_used_at.is_some());
        
        // Delete
        repo.delete(media.id, org_id).await.unwrap();
        
        let deleted = repo.find_by_id(media.id, org_id).await.unwrap();
        assert!(deleted.is_none());
    }
}