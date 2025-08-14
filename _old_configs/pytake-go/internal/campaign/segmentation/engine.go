package segmentation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// Engine implements the SegmentationEngine interface
type Engine struct {
	db         *gorm.DB
	ruleEngine RuleEngine
	logger     Logger
}

// Logger interface for segmentation engine logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// NewEngine creates a new segmentation engine
func NewEngine(db *gorm.DB, logger Logger) *Engine {
	return &Engine{
		db:         db,
		ruleEngine: NewRuleEngine(db, logger),
		logger:     logger,
	}
}

// CreateSegment creates a new contact segment
func (e *Engine) CreateSegment(ctx context.Context, tenantID uuid.UUID, request *CreateSegmentRequest) (*ContactSegment, error) {
	// Validate the request
	if err := e.validateCreateSegmentRequest(request); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}
	
	// For dynamic segments, validate rules
	if request.Type == SegmentTypeDynamic && request.Rules != nil {
		if result := e.ruleEngine.ValidateRules(request.Rules); result != nil {
			return nil, fmt.Errorf("invalid segmentation rules: %v", result.Errors)
		}
	}
	
	// Convert rules to JSON
	var rulesJSON models.JSON
	if request.Rules != nil {
		rulesJSON = e.convertRulesToJSON(request.Rules)
	}
	
	// Convert contact IDs to string array for static segments
	var contactIDStrings []string
	if request.Type == SegmentTypeStatic && len(request.ContactIDs) > 0 {
		contactIDStrings = make([]string, len(request.ContactIDs))
		for i, id := range request.ContactIDs {
			contactIDStrings[i] = id.String()
		}
	}
	
	// Create database model
	dbSegment := &models.ContactSegment{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		Name:        request.Name,
		Description: request.Description,
		Type:        string(request.Type),
		Rules:       rulesJSON,
		ContactIDs:  contactIDStrings,
		AutoUpdate:  request.AutoUpdate,
		Tags:        request.Tags,
		// CreatedByID will be set from context in the handler
	}
	
	// Save to database
	if err := e.db.WithContext(ctx).Create(dbSegment).Error; err != nil {
		return nil, fmt.Errorf("failed to create segment: %w", err)
	}
	
	// For dynamic segments, calculate initial contact count
	if request.Type == SegmentTypeDynamic {
		go func() {
			if err := e.RefreshSegment(context.Background(), tenantID, dbSegment.ID); err != nil {
				e.logger.Error("Failed to refresh new segment", "segment_id", dbSegment.ID, "error", err)
			}
		}()
	} else {
		// For static segments, update contact count immediately
		dbSegment.ContactCount = len(request.ContactIDs)
		e.db.WithContext(ctx).Model(dbSegment).Update("contact_count", dbSegment.ContactCount)
	}
	
	// Convert to domain model
	segment := e.convertToContactSegment(dbSegment)
	
	e.logger.Info("Contact segment created", "segment_id", segment.ID, "name", segment.Name, "type", segment.Type)
	return segment, nil
}

// UpdateSegment updates an existing segment
func (e *Engine) UpdateSegment(ctx context.Context, tenantID, segmentID uuid.UUID, request *UpdateSegmentRequest) (*ContactSegment, error) {
	// Get existing segment
	var dbSegment models.ContactSegment
	err := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", segmentID, tenantID).
		First(&dbSegment).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("segment not found")
		}
		return nil, fmt.Errorf("failed to retrieve segment: %w", err)
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
	if request.AutoUpdate != nil {
		updates["auto_update"] = *request.AutoUpdate
	}
	if request.Tags != nil {
		updates["tags"] = request.Tags
	}
	
	// Handle rules update for dynamic segments
	rulesChanged := false
	if request.Rules != nil && dbSegment.Type == string(SegmentTypeDynamic) {
		if result := e.ruleEngine.ValidateRules(request.Rules); result != nil {
			return nil, fmt.Errorf("invalid segmentation rules: %v", result.Errors)
		}
		updates["rules"] = e.convertRulesToJSON(request.Rules)
		rulesChanged = true
	}
	
	// Handle contact IDs update for static segments
	contactsChanged := false
	if request.ContactIDs != nil && dbSegment.Type == string(SegmentTypeStatic) {
		contactIDStrings := make([]string, len(request.ContactIDs))
		for i, id := range request.ContactIDs {
			contactIDStrings[i] = id.String()
		}
		updates["contact_ids"] = contactIDStrings
		updates["contact_count"] = len(request.ContactIDs)
		contactsChanged = true
	}
	
	// Update in database
	if err := e.db.WithContext(ctx).Model(&dbSegment).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update segment: %w", err)
	}
	
	// Refresh segment if rules changed
	if rulesChanged || contactsChanged {
		go func() {
			if err := e.RefreshSegment(context.Background(), tenantID, segmentID); err != nil {
				e.logger.Error("Failed to refresh updated segment", "segment_id", segmentID, "error", err)
			}
		}()
	}
	
	// Retrieve updated segment
	if err := e.db.WithContext(ctx).First(&dbSegment, segmentID).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve updated segment: %w", err)
	}
	
	segment := e.convertToContactSegment(&dbSegment)
	
	e.logger.Info("Contact segment updated", "segment_id", segment.ID, "name", segment.Name)
	return segment, nil
}

