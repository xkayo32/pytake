package whatsapp

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/redis"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Service handles WhatsApp business logic
type Service struct {
	db         *gorm.DB
	redis      *redis.Client
	client     *Client
	logger     *zap.SugaredLogger
	encryptKey []byte
	// Add queue manager later when implementing queue integration
	// queueManager queue.Manager
}

// NewService creates a new WhatsApp service
func NewService(db *gorm.DB, redis *redis.Client, logger *zap.SugaredLogger, encryptKey string) *Service {
	return &Service{
		db:         db,
		redis:      redis,
		client:     NewClient(logger),
		logger:     logger,
		encryptKey: []byte(encryptKey),
	}
}

// CreateConfig creates a new WhatsApp configuration for a tenant
func (s *Service) CreateConfig(tenantID uuid.UUID, req *CreateConfigRequest) (*models.WhatsAppConfig, error) {
	// Check if tenant already has max configs
	var count int64
	s.db.Model(&models.WhatsAppConfig{}).Where("tenant_id = ?", tenantID).Count(&count)
	
	// TODO: Check tenant's max_whatsapp_configs setting
	maxConfigs := 1 // Default for basic plan
	if count >= int64(maxConfigs) {
		return nil, fmt.Errorf("tenant has reached maximum WhatsApp configurations limit")
	}

	// Encrypt the access token
	encryptedToken, err := s.encryptString(req.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt access token: %w", err)
	}

	// Create config
	config := &models.WhatsAppConfig{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		Name:               req.Name,
		PhoneNumberID:      req.PhoneNumberID,
		AccessToken:        encryptedToken,
		WebhookVerifyToken: req.WebhookVerifyToken,
		IsActive:           true,
	}

	// Test the configuration before saving
	if err := s.client.TestConnection(context.Background(), config); err != nil {
		return nil, fmt.Errorf("configuration test failed: %w", err)
	}

	// Save to database
	if err := s.db.Create(config).Error; err != nil {
		return nil, fmt.Errorf("failed to create config: %w", err)
	}

	// Don't return the encrypted token
	config.AccessToken = "[ENCRYPTED]"
	return config, nil
}

// GetConfig retrieves a WhatsApp configuration
func (s *Service) GetConfig(id uuid.UUID, tenantID uuid.UUID) (*models.WhatsAppConfig, error) {
	var config models.WhatsAppConfig
	err := s.db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&config).Error
	if err != nil {
		return nil, fmt.Errorf("config not found: %w", err)
	}
	
	// Don't return the encrypted token
	config.AccessToken = "[ENCRYPTED]"
	return &config, nil
}

// GetConfigs retrieves all WhatsApp configurations for a tenant
func (s *Service) GetConfigs(tenantID uuid.UUID) ([]models.WhatsAppConfig, error) {
	var configs []models.WhatsAppConfig
	err := s.db.Where("tenant_id = ?", tenantID).Find(&configs).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get configs: %w", err)
	}
	
	// Don't return encrypted tokens
	for i := range configs {
		configs[i].AccessToken = "[ENCRYPTED]"
	}
	
	return configs, nil
}

// UpdateConfig updates a WhatsApp configuration
func (s *Service) UpdateConfig(id uuid.UUID, tenantID uuid.UUID, req *UpdateConfigRequest) (*models.WhatsAppConfig, error) {
	var config models.WhatsAppConfig
	if err := s.db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&config).Error; err != nil {
		return nil, fmt.Errorf("config not found: %w", err)
	}

	// Update fields if provided
	if req.Name != "" {
		config.Name = req.Name
	}
	if req.PhoneNumberID != "" {
		config.PhoneNumberID = req.PhoneNumberID
	}
	if req.AccessToken != "" {
		encryptedToken, err := s.encryptString(req.AccessToken)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt access token: %w", err)
		}
		config.AccessToken = encryptedToken
	}
	if req.WebhookVerifyToken != "" {
		config.WebhookVerifyToken = req.WebhookVerifyToken
	}
	if req.IsActive != nil {
		config.IsActive = *req.IsActive
	}

	// Test the configuration if critical fields changed
	if req.AccessToken != "" || req.PhoneNumberID != "" {
		if err := s.client.TestConnection(context.Background(), &config); err != nil {
			return nil, fmt.Errorf("configuration test failed: %w", err)
		}
	}

	// Save updates
	if err := s.db.Save(&config).Error; err != nil {
		return nil, fmt.Errorf("failed to update config: %w", err)
	}

	// Don't return the encrypted token
	config.AccessToken = "[ENCRYPTED]"
	return &config, nil
}

