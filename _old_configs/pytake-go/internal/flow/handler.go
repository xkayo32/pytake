package flow

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/flow/engine"
	"github.com/pytake/pytake-go/internal/logger"
	"gorm.io/gorm"
)

// Handler handles HTTP requests for flow operations
type Handler struct {
	service *Service
	logger  *logger.Logger
}

// NewHandler creates a new flow handler
func NewHandler(db *gorm.DB, services *engine.ServiceContainer, log *logger.Logger) *Handler {
	service := NewService(db, services, log)
	
	return &Handler{
		service: service,
		logger:  log,
	}
}

// Flow Management Endpoints

// CreateFlow handles POST /flows
func (h *Handler) CreateFlow(c *gin.Context) {
	claims := c.MustGet("user").(*auth.Claims)
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	var req CreateFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid request: "+err.Error()))
		return
	}
	
	// Set created by from claims
	req.CreatedByID = claims.UserID
	
	flow, err := h.service.CreateFlow(c.Request.Context(), tenantID, &req)
	if err != nil {
		h.logger.Error("Failed to create flow", "error", err, "tenant_id", tenantID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to create flow"))
		return
	}
	
	response := h.convertFlowToResponse(flow, true)
	c.JSON(http.StatusCreated, NewSuccessResponse(response, "Flow created successfully"))
}

// GetFlow handles GET /flows/:id
func (h *Handler) GetFlow(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	flowID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid flow ID"))
		return
	}
	
	flow, err := h.service.GetFlow(c.Request.Context(), tenantID, flowID)
	if err != nil {
		if err.Error() == "flow not found" {
			c.JSON(http.StatusNotFound, NewErrorResponse[interface{}]("Flow not found"))
			return
		}
		h.logger.Error("Failed to get flow", "error", err, "flow_id", flowID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to retrieve flow"))
		return
	}
	
	response := h.convertFlowToResponse(flow, true)
	c.JSON(http.StatusOK, NewSuccessResponse(response, ""))
}

// ListFlows handles GET /flows
func (h *Handler) ListFlows(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	// Parse query parameters
	filter := &FlowFilter{
		Status:   c.Query("status"),
		Category: c.Query("category"),
		Search:   c.Query("search"),
		SortBy:   c.DefaultQuery("sort_by", "created_at"),
		SortDesc: c.Query("sort_desc") == "true",
		Limit:    parseIntDefault(c.Query("limit"), 20),
		Offset:   parseIntDefault(c.Query("offset"), 0),
	}
	
	flows, total, err := h.service.ListFlows(c.Request.Context(), tenantID, filter)
	if err != nil {
		h.logger.Error("Failed to list flows", "error", err, "tenant_id", tenantID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to retrieve flows"))
		return
	}
	
	// Convert to response format
	responses := make([]*FlowSummaryResponse, len(flows))
	for i, flow := range flows {
		responses[i] = h.convertFlowToSummaryResponse(flow)
	}
	
	page := (filter.Offset / filter.Limit) + 1
	paginatedResponse := NewPaginatedResponse(responses, total, page, filter.Limit)
	
	c.JSON(http.StatusOK, NewSuccessResponse(paginatedResponse, ""))
}

// UpdateFlow handles PUT /flows/:id
func (h *Handler) UpdateFlow(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	flowID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid flow ID"))
		return
	}
	
	var req UpdateFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid request: "+err.Error()))
		return
	}
	
	flow, err := h.service.UpdateFlow(c.Request.Context(), tenantID, flowID, &req)
	if err != nil {
		if err.Error() == "flow not found" {
			c.JSON(http.StatusNotFound, NewErrorResponse[interface{}]("Flow not found"))
			return
		}
		h.logger.Error("Failed to update flow", "error", err, "flow_id", flowID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to update flow"))
		return
	}
	
	response := h.convertFlowToResponse(flow, true)
	c.JSON(http.StatusOK, NewSuccessResponse(response, "Flow updated successfully"))
}

// DeleteFlow handles DELETE /flows/:id
func (h *Handler) DeleteFlow(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	flowID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid flow ID"))
		return
	}
	
	if err := h.service.DeleteFlow(c.Request.Context(), tenantID, flowID); err != nil {
		if err.Error() == "flow not found" {
			c.JSON(http.StatusNotFound, NewErrorResponse[interface{}]("Flow not found"))
			return
		}
		if err.Error() == "cannot delete flow with active executions" {
			c.JSON(http.StatusConflict, NewErrorResponse[interface{}]("Cannot delete flow with active executions"))
			return
		}
		h.logger.Error("Failed to delete flow", "error", err, "flow_id", flowID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to delete flow"))
		return
	}
	
	c.JSON(http.StatusOK, NewSuccessResponse(map[string]string{"message": "Flow deleted successfully"}, "Flow deleted successfully"))
}

// Flow Execution Endpoints

// ExecuteFlow handles POST /flows/:id/execute
func (h *Handler) ExecuteFlow(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	flowID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid flow ID"))
		return
	}
	
	var req ExecuteFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid request: "+err.Error()))
		return
	}
	
	// Set user ID from claims if available
	if claims, exists := c.Get("user"); exists {
		userClaims := claims.(*auth.Claims)
		req.UserID = &userClaims.UserID
	}
	
	execution, err := h.service.ExecuteFlow(c.Request.Context(), tenantID, flowID, &req)
	if err != nil {
		h.logger.Error("Failed to execute flow", "error", err, "flow_id", flowID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to execute flow: "+err.Error()))
		return
	}
	
	response := h.convertExecutionToResponse(execution)
	c.JSON(http.StatusAccepted, NewSuccessResponse(response, "Flow execution started"))
}

// GetExecution handles GET /executions/:id
func (h *Handler) GetExecution(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	executionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid execution ID"))
		return
	}
	
	execution, err := h.service.GetExecution(c.Request.Context(), tenantID, executionID)
	if err != nil {
		if err.Error() == "execution not found" {
			c.JSON(http.StatusNotFound, NewErrorResponse[interface{}]("Execution not found"))
			return
		}
		h.logger.Error("Failed to get execution", "error", err, "execution_id", executionID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to retrieve execution"))
		return
	}
	
	response := h.convertExecutionToResponse(execution)
	c.JSON(http.StatusOK, NewSuccessResponse(response, ""))
}

// ListExecutions handles GET /executions
func (h *Handler) ListExecutions(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	
	// Parse query parameters
	filter := &ExecutionFilter{
		Status:      c.Query("status"),
		TriggerType: c.Query("trigger_type"),
		Limit:       parseIntDefault(c.Query("limit"), 20),
		Offset:      parseIntDefault(c.Query("offset"), 0),
	}
	
	// Parse UUID parameters
	if flowIDStr := c.Query("flow_id"); flowIDStr != "" {
		if flowID, err := uuid.Parse(flowIDStr); err == nil {
			filter.FlowID = &flowID
		}
	}
	
	if contactIDStr := c.Query("contact_id"); contactIDStr != "" {
		if contactID, err := uuid.Parse(contactIDStr); err == nil {
			filter.ContactID = &contactID
		}
	}
	
	executions, total, err := h.service.ListExecutions(c.Request.Context(), tenantID, filter)
	if err != nil {
		h.logger.Error("Failed to list executions", "error", err, "tenant_id", tenantID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to retrieve executions"))
		return
	}
	
	// Convert to response format
	responses := make([]*FlowExecutionResponse, len(executions))
	for i, execution := range executions {
		responses[i] = h.convertExecutionToResponse(execution)
	}
	
	page := (filter.Offset / filter.Limit) + 1
	paginatedResponse := NewPaginatedResponse(responses, total, page, filter.Limit)
	
	c.JSON(http.StatusOK, NewSuccessResponse(paginatedResponse, ""))
}

// StopExecution handles POST /executions/:id/stop
func (h *Handler) StopExecution(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	executionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid execution ID"))
		return
	}
	
	if err := h.service.StopExecution(c.Request.Context(), tenantID, executionID); err != nil {
		h.logger.Error("Failed to stop execution", "error", err, "execution_id", executionID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to stop execution"))
		return
	}
	
	c.JSON(http.StatusOK, NewSuccessResponse(map[string]string{"message": "Execution stopped"}, "Execution stopped successfully"))
}

// PauseExecution handles POST /executions/:id/pause
func (h *Handler) PauseExecution(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	executionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid execution ID"))
		return
	}
	
	if err := h.service.PauseExecution(c.Request.Context(), tenantID, executionID); err != nil {
		h.logger.Error("Failed to pause execution", "error", err, "execution_id", executionID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to pause execution"))
		return
	}
	
	c.JSON(http.StatusOK, NewSuccessResponse(map[string]string{"message": "Execution paused"}, "Execution paused successfully"))
}

// ResumeExecution handles POST /executions/:id/resume
func (h *Handler) ResumeExecution(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(uuid.UUID)
	executionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid execution ID"))
		return
	}
	
	if err := h.service.ResumeExecution(c.Request.Context(), tenantID, executionID); err != nil {
		h.logger.Error("Failed to resume execution", "error", err, "execution_id", executionID)
		c.JSON(http.StatusInternalServerError, NewErrorResponse[interface{}]("Failed to resume execution"))
		return
	}
	
	c.JSON(http.StatusOK, NewSuccessResponse(map[string]string{"message": "Execution resumed"}, "Execution resumed successfully"))
}

// Flow Builder Endpoints

// ValidateFlow handles POST /flows/validate
func (h *Handler) ValidateFlow(c *gin.Context) {
	var req ValidateFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse[interface{}]("Invalid request: "+err.Error()))
		return
	}
	
	// Create a temporary engine to validate
	tempEngine := engine.NewEngine(nil, h.logger)
	err := tempEngine.ValidateFlow(req.Definition)
	
	response := &ValidateFlowResponse{
		IsValid: err == nil,
		Summary: h.buildValidationSummary(req.Definition),
	}
	
	if err != nil {
		response.Errors = []ValidationError{
			{
				Code:     "VALIDATION_FAILED",
				Message:  err.Error(),
				Severity: "error",
			},
		}
	}
	
	c.JSON(http.StatusOK, NewSuccessResponse(response, ""))
}

// GetAvailableNodes handles GET /flows/builder/nodes
func (h *Handler) GetAvailableNodes(c *gin.Context) {
	// Create temporary engine to get registered nodes
	tempEngine := engine.NewEngine(nil, h.logger)
	nodeTypes := tempEngine.GetRegisteredNodes()
	
	// Convert to response format
	nodes := make([]map[string]interface{}, len(nodeTypes))
	for i, nodeType := range nodeTypes {
		nodes[i] = map[string]interface{}{
			"type":        string(nodeType),
			"name":        h.getNodeDisplayName(nodeType),
			"description": h.getNodeDescription(nodeType),
			"category":    h.getNodeCategory(nodeType),
			"config":      h.getNodeConfigSchema(nodeType),
		}
	}
	
	c.JSON(http.StatusOK, NewSuccessResponse(nodes, ""))
}

// Helper methods

func (h *Handler) convertFlowToResponse(flow *models.Flow, includeDefinition bool) *FlowResponse {
	response := &FlowResponse{
		ID:             flow.ID,
		TenantID:       flow.TenantID,
		Name:           flow.Name,
		Description:    flow.Description,
		Category:       flow.Category,
		Status:         flow.Status,
		Version:        flow.Version,
		Priority:       flow.Priority,
		Tags:           flow.Tags,
		IsPublic:       flow.IsPublic,
		ExecutionCount: flow.ExecutionCount,
		SuccessCount:   flow.SuccessCount,
		LastExecutedAt: flow.LastExecutedAt,
		CreatedAt:      flow.CreatedAt,
		UpdatedAt:      flow.UpdatedAt,
		CreatedByID:    flow.CreatedByID,
	}
	
	if includeDefinition && flow.Definition != nil {
		// Convert JSON back to FlowDefinition
		var definition engine.FlowDefinition
		if defBytes, err := flow.Definition.Value(); err == nil {
			if bytes, ok := defBytes.([]byte); ok {
				json.Unmarshal(bytes, &definition)
				response.Definition = &definition
			}
		}
	}
	
	if flow.Triggers != nil {
		// Convert JSON back to interface{}
		if trigBytes, err := flow.Triggers.Value(); err == nil {
			if bytes, ok := trigBytes.([]byte); ok {
				var triggers interface{}
				json.Unmarshal(bytes, &triggers)
				response.Triggers = triggers
			}
		}
	}
	
	return response
}

func (h *Handler) convertFlowToSummaryResponse(flow *models.Flow) *FlowSummaryResponse {
	return &FlowSummaryResponse{
		ID:             flow.ID,
		Name:           flow.Name,
		Description:    flow.Description,
		Category:       flow.Category,
		Status:         flow.Status,
		Version:        flow.Version,
		Priority:       flow.Priority,
		Tags:           flow.Tags,
		ExecutionCount: flow.ExecutionCount,
		SuccessCount:   flow.SuccessCount,
		LastExecutedAt: flow.LastExecutedAt,
		CreatedAt:      flow.CreatedAt,
		UpdatedAt:      flow.UpdatedAt,
	}
}

func (h *Handler) convertExecutionToResponse(execution *models.FlowExecution) *FlowExecutionResponse {
	response := &FlowExecutionResponse{
		ID:             execution.ID,
		TenantID:       execution.TenantID,
		FlowID:         execution.FlowID,
		ConversationID: execution.ConversationID,
		ContactID:      execution.ContactID,
		Status:         execution.Status,
		CurrentNodeID:  execution.CurrentNodeID,
		StartedAt:      execution.StartedAt,
		CompletedAt:    execution.CompletedAt,
		PausedAt:       execution.PausedAt,
		ErrorMessage:   execution.ErrorMessage,
		ErrorNodeID:    execution.ErrorNodeID,
		RetryCount:     execution.RetryCount,
		TriggerType:    execution.TriggerType,
	}
	
	// Convert JSON fields
	if execution.Variables != nil {
		variables := make(map[string]interface{})
		for k, v := range execution.Variables {
			variables[k] = v
		}
		response.Variables = variables
	}
	
	if execution.Context != nil {
		context := make(map[string]interface{})
		for k, v := range execution.Context {
			context[k] = v
		}
		response.Context = context
	}
	
	if execution.TriggerData != nil {
		triggerData := make(map[string]interface{})
		for k, v := range execution.TriggerData {
			triggerData[k] = v
		}
		response.TriggerData = triggerData
	}
	
	// Calculate duration if completed
	if execution.CompletedAt != nil {
		duration := execution.CompletedAt.Sub(execution.StartedAt).Milliseconds()
		response.Duration = &duration
	}
	
	return response
}

func (h *Handler) buildValidationSummary(definition *engine.FlowDefinition) ValidationSummary {
	summary := ValidationSummary{
		TotalNodes:  len(definition.Nodes),
		Variables:   len(definition.Variables),
	}
	
	// Count node types
	for _, node := range definition.Nodes {
		switch node.Type {
		case engine.NodeTypeStart:
			summary.StartNodes++
		case engine.NodeTypeEnd:
			summary.EndNodes++
		case engine.NodeTypeMessage:
			summary.MessageNodes++
		case engine.NodeTypeCondition:
			summary.ConditionNodes++
		case engine.NodeTypeAction:
			summary.ActionNodes++
		case engine.NodeTypeDelay:
			summary.DelayNodes++
		}
		
		summary.Connections += len(node.Connections)
	}
	
	return summary
}

func (h *Handler) getNodeDisplayName(nodeType engine.NodeType) string {
	switch nodeType {
	case engine.NodeTypeStart:
		return "Start"
	case engine.NodeTypeMessage:
		return "Send Message"
	case engine.NodeTypeCondition:
		return "Condition"
	case engine.NodeTypeAction:
		return "Action"
	case engine.NodeTypeDelay:
		return "Delay"
	case engine.NodeTypeEnd:
		return "End"
	default:
		return string(nodeType)
	}
}

func (h *Handler) getNodeDescription(nodeType engine.NodeType) string {
	switch nodeType {
	case engine.NodeTypeStart:
		return "Starting point of the flow"
	case engine.NodeTypeMessage:
		return "Send WhatsApp messages"
	case engine.NodeTypeCondition:
		return "Make decisions based on conditions"
	case engine.NodeTypeAction:
		return "Perform actions"
	case engine.NodeTypeDelay:
		return "Add delays to the flow"
	case engine.NodeTypeEnd:
		return "End point of the flow"
	default:
		return "Flow node"
	}
}

func (h *Handler) getNodeCategory(nodeType engine.NodeType) string {
	switch nodeType {
	case engine.NodeTypeStart, engine.NodeTypeEnd:
		return "control"
	case engine.NodeTypeMessage:
		return "communication"
	case engine.NodeTypeCondition:
		return "logic"
	case engine.NodeTypeAction:
		return "actions"
	case engine.NodeTypeDelay:
		return "timing"
	default:
		return "general"
	}
}

func (h *Handler) getNodeConfigSchema(nodeType engine.NodeType) map[string]interface{} {
	// This would return the configuration schema for each node type
	// For now, return a simple schema structure
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"name": map[string]interface{}{
				"type":        "string",
				"description": "Node name",
				"required":    true,
			},
		},
	}
}

// parseIntDefault parses string to int with default value
func parseIntDefault(s string, defaultValue int) int {
	if s == "" {
		return defaultValue
	}
	
	if val, err := strconv.Atoi(s); err == nil {
		return val
	}
	
	return defaultValue
}