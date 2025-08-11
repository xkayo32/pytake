package websocket

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512KB
)

// Client represents a WebSocket client connection
type Client struct {
	ID       string
	UserID   uuid.UUID
	TenantID uuid.UUID
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	rooms    map[string]bool
	logger   *zap.SugaredLogger
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn *websocket.Conn, userID, tenantID uuid.UUID, logger *zap.SugaredLogger) *Client {
	return &Client{
		ID:       uuid.New().String(),
		UserID:   userID,
		TenantID: tenantID,
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		rooms:    make(map[string]bool),
		logger:   logger,
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.logger.Errorw("WebSocket read error",
					"error", err,
					"client_id", c.ID,
					"user_id", c.UserID,
				)
			}
			break
		}

		// Parse command from client
		var cmd Command
		if err := json.Unmarshal(message, &cmd); err != nil {
			c.logger.Warnw("Invalid command format",
				"error", err,
				"client_id", c.ID,
			)
			c.sendError("INVALID_FORMAT", "Invalid command format")
			continue
		}

		// Handle command
		c.handleCommand(&cmd)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current WebSocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleCommand processes commands from the client
func (c *Client) handleCommand(cmd *Command) {
	switch CommandAction(cmd.Action) {
	case CommandSubscribe:
		c.handleSubscribe(cmd.Data)
	case CommandUnsubscribe:
		c.handleUnsubscribe(cmd.Data)
	case CommandSendTyping:
		c.handleTyping(cmd.Data)
	case CommandMarkRead:
		c.handleMarkRead(cmd.Data)
	case CommandSetPresence:
		c.handleSetPresence(cmd.Data)
	default:
		c.sendError("UNKNOWN_COMMAND", "Unknown command action")
	}
}

// handleSubscribe handles subscription requests
func (c *Client) handleSubscribe(data json.RawMessage) {
	var sub SubscriptionEventData
	if err := json.Unmarshal(data, &sub); err != nil {
		c.sendError("INVALID_DATA", "Invalid subscription data")
		return
	}

	// Subscribe to channel
	room := sub.Channel
	if room == "" {
		// Default to tenant room
		room = "tenant:" + c.TenantID.String()
	}

	c.hub.subscribe <- &Subscription{
		Client: c,
		Room:   room,
	}

	// Send confirmation
	event, _ := NewEvent(EventSubscribed, sub)
	c.sendEvent(event)
}

// handleUnsubscribe handles unsubscription requests
func (c *Client) handleUnsubscribe(data json.RawMessage) {
	var sub SubscriptionEventData
	if err := json.Unmarshal(data, &sub); err != nil {
		c.sendError("INVALID_DATA", "Invalid unsubscription data")
		return
	}

	// Unsubscribe from channel
	room := sub.Channel
	if room == "" {
		room = "tenant:" + c.TenantID.String()
	}

	c.hub.unsubscribe <- &Subscription{
		Client: c,
		Room:   room,
	}

	// Send confirmation
	event, _ := NewEvent(EventUnsubscribed, sub)
	c.sendEvent(event)
}

// handleTyping handles typing indicator
func (c *Client) handleTyping(data json.RawMessage) {
	var typing TypingEventData
	if err := json.Unmarshal(data, &typing); err != nil {
		c.sendError("INVALID_DATA", "Invalid typing data")
		return
	}

	typing.UserID = c.UserID

	// Broadcast typing event to conversation room
	event, _ := NewEvent(EventConversationTyping, typing)
	event.UserID = c.UserID
	event.TenantID = c.TenantID

	room := "conversation:" + typing.ConversationID.String()
	c.hub.broadcast <- &Message{
		Room:  room,
		Data:  event,
		Sender: c,
	}
}

// handleMarkRead handles mark as read requests
func (c *Client) handleMarkRead(data json.RawMessage) {
	var readData struct {
		ConversationID uuid.UUID `json:"conversation_id"`
		MessageID      uuid.UUID `json:"message_id,omitempty"`
	}
	if err := json.Unmarshal(data, &readData); err != nil {
		c.sendError("INVALID_DATA", "Invalid read data")
		return
	}

	// TODO: Update database and broadcast read status
	event, _ := NewEvent(EventMessageRead, readData)
	event.UserID = c.UserID
	event.TenantID = c.TenantID

	room := "conversation:" + readData.ConversationID.String()
	c.hub.broadcast <- &Message{
		Room:  room,
		Data:  event,
		Sender: c,
	}
}

// handleSetPresence handles presence updates
func (c *Client) handleSetPresence(data json.RawMessage) {
	var presence PresenceEventData
	if err := json.Unmarshal(data, &presence); err != nil {
		c.sendError("INVALID_DATA", "Invalid presence data")
		return
	}

	presence.UserID = c.UserID
	now := time.Now()
	presence.LastSeenAt = &now

	// Broadcast presence to tenant room
	eventType := EventPresenceOnline
	if presence.Status == "offline" {
		eventType = EventPresenceOffline
	}

	event, _ := NewEvent(eventType, presence)
	event.UserID = c.UserID
	event.TenantID = c.TenantID

	room := "tenant:" + c.TenantID.String()
	c.hub.broadcast <- &Message{
		Room:  room,
		Data:  event,
		Sender: c,
	}
}

// sendEvent sends an event to the client
func (c *Client) sendEvent(event *Event) {
	data, err := json.Marshal(event)
	if err != nil {
		c.logger.Errorw("Failed to marshal event",
			"error", err,
			"event_type", event.Type,
		)
		return
	}

	select {
	case c.send <- data:
	default:
		// Client's send channel is full, close it
		close(c.send)
	}
}

// sendError sends an error event to the client
func (c *Client) sendError(code, message string) {
	event, _ := NewEvent(EventError, ErrorEventData{
		Code:    code,
		Message: message,
	})
	c.sendEvent(event)
}

// SendMessage sends a message to the client
func (c *Client) SendMessage(message []byte) {
	select {
	case c.send <- message:
	default:
		// Client's send channel is full, close it
		close(c.send)
	}
}