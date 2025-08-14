package trigger

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/flow/engine"
	"gorm.io/gorm"
)

// Manager implements the TriggerManager interface
type Manager struct {
	db     *gorm.DB
	logger engine.Logger
}

// NewManager creates a new trigger manager
func NewManager(db *gorm.DB, logger engine.Logger) *Manager {
	return &Manager{
		db:     db,
		logger: logger,
	}
}

// CreateTrigger creates a new trigger for a flow
func (m *Manager) CreateTrigger(ctx context.Context, tenantID, flowID uuid.UUID, config *TriggerConfig) (*FlowTrigger, error) {
	// Validate the configuration
	if err := m.validateTriggerConfig(config); err != nil {
		return nil, fmt.Errorf("invalid trigger config: %w", err)
	}
	
	// Convert config to JSON
	configJSON, err := json.Marshal(config)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize trigger config: %w", err)
	}
	
	// Convert to models.JSON
	var configModel models.JSON
	if err := json.Unmarshal(configJSON, &configModel); err != nil {
		return nil, fmt.Errorf("failed to convert config to JSON: %w", err)
	}
	
	// Create database model
	dbTrigger := &models.FlowTrigger{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		FlowID:      flowID,
		Name:        fmt.Sprintf("Trigger for %s", config.Type),
		Description: fmt.Sprintf("Auto-generated trigger for %s events", config.Type),
		Type:        string(config.Type),
		Status:      string(TriggerStatusActive),
		Priority:    config.Priority,
		Config:      configModel,
	}
	
	// Save to database
	if err := m.db.WithContext(ctx).Create(dbTrigger).Error; err != nil {
		return nil, fmt.Errorf("failed to create trigger: %w", err)
	}
	
	// Convert to domain model
	trigger := m.convertToFlowTrigger(dbTrigger)
	
	m.logger.Info("Trigger created successfully", 
		"trigger_id", trigger.ID,
		"flow_id", flowID,
		"type", config.Type,
		"tenant_id", tenantID)
	
	return trigger, nil
}

// UpdateTrigger updates an existing trigger
func (m *Manager) UpdateTrigger(ctx context.Context, triggerID uuid.UUID, config *TriggerConfig) error {
	// Validate the configuration
	if err := m.validateTriggerConfig(config); err != nil {
		return fmt.Errorf("invalid trigger config: %w", err)
	}
	
	// Convert config to JSON
	configJSON, err := json.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to serialize trigger config: %w", err)
	}
	
	// Convert to models.JSON
	var configModel models.JSON
	if err := json.Unmarshal(configJSON, &configModel); err != nil {
		return fmt.Errorf("failed to convert config to JSON: %w", err)
	}
	
	// Update in database
	updates := map[string]interface{}{
		"type":       string(config.Type),
		"priority":   config.Priority,
		"config":     configModel,
		"updated_at": time.Now(),
	}
	
	result := m.db.WithContext(ctx).
		Model(&models.FlowTrigger{}).
		Where("id = ?", triggerID).
		Updates(updates)
	
	if result.Error != nil {
		return fmt.Errorf("failed to update trigger: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("trigger not found")
	}
	
	m.logger.Info("Trigger updated successfully", 
		"trigger_id", triggerID,
		"type", config.Type)
	
	return nil
}

// DeleteTrigger deletes a trigger
func (m *Manager) DeleteTrigger(ctx context.Context, triggerID uuid.UUID) error {
	result := m.db.WithContext(ctx).
		Where("id = ?", triggerID).
		Delete(&models.FlowTrigger{})
	
	if result.Error != nil {
		return fmt.Errorf("failed to delete trigger: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("trigger not found")
	}
	
	m.logger.Info("Trigger deleted successfully", "trigger_id", triggerID)
	return nil
}

// GetTrigger retrieves a trigger by ID
func (m *Manager) GetTrigger(ctx context.Context, triggerID uuid.UUID) (*FlowTrigger, error) {
	var dbTrigger models.FlowTrigger
	err := m.db.WithContext(ctx).
		Where("id = ?", triggerID).
		First(&dbTrigger).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("trigger not found")
		}
		return nil, fmt.Errorf("failed to retrieve trigger: %w", err)
	}
	
	trigger := m.convertToFlowTrigger(&dbTrigger)
	return trigger, nil
}

// ListTriggers lists triggers with filtering
func (m *Manager) ListTriggers(ctx context.Context, filter *TriggerFilter) ([]*FlowTrigger, error) {
	query := m.db.WithContext(ctx)
	
	// Apply filters
	if filter.FlowID != nil {
		query = query.Where("flow_id = ?", *filter.FlowID)
	}
	
	if filter.Type != "" {
		query = query.Where("type = ?", string(filter.Type))
	}
	
	if filter.Status != "" {
		query = query.Where("status = ?", string(filter.Status))
	}
	
	if filter.Enabled != nil {
		if *filter.Enabled {
			query = query.Where("status = ?", string(TriggerStatusActive))
		} else {
			query = query.Where("status != ?", string(TriggerStatusActive))
		}
	}
	
	// Apply pagination
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}
	
	// Order by priority and created_at
	query = query.Order("priority DESC, created_at DESC")
	
	var dbTriggers []*models.FlowTrigger
	if err := query.Find(&dbTriggers).Error; err != nil {
		return nil, fmt.Errorf("failed to list triggers: %w", err)
	}
	
	// Convert to domain models
	triggers := make([]*FlowTrigger, len(dbTriggers))
	for i, dbTrigger := range dbTriggers {
		triggers[i] = m.convertToFlowTrigger(dbTrigger)
	}
	
	return triggers, nil
}

// EnableTrigger enables a trigger
func (m *Manager) EnableTrigger(ctx context.Context, triggerID uuid.UUID) error {
	return m.updateTriggerStatus(ctx, triggerID, TriggerStatusActive)
}

// DisableTrigger disables a trigger
func (m *Manager) DisableTrigger(ctx context.Context, triggerID uuid.UUID) error {
	return m.updateTriggerStatus(ctx, triggerID, TriggerStatusInactive)
}

// GetActiveTriggers gets all active triggers for a tenant
func (m *Manager) GetActiveTriggers(ctx context.Context, tenantID uuid.UUID) ([]*FlowTrigger, error) {
	filter := &TriggerFilter{
		Status: TriggerStatusActive,
	}
	
	query := m.db.WithContext(ctx).
		Where("tenant_id = ? AND status = ?", tenantID, string(TriggerStatusActive)).
		Order("priority DESC, created_at DESC")
	
	var dbTriggers []*models.FlowTrigger
	if err := query.Find(&dbTriggers).Error; err != nil {
		return nil, fmt.Errorf("failed to get active triggers: %w", err)
	}
	
	// Convert to domain models
	triggers := make([]*FlowTrigger, len(dbTriggers))
	for i, dbTrigger := range dbTriggers {
		triggers[i] = m.convertToFlowTrigger(dbTrigger)
	}
	
	return triggers, nil
}

// Helper methods

// updateTriggerStatus updates the status of a trigger
func (m *Manager) updateTriggerStatus(ctx context.Context, triggerID uuid.UUID, status TriggerStatus) error {
	result := m.db.WithContext(ctx).
		Model(&models.FlowTrigger{}).
		Where("id = ?", triggerID).
		Updates(map[string]interface{}{
			"status":     string(status),
			"updated_at": time.Now(),
		})
	
	if result.Error != nil {
		return fmt.Errorf("failed to update trigger status: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("trigger not found")
	}
	
	m.logger.Info("Trigger status updated", 
		"trigger_id", triggerID, 
		"status", status)
	
	return nil
}

// validateTriggerConfig validates a trigger configuration
func (m *Manager) validateTriggerConfig(config *TriggerConfig) error {
	if config == nil {
		return fmt.Errorf("config cannot be nil")
	}
	
	if config.Type == "" {
		return fmt.Errorf("trigger type is required")
	}
	
	if config.Priority < 0 {
		return fmt.Errorf("priority cannot be negative")
	}
	
	// Basic validation - specific matchers will do detailed validation
	return nil
}

// convertToFlowTrigger converts a database model to domain model
func (m *Manager) convertToFlowTrigger(dbTrigger *models.FlowTrigger) *FlowTrigger {
	// Parse config JSON
	var config TriggerConfig
	if dbTrigger.Config != nil {
		configBytes, err := json.Marshal(dbTrigger.Config)
		if err == nil {
			json.Unmarshal(configBytes, &config)
		}
	}
	
	return &FlowTrigger{
		ID:            dbTrigger.ID,
		TenantID:      dbTrigger.TenantID,
		FlowID:        dbTrigger.FlowID,
		Name:          dbTrigger.Name,
		Description:   dbTrigger.Description,
		Type:          TriggerType(dbTrigger.Type),
		Status:        TriggerStatus(dbTrigger.Status),
		Priority:      dbTrigger.Priority,
		Config:        config,
		LastTriggered: dbTrigger.LastTriggered,
		TriggerCount:  dbTrigger.TriggerCount,
		ErrorCount:    dbTrigger.ErrorCount,
		LastError:     dbTrigger.LastError,
		CreatedAt:     dbTrigger.CreatedAt,
		UpdatedAt:     dbTrigger.UpdatedAt,
		CreatedByID:   dbTrigger.CreatedByID,
	}
}

// UpdateTriggerStats updates trigger statistics after execution
func (m *Manager) UpdateTriggerStats(ctx context.Context, triggerID uuid.UUID, success bool, errorMsg *string) error {
	updates := map[string]interface{}{
		"trigger_count":  gorm.Expr("trigger_count + 1"),
		"last_triggered": time.Now(),
		"updated_at":     time.Now(),
	}
	
	if success {
		updates["last_error"] = nil
	} else {
		updates["error_count"] = gorm.Expr("error_count + 1")
		if errorMsg != nil {
			updates["last_error"] = *errorMsg
		}
	}
	
	result := m.db.WithContext(ctx).
		Model(&models.FlowTrigger{}).
		Where("id = ?", triggerID).
		Updates(updates)
	
	if result.Error != nil {
		m.logger.Error("Failed to update trigger stats", 
			"error", result.Error, 
			"trigger_id", triggerID)
		return result.Error
	}
	
	return nil
}