package tenant

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/logger"
	"gorm.io/gorm"
)

// Handler handles tenant HTTP requests
type Handler struct {
	service   *Service
	validator *validator.Validate
	logger    *logger.Logger
}

// NewHandler creates a new tenant handler
func NewHandler(db *gorm.DB, cfg *config.Config, log *logger.Logger) *Handler {
	return &Handler{
		service:   NewService(db),
		validator: validator.New(),
		logger:    log,
	}
}

// CreateTenant creates a new tenant
func (h *Handler) CreateTenant(c *gin.Context) {
	var req CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Get user ID from context
	userClaims, exists := c.Get("user")
	if !exists {
		h.errorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	claims := userClaims.(*auth.Claims)

	// Create tenant
	tenant, err := h.service.CreateTenant(&req, claims.UserID)
	if err != nil {
		h.logger.Errorw("Failed to create tenant", "error", err, "user_id", claims.UserID)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to create tenant", err)
		return
	}

	h.logger.Infow("Tenant created successfully", "tenant_id", tenant.ID, "user_id", claims.UserID)
	c.JSON(http.StatusCreated, h.buildTenantResponse(tenant))
}

// GetTenant gets tenant by ID
func (h *Handler) GetTenant(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid tenant ID", err)
		return
	}

	tenant, err := h.service.GetTenantByID(tenantID)
	if err != nil {
		h.errorResponse(c, http.StatusNotFound, "Tenant not found", err)
		return
	}

	c.JSON(http.StatusOK, h.buildTenantResponse(tenant))
}

