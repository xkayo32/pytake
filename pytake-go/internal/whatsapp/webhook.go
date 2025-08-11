package whatsapp

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WebhookHandler handles WhatsApp webhook events
type WebhookHandler struct {
	db       *gorm.DB
	logger   *zap.SugaredLogger
	service  *Service
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(db *gorm.DB, logger *zap.SugaredLogger, service *Service) *WebhookHandler {
	return &WebhookHandler{
		db:      db,
		logger:  logger,
		service: service,
	}
}

// VerifyWebhook handles the webhook verification challenge from WhatsApp
func (h *WebhookHandler) VerifyWebhook(c *gin.Context) {
	var verification WebhookVerification
	if err := c.ShouldBindQuery(&verification); err != nil {
		h.logger.Errorw("Invalid webhook verification request", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Log the verification attempt
	h.logger.Infow("Webhook verification attempt",
		"mode", verification.Mode,
		"token", verification.Token,
	)

	// Verify the mode and token
	if verification.Mode != "subscribe" {
		h.logger.Warnw("Invalid webhook mode", "mode", verification.Mode)
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid mode"})
		return
	}

	// Find the config by verify token
	var config models.WhatsAppConfig
	if err := h.db.Where("webhook_verify_token = ?", verification.Token).First(&config).Error; err != nil {
		h.logger.Warnw("Invalid verify token", "token", verification.Token)
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid verify token"})
		return
	}

	// Return the challenge
	h.logger.Infow("Webhook verified successfully",
		"config_id", config.ID,
		"tenant_id", config.TenantID,
	)
	
	c.String(http.StatusOK, verification.Challenge)
}

// HandleWebhook processes incoming webhook events from WhatsApp
func (h *WebhookHandler) HandleWebhook(c *gin.Context) {
	// Read raw body for signature verification
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		h.logger.Errorw("Failed to read webhook body", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	// Get signature from header
	signature := c.GetHeader("X-Hub-Signature-256")
	if signature == "" {
		h.logger.Warnw("Missing webhook signature")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature"})
		return
	}

	// Parse the webhook event
	var event WebhookEvent
	if err := json.Unmarshal(rawBody, &event); err != nil {
		h.logger.Errorw("Failed to parse webhook event", "error", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	// Process each entry
	for _, entry := range event.Entry {
		// Get WhatsApp config by business account ID
		var config models.WhatsAppConfig
		
		// For each change in the entry
		for _, change := range entry.Changes {
			// Get phone number ID from metadata
			phoneNumberID := change.Value.Metadata.PhoneNumberID
			
			// Find config by phone number ID
			if err := h.db.Where("phone_number_id = ? AND is_active = ?", phoneNumberID, true).First(&config).Error; err != nil {
				h.logger.Warnw("WhatsApp config not found",
					"phone_number_id", phoneNumberID,
					"error", err,
				)
				continue
			}

			// Verify signature with the config's app secret
			if !h.verifySignature(rawBody, signature, config.AccessToken) {
				h.logger.Warnw("Invalid webhook signature",
					"config_id", config.ID,
					"phone_number_id", phoneNumberID,
				)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
				return
			}

			// Process different types of changes
			switch change.Field {
			case "messages":
				h.processMessages(change.Value, &config)
			case "message_status":
				h.processStatuses(change.Value, &config)
			default:
				h.logger.Debugw("Unhandled webhook field",
					"field", change.Field,
					"config_id", config.ID,
				)
			}
		}
	}

	// Return success
	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

// processMessages handles incoming messages
func (h *WebhookHandler) processMessages(value ChangeValue, config *models.WhatsAppConfig) {
	for _, message := range value.Messages {
		h.logger.Infow("Received WhatsApp message",
			"from", message.From,
			"type", message.Type,
			"id", message.ID,
			"config_id", config.ID,
			"tenant_id", config.TenantID,
		)

		// Create incoming message record
		incomingMsg := &IncomingMessage{
			TenantID:       config.TenantID,
			ConfigID:       config.ID,
			WhatsAppID:     message.ID,
			From:           message.From,
			Type:           string(message.Type),
			Timestamp:      message.Timestamp,
		}

		// Extract message content based on type
		switch message.Type {
		case MessageTypeText:
			if message.Text != nil {
				incomingMsg.TextBody = message.Text.Body
			}
		case MessageTypeImage, MessageTypeDocument, MessageTypeAudio, MessageTypeVideo:
			h.processMediaMessage(message, incomingMsg)
		case MessageTypeLocation:
			if message.Location != nil {
				incomingMsg.LocationLat = &message.Location.Latitude
				incomingMsg.LocationLng = &message.Location.Longitude
				incomingMsg.LocationName = message.Location.Name
				incomingMsg.LocationAddress = message.Location.Address
			}
		}

		// Handle message context (for replies)
		if message.Context != nil {
			incomingMsg.ContextMessageID = message.Context.ID
		}

		// Process contact information
		for _, contact := range value.Contacts {
			if contact.WaID == message.From {
				incomingMsg.ContactName = contact.Profile.Name
				break
			}
		}

		// Queue for processing
		if err := h.service.ProcessIncomingMessage(incomingMsg); err != nil {
			h.logger.Errorw("Failed to process incoming message",
				"error", err,
				"message_id", message.ID,
				"config_id", config.ID,
			)
		}
	}
}

// processMediaMessage extracts media information
func (h *WebhookHandler) processMediaMessage(message Message, incomingMsg *IncomingMessage) {
	var media *MediaBody
	
	switch message.Type {
	case MessageTypeImage:
		media = message.Image
	case MessageTypeDocument:
		media = message.Document
	case MessageTypeAudio:
		media = message.Audio
	case MessageTypeVideo:
		media = message.Video
	}

	if media != nil {
		incomingMsg.MediaID = media.ID
		incomingMsg.MediaMimeType = media.MimeType
		incomingMsg.MediaSHA256 = media.SHA256
		incomingMsg.MediaCaption = media.Caption
		incomingMsg.MediaFilename = media.Filename
	}
}

// processStatuses handles message status updates
func (h *WebhookHandler) processStatuses(value ChangeValue, config *models.WhatsAppConfig) {
	for _, status := range value.Statuses {
		h.logger.Infow("Received message status update",
			"message_id", status.ID,
			"recipient", status.RecipientID,
			"status", status.Status,
			"config_id", config.ID,
		)

		// Update message status in database
		if err := h.service.UpdateMessageStatus(status.ID, string(status.Status), config.TenantID); err != nil {
			h.logger.Errorw("Failed to update message status",
				"error", err,
				"message_id", status.ID,
				"status", status.Status,
			)
		}

		// Handle errors if present
		for _, err := range status.Errors {
			h.logger.Errorw("Message delivery error",
				"message_id", status.ID,
				"error_code", err.Code,
				"error_title", err.Title,
				"error_message", err.Message,
			)
		}
	}
}

// verifySignature verifies the webhook signature using HMAC SHA256
func (h *WebhookHandler) verifySignature(body []byte, signature string, appSecret string) bool {
	// Remove "sha256=" prefix from signature
	signature = strings.TrimPrefix(signature, "sha256=")
	
	// Calculate expected signature
	mac := hmac.New(sha256.New, []byte(appSecret))
	mac.Write(body)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	
	// Compare signatures
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// IncomingMessage represents an incoming WhatsApp message to be processed
type IncomingMessage struct {
	TenantID         uuid.UUID  `json:"tenant_id"`
	ConfigID         uuid.UUID  `json:"config_id"`
	WhatsAppID       string     `json:"whatsapp_id"`
	From             string     `json:"from"`
	Type             string     `json:"type"`
	Timestamp        string     `json:"timestamp"`
	TextBody         string     `json:"text_body,omitempty"`
	MediaID          string     `json:"media_id,omitempty"`
	MediaMimeType    string     `json:"media_mime_type,omitempty"`
	MediaSHA256      string     `json:"media_sha256,omitempty"`
	MediaCaption     string     `json:"media_caption,omitempty"`
	MediaFilename    string     `json:"media_filename,omitempty"`
	LocationLat      *float64   `json:"location_lat,omitempty"`
	LocationLng      *float64   `json:"location_lng,omitempty"`
	LocationName     string     `json:"location_name,omitempty"`
	LocationAddress  string     `json:"location_address,omitempty"`
	ContextMessageID string     `json:"context_message_id,omitempty"`
	ContactName      string     `json:"contact_name,omitempty"`
}