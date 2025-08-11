package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/campaign/segmentation"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// EngineImpl implements the CampaignEngine interface
type EngineImpl struct {
	db                 *gorm.DB
	segmentationEngine segmentation.SegmentationEngine
	scheduler          CampaignScheduler
	messageSender      MessageSender
	analyzer           CampaignAnalyzer
	logger             Logger
	mu                 sync.RWMutex
}

// Logger interface for campaign engine logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// NewEngine creates a new campaign engine
func NewEngine(
	db *gorm.DB,
	segmentationEngine segmentation.SegmentationEngine,
	scheduler CampaignScheduler,
	messageSender MessageSender,
	analyzer CampaignAnalyzer,
	logger Logger,
) *EngineImpl {
	return &EngineImpl{
		db:                 db,
		segmentationEngine: segmentationEngine,
		scheduler:          scheduler,
		messageSender:      messageSender,
		analyzer:           analyzer,
		logger:             logger,
	}
}

// Campaign Lifecycle Implementation

// CreateCampaign creates a new campaign
func (e *EngineImpl) CreateCampaign(ctx context.Context, tenantID uuid.UUID, request *CreateCampaignRequest) (*Campaign, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Validate the request
	if err := e.validateCreateCampaignRequest(request); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// For segment targeting, validate segment exists
	if request.TargetType == TargetTypeSegment && request.TargetSegmentID != nil {
		if _, err := e.segmentationEngine.GetSegment(ctx, tenantID, *request.TargetSegmentID); err != nil {
			return nil, fmt.Errorf("target segment not found: %w", err)
		}
	}

	// Convert contact IDs to strings for database storage
	var targetContactIDStrings []string
	if len(request.TargetContactIDs) > 0 {
		targetContactIDStrings = make([]string, len(request.TargetContactIDs))
		for i, id := range request.TargetContactIDs {
			targetContactIDStrings[i] = id.String()
		}
	}

	// Create database model
	dbCampaign := &models.Campaign{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		Name:              request.Name,
		Description:       request.Description,
		Type:              string(request.Type),
		Status:            string(CampaignStatusDraft),
		TargetType:        string(request.TargetType),
		TargetSegmentID:   request.TargetSegmentID,
		TargetContactIDs:  targetContactIDStrings,
		MessageTemplateID: request.MessageTemplateID,
		MessageContent:    e.convertMessageContentToJSON(request.MessageContent),
		MessageType:       string(request.MessageType),
		ScheduledAt:       request.ScheduledAt,
		StartDate:         request.StartDate,
		EndDate:           request.EndDate,
		Timezone:          request.Timezone,
		SendingRateLimit:  request.SendingRateLimit,
		Settings:          e.convertSettingsToJSON(request.Settings),
		Tags:              request.Tags,
		// CreatedByID will be set from context in the handler
	}

	// Set campaign-specific settings
	if request.Type == CampaignTypeDrip && request.DripSettings != nil {
		dbCampaign.DripInterval = &request.DripSettings.Interval
		dbCampaign.DripIntervalType = &request.DripSettings.IntervalType
		dbCampaign.MaxMessages = &request.DripSettings.MaxMessages
	}

	if request.Type == CampaignTypeTriggered && request.TriggerSettings != nil {
		dbCampaign.TriggerEvent = &request.TriggerSettings.TriggerEvent
		dbCampaign.TriggerConditions = e.convertTriggerConditionsToJSON(request.TriggerSettings.TriggerConditions)
		dbCampaign.TriggerDelay = &request.TriggerSettings.TriggerDelay
	}

	// Save to database
	if err := e.db.WithContext(ctx).Create(dbCampaign).Error; err != nil {
		return nil, fmt.Errorf("failed to create campaign: %w", err)
	}

	// Calculate initial target count
	go func() {
		if err := e.calculateAndUpdateTargetCount(context.Background(), tenantID, dbCampaign.ID); err != nil {
			e.logger.Error("Failed to calculate target count for new campaign", "campaign_id", dbCampaign.ID, "error", err)
		}
	}()

	// Convert to domain model
	campaign := e.convertToCampaign(dbCampaign)

	e.logger.Info("Campaign created", "campaign_id", campaign.ID, "name", campaign.Name, "type", campaign.Type)
	return campaign, nil
}

