package whatsapp

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/logger"
	"github.com/pytake/pytake-go/internal/redis"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Handler handles WhatsApp HTTP requests
type Handler struct {
	service         *Service
	webhookHandler  *WebhookHandler
	validator       *validator.Validate
	logger          *zap.SugaredLogger
}

// NewHandler creates a new WhatsApp handler
func NewHandler(db *gorm.DB, rdb *redis.Client, cfg *config.Config, log *logger.Logger) *Handler {
	// Create service with encryption key from config
	encryptKey := cfg.JWTSecret // Use JWT secret as encryption key for now
	if len(encryptKey) < 32 {
		// Pad to 32 bytes if needed
		encryptKey = encryptKey + "0000000000000000000000000000000000"
	}
	
	zapLogger := zap.NewNop().Sugar() // Use a noop logger for now
	service := NewService(db, rdb, zapLogger, encryptKey[:32])
	webhookHandler := NewWebhookHandler(db, zapLogger, service)
	
	return &Handler{
		service:        service,
		webhookHandler: webhookHandler,
		validator:      validator.New(),
		logger:         zapLogger,
	}
}

// CreateConfig creates a new WhatsApp configuration
func (h *Handler) CreateConfig(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	var req CreateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Create config
	config, err := h.service.CreateConfig(tenantID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Errorw("Failed to create WhatsApp config",
			"error", err,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to create configuration", err)
		return
	}

	h.logger.Infow("WhatsApp config created",
		"config_id", config.ID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusCreated, h.buildConfigResponse(config))
}

// GetConfig gets a WhatsApp configuration
func (h *Handler) GetConfig(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse config ID
	configID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid config ID", err)
		return
	}

	// Get config
	config, err := h.service.GetConfig(configID, tenantID.(uuid.UUID))
	if err != nil {
		h.errorResponse(c, http.StatusNotFound, "Configuration not found", err)
		return
	}

	c.JSON(http.StatusOK, h.buildConfigResponse(config))
}

// GetConfigs lists all WhatsApp configurations for a tenant
func (h *Handler) GetConfigs(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Get configs
	configs, err := h.service.GetConfigs(tenantID.(uuid.UUID))
	if err != nil {
		h.logger.Errorw("Failed to get WhatsApp configs",
			"error", err,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to get configurations", err)
		return
	}

	// Build response
	response := make([]ConfigResponse, 0, len(configs))
	for _, config := range configs {
		response = append(response, *h.buildConfigResponse(&config))
	}

	c.JSON(http.StatusOK, gin.H{"configs": response})
}

// UpdateConfig updates a WhatsApp configuration
func (h *Handler) UpdateConfig(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse config ID
	configID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid config ID", err)
		return
	}

	var req UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Update config
	config, err := h.service.UpdateConfig(configID, tenantID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Errorw("Failed to update WhatsApp config",
			"error", err,
			"config_id", configID,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to update configuration", err)
		return
	}

	h.logger.Infow("WhatsApp config updated",
		"config_id", configID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusOK, h.buildConfigResponse(config))
}

// DeleteConfig deletes a WhatsApp configuration
func (h *Handler) DeleteConfig(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse config ID
	configID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid config ID", err)
		return
	}

	// Delete config
	if err := h.service.DeleteConfig(configID, tenantID.(uuid.UUID)); err != nil {
		h.logger.Errorw("Failed to delete WhatsApp config",
			"error", err,
			"config_id", configID,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to delete configuration", err)
		return
	}

	h.logger.Infow("WhatsApp config deleted",
		"config_id", configID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusOK, gin.H{"message": "Configuration deleted successfully"})
}

// TestConfig tests a WhatsApp configuration
func (h *Handler) TestConfig(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse config ID
	configID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid config ID", err)
		return
	}

	// Test config
	if err := h.service.TestConfig(configID, tenantID.(uuid.UUID)); err != nil {
		h.logger.Errorw("WhatsApp config test failed",
			"error", err,
			"config_id", configID,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusBadRequest, "Configuration test failed", err)
		return
	}

	h.logger.Infow("WhatsApp config test successful",
		"config_id", configID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Configuration is valid and working",
	})
}

// SendMessage sends a WhatsApp message
func (h *Handler) SendMessage(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Send message
	response, err := h.service.SendMessage(tenantID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Errorw("Failed to send WhatsApp message",
			"error", err,
			"tenant_id", tenantID,
			"to", req.To,
			"type", req.Type,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to send message", err)
		return
	}

	h.logger.Infow("WhatsApp message sent",
		"message_id", response.MessageID,
		"to", req.To,
		"type", req.Type,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusOK, response)
}

// VerifyWebhook handles webhook verification from WhatsApp
func (h *Handler) VerifyWebhook(c *gin.Context) {
	h.webhookHandler.VerifyWebhook(c)
}

// HandleWebhook handles incoming webhook events from WhatsApp
func (h *Handler) HandleWebhook(c *gin.Context) {
	h.webhookHandler.HandleWebhook(c)
}

// buildConfigResponse builds a config response DTO
func (h *Handler) buildConfigResponse(config interface{}) *ConfigResponse {
	switch cfg := config.(type) {
	case *models.WhatsAppConfig:
		return &ConfigResponse{
			ID:                 cfg.ID,
			Name:               cfg.Name,
			PhoneNumberID:      cfg.PhoneNumberID,
			WebhookVerifyToken: cfg.WebhookVerifyToken,
			IsActive:           cfg.IsActive,
			CreatedAt:          cfg.CreatedAt,
			UpdatedAt:          cfg.UpdatedAt,
		}
	default:
		return nil
	}
}

// errorResponse sends error response
func (h *Handler) errorResponse(c *gin.Context, statusCode int, message string, err error) {
	response := gin.H{
		"error": message,
	}

	if err != nil && h.logger != nil {
		response["details"] = err.Error()
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
			case "url":
				details[field] = "Invalid URL format"
			case "min":
				details[field] = "Value is too short"
			case "max":
				details[field] = "Value is too long"
			case "oneof":
				details[field] = "Invalid value"
			default:
				details[field] = "Invalid value"
			}
		}
	}

	response := gin.H{
		"error":   "Validation failed",
		"details": details,
	}

	c.JSON(http.StatusBadRequest, response)
}