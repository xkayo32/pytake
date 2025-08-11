package websocket

import (
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"go.uber.org/zap"
)

// Service provides WebSocket functionality to other services
type Service struct {
	hub    *Hub
	logger *zap.SugaredLogger
}

// NewService creates a new WebSocket service
func NewService(hub *Hub, logger *zap.SugaredLogger) *Service {
	return &Service{
		hub:    hub,
		logger: logger,
	}
}

// NotifyNewMessage broadcasts a new message event
func (s *Service) NotifyNewMessage(message *models.Message, conversation *models.Conversation, contact *models.Contact) {
	// Create message event data
	eventData := MessageEventData{
		MessageID:      message.ID,
		ConversationID: conversation.ID,
		ContactID:      contact.ID,
		Content:        message.Content,
		Type:           message.Type,
		Direction:      string(message.Direction),
		Status:         string(message.Status),
		CreatedAt:      message.CreatedAt,
	}

	// Create event
	event, err := NewEvent(EventMessageNew, eventData)
	if err != nil {
		s.logger.Errorw("Failed to create message event",
			"error", err,
			"message_id", message.ID,
		)
		return
	}

	event.TenantID = message.TenantID

	// Broadcast to conversation room
	s.hub.BroadcastToConversation(conversation.ID, event)

	// Also broadcast to tenant room for dashboard updates
	s.hub.BroadcastToTenant(message.TenantID, event)

	s.logger.Debugw("Broadcasted new message event",
		"message_id", message.ID,
		"conversation_id", conversation.ID,
		"tenant_id", message.TenantID,
	)
}

// NotifyMessageStatus broadcasts a message status update
func (s *Service) NotifyMessageStatus(messageID uuid.UUID, status models.MessageStatus, conversationID, tenantID uuid.UUID) {
	// Create status event data
	eventData := map[string]interface{}{
		"message_id":      messageID,
		"conversation_id": conversationID,
		"status":          string(status),
		"updated_at":      time.Now(),
	}

	// Create event
	event, err := NewEvent(EventMessageStatus, eventData)
	if err != nil {
		s.logger.Errorw("Failed to create status event",
			"error", err,
			"message_id", messageID,
		)
		return
	}

	event.TenantID = tenantID

	// Broadcast to conversation room
	s.hub.BroadcastToConversation(conversationID, event)

	s.logger.Debugw("Broadcasted message status event",
		"message_id", messageID,
		"status", status,
	)
}

// NotifyNewConversation broadcasts a new conversation event
func (s *Service) NotifyNewConversation(conversation *models.Conversation, contact *models.Contact) {
	// Create conversation event data
	eventData := ConversationEventData{
		ConversationID: conversation.ID,
		ContactID:      contact.ID,
		ContactName:    contact.Name,
		LastMessage:    conversation.LastMessagePreview,
		UnreadCount:    conversation.UnreadCount,
		Status:         string(conversation.Status),
		UpdatedAt:      conversation.UpdatedAt,
	}

	// Create event
	event, err := NewEvent(EventConversationNew, eventData)
	if err != nil {
		s.logger.Errorw("Failed to create conversation event",
			"error", err,
			"conversation_id", conversation.ID,
		)
		return
	}

	event.TenantID = conversation.TenantID

	// Broadcast to tenant room
	s.hub.BroadcastToTenant(conversation.TenantID, event)

	// If assigned to a user, notify them specifically
	if conversation.AssignedUserID != nil {
		s.hub.BroadcastToUser(*conversation.AssignedUserID, event)
	}

	s.logger.Debugw("Broadcasted new conversation event",
		"conversation_id", conversation.ID,
		"tenant_id", conversation.TenantID,
	)
}

// NotifyConversationUpdate broadcasts a conversation update event
func (s *Service) NotifyConversationUpdate(conversation *models.Conversation) {
	// Create update event data
	eventData := map[string]interface{}{
		"conversation_id": conversation.ID,
		"status":         string(conversation.Status),
		"unread_count":   conversation.UnreadCount,
		"updated_at":     conversation.UpdatedAt,
	}

	if conversation.AssignedUserID != nil {
		eventData["assigned_user_id"] = *conversation.AssignedUserID
	}

	// Create event
	event, err := NewEvent(EventConversationUpdate, eventData)
	if err != nil {
		s.logger.Errorw("Failed to create conversation update event",
			"error", err,
			"conversation_id", conversation.ID,
		)
		return
	}

	event.TenantID = conversation.TenantID

	// Broadcast to conversation room
	s.hub.BroadcastToConversation(conversation.ID, event)

	// Also broadcast to tenant room
	s.hub.BroadcastToTenant(conversation.TenantID, event)

	s.logger.Debugw("Broadcasted conversation update event",
		"conversation_id", conversation.ID,
	)
}

// NotifyTyping broadcasts a typing indicator
func (s *Service) NotifyTyping(conversationID, tenantID, userID uuid.UUID, isTyping bool) {
	// Create typing event data
	eventData := TypingEventData{
		ConversationID: conversationID,
		UserID:         userID,
		IsTyping:       isTyping,
	}

	// Create event
	event, err := NewEvent(EventConversationTyping, eventData)
	if err != nil {
		s.logger.Errorw("Failed to create typing event",
			"error", err,
			"conversation_id", conversationID,
		)
		return
	}

	event.TenantID = tenantID
	event.UserID = userID

	// Broadcast to conversation room
	s.hub.BroadcastToConversation(conversationID, event)

	s.logger.Debugw("Broadcasted typing event",
		"conversation_id", conversationID,
		"user_id", userID,
		"is_typing", isTyping,
	)
}

// GetOnlineUsers returns online users for a tenant
func (s *Service) GetOnlineUsers(tenantID uuid.UUID) []uuid.UUID {
	return s.hub.GetOnlineUsers(tenantID)
}