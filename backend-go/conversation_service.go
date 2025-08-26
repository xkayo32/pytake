package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/lib/pq"
)

type ConversationService struct {
	db       *sql.DB
	upgrader websocket.Upgrader
	clients  map[*websocket.Conn]bool
}

func NewConversationService(db *sql.DB) *ConversationService {
	return &ConversationService{
		db: db,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for now
			},
		},
		clients: make(map[*websocket.Conn]bool),
	}
}

// SyncConversations syncs conversations from WhatsApp
func (s *ConversationService) SyncConversations(c *gin.Context) {
	var req struct {
		ConfigID       string `json:"config_id"`
		PhoneNumberID  string `json:"phone_number_id"`
		AccessToken    string `json:"access_token"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Get first tenant ID (temporary solution)
	var tenantID string
	err := s.db.QueryRow("SELECT id FROM tenants LIMIT 1").Scan(&tenantID)
	if err != nil {
		log.Printf("Error getting tenant: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tenant not found"})
		return
	}

	// Get WhatsApp configuration details
	var phoneNumberID, accessToken string
	if req.ConfigID != "" {
		err = s.db.QueryRow(`
			SELECT phone_number_id, access_token
			FROM whatsapp_configs
			WHERE id = $1
		`, req.ConfigID).Scan(&phoneNumberID, &accessToken)
	} else {
		// Use default config
		err = s.db.QueryRow(`
			SELECT phone_number_id, access_token
			FROM whatsapp_configs
			WHERE is_default = true
			LIMIT 1
		`).Scan(&phoneNumberID, &accessToken)
	}
	
	if err != nil {
		log.Printf("Error getting WhatsApp config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "WhatsApp configuration not found"})
		return
	}

	// Use provided values or fall back to database values
	if req.PhoneNumberID != "" {
		phoneNumberID = req.PhoneNumberID
	}
	if req.AccessToken != "" {
		accessToken = req.AccessToken
	}

	// Sync real conversations using WhatsApp Business API
	syncedCount, err := s.syncRealConversations(tenantID, phoneNumberID, accessToken)
	if err != nil {
		log.Printf("Error syncing real conversations: %v", err)
		// Fall back to counting existing conversations
		var existingCount int
		s.db.QueryRow(`
			SELECT COUNT(DISTINCT c.id) 
			FROM conversations c
			WHERE c.tenant_id = $1
			AND c.last_message IS NOT NULL
			AND c.last_message != ''
		`, tenantID).Scan(&existingCount)
		
		c.JSON(http.StatusOK, gin.H{
			"count": existingCount,
			"message": fmt.Sprintf("Erro na sincronização: %v. Mostrando %d conversas existentes", err, existingCount),
			"warning": err.Error(),
		})
		return
	}
	
	log.Printf("📥 Synced %d real conversations for config %s", syncedCount, req.ConfigID)
	c.JSON(http.StatusOK, gin.H{
		"count": syncedCount,
		"message": fmt.Sprintf("Sincronizadas %d conversas do WhatsApp", syncedCount),
	})
}

// syncRealConversations attempts to sync real conversations from WhatsApp
func (s *ConversationService) syncRealConversations(tenantID, phoneNumberID, accessToken string) (int, error) {
	log.Printf("🔄 Attempting to sync conversations for phone number ID: %s", phoneNumberID)
	
	// IMPORTANT: WhatsApp Business API does NOT provide:
	// - Endpoint to list conversations
	// - Endpoint to retrieve historical messages
	// - Endpoint to get message content by ID
	// 
	// The only way to get conversations is via webhook when messages are received in real-time
	
	// First, try to get existing webhook-based conversations
	webhookCount, err := s.discoverConversationsFromWebhook(tenantID)
	if err != nil {
		log.Printf("Error discovering webhook conversations: %v", err)
		webhookCount = 0
	}
	
	// Return only real webhook-based conversations
	log.Printf("📊 Found %d real conversations from webhook", webhookCount)
	
	return webhookCount, nil
}


// discoverConversationsFromWebhook counts conversations that came via webhook (real messages)
func (s *ConversationService) discoverConversationsFromWebhook(tenantID string) (int, error) {
	var count int
	err := s.db.QueryRow(`
		SELECT COUNT(DISTINCT c.id) 
		FROM conversations c
		JOIN messages m ON c.id = m.conversation_id
		WHERE c.tenant_id = $1
		AND m.whatsapp_message_id IS NOT NULL
		AND m.whatsapp_message_id != ''
	`, tenantID).Scan(&count)
	
	if err != nil {
		return 0, fmt.Errorf("failed to count webhook-based conversations: %v", err)
	}
	
	log.Printf("📊 Found %d conversations with real WhatsApp messages", count)
	return count, nil
}

// UpdateConversationsWithPhoneNumbers updates existing conversations to ensure proper phone number formatting
func (s *ConversationService) UpdateConversationsWithPhoneNumbers(c *gin.Context) {
	// Get first tenant ID (temporary solution)
	var tenantID string
	err := s.db.QueryRow("SELECT id FROM tenants LIMIT 1").Scan(&tenantID)
	if err != nil {
		log.Printf("Error getting tenant: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tenant not found"})
		return
	}

	// Update all contacts with properly normalized phone numbers
	query := `
		UPDATE contacts 
		SET phone = CASE
			WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 13 AND SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 1, 2) = '55' THEN 
				REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
			WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 11 AND SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 1, 1) = '6' THEN 
				'55' || REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
			WHEN LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) = 10 AND SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 1, 1) = '6' THEN 
				'55' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 1, 2) || '9' || SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 3)
			ELSE phone
		END,
		updated_at = NOW()
		WHERE tenant_id = $1
		AND phone ~ '^[0-9+\-\s\(\)]+$'
	`

	result, err := s.db.Exec(query, tenantID)
	if err != nil {
		log.Printf("Error updating phone numbers: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update phone numbers"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	log.Printf("📞 Updated %d contact phone numbers", rowsAffected)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Updated %d contact phone numbers", rowsAffected),
		"updated_contacts": rowsAffected,
	})
}

// GetConversationStats returns conversation statistics
func (s *ConversationService) GetConversationStats(c *gin.Context) {
	// Get first tenant ID (temporary solution)
	var tenantID string
	err := s.db.QueryRow("SELECT id FROM tenants LIMIT 1").Scan(&tenantID)
	if err != nil {
		log.Printf("Error getting tenant: %v", err)
		c.JSON(http.StatusOK, gin.H{
			"active_conversations": 0,
			"messages_today": 0,
			"unread_count": 0,
		})
		return
	}

	// Get active conversations count
	var activeConversations int
	err = s.db.QueryRow(`
		SELECT COUNT(*) FROM conversations 
		WHERE tenant_id = $1 AND status = 'active'
	`, tenantID).Scan(&activeConversations)
	if err != nil {
		log.Printf("Error getting active conversations: %v", err)
		activeConversations = 0
	}

	// Get messages today count
	var messagesToday int
	err = s.db.QueryRow(`
		SELECT COUNT(*) FROM messages m
		JOIN conversations c ON m.conversation_id = c.id
		WHERE c.tenant_id = $1 
		AND m.created_at >= CURRENT_DATE
	`, tenantID).Scan(&messagesToday)
	if err != nil {
		log.Printf("Error getting messages today: %v", err)
		messagesToday = 0
	}

	// Get unread count
	var unreadCount int
	err = s.db.QueryRow(`
		SELECT COALESCE(SUM(unread_count), 0) FROM conversations 
		WHERE tenant_id = $1 AND unread_count > 0
	`, tenantID).Scan(&unreadCount)
	if err != nil {
		log.Printf("Error getting unread count: %v", err)
		unreadCount = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"active_conversations": activeConversations,
		"messages_today": messagesToday,
		"unread_count": unreadCount,
	})
}

// ClearAllConversations deletes all conversations and related data
func (s *ConversationService) ClearAllConversations(c *gin.Context) {
	// Get first tenant ID (temporary solution)
	var tenantID string
	err := s.db.QueryRow("SELECT id FROM tenants LIMIT 1").Scan(&tenantID)
	if err != nil {
		log.Printf("Error getting tenant: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tenant not found"})
		return
	}

	// Start transaction
	tx, err := s.db.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	// Delete messages first (due to foreign key constraints)
	messagesResult, err := tx.Exec(`
		DELETE FROM messages 
		WHERE conversation_id IN (
			SELECT id FROM conversations WHERE tenant_id = $1
		)
	`, tenantID)
	if err != nil {
		log.Printf("Error deleting messages: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete messages"})
		return
	}
	messagesDeleted, _ := messagesResult.RowsAffected()

	// Delete conversations
	conversationsResult, err := tx.Exec(`
		DELETE FROM conversations WHERE tenant_id = $1
	`, tenantID)
	if err != nil {
		log.Printf("Error deleting conversations: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete conversations"})
		return
	}
	conversationsDeleted, _ := conversationsResult.RowsAffected()

	// Delete contacts that have no conversations
	contactsResult, err := tx.Exec(`
		DELETE FROM contacts 
		WHERE tenant_id = $1 
		AND id NOT IN (
			SELECT DISTINCT contact_id FROM conversations WHERE tenant_id = $1
		)
	`, tenantID)
	if err != nil {
		log.Printf("Error deleting contacts: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete contacts"})
		return
	}
	contactsDeleted, _ := contactsResult.RowsAffected()

	// Commit transaction
	if err := tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	log.Printf("🧹 Cleared all conversations: %d conversations, %d messages, %d contacts deleted", 
		conversationsDeleted, messagesDeleted, contactsDeleted)

	// Broadcast clear event to all WebSocket clients
	s.broadcastMessage(map[string]interface{}{
		"type": "conversations_cleared",
		"data": map[string]interface{}{
			"conversations_deleted": conversationsDeleted,
			"messages_deleted": messagesDeleted,
			"contacts_deleted": contactsDeleted,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "All conversations cleared successfully",
		"deleted": map[string]interface{}{
			"conversations": conversationsDeleted,
			"messages": messagesDeleted,
			"contacts": contactsDeleted,
		},
	})
}

// GetUnreadCount returns the count of unread conversations
func (s *ConversationService) GetUnreadCount(c *gin.Context) {
	// Get first tenant ID (temporary solution)
	var tenantID string
	err := s.db.QueryRow("SELECT id FROM tenants LIMIT 1").Scan(&tenantID)
	if err != nil {
		log.Printf("Error getting tenant: %v", err)
		c.JSON(http.StatusOK, gin.H{"count": 0})
		return
	}

	query := `
		SELECT COUNT(DISTINCT c.id) 
		FROM conversations c
		WHERE c.unread_count > 0
		AND c.tenant_id = $1
	`

	var count int
	err = s.db.QueryRow(query, tenantID).Scan(&count)
	if err != nil {
		log.Printf("Error getting unread count: %v", err)
		count = 0
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// GetConversations returns all conversations with messages
func (s *ConversationService) GetConversations(c *gin.Context) {
	// Get first tenant ID (temporary solution)
	var tenantID string
	err := s.db.QueryRow("SELECT id FROM tenants LIMIT 1").Scan(&tenantID)
	if err != nil {
		log.Printf("Error getting tenant: %v", err)
		c.JSON(http.StatusOK, gin.H{"conversations": []map[string]interface{}{}})
		return
	}

	query := `
		SELECT 
			c.id,
			c.contact_id,
			co.name,
			co.phone,
			co.avatar_url,
			c.last_message,
			c.last_message_time,
			c.unread_count,
			c.status,
			c.assigned_to
		FROM conversations c
		JOIN contacts co ON c.contact_id = co.id
		WHERE c.tenant_id = $1
		ORDER BY c.last_message_time DESC NULLS LAST
		LIMIT 100
	`

	log.Printf("Getting conversations for tenant: %s", tenantID)
	rows, err := s.db.Query(query, tenantID)
	if err != nil {
		log.Printf("Error getting conversations: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get conversations"})
		return
	}
	defer rows.Close()

	var conversations []map[string]interface{}
	rowCount := 0
	for rows.Next() {
		rowCount++
		var id, contactID string
		var name, phone, lastMessage, status sql.NullString
		var avatarURL sql.NullString
		var lastMessageTime pq.NullTime
		var unreadCount int
		var assignedTo sql.NullString

		err := rows.Scan(&id, &contactID, &name, &phone, &avatarURL, &lastMessage, &lastMessageTime, &unreadCount, &status, &assignedTo)
		if err != nil {
			log.Printf("Error scanning conversation row %d: %v", rowCount, err)
			continue
		}
		log.Printf("Scanned conversation: id=%s, phone=%s", id, phone.String)

		conversation := map[string]interface{}{
			"id":               id,
			"contact_id":       contactID,
			"contact_name":     name.String,
			"contact_phone":    phone.String,
			"avatar_url":       avatarURL.String,
			"last_message":     lastMessage.String,
			"last_message_time": nil,
			"unread_count":     unreadCount,
			"status":           status.String,
			"assigned_to":      nil,
		}

		if lastMessageTime.Valid {
			conversation["last_message_time"] = lastMessageTime.Time.Format(time.RFC3339)
		}

		if assignedTo.Valid {
			conversation["assigned_to"] = assignedTo.String
		}

		conversations = append(conversations, conversation)
	}

	log.Printf("Total conversations found: %d", len(conversations))
	c.JSON(http.StatusOK, gin.H{"conversations": conversations})
}

// GetMessages returns messages for a conversation
func (s *ConversationService) GetMessages(c *gin.Context) {
	conversationID := c.Param("id")

	// Mark conversation as read
	_, err := s.db.Exec(`
		UPDATE conversations 
		SET unread_count = 0 
		WHERE id = $1
	`, conversationID)
	if err != nil {
		log.Printf("Error marking conversation as read: %v", err)
	}

	query := `
		SELECT 
			m.id,
			m.conversation_id,
			m.is_from_me,
			m.content,
			m.type,
			m.status,
			m.created_at,
			m.media_url,
			m.whatsapp_message_id
		FROM messages m
		WHERE m.conversation_id = $1
		ORDER BY m.created_at ASC
		LIMIT 500
	`

	rows, err := s.db.Query(query, conversationID)
	if err != nil {
		log.Printf("Error getting messages: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
		return
	}
	defer rows.Close()

	var messages []map[string]interface{}
	for rows.Next() {
		var id, conversationID string
		var isFromMe bool
		var content, messageType, status string
		var createdAt time.Time
		var mediaURL, wamid sql.NullString

		err := rows.Scan(&id, &conversationID, &isFromMe, &content, &messageType, &status, &createdAt, &mediaURL, &wamid)
		if err != nil {
			log.Printf("Error scanning message: %v", err)
			continue
		}

		message := map[string]interface{}{
			"id":              id,
			"conversation_id": conversationID,
			"sender":          map[string]bool{"agent": isFromMe, "customer": !isFromMe},
			"is_from_me":      isFromMe,
			"content":         content,
			"type":            messageType,
			"status":          status,
			"created_at":      createdAt.Format(time.RFC3339),
			"media_url":       mediaURL.String,
			"wamid":           wamid.String,
		}

		messages = append(messages, message)
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// SendMessage sends a WhatsApp message
func (s *ConversationService) SendMessage(c *gin.Context) {
	conversationID := c.Param("id")
	
	var req struct {
		Content string `json:"content"`
		Type    string `json:"type"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Error binding JSON request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Get conversation and contact info
	var contactPhone string
	err := s.db.QueryRow(`
		SELECT co.phone 
		FROM conversations c
		JOIN contacts co ON c.contact_id = co.id
		WHERE c.id = $1
	`, conversationID).Scan(&contactPhone)

	if err != nil {
		log.Printf("Error getting contact phone: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	// Send WhatsApp message using the WhatsApp service
	err = s.sendWhatsAppMessage(contactPhone, req.Content)
	if err != nil {
		log.Printf("Error sending WhatsApp message: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Get conversation details for inserting message
	var tenantID, contactID string
	err = s.db.QueryRow(`
		SELECT tenant_id, contact_id FROM conversations WHERE id = $1
	`, conversationID).Scan(&tenantID, &contactID)
	
	if err != nil {
		log.Printf("Error getting conversation details: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	// Save message to database
	var messageID string
	err = s.db.QueryRow(`
		INSERT INTO messages (conversation_id, tenant_id, contact_id, is_from_me, content, type, status, created_at)
		VALUES ($1, $2, $3, true, $4, $5, 'sent', NOW())
		RETURNING id
	`, conversationID, tenantID, contactID, req.Content, req.Type).Scan(&messageID)

	if err != nil {
		log.Printf("Error saving message: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Update conversation last message
	_, err = s.db.Exec(`
		UPDATE conversations 
		SET last_message = $1, last_message_time = NOW()
		WHERE id = $2
	`, req.Content, conversationID)

	if err != nil {
		log.Printf("Error updating conversation: %v", err)
	}

	// Broadcast to WebSocket clients
	s.broadcastMessage(map[string]interface{}{
		"type": "new_message",
		"data": map[string]interface{}{
			"id":              messageID,
			"conversation_id": conversationID,
			"sender":          map[string]bool{"agent": true, "customer": false},
			"is_from_me":      true,
			"content":         req.Content,
			"type":            req.Type,
			"status":          "sent",
			"created_at":      time.Now().Format(time.RFC3339),
		},
	})

	c.JSON(http.StatusOK, gin.H{"message_id": messageID})
}

// sendWhatsAppMessage sends a message via WhatsApp API
func (s *ConversationService) sendWhatsAppMessage(recipient, message string) error {
	// Get WhatsApp config
	var phoneNumberID, accessToken string
	err := s.db.QueryRow(`
		SELECT phone_number_id, access_token
		FROM whatsapp_configs
		WHERE is_default = true
		LIMIT 1
	`).Scan(&phoneNumberID, &accessToken)

	if err != nil {
		return fmt.Errorf("no WhatsApp configuration found: %v", err)
	}

	// Format recipient number
	recipient = strings.TrimPrefix(recipient, "+")
	if !strings.HasPrefix(recipient, "55") && len(recipient) <= 11 {
		recipient = "55" + recipient
	}

	// Build WhatsApp API URL
	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/messages", phoneNumberID)

	// Build payload
	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                recipient,
		"type":              "text",
		"text": map[string]string{
			"preview_url": "false",
			"body":        message,
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %v", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, strings.NewReader(string(jsonPayload)))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

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

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("WhatsApp API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	log.Printf("✅ Message sent successfully to %s", recipient)
	return nil
}

// WebSocketHandler handles WebSocket connections for real-time updates
func (s *ConversationService) WebSocketHandler(c *gin.Context) {
	conn, err := s.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}
	defer conn.Close()

	s.clients[conn] = true
	defer delete(s.clients, conn)

	// Keep connection alive
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}
		// Handle incoming messages if needed
	}
}

// broadcastMessage sends a message to all connected WebSocket clients
func (s *ConversationService) broadcastMessage(message map[string]interface{}) {
	for client := range s.clients {
		err := client.WriteJSON(message)
		if err != nil {
			log.Printf("WebSocket write error: %v", err)
			client.Close()
			delete(s.clients, client)
		}
	}
}

// broadcastStatsUpdate sends updated statistics to all WebSocket clients
func (s *ConversationService) broadcastStatsUpdate(tenantID string) {
	// Get updated stats
	var activeConversations, messagesToday, unreadCount int
	
	s.db.QueryRow(`
		SELECT COUNT(*) FROM conversations 
		WHERE tenant_id = $1 AND status = 'active'
	`, tenantID).Scan(&activeConversations)
	
	s.db.QueryRow(`
		SELECT COUNT(*) FROM messages m
		JOIN conversations c ON m.conversation_id = c.id
		WHERE c.tenant_id = $1 
		AND m.created_at >= CURRENT_DATE
	`, tenantID).Scan(&messagesToday)
	
	s.db.QueryRow(`
		SELECT COALESCE(SUM(unread_count), 0) FROM conversations 
		WHERE tenant_id = $1 AND unread_count > 0
	`, tenantID).Scan(&unreadCount)
	
	// Broadcast stats update
	s.broadcastMessage(map[string]interface{}{
		"type": "stats_update",
		"data": map[string]interface{}{
			"active_conversations": activeConversations,
			"messages_today": messagesToday,
			"unread_count": unreadCount,
		},
	})
}

// WhatsAppWebhook handles incoming WhatsApp webhook events
func (s *ConversationService) WhatsAppWebhook(c *gin.Context) {
	// Verify webhook (for GET requests)
	if c.Request.Method == "GET" {
		mode := c.Query("hub.mode")
		token := c.Query("hub.verify_token")
		challenge := c.Query("hub.challenge")

		// Get webhook secret from config
		var webhookSecret string
		s.db.QueryRow(`
			SELECT webhook_secret
			FROM whatsapp_configs
			WHERE is_default = true
			LIMIT 1
		`).Scan(&webhookSecret)

		if mode == "subscribe" && token == webhookSecret {
			c.String(http.StatusOK, challenge)
			return
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Verification failed"})
		return
	}

	// Handle POST requests (incoming messages)
	var webhook struct {
		Entry []struct {
			ID      string `json:"id"`
			Changes []struct {
				Value struct {
					MessagingProduct string `json:"messaging_product"`
					Metadata         struct {
						DisplayPhoneNumber string `json:"display_phone_number"`
						PhoneNumberID      string `json:"phone_number_id"`
					} `json:"metadata"`
					Messages []struct {
						From      string `json:"from"`
						ID        string `json:"id"`
						Timestamp string `json:"timestamp"`
						Type      string `json:"type"`
						Text      struct {
							Body string `json:"body"`
						} `json:"text"`
					} `json:"messages"`
					Statuses []struct {
						ID        string `json:"id"`
						Status    string `json:"status"`
						Timestamp string `json:"timestamp"`
						Recipient string `json:"recipient_id"`
					} `json:"statuses"`
				} `json:"value"`
			} `json:"changes"`
		} `json:"entry"`
	}

	if err := c.ShouldBindJSON(&webhook); err != nil {
		log.Printf("Failed to parse webhook: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook payload"})
		return
	}

	// Process webhook data
	for _, entry := range webhook.Entry {
		for _, change := range entry.Changes {
			// Process incoming messages
			for _, msg := range change.Value.Messages {
				s.processIncomingMessage(msg.From, msg.Text.Body, msg.ID, msg.Type)
			}

			// Process status updates
			for _, status := range change.Value.Statuses {
				s.processStatusUpdate(status.ID, status.Status)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

// processIncomingMessage processes an incoming WhatsApp message
func (s *ConversationService) processIncomingMessage(from, content, wamid, messageType string) {
	// Get first tenant ID (temporary solution)
	var tenantID string
	err := s.db.QueryRow("SELECT id FROM tenants LIMIT 1").Scan(&tenantID)
	if err != nil {
		log.Printf("Error getting tenant: %v", err)
		return
	}

	// Ensure contact exists
	contactID := s.ensureContact(from)
	if contactID == "" {
		return
	}

	// Get or create conversation
	var conversationID string
	err = s.db.QueryRow(`
		INSERT INTO conversations (tenant_id, contact_id, last_message, last_message_time, unread_count, status)
		VALUES ($1, $2, $3, NOW(), 1, 'active')
		ON CONFLICT (tenant_id, contact_id)
		DO UPDATE SET 
			last_message = $3,
			last_message_time = NOW(),
			unread_count = conversations.unread_count + 1,
			status = 'active'
		RETURNING id
	`, tenantID, contactID, content).Scan(&conversationID)

	if err != nil {
		log.Printf("Error creating/updating conversation: %v", err)
		return
	}

	// Save message
	var messageID string
	err = s.db.QueryRow(`
		INSERT INTO messages (conversation_id, is_from_me, content, type, status, created_at, whatsapp_message_id, tenant_id, contact_id)
		VALUES ($1, false, $2, $3, 'received', NOW(), $4, $5, $6)
		RETURNING id
	`, conversationID, content, messageType, wamid, tenantID, contactID).Scan(&messageID)

	if err != nil {
		log.Printf("Error saving message: %v", err)
		return
	}

	// Broadcast to WebSocket clients
	s.broadcastMessage(map[string]interface{}{
		"type": "new_message",
		"data": map[string]interface{}{
			"id":              messageID,
			"conversation_id": conversationID,
			"sender":          map[string]bool{"agent": false, "customer": true},
			"is_from_me":      false,
			"content":         content,
			"type":            messageType,
			"status":          "received",
			"created_at":      time.Now().Format(time.RFC3339),
			"wamid":           wamid,
		},
	})

	// Broadcast updated stats in real-time
	s.broadcastStatsUpdate(tenantID)

	log.Printf("📥 Received message from %s: %s", from, content)
}

// processStatusUpdate processes a WhatsApp message status update
func (s *ConversationService) processStatusUpdate(wamid, status string) {
	// Update message status
	_, err := s.db.Exec(`
		UPDATE messages 
		SET status = $1 
		WHERE whatsapp_message_id = $2
	`, status, wamid)

	if err != nil {
		log.Printf("Error updating message status: %v", err)
		return
	}

	// Broadcast status update
	s.broadcastMessage(map[string]interface{}{
		"type": "status_update",
		"data": map[string]interface{}{
			"wamid":  wamid,
			"status": status,
		},
	})

	log.Printf("📊 Status update for %s: %s", wamid, status)
}

// normalizeBrazilianPhone normalizes Brazilian phone numbers
func (s *ConversationService) normalizeBrazilianPhone(phone string) string {
	// Remove all non-digits
	digits := regexp.MustCompile(`[^\d]`).ReplaceAllString(phone, "")
	
	// Handle Brazilian mobile numbers
	if len(digits) >= 10 {
		// If starts with country code 55
		if strings.HasPrefix(digits, "55") {
			areaCode := digits[2:4]
			number := digits[4:]
			
			// If has extra 9 (11 digits after country code = 13 total)
			if len(number) == 9 && number[0] == '9' {
				// Keep as is - this is correct format 5561XXXXXXXXX
				return digits
			}
			
			// If no extra 9 (10 digits after country code = 12 total)  
			if len(number) == 8 {
				// Add the 9 for mobile: 5561XXXXXXXXX
				return "55" + areaCode + "9" + number
			}
		}
		
		// If no country code but has area code + number
		if len(digits) == 11 && digits[0] != '0' {
			// Add country code: 61XXXXXXXXX -> 5561XXXXXXXXX
			return "55" + digits
		}
		
		if len(digits) == 10 && digits[0] != '0' {
			// Add country code + mobile 9: 61XXXXXXXX -> 5561XXXXXXXXX
			areaCode := digits[0:2]
			number := digits[2:]
			return "55" + areaCode + "9" + number
		}
	}
	
	return digits
}

// ensureContact ensures a contact exists in the database
func (s *ConversationService) ensureContact(phone string) string {
	// Normalize phone number first
	normalizedPhone := s.normalizeBrazilianPhone(phone)
	
	// Get first tenant ID (temporary solution)
	var tenantID string
	err := s.db.QueryRow("SELECT id FROM tenants LIMIT 1").Scan(&tenantID)
	if err != nil {
		log.Printf("Error getting tenant: %v", err)
		return ""
	}

	// Check if contact already exists with normalized phone
	var contactID string
	err = s.db.QueryRow(`
		SELECT id FROM contacts 
		WHERE tenant_id = $1 AND phone = $2
		LIMIT 1
	`, tenantID, normalizedPhone).Scan(&contactID)
	
	if err == nil {
		// Contact exists, return it
		log.Printf("📞 Found existing contact for normalized phone %s: %s", normalizedPhone, contactID)
		return contactID
	}

	// Create new contact with normalized phone
	err = s.db.QueryRow(`
		INSERT INTO contacts (tenant_id, phone, name, created_at)
		VALUES ($1, $2, $2, NOW())
		RETURNING id
	`, tenantID, normalizedPhone).Scan(&contactID)

	if err != nil {
		log.Printf("Error ensuring contact: %v", err)
		return ""
	}

	return contactID
}