// DeleteConfig deletes a WhatsApp configuration
func (s *Service) DeleteConfig(id uuid.UUID, tenantID uuid.UUID) error {
	result := s.db.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.WhatsAppConfig{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete config: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("config not found")
	}
	return nil
}

// TestConfig tests a WhatsApp configuration
func (s *Service) TestConfig(id uuid.UUID, tenantID uuid.UUID) error {
	var config models.WhatsAppConfig
	if err := s.db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&config).Error; err != nil {
		return fmt.Errorf("config not found: %w", err)
	}

	// Decrypt access token
	decryptedToken, err := s.decryptString(config.AccessToken)
	if err != nil {
		return fmt.Errorf("failed to decrypt access token: %w", err)
	}
	config.AccessToken = decryptedToken

	// Test the connection
	if err := s.client.TestConnection(context.Background(), &config); err != nil {
		return fmt.Errorf("connection test failed: %w", err)
	}

	return nil
}

// SendMessage sends a WhatsApp message
func (s *Service) SendMessage(tenantID uuid.UUID, req *SendMessageRequest) (*SendMessageResponse, error) {
	// Start a database transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	// Get the config
	var config models.WhatsAppConfig
	if err := tx.Where("id = ? AND tenant_id = ? AND is_active = ?", req.ConfigID, tenantID, true).First(&config).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("config not found or inactive: %w", err)
	}

	// Find or create contact for the recipient
	contact, err := s.findOrCreateContactByPhone(tx, req.To, tenantID)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to find or create contact: %w", err)
	}

	// Find or create conversation
	conversation, err := s.findOrCreateConversationForContact(tx, contact, &config, tenantID)
	if err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to find or create conversation: %w", err)
	}

	// Create message record
	message := &models.Message{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		ConversationID:   conversation.ID,
		ContactID:        contact.ID,
		WhatsAppConfigID: &config.ID,
		Direction:        models.MessageDirectionOutbound,
		Type:             string(req.Type),
		Status:           models.MessageStatusPending,
	}

	// Set message content based on type
	switch req.Type {
	case MessageTypeText:
		if req.Text != nil {
			message.Content = req.Text.Body
		}
	case MessageTypeImage, MessageTypeDocument, MessageTypeAudio, MessageTypeVideo:
		if req.Media != nil {
			message.MediaURL = req.Media.URL
			message.Content = req.Media.Caption
		}
	case MessageTypeTemplate:
		if req.Template != nil {
			message.TemplateName = req.Template.Name
			message.TemplateLanguage = req.Template.Language
			// Store template components as JSON
			if len(req.Template.Components) > 0 {
				message.TemplateParams = models.JSON(req.Template.Components)
			}
		}
	}

	// Save message to database
	if err := tx.Create(message).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create message record: %w", err)
	}

	// Commit transaction before sending
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Decrypt access token for API call
	decryptedToken, err := s.decryptString(config.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt access token: %w", err)
	}
	config.AccessToken = decryptedToken

	// Send based on message type
	var apiResp *WhatsAppAPIResponse
	var sendErr error

	switch req.Type {
	case MessageTypeText:
		if req.Text == nil {
			return nil, fmt.Errorf("text content is required for text message")
		}
		apiResp, sendErr = s.client.SendTextMessage(context.Background(), &config, &TextMessage{
			To:         req.To,
			Text:       req.Text.Body,
			PreviewURL: req.Text.PreviewURL,
		})

	case MessageTypeImage, MessageTypeDocument, MessageTypeAudio, MessageTypeVideo:
		if req.Media == nil {
			return nil, fmt.Errorf("media content is required for media message")
		}
		apiResp, sendErr = s.client.SendMediaMessage(context.Background(), &config, &MediaMessage{
			To:       req.To,
			Type:     req.Type,
			MediaURL: req.Media.URL,
			Caption:  req.Media.Caption,
			Filename: req.Media.Filename,
		})

	case MessageTypeTemplate:
		if req.Template == nil {
			return nil, fmt.Errorf("template content is required for template message")
		}
		apiResp, sendErr = s.client.SendTemplateMessage(context.Background(), &config, &TemplateMessage{
			To:           req.To,
			TemplateName: req.Template.Name,
			Language:     req.Template.Language,
			Components:   req.Template.Components,
		})

	default:
		return nil, fmt.Errorf("unsupported message type: %s", req.Type)
	}

	// Update message status based on send result
	now := time.Now()
	if sendErr != nil {
		message.Status = models.MessageStatusFailed
		message.ErrorMessage = sendErr.Error()
		message.FailedAt = &now
		s.db.Save(message)
		return nil, fmt.Errorf("failed to send message: %w", sendErr)
	}

	// Update message with WhatsApp ID and sent status
	if apiResp != nil && len(apiResp.Messages) > 0 {
		message.WhatsAppID = apiResp.Messages[0].ID
		message.Status = models.MessageStatusSent
		message.SentAt = &now
	} else {
		message.Status = models.MessageStatusSent
		message.SentAt = &now
	}
	s.db.Save(message)

	// Update contact statistics
	if err := s.updateContactStats(s.db, contact.ID); err != nil {
		s.logger.Warnw("Failed to update contact stats", "error", err, "contact_id", contact.ID)
	}

	// Queue webhook notification
	if err := s.queueWebhookNotification(message.ID, "message_sent"); err != nil {
		s.logger.Warnw("Failed to queue webhook notification", "error", err, "message_id", message.ID)
	}

	// Return response
	return &SendMessageResponse{
		MessageID: message.WhatsAppID,
		Status:    MessageStatusSent,
		To:        req.To,
		Timestamp: now,
		ConfigID:  req.ConfigID,
	}, nil
}