// UpdateCampaign updates an existing campaign
func (e *EngineImpl) UpdateCampaign(ctx context.Context, tenantID, campaignID uuid.UUID, request *UpdateCampaignRequest) (*Campaign, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Get existing campaign
	var dbCampaign models.Campaign
	err := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", campaignID, tenantID).
		First(&dbCampaign).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("campaign not found")
		}
		return nil, fmt.Errorf("failed to retrieve campaign: %w", err)
	}

	// Don't allow updates to running campaigns
	if dbCampaign.Status == string(CampaignStatusRunning) {
		return nil, fmt.Errorf("cannot update running campaign")
	}

	// Build update map
	updates := make(map[string]interface{})
	updates["updated_at"] = time.Now()

	if request.Name != nil {
		updates["name"] = *request.Name
	}
	if request.Description != nil {
		updates["description"] = *request.Description
	}
	if request.TargetType != nil {
		updates["target_type"] = string(*request.TargetType)
	}
	if request.TargetSegmentID != nil {
		updates["target_segment_id"] = *request.TargetSegmentID
	}
	if request.TargetContactIDs != nil {
		contactIDStrings := make([]string, len(request.TargetContactIDs))
		for i, id := range request.TargetContactIDs {
			contactIDStrings[i] = id.String()
		}
		updates["target_contact_ids"] = contactIDStrings
	}
	if request.MessageTemplateID != nil {
		updates["message_template_id"] = *request.MessageTemplateID
	}
	if request.MessageContent != nil {
		updates["message_content"] = e.convertMessageContentToJSON(*request.MessageContent)
	}
	if request.MessageType != nil {
		updates["message_type"] = string(*request.MessageType)
	}
	if request.ScheduledAt != nil {
		updates["scheduled_at"] = *request.ScheduledAt
	}
	if request.StartDate != nil {
		updates["start_date"] = *request.StartDate
	}
	if request.EndDate != nil {
		updates["end_date"] = *request.EndDate
	}
	if request.SendingRateLimit != nil {
		updates["sending_rate_limit"] = *request.SendingRateLimit
	}
	if request.Settings != nil {
		updates["settings"] = e.convertSettingsToJSON(request.Settings)
	}
	if request.Tags != nil {
		updates["tags"] = request.Tags
	}

	// Update campaign-specific settings
	if request.DripSettings != nil {
		updates["drip_interval"] = request.DripSettings.Interval
		updates["drip_interval_type"] = request.DripSettings.IntervalType
		updates["max_messages"] = request.DripSettings.MaxMessages
	}

	if request.TriggerSettings != nil {
		updates["trigger_event"] = request.TriggerSettings.TriggerEvent
		updates["trigger_conditions"] = e.convertTriggerConditionsToJSON(request.TriggerSettings.TriggerConditions)
		updates["trigger_delay"] = request.TriggerSettings.TriggerDelay
	}

	// Update in database
	if err := e.db.WithContext(ctx).Model(&dbCampaign).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update campaign: %w", err)
	}

	// Recalculate target count if targeting changed
	targetingChanged := request.TargetType != nil || request.TargetSegmentID != nil || request.TargetContactIDs != nil
	if targetingChanged {
		go func() {
			if err := e.calculateAndUpdateTargetCount(context.Background(), tenantID, campaignID); err != nil {
				e.logger.Error("Failed to recalculate target count for updated campaign", "campaign_id", campaignID, "error", err)
			}
		}()
	}

	// Retrieve updated campaign
	if err := e.db.WithContext(ctx).First(&dbCampaign, campaignID).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve updated campaign: %w", err)
	}

	campaign := e.convertToCampaign(&dbCampaign)

	e.logger.Info("Campaign updated", "campaign_id", campaign.ID, "name", campaign.Name)
	return campaign, nil
}

