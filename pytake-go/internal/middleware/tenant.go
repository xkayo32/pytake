package middleware

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// TenantMiddleware extracts and validates tenant context
func TenantMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user claims (should be set by AuthMiddleware)
		userClaims, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		claims := userClaims.(*auth.Claims)

		// Try to get tenant ID from different sources
		var tenantID *uuid.UUID

		// 1. From JWT claims (preferred)
		if claims.TenantID != nil {
			tenantID = claims.TenantID
		} else {
			// 2. From X-Tenant-ID header
			if tenantHeader := c.GetHeader("X-Tenant-ID"); tenantHeader != "" {
				if tid, err := uuid.Parse(tenantHeader); err == nil {
					tenantID = &tid
				}
			}

			// 3. From user's default tenant
			if tenantID == nil {
				var user models.User
				if err := db.First(&user, claims.UserID).Error; err == nil && user.DefaultTenantID != nil {
					tenantID = user.DefaultTenantID
				}
			}
		}

		// If no tenant ID found, return error
		if tenantID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No tenant context available"})
			c.Abort()
			return
		}

		// Verify user has access to this tenant
		var tenantUser models.TenantUser
		if err := db.Where("tenant_id = ? AND user_id = ? AND status = ?", tenantID, claims.UserID, "active").First(&tenantUser).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this tenant"})
			c.Abort()
			return
		}

		// Verify tenant is active
		var tenant models.Tenant
		if err := db.First(&tenant, tenantID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
			c.Abort()
			return
		}

		if !tenant.IsActive() {
			c.JSON(http.StatusForbidden, gin.H{"error": "Tenant is not active"})
			c.Abort()
			return
		}

		// Set tenant context
		c.Set("tenant_id", *tenantID)
		c.Set("tenant", &tenant)
		c.Set("tenant_role", tenantUser.Role)

		// Update user claims with tenant info
		claims.TenantID = tenantID
		c.Set("user", claims)

		c.Next()
	}
}

// OptionalTenantMiddleware provides optional tenant context
func OptionalTenantMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user claims (may not exist for public endpoints)
		userClaims, exists := c.Get("user")
		if !exists {
			c.Next()
			return
		}

		claims := userClaims.(*auth.Claims)

		// Try to get tenant ID
		var tenantID *uuid.UUID

		// From JWT claims
		if claims.TenantID != nil {
			tenantID = claims.TenantID
		} else {
			// From header
			if tenantHeader := c.GetHeader("X-Tenant-ID"); tenantHeader != "" {
				if tid, err := uuid.Parse(tenantHeader); err == nil {
					tenantID = &tid
				}
			}

			// From user's default tenant
			if tenantID == nil {
				var user models.User
				if err := db.First(&user, claims.UserID).Error; err == nil && user.DefaultTenantID != nil {
					tenantID = user.DefaultTenantID
				}
			}
		}

		// If tenant ID found, verify and set context
		if tenantID != nil {
			// Verify user access
			var tenantUser models.TenantUser
			if err := db.Where("tenant_id = ? AND user_id = ? AND status = ?", tenantID, claims.UserID, "active").First(&tenantUser).Error; err == nil {
				// Verify tenant is active
				var tenant models.Tenant
				if err := db.First(&tenant, tenantID).Error; err == nil && tenant.IsActive() {
					// Set tenant context
					c.Set("tenant_id", *tenantID)
					c.Set("tenant", &tenant)
					c.Set("tenant_role", tenantUser.Role)

					// Update user claims
					claims.TenantID = tenantID
					c.Set("user", claims)
				}
			}
		}

		c.Next()
	}
}

// RequireTenantRole middleware requires specific tenant role
func RequireTenantRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantRole, exists := c.Get("tenant_role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Tenant context required"})
			c.Abort()
			return
		}

		role := tenantRole.(string)
		for _, requiredRole := range roles {
			if role == requiredRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient tenant permissions"})
		c.Abort()
	}
}

// TenantScopedRepository provides tenant-scoped database queries
type TenantScopedRepository struct {
	db       *gorm.DB
	tenantID uuid.UUID
}

// NewTenantScopedRepository creates a new tenant-scoped repository
func NewTenantScopedRepository(db *gorm.DB, tenantID uuid.UUID) *TenantScopedRepository {
	return &TenantScopedRepository{
		db:       db,
		tenantID: tenantID,
	}
}

// DB returns a database instance scoped to the tenant
func (r *TenantScopedRepository) DB() *gorm.DB {
	return r.db.Where("tenant_id = ?", r.tenantID)
}

// Create creates a record with tenant ID automatically set
func (r *TenantScopedRepository) Create(value interface{}) *gorm.DB {
	// Set tenant ID if the model has TenantID field
	if tenantModel, ok := value.(interface {
		GetTenantID() *uuid.UUID
		SetTenantID(uuid.UUID)
	}); ok {
		if tenantModel.GetTenantID() == nil || *tenantModel.GetTenantID() == (uuid.UUID{}) {
			tenantModel.SetTenantID(r.tenantID)
		}
	}
	return r.db.Create(value)
}

// Find finds records scoped to tenant
func (r *TenantScopedRepository) Find(dest interface{}, conds ...interface{}) *gorm.DB {
	return r.db.Where("tenant_id = ?", r.tenantID).Find(dest, conds...)
}

// First finds first record scoped to tenant
func (r *TenantScopedRepository) First(dest interface{}, conds ...interface{}) *gorm.DB {
	return r.db.Where("tenant_id = ?", r.tenantID).First(dest, conds...)
}

// Update updates records scoped to tenant
func (r *TenantScopedRepository) Update(column string, value interface{}) *gorm.DB {
	return r.db.Where("tenant_id = ?", r.tenantID).Update(column, value)
}

// Updates updates records scoped to tenant
func (r *TenantScopedRepository) Updates(values interface{}) *gorm.DB {
	return r.db.Where("tenant_id = ?", r.tenantID).Updates(values)
}

// Delete soft deletes records scoped to tenant
func (r *TenantScopedRepository) Delete(value interface{}, conds ...interface{}) *gorm.DB {
	return r.db.Where("tenant_id = ?", r.tenantID).Delete(value, conds...)
}

// GetTenantScopedDB extracts tenant-scoped repository from gin context
func GetTenantScopedDB(c *gin.Context, db *gorm.DB) (*TenantScopedRepository, error) {
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		return nil, fmt.Errorf("tenant context not found")
	}

	return NewTenantScopedRepository(db, tenantID.(uuid.UUID)), nil
}