// ProcessIncomingMessage processes an incoming WhatsApp message
func (s *Service) ProcessIncomingMessage(msg *IncomingMessage) error {
	// Start a database transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	// Find or create contact
	contact, err := s.findOrCreateContact(tx, msg)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to find or create contact: %w", err)
	}

	// Find or create conversation
	conversation, err := s.findOrCreateConversation(tx, contact, msg)
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to find or create conversation: %w", err)
	}

	// Create message record
	message := &models.Message{
		TenantModel: models.TenantModel{
			TenantID: msg.TenantID,
		},
		ConversationID:   conversation.ID,
		ContactID:        contact.ID,
		WhatsAppConfigID: &msg.ConfigID,
		WhatsAppID:       msg.WhatsAppID,
		Direction:        models.MessageDirectionInbound,
		Type:             msg.Type,
		Status:           models.MessageStatusReceived,
		Content:          msg.TextBody,
	}

	// Handle different message types
	switch msg.Type {
	case string(MessageTypeText):
		message.Content = msg.TextBody
	case string(MessageTypeImage), string(MessageTypeDocument), string(MessageTypeAudio), string(MessageTypeVideo):
		if msg.MediaID != "" {
			message.MediaURL = msg.MediaID // Store media ID temporarily
			message.MediaType = msg.MediaMimeType
			message.MediaSize = 0 // Will be updated after download
			if msg.MediaCaption != "" {
				message.Content = msg.MediaCaption
			}
		}
	case string(MessageTypeLocation):
		if msg.LocationLat != nil && msg.LocationLng != nil {
			message.LocationLat = msg.LocationLat
			message.LocationLng = msg.LocationLng
			message.LocationName = msg.LocationName
			message.LocationAddress = msg.LocationAddress
		}
	}

	// Handle reply context
	if msg.ContextMessageID != "" {
		// Find the original message being replied to
		var originalMessage models.Message
		if err := tx.Where("whatsapp_id = ? AND tenant_id = ?", msg.ContextMessageID, msg.TenantID).First(&originalMessage).Error; err == nil {
			message.ReplyToID = &originalMessage.ID
		}
	}

	// Save message to database
	if err := tx.Create(message).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to save incoming message: %w", err)
	}

	// Update contact statistics
	if err := s.updateContactStats(tx, contact.ID); err != nil {
		s.logger.Warnw("Failed to update contact stats", "error", err, "contact_id", contact.ID)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Queue media download if needed
	if msg.MediaID != "" {
		if err := s.queueMediaDownload(message.ID, msg.MediaID, msg.ConfigID); err != nil {
			s.logger.Warnw("Failed to queue media download", "error", err, "message_id", message.ID)
		}
	}

	// Queue for AI processing
	if err := s.queueAIProcessing(message.ID, conversation.ID); err != nil {
		s.logger.Warnw("Failed to queue AI processing", "error", err, "message_id", message.ID)
	}

	// Queue for flow processing
	if err := s.queueFlowProcessing(message.ID, conversation.ID); err != nil {
		s.logger.Warnw("Failed to queue flow processing", "error", err, "message_id", message.ID)
	}

	// Queue for webhook notification to external systems
	if err := s.queueWebhookNotification(message.ID, "message_received"); err != nil {
		s.logger.Warnw("Failed to queue webhook notification", "error", err, "message_id", message.ID)
	}

	s.logger.Infow("Incoming message processed",
		"message_id", message.ID,
		"whatsapp_id", msg.WhatsAppID,
		"from", msg.From,
		"type", msg.Type,
		"conversation_id", conversation.ID,
		"contact_id", contact.ID,
		"tenant_id", msg.TenantID,
	)

	return nil
}