// GetMyTenants gets all tenants for current user
func (h *Handler) GetMyTenants(c *gin.Context) {
	userClaims, exists := c.Get("user")
	if !exists {
		h.errorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	claims := userClaims.(*auth.Claims)
	tenants, err := h.service.GetUserTenants(claims.UserID)
	if err != nil {
		h.logger.Errorw("Failed to get user tenants", "error", err, "user_id", claims.UserID)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to get tenants", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"tenants": tenants})
}

// UpdateTenant updates tenant information
func (h *Handler) UpdateTenant(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid tenant ID", err)
		return
	}

	var req UpdateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	userClaims, exists := c.Get("user")
	if !exists {
		h.errorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	claims := userClaims.(*auth.Claims)
	tenant, err := h.service.UpdateTenant(tenantID, &req, claims.UserID)
	if err != nil {
		if err.Error() == "insufficient permissions" {
			h.errorResponse(c, http.StatusForbidden, "Insufficient permissions", nil)
			return
		}
		h.logger.Errorw("Failed to update tenant", "error", err, "tenant_id", tenantID, "user_id", claims.UserID)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to update tenant", err)
		return
	}

	h.logger.Infow("Tenant updated successfully", "tenant_id", tenantID, "user_id", claims.UserID)
	c.JSON(http.StatusOK, h.buildTenantResponse(tenant))
}

// InviteUser invites a user to join tenant
func (h *Handler) InviteUser(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid tenant ID", err)
		return
	}

	var req InviteUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	userClaims, exists := c.Get("user")
	if !exists {
		h.errorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	claims := userClaims.(*auth.Claims)
	invite, err := h.service.InviteUser(tenantID, &req, claims.UserID)
	if err != nil {
		if err.Error() == "insufficient permissions" {
			h.errorResponse(c, http.StatusForbidden, "Insufficient permissions", nil)
			return
		}
		h.logger.Errorw("Failed to invite user", "error", err, "tenant_id", tenantID, "user_id", claims.UserID)
		h.errorResponse(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	h.logger.Infow("User invited successfully", "tenant_id", tenantID, "email", req.Email, "inviter_id", claims.UserID)
	c.JSON(http.StatusCreated, gin.H{
		"message": "Invitation sent successfully",
		"invite_id": invite.ID,
	})
}

// AcceptInvite accepts a tenant invitation
func (h *Handler) AcceptInvite(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		h.errorResponse(c, http.StatusBadRequest, "Invalid invite token", nil)
		return
	}

	userClaims, exists := c.Get("user")
	if !exists {
		h.errorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	claims := userClaims.(*auth.Claims)
	err := h.service.AcceptInvite(token, claims.UserID)
	if err != nil {
		h.logger.Errorw("Failed to accept invite", "error", err, "token", token, "user_id", claims.UserID)
		h.errorResponse(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	h.logger.Infow("Invite accepted successfully", "token", token, "user_id", claims.UserID)
	c.JSON(http.StatusOK, gin.H{"message": "Invitation accepted successfully"})
}

// SwitchTenant switches user's current tenant context
func (h *Handler) SwitchTenant(c *gin.Context) {
	var req SwitchTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	userClaims, exists := c.Get("user")
	if !exists {
		h.errorResponse(c, http.StatusUnauthorized, "User not authenticated", nil)
		return
	}

	claims := userClaims.(*auth.Claims)

	// Verify user has access to the tenant
	tenants, err := h.service.GetUserTenants(claims.UserID)
	if err != nil {
		h.errorResponse(c, http.StatusInternalServerError, "Failed to verify tenant access", err)
		return
	}

	hasAccess := false
	for _, tenant := range tenants {
		if tenant.TenantID == req.TenantID {
			hasAccess = true
			break
		}
	}

	if !hasAccess {
		h.errorResponse(c, http.StatusForbidden, "User does not have access to this tenant", nil)
		return
	}

	// Update claims and set in context
	claims.TenantID = &req.TenantID
	c.Set("user", claims)
	c.Set("tenant_id", req.TenantID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Tenant switched successfully",
		"tenant_id": req.TenantID,
	})
}

// GetCurrentTenant gets current tenant information
func (h *Handler) GetCurrentTenant(c *gin.Context) {
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "No tenant context", nil)
		return
	}

	tenant, err := h.service.GetTenantByID(tenantID.(uuid.UUID))
	if err != nil {
		h.errorResponse(c, http.StatusNotFound, "Current tenant not found", err)
		return
	}

	c.JSON(http.StatusOK, h.buildTenantResponse(tenant))
}

// buildTenantResponse builds a tenant response DTO
func (h *Handler) buildTenantResponse(tenant *models.Tenant) *TenantResponse {
	// Convert JSON settings to TenantSettings struct
	settings := models.TenantSettings{}
	if tenant.Settings != nil {
		if maxUsers, ok := tenant.Settings["max_users"].(float64); ok {
			settings.MaxUsers = int(maxUsers)
		}
		if maxConfigs, ok := tenant.Settings["max_whatsapp_configs"].(float64); ok {
			settings.MaxWhatsAppConfigs = int(maxConfigs)
		}
		if features, ok := tenant.Settings["features"].(map[string]interface{}); ok {
			settings.Features = make(map[string]bool)
			for k, v := range features {
				if b, ok := v.(bool); ok {
					settings.Features[k] = b
				}
			}
		}
		if branding, ok := tenant.Settings["branding"].(map[string]interface{}); ok {
			if theme, ok := branding["theme"].(string); ok {
				settings.Branding.Theme = theme
			}
		}
		if rateLimit, ok := tenant.Settings["rate_limit"].(map[string]interface{}); ok {
			if rps, ok := rateLimit["requests_per_second"].(float64); ok {
				settings.RateLimit.RequestsPerSecond = int(rps)
			}
			if burst, ok := rateLimit["burst_limit"].(float64); ok {
				settings.RateLimit.BurstLimit = int(burst)
			}
		}
	}

	response := &TenantResponse{
		ID:        tenant.ID,
		Name:      tenant.Name,
		Domain:    tenant.Domain,
		Status:    tenant.Status,
		Plan:      tenant.Plan,
		Settings:  settings,
		ExpiresAt: tenant.ExpiresAt,
		CreatedAt: tenant.CreatedAt,
		UpdatedAt: tenant.UpdatedAt,
		MemberCount: len(tenant.Members),
	}

	// Add owner info if available
	if tenant.Owner.ID != (uuid.UUID{}) {
		response.Owner = UserSummary{
			ID:    tenant.Owner.ID,
			Name:  tenant.Owner.Name,
			Email: tenant.Owner.Email,
		}
	}

	return response
}

// errorResponse sends error response
func (h *Handler) errorResponse(c *gin.Context, statusCode int, message string, err error) {
	response := ErrorResponse{
		Error: message,
	}

	if err != nil {
		response.Message = err.Error()
	}

	c.JSON(statusCode, response)
}

// validationErrorResponse handles validation errors
func (h *Handler) validationErrorResponse(c *gin.Context, err error) {
	details := make(map[string]interface{})

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			field := fieldError.Field()
			switch fieldError.Tag() {
			case "required":
				details[field] = "This field is required"
			case "email":
				details[field] = "Invalid email format"
			case "min":
				details[field] = "Value is too short"
			case "max":
				details[field] = "Value is too long"
			case "oneof":
				details[field] = "Invalid value"
			case "fqdn":
				details[field] = "Invalid domain format"
			default:
				details[field] = "Invalid value"
			}
		}
	}

	response := ErrorResponse{
		Error:   "Validation failed",
		Details: details,
	}

	c.JSON(http.StatusBadRequest, response)
}