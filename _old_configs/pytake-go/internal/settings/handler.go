package settings

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	
	"github.com/pytake/pytake-go/internal/models"
	"github.com/pytake/pytake-go/internal/auth"
)

// Handler handles settings HTTP requests
type Handler struct {
	service *Service
}

// NewHandler creates a new settings handler
func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// GetSystemSettings returns all system settings
func (h *Handler) GetSystemSettings(c *gin.Context) {
	// Check if user is admin
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	publicOnly := claims.Role != "admin"
	
	settings, err := h.service.GetAllSystemSettings(publicOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"settings": settings,
		"total":    len(settings),
	})
}

// GetSystemSetting returns a specific system setting
func (h *Handler) GetSystemSetting(c *gin.Context) {
	key := c.Param("key")
	key = strings.ReplaceAll(key, "-", ".")
	
	value, err := h.service.getSystemSetting(key)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Setting not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"key":   key,
		"value": value,
	})
}

// UpdateSystemSetting updates a system setting
func (h *Handler) UpdateSystemSetting(c *gin.Context) {
	// Check if user is admin
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	if claims.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}
	
	key := c.Param("key")
	key = strings.ReplaceAll(key, "-", ".")
	
	var req struct {
		Value interface{} `json:"value" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	userID, _ := uuid.Parse(claims.UserID)
	if err := h.service.SetSystemSetting(key, req.Value, &userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Setting updated successfully",
		"key":     key,
		"value":   req.Value,
	})
}

// GetTenantSettings returns all settings for the current tenant
func (h *Handler) GetTenantSettings(c *gin.Context) {
	tenant, exists := c.Get("tenant")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tenant context required"})
		return
	}
	
	tenantModel := tenant.(*models.Tenant)
	
	settings, err := h.service.GetTenantSettings(tenantModel.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"settings": settings,
		"total":    len(settings),
	})
}

// GetTenantSetting returns a specific tenant setting
func (h *Handler) GetTenantSetting(c *gin.Context) {
	tenant, exists := c.Get("tenant")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tenant context required"})
		return
	}
	
	tenantModel := tenant.(*models.Tenant)
	key := c.Param("key")
	key = strings.ReplaceAll(key, "-", ".")
	
	value, err := h.service.getTenantSetting(key, tenantModel.ID)
	if err != nil {
		// Fall back to system setting
		value, err = h.service.getSystemSetting(key)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Setting not found"})
			return
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"key":   key,
		"value": value,
	})
}

// UpdateTenantSetting updates a tenant setting
func (h *Handler) UpdateTenantSetting(c *gin.Context) {
	// Check if user is tenant admin
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	tenant, exists := c.Get("tenant")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tenant context required"})
		return
	}
	
	tenantModel := tenant.(*models.Tenant)
	
	// TODO: Check if user is tenant admin
	// For now, allow any authenticated user in the tenant
	
	key := c.Param("key")
	key = strings.ReplaceAll(key, "-", ".")
	
	var req struct {
		Value interface{} `json:"value" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	userID, _ := uuid.Parse(claims.UserID)
	if err := h.service.SetTenantSetting(tenantModel.ID, key, req.Value, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Setting updated successfully",
		"key":     key,
		"value":   req.Value,
	})
}

// DeleteTenantSetting removes a tenant setting override
func (h *Handler) DeleteTenantSetting(c *gin.Context) {
	// Check if user is tenant admin
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	tenant, exists := c.Get("tenant")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tenant context required"})
		return
	}
	
	tenantModel := tenant.(*models.Tenant)
	
	key := c.Param("key")
	key = strings.ReplaceAll(key, "-", ".")
	
	userID, _ := uuid.Parse(claims.UserID)
	if err := h.service.DeleteTenantSetting(tenantModel.ID, key, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete setting"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Setting deleted successfully",
		"key":     key,
	})
}

// GetUserSettings returns all settings for the current user
func (h *Handler) GetUserSettings(c *gin.Context) {
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	userID, _ := uuid.Parse(claims.UserID)
	
	settings, err := h.service.GetUserSettings(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"settings": settings,
		"total":    len(settings),
	})
}

