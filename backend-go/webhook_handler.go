package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// WebhookService handles WhatsApp webhook operations
type WebhookService struct {
	db    *sql.DB
	redis *redis.Client
}

// NewWebhookService creates a new webhook service
func NewWebhookService(db *sql.DB, redis *redis.Client) *WebhookService {
	return &WebhookService{
		db:    db,
		redis: redis,
	}
}

// WebhookVerification handles the webhook verification from Meta
func (s *WebhookService) WebhookVerification(c *gin.Context) {
	// Meta sends these params for verification:
	// hub.mode = "subscribe"
	// hub.verify_token = your_verify_token
	// hub.challenge = random_string_to_echo_back
	
	mode := c.Query("hub.mode")
	token := c.Query("hub.verify_token")
	challenge := c.Query("hub.challenge")
	
	log.Printf("Webhook verification request: mode=%s, token=%s, challenge=%s", mode, token, challenge)
	
	if mode == "" || token == "" {
		log.Printf("Missing webhook verification parameters")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing parameters"})
		return
	}
	
	// Check if this token matches any of our configured tokens
	var validToken bool
	query := `SELECT COUNT(*) FROM whatsapp_configs WHERE webhook_verify_token = $1`
	var count int
	err := s.db.QueryRow(query, token).Scan(&count)
	if err == nil && count > 0 {
		validToken = true
	}
	
	if mode == "subscribe" && validToken {
		log.Printf("✅ Webhook verification successful")
		// Return the challenge to verify the webhook
		c.String(http.StatusOK, challenge)
	} else {
		log.Printf("❌ Webhook verification failed: invalid token or mode")
		c.JSON(http.StatusForbidden, gin.H{"error": "Verification failed"})
	}
}

// WebhookReceive handles incoming webhook messages from WhatsApp
func (s *WebhookService) WebhookReceive(c *gin.Context) {
	// Read the request body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Error reading webhook body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	
	// Log the raw webhook for debugging
	log.Printf("📨 Webhook received: %s", string(body))
	
	// Parse the webhook payload
	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("Error parsing webhook JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}
	
	// Store webhook in database for debugging/history
	s.storeWebhookLog(payload)
	
	// Process the webhook based on type
	if entry, ok := payload["entry"].([]interface{}); ok && len(entry) > 0 {
		for _, e := range entry {
			if entryMap, ok := e.(map[string]interface{}); ok {
				if changes, ok := entryMap["changes"].([]interface{}); ok {
					for _, change := range changes {
						s.processWebhookChange(change)
					}
				}
			}
		}
	}
	
	// Always return 200 to acknowledge receipt
	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

// processWebhookChange processes individual webhook changes
func (s *WebhookService) processWebhookChange(change interface{}) {
	changeMap, ok := change.(map[string]interface{})
	if !ok {
		return
	}
	
	// Get the value object
	value, ok := changeMap["value"].(map[string]interface{})
	if !ok {
		return
	}
	
	// Check if it's a message
	if messages, ok := value["messages"].([]interface{}); ok {
		for _, msg := range messages {
			s.processIncomingMessage(msg)
		}
	}
	
	// Check if it's a status update
	if statuses, ok := value["statuses"].([]interface{}); ok {
		for _, status := range statuses {
			s.processStatusUpdate(status)
		}
	}
}

// processIncomingMessage processes incoming WhatsApp messages
func (s *WebhookService) processIncomingMessage(msg interface{}) {
	msgMap, ok := msg.(map[string]interface{})
	if !ok {
		return
	}
	
	from := msgMap["from"].(string)
	msgType := msgMap["type"].(string)
	timestamp := msgMap["timestamp"].(string)
	
	log.Printf("📱 New message from %s, type: %s", from, msgType)
	
	// Store message in database
	query := `
		INSERT INTO whatsapp_messages (
			id, from_number, type, content, timestamp, raw_data
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING
	`
	
	msgID := msgMap["id"].(string)
	content := ""
	
	// Extract content based on message type
	switch msgType {
	case "text":
		if textObj, ok := msgMap["text"].(map[string]interface{}); ok {
			content = textObj["body"].(string)
		}
	case "image", "video", "audio", "document":
		if mediaObj, ok := msgMap[msgType].(map[string]interface{}); ok {
			content = mediaObj["id"].(string) // Media ID
		}
	}
	
	rawData, _ := json.Marshal(msgMap)
	_, err := s.db.Exec(query, msgID, from, msgType, content, timestamp, rawData)
	if err != nil {
		log.Printf("Error storing message: %v", err)
	}
}

// processStatusUpdate processes message status updates
func (s *WebhookService) processStatusUpdate(status interface{}) {
	statusMap, ok := status.(map[string]interface{})
	if !ok {
		return
	}
	
	msgID := statusMap["id"].(string)
	statusType := statusMap["status"].(string)
	timestamp := statusMap["timestamp"].(string)
	
	log.Printf("📊 Status update for message %s: %s", msgID, statusType)
	
	// Update message status in database
	query := `
		UPDATE whatsapp_messages 
		SET status = $1, status_timestamp = $2 
		WHERE id = $3
	`
	
	_, err := s.db.Exec(query, statusType, timestamp, msgID)
	if err != nil {
		log.Printf("Error updating message status: %v", err)
	}
}

// storeWebhookLog stores webhook logs for debugging
func (s *WebhookService) storeWebhookLog(payload map[string]interface{}) {
	query := `
		INSERT INTO webhook_logs (
			timestamp, payload, processed
		) VALUES (NOW(), $1, true)
	`
	
	payloadJSON, _ := json.Marshal(payload)
	_, err := s.db.Exec(query, payloadJSON)
	if err != nil {
		log.Printf("Error storing webhook log: %v", err)
	}
}

// ValidateWebhookConfig validates webhook configuration with Meta
func (s *WebhookService) ValidateWebhookConfig(c *gin.Context) {
	configID := c.Param("id")
	
	// Get config from database
	var config struct {
		PhoneNumberID      string `db:"phone_number_id"`
		AccessToken        string `db:"access_token"`
		WebhookVerifyToken string `db:"webhook_verify_token"`
	}
	
	query := `SELECT phone_number_id, access_token, webhook_verify_token FROM whatsapp_configs WHERE id = $1`
	err := s.db.QueryRow(query, configID).Scan(&config.PhoneNumberID, &config.AccessToken, &config.WebhookVerifyToken)
	
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuration not found"})
		return
	}
	
	// Call Meta API to get current webhook configuration
	// For WhatsApp Business, we need to check the app subscriptions
	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s?fields=display_phone_number", config.PhoneNumberID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}
	
	req.Header.Set("Authorization", "Bearer "+config.AccessToken)
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check webhook status"})
		return
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	
	// Check if webhook is subscribed
	isSubscribed := false
	webhookURL := ""
	
	if data, ok := result["data"].([]interface{}); ok && len(data) > 0 {
		isSubscribed = true
		// Try to get webhook URL from app settings
		webhookURL = s.getWebhookURL()
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"subscribed":   isSubscribed,
		"webhook_url":  webhookURL,
		"verify_token": config.WebhookVerifyToken,
		"meta_response": result,
	})
}

// SubscribeWebhook subscribes the webhook to Meta
func (s *WebhookService) SubscribeWebhook(c *gin.Context) {
	configID := c.Param("id")
	
	// Get config from database
	var config struct {
		PhoneNumberID string `db:"phone_number_id"`
		AccessToken   string `db:"access_token"`
	}
	
	query := `SELECT phone_number_id, access_token FROM whatsapp_configs WHERE id = $1`
	err := s.db.QueryRow(query, configID).Scan(&config.PhoneNumberID, &config.AccessToken)
	
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Configuration not found"})
		return
	}
	
	// Subscribe to webhook
	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/subscribed_apps", config.PhoneNumberID)
	
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}
	
	req.Header.Set("Authorization", "Bearer "+config.AccessToken)
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to subscribe webhook"})
		return
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	var result map[string]interface{}
	json.Unmarshal(body, &result)
	
	if resp.StatusCode == http.StatusOK {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Webhook subscribed successfully",
			"result":  result,
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Failed to subscribe webhook",
			"details": result,
		})
	}
}

// getWebhookURL returns the configured webhook URL
func (s *WebhookService) getWebhookURL() string {
	// Try to get from environment
	if url := os.Getenv("WHATSAPP_WEBHOOK_URL"); url != "" {
		return url
	}
	
	// Default URL based on domain
	return "https://api.pytake.net/webhook/whatsapp"
}

// GetWebhookLogs returns recent webhook logs
func (s *WebhookService) GetWebhookLogs(c *gin.Context) {
	query := `
		SELECT id, timestamp, payload, processed 
		FROM webhook_logs 
		ORDER BY timestamp DESC 
		LIMIT 50
	`
	
	rows, err := s.db.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch logs"})
		return
	}
	defer rows.Close()
	
	var logs []map[string]interface{}
	for rows.Next() {
		var id int
		var timestamp time.Time
		var payload json.RawMessage
		var processed bool
		
		if err := rows.Scan(&id, &timestamp, &payload, &processed); err != nil {
			continue
		}
		
		logs = append(logs, map[string]interface{}{
			"id":        id,
			"timestamp": timestamp,
			"payload":   payload,
			"processed": processed,
		})
	}
	
	c.JSON(http.StatusOK, logs)
}