// DeleteCampaign deletes a campaign
func (e *EngineImpl) DeleteCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Check if campaign is running
	var dbCampaign models.Campaign
	err := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", campaignID, tenantID).
		First(&dbCampaign).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("campaign not found")
		}
		return fmt.Errorf("failed to retrieve campaign: %w", err)
	}

	if dbCampaign.Status == string(CampaignStatusRunning) {
		return fmt.Errorf("cannot delete running campaign")
	}

	// Cancel any scheduled executions
	if err := e.scheduler.CancelScheduledCampaign(ctx, campaignID); err != nil {
		e.logger.Warn("Failed to cancel scheduled campaign", "campaign_id", campaignID, "error", err)
	}

	// Delete campaign (cascade will handle related records)
	result := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", campaignID, tenantID).
		Delete(&models.Campaign{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete campaign: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("campaign not found")
	}

	e.logger.Info("Campaign deleted", "campaign_id", campaignID)
	return nil
}

// GetCampaign retrieves a campaign by ID
func (e *EngineImpl) GetCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) (*Campaign, error) {
	var dbCampaign models.Campaign
	err := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", campaignID, tenantID).
		First(&dbCampaign).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("campaign not found")
		}
		return nil, fmt.Errorf("failed to retrieve campaign: %w", err)
	}

	return e.convertToCampaign(&dbCampaign), nil
}

// ListCampaigns lists campaigns with filtering
func (e *EngineImpl) ListCampaigns(ctx context.Context, tenantID uuid.UUID, filter *CampaignFilter) ([]*Campaign, int64, error) {
	query := e.db.WithContext(ctx).Model(&models.Campaign{}).
		Where("tenant_id = ?", tenantID)

	// Apply filters
	if filter != nil {
		if filter.Type != nil {
			query = query.Where("type = ?", string(*filter.Type))
		}

		if filter.Status != nil {
			query = query.Where("status = ?", string(*filter.Status))
		}

		if filter.Search != "" {
			query = query.Where("name ILIKE ? OR description ILIKE ?",
				"%"+filter.Search+"%", "%"+filter.Search+"%")
		}

		if len(filter.Tags) > 0 {
			query = query.Where("tags && ?", filter.Tags)
		}

		if filter.CreatedByID != nil {
			query = query.Where("created_by_id = ?", *filter.CreatedByID)
		}

		if filter.CreatedFrom != nil {
			query = query.Where("created_at >= ?", *filter.CreatedFrom)
		}

		if filter.CreatedTo != nil {
			query = query.Where("created_at <= ?", *filter.CreatedTo)
		}
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count campaigns: %w", err)
	}

	// Apply sorting and pagination
	if filter != nil {
		if filter.SortBy != "" {
			order := filter.SortBy
			if filter.SortDesc {
				order += " DESC"
			}
			query = query.Order(order)
		} else {
			query = query.Order("created_at DESC")
		}

		if filter.Limit > 0 {
			query = query.Limit(filter.Limit)
		}

		if filter.Offset > 0 {
			query = query.Offset(filter.Offset)
		}
	}

	var dbCampaigns []*models.Campaign
	if err := query.Find(&dbCampaigns).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve campaigns: %w", err)
	}

	// Convert to domain models
	campaigns := make([]*Campaign, len(dbCampaigns))
	for i, dbCampaign := range dbCampaigns {
		campaigns[i] = e.convertToCampaign(dbCampaign)
	}

	return campaigns, total, nil
}

// Campaign Execution Implementation

// StartCampaign starts a campaign execution
func (e *EngineImpl) StartCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Get campaign
	campaign, err := e.GetCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return err
	}

	// Check if campaign can be started
	if campaign.Status != CampaignStatusDraft && campaign.Status != CampaignStatusPaused {
		return fmt.Errorf("campaign cannot be started from status: %s", campaign.Status)
	}

	// Update campaign status
	now := time.Now()
	updates := map[string]interface{}{
		"status":     string(CampaignStatusRunning),
		"started_at": &now,
		"updated_at": now,
	}

	if err := e.db.WithContext(ctx).
		Model(&models.Campaign{}).
		Where("id = ? AND tenant_id = ?", campaignID, tenantID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update campaign status: %w", err)
	}

	// Start message processing based on campaign type
	switch campaign.Type {
	case CampaignTypeBroadcast:
		go e.processBroadcastCampaign(campaignID)
	case CampaignTypeDrip:
		go e.processDripCampaign(campaignID)
	case CampaignTypeTriggered:
		go e.processTriggeredCampaign(campaignID)
	case CampaignTypeRecurring:
		go e.processRecurringCampaign(campaignID)
	}

	// Record event
	if err := e.recordCampaignEvent(ctx, tenantID, campaignID, "started", "Campaign started", nil); err != nil {
		e.logger.Error("Failed to record campaign start event", "campaign_id", campaignID, "error", err)
	}

	e.logger.Info("Campaign started", "campaign_id", campaignID, "type", campaign.Type)
	return nil
}