// DeleteSegment deletes a segment
func (e *Engine) DeleteSegment(ctx context.Context, tenantID, segmentID uuid.UUID) error {
	result := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", segmentID, tenantID).
		Delete(&models.ContactSegment{})
	
	if result.Error != nil {
		return fmt.Errorf("failed to delete segment: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("segment not found")
	}
	
	e.logger.Info("Contact segment deleted", "segment_id", segmentID)
	return nil
}

// GetSegment retrieves a segment by ID
func (e *Engine) GetSegment(ctx context.Context, tenantID, segmentID uuid.UUID) (*ContactSegment, error) {
	var dbSegment models.ContactSegment
	err := e.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", segmentID, tenantID).
		First(&dbSegment).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("segment not found")
		}
		return nil, fmt.Errorf("failed to retrieve segment: %w", err)
	}
	
	return e.convertToContactSegment(&dbSegment), nil
}

// ListSegments lists segments with filtering
func (e *Engine) ListSegments(ctx context.Context, tenantID uuid.UUID, filter *SegmentFilter) ([]*ContactSegment, int64, error) {
	query := e.db.WithContext(ctx).Model(&models.ContactSegment{}).
		Where("tenant_id = ?", tenantID)
	
	// Apply filters
	if filter != nil {
		if filter.Type != nil {
			query = query.Where("type = ?", string(*filter.Type))
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
		
		if filter.AutoUpdate != nil {
			query = query.Where("auto_update = ?", *filter.AutoUpdate)
		}
	}
	
	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count segments: %w", err)
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
	}
	
	var dbSegments []*models.ContactSegment
	if err := query.Find(&dbSegments).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve segments: %w", err)
	}
	
	// Convert to domain models
	segments := make([]*ContactSegment, len(dbSegments))
	for i, dbSegment := range dbSegments {
		segments[i] = e.convertToContactSegment(dbSegment)
	}
	
	return segments, total, nil
}

// CalculateSegment calculates which contacts belong to a segment
func (e *Engine) CalculateSegment(ctx context.Context, tenantID, segmentID uuid.UUID) ([]uuid.UUID, error) {
	// Get segment
	segment, err := e.GetSegment(ctx, tenantID, segmentID)
	if err != nil {
		return nil, err
	}
	
	switch segment.Type {
	case SegmentTypeStatic:
		return segment.ContactIDs, nil
		
	case SegmentTypeDynamic:
		if segment.Rules == nil {
			return []uuid.UUID{}, nil
		}
		
		return e.QueryContacts(ctx, tenantID, segment.Rules)
		
	default:
		return nil, fmt.Errorf("unsupported segment type: %s", segment.Type)
	}
}

// RefreshSegment recalculates and updates a segment's contact count
func (e *Engine) RefreshSegment(ctx context.Context, tenantID, segmentID uuid.UUID) error {
	// Calculate contacts in segment
	contactIDs, err := e.CalculateSegment(ctx, tenantID, segmentID)
	if err != nil {
		return fmt.Errorf("failed to calculate segment: %w", err)
	}
	
	// Update segment contact count
	now := time.Now()
	updates := map[string]interface{}{
		"contact_count":       len(contactIDs),
		"last_calculated_at":  &now,
		"updated_at":         now,
	}
	
	if err := e.db.WithContext(ctx).
		Model(&models.ContactSegment{}).
		Where("id = ? AND tenant_id = ?", segmentID, tenantID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update segment: %w", err)
	}
	
	e.logger.Debug("Segment refreshed", "segment_id", segmentID, "contact_count", len(contactIDs))
	return nil
}

