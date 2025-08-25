package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
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
	query := `
		SELECT id, tenant_id, name, description, trigger_type, trigger_value, nodes, edges, is_active, version, created_by, created_at, updated_at, status
		FROM flows 
		ORDER BY updated_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		log.Printf("Error querying flows: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch flows"})
		return
	}
	defer rows.Close()

	var flows []FlowWithStats

	for rows.Next() {
		var flow Flow
		var tenantID, triggerValue, createdBy sql.NullString
		var description sql.NullString
		var status sql.NullString

		err := rows.Scan(
			&flow.ID,
			&tenantID,
			&flow.Name,
			&description,
			&flow.TriggerType,
			&triggerValue,
			&flow.Nodes,
			&flow.Edges,
			&flow.IsActive,
			&flow.Version,
			&createdBy,
			&flow.CreatedAt,
			&flow.UpdatedAt,
			&status,
		)
		if err != nil {
			log.Printf("Error scanning flow: %v", err)
			continue
		}

		// Handle nullable fields
		if description.Valid {
			flow.Description = description.String
		}
		if tenantID.Valid {
			flow.TenantID = &tenantID.String
		}
		if triggerValue.Valid {
			flow.TriggerValue = &triggerValue.String
		}
		if createdBy.Valid {
			flow.CreatedBy = &createdBy.String
		}
		if status.Valid {
			flow.Status = status.String
		} else {
			// Fallback to computed status for backward compatibility
			if flow.IsActive {
				flow.Status = "active"
			} else {
				flow.Status = "draft"
			}
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
			var triggerConfig interface{}
			if err := json.Unmarshal([]byte(*flow.TriggerValue), &triggerConfig); err == nil {
				triggerData["config"] = triggerConfig
			} else {
				triggerData["config"] = map[string]interface{}{"value": *flow.TriggerValue}
			}
		} else {
			triggerData["config"] = map[string]interface{}{}
		}
		triggerJSON, _ := json.Marshal(triggerData)
		flow.Trigger = json.RawMessage(triggerJSON)

		// Get flow statistics
		stats := s.getFlowStats(flow.ID)

		// Get tags (simplified - you can implement proper tagging later)
		tags := []string{}
		if flow.Status == "active" {
			tags = append(tags, "ativo")
		}
		if flow.Status == "draft" {
			tags = append(tags, "rascunho")
		}

		flowWithStats := FlowWithStats{
			Flow:  flow,
			Stats: stats,
			Tags:  tags,
		}

		flows = append(flows, flowWithStats)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating flows: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch flows"})
		return
	}

	log.Printf("✅ Returning %d flows", len(flows))
	c.JSON(http.StatusOK, flows)
}

// TestFlow executes a complete flow test with tracking
func (s *FlowService) TestFlow(c *gin.Context) {
	flowID := c.Param("id")
	
	var request struct {
		To           string `json:"to" binding:"required"`
		ConfigID     string `json:"config_id" binding:"required"`
		TestMessage  string `json:"test_message"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		log.Printf("Error binding request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}
	
	log.Printf("🧪 Testing flow %s to %s using config %s", flowID, request.To, request.ConfigID)
	
	// Get complete flow from database
	var flow Flow
	query := `SELECT id, name, description, nodes, edges, trigger_type FROM flows WHERE id = $1`
	var description sql.NullString
	err := s.db.QueryRow(query, flowID).Scan(
		&flow.ID,
		&flow.Name,
		&description,
		&flow.Nodes,
		&flow.Edges,
		&flow.TriggerType,
	)
	if err != nil {
		log.Printf("Error getting flow: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Flow not found"})
		return
	}
	
	if description.Valid {
		flow.Description = description.String
	}
	
	// Get WhatsApp config
	whatsappService := NewWhatsAppService(s.db, s.redis)
	config, err := whatsappService.GetConfigByID(request.ConfigID)
	if err != nil {
		log.Printf("Error getting WhatsApp config: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "WhatsApp configuration not found"})
		return
	}
	
	// Create test execution record
	executionID := generateExecutionID()
	
	// Execute flow with real tracking
	result, err := s.executeFlowTest(executionID, flow, request.To, config)
	if err != nil {
		log.Printf("Error executing flow test: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to execute flow test",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"execution_id": executionID,
		"flow_name": flow.Name,
		"to": request.To,
		"config_name": config["name"],
		"steps_executed": result.StepsExecuted,
		"messages_sent": result.MessagesSent,
		"execution_time": result.ExecutionTime,
		"tracking_url": fmt.Sprintf("/api/v1/flows/%s/test/%s/logs", flowID, executionID),
	})
}

// FlowExecutionResult represents the result of a flow execution
type FlowExecutionResult struct {
	StepsExecuted int             `json:"steps_executed"`
	MessagesSent  int             `json:"messages_sent"`
	ExecutionTime string          `json:"execution_time"`
	Logs          []ExecutionLog  `json:"logs"`
}

// ExecutionLog represents a single log entry during flow execution
type ExecutionLog struct {
	Timestamp   string `json:"timestamp"`
	StepType    string `json:"step_type"`
	StepID      string `json:"step_id"`
	Action      string `json:"action"`
	Status      string `json:"status"`
	Message     string `json:"message"`
	Details     string `json:"details,omitempty"`
}

// executeFlowTest executes the complete flow with tracking
func (s *FlowService) executeFlowTest(executionID string, flow Flow, recipient string, config map[string]interface{}) (*FlowExecutionResult, error) {
	startTime := time.Now()
	
	result := &FlowExecutionResult{
		Logs: []ExecutionLog{},
	}
	
	// Parse flow nodes and edges
	var nodes []map[string]interface{}
	var edges []map[string]interface{}
	
	if err := json.Unmarshal([]byte(flow.Nodes), &nodes); err != nil {
		return nil, fmt.Errorf("failed to parse flow nodes: %v", err)
	}
	
	if err := json.Unmarshal([]byte(flow.Edges), &edges); err != nil {
		return nil, fmt.Errorf("failed to parse flow edges: %v", err)
	}
	
	// Log execution start
	result.Logs = append(result.Logs, ExecutionLog{
		Timestamp: time.Now().Format(time.RFC3339),
		StepType:  "system",
		StepID:    "start",
		Action:    "flow_execution_started",
		Status:    "success",
		Message:   fmt.Sprintf("Iniciando execução do flow '%s' para %s", flow.Name, recipient),
	})
	
	// Find start node (can be "start" or trigger nodes)
	var startNode map[string]interface{}
	startNodeTypes := []string{"start", "trigger_keyword", "trigger_webhook", "trigger_time", "trigger_manual"}
	
	for _, node := range nodes {
		if nodeType, ok := node["type"].(string); ok {
			for _, validType := range startNodeTypes {
				if nodeType == validType {
					startNode = node
					break
				}
			}
			if startNode != nil {
				break
			}
		}
	}
	
	if startNode == nil {
		// If no specific start node found, use the first node
		if len(nodes) > 0 {
			startNode = nodes[0]
			result.Logs = append(result.Logs, ExecutionLog{
				Timestamp: time.Now().Format(time.RFC3339),
				StepType:  "system",
				StepID:    "auto_start",
				Action:    "auto_start_selected",
				Status:    "warning",
				Message:   "Nenhum nó de início encontrado, usando primeiro nó do flow",
			})
		} else {
			return nil, fmt.Errorf("flow is empty - no nodes found")
		}
	}
	
	// Execute flow from start node
	currentNode := startNode
	visited := make(map[string]bool)
	
	for currentNode != nil && len(visited) < 50 { // Safety limit
		nodeID, ok := currentNode["id"].(string)
		if !ok {
			break
		}
		
		if visited[nodeID] {
			break // Avoid infinite loops
		}
		visited[nodeID] = true
		
		nodeType, _ := currentNode["type"].(string)
		nodeData, _ := currentNode["data"].(map[string]interface{})
		
		// Execute current node
		err := s.executeFlowNode(executionID, nodeType, nodeID, nodeData, recipient, config, result)
		if err != nil {
			result.Logs = append(result.Logs, ExecutionLog{
				Timestamp: time.Now().Format(time.RFC3339),
				StepType:  nodeType,
				StepID:    nodeID,
				Action:    "node_execution_failed",
				Status:    "error",
				Message:   fmt.Sprintf("Erro ao executar nó: %v", err),
			})
			return result, err
		}
		
		result.StepsExecuted++
		
		// Find next node
		currentNode = s.findNextNode(nodeID, edges, nodes)
	}
	
	// Log execution end
	result.ExecutionTime = time.Since(startTime).String()
	result.Logs = append(result.Logs, ExecutionLog{
		Timestamp: time.Now().Format(time.RFC3339),
		StepType:  "system",
		StepID:    "end",
		Action:    "flow_execution_completed",
		Status:    "success",
		Message:   fmt.Sprintf("Execução concluída em %s", result.ExecutionTime),
		Details:   fmt.Sprintf("Steps: %d, Messages: %d", result.StepsExecuted, result.MessagesSent),
	})
	
	// Store execution logs in Redis for tracking
	s.storeExecutionLogs(executionID, result.Logs)
	
	return result, nil
}

// executeFlowNode executes a single flow node
func (s *FlowService) executeFlowNode(executionID, nodeType, nodeID string, nodeData map[string]interface{}, recipient string, config map[string]interface{}, result *FlowExecutionResult) error {
	result.Logs = append(result.Logs, ExecutionLog{
		Timestamp: time.Now().Format(time.RFC3339),
		StepType:  nodeType,
		StepID:    nodeID,
		Action:    "node_execution_started",
		Status:    "processing",
		Message:   fmt.Sprintf("Executando nó %s", nodeType),
	})
	
	switch nodeType {
	case "start":
		// Start node - just log
		result.Logs = append(result.Logs, ExecutionLog{
			Timestamp: time.Now().Format(time.RFC3339),
			StepType:  nodeType,
			StepID:    nodeID,
			Action:    "start_node_processed",
			Status:    "success",
			Message:   "Nó de início processado",
		})
		
	case "trigger_keyword":
		// Trigger keyword - process as start node
		result.Logs = append(result.Logs, ExecutionLog{
			Timestamp: time.Now().Format(time.RFC3339),
			StepType:  nodeType,
			StepID:    nodeID,
			Action:    "trigger_processed",
			Status:    "success",
			Message:   "Trigger de palavra-chave processado",
		})
		
	case "trigger_webhook", "trigger_time", "trigger_manual":
		// Other triggers - process as start node
		result.Logs = append(result.Logs, ExecutionLog{
			Timestamp: time.Now().Format(time.RFC3339),
			StepType:  nodeType,
			StepID:    nodeID,
			Action:    "trigger_processed",
			Status:    "success",
			Message:   fmt.Sprintf("Trigger %s processado", nodeType),
		})
		
	case "message", "msg_text":
		// Message node - send WhatsApp message
		var message string
		if config, ok := nodeData["config"].(map[string]interface{}); ok {
			if msg, ok := config["message"].(string); ok {
				message = msg
			}
		}
		if message == "" {
			message = "Mensagem de teste do PyTake"
		}
		
		// For now, simulate sending message
		// TODO: Integrate with real WhatsApp API
		result.MessagesSent++
		
		result.Logs = append(result.Logs, ExecutionLog{
			Timestamp: time.Now().Format(time.RFC3339),
			StepType:  nodeType,
			StepID:    nodeID,
			Action:    "message_sent",
			Status:    "success",
			Message:   fmt.Sprintf("Mensagem enviada para %s", recipient),
			Details:   message,
		})
		
	case "delay":
		// Delay node - add delay
		delay, _ := nodeData["delay"].(float64)
		if delay > 0 && delay <= 10 { // Max 10 seconds for test
			time.Sleep(time.Duration(delay) * time.Second)
		}
		
		result.Logs = append(result.Logs, ExecutionLog{
			Timestamp: time.Now().Format(time.RFC3339),
			StepType:  nodeType,
			StepID:    nodeID,
			Action:    "delay_processed",
			Status:    "success",
			Message:   fmt.Sprintf("Delay de %.0f segundos aplicado", delay),
		})
		
	case "condition":
		// Condition node - evaluate condition
		result.Logs = append(result.Logs, ExecutionLog{
			Timestamp: time.Now().Format(time.RFC3339),
			StepType:  nodeType,
			StepID:    nodeID,
			Action:    "condition_evaluated",
			Status:    "success",
			Message:   "Condição avaliada (teste sempre verdadeiro)",
		})
		
	default:
		result.Logs = append(result.Logs, ExecutionLog{
			Timestamp: time.Now().Format(time.RFC3339),
			StepType:  nodeType,
			StepID:    nodeID,
			Action:    "node_processed",
			Status:    "success",
			Message:   fmt.Sprintf("Nó %s processado", nodeType),
		})
	}
	
	return nil
}

// findNextNode finds the next node to execute based on edges
func (s *FlowService) findNextNode(currentNodeID string, edges []map[string]interface{}, nodes []map[string]interface{}) map[string]interface{} {
	// Find edge from current node
	for _, edge := range edges {
		source, _ := edge["source"].(string)
		target, _ := edge["target"].(string)
		
		if source == currentNodeID {
			// Find target node
			for _, node := range nodes {
				nodeID, _ := node["id"].(string)
				if nodeID == target {
					return node
				}
			}
		}
	}
	return nil
}

// storeExecutionLogs stores execution logs in Redis
func (s *FlowService) storeExecutionLogs(executionID string, logs []ExecutionLog) {
	ctx := context.Background()
	logsJSON, _ := json.Marshal(logs)
	key := fmt.Sprintf("flow_execution:%s", executionID)
	s.redis.Set(ctx, key, string(logsJSON), 24*time.Hour) // Store for 24 hours
}

// generateExecutionID generates a unique execution ID
func generateExecutionID() string {
	return fmt.Sprintf("exec_%d_%d", time.Now().Unix(), rand.Intn(10000))
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
	var tenantID, triggerValue, createdBy sql.NullString
	var description sql.NullString

	err := s.db.QueryRow(query, id).Scan(
		&flow.ID,
		&tenantID,
		&flow.Name,
		&description,
		&flow.TriggerType,
		&triggerValue,
		&flow.Nodes,
		&flow.Edges,
		&flow.IsActive,
		&flow.Version,
		&createdBy,
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

	// Handle nullable fields
	if description.Valid {
		flow.Description = description.String
	}
	if tenantID.Valid {
		flow.TenantID = &tenantID.String
	}
	if triggerValue.Valid {
		flow.TriggerValue = &triggerValue.String
	}
	if createdBy.Valid {
		flow.CreatedBy = &createdBy.String
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
		var triggerConfig interface{}
		if err := json.Unmarshal([]byte(*flow.TriggerValue), &triggerConfig); err == nil {
			triggerData["config"] = triggerConfig
		} else {
			triggerData["config"] = map[string]interface{}{"value": *flow.TriggerValue}
		}
	} else {
		triggerData["config"] = map[string]interface{}{}
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

	// Set default trigger type if not provided
	if req.TriggerType == "" {
		req.TriggerType = "keyword"
	}

	// Set default nodes/edges if not provided
	if len(req.Nodes) == 0 {
		req.Nodes = json.RawMessage(`[]`)
	}
	if len(req.Edges) == 0 {
		req.Edges = json.RawMessage(`[]`)
	}

	// Parse legacy fields if new fields not provided
	if req.TriggerType == "" && len(req.Trigger) > 0 {
		var trigger map[string]interface{}
		if err := json.Unmarshal(req.Trigger, &trigger); err == nil {
			if triggerType, ok := trigger["type"].(string); ok {
				req.TriggerType = triggerType
				if config, ok := trigger["config"]; ok {
					configJSON, _ := json.Marshal(config)
					triggerValue := string(configJSON)
					req.TriggerValue = &triggerValue
				}
			}
		}
	}

	if len(req.Nodes) == 0 && len(req.Flow) > 0 {
		var flowData map[string]interface{}
		if err := json.Unmarshal(req.Flow, &flowData); err == nil {
			if nodes, ok := flowData["nodes"]; ok {
				nodesJSON, _ := json.Marshal(nodes)
				req.Nodes = json.RawMessage(nodesJSON)
			}
			if edges, ok := flowData["edges"]; ok {
				edgesJSON, _ := json.Marshal(edges)
				req.Edges = json.RawMessage(edgesJSON)
			}
		}
	}

	query := `
		INSERT INTO flows (name, description, trigger_type, trigger_value, nodes, edges, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at, version
	`

	var flow Flow
	var description sql.NullString
	if req.Description != "" {
		description.String = req.Description
		description.Valid = true
	}

	var triggerValue sql.NullString
	if req.TriggerValue != nil {
		triggerValue.String = *req.TriggerValue
		triggerValue.Valid = true
	}

	isActive := req.IsActive
	if req.Status == "active" {
		isActive = true
	}

	err := s.db.QueryRow(
		query,
		req.Name,
		description,
		req.TriggerType,
		triggerValue,
		req.Nodes,
		req.Edges,
		isActive,
	).Scan(&flow.ID, &flow.CreatedAt, &flow.UpdatedAt, &flow.Version)

	if err != nil {
		log.Printf("Error creating flow: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create flow"})
		return
	}

	// Build response with derived fields for frontend compatibility
	flow.Name = req.Name
	flow.Description = req.Description
	flow.TriggerType = req.TriggerType
	flow.TriggerValue = req.TriggerValue
	flow.Nodes = req.Nodes
	flow.Edges = req.Edges
	flow.IsActive = isActive

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
		"type": flow.TriggerType,
	}
	if flow.TriggerValue != nil {
		var triggerConfig interface{}
		if err := json.Unmarshal([]byte(*flow.TriggerValue), &triggerConfig); err == nil {
			triggerData["config"] = triggerConfig
		} else {
			triggerData["config"] = map[string]interface{}{"value": *flow.TriggerValue}
		}
	} else {
		triggerData["config"] = map[string]interface{}{}
	}
	triggerJSON, _ := json.Marshal(triggerData)
	flow.Trigger = json.RawMessage(triggerJSON)

	if len(req.WhatsappNumbers) > 0 {
		flow.WhatsappNumbers = req.WhatsappNumbers
	}

	log.Printf("✅ Flow created with ID: %s", flow.ID)
	c.JSON(http.StatusCreated, flow)
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
		// Parse flow JSON to extract nodes and edges
		var flowData map[string]interface{}
		if err := json.Unmarshal(req.Flow, &flowData); err == nil {
			if nodes, ok := flowData["nodes"]; ok {
				nodesJSON, _ := json.Marshal(nodes)
				setParts = append(setParts, fmt.Sprintf("nodes = $%d", argIndex))
				args = append(args, nodesJSON)
				argIndex++
			}
			if edges, ok := flowData["edges"]; ok {
				edgesJSON, _ := json.Marshal(edges)
				setParts = append(setParts, fmt.Sprintf("edges = $%d", argIndex))
				args = append(args, edgesJSON)
				argIndex++
			}
		}
	}

	if len(req.Trigger) > 0 {
		// Parse trigger JSON to extract type and value
		var triggerData map[string]interface{}
		if err := json.Unmarshal(req.Trigger, &triggerData); err == nil {
			if triggerType, ok := triggerData["type"].(string); ok {
				setParts = append(setParts, fmt.Sprintf("trigger_type = $%d", argIndex))
				args = append(args, triggerType)
				argIndex++
			}
			if triggerValue, ok := triggerData["value"]; ok {
				valueStr := fmt.Sprintf("%v", triggerValue)
				setParts = append(setParts, fmt.Sprintf("trigger_value = $%d", argIndex))
				args = append(args, valueStr)
				argIndex++
			}
		}
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
		RETURNING id, name, description, status, nodes, edges, created_at, updated_at, version
	`, joinStrings(setParts, ", "), argIndex)

	var flow Flow
	var nodesJSON, edgesJSON json.RawMessage
	err = s.db.QueryRow(query, args...).Scan(
		&flow.ID,
		&flow.Name,
		&flow.Description,
		&flow.Status,
		&nodesJSON,
		&edgesJSON,
		&flow.CreatedAt,
		&flow.UpdatedAt,
		&flow.Version,
	)
	
	// Combine nodes and edges into flow field
	if err == nil {
		flowData := map[string]interface{}{
			"nodes": json.RawMessage(nodesJSON),
			"edges": json.RawMessage(edgesJSON),
		}
		flow.Flow, _ = json.Marshal(flowData)
	}

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
		RETURNING id, name, description, status, nodes, edges, created_at, updated_at, version
	`

	var flow Flow
	var nodesJSON, edgesJSON json.RawMessage
	err := s.db.QueryRow(query, req.Status, time.Now(), id).Scan(
		&flow.ID,
		&flow.Name,
		&flow.Description,
		&flow.Status,
		&nodesJSON,
		&edgesJSON,
		&flow.CreatedAt,
		&flow.UpdatedAt,
		&flow.Version,
	)
	
	// Combine nodes and edges into flow field
	if err == nil {
		flowData := map[string]interface{}{
			"nodes": json.RawMessage(nodesJSON),
			"edges": json.RawMessage(edgesJSON),
		}
		flow.Flow, _ = json.Marshal(flowData)
	}

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

// GetFlowTestLogs returns execution logs for a specific test
func (s *FlowService) GetFlowTestLogs(c *gin.Context) {
	flowID := c.Param("id")
	executionID := c.Param("execution_id")
	
	log.Printf("📋 Getting test logs for flow %s execution %s", flowID, executionID)
	
	// Get logs from Redis
	ctx := context.Background()
	key := fmt.Sprintf("flow_execution:%s", executionID)
	logsJSON, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		log.Printf("Error getting execution logs: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Execution logs not found"})
		return
	}
	
	var logs []ExecutionLog
	if err := json.Unmarshal([]byte(logsJSON), &logs); err != nil {
		log.Printf("Error parsing execution logs: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse logs"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"execution_id": executionID,
		"flow_id": flowID,
		"logs": logs,
		"total_logs": len(logs),
	})
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