// PauseCampaign pauses a running campaign
func (e *EngineImpl) PauseCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Get campaign
	campaign, err := e.GetCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return err
	}

	if campaign.Status != CampaignStatusRunning {
		return fmt.Errorf("campaign is not running")
	}

	// Update campaign status
	now := time.Now()
	updates := map[string]interface{}{
		"status":     string(CampaignStatusPaused),
		"paused_at":  &now,
		"updated_at": now,
	}

	if err := e.db.WithContext(ctx).
		Model(&models.Campaign{}).
		Where("id = ? AND tenant_id = ?", campaignID, tenantID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to pause campaign: %w", err)
	}

	// Record event
	if err := e.recordCampaignEvent(ctx, tenantID, campaignID, "paused", "Campaign paused", nil); err != nil {
		e.logger.Error("Failed to record campaign pause event", "campaign_id", campaignID, "error", err)
	}

	e.logger.Info("Campaign paused", "campaign_id", campaignID)
	return nil
}

// ResumeCampaign resumes a paused campaign
func (e *EngineImpl) ResumeCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error {
	return e.StartCampaign(ctx, tenantID, campaignID)
}

// CancelCampaign cancels a campaign
func (e *EngineImpl) CancelCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	// Get campaign
	campaign, err := e.GetCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return err
	}

	if campaign.Status == CampaignStatusCompleted || campaign.Status == CampaignStatusCancelled {
		return fmt.Errorf("campaign is already %s", campaign.Status)
	}

	// Cancel any scheduled executions
	if err := e.scheduler.CancelScheduledCampaign(ctx, campaignID); err != nil {
		e.logger.Warn("Failed to cancel scheduled campaign", "campaign_id", campaignID, "error", err)
	}

	// Update campaign status
	now := time.Now()
	updates := map[string]interface{}{
		"status":       string(CampaignStatusCancelled),
		"cancelled_at": &now,
		"updated_at":   now,
	}

	if err := e.db.WithContext(ctx).
		Model(&models.Campaign{}).
		Where("id = ? AND tenant_id = ?", campaignID, tenantID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to cancel campaign: %w", err)
	}

	// Record event
	if err := e.recordCampaignEvent(ctx, tenantID, campaignID, "cancelled", "Campaign cancelled", nil); err != nil {
		e.logger.Error("Failed to record campaign cancel event", "campaign_id", campaignID, "error", err)
	}

	e.logger.Info("Campaign cancelled", "campaign_id", campaignID)
	return nil
}

// Helper methods

func (e *EngineImpl) validateCreateCampaignRequest(request *CreateCampaignRequest) error {
	if request.Name == "" {
		return fmt.Errorf("name is required")
	}

	if request.TargetType == TargetTypeSegment && request.TargetSegmentID == nil {
		return fmt.Errorf("target segment ID is required for segment targeting")
	}

	if request.TargetType == TargetTypeContacts && len(request.TargetContactIDs) == 0 {
		return fmt.Errorf("target contact IDs are required for contact targeting")
	}

	if request.Type == CampaignTypeDrip && request.DripSettings == nil {
		return fmt.Errorf("drip settings are required for drip campaigns")
	}

	if request.Type == CampaignTypeTriggered && request.TriggerSettings == nil {
		return fmt.Errorf("trigger settings are required for triggered campaigns")
	}

	return nil
}

