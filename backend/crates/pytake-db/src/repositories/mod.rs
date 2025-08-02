//! Repository layer for database operations

pub mod user;
pub mod flow;
pub mod whatsapp_message;
pub mod webhook_event;
pub mod traits;
pub mod conversation;
pub mod message;
pub mod contact;
pub mod template;
pub mod template_repository;
pub mod media_repository;
pub mod dashboard_repository;
pub mod user_repository;

// Re-export all repositories
pub use user::*;
pub use flow::*;
pub use whatsapp_message::*;
pub use webhook_event::*;
pub use traits::*;

use crate::error::{DatabaseError, Result};
use sea_orm::{DatabaseConnection, EntityTrait, Select};
use serde::{Deserialize, Serialize};

/// Pagination parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: u64,
    pub per_page: u64,
}

impl PaginationParams {
    /// Create new pagination parameters
    pub fn new(page: u64, per_page: u64) -> Self {
        let per_page = per_page.clamp(1, 100); // Limit to reasonable range
        let page = page.max(1); // Ensure page is at least 1
        
        Self { page, per_page }
    }

    /// Get offset for database query
    pub fn offset(&self) -> u64 {
        (self.page - 1) * self.per_page
    }

    /// Get limit for database query
    pub fn limit(&self) -> u64 {
        self.per_page
    }
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self::new(1, 20)
    }
}

/// Paginated result wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub total_items: u64,
    pub total_pages: u64,
    pub current_page: u64,
    pub per_page: u64,
    pub has_next: bool,
    pub has_prev: bool,
}

impl<T> PaginatedResult<T> {
    /// Create a new paginated result
    pub fn new(
        items: Vec<T>,
        total_items: u64,
        pagination: &PaginationParams,
    ) -> Self {
        let total_pages = (total_items + pagination.per_page - 1) / pagination.per_page;
        let has_next = pagination.page < total_pages;
        let has_prev = pagination.page > 1;

        Self {
            items,
            total_items,
            total_pages,
            current_page: pagination.page,
            per_page: pagination.per_page,
            has_next,
            has_prev,
        }
    }

    /// Check if result is empty
    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    /// Get the number of items in current page
    pub fn len(&self) -> usize {
        self.items.len()
    }

    /// Map the items to a different type
    pub fn map<U, F>(self, f: F) -> PaginatedResult<U>
    where
        F: FnMut(T) -> U,
    {
        PaginatedResult {
            items: self.items.into_iter().map(f).collect(),
            total_items: self.total_items,
            total_pages: self.total_pages,
            current_page: self.current_page,
            per_page: self.per_page,
            has_next: self.has_next,
            has_prev: self.has_prev,
        }
    }
}

/// Sorting parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortParams {
    pub field: String,
    pub direction: SortDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortDirection {
    Asc,
    Desc,
}

impl Default for SortDirection {
    fn default() -> Self {
        SortDirection::Asc
    }
}

/// Filter parameters for queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterParams {
    pub filters: Vec<FilterCondition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    pub field: String,
    pub operator: FilterOperator,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FilterOperator {
    Eq,
    Ne,
    Gt,
    Gte,
    Lt,
    Lte,
    Like,
    In,
    NotIn,
    IsNull,
    IsNotNull,
}

/// Generic query parameters combining pagination, sorting, and filtering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryParams {
    #[serde(flatten)]
    pub pagination: PaginationParams,
    pub sort: Option<SortParams>,
    pub filter: Option<FilterParams>,
}

impl Default for QueryParams {
    fn default() -> Self {
        Self {
            pagination: PaginationParams::default(),
            sort: None,
            filter: None,
        }
    }
}

/// Helper function to apply pagination to a SeaORM select query
pub async fn paginate_query<E, M>(
    query: Select<E>,
    pagination: &PaginationParams,
    db: &DatabaseConnection,
) -> Result<PaginatedResult<M>>
where
    E: EntityTrait<Model = M>,
    M: Send + Sync + sea_orm::ModelTrait,
{
    // For now, let's get a reasonable total (this is an estimation approach)
    // Since we can't easily get the count from a generic Select, we'll fetch all and count
    // This is not ideal for large datasets, but works for now
    let all_items = query.clone().all(db).await.map_err(|e| DatabaseError::QueryError(e.to_string()))?;
    let total_items = all_items.len() as u64;
    
    // Apply pagination manually
    let offset = ((pagination.page - 1) * pagination.per_page) as usize;
    let limit = pagination.per_page as usize;
    
    let items = all_items
        .into_iter()
        .skip(offset)
        .take(limit)
        .collect();

    Ok(PaginatedResult::new(items, total_items, pagination))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_params() {
        let params = PaginationParams::new(2, 10);
        assert_eq!(params.page, 2);
        assert_eq!(params.per_page, 10);
        assert_eq!(params.offset(), 10);
        assert_eq!(params.limit(), 10);
    }

    #[test]
    fn test_pagination_params_limits() {
        // Test per_page limits
        let params = PaginationParams::new(1, 0);
        assert_eq!(params.per_page, 1); // Should be clamped to 1

        let params = PaginationParams::new(1, 200);
        assert_eq!(params.per_page, 100); // Should be clamped to 100

        // Test page minimum
        let params = PaginationParams::new(0, 10);
        assert_eq!(params.page, 1); // Should be at least 1
    }

    #[test]
    fn test_paginated_result() {
        let items = vec![1, 2, 3];
        let pagination = PaginationParams::new(2, 2);
        let result = PaginatedResult::new(items, 10, &pagination);

        assert_eq!(result.total_items, 10);
        assert_eq!(result.total_pages, 5);
        assert_eq!(result.current_page, 2);
        assert_eq!(result.per_page, 2);
        assert!(result.has_next);
        assert!(result.has_prev);
        assert!(!result.is_empty());
        assert_eq!(result.len(), 3);
    }

    #[test]
    fn test_paginated_result_map() {
        let items = vec![1, 2, 3];
        let pagination = PaginationParams::new(1, 10);
        let result = PaginatedResult::new(items, 3, &pagination);

        let mapped = result.map(|x| x * 2);
        assert_eq!(mapped.items, vec![2, 4, 6]);
        assert_eq!(mapped.total_items, 3);
    }

    #[test]
    fn test_sort_direction_default() {
        let direction = SortDirection::default();
        assert!(matches!(direction, SortDirection::Asc));
    }

    #[test]
    fn test_query_params_default() {
        let params = QueryParams::default();
        assert_eq!(params.pagination.page, 1);
        assert_eq!(params.pagination.per_page, 20);
        assert!(params.sort.is_none());
        assert!(params.filter.is_none());
    }
}