// RefreshAllSegments refreshes all auto-updating segments for a tenant
func (e *Engine) RefreshAllSegments(ctx context.Context, tenantID uuid.UUID) error {
	var segments []*models.ContactSegment
	err := e.db.WithContext(ctx).
		Where("tenant_id = ? AND auto_update = true AND type = ?", tenantID, string(SegmentTypeDynamic)).
		Find(&segments).Error
	
	if err != nil {
		return fmt.Errorf("failed to retrieve segments: %w", err)
	}
	
	for _, segment := range segments {
		if err := e.RefreshSegment(ctx, tenantID, segment.ID); err != nil {
			e.logger.Error("Failed to refresh segment", "segment_id", segment.ID, "error", err)
			continue
		}
	}
	
	e.logger.Info("All segments refreshed", "tenant_id", tenantID, "count", len(segments))
	return nil
}

// GetContactsInSegment retrieves contacts that belong to a segment
func (e *Engine) GetContactsInSegment(ctx context.Context, tenantID, segmentID uuid.UUID, pagination *Pagination) ([]*ContactInfo, int64, error) {
	// Get contacts in segment
	contactIDs, err := e.CalculateSegment(ctx, tenantID, segmentID)
	if err != nil {
		return nil, 0, err
	}
	
	if len(contactIDs) == 0 {
		return []*ContactInfo{}, 0, nil
	}
	
	// Convert UUIDs to strings for database query
	contactIDStrings := make([]string, len(contactIDs))
	for i, id := range contactIDs {
		contactIDStrings[i] = id.String()
	}
	
	// Query contacts from database
	query := e.db.WithContext(ctx).Model(&models.Contact{}).
		Where("tenant_id = ? AND id::text IN ?", tenantID, contactIDStrings)
	
	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count contacts: %w", err)
	}
	
	// Apply pagination
	if pagination != nil {
		query = query.Offset(pagination.Offset).Limit(pagination.Limit)
	}
	
	var dbContacts []*models.Contact
	if err := query.Find(&dbContacts).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve contacts: %w", err)
	}
	
	// Convert to ContactInfo
	contacts := make([]*ContactInfo, len(dbContacts))
	for i, dbContact := range dbContacts {
		contacts[i] = e.convertToContactInfo(dbContact)
	}
	
	return contacts, total, nil
}

// CheckContactInSegment checks if a contact belongs to a segment
func (e *Engine) CheckContactInSegment(ctx context.Context, tenantID, segmentID, contactID uuid.UUID) (bool, error) {
	segment, err := e.GetSegment(ctx, tenantID, segmentID)
	if err != nil {
		return false, err
	}
	
	switch segment.Type {
	case SegmentTypeStatic:
		for _, id := range segment.ContactIDs {
			if id == contactID {
				return true, nil
			}
		}
		return false, nil
		
	case SegmentTypeDynamic:
		if segment.Rules == nil {
			return false, nil
		}
		
		return e.ruleEngine.EvaluateRules(ctx, tenantID, contactID, segment.Rules)
		
	default:
		return false, fmt.Errorf("unsupported segment type: %s", segment.Type)
	}
}

// GetSegmentsForContact retrieves all segments that contain a contact
func (e *Engine) GetSegmentsForContact(ctx context.Context, tenantID, contactID uuid.UUID) ([]*ContactSegment, error) {
	var allSegments []*models.ContactSegment
	err := e.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Find(&allSegments).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve segments: %w", err)
	}
	
	var matchingSegments []*ContactSegment
	
	for _, dbSegment := range allSegments {
		segment := e.convertToContactSegment(dbSegment)
		
		isInSegment, err := e.CheckContactInSegment(ctx, tenantID, segment.ID, contactID)
		if err != nil {
			e.logger.Error("Failed to check contact in segment", "segment_id", segment.ID, "contact_id", contactID, "error", err)
			continue
		}
		
		if isInSegment {
			matchingSegments = append(matchingSegments, segment)
		}
	}
	
	return matchingSegments, nil
}