func (e *EngineImpl) convertMessageContentToJSON(content MessageContent) models.JSON {
	result := make(models.JSON)

	if content.Text != nil {
		result["text"] = *content.Text
	}
	if content.MediaURL != nil {
		result["media_url"] = *content.MediaURL
	}
	if content.MediaType != nil {
		result["media_type"] = *content.MediaType
	}
	if content.Caption != nil {
		result["caption"] = *content.Caption
	}
	if content.TemplateID != nil {
		result["template_id"] = *content.TemplateID
	}
	if content.TemplateData != nil {
		result["template_data"] = content.TemplateData
	}
	if content.Interactive != nil {
		result["interactive"] = content.Interactive
	}

	return result
}

func (e *EngineImpl) convertSettingsToJSON(settings map[string]interface{}) models.JSON {
	if settings == nil {
		return make(models.JSON)
	}
	return models.JSON(settings)
}

func (e *EngineImpl) convertTriggerConditionsToJSON(conditions map[string]interface{}) models.JSON {
	if conditions == nil {
		return make(models.JSON)
	}
	return models.JSON(conditions)
}

func (e *EngineImpl) convertToCampaign(dbCampaign *models.Campaign) *Campaign {
	campaign := &Campaign{
		ID:              dbCampaign.ID,
		TenantID:        dbCampaign.TenantID,
		Name:            dbCampaign.Name,
		Description:     dbCampaign.Description,
		Type:            CampaignType(dbCampaign.Type),
		Status:          CampaignStatus(dbCampaign.Status),
		TargetType:      TargetType(dbCampaign.TargetType),
		TargetSegmentID: dbCampaign.TargetSegmentID,
		MessageTemplateID: dbCampaign.MessageTemplateID,
		MessageContent:  e.convertJSONToMessageContent(dbCampaign.MessageContent),
		MessageType:     MessageType(dbCampaign.MessageType),
		ScheduledAt:     dbCampaign.ScheduledAt,
		StartDate:       dbCampaign.StartDate,
		EndDate:         dbCampaign.EndDate,
		Timezone:        dbCampaign.Timezone,
		SendingRateLimit: dbCampaign.SendingRateLimit,
		Settings:        map[string]interface{}(dbCampaign.Settings),
		Tags:            dbCampaign.Tags,
		TotalTargets:    dbCampaign.TotalTargets,
		MessagesSent:    dbCampaign.MessagesSent,
		MessagesDelivered: dbCampaign.MessagesDelivered,
		MessagesRead:    dbCampaign.MessagesRead,
		MessagesReplied: dbCampaign.MessagesReplied,
		MessagesClicked: dbCampaign.MessagesClicked,
		MessagesFailed:  dbCampaign.MessagesFailed,
		DeliveryRate:    dbCampaign.DeliveryRate,
		OpenRate:        dbCampaign.OpenRate,
		ResponseRate:    dbCampaign.ResponseRate,
		ClickRate:       dbCampaign.ClickRate,
		UnsubscribeRate: dbCampaign.UnsubscribeRate,
		StartedAt:       dbCampaign.StartedAt,
		CompletedAt:     dbCampaign.CompletedAt,
		PausedAt:        dbCampaign.PausedAt,
		CancelledAt:     dbCampaign.CancelledAt,
		ErrorMessage:    dbCampaign.ErrorMessage,
		CreatedAt:       dbCampaign.CreatedAt,
		UpdatedAt:       dbCampaign.UpdatedAt,
		CreatedByID:     dbCampaign.CreatedByID,
	}

	// Convert target contact IDs from strings to UUIDs
	if len(dbCampaign.TargetContactIDs) > 0 {
		contactIDs := make([]uuid.UUID, len(dbCampaign.TargetContactIDs))
		for i, idStr := range dbCampaign.TargetContactIDs {
			if id, err := uuid.Parse(idStr); err == nil {
				contactIDs[i] = id
			}
		}
		campaign.TargetContactIDs = contactIDs
	}

	// Convert campaign-specific settings
	if dbCampaign.DripInterval != nil {
		campaign.DripSettings = &DripCampaignSettings{
			Interval:     *dbCampaign.DripInterval,
			IntervalType: *dbCampaign.DripIntervalType,
			MaxMessages:  *dbCampaign.MaxMessages,
		}
	}

	if dbCampaign.TriggerEvent != nil {
		campaign.TriggerSettings = &TriggerCampaignSettings{
			TriggerEvent:      *dbCampaign.TriggerEvent,
			TriggerConditions: map[string]interface{}(dbCampaign.TriggerConditions),
			TriggerDelay:      *dbCampaign.TriggerDelay,
		}
	}

	return campaign
}