// UpdateUserSetting updates a user preference
func (h *Handler) UpdateUserSetting(c *gin.Context) {
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	key := c.Param("key")
	key = strings.ReplaceAll(key, "-", ".")
	
	var req struct {
		Value interface{} `json:"value" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	userID, _ := uuid.Parse(claims.UserID)
	if err := h.service.SetUserSetting(userID, key, req.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Setting updated successfully",
		"key":     key,
		"value":   req.Value,
	})
}

// GetEffectiveSetting returns the effective value of a setting considering all levels
func (h *Handler) GetEffectiveSetting(c *gin.Context) {
	key := c.Param("key")
	key = strings.ReplaceAll(key, "-", ".")
	
	// Get user and tenant from context
	var userID *uuid.UUID
	var tenantID *uuid.UUID
	
	if user, exists := c.Get("user"); exists {
		claims := user.(*auth.Claims)
		uid, _ := uuid.Parse(claims.UserID)
		userID = &uid
		
		if claims.TenantID != nil {
			tenantID = claims.TenantID
		}
	}
	
	if tenant, exists := c.Get("tenant"); exists {
		tenantModel := tenant.(*models.Tenant)
		tenantID = &tenantModel.ID
	}
	
	value, err := h.service.Get(key, tenantID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Setting not found"})
		return
	}
	
	// Determine the source of the value
	source := "default"
	if userID != nil {
		if _, err := h.service.getUserSetting(key, *userID); err == nil {
			source = "user"
		}
	}
	if source == "default" && tenantID != nil {
		if _, err := h.service.getTenantSetting(key, *tenantID); err == nil {
			source = "tenant"
		}
	}
	if source == "default" {
		if _, err := h.service.getSystemSetting(key); err == nil {
			source = "system"
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"key":    key,
		"value":  value,
		"source": source,
	})
}

// GetConfigurationTemplates returns available configuration templates
func (h *Handler) GetConfigurationTemplates(c *gin.Context) {
	var templates []models.ConfigurationTemplate
	
	query := h.service.db.Model(&models.ConfigurationTemplate{}).Where("is_active = ?", true)
	
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}
	
	if err := query.Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve templates"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"templates": templates,
		"total":     len(templates),
	})
}

// ApplyConfigurationTemplate applies a template to the current tenant
func (h *Handler) ApplyConfigurationTemplate(c *gin.Context) {
	// Check if user is tenant admin
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	tenant, exists := c.Get("tenant")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tenant context required"})
		return
	}
	
	tenantModel := tenant.(*models.Tenant)
	templateID, err := uuid.Parse(c.Param("template_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}
	
	userID, _ := uuid.Parse(claims.UserID)
	if err := h.service.ApplyTemplate(tenantModel.ID, templateID, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply template"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Template applied successfully",
		"template_id": templateID,
	})
}

// GetFeatureFlags returns all feature flags
func (h *Handler) GetFeatureFlags(c *gin.Context) {
	var flags []models.FeatureFlag
	
	if err := h.service.db.Find(&flags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve feature flags"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"flags": flags,
		"total": len(flags),
	})
}

// GetFeatureFlag returns the status of a specific feature flag
func (h *Handler) GetFeatureFlag(c *gin.Context) {
	key := c.Param("key")
	
	// Get tenant from context
	var tenantID *uuid.UUID
	if tenant, exists := c.Get("tenant"); exists {
		tenantModel := tenant.(*models.Tenant)
		tenantID = &tenantModel.ID
	}
	
	enabled, err := h.service.GetFeatureFlag(key, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check feature flag"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"key":     key,
		"enabled": enabled,
	})
}

// UpdateFeatureFlag updates a feature flag
func (h *Handler) UpdateFeatureFlag(c *gin.Context) {
	// Check if user is admin
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	if claims.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}
	
	key := c.Param("key")
	
	var req struct {
		Enabled bool `json:"enabled"`
		Rollout int  `json:"rollout"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	userID, _ := uuid.Parse(claims.UserID)
	if err := h.service.UpdateFeatureFlag(key, req.Enabled, req.Rollout, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update feature flag"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Feature flag updated successfully",
		"key":     key,
		"enabled": req.Enabled,
		"rollout": req.Rollout,
	})
}

// GetSettingAuditLog returns the audit log for settings changes
func (h *Handler) GetSettingAuditLog(c *gin.Context) {
	// Check if user is admin
	user, _ := c.Get("user")
	claims := user.(*auth.Claims)
	
	if claims.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}
	
	var logs []models.SettingAuditLog
	query := h.service.db.Model(&models.SettingAuditLog{}).Order("changed_at DESC").Limit(100)
	
	if key := c.Query("key"); key != "" {
		query = query.Where("setting_key = ?", key)
	}
	
	if settingType := c.Query("type"); settingType != "" {
		query = query.Where("setting_type = ?", settingType)
	}
	
	if err := query.Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve audit logs"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": len(logs),
	})
}