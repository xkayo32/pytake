package campaign

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/campaign/engine"
	"github.com/pytake/pytake-go/internal/campaign/segmentation"
	"github.com/pytake/pytake-go/internal/campaign/templates"
	"github.com/pytake/pytake-go/internal/campaign/analytics"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/logger"
	"gorm.io/gorm"
)

// Handler handles campaign-related HTTP requests
type Handler struct {
	db                *gorm.DB
	campaignEngine    engine.CampaignEngine
	segmentEngine     segmentation.SegmentationEngine
	templateEngine    templates.TemplateEngine
	analyticsEngine   analytics.AnalyticsEngine
	log               *logger.Logger
}

// NewHandler creates a new campaign handler
func NewHandler(
	db *gorm.DB,
	campaignEngine engine.CampaignEngine,
	segmentEngine segmentation.SegmentationEngine,
	templateEngine templates.TemplateEngine,
	analyticsEngine analytics.AnalyticsEngine,
	log *logger.Logger,
) *Handler {
	return &Handler{
		db:              db,
		campaignEngine:  campaignEngine,
		segmentEngine:   segmentEngine,
		templateEngine:  templateEngine,
		analyticsEngine: analyticsEngine,
		log:             log,
	}
}

// CreateCampaignRequest represents the request to create a campaign
type CreateCampaignRequest struct {
	Name             string                 `json:"name" binding:"required"`
	Description      string                 `json:"description"`
	Type             string                 `json:"type" binding:"required,oneof=broadcast scheduled recurring trigger"` 
	Status           string                 `json:"status,omitempty"`
	SegmentID        *uuid.UUID             `json:"segment_id"`
	SegmentCriteria  map[string]interface{} `json:"segment_criteria"`
	TemplateID       *uuid.UUID             `json:"template_id"`
	MessageContent   *MessageContent        `json:"message_content"`
	ScheduleConfig   *ScheduleConfig        `json:"schedule_config"`
	TargetConfig     *TargetConfig          `json:"target_config"`
	Settings         map[string]interface{} `json:"settings"`
	Tags             []string               `json:"tags"`
}

