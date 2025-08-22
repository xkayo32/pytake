package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
)

type FlowService struct {
	db    *sql.DB
	redis *redis.Client
}

func NewFlowService(db *sql.DB, redis *redis.Client) *FlowService {
	return &FlowService{
		db:    db,
		redis: redis,
	}
}

// GetFlows returns all flows with their statistics
func (s *FlowService) GetFlows(c *gin.Context) {
	// For now, return empty array to test basic API connection
	log.Printf("🔍 NEW CODE: GetFlows called - returning empty array for testing")
	flows := []FlowWithStats{}
	log.Printf("✅ Returning %d flows (temporary empty response)", len(flows))
	c.JSON(http.StatusOK, flows)
}

// GetFlow returns a specific flow by ID
func (s *FlowService) GetFlow(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Flow ID is required"})
		return
	}

	query := `
		SELECT id, tenant_id, name, description, trigger_type, trigger_value, nodes, edges, is_active, version, created_by, created_at, updated_at
		FROM flows 
		WHERE id = $1
	`

	var flow Flow
	err := s.db.QueryRow(query, id).Scan(
		&flow.ID,
		&flow.TenantID,
		&flow.Name,
		&flow.Description,
		&flow.TriggerType,
		&flow.TriggerValue,
		&flow.Nodes,
		&flow.Edges,
		&flow.IsActive,
		&flow.Version,
		&flow.CreatedBy,
		&flow.CreatedAt,
		&flow.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}
	if err != nil {
		log.Printf("Error querying flow %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch flow"})
		return
	}

	// Compute derived fields for frontend compatibility
	if flow.IsActive {
		flow.Status = "active"
	} else {
		flow.Status = "draft"
	}

	// Combine nodes and edges into flow structure
	flowData := map[string]interface{}{
		"nodes": json.RawMessage(flow.Nodes),
		"edges": json.RawMessage(flow.Edges),
	}
	flowJSON, _ := json.Marshal(flowData)
	flow.Flow = json.RawMessage(flowJSON)

	// Combine trigger type and value
	triggerData := map[string]interface{}{
		"type":   flow.TriggerType,
	}
	if flow.TriggerValue != nil {
		triggerData["config"] = json.RawMessage(*flow.TriggerValue)
	}
	triggerJSON, _ := json.Marshal(triggerData)
	flow.Trigger = json.RawMessage(triggerJSON)

	// Get flow statistics
	stats := s.getFlowStats(flow.ID)

	flowWithStats := FlowWithStats{
		Flow:  flow,
		Stats: stats,
		Tags:  []string{},
	}

	c.JSON(http.StatusOK, flowWithStats)
}

// CreateFlow creates a new flow
func (s *FlowService) CreateFlow(c *gin.Context) {
	var req CreateFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate UUID for the flow
	flowID := generateFlowID()

	// Set default status if not provided
	if req.Status == "" {
		req.Status = "draft"
	}

	// Set default flow structure if not provided
	if len(req.Flow) == 0 {
		req.Flow = json.RawMessage(`{"nodes": [], "edges": []}`)
	}

	// Set default trigger if not provided
	if len(req.Trigger) == 0 {
		req.Trigger = json.RawMessage(`{"type": "keyword", "config": {}}`)
	}

	now := time.Now()

	query := `
		INSERT INTO flows (id, name, description, status, flow, trigger, created_at, updated_at, version)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`

	var flow Flow
	err := s.db.QueryRow(
		query,
		flowID,
		req.Name,
		req.Description,
		req.Status,
		req.Flow,
		req.Trigger,
		now,
		now,
		1,
	).Scan(&flow.ID, &flow.CreatedAt, &flow.UpdatedAt)

	if err != nil {
		log.Printf("Error creating flow: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create flow"})
		return
	}

	// Build response
	response := Flow{
		ID:          flow.ID,
		Name:        req.Name,
		Description: req.Description,
		Status:      req.Status,
		Flow:        req.Flow,
		Trigger:     req.Trigger,
		CreatedAt:   flow.CreatedAt,
		UpdatedAt:   flow.UpdatedAt,
		Version:     1,
	}

	if len(req.WhatsappNumbers) > 0 {
		response.WhatsappNumbers = req.WhatsappNumbers
	}

	log.Printf("✅ Flow created with ID: %s", flow.ID)
	c.JSON(http.StatusCreated, response)
}

// UpdateFlow updates an existing flow
func (s *FlowService) UpdateFlow(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Flow ID is required"})
		return
	}

	var req UpdateFlowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if flow exists
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM flows WHERE id = $1)", id).Scan(&exists)
	if err != nil {
		log.Printf("Error checking flow existence: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update flow"})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}

	if req.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *req.Description)
		argIndex++
	}

	if req.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		argIndex++
	}

	if len(req.Flow) > 0 {
		setParts = append(setParts, fmt.Sprintf("flow = $%d", argIndex))
		args = append(args, req.Flow)
		argIndex++
	}

	if len(req.Trigger) > 0 {
		setParts = append(setParts, fmt.Sprintf("trigger = $%d", argIndex))
		args = append(args, req.Trigger)
		argIndex++
	}

	if len(setParts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	// Add updated_at and version increment
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	setParts = append(setParts, fmt.Sprintf("version = version + 1"))

	// Add WHERE clause
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE flows 
		SET %s 
		WHERE id = $%d
		RETURNING id, name, description, status, flow, trigger, created_at, updated_at, version
	`, joinStrings(setParts, ", "), argIndex)

	var flow Flow
	err = s.db.QueryRow(query, args...).Scan(
		&flow.ID,
		&flow.Name,
		&flow.Description,
		&flow.Status,
		&flow.Flow,
		&flow.Trigger,
		&flow.CreatedAt,
		&flow.UpdatedAt,
		&flow.Version,
	)

	if err != nil {
		log.Printf("Error updating flow %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update flow"})
		return
	}

	if len(req.WhatsappNumbers) > 0 {
		flow.WhatsappNumbers = req.WhatsappNumbers
	}

	log.Printf("✅ Flow %s updated successfully", id)
	c.JSON(http.StatusOK, flow)
}

// UpdateFlowStatus updates only the status of a flow
func (s *FlowService) UpdateFlowStatus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Flow ID is required"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate status
	validStatuses := map[string]bool{
		"draft":    true,
		"active":   true,
		"inactive": true,
	}

	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status. Must be draft, active, or inactive"})
		return
	}

	query := `
		UPDATE flows 
		SET status = $1, updated_at = $2, version = version + 1 
		WHERE id = $3
		RETURNING id, name, description, status, flow, trigger, created_at, updated_at, version
	`

	var flow Flow
	err := s.db.QueryRow(query, req.Status, time.Now(), id).Scan(
		&flow.ID,
		&flow.Name,
		&flow.Description,
		&flow.Status,
		&flow.Flow,
		&flow.Trigger,
		&flow.CreatedAt,
		&flow.UpdatedAt,
		&flow.Version,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}
	if err != nil {
		log.Printf("Error updating flow status %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update flow status"})
		return
	}

	log.Printf("✅ Flow %s status updated to %s", id, req.Status)
	c.JSON(http.StatusOK, flow)
}

// DeleteFlow deletes a flow
func (s *FlowService) DeleteFlow(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Flow ID is required"})
		return
	}

	query := `DELETE FROM flows WHERE id = $1`

	result, err := s.db.Exec(query, id)
	if err != nil {
		log.Printf("Error deleting flow %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete flow"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error checking deletion result: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete flow"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}

	log.Printf("✅ Flow %s deleted successfully", id)
	c.JSON(http.StatusOK, gin.H{"message": "Flow deleted successfully"})
}

// getFlowStats retrieves statistics for a flow
func (s *FlowService) getFlowStats(flowID string) FlowStats {
	// This is a simplified implementation
	// In a real app, you'd query execution logs/statistics tables
	
	stats := FlowStats{
		Executions:  0,
		SuccessRate: 100.0,
	}

	// You could implement actual statistics querying here
	// For now, return default stats

	return stats
}

// generateFlowID generates a unique ID for flows
func generateFlowID() string {
	return uuid.New().String()[:8] // Shortened UUID for readability
}

// Helper function to join strings
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	if len(strs) == 1 {
		return strs[0]
	}
	
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}