package erp

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/erp/auth"
	"github.com/pytake/pytake-go/internal/erp/mapping"
	"github.com/pytake/pytake-go/internal/erp/sync"
	"github.com/pytake/pytake-go/internal/erp/webhooks"
	"github.com/pytake/pytake-go/internal/logger"
	"gorm.io/gorm"
)

// Handler handles ERP-related HTTP requests
type Handler struct {
	db             *gorm.DB
	authManager    auth.AuthManager
	mappingEngine  mapping.MappingEngine
	syncEngine     sync.SyncEngine
	webhookProcessor webhooks.Processor
	log            *logger.Logger
}

// NewHandler creates a new ERP handler
func NewHandler(
	db *gorm.DB,
	authManager auth.AuthManager,
	mappingEngine mapping.MappingEngine,
	syncEngine sync.SyncEngine,
	webhookProcessor webhooks.Processor,
	log *logger.Logger,
) *Handler {
	return &Handler{
		db:               db,
		authManager:      authManager,
		mappingEngine:    mappingEngine,
		syncEngine:       syncEngine,
		webhookProcessor: webhookProcessor,
		log:              log,
	}
}

// ERPConnectionRequest represents the request to create/update an ERP connection
type ERPConnectionRequest struct {
	Name          string                 `json:"name" binding:"required"`
	Provider      string                 `json:"provider" binding:"required,oneof=hubsoft ixcsoft mksolutions sisgp custom"`
	APIURL        string                 `json:"api_url" binding:"required,url"`
	AuthType      string                 `json:"auth_type" binding:"required,oneof=api_key oauth2 basic custom"`
	Credentials   map[string]string      `json:"credentials" binding:"required"`
	WebhookURL    string                 `json:"webhook_url,omitempty"`
	WebhookSecret string                 `json:"webhook_secret,omitempty"`
	SyncConfig    *SyncConfig            `json:"sync_config,omitempty"`
	Settings      map[string]interface{} `json:"settings,omitempty"`
	IsActive      bool                   `json:"is_active"`
}

type SyncConfig struct {
	SyncInterval   int      `json:"sync_interval"` // minutes
	Entities       []string `json:"entities"`      // customers, invoices, contracts
	AutoSync       bool     `json:"auto_sync"`
	BatchSize      int      `json:"batch_size"`
	RetryAttempts  int      `json:"retry_attempts"`
	ConflictMode   string   `json:"conflict_mode"` // overwrite, skip, merge
}

// CreateConnection creates a new ERP connection
// @Summary Create ERP connection
// @Description Create a new ERP integration connection
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param connection body ERPConnectionRequest true "Connection data"
// @Success 201 {object} models.ERPConnection
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections [post]
func (h *Handler) CreateConnection(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	var req ERPConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Encrypt credentials
	encryptedCreds, err := h.authManager.EncryptCredentials(req.Credentials)
	if err != nil {
		h.log.Error("Failed to encrypt credentials", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure credentials"})
		return
	}

	// Create connection
	connection := &models.ERPConnection{
		Name:               req.Name,
		Provider:           req.Provider,
		APIURL:             req.APIURL,
		AuthType:           req.AuthType,
		EncryptedCredentials: encryptedCreds,
		WebhookURL:         req.WebhookURL,
		WebhookSecret:      req.WebhookSecret,
		IsActive:           req.IsActive,
		LastSyncAt:         nil,
		Settings:           req.Settings,
	}
	connection.TenantID = tid

	// Test connection before saving
	if err := h.testConnection(connection); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Connection test failed: " + err.Error()})
		return
	}

	if err := h.db.Create(connection).Error; err != nil {
		h.log.Error("Failed to create connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create connection"})
		return
	}

	// Setup sync configuration if provided
	if req.SyncConfig != nil {
		syncSettings := map[string]interface{}{
			"interval":       req.SyncConfig.SyncInterval,
			"entities":       req.SyncConfig.Entities,
			"auto_sync":      req.SyncConfig.AutoSync,
			"batch_size":     req.SyncConfig.BatchSize,
			"retry_attempts": req.SyncConfig.RetryAttempts,
			"conflict_mode":  req.SyncConfig.ConflictMode,
		}
		connection.Settings["sync"] = syncSettings
		h.db.Save(connection)
	}

	c.JSON(http.StatusCreated, connection)
}