type MessageContent struct {
	Type      string                 `json:"type" binding:"required,oneof=text image document template"`
	Text      string                 `json:"text,omitempty"`
	MediaURL  string                 `json:"media_url,omitempty"`
	Caption   string                 `json:"caption,omitempty"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

type ScheduleConfig struct {
	StartAt      *time.Time `json:"start_at"`
	EndAt        *time.Time `json:"end_at"`
	Timezone     string     `json:"timezone"`
	Frequency    string     `json:"frequency,omitempty"` // daily, weekly, monthly
	DaysOfWeek   []string   `json:"days_of_week,omitempty"`
	TimeOfDay    string     `json:"time_of_day,omitempty"`
	BatchSize    int        `json:"batch_size,omitempty"`
	BatchDelay   int        `json:"batch_delay,omitempty"` // seconds between batches
}

type TargetConfig struct {
	MaxRecipients    int      `json:"max_recipients,omitempty"`
	ExcludePhones    []string `json:"exclude_phones,omitempty"`
	IncludeTags      []string `json:"include_tags,omitempty"`
	ExcludeTags      []string `json:"exclude_tags,omitempty"`
	TestMode         bool     `json:"test_mode"`
	TestPhones       []string `json:"test_phones,omitempty"`
}

// CreateCampaign creates a new campaign
// @Summary Create campaign
// @Description Create a new marketing campaign
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param campaign body CreateCampaignRequest true "Campaign data"
// @Success 201 {object} models.Campaign
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns [post]
func (h *Handler) CreateCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	var req CreateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	userID := c.GetString("user_id")
	uid, _ := uuid.Parse(userID)

	// Create campaign config
	config := &engine.CampaignConfig{
		Name:            req.Name,
		Description:     req.Description,
		Type:            req.Type,
		SegmentID:       req.SegmentID,
		SegmentCriteria: req.SegmentCriteria,
		TemplateID:      req.TemplateID,
		Settings:        req.Settings,
	}

	// Set schedule if provided
	if req.ScheduleConfig != nil {
		config.StartAt = req.ScheduleConfig.StartAt
		config.EndAt = req.ScheduleConfig.EndAt
		config.Settings["schedule"] = req.ScheduleConfig
	}

	// Set target config if provided
	if req.TargetConfig != nil {
		config.Settings["target"] = req.TargetConfig
	}

	// Set message content
	if req.MessageContent != nil {
		config.Settings["message"] = req.MessageContent
	}

	// Create campaign
	campaign, err := h.campaignEngine.CreateCampaign(c.Request.Context(), tid, uid, config)
	if err != nil {
		h.log.Error("Failed to create campaign", "error", err, "tenant_id", tenantID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create campaign"})
		return
	}

	c.JSON(http.StatusCreated, campaign)
}

// GetCampaigns retrieves all campaigns
// @Summary List campaigns
// @Description Get list of campaigns with filters
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param status query string false "Filter by status" Enums(draft,scheduled,running,paused,completed,failed)
// @Param type query string false "Filter by type" Enums(broadcast,scheduled,recurring,trigger)
// @Param tag query string false "Filter by tag"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {array} models.Campaign
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns [get]
func (h *Handler) GetCampaigns(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse query parameters
	status := c.Query("status")
	campaignType := c.Query("type")
	tag := c.Query("tag")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Build query
	query := h.db.Model(&models.Campaign{}).
		Where("tenant_id = ?", tid).
		Preload("Segment").
		Preload("Statistics")

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if campaignType != "" {
		query = query.Where("type = ?", campaignType)
	}
	if tag != "" {
		query = query.Where("? = ANY(tags)", tag)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Fetch campaigns
	var campaigns []models.Campaign
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&campaigns).Error; err != nil {
		h.log.Error("Failed to fetch campaigns", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaigns"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"campaigns": campaigns,
		"total":     total,
		"page":      page,
		"limit":     limit,
		"has_more":  total > int64(page*limit),
	})
}

// GetCampaign retrieves a specific campaign
// @Summary Get campaign
// @Description Get campaign details by ID
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Success 200 {object} models.Campaign
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id} [get]
func (h *Handler) GetCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	campaign, err := h.campaignEngine.GetCampaign(c.Request.Context(), tid, cid)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to fetch campaign", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaign"})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

// UpdateCampaign updates a campaign
// @Summary Update campaign
// @Description Update campaign details
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Param campaign body CreateCampaignRequest true "Updated campaign data"
// @Success 200 {object} models.Campaign
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id} [put]
func (h *Handler) UpdateCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	var req CreateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update campaign config
	config := &engine.CampaignConfig{
		Name:            req.Name,
		Description:     req.Description,
		Type:            req.Type,
		SegmentID:       req.SegmentID,
		SegmentCriteria: req.SegmentCriteria,
		TemplateID:      req.TemplateID,
		Settings:        req.Settings,
	}

	campaign, err := h.campaignEngine.UpdateCampaign(c.Request.Context(), tid, cid, config)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to update campaign", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update campaign"})
		return
	}

	c.JSON(http.StatusOK, campaign)
}

// DeleteCampaign deletes a campaign
// @Summary Delete campaign
// @Description Delete a campaign
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Success 204 "Campaign deleted"
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id} [delete]
func (h *Handler) DeleteCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	if err := h.campaignEngine.DeleteCampaign(c.Request.Context(), tid, cid); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to delete campaign", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete campaign"})
		return
	}

	c.Status(http.StatusNoContent)
}

// StartCampaign starts a campaign
// @Summary Start campaign
// @Description Start or resume a campaign
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Success 200 {object} models.Campaign
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id}/start [post]
func (h *Handler) StartCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	if err := h.campaignEngine.StartCampaign(c.Request.Context(), tid, cid); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to start campaign", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch updated campaign
	campaign, _ := h.campaignEngine.GetCampaign(c.Request.Context(), tid, cid)
	c.JSON(http.StatusOK, campaign)
}

// PauseCampaign pauses a campaign
// @Summary Pause campaign
// @Description Pause a running campaign
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Success 200 {object} models.Campaign
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id}/pause [post]
func (h *Handler) PauseCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	if err := h.campaignEngine.PauseCampaign(c.Request.Context(), tid, cid); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to pause campaign", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch updated campaign
	campaign, _ := h.campaignEngine.GetCampaign(c.Request.Context(), tid, cid)
	c.JSON(http.StatusOK, campaign)
}

// StopCampaign stops a campaign
// @Summary Stop campaign
// @Description Stop and finalize a campaign
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Success 200 {object} models.Campaign
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id}/stop [post]
func (h *Handler) StopCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	if err := h.campaignEngine.StopCampaign(c.Request.Context(), tid, cid); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to stop campaign", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Fetch updated campaign
	campaign, _ := h.campaignEngine.GetCampaign(c.Request.Context(), tid, cid)
	c.JSON(http.StatusOK, campaign)
}

// GetCampaignStats retrieves campaign statistics
// @Summary Get campaign statistics
// @Description Get detailed statistics for a campaign
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Success 200 {object} analytics.CampaignStats
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id}/stats [get]
func (h *Handler) GetCampaignStats(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	stats, err := h.analyticsEngine.GetCampaignStats(c.Request.Context(), tid, cid)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to fetch campaign stats", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch statistics"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetCampaignRecipients retrieves campaign recipients
// @Summary Get campaign recipients
// @Description Get list of campaign recipients with delivery status
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Param status query string false "Filter by delivery status" Enums(pending,sent,delivered,failed,read)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {array} models.CampaignRecipient
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id}/recipients [get]
func (h *Handler) GetCampaignRecipients(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	// Parse query parameters
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Build query
	query := h.db.Model(&models.CampaignRecipient{}).
		Where("campaign_id = ?", cid).
		Joins("JOIN campaigns ON campaigns.id = campaign_recipients.campaign_id").
		Where("campaigns.tenant_id = ?", tid).
		Preload("Contact")

	if status != "" {
		query = query.Where("delivery_status = ?", status)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Fetch recipients
	var recipients []models.CampaignRecipient
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&recipients).Error; err != nil {
		h.log.Error("Failed to fetch recipients", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recipients"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recipients": recipients,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"has_more":   total > int64(page*limit),
	})
}

// DuplicateCampaign duplicates a campaign
// @Summary Duplicate campaign
// @Description Create a copy of an existing campaign
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Param request body map[string]string false "Duplicate options"
// @Success 201 {object} models.Campaign
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id}/duplicate [post]
func (h *Handler) DuplicateCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")
	userID := c.GetString("user_id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	uid, _ := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	var options map[string]string
	c.ShouldBindJSON(&options)

	newName := options["name"]
	if newName == "" {
		newName = "Copy of Campaign"
	}

	// Duplicate the campaign
	newCampaign, err := h.campaignEngine.DuplicateCampaign(c.Request.Context(), tid, cid, uid, newName)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to duplicate campaign", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to duplicate campaign"})
		return
	}

	c.JSON(http.StatusCreated, newCampaign)
}

// TestCampaign sends test messages for a campaign
// @Summary Test campaign
// @Description Send test messages to specified phones
// @Tags Campaigns
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Campaign ID" format(uuid)
// @Param request body TestCampaignRequest true "Test configuration"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /campaigns/{id}/test [post]
func (h *Handler) TestCampaign(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	campaignID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(campaignID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid campaign ID"})
		return
	}

	type TestCampaignRequest struct {
		Phones []string `json:"phones" binding:"required,min=1,max=5"`
	}

	var req TestCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := h.campaignEngine.TestCampaign(c.Request.Context(), tid, cid, req.Phones)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
			return
		}
		h.log.Error("Failed to test campaign", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"results": results,
	})
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}