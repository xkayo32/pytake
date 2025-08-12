package mapping

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// ManagerImpl implements the MappingManager interface
type ManagerImpl struct {
	db     *gorm.DB
	logger Logger
	engine MappingEngine
}

// TransformDirection represents the direction of data transformation
type TransformDirection string

const (
	TransformToERP      TransformDirection = "to_erp"
	TransformFromERP    TransformDirection = "from_erp"
)

// DataMapping represents a data mapping configuration
type DataMapping struct {
	ID            uuid.UUID
	ConnectionID  uuid.UUID
	EntityType    string
	FieldMappings map[string]interface{}
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// DataMappingConfig represents mapping configuration
type DataMappingConfig struct {
	EntityType    string
	FieldMappings map[string]interface{}
}

// ValidationError represents a mapping validation error
type ValidationError struct {
	Field   string
	Message string
}

// MappingTestResult represents the result of a mapping test
type MappingTestResult struct {
	Success       bool
	TransformedData map[string]interface{}
	Errors        []string
}

// TransformationInfo represents information about a transformation
type TransformationInfo struct {
	Name        string
	Description string
	Type        string
}

// MappingEngine interface for field mapping operations
type MappingEngine interface {
	TransformData(ctx context.Context, mapping *DataMapping, sourceData map[string]interface{}, direction TransformDirection) (map[string]interface{}, error)
	ValidateMapping(ctx context.Context, mapping *DataMappingConfig) ([]*ValidationError, error)
	TestMapping(ctx context.Context, mappingID uuid.UUID, sampleData map[string]interface{}, direction TransformDirection) (*MappingTestResult, error)
	GetSupportedTransformations(ctx context.Context) ([]*TransformationInfo, error)
}

// NewManager creates a new mapping manager
func NewManager(db *gorm.DB, logger Logger, engine MappingEngine) *ManagerImpl {
	return &ManagerImpl{
		db:     db,
		logger: logger,
		engine: engine,
	}
}

// Data Mapping Management

// CreateMapping creates a new data mapping
func (m *ManagerImpl) CreateMapping(ctx context.Context, tenantID uuid.UUID, config *erp.DataMappingConfig) (*erp.DataMapping, error) {
	// Validate the mapping configuration
	validationErrors, err := m.engine.ValidateMapping(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to validate mapping: %w", err)
	}

	if len(validationErrors) > 0 {
		return nil, fmt.Errorf("mapping validation failed: %d errors found", len(validationErrors))
	}

	// Check if connection exists and belongs to tenant
	var connection models.ERPConnection
	if err := m.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", config.ERPConnectionID, tenantID).
		First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("ERP connection not found")
		}
		return nil, fmt.Errorf("failed to verify connection: %w", err)
	}

	// Create the mapping model
	mappingModel := &models.ERPDataMapping{
		ERPConnectionID: config.ERPConnectionID,
		MappingName:     config.MappingName,
		Description:     config.Description,
		DataType:        config.DataType,
		Direction:       string(config.Direction),
		PyTakeEntity:    config.PyTakeEntity,
		ERPEntity:       config.ERPEntity,
		FieldMappings:   models.JSON(config.FieldMappings),
		TransformRules:  models.JSON(config.TransformRules),
		ValidationRules: models.JSON(config.ValidationRules),
		Priority:        config.SyncSettings.Priority,
		SyncFrequency:   config.SyncSettings.SyncFrequency,
		BatchSize:       config.SyncSettings.BatchSize,
		ConflictStrategy: string(config.SyncSettings.ConflictStrategy),
		IsActive:        config.IsActive,
		CreatedByID:     tenantID, // For simplicity, using tenant ID as creator
	}

	// Set tenant ID
	mappingModel.TenantID = tenantID

	// Create in database
	if err := m.db.WithContext(ctx).Create(mappingModel).Error; err != nil {
		return nil, fmt.Errorf("failed to create mapping: %w", err)
	}

	// Convert to domain model
	mapping := m.convertToDataMapping(mappingModel)

	m.logger.Info("Data mapping created", 
		"mapping_id", mapping.ID, 
		"mapping_name", mapping.MappingName,
		"tenant_id", tenantID)

	return mapping, nil
}

// UpdateMapping updates an existing data mapping
func (m *ManagerImpl) UpdateMapping(ctx context.Context, tenantID, mappingID uuid.UUID, config *erp.UpdateDataMappingConfig) (*erp.DataMapping, error) {
	// Get existing mapping
	var mappingModel models.ERPDataMapping
	if err := m.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", mappingID, tenantID).
		First(&mappingModel).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("mapping not found")
		}
		return nil, fmt.Errorf("failed to get mapping: %w", err)
	}

	// Build updates map
	updates := make(map[string]interface{})

	if config.MappingName != nil {
		updates["mapping_name"] = *config.MappingName
	}
	if config.Description != nil {
		updates["description"] = *config.Description
	}
	if config.Direction != nil {
		updates["direction"] = string(*config.Direction)
	}
	if config.FieldMappings != nil {
		updates["field_mappings"] = models.JSON(config.FieldMappings)
	}
	if config.TransformRules != nil {
		updates["transform_rules"] = models.JSON(config.TransformRules)
	}
	if config.ValidationRules != nil {
		updates["validation_rules"] = models.JSON(config.ValidationRules)
	}
	if config.SyncSettings != nil {
		updates["priority"] = config.SyncSettings.Priority
		updates["sync_frequency"] = config.SyncSettings.SyncFrequency
		updates["batch_size"] = config.SyncSettings.BatchSize
		updates["conflict_strategy"] = string(config.SyncSettings.ConflictStrategy)
	}
	if config.IsActive != nil {
		updates["is_active"] = *config.IsActive
	}

	if len(updates) == 0 {
		// No updates to apply, return current mapping
		return m.convertToDataMapping(&mappingModel), nil
	}

	// Update timestamp
	updates["updated_at"] = time.Now()

	// Apply updates
	if err := m.db.WithContext(ctx).
		Model(&mappingModel).
		Where("id = ? AND tenant_id = ?", mappingID, tenantID).
		Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update mapping: %w", err)
	}

	// Refresh the model
	if err := m.db.WithContext(ctx).First(&mappingModel, mappingID).Error; err != nil {
		return nil, fmt.Errorf("failed to refresh mapping: %w", err)
	}

	mapping := m.convertToDataMapping(&mappingModel)

	m.logger.Info("Data mapping updated", 
		"mapping_id", mappingID, 
		"tenant_id", tenantID)

	return mapping, nil
}

// DeleteMapping deletes a data mapping
func (m *ManagerImpl) DeleteMapping(ctx context.Context, tenantID, mappingID uuid.UUID) error {
	// Check if mapping exists and belongs to tenant
	var count int64
	if err := m.db.WithContext(ctx).
		Model(&models.ERPDataMapping{}).
		Where("id = ? AND tenant_id = ?", mappingID, tenantID).
		Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check mapping existence: %w", err)
	}

	if count == 0 {
		return fmt.Errorf("mapping not found")
	}

	// Delete the mapping
	if err := m.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", mappingID, tenantID).
		Delete(&models.ERPDataMapping{}).Error; err != nil {
		return fmt.Errorf("failed to delete mapping: %w", err)
	}

	m.logger.Info("Data mapping deleted", 
		"mapping_id", mappingID, 
		"tenant_id", tenantID)

	return nil
}

// GetMapping retrieves a data mapping by ID
func (m *ManagerImpl) GetMapping(ctx context.Context, tenantID, mappingID uuid.UUID) (*erp.DataMapping, error) {
	var mappingModel models.ERPDataMapping
	if err := m.db.WithContext(ctx).
		Preload("ERPConnection").
		Where("id = ? AND tenant_id = ?", mappingID, tenantID).
		First(&mappingModel).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("mapping not found")
		}
		return nil, fmt.Errorf("failed to get mapping: %w", err)
	}

	return m.convertToDataMapping(&mappingModel), nil
}

// ListMappings retrieves data mappings with filtering
func (m *ManagerImpl) ListMappings(ctx context.Context, tenantID uuid.UUID, filter *erp.MappingFilter) ([]*erp.DataMapping, error) {
	query := m.db.WithContext(ctx).
		Model(&models.ERPDataMapping{}).
		Preload("ERPConnection").
		Where("tenant_id = ?", tenantID)

	// Apply filters
	if filter != nil {
		if filter.ConnectionID != nil {
			query = query.Where("erp_connection_id = ?", *filter.ConnectionID)
		}
		if filter.DataType != "" {
			query = query.Where("data_type = ?", filter.DataType)
		}
		if filter.Direction != nil {
			query = query.Where("direction = ?", string(*filter.Direction))
		}
		if filter.IsActive != nil {
			query = query.Where("is_active = ?", *filter.IsActive)
		}
	}

	var mappingModels []*models.ERPDataMapping
	if err := query.Order("created_at DESC").Find(&mappingModels).Error; err != nil {
		return nil, fmt.Errorf("failed to list mappings: %w", err)
	}

	// Convert to domain models
	mappings := make([]*erp.DataMapping, len(mappingModels))
	for i, model := range mappingModels {
		mappings[i] = m.convertToDataMapping(model)
	}

	return mappings, nil
}

// GetMappingsByConnection retrieves all mappings for a connection
func (m *ManagerImpl) GetMappingsByConnection(ctx context.Context, tenantID, connectionID uuid.UUID) ([]*erp.DataMapping, error) {
	filter := &erp.MappingFilter{
		ConnectionID: &connectionID,
	}
	return m.ListMappings(ctx, tenantID, filter)
}

// Testing and Validation

// TestMappingTransformation tests a mapping with sample data
func (m *ManagerImpl) TestMappingTransformation(ctx context.Context, tenantID, mappingID uuid.UUID, sampleData map[string]interface{}, direction erp.TransformDirection) (*erp.MappingTestResult, error) {
	// Verify mapping belongs to tenant
	_, err := m.GetMapping(ctx, tenantID, mappingID)
	if err != nil {
		return nil, err
	}

	// Test the mapping
	result, err := m.engine.TestMapping(ctx, mappingID, sampleData, direction)
	if err != nil {
		return nil, fmt.Errorf("mapping test failed: %w", err)
	}

	m.logger.Info("Mapping test completed", 
		"mapping_id", mappingID, 
		"tenant_id", tenantID,
		"success", result.Success)

	return result, nil
}

// ValidateMappingConfig validates a mapping configuration
func (m *ManagerImpl) ValidateMappingConfig(ctx context.Context, config *erp.DataMappingConfig) ([]*erp.ValidationError, error) {
	return m.engine.ValidateMapping(ctx, config)
}

// GetSupportedTransformations returns supported transformation types
func (m *ManagerImpl) GetSupportedTransformations(ctx context.Context) ([]*erp.TransformationInfo, error) {
	return m.engine.GetSupportedTransformations(ctx)
}

// Mapping Operations

// ApplyMapping applies field mapping transformation to data
func (m *ManagerImpl) ApplyMapping(ctx context.Context, mappingID uuid.UUID, sourceData map[string]interface{}, direction erp.TransformDirection) (map[string]interface{}, error) {
	// Get mapping
	var mappingModel models.ERPDataMapping
	if err := m.db.WithContext(ctx).First(&mappingModel, mappingID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("mapping not found")
		}
		return nil, fmt.Errorf("failed to get mapping: %w", err)
	}

	// Check if mapping is active
	if !mappingModel.IsActive {
		return nil, fmt.Errorf("mapping is not active")
	}

	// Convert to domain model
	mapping := m.convertToDataMapping(&mappingModel)

	// Apply transformation
	transformedData, err := m.engine.TransformData(ctx, mapping, sourceData, direction)
	if err != nil {
		return nil, fmt.Errorf("transformation failed: %w", err)
	}

	return transformedData, nil
}

// BulkApplyMapping applies mapping to multiple records
func (m *ManagerImpl) BulkApplyMapping(ctx context.Context, mappingID uuid.UUID, sourceDataList []map[string]interface{}, direction erp.TransformDirection) ([]map[string]interface{}, []error) {
	results := make([]map[string]interface{}, len(sourceDataList))
	errors := make([]error, len(sourceDataList))

	for i, sourceData := range sourceDataList {
		transformedData, err := m.ApplyMapping(ctx, mappingID, sourceData, direction)
		if err != nil {
			errors[i] = err
		} else {
			results[i] = transformedData
		}
	}

	return results, errors
}

// Mapping Statistics and Analytics

// GetMappingStats returns mapping statistics
func (m *ManagerImpl) GetMappingStats(ctx context.Context, tenantID uuid.UUID, dateRange *erp.DateRange) (*erp.MappingStats, error) {
	stats := &erp.MappingStats{
		TenantID:  tenantID,
		DateRange: dateRange,
	}

	// Count total mappings
	if err := m.db.WithContext(ctx).
		Model(&models.ERPDataMapping{}).
		Where("tenant_id = ?", tenantID).
		Count(&stats.TotalMappings).Error; err != nil {
		return nil, fmt.Errorf("failed to count mappings: %w", err)
	}

	// Count active mappings
	if err := m.db.WithContext(ctx).
		Model(&models.ERPDataMapping{}).
		Where("tenant_id = ? AND is_active = true", tenantID).
		Count(&stats.ActiveMappings).Error; err != nil {
		return nil, fmt.Errorf("failed to count active mappings: %w", err)
	}

	// Count mappings by direction
	directions := []string{"bidirectional", "pytake_to_erp", "erp_to_pytake"}
	stats.MappingsByDirection = make(map[string]int64)
	
	for _, direction := range directions {
		var count int64
		if err := m.db.WithContext(ctx).
			Model(&models.ERPDataMapping{}).
			Where("tenant_id = ? AND direction = ?", tenantID, direction).
			Count(&count).Error; err != nil {
			return nil, fmt.Errorf("failed to count mappings by direction: %w", err)
		}
		stats.MappingsByDirection[direction] = count
	}

	// Get mapping performance metrics from sync logs if date range provided
	if dateRange != nil {
		// This would require joining with sync logs
		// For now, set placeholder values
		stats.TotalTransformations = 0
		stats.SuccessfulTransformations = 0
		stats.FailedTransformations = 0
		stats.AvgTransformationTime = 0
	}

	return stats, nil
}

// GetMappingUsage returns mapping usage analytics
func (m *ManagerImpl) GetMappingUsage(ctx context.Context, tenantID, mappingID uuid.UUID, dateRange *erp.DateRange) (*erp.MappingUsage, error) {
	usage := &erp.MappingUsage{
		MappingID: mappingID,
		DateRange: dateRange,
	}

	// Get usage stats from sync logs
	// This would require joining with ERPSyncLog table
	// For now, return placeholder data
	usage.TotalUsage = 0
	usage.SuccessfulUsage = 0
	usage.FailedUsage = 0
	usage.LastUsedAt = nil

	return usage, nil
}

// Helper Methods

func (m *ManagerImpl) convertToDataMapping(model *models.ERPDataMapping) *erp.DataMapping {
	return &erp.DataMapping{
		ID:              model.ID,
		ERPConnectionID: model.ERPConnectionID,
		MappingName:     model.MappingName,
		Description:     model.Description,
		DataType:        model.DataType,
		Direction:       erp.SyncDirection(model.Direction),
		PyTakeEntity:    model.PyTakeEntity,
		ERPEntity:       model.ERPEntity,
		FieldMappings:   model.FieldMappings,
		TransformRules:  model.TransformRules,
		ValidationRules: model.ValidationRules,
		SyncSettings: erp.SyncSettings{
			Priority:         model.Priority,
			SyncFrequency:    model.SyncFrequency,
			BatchSize:        model.BatchSize,
			ConflictStrategy: erp.ConflictResolutionStrategy(model.ConflictStrategy),
		},
		IsActive:  model.IsActive,
		CreatedAt: model.CreatedAt,
		UpdatedAt: model.UpdatedAt,
	}
}