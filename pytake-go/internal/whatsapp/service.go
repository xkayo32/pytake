package whatsapp

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
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
	// Get the config
	var config models.WhatsAppConfig
	if err := s.db.Where("id = ? AND tenant_id = ? AND is_active = ?", req.ConfigID, tenantID, true).First(&config).Error; err != nil {
		return nil, fmt.Errorf("config not found or inactive: %w", err)
	}

	// Decrypt access token
	decryptedToken, err := s.decryptString(config.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt access token: %w", err)
	}
	config.AccessToken = decryptedToken

	// Create message record
	message := &models.Message{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		Direction: models.MessageDirectionOutbound,
		Type:      string(req.Type),
		Status:    models.MessageStatusPending,
	}

	// Save message to database
	if err := s.db.Create(message).Error; err != nil {
		return nil, fmt.Errorf("failed to create message record: %w", err)
	}

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

	// Update message status
	if sendErr != nil {
		message.Status = models.MessageStatusFailed
		message.ErrorMessage = sendErr.Error()
		s.db.Save(message)
		return nil, fmt.Errorf("failed to send message: %w", sendErr)
	}

	// Update message with WhatsApp ID
	if apiResp != nil && len(apiResp.Messages) > 0 {
		message.WhatsAppID = apiResp.Messages[0].ID
		message.Status = models.MessageStatusSent
	}
	s.db.Save(message)

	// Return response
	return &SendMessageResponse{
		MessageID: message.WhatsAppID,
		Status:    MessageStatusSent,
		To:        req.To,
		Timestamp: time.Now(),
		ConfigID:  req.ConfigID,
	}, nil
}

// ProcessIncomingMessage processes an incoming WhatsApp message
func (s *Service) ProcessIncomingMessage(msg *IncomingMessage) error {
	// Create message record
	message := &models.Message{
		TenantModel: models.TenantModel{
			TenantID: msg.TenantID,
		},
		WhatsAppID: msg.WhatsAppID,
		Direction:  models.MessageDirectionInbound,
		Type:       msg.Type,
		Status:     models.MessageStatusReceived,
		Content:    msg.TextBody,
	}

	// Handle media messages
	if msg.MediaID != "" {
		// Queue media download job
		// TODO: Implement media download queue
		message.MediaURL = msg.MediaID // Store media ID for now
	}

	// Save message to database
	if err := s.db.Create(message).Error; err != nil {
		return fmt.Errorf("failed to save incoming message: %w", err)
	}

	// Queue for further processing (flows, AI, etc.)
	// TODO: Implement message processing queue

	s.logger.Infow("Incoming message processed",
		"message_id", message.ID,
		"whatsapp_id", msg.WhatsAppID,
		"from", msg.From,
		"type", msg.Type,
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

	message.Status = models.MessageStatus(status)
	if err := s.db.Save(&message).Error; err != nil {
		return fmt.Errorf("failed to update message status: %w", err)
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