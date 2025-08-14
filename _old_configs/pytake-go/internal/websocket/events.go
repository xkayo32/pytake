package websocket

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// EventType represents the type of WebSocket event
type EventType string

const (
	// Message events
	EventMessageNew      EventType = "message.new"
	EventMessageStatus   EventType = "message.status"
	EventMessageRead     EventType = "message.read"
	
	// Conversation events
	EventConversationNew     EventType = "conversation.new"
	EventConversationUpdate  EventType = "conversation.update"
	EventConversationTyping  EventType = "conversation.typing"
	
	// Presence events
	EventPresenceOnline  EventType = "presence.online"
	EventPresenceOffline EventType = "presence.offline"
	
	// System events
	EventPing           EventType = "ping"
	EventPong           EventType = "pong"
	EventError          EventType = "error"
	EventAuthenticated  EventType = "authenticated"
	EventSubscribed     EventType = "subscribed"
	EventUnsubscribed   EventType = "unsubscribed"
)

// Event represents a WebSocket event
type Event struct {
	ID        string          `json:"id"`
	Type      EventType       `json:"type"`
	TenantID  uuid.UUID       `json:"tenant_id,omitempty"`
	UserID    uuid.UUID       `json:"user_id,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
	Data      json.RawMessage `json:"data,omitempty"`
}

// NewEvent creates a new event
func NewEvent(eventType EventType, data interface{}) (*Event, error) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &Event{
		ID:        uuid.New().String(),
		Type:      eventType,
		Timestamp: time.Now(),
		Data:      dataBytes,
	}, nil
}

// MessageEventData represents data for message events
type MessageEventData struct {
	MessageID      uuid.UUID `json:"message_id"`
	ConversationID uuid.UUID `json:"conversation_id"`
	ContactID      uuid.UUID `json:"contact_id"`
	Content        string    `json:"content"`
	Type           string    `json:"type"`
	Direction      string    `json:"direction"`
	Status         string    `json:"status,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// ConversationEventData represents data for conversation events
type ConversationEventData struct {
	ConversationID uuid.UUID `json:"conversation_id"`
	ContactID      uuid.UUID `json:"contact_id"`
	ContactName    string    `json:"contact_name"`
	LastMessage    string    `json:"last_message,omitempty"`
	UnreadCount    int       `json:"unread_count"`
	Status         string    `json:"status"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// TypingEventData represents typing indicator data
type TypingEventData struct {
	ConversationID uuid.UUID `json:"conversation_id"`
	UserID         uuid.UUID `json:"user_id,omitempty"`
	ContactID      uuid.UUID `json:"contact_id,omitempty"`
	IsTyping       bool      `json:"is_typing"`
}

// PresenceEventData represents user presence data
type PresenceEventData struct {
	UserID       uuid.UUID  `json:"user_id"`
	Status       string     `json:"status"` // online, offline, away
	LastSeenAt   *time.Time `json:"last_seen_at,omitempty"`
}

// ErrorEventData represents error event data
type ErrorEventData struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// SubscriptionEventData represents subscription event data
type SubscriptionEventData struct {
	Channel string   `json:"channel"` // conversation:{id}, tenant:{id}
	Topics  []string `json:"topics,omitempty"`
}

// Command represents a client command
type Command struct {
	Action string          `json:"action"`
	Data   json.RawMessage `json:"data,omitempty"`
}

// CommandAction represents available command actions
type CommandAction string

const (
	CommandSubscribe      CommandAction = "subscribe"
	CommandUnsubscribe    CommandAction = "unsubscribe"
	CommandSendTyping     CommandAction = "send_typing"
	CommandMarkRead       CommandAction = "mark_read"
	CommandSetPresence    CommandAction = "set_presence"
)