// QueryContacts queries contacts using segmentation rules
func (e *Engine) QueryContacts(ctx context.Context, tenantID uuid.UUID, rules *SegmentationRules) ([]uuid.UUID, error) {
	// Get all contacts for the tenant
	var contacts []*models.Contact
	err := e.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Find(&contacts).Error
	
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve contacts: %w", err)
	}
	
	var matchingIDs []uuid.UUID
	
	// Evaluate rules for each contact
	for _, contact := range contacts {
		matches, err := e.ruleEngine.EvaluateRules(ctx, tenantID, contact.ID, rules)
		if err != nil {
			e.logger.Error("Failed to evaluate rules for contact", "contact_id", contact.ID, "error", err)
			continue
		}
		
		if matches {
			matchingIDs = append(matchingIDs, contact.ID)
		}
	}
	
	return matchingIDs, nil
}

// ValidateRules validates segmentation rules
func (e *Engine) ValidateRules(ctx context.Context, rules *SegmentationRules) (*ValidationResult, error) {
	return &ValidationResult{
		IsValid: e.ruleEngine.ValidateRules(rules) == nil,
		Errors:  []ValidationError{},
		Warnings: []ValidationWarning{},
	}, nil
}

// EstimateSegmentSize estimates the number of contacts in a segment
func (e *Engine) EstimateSegmentSize(ctx context.Context, tenantID uuid.UUID, rules *SegmentationRules) (int, error) {
	contactIDs, err := e.QueryContacts(ctx, tenantID, rules)
	if err != nil {
		return 0, err
	}
	
	return len(contactIDs), nil
}

// Helper methods

func (e *Engine) validateCreateSegmentRequest(request *CreateSegmentRequest) error {
	if request.Name == "" {
		return fmt.Errorf("name is required")
	}
	
	if request.Type == SegmentTypeStatic && len(request.ContactIDs) == 0 {
		return fmt.Errorf("static segments must have contact IDs")
	}
	
	if request.Type == SegmentTypeDynamic && request.Rules == nil {
		return fmt.Errorf("dynamic segments must have rules")
	}
	
	return nil
}

func (e *Engine) convertRulesToJSON(rules *SegmentationRules) models.JSON {
	// Convert rules to map for JSON storage
	// This is a simplified conversion - in a real implementation,
	// you would use proper JSON marshaling
	result := make(models.JSON)
	result["operator"] = string(rules.Operator)
	// Add more rule conversion logic here
	return result
}

func (e *Engine) convertToContactSegment(dbSegment *models.ContactSegment) *ContactSegment {
	segment := &ContactSegment{
		ID:               dbSegment.ID,
		TenantID:         dbSegment.TenantID,
		Name:             dbSegment.Name,
		Description:      dbSegment.Description,
		Type:             SegmentType(dbSegment.Type),
		ContactCount:     dbSegment.ContactCount,
		LastCalculatedAt: dbSegment.LastCalculatedAt,
		AutoUpdate:       dbSegment.AutoUpdate,
		Tags:             dbSegment.Tags,
		CreatedAt:        dbSegment.CreatedAt,
		UpdatedAt:        dbSegment.UpdatedAt,
		CreatedByID:      dbSegment.CreatedByID,
	}
	
	// Convert contact IDs from strings to UUIDs
	if len(dbSegment.ContactIDs) > 0 {
		contactIDs := make([]uuid.UUID, len(dbSegment.ContactIDs))
		for i, idStr := range dbSegment.ContactIDs {
			if id, err := uuid.Parse(idStr); err == nil {
				contactIDs[i] = id
			}
		}
		segment.ContactIDs = contactIDs
	}
	
	// Convert rules from JSON (simplified)
	if dbSegment.Rules != nil {
		// In a real implementation, you would properly unmarshal the JSON rules
		segment.Rules = &SegmentationRules{
			Operator:   LogicalOperatorAND,
			Conditions: []*SegmentCondition{},
		}
	}
	
	return segment
}

func (e *Engine) convertToContactInfo(dbContact *models.Contact) *ContactInfo {
	info := &ContactInfo{
		ID:            dbContact.ID,
		Name:          dbContact.Name,
		PhoneNumber:   dbContact.PhoneNumber,
		Email:         dbContact.Email,
		Tags:          dbContact.Tags,
		CreatedAt:     dbContact.CreatedAt,
		LastMessageAt: dbContact.LastMessageAt,
		IsActive:      dbContact.IsActive,
	}
	
	// Convert custom fields from JSON
	if dbContact.CustomFields != nil {
		customFields := make(map[string]interface{})
		for k, v := range dbContact.CustomFields {
			customFields[k] = v
		}
		info.CustomFields = customFields
	}
	
	return info
}