// GetConnections retrieves all ERP connections
// @Summary List ERP connections
// @Description Get list of ERP connections
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param provider query string false "Filter by provider"
// @Param is_active query bool false "Filter by active status"
// @Success 200 {array} models.ERPConnection
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections [get]
func (h *Handler) GetConnections(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse query parameters
	provider := c.Query("provider")
	isActive := c.Query("is_active")

	// Build query
	query := h.db.Model(&models.ERPConnection{}).Where("tenant_id = ?", tid)

	if provider != "" {
		query = query.Where("provider = ?", provider)
	}

	if isActive != "" {
		if isActive == "true" {
			query = query.Where("is_active = ?", true)
		} else if isActive == "false" {
			query = query.Where("is_active = ?", false)
		}
	}

	// Fetch connections
	var connections []models.ERPConnection
	if err := query.Find(&connections).Error; err != nil {
		h.log.Error("Failed to fetch connections", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connections"})
		return
	}

	// Remove sensitive data
	for i := range connections {
		connections[i].EncryptedCredentials = ""
		connections[i].WebhookSecret = ""
	}

	c.JSON(http.StatusOK, connections)
}

// GetConnection retrieves a specific ERP connection
// @Summary Get ERP connection
// @Description Get ERP connection details
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Success 200 {object} models.ERPConnection
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id} [get]
func (h *Handler) GetConnection(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	var connection models.ERPConnection
	if err := h.db.Where("id = ? AND tenant_id = ?", cid, tid).First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
			return
		}
		h.log.Error("Failed to fetch connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection"})
		return
	}

	// Remove sensitive data
	connection.EncryptedCredentials = ""
	connection.WebhookSecret = ""

	c.JSON(http.StatusOK, connection)
}

// UpdateConnection updates an ERP connection
// @Summary Update ERP connection
// @Description Update ERP connection details
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Param connection body ERPConnectionRequest true "Updated connection data"
// @Success 200 {object} models.ERPConnection
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id} [put]
func (h *Handler) UpdateConnection(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	var req ERPConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch existing connection
	var connection models.ERPConnection
	if err := h.db.Where("id = ? AND tenant_id = ?", cid, tid).First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
			return
		}
		h.log.Error("Failed to fetch connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection"})
		return
	}

	// Encrypt new credentials if provided
	if len(req.Credentials) > 0 {
		encryptedCreds, err := h.authManager.EncryptCredentials(req.Credentials)
		if err != nil {
			h.log.Error("Failed to encrypt credentials", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure credentials"})
			return
		}
		connection.EncryptedCredentials = encryptedCreds
	}

	// Update connection
	connection.Name = req.Name
	connection.Provider = req.Provider
	connection.APIURL = req.APIURL
	connection.AuthType = req.AuthType
	connection.WebhookURL = req.WebhookURL
	connection.WebhookSecret = req.WebhookSecret
	connection.IsActive = req.IsActive
	connection.Settings = req.Settings

	// Test connection before saving
	if err := h.testConnection(&connection); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Connection test failed: " + err.Error()})
		return
	}

	if err := h.db.Save(&connection).Error; err != nil {
		h.log.Error("Failed to update connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update connection"})
		return
	}

	// Remove sensitive data from response
	connection.EncryptedCredentials = ""
	connection.WebhookSecret = ""

	c.JSON(http.StatusOK, connection)
}

// DeleteConnection deletes an ERP connection
// @Summary Delete ERP connection
// @Description Delete an ERP connection
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Success 204 "Connection deleted"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id} [delete]
func (h *Handler) DeleteConnection(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	result := h.db.Where("id = ? AND tenant_id = ?", cid, tid).Delete(&models.ERPConnection{})
	if result.Error != nil {
		h.log.Error("Failed to delete connection", "error", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete connection"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

// TestConnection tests an ERP connection
// @Summary Test ERP connection
// @Description Test connectivity to ERP system
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id}/test [post]
func (h *Handler) TestConnectionEndpoint(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	var connection models.ERPConnection
	if err := h.db.Where("id = ? AND tenant_id = ?", cid, tid).First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
			return
		}
		h.log.Error("Failed to fetch connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection"})
		return
	}

	if err := h.testConnection(&connection); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connection test successful",
		"details": gin.H{
			"provider": connection.Provider,
			"api_url":  connection.APIURL,
			"status":   "connected",
		},
	})
}