// UpdateMessageStatus updates the status of a sent message
func (s *Service) UpdateMessageStatus(whatsappID string, status string, tenantID uuid.UUID) error {
	var message models.Message
	if err := s.db.Where("whatsapp_id = ? AND tenant_id = ?", whatsappID, tenantID).First(&message).Error; err != nil {
		// Message might not exist yet (for very fast status updates)
		s.logger.Debugw("Message not found for status update",
			"whatsapp_id", whatsappID,
			"status", status,
		)
		return nil
	}

	// Update status and timestamp
	now := time.Now()
	updates := map[string]interface{}{
		"status":     models.MessageStatus(status),
		"updated_at": now,
	}

	// Set appropriate timestamp based on status
	switch models.MessageStatus(status) {
	case models.MessageStatusDelivered:
		updates["delivered_at"] = now
	case models.MessageStatusRead:
		updates["read_at"] = now
		// Also mark conversation as having activity
		if message.ConversationID != uuid.Nil {
			s.db.Model(&models.Conversation{}).Where("id = ?", message.ConversationID).Update("last_message_at", now)
		}
	case models.MessageStatusFailed:
		updates["failed_at"] = now
	}

	if err := s.db.Model(&message).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update message status: %w", err)
	}

	// Queue webhook notification for status update
	if err := s.queueWebhookNotification(message.ID, "message_status_updated"); err != nil {
		s.logger.Warnw("Failed to queue webhook notification", "error", err, "message_id", message.ID)
	}

	s.logger.Debugw("Message status updated",
		"message_id", message.ID,
		"whatsapp_id", whatsappID,
		"status", status,
	)

	return nil
}

// encryptString encrypts a string using AES
func (s *Service) encryptString(text string) (string, error) {
	// Ensure key is 32 bytes for AES-256
	key := make([]byte, 32)
	copy(key, s.encryptKey)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	plaintext := []byte(text)
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)

	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

// decryptString decrypts a string using AES
func (s *Service) decryptString(cryptoText string) (string, error) {
	// Ensure key is 32 bytes for AES-256
	key := make([]byte, 32)
	copy(key, s.encryptKey)

	ciphertext, err := base64.URLEncoding.DecodeString(cryptoText)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	if len(ciphertext) < aes.BlockSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	return string(ciphertext), nil
}

// findOrCreateContactByPhone finds or creates a contact by phone number
func (s *Service) findOrCreateContactByPhone(tx *gorm.DB, phoneNumber string, tenantID uuid.UUID) (*models.Contact, error) {
	var contact models.Contact

	// Try to find existing contact
	err := tx.Where("(whatsapp_phone = ? OR phone = ?) AND tenant_id = ?", phoneNumber, phoneNumber, tenantID).First(&contact).Error
	if err == nil {
		// Contact found, update last contact time
		now := time.Now()
		tx.Model(&contact).Updates(map[string]interface{}{
			"last_contact_at": now,
			"updated_at":      now,
		})
		return &contact, nil
	}

	// Contact not found, create new one
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("database error while finding contact: %w", err)
	}

	// Create new contact
	contact = models.Contact{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		Name:          phoneNumber, // Use phone as name initially
		Phone:         phoneNumber,
		WhatsAppPhone: phoneNumber,
		Source:        "whatsapp",
		Status:        models.ContactStatusActive,
		Language:      "pt",
		Timezone:      "America/Sao_Paulo",
	}

	if err := tx.Create(&contact).Error; err != nil {
		return nil, fmt.Errorf("failed to create contact: %w", err)
	}

	s.logger.Infow("New contact created for outbound message",
		"contact_id", contact.ID,
		"phone", phoneNumber,
		"tenant_id", tenantID,
	)

	return &contact, nil
}