func (e *EngineImpl) convertJSONToMessageContent(jsonData models.JSON) MessageContent {
	content := MessageContent{}

	if text, ok := jsonData["text"].(string); ok {
		content.Text = &text
	}
	if mediaURL, ok := jsonData["media_url"].(string); ok {
		content.MediaURL = &mediaURL
	}
	if mediaType, ok := jsonData["media_type"].(string); ok {
		content.MediaType = &mediaType
	}
	if caption, ok := jsonData["caption"].(string); ok {
		content.Caption = &caption
	}
	if templateID, ok := jsonData["template_id"].(string); ok {
		content.TemplateID = &templateID
	}
	if templateData, ok := jsonData["template_data"].(map[string]interface{}); ok {
		content.TemplateData = templateData
	}

	return content
}

func (e *EngineImpl) calculateAndUpdateTargetCount(ctx context.Context, tenantID, campaignID uuid.UUID) error {
	campaign, err := e.GetCampaign(ctx, tenantID, campaignID)
	if err != nil {
		return err
	}

	var targetCount int

	switch campaign.TargetType {
	case TargetTypeAll:
		// Count all contacts for tenant
		var count int64
		if err := e.db.WithContext(ctx).
			Model(&models.Contact{}).
			Where("tenant_id = ?", tenantID).
			Count(&count).Error; err != nil {
			return fmt.Errorf("failed to count all contacts: %w", err)
		}
		targetCount = int(count)

	case TargetTypeSegment:
		if campaign.TargetSegmentID == nil {
			return fmt.Errorf("segment ID is required for segment targeting")
		}
		contactIDs, err := e.segmentationEngine.CalculateSegment(ctx, tenantID, *campaign.TargetSegmentID)
		if err != nil {
			return fmt.Errorf("failed to calculate segment: %w", err)
		}
		targetCount = len(contactIDs)

	case TargetTypeContacts:
		targetCount = len(campaign.TargetContactIDs)

	default:
		return fmt.Errorf("unsupported target type: %s", campaign.TargetType)
	}

	// Update campaign with target count
	if err := e.db.WithContext(ctx).
		Model(&models.Campaign{}).
		Where("id = ? AND tenant_id = ?", campaignID, tenantID).
		Update("total_targets", targetCount).Error; err != nil {
		return fmt.Errorf("failed to update target count: %w", err)
	}

	e.logger.Debug("Target count calculated", "campaign_id", campaignID, "count", targetCount)
	return nil
}

func (e *EngineImpl) recordCampaignEvent(ctx context.Context, tenantID, campaignID uuid.UUID, eventType, message string, data map[string]interface{}) error {
	var eventData models.JSON
	if data != nil {
		eventData = models.JSON(data)
	}

	event := &models.CampaignEvent{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		CampaignID:   campaignID,
		EventType:    eventType,
		EventMessage: message,
		EventData:    eventData,
		Timestamp:    time.Now(),
	}

	return e.db.WithContext(ctx).Create(event).Error
}

// Campaign processing methods (simplified stubs - full implementation would be more complex)

func (e *EngineImpl) processBroadcastCampaign(campaignID uuid.UUID) {
	// Implementation for processing broadcast campaigns
	e.logger.Info("Processing broadcast campaign", "campaign_id", campaignID)
}

func (e *EngineImpl) processDripCampaign(campaignID uuid.UUID) {
	// Implementation for processing drip campaigns
	e.logger.Info("Processing drip campaign", "campaign_id", campaignID)
}

func (e *EngineImpl) processTriggeredCampaign(campaignID uuid.UUID) {
	// Implementation for processing triggered campaigns
	e.logger.Info("Processing triggered campaign", "campaign_id", campaignID)
}

func (e *EngineImpl) processRecurringCampaign(campaignID uuid.UUID) {
	// Implementation for processing recurring campaigns
	e.logger.Info("Processing recurring campaign", "campaign_id", campaignID)
}