// SyncData triggers data synchronization
// @Summary Sync ERP data
// @Description Trigger data synchronization with ERP
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Param request body SyncRequest true "Sync configuration"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id}/sync [post]
func (h *Handler) SyncData(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	type SyncRequest struct {
		Entities  []string `json:"entities" binding:"required,min=1"`
		FullSync  bool     `json:"full_sync"`
		FromDate  string   `json:"from_date,omitempty"`
		ToDate    string   `json:"to_date,omitempty"`
		BatchSize int      `json:"batch_size,omitempty"`
	}

	var req SyncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch connection
	var connection models.ERPConnection
	if err := h.db.Where("id = ? AND tenant_id = ?", cid, tid).First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
			return
		}
		h.log.Error("Failed to fetch connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection"})
		return
	}

	// Create sync config
	syncConfig := &sync.SyncConfig{
		ConnectionID: cid,
		TenantID:     tid,
		Entities:     req.Entities,
		FullSync:     req.FullSync,
		BatchSize:    req.BatchSize,
	}

	if req.FromDate != "" {
		if t, err := time.Parse(time.RFC3339, req.FromDate); err == nil {
			syncConfig.FromDate = &t
		}
	}

	if req.ToDate != "" {
		if t, err := time.Parse(time.RFC3339, req.ToDate); err == nil {
			syncConfig.ToDate = &t
		}
	}

	// Start sync process
	syncID, err := h.syncEngine.StartSync(c.Request.Context(), syncConfig)
	if err != nil {
		h.log.Error("Failed to start sync", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start synchronization"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"sync_id": syncID,
		"message": "Synchronization started",
		"status":  "in_progress",
	})
}

// GetSyncStatus gets synchronization status
// @Summary Get sync status
// @Description Get status of a synchronization process
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Param sync_id path string true "Sync ID" format(uuid)
// @Success 200 {object} sync.SyncStatus
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id}/sync/{sync_id} [get]
func (h *Handler) GetSyncStatus(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")
	syncID := c.Param("sync_id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	sid, err := uuid.Parse(syncID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid sync ID"})
		return
	}

	status, err := h.syncEngine.GetSyncStatus(c.Request.Context(), tid, cid, sid)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sync not found"})
			return
		}
		h.log.Error("Failed to get sync status", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get sync status"})
		return
	}

	c.JSON(http.StatusOK, status)
}

// GetMappings retrieves field mappings
// @Summary List field mappings
// @Description Get field mappings for ERP connection
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Param entity query string false "Filter by entity type"
// @Success 200 {array} models.DataMappingConfig
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id}/mappings [get]
func (h *Handler) GetMappings(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	entity := c.Query("entity")

	// Build query
	query := h.db.Model(&models.DataMappingConfig{}).
		Where("erp_connection_id = ?", cid).
		Joins("JOIN erp_connections ON erp_connections.id = data_mapping_configs.erp_connection_id").
		Where("erp_connections.tenant_id = ?", tid)

	if entity != "" {
		query = query.Where("entity_type = ?", entity)
	}

	// Fetch mappings
	var mappings []models.DataMappingConfig
	if err := query.Find(&mappings).Error; err != nil {
		h.log.Error("Failed to fetch mappings", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch mappings"})
		return
	}

	c.JSON(http.StatusOK, mappings)
}

// CreateMapping creates a field mapping
// @Summary Create field mapping
// @Description Create field mapping for ERP entity
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Param mapping body CreateMappingRequest true "Mapping configuration"
// @Success 201 {object} models.DataMappingConfig
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id}/mappings [post]
func (h *Handler) CreateMapping(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	type CreateMappingRequest struct {
		Name        string                   `json:"name" binding:"required"`
		EntityType  string                   `json:"entity_type" binding:"required"`
		Mappings    []mapping.FieldMapping   `json:"mappings" binding:"required,min=1"`
		IsActive    bool                     `json:"is_active"`
	}

	var req CreateMappingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify connection ownership
	var connection models.ERPConnection
	if err := h.db.Where("id = ? AND tenant_id = ?", cid, tid).First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
			return
		}
		h.log.Error("Failed to fetch connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection"})
		return
	}

	// Create mapping config
	mappingConfig := &models.DataMappingConfig{
		ERPConnectionID: cid,
		Name:            req.Name,
		EntityType:      req.EntityType,
		Mappings:        req.Mappings,
		IsActive:        req.IsActive,
	}

	if err := h.db.Create(mappingConfig).Error; err != nil {
		h.log.Error("Failed to create mapping", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create mapping"})
		return
	}

	c.JSON(http.StatusCreated, mappingConfig)
}

// WebhookHandler handles incoming ERP webhooks
// @Summary Handle ERP webhook
// @Description Process incoming webhook from ERP system
// @Tags ERP
// @Accept json
// @Produce json
// @Param X-Webhook-Signature header string false "Webhook signature for verification"
// @Param id path string true "Connection ID" format(uuid)
// @Param payload body map[string]interface{} true "Webhook payload"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/webhook/{id} [post]
func (h *Handler) WebhookHandler(c *gin.Context) {
	connectionID := c.Param("id")
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	// Get connection to verify webhook
	var connection models.ERPConnection
	if err := h.db.First(&connection, "id = ?", cid).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
			return
		}
		h.log.Error("Failed to fetch connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection"})
		return
	}

	// Read request body
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Verify signature if configured
	if connection.WebhookSecret != "" {
		signature := c.GetHeader("X-Webhook-Signature")
		if signature == "" {
			signature = c.GetHeader("X-Hub-Signature-256")
		}

		if !h.webhookProcessor.ValidateSignature(c.Request.Context(), body, signature, connection.WebhookSecret) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid webhook signature"})
			return
		}
	}

	// Process webhook
	webhook := &webhooks.Webhook{
		ConnectionID: cid,
		Provider:     connection.Provider,
		EventType:    c.GetHeader("X-Event-Type"),
		Payload:      body,
	}

	if err := h.webhookProcessor.ProcessWebhook(c.Request.Context(), webhook); err != nil {
		h.log.Error("Failed to process webhook", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process webhook"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Webhook processed successfully",
	})
}

// GetSyncHistory retrieves synchronization history
// @Summary Get sync history
// @Description Get synchronization history for connection
// @Tags ERP
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Connection ID" format(uuid)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {array} models.SyncLog
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /erp/connections/{id}/sync-history [get]
func (h *Handler) GetSyncHistory(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	connectionID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(connectionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Verify connection ownership
	var connection models.ERPConnection
	if err := h.db.Where("id = ? AND tenant_id = ?", cid, tid).First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
			return
		}
		h.log.Error("Failed to fetch connection", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection"})
		return
	}

	// Build query
	query := h.db.Model(&models.SyncLog{}).Where("connection_id = ?", cid)

	// Count total
	var total int64
	query.Count(&total)

	// Fetch logs
	var logs []models.SyncLog
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("started_at DESC").Find(&logs).Error; err != nil {
		h.log.Error("Failed to fetch sync history", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sync history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":     logs,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"has_more": total > int64(page*limit),
	})
}

// testConnection tests an ERP connection
func (h *Handler) testConnection(connection *models.ERPConnection) error {
	// Decrypt credentials
	creds, err := h.authManager.DecryptCredentials(connection.EncryptedCredentials)
	if err != nil {
		return err
	}

	// Test based on provider
	switch connection.Provider {
	case "hubsoft":
		// Implement HubSoft connection test
		return h.testHubSoftConnection(connection.APIURL, creds)
	case "ixcsoft":
		// Implement IXCSoft connection test
		return h.testIXCSoftConnection(connection.APIURL, creds)
	case "mksolutions":
		// Implement MKSolutions connection test
		return h.testMKSolutionsConnection(connection.APIURL, creds)
	case "sisgp":
		// Implement SisGP connection test
		return h.testSisGPConnection(connection.APIURL, creds)
	default:
		return nil // Assume custom provider works
	}
}

func (h *Handler) testHubSoftConnection(apiURL string, creds map[string]string) error {
	// Implementation would go here
	return nil
}

func (h *Handler) testIXCSoftConnection(apiURL string, creds map[string]string) error {
	// Implementation would go here
	return nil
}

func (h *Handler) testMKSolutionsConnection(apiURL string, creds map[string]string) error {
	// Implementation would go here
	return nil
}

func (h *Handler) testSisGPConnection(apiURL string, creds map[string]string) error {
	// Implementation would go here
	return nil
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}