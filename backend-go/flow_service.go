package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"strings"
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

// TestTemplate sends a test template message
func (s *FlowService) TestTemplate(c *gin.Context) {
	var request struct {
		To           string `json:"to" binding:"required"`
		ConfigID     string `json:"config_id" binding:"required"`
		TemplateName string `json:"template_name"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		log.Printf("Error binding request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}
	
	log.Printf("📨 Testing template to %s using config %s", request.To, request.ConfigID)
	
	// Get WhatsApp config
	whatsappService := NewWhatsAppService(s.db, s.redis)
	config, err := whatsappService.GetConfigByID(request.ConfigID)
	if err != nil {
		log.Printf("Error getting WhatsApp config: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "WhatsApp configuration not found"})
		return
	}
	
	// Send template
	err = s.sendWhatsAppMessage(request.To, "", config)
	if err != nil {
		log.Printf("❌ Error sending template: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to send template",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Template sent successfully",
		"to": request.To,
		"template": "hello_world",
	})
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
	
	// Find start node (can be "start", trigger nodes, or template as first message)
	var startNode map[string]interface{}
	startNodeTypes := []string{"start", "trigger_keyword", "trigger_webhook", "trigger_time", "trigger_manual", "template", "msg_template"}
	
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
		
	case "logic_window_check":
		// Check 24h window with contact
		hasWindow, err := s.checkConversationWindow(recipient)
		if err != nil {
			log.Printf("Warning: could not check conversation window: %v", err)
			hasWindow = false
		}
		
		result.Logs = append(result.Logs, ExecutionLog{
			Timestamp: time.Now().Format(time.RFC3339),
			StepType:  nodeType,
			Action:    "window_check",
			Status:    "success",
			Message:   fmt.Sprintf("Janela 24h: %v", hasWindow),
			Details:   fmt.Sprintf("Contato %s tem janela: %v", recipient, hasWindow),
		})
		
		// Return different output based on window status
		// Output 0: Has window (can send direct message)
		// Output 1: No window (needs template)
		if hasWindow {
			// Continue to first output (index 0)
			return nil
		} else {
			// If there's a fallback template configured, send it
			if config, ok := nodeData["config"].(map[string]interface{}); ok {
				if templateName, ok := config["fallback_template"].(string); ok && templateName != "" {
					log.Printf("📄 Sending fallback template '%s' to open window", templateName)
					// We'll use the existing template sending logic
					// For now, just log and continue to second output
				}
			}
			// Continue to second output (index 1)
			// This would need special handling to select the right edge
			return nil
		}
		
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
		
		// Send real WhatsApp message
		err := s.sendWhatsAppMessage(recipient, message, config)
		if err != nil {
			result.Logs = append(result.Logs, ExecutionLog{
				Timestamp: time.Now().Format(time.RFC3339),
				StepType:  nodeType,
				StepID:    nodeID,
				Action:    "message_send_failed",
				Status:    "error",
				Message:   fmt.Sprintf("Erro ao enviar mensagem para %s", recipient),
				Details:   err.Error(),
			})
			// Continue execution even if message fails in test mode
		} else {
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
		}
		
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
		
	case "template", "msg_template":
		// Template node - send WhatsApp template message
		var templateName string
		var templateParams []map[string]interface{}
		
		if config, ok := nodeData["config"].(map[string]interface{}); ok {
			templateName, _ = config["template_name"].(string)
			if params, ok := config["parameters"].([]interface{}); ok {
				for _, p := range params {
					if param, ok := p.(map[string]interface{}); ok {
						templateParams = append(templateParams, param)
					}
				}
			}
		}
		
		// If no template specified, use default test template
		if templateName == "" {
			templateName = "pytake_saudacao"
		}
		
		// Send template message directly (bypasses 24h window check)
		err := s.sendTemplateMessage(recipient, templateName, templateParams, config)
		if err != nil {
			result.Logs = append(result.Logs, ExecutionLog{
				Timestamp: time.Now().Format(time.RFC3339),
				StepType:  nodeType,
				StepID:    nodeID,
				Action:    "template_send_failed",
				Status:    "error",
				Message:   fmt.Sprintf("Erro ao enviar template para %s", recipient),
				Details:   err.Error(),
			})
			// Continue execution even if template fails in test mode
		} else {
			result.MessagesSent++
			result.Logs = append(result.Logs, ExecutionLog{
				Timestamp: time.Now().Format(time.RFC3339),
				StepType:  nodeType,
				StepID:    nodeID,
				Action:    "template_sent",
				Status:    "success",
				Message:   fmt.Sprintf("Template '%s' enviado para %s", templateName, recipient),
			})
			
			// Template automatically opens 24h window
			s.createConversationWindow(recipient)
		}
		
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

// sendWhatsAppMessage sends a WhatsApp message via template or direct message
func (s *FlowService) sendWhatsAppMessage(recipient string, message string, whatsappConfig map[string]interface{}) error {
	// Get WhatsApp configuration
	phoneNumberID, ok := whatsappConfig["phone_number_id"].(string)
	if !ok {
		return fmt.Errorf("phone_number_id not found in config")
	}
	
	accessToken, ok := whatsappConfig["access_token"].(string)
	if !ok {
		return fmt.Errorf("access_token not found in config")
	}
	
	// Check if we have a 24-hour window open with this contact
	hasWindow, err := s.checkConversationWindow(recipient)
	if err != nil {
		log.Printf("Warning: could not check conversation window: %v", err)
		hasWindow = false
	}
	
	// Format recipient number properly for WhatsApp
	// WhatsApp API normalizes Brazilian numbers - it accepts both formats
	// but returns wa_id without the extra 9 (e.g., 556194013828 instead of 5561994013828)
	formattedRecipient := recipient
	
	// Try alternate format for Brazilian numbers if messages aren't delivering
	// Some accounts may need the number without the extra 9
	alternateFormat := ""
	if len(recipient) == 13 && recipient[:2] == "55" {
		// Brazilian number with extra 9
		areaCode := recipient[2:4]
		restOfNumber := recipient[4:]
		if len(restOfNumber) == 9 && restOfNumber[0] == '9' {
			// Try without the extra 9 as well
			alternateFormat = "55" + areaCode + restOfNumber[1:]
			log.Printf("📱 Brazilian mobile: primary=%s, alternate=%s", recipient, alternateFormat)
			
			// For now, let's use the format WhatsApp returns (without extra 9)
			// since that's what the API seems to prefer based on wa_id responses
			if hasWindow {
				// When window is open, try the normalized format
				formattedRecipient = alternateFormat
				log.Printf("📱 Using normalized format for direct message: %s", formattedRecipient)
			}
		}
	}
	
	// Build WhatsApp API URL
	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/messages", phoneNumberID)
	
	var payload map[string]interface{}
	
	if hasWindow {
		// We have a 24-hour window - send direct message
		log.Printf("📱 24h window open with %s, sending direct message", formattedRecipient)
		payload = map[string]interface{}{
			"messaging_product": "whatsapp",
			"to": formattedRecipient,
			"type": "text",
			"text": map[string]string{
				"preview_url": "false",
				"body": message,
			},
		}
	} else {
		// No 24-hour window - must use template
		log.Printf("📱 No 24h window with %s, using template", formattedRecipient)
		
		// Get an approved test template
		templateName, templateParams := s.getTestTemplate(message)
		
		payload = map[string]interface{}{
			"messaging_product": "whatsapp",
			"to": formattedRecipient,
			"type": "template",
			"template": map[string]interface{}{
				"name": templateName,
				"language": map[string]string{
					"code": "pt_BR",
				},
				"components": templateParams,
			},
		}
	}
	
	// Convert payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}
	
	log.Printf("📤 Sending WhatsApp message payload: %s", string(jsonPayload))
	
	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}
	
	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	
	// Send request
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()
	
	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %v", err)
	}
	
	// Log response details
	log.Printf("📬 WhatsApp API Response: Status=%d, Body=%s", resp.StatusCode, string(body))
	
	// Check response status
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errorResp map[string]interface{}
		if err := json.Unmarshal(body, &errorResp); err == nil {
			if errData, ok := errorResp["error"].(map[string]interface{}); ok {
				if msg, ok := errData["message"].(string); ok {
					log.Printf("❌ WhatsApp API error message: %s", msg)
					return fmt.Errorf("WhatsApp API error: %s", msg)
				}
			}
		}
		log.Printf("❌ WhatsApp API error: status %d, body: %s", resp.StatusCode, string(body))
		return fmt.Errorf("WhatsApp API error: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	// Update conversation window
	if !hasWindow {
		err := s.createConversationWindow(recipient)
		if err != nil {
			log.Printf("⚠️ Warning: failed to create conversation window: %v", err)
		}
	}
	
	log.Printf("✅ WhatsApp message sent successfully to %s", recipient)
	return nil
}

// sendTemplateMessage sends a WhatsApp template message directly
func (s *FlowService) sendTemplateMessage(recipient string, templateName string, templateParams []map[string]interface{}, whatsappConfig map[string]interface{}) error {
	// Get WhatsApp config
	config := whatsappConfig
	if config == nil {
		// Get default WhatsApp config from database
		query := `
			SELECT id, name, phone_number_id, access_token, webhook_url, webhook_secret, is_default
			FROM whatsapp_configs
			WHERE is_default = true
			LIMIT 1
		`
		var configID int
		var name, phoneNumberID, accessToken sql.NullString
		var webhookURL, webhookSecret sql.NullString
		var isDefault bool
		
		err := s.db.QueryRow(query).Scan(&configID, &name, &phoneNumberID, &accessToken, &webhookURL, &webhookSecret, &isDefault)
		if err != nil {
			return fmt.Errorf("no default WhatsApp configuration found: %v", err)
		}
		
		config = map[string]interface{}{
			"phone_number_id": phoneNumberID.String,
			"access_token": accessToken.String,
		}
	}
	
	// Extract config values
	phoneNumberID, _ := config["phone_number_id"].(string)
	accessToken, _ := config["access_token"].(string)
	
	if phoneNumberID == "" || accessToken == "" {
		return fmt.Errorf("WhatsApp configuration incomplete")
	}
	
	// Format recipient number
	formattedRecipient := recipient
	if len(recipient) == 13 && recipient[:2] == "55" {
		// Brazilian number formatting
		restOfNumber := recipient[4:]
		if len(restOfNumber) == 9 && restOfNumber[0] == '9' {
			// Template messages work with both formats
			log.Printf("📱 Brazilian template recipient: %s", recipient)
		}
	}
	
	// Build template components
	var components []map[string]interface{}
	if len(templateParams) > 0 {
		components = templateParams
	} else {
		// Default empty components
		components = []map[string]interface{}{}
	}
	
	// Build payload for template message
	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to": formattedRecipient,
		"type": "template",
		"template": map[string]interface{}{
			"name": templateName,
			"language": map[string]string{
				"code": "pt_BR",
			},
			"components": components,
		},
	}
	
	// Send the template message
	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/messages", phoneNumberID)
	
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal template payload: %v", err)
	}
	
	log.Printf("📤 Sending WhatsApp template: %s", string(jsonPayload))
	
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create template request: %v", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send template request: %v", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read template response: %v", err)
	}
	
	log.Printf("📬 WhatsApp Template Response: Status=%d, Body=%s", resp.StatusCode, string(body))
	
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		var errorResp map[string]interface{}
		if err := json.Unmarshal(body, &errorResp); err == nil {
			if errData, ok := errorResp["error"].(map[string]interface{}); ok {
				if msg, ok := errData["message"].(string); ok {
					return fmt.Errorf("WhatsApp template error: %s", msg)
				}
			}
		}
		return fmt.Errorf("WhatsApp template error: status %d", resp.StatusCode)
	}
	
	log.Printf("✅ WhatsApp template '%s' sent successfully to %s", templateName, recipient)
	return nil
}

// checkConversationWindow checks if we have an active 24-hour window with a contact
func (s *FlowService) checkConversationWindow(phoneNumber string) (bool, error) {
	query := `
		SELECT COUNT(*) FROM conversations c
		JOIN contacts co ON c.contact_id = co.id
		WHERE co.phone = $1
		AND c.last_message_time > NOW() - INTERVAL '24 hours'
	`
	
	var count int
	err := s.db.QueryRow(query, phoneNumber).Scan(&count)
	if err != nil {
		return false, err
	}
	
	return count > 0, nil
}

// createConversationWindow creates or updates a conversation window
func (s *FlowService) createConversationWindow(phoneNumber string) error {
	// First, ensure contact exists
	contactID := s.ensureContact(phoneNumber)
	
	// Update or create conversation
	query := `
		INSERT INTO conversations (tenant_id, contact_id, last_message_time, last_message)
		VALUES ($1, $2, NOW(), 'Template message sent')
		ON CONFLICT (tenant_id, contact_id) 
		DO UPDATE SET 
			last_message_time = NOW(),
			last_message = 'Template message sent',
			updated_at = NOW()
	`
	
	// Use a default tenant ID for now (should come from session in production)
	tenantID := "00000000-0000-0000-0000-000000000000"
	
	_, err := s.db.Exec(query, tenantID, contactID)
	return err
}

// ensureContact ensures a contact exists and returns its ID
func (s *FlowService) ensureContact(phoneNumber string) string {
	var contactID string
	
	// Use a default tenant ID for now (should come from session in production)
	tenantID := "00000000-0000-0000-0000-000000000000"
	
	// Try to find existing contact
	query := `SELECT id FROM contacts WHERE tenant_id = $1 AND phone = $2 LIMIT 1`
	err := s.db.QueryRow(query, tenantID, phoneNumber).Scan(&contactID)
	if err == nil {
		return contactID
	}
	
	// Create new contact
	insertQuery := `
		INSERT INTO contacts (tenant_id, phone, name, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (tenant_id, phone) DO UPDATE SET updated_at = NOW()
		RETURNING id
	`
	
	err = s.db.QueryRow(insertQuery, tenantID, phoneNumber, "Contact "+phoneNumber).Scan(&contactID)
	if err != nil {
		log.Printf("Error creating contact: %v", err)
		return ""
	}
	
	return contactID
}

// getTestTemplate returns an appropriate template for testing
func (s *FlowService) getTestTemplate(message string) (string, []map[string]interface{}) {
	// Try to use a template that exists and is APPROVED in the Meta system
	
	// First priority: pytake_saudacao (Brazilian, no parameters needed)
	var templateName, metaTemplateID string
	query := `SELECT name, COALESCE(meta_template_id, name) FROM whatsapp_templates WHERE status = 'APPROVED' AND name = 'pytake_saudacao' LIMIT 1`
	err := s.db.QueryRow(query).Scan(&templateName, &metaTemplateID)
	if err == nil {
		log.Printf("📋 Using template: %s (meta_id: %s) - APPROVED", templateName, metaTemplateID)
		// pytake_saudacao doesn't need parameters
		return metaTemplateID, []map[string]interface{}{}
	}
	
	// Second priority: hello_world (English, but approved)
	query = `SELECT name, COALESCE(meta_template_id, name) FROM whatsapp_templates WHERE status = 'APPROVED' AND name = 'hello_world' LIMIT 1`
	err = s.db.QueryRow(query).Scan(&templateName, &metaTemplateID)
	if err == nil {
		log.Printf("📋 Using template: %s (meta_id: %s) - APPROVED", templateName, metaTemplateID)
		// hello_world template doesn't need parameters
		return metaTemplateID, []map[string]interface{}{}
	}
	
	// Third: Any approved template
	query = `SELECT name, COALESCE(meta_template_id, name), language FROM whatsapp_templates WHERE status = 'APPROVED' ORDER BY 
		CASE 
			WHEN language = 'pt_BR' THEN 0 
			ELSE 1 
		END,
		name 
		LIMIT 1`
	var language string
	err = s.db.QueryRow(query).Scan(&templateName, &metaTemplateID, &language)
	if err == nil {
		log.Printf("📋 Using template: %s (meta_id: %s, language: %s) - APPROVED", templateName, metaTemplateID, language)
		return metaTemplateID, []map[string]interface{}{}
	}
	
	// If no approved templates in DB, try known working templates
	log.Printf("⚠️ No approved templates found in DB, trying known templates")
	
	// These are templates we know exist
	knownTemplates := []struct {
		name string
		lang string
	}{
		{"pytake_saudacao", "pt_BR"},
		{"hello_world", "en_US"},
	}
	
	for _, tmpl := range knownTemplates {
		log.Printf("🔍 Trying known template: %s (language: %s)", tmpl.name, tmpl.lang)
		return tmpl.name, []map[string]interface{}{}
	}
	
	// Final fallback
	return "hello_world", []map[string]interface{}{}
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

// CheckConversationWindow checks if a conversation window is open with a contact
func (s *FlowService) CheckConversationWindow(c *gin.Context) {
	phoneNumber := c.Query("phone")
	if phoneNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number is required"})
		return
	}
	
	hasWindow, err := s.checkConversationWindow(phoneNumber)
	if err != nil {
		log.Printf("Error checking conversation window: %v", err)
	}
	
	// Get last message time if window exists
	var lastMessageTime *time.Time
	if hasWindow {
		query := `
			SELECT c.last_message_time FROM conversations c
			JOIN contacts co ON c.contact_id = co.id
			WHERE co.phone = $1
			AND c.last_message_time > NOW() - INTERVAL '24 hours'
			LIMIT 1
		`
		var t time.Time
		err := s.db.QueryRow(query, phoneNumber).Scan(&t)
		if err == nil {
			lastMessageTime = &t
		}
	}
	
	// Calculate remaining time
	var remainingHours float64
	if lastMessageTime != nil {
		remaining := 24 - time.Since(*lastMessageTime).Hours()
		if remaining > 0 {
			remainingHours = remaining
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"has_window": hasWindow,
		"phone": phoneNumber,
		"last_message_time": lastMessageTime,
		"remaining_hours": remainingHours,
		"window_status": map[string]interface{}{
			"is_open": hasWindow,
			"expires_in_hours": remainingHours,
			"can_send_direct": hasWindow,
			"needs_template": !hasWindow,
		},
	})
}

// GetAvailableTemplates returns approved WhatsApp templates
func (s *FlowService) GetAvailableTemplates(c *gin.Context) {
	query := `
		SELECT id, name, body_text, category, language, variables
		FROM whatsapp_templates 
		WHERE status = 'APPROVED'
		ORDER BY 
			CASE WHEN name = 'hello_world' THEN 0 
			     WHEN name = 'boas_vindas' THEN 1 
			     ELSE 2 END,
			name
	`
	
	rows, err := s.db.Query(query)
	if err != nil {
		log.Printf("Error getting templates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get templates"})
		return
	}
	defer rows.Close()
	
	var templates []map[string]interface{}
	for rows.Next() {
		var id, name, bodyText, category, language string
		var variables json.RawMessage
		
		err := rows.Scan(&id, &name, &bodyText, &category, &language, &variables)
		if err != nil {
			continue
		}
		
		template := map[string]interface{}{
			"id": id,
			"name": name,
			"body_text": bodyText,
			"category": category,
			"language": language,
		}
		
		// Parse variables if present
		if len(variables) > 0 {
			var vars []interface{}
			if err := json.Unmarshal(variables, &vars); err == nil {
				template["variables"] = vars
			}
		}
		
		templates = append(templates, template)
	}
	
	c.JSON(http.StatusOK, gin.H{
		"templates": templates,
		"total": len(templates),
	})
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

// GetUniversalFlow retrieves the active universal flow (no trigger/always active)
func (s *FlowService) GetUniversalFlow(tenantID string) (*Flow, error) {
	query := `
		SELECT id, tenant_id, name, description, trigger_type, trigger_value, nodes, edges, is_active, version, created_by, created_at, updated_at, status
		FROM flows 
		WHERE is_active = true 
		AND (trigger_type = 'universal' OR trigger_type = '' OR trigger_type IS NULL)
		AND ($1::uuid IS NULL OR tenant_id = $1::uuid)
		ORDER BY updated_at DESC 
		LIMIT 1
	`
	
	var flow Flow
	var tenantIDPtr, createdByPtr, statusPtr *string
	var triggerValuePtr *string
	
	err := s.db.QueryRow(query, tenantID).Scan(
		&flow.ID,
		&tenantIDPtr,
		&flow.Name,
		&flow.Description,
		&flow.TriggerType,
		&triggerValuePtr,
		&flow.Nodes,
		&flow.Edges,
		&flow.IsActive,
		&flow.Version,
		&createdByPtr,
		&flow.CreatedAt,
		&flow.UpdatedAt,
		&statusPtr,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No universal flow found
		}
		return nil, fmt.Errorf("failed to query universal flow: %v", err)
	}
	
	// Handle nullable fields
	if tenantIDPtr != nil {
		flow.TenantID = tenantIDPtr
	}
	if createdByPtr != nil {
		flow.CreatedBy = createdByPtr
	}
	if triggerValuePtr != nil {
		flow.TriggerValue = triggerValuePtr
	}
	if statusPtr != nil {
		flow.Status = *statusPtr
	} else {
		flow.Status = "active"
	}
	
	log.Printf("🔄 Found universal flow: %s (%s)", flow.Name, flow.ID)
	return &flow, nil
}

// ExecuteUniversalFlow executes a universal flow for incoming messages
func (s *FlowService) ExecuteUniversalFlow(tenantID, contactPhone, messageContent string) error {
	// Get the universal flow
	flow, err := s.GetUniversalFlow(tenantID)
	if err != nil {
		log.Printf("❌ Error getting universal flow: %v", err)
		return err
	}
	
	if flow == nil {
		log.Printf("ℹ️ No universal flow found for tenant %s", tenantID)
		return nil // No flow to execute
	}
	
	log.Printf("🚀 Executing universal flow '%s' for contact %s", flow.Name, contactPhone)
	
	// Generate execution ID
	executionID := uuid.New().String()
	
	// Get WhatsApp config for sending messages
	config := map[string]interface{}{
		"phone_number": contactPhone,
		"message_content": messageContent,
	}
	
	// Execute the flow
	result, err := s.executeFlowForContact(executionID, *flow, contactPhone, config)
	if err != nil {
		log.Printf("❌ Error executing universal flow: %v", err)
		return err
	}
	
	log.Printf("✅ Universal flow executed successfully for %s. Steps: %d", 
		contactPhone, result.StepsExecuted)
	
	return nil
}

// executeFlowForContact executes a flow for a specific contact (similar to test but for real execution)
func (s *FlowService) executeFlowForContact(executionID string, flow Flow, recipient string, config map[string]interface{}) (*FlowExecutionResult, error) {
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
		Action:    "flow_started",
		Status:    "success",
		Message:   fmt.Sprintf("Universal flow execution started for %s", recipient),
	})
	
	// Find start node (trigger node)
	var startNode map[string]interface{}
	for _, node := range nodes {
		if nodeType, ok := node["type"].(string); ok && nodeType == "trigger" {
			startNode = node
			break
		}
	}
	
	// If no trigger node found, use first node
	if startNode == nil && len(nodes) > 0 {
		startNode = nodes[0]
	}
	
	if startNode == nil {
		return nil, fmt.Errorf("no start node found in flow")
	}
	
	// Execute flow starting from trigger node
	currentNode := startNode
	stepsExecuted := 0
	maxSteps := 50 // Prevent infinite loops
	
	for currentNode != nil && stepsExecuted < maxSteps {
		nodeID, _ := currentNode["id"].(string)
		nodeType, _ := currentNode["type"].(string)
		nodeData, _ := currentNode["data"].(map[string]interface{})
		
		log.Printf("🎯 Executing node: %s (type: %s)", nodeID, nodeType)
		
		err := s.executeFlowNode(executionID, nodeType, nodeID, nodeData, recipient, config, result)
		if err != nil {
			result.Logs = append(result.Logs, ExecutionLog{
				Timestamp: time.Now().Format(time.RFC3339),
				StepType:  nodeType,
				Action:    "node_error",
				Status:    "error",
				Message:   fmt.Sprintf("Error executing node %s: %v", nodeID, err),
			})
			break
		}
		
		stepsExecuted++
		
		// Find next node based on edges
		var nextNodeID string
		for _, edge := range edges {
			if sourceID, ok := edge["source"].(string); ok && sourceID == nodeID {
				if targetID, ok := edge["target"].(string); ok {
					nextNodeID = targetID
					break
				}
			}
		}
		
		// Find next node
		currentNode = nil
		if nextNodeID != "" {
			for _, node := range nodes {
				if id, ok := node["id"].(string); ok && id == nextNodeID {
					currentNode = node
					break
				}
			}
		}
	}
	
	// Calculate execution time
	duration := time.Since(startTime)
	
	// Log execution complete
	result.Logs = append(result.Logs, ExecutionLog{
		Timestamp: time.Now().Format(time.RFC3339),
		StepType:  "system",
		Action:    "flow_completed",
		Status:    "success",
		Message:   fmt.Sprintf("Flow execution completed in %v", duration),
		Details:   fmt.Sprintf("Executed %d steps", stepsExecuted),
	})
	
	result.StepsExecuted = stepsExecuted
	result.ExecutionTime = duration.String()
	
	return result, nil
}

// ProcessIncomingMessage processes incoming messages with flow priorities and context management
func (s *FlowService) ProcessIncomingMessage(tenantID, contactPhone, messageContent string) error {
	// 1. Check if contact is in an active flow session (not expired)
	activeFlow, err := s.getActiveFlowSession(tenantID, contactPhone)
	if err == nil && activeFlow != nil {
		// Continue existing flow
		return s.continueFlow(tenantID, contactPhone, messageContent, activeFlow)
	}
	
	// 2. Check for keyword-triggered flows (highest priority)
	keywordFlow, err := s.findKeywordFlow(tenantID, messageContent)
	if err == nil && keywordFlow != nil {
		return s.startFlow(tenantID, contactPhone, keywordFlow)
	}
	
	// 3. Check if message came from template button click (medium priority)
	templateFlow, err := s.findTemplateFlow(tenantID, contactPhone, messageContent)
	if err == nil && templateFlow != nil {
		return s.startFlow(tenantID, contactPhone, templateFlow)
	}
	
	// 4. Use universal flow as fallback (lowest priority)
	universalFlow, err := s.GetUniversalFlow(tenantID)
	if err == nil && universalFlow != nil {
		return s.startFlow(tenantID, contactPhone, universalFlow)
	}
	
	// No flows to execute
	log.Printf("No applicable flows for tenant %s, contact %s", tenantID, contactPhone)
	return nil
}

// getActiveFlowSession checks if contact has an active (non-expired) flow session
func (s *FlowService) getActiveFlowSession(tenantID, contactPhone string) (*Flow, error) {
	ctx := context.Background()
	key := fmt.Sprintf("flow_session:%s:%s", tenantID, contactPhone)
	
	sessionData, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return nil, err // No active session
	}
	
	var session map[string]interface{}
	if err := json.Unmarshal([]byte(sessionData), &session); err != nil {
		return nil, err
	}
	
	flowID, ok := session["flow_id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid session data")
	}
	
	// Get the flow details from database
	query := `SELECT id, tenant_id, name, description, trigger_type, trigger_value, nodes, edges, is_active, version, created_by, created_at, updated_at FROM flows WHERE id = $1`
	var flow Flow
	err = s.db.QueryRow(query, flowID).Scan(&flow.ID, &flow.TenantID, &flow.Name, &flow.Description, &flow.TriggerType, &flow.TriggerValue, &flow.Nodes, &flow.Edges, &flow.IsActive, &flow.Version, &flow.CreatedBy, &flow.CreatedAt, &flow.UpdatedAt)
	if err != nil {
		return nil, err
	}
	
	return &flow, nil
}

// startFlow starts a new flow for a contact with configurable expiration
func (s *FlowService) startFlow(tenantID, contactPhone string, flow *Flow) error {
	ctx := context.Background()
	
	// Get flow expiration time (default 10 minutes)
	expirationMinutes := 10
	if flow.TriggerValue != nil {
		// Try to parse expiration from trigger_value JSON
		var triggerData map[string]interface{}
		if err := json.Unmarshal([]byte(*flow.TriggerValue), &triggerData); err == nil {
			if exp, ok := triggerData["expiration_minutes"].(float64); ok {
				expirationMinutes = int(exp)
			}
		}
	}
	
	// Store flow session with expiration
	sessionKey := fmt.Sprintf("flow_session:%s:%s", tenantID, contactPhone)
	sessionData := map[string]interface{}{
		"flow_id":     flow.ID,
		"started_at":  time.Now().Unix(),
		"step":        0,
		"expires_at":  time.Now().Add(time.Duration(expirationMinutes) * time.Minute).Unix(),
	}
	
	sessionJSON, _ := json.Marshal(sessionData)
	expiration := time.Duration(expirationMinutes) * time.Minute
	s.redis.Set(ctx, sessionKey, string(sessionJSON), expiration)
	
	// Execute the flow
	return s.ExecuteUniversalFlow(tenantID, contactPhone, flow.ID)
}

// continueFlow continues an existing flow session
func (s *FlowService) continueFlow(tenantID, contactPhone, messageContent string, flow *Flow) error {
	ctx := context.Background()
	sessionKey := fmt.Sprintf("flow_session:%s:%s", tenantID, contactPhone)
	
	// Get current session state
	sessionData, err := s.redis.Get(ctx, sessionKey).Result()
	if err != nil {
		return err
	}
	
	var session map[string]interface{}
	if err := json.Unmarshal([]byte(sessionData), &session); err != nil {
		return err
	}
	
	// Update session with user response
	session["last_message"] = messageContent
	session["last_message_time"] = time.Now().Unix()
	
	// Update session in Redis
	updatedSessionJSON, _ := json.Marshal(session)
	s.redis.Set(ctx, sessionKey, string(updatedSessionJSON), time.Hour)
	
	// Continue flow execution from current step
	return s.ExecuteUniversalFlow(tenantID, contactPhone, flow.ID)
}

// findKeywordFlow finds flows triggered by keywords
func (s *FlowService) findKeywordFlow(tenantID, messageContent string) (*Flow, error) {
	query := `
		SELECT id, tenant_id, name, description, trigger_type, trigger_value, 
		       nodes, edges, is_active, version, created_by, created_at, updated_at
		FROM flows 
		WHERE tenant_id = $1::uuid
		  AND is_active = true 
		  AND trigger_type = 'keyword'
		  AND trigger_value IS NOT NULL
		ORDER BY created_at DESC
	`
	
	rows, err := s.db.Query(query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	messageContent = strings.ToLower(strings.TrimSpace(messageContent))
	
	for rows.Next() {
		var flow Flow
		err := rows.Scan(
			&flow.ID, &flow.TenantID, &flow.Name, &flow.Description,
			&flow.TriggerType, &flow.TriggerValue, &flow.Nodes, &flow.Edges,
			&flow.IsActive, &flow.Version, &flow.CreatedBy, &flow.CreatedAt, &flow.UpdatedAt,
		)
		if err != nil {
			continue
		}
		
		// Check if message matches keyword
		if flow.TriggerValue != nil {
			var triggerData map[string]interface{}
			if err := json.Unmarshal([]byte(*flow.TriggerValue), &triggerData); err == nil {
				if keyword, ok := triggerData["keyword"].(string); ok {
					if strings.ToLower(keyword) == messageContent {
						return &flow, nil
					}
				}
			}
		}
	}
	
	return nil, nil // No keyword flow found
}

// findTemplateFlow finds flows triggered by template button interactions
func (s *FlowService) findTemplateFlow(tenantID, contactPhone, messageContent string) (*Flow, error) {
	// Check Redis for recent template interactions
	ctx := context.Background()
	key := fmt.Sprintf("template_interaction:%s:%s", tenantID, contactPhone)
	
	interactionData, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return nil, nil // No recent template interaction
	}
	
	var interaction map[string]interface{}
	if err := json.Unmarshal([]byte(interactionData), &interaction); err != nil {
		return nil, err
	}
	
	// Check if interaction is recent (within 5 minutes)
	if timestamp, ok := interaction["timestamp"].(float64); ok {
		interactionTime := time.Unix(int64(timestamp), 0)
		if time.Since(interactionTime) > 5*time.Minute {
			return nil, nil // Template interaction too old
		}
	}
	
	// Get flow ID from interaction
	if flowID, ok := interaction["flow_id"].(string); ok {
		query := `SELECT id, tenant_id, name, description, trigger_type, trigger_value, nodes, edges, is_active, version, created_by, created_at, updated_at FROM flows WHERE id = $1`
		var flow Flow
		err := s.db.QueryRow(query, flowID).Scan(&flow.ID, &flow.TenantID, &flow.Name, &flow.Description, &flow.TriggerType, &flow.TriggerValue, &flow.Nodes, &flow.Edges, &flow.IsActive, &flow.Version, &flow.CreatedBy, &flow.CreatedAt, &flow.UpdatedAt)
		if err != nil {
			return nil, err
		}
		return &flow, nil
	}
	
	return nil, nil
}