// findOrCreateConversationForContact finds or creates a conversation for a contact
func (s *Service) findOrCreateConversationForContact(tx *gorm.DB, contact *models.Contact, config *models.WhatsAppConfig, tenantID uuid.UUID) (*models.Conversation, error) {
	var conversation models.Conversation

	// Try to find an open conversation for this contact and config
	err := tx.Where("contact_id = ? AND whatsapp_config_id = ? AND tenant_id = ? AND status IN ?", 
		contact.ID, config.ID, tenantID, []string{string(models.ConversationStatusOpen), string(models.ConversationStatusPending)}).First(&conversation).Error
	if err == nil {
		// Conversation found
		return &conversation, nil
	}

	// Conversation not found, create new one
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("database error while finding conversation: %w", err)
	}

	// Create new conversation
	conversation = models.Conversation{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		ContactID:        contact.ID,
		WhatsAppConfigID: &config.ID,
		Status:           models.ConversationStatusOpen,
		Channel:          models.ChannelWhatsApp,
		UnreadCount:      0,
	}

	if err := tx.Create(&conversation).Error; err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	s.logger.Infow("New conversation created for outbound message",
		"conversation_id", conversation.ID,
		"contact_id", contact.ID,
		"config_id", config.ID,
		"tenant_id", tenantID,
	)

	return &conversation, nil
}

// findOrCreateContact finds an existing contact or creates a new one
func (s *Service) findOrCreateContact(tx *gorm.DB, msg *IncomingMessage) (*models.Contact, error) {
	var contact models.Contact

	// Try to find existing contact by WhatsApp phone number
	err := tx.Where("whatsapp_phone = ? AND tenant_id = ?", msg.From, msg.TenantID).First(&contact).Error
	if err == nil {
		// Contact found, update last contact time and name if provided
		now := time.Now()
		updates := map[string]interface{}{
			"last_contact_at": now,
			"updated_at":      now,
		}
		if msg.ContactName != "" && contact.Name != msg.ContactName {
			updates["name"] = msg.ContactName
		}
		tx.Model(&contact).Updates(updates)
		return &contact, nil
	}

	// Contact not found, create new one
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("database error while finding contact: %w", err)
	}

	// Create new contact
	contact = models.Contact{
		TenantModel: models.TenantModel{
			TenantID: msg.TenantID,
		},
		Name:          msg.ContactName,
		WhatsAppPhone: msg.From,
		Source:        "whatsapp",
		Status:        models.ContactStatusActive,
		Language:      "pt", // Default to Portuguese
		Timezone:      "America/Sao_Paulo",
	}

	// Set name to phone number if name not provided
	if contact.Name == "" {
		contact.Name = msg.From
	}

	if err := tx.Create(&contact).Error; err != nil {
		return nil, fmt.Errorf("failed to create contact: %w", err)
	}

	s.logger.Infow("New contact created",
		"contact_id", contact.ID,
		"name", contact.Name,
		"phone", contact.WhatsAppPhone,
		"tenant_id", msg.TenantID,
	)

	return &contact, nil
}

// findOrCreateConversation finds an existing conversation or creates a new one
func (s *Service) findOrCreateConversation(tx *gorm.DB, contact *models.Contact, msg *IncomingMessage) (*models.Conversation, error) {
	var conversation models.Conversation

	// Try to find an open conversation for this contact
	err := tx.Where("contact_id = ? AND tenant_id = ? AND status IN ?", 
		contact.ID, msg.TenantID, []string{string(models.ConversationStatusOpen), string(models.ConversationStatusPending)}).First(&conversation).Error
	if err == nil {
		// Conversation found
		return &conversation, nil
	}

	// Conversation not found or error, create new one
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("database error while finding conversation: %w", err)
	}

	// Create new conversation
	conversation = models.Conversation{
		TenantModel: models.TenantModel{
			TenantID: msg.TenantID,
		},
		ContactID:        contact.ID,
		WhatsAppConfigID: &msg.ConfigID,
		Status:           models.ConversationStatusOpen,
		Channel:          models.ChannelWhatsApp,
		UnreadCount:      0, // Will be incremented by message creation
	}

	if err := tx.Create(&conversation).Error; err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	s.logger.Infow("New conversation created",
		"conversation_id", conversation.ID,
		"contact_id", contact.ID,
		"tenant_id", msg.TenantID,
	)

	return &conversation, nil
}

// updateContactStats updates contact statistics
func (s *Service) updateContactStats(tx *gorm.DB, contactID uuid.UUID) error {
	// Count total messages for this contact
	var messageCount int64
	tx.Model(&models.Message{}).Where("contact_id = ?", contactID).Count(&messageCount)

	// Count total conversations for this contact
	var conversationCount int64
	tx.Model(&models.Conversation{}).Where("contact_id = ?", contactID).Count(&conversationCount)

	// Update contact statistics
	return tx.Model(&models.Contact{}).Where("id = ?", contactID).Updates(map[string]interface{}{
		"total_messages":     messageCount,
		"total_conversations": conversationCount,
		"updated_at":         time.Now(),
	}).Error
}

// queueMediaDownload queues a media download job
func (s *Service) queueMediaDownload(messageID uuid.UUID, mediaID string, configID uuid.UUID) error {
	if s.redis == nil {
		return nil // No queue system available
	}

	// Create job payload
	payload := map[string]interface{}{
		"message_id": messageID.String(),
		"media_id":   mediaID,
		"config_id":  configID.String(),
	}

	// Queue the job (this would integrate with your queue system)
	// For now, just log it
	s.logger.Infow("Queuing media download job",
		"message_id", messageID,
		"media_id", mediaID,
		"config_id", configID,
	)

	return nil
}

// queueAIProcessing queues AI processing for a message
func (s *Service) queueAIProcessing(messageID, conversationID uuid.UUID) error {
	if s.redis == nil {
		return nil // No queue system available
	}

	// Create job payload
	payload := map[string]interface{}{
		"message_id":      messageID.String(),
		"conversation_id": conversationID.String(),
		"action":          "process_message",
	}

	// Queue the job
	s.logger.Infow("Queuing AI processing job",
		"message_id", messageID,
		"conversation_id", conversationID,
	)

	return nil
}

// queueFlowProcessing queues flow processing for a message
func (s *Service) queueFlowProcessing(messageID, conversationID uuid.UUID) error {
	if s.redis == nil {
		return nil // No queue system available
	}

	// Create job payload
	payload := map[string]interface{}{
		"message_id":      messageID.String(),
		"conversation_id": conversationID.String(),
		"trigger_type":    "message_received",
	}

	// Queue the job
	s.logger.Infow("Queuing flow processing job",
		"message_id", messageID,
		"conversation_id", conversationID,
	)

	return nil
}

// queueWebhookNotification queues webhook notification
func (s *Service) queueWebhookNotification(messageID uuid.UUID, eventType string) error {
	if s.redis == nil {
		return nil // No queue system available
	}

	// Create job payload
	payload := map[string]interface{}{
		"message_id": messageID.String(),
		"event_type": eventType,
		"timestamp":  time.Now().Unix(),
	}

	// Queue the job
	s.logger.Infow("Queuing webhook notification job",
		"message_id", messageID,
		"event_type", eventType,
	)

	return nil
}

// Request/Response DTOs

// CreateConfigRequest represents a request to create a WhatsApp config
type CreateConfigRequest struct {
	Name               string `json:"name" validate:"required,min=2,max=255"`
	PhoneNumberID      string `json:"phone_number_id" validate:"required"`
	AccessToken        string `json:"access_token" validate:"required"`
	WebhookVerifyToken string `json:"webhook_verify_token" validate:"required"`
}

// UpdateConfigRequest represents a request to update a WhatsApp config
type UpdateConfigRequest struct {
	Name               string `json:"name,omitempty"`
	PhoneNumberID      string `json:"phone_number_id,omitempty"`
	AccessToken        string `json:"access_token,omitempty"`
	WebhookVerifyToken string `json:"webhook_verify_token,omitempty"`
	IsActive           *bool  `json:"is_active,omitempty"`
}

// ConfigResponse represents a WhatsApp config in API responses
type ConfigResponse struct {
	ID                 uuid.UUID `json:"id"`
	Name               string    `json:"name"`
	PhoneNumberID      string    `json:"phone_number_id"`
	WebhookVerifyToken string    `json:"webhook_verify_token"`
	IsActive           bool      `json:"is_active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}