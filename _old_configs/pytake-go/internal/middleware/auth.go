package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/redis"
	"gorm.io/gorm"
)

// AuthMiddleware provides JWT authentication middleware
func AuthMiddleware(db *gorm.DB, rdb *redis.Client, cfg *config.Config) gin.HandlerFunc {
	service := auth.NewService(db, rdb, cfg)

	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check Bearer token format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Validate token
		token := parts[1]
		claims, err := service.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("user", claims)
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		if claims.TenantID != nil {
			c.Set("tenant_id", *claims.TenantID)
		}

		c.Next()
	}
}

// OptionalAuthMiddleware provides optional JWT authentication
func OptionalAuthMiddleware(db *gorm.DB, rdb *redis.Client, cfg *config.Config) gin.HandlerFunc {
	service := auth.NewService(db, rdb, cfg)

	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Check Bearer token format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		// Validate token
		token := parts[1]
		claims, err := service.ValidateToken(token)
		if err != nil {
			c.Next()
			return
		}

		// Set user information in context
		c.Set("user", claims)
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		if claims.TenantID != nil {
			c.Set("tenant_id", *claims.TenantID)
		}

		c.Next()
	}
}

// RequireRole middleware requires specific user role
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		role := userRole.(string)
		for _, requiredRole := range roles {
			if role == requiredRole {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		c.Abort()
	}
}

// RequireTenant middleware requires user to belong to a tenant
func RequireTenant() gin.HandlerFunc {
	return func(c *gin.Context) {
		_, exists := c.Get("tenant_id")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Tenant access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}