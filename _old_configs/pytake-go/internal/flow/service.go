package flow

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

// Service handles flow operations and management
type Service struct {
	db         *gorm.DB
	engine     engine.FlowEngine
	logger     engine.Logger
	services   *engine.ServiceContainer
}

// NewService creates a new flow service
func NewService(db *gorm.DB, services *engine.ServiceContainer, logger engine.Logger) *Service {
	// Create flow engine
	flowEngine := engine.NewEngine(services, logger)
	
	return &Service{
		db:       db,
		engine:   flowEngine,
		logger:   logger,
		services: services,
	}
}

// CreateFlow creates a new flow
func (s *Service) CreateFlow(ctx context.Context, tenantID uuid.UUID, req *CreateFlowRequest) (*models.Flow, error) {
	// Validate flow definition
	if err := s.engine.ValidateFlow(req.Definition); err != nil {
		return nil, fmt.Errorf("invalid flow definition: %w", err)
	}
	
	// Convert definition to JSON
	var definitionJSON models.JSON
	if req.Definition != nil {
		defBytes, err := json.Marshal(req.Definition)
		if err != nil {
			return nil, fmt.Errorf("failed to serialize flow definition: %w", err)
		}
		definitionJSON = make(models.JSON)
		if err := json.Unmarshal(defBytes, &definitionJSON); err != nil {
			return nil, fmt.Errorf("failed to convert definition to JSON: %w", err)
		}
	}
	
	// Convert triggers to JSON
	var triggersJSON models.JSON
	if req.Triggers != nil {
		trigBytes, err := json.Marshal(req.Triggers)
		if err != nil {
			return nil, fmt.Errorf("failed to serialize triggers: %w", err)
		}
		triggersJSON = make(models.JSON)
		if err := json.Unmarshal(trigBytes, &triggersJSON); err != nil {
			return nil, fmt.Errorf("failed to convert triggers to JSON: %w", err)
		}
	}
	
	// Create flow model
	flow := &models.Flow{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		Status:      req.Status,
		Version:     1,
		Definition:  definitionJSON,
		Triggers:    triggersJSON,
		Tags:        req.Tags,
		Priority:    req.Priority,
		CreatedByID: req.CreatedByID,
		IsPublic:    req.IsPublic,
	}
	
	// Save to database
	if err := s.db.WithContext(ctx).Create(flow).Error; err != nil {
		return nil, fmt.Errorf("failed to create flow: %w", err)
	}
	
	s.logger.Info("Flow created successfully", 
		"flow_id", flow.ID, 
		"name", flow.Name,
		"tenant_id", tenantID)
	
	return flow, nil
}

// GetFlow retrieves a flow by ID
func (s *Service) GetFlow(ctx context.Context, tenantID, flowID uuid.UUID) (*models.Flow, error) {
	var flow models.Flow
	err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", flowID, tenantID).
		First(&flow).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("flow not found")
		}
		return nil, fmt.Errorf("failed to retrieve flow: %w", err)
	}
	
	return &flow, nil
}

// ListFlows retrieves flows with pagination and filtering
func (s *Service) ListFlows(ctx context.Context, tenantID uuid.UUID, filter *FlowFilter) ([]*models.Flow, int64, error) {
	query := s.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID)
	
	// Apply filters
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.Search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", 
			"%"+filter.Search+"%", "%"+filter.Search+"%")
	}
	
	// Get total count
	var total int64
	if err := query.Model(&models.Flow{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count flows: %w", err)
	}
	
	// Apply pagination and sorting
	if filter.SortBy != "" {
		order := filter.SortBy
		if filter.SortDesc {
			order += " DESC"
		}
		query = query.Order(order)
	} else {
		query = query.Order("created_at DESC")
	}
	
	query = query.Offset(filter.Offset).Limit(filter.Limit)
	
	var flows []*models.Flow
	if err := query.Find(&flows).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve flows: %w", err)
	}
	
	return flows, total, nil
}

// UpdateFlow updates an existing flow
func (s *Service) UpdateFlow(ctx context.Context, tenantID, flowID uuid.UUID, req *UpdateFlowRequest) (*models.Flow, error) {
	// Get existing flow
	flow, err := s.GetFlow(ctx, tenantID, flowID)
	if err != nil {
		return nil, err
	}
	
	// Update fields
	updates := map[string]interface{}{
		"updated_at": time.Now(),
	}
	
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Priority != nil {
		updates["priority"] = *req.Priority
	}
	if req.Tags != nil {
		updates["tags"] = *req.Tags
	}
	if req.IsPublic != nil {
		updates["is_public"] = *req.IsPublic
	}
	
	// Handle definition update
	if req.Definition != nil {
		// Validate new definition
		if err := s.engine.ValidateFlow(req.Definition); err != nil {
			return nil, fmt.Errorf("invalid flow definition: %w", err)
		}
		
		// Create new version if flow is active
		if flow.Status == string(models.FlowStatusActive) {
			if err := s.createFlowVersion(ctx, flow); err != nil {
				s.logger.Warn("Failed to create flow version", "error", err)
			}
			updates["version"] = flow.Version + 1
		}
		
		var definitionJSON models.JSON
		defBytes, err := json.Marshal(req.Definition)
		if err != nil {
			return nil, fmt.Errorf("failed to serialize flow definition: %w", err)
		}
		definitionJSON = make(models.JSON)
		if err := json.Unmarshal(defBytes, &definitionJSON); err != nil {
			return nil, fmt.Errorf("failed to convert definition to JSON: %w", err)
		}
		updates["definition"] = definitionJSON
	}
	
	// Handle triggers update
	if req.Triggers != nil {
		var triggersJSON models.JSON
		trigBytes, err := json.Marshal(req.Triggers)
		if err != nil {
			return nil, fmt.Errorf("failed to serialize triggers: %w", err)
		}
		triggersJSON = make(models.JSON)
		if err := json.Unmarshal(trigBytes, &triggersJSON); err != nil {
			return nil, fmt.Errorf("failed to convert triggers to JSON: %w", err)
		}
		updates["triggers"] = triggersJSON
	}
	
	// Update in database
	if err := s.db.WithContext(ctx).
		Model(flow).
		Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update flow: %w", err)
	}
	
	s.logger.Info("Flow updated successfully", 
		"flow_id", flowID, 
		"tenant_id", tenantID)
	
	return flow, nil
}

// DeleteFlow deletes a flow
func (s *Service) DeleteFlow(ctx context.Context, tenantID, flowID uuid.UUID) error {
	// Check if flow has active executions
	var activeCount int64
	err := s.db.WithContext(ctx).
		Model(&models.FlowExecution{}).
		Where("flow_id = ? AND status IN (?)", flowID, 
			[]string{"running", "paused", "waiting"}).
		Count(&activeCount).Error
	
	if err != nil {
		return fmt.Errorf("failed to check active executions: %w", err)
	}
	
	if activeCount > 0 {
		return fmt.Errorf("cannot delete flow with active executions")
	}
	
	// Soft delete the flow
	if err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", flowID, tenantID).
		Delete(&models.Flow{}).Error; err != nil {
		return fmt.Errorf("failed to delete flow: %w", err)
	}
	
	s.logger.Info("Flow deleted successfully", 
		"flow_id", flowID, 
		"tenant_id", tenantID)
	
	return nil
}

// ExecuteFlow starts flow execution
func (s *Service) ExecuteFlow(ctx context.Context, tenantID, flowID uuid.UUID, req *ExecuteFlowRequest) (*models.FlowExecution, error) {
	// Get flow
	flow, err := s.GetFlow(ctx, tenantID, flowID)
	if err != nil {
		return nil, err
	}
	
	// Check if flow is active
	if flow.Status != string(models.FlowStatusActive) {
		return nil, fmt.Errorf("flow is not active")
	}
	
	// Parse flow definition
	var flowDef *engine.FlowDefinition
	defBytes, err := json.Marshal(flow.Definition)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal flow definition: %w", err)
	}
	if err := json.Unmarshal(defBytes, &flowDef); err != nil {
		return nil, fmt.Errorf("failed to parse flow definition: %w", err)
	}
	
	// Create execution record
	execution := &models.FlowExecution{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		FlowID:         flowID,
		ConversationID: req.ConversationID,
		ContactID:      req.ContactID,
		Status:         string(models.FlowExecutionStatusPending),
		Variables:      mustMarshalToJSON(req.Variables),
		Context:        mustMarshalToJSON(req.Context),
		StartedAt:      time.Now(),
		TriggerType:    req.TriggerType,
		TriggerData:    mustMarshalToJSON(req.TriggerData),
	}
	
	// Save execution
	if err := s.db.WithContext(ctx).Create(execution).Error; err != nil {
		return nil, fmt.Errorf("failed to create execution: %w", err)
	}
	
	// Create execution context
	execCtx := &engine.ExecutionContext{
		FlowID:         flowID,
		ExecutionID:    execution.ID,
		TenantID:       tenantID,
		ContactID:      req.ContactID,
		ConversationID: req.ConversationID,
		UserID:         req.UserID,
		Variables:      req.Variables,
		Context:        req.Context,
		Services:       s.services,
		Logger:         s.logger,
		FlowDefinition: flowDef,
		StartTime:      time.Now(),
		LastActivity:   time.Now(),
		TriggerType:    req.TriggerType,
		TriggerData:    req.TriggerData,
	}
	
	// Start execution in background
	go s.executeFlowAsync(ctx, execution, execCtx)
	
	s.logger.Info("Flow execution started", 
		"execution_id", execution.ID,
		"flow_id", flowID,
		"tenant_id", tenantID)
	
	return execution, nil
}

// executeFlowAsync executes the flow asynchronously
func (s *Service) executeFlowAsync(ctx context.Context, execution *models.FlowExecution, execCtx *engine.ExecutionContext) {
	// Update execution status to running
	s.updateExecutionStatus(ctx, execution.ID, models.FlowExecutionStatusRunning, nil)
	
	// Execute the flow
	result, err := s.engine.ExecuteFlow(ctx, execCtx.FlowID, execCtx)
	
	// Update execution with final result
	updates := map[string]interface{}{
		"completed_at": time.Now(),
	}
	
	if err != nil {
		updates["status"] = string(models.FlowExecutionStatusFailed)
		updates["error_message"] = err.Error()
		s.logger.Error("Flow execution failed", 
			"execution_id", execution.ID,
			"error", err)
	} else {
		updates["status"] = string(result.Status)
		if result.FinalVariables != nil {
			updates["variables"] = mustMarshalToJSON(result.FinalVariables)
		}
		s.logger.Info("Flow execution completed", 
			"execution_id", execution.ID,
			"status", result.Status)
	}
	
	s.db.WithContext(ctx).
		Model(&models.FlowExecution{}).
		Where("id = ?", execution.ID).
		Updates(updates)
	
	// Update flow statistics
	s.updateFlowStats(ctx, execCtx.FlowID, result.Status == engine.ExecutionStatusCompleted)
}

// GetExecution retrieves a flow execution
func (s *Service) GetExecution(ctx context.Context, tenantID, executionID uuid.UUID) (*models.FlowExecution, error) {
	var execution models.FlowExecution
	err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", executionID, tenantID).
		First(&execution).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("execution not found")
		}
		return nil, fmt.Errorf("failed to retrieve execution: %w", err)
	}
	
	return &execution, nil
}

// ListExecutions retrieves executions with filtering
func (s *Service) ListExecutions(ctx context.Context, tenantID uuid.UUID, filter *ExecutionFilter) ([]*models.FlowExecution, int64, error) {
	query := s.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID)
	
	// Apply filters
	if filter.FlowID != nil {
		query = query.Where("flow_id = ?", *filter.FlowID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.ContactID != nil {
		query = query.Where("contact_id = ?", *filter.ContactID)
	}
	if filter.StartDateFrom != nil {
		query = query.Where("started_at >= ?", *filter.StartDateFrom)
	}
	if filter.StartDateTo != nil {
		query = query.Where("started_at <= ?", *filter.StartDateTo)
	}
	
	// Get total count
	var total int64
	if err := query.Model(&models.FlowExecution{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count executions: %w", err)
	}
	
	// Apply pagination
	query = query.Order("started_at DESC").
		Offset(filter.Offset).
		Limit(filter.Limit)
	
	var executions []*models.FlowExecution
	if err := query.Find(&executions).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve executions: %w", err)
	}
	
	return executions, total, nil
}

// StopExecution stops a running execution
func (s *Service) StopExecution(ctx context.Context, tenantID, executionID uuid.UUID) error {
	// Cancel through engine
	if err := s.engine.CancelExecution(ctx, executionID); err != nil {
		return fmt.Errorf("failed to cancel execution: %w", err)
	}
	
	// Update database
	return s.updateExecutionStatus(ctx, executionID, models.FlowExecutionStatusCancelled, nil)
}

// PauseExecution pauses a running execution
func (s *Service) PauseExecution(ctx context.Context, tenantID, executionID uuid.UUID) error {
	// Pause through engine
	if err := s.engine.PauseExecution(ctx, executionID); err != nil {
		return fmt.Errorf("failed to pause execution: %w", err)
	}
	
	// Update database
	now := time.Now()
	return s.updateExecutionStatus(ctx, executionID, models.FlowExecutionStatusPaused, &now)
}

// ResumeExecution resumes a paused execution
func (s *Service) ResumeExecution(ctx context.Context, tenantID, executionID uuid.UUID) error {
	// Resume through engine
	if _, err := s.engine.ResumeExecution(ctx, executionID); err != nil {
		return fmt.Errorf("failed to resume execution: %w", err)
	}
	
	// Update database
	return s.updateExecutionStatus(ctx, executionID, models.FlowExecutionStatusRunning, nil)
}

// Helper methods

func (s *Service) createFlowVersion(ctx context.Context, flow *models.Flow) error {
	version := &models.FlowVersion{
		FlowID:      flow.ID,
		Version:     flow.Version,
		Definition:  flow.Definition,
		ChangeLog:   "Auto-saved before update",
		CreatedByID: flow.CreatedByID,
	}
	
	return s.db.WithContext(ctx).Create(version).Error
}

func (s *Service) updateExecutionStatus(ctx context.Context, executionID uuid.UUID, status models.FlowExecutionStatus, pausedAt *time.Time) error {
	updates := map[string]interface{}{
		"status": string(status),
	}
	
	if pausedAt != nil {
		updates["paused_at"] = pausedAt
	}
	
	return s.db.WithContext(ctx).
		Model(&models.FlowExecution{}).
		Where("id = ?", executionID).
		Updates(updates).Error
}

func (s *Service) updateFlowStats(ctx context.Context, flowID uuid.UUID, success bool) {
	updates := map[string]interface{}{
		"execution_count": gorm.Expr("execution_count + 1"),
		"last_executed_at": time.Now(),
	}
	
	if success {
		updates["success_count"] = gorm.Expr("success_count + 1")
	}
	
	s.db.WithContext(ctx).
		Model(&models.Flow{}).
		Where("id = ?", flowID).
		Updates(updates)
}

// mustMarshal marshals to JSON or returns empty JSON object
func mustMarshal(v interface{}) []byte {
	if v == nil {
		return []byte("{}")
	}
	
	data, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	
	return data
}

// mustMarshalToJSON marshals to models.JSON or returns empty JSON object
func mustMarshalToJSON(v interface{}) models.JSON {
	if v == nil {
		return make(models.JSON)
	}
	
	// If it's already a map[string]interface{}, convert directly
	if mapValue, ok := v.(map[string]interface{}); ok {
		result := make(models.JSON)
		for k, val := range mapValue {
			result[k] = val
		}
		return result
	}
	
	// Otherwise, marshal and unmarshal
	data, err := json.Marshal(v)
	if err != nil {
		return make(models.JSON)
	}
	
	var result models.JSON
	if err := json.Unmarshal(data, &result); err != nil {
		return make(models.JSON)
	}
	
	return result
}