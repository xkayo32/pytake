package websocket

import (
	"encoding/json"
	"sync"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// Hub maintains the set of active clients and broadcasts messages to clients
type Hub struct {
	// Registered clients by ID
	clients map[string]*Client

	// Clients organized by room
	rooms map[string]map[*Client]bool

	// Clients organized by user ID
	users map[uuid.UUID][]*Client

	// Inbound messages from clients
	broadcast chan *Message

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Subscribe to room
	subscribe chan *Subscription

	// Unsubscribe from room
	unsubscribe chan *Subscription

	// Mutex for concurrent access
	mu sync.RWMutex

	// Logger
	logger *zap.SugaredLogger
}

// Message represents a message to broadcast
type Message struct {
	Room   string      `json:"room"`
	Data   interface{} `json:"data"`
	Sender *Client     `json:"-"`
}

// Subscription represents a room subscription
type Subscription struct {
	Client *Client
	Room   string
}

// NewHub creates a new Hub
func NewHub(logger *zap.SugaredLogger) *Hub {
	return &Hub{
		clients:     make(map[string]*Client),
		rooms:       make(map[string]map[*Client]bool),
		users:       make(map[uuid.UUID][]*Client),
		broadcast:   make(chan *Message),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		subscribe:   make(chan *Subscription),
		unsubscribe: make(chan *Subscription),
		logger:      logger,
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case sub := <-h.subscribe:
			h.subscribeToRoom(sub)

		case sub := <-h.unsubscribe:
			h.unsubscribeFromRoom(sub)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// registerClient registers a new client
func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Add to clients map
	h.clients[client.ID] = client

	// Add to users map
	if h.users[client.UserID] == nil {
		h.users[client.UserID] = make([]*Client, 0)
	}
	h.users[client.UserID] = append(h.users[client.UserID], client)

	// Auto-subscribe to tenant room
	tenantRoom := "tenant:" + client.TenantID.String()
	h.addClientToRoom(client, tenantRoom)

	// Auto-subscribe to user's personal room
	userRoom := "user:" + client.UserID.String()
	h.addClientToRoom(client, userRoom)

	h.logger.Infow("Client registered",
		"client_id", client.ID,
		"user_id", client.UserID,
		"tenant_id", client.TenantID,
	)

	// Send authenticated event
	event, _ := NewEvent(EventAuthenticated, map[string]interface{}{
		"client_id": client.ID,
		"user_id":   client.UserID,
		"tenant_id": client.TenantID,
	})
	client.sendEvent(event)

	// Broadcast presence online
	h.broadcastPresence(client, true)
}

// unregisterClient unregisters a client
func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client.ID]; ok {
		// Remove from all rooms
		for room := range client.rooms {
			h.removeClientFromRoom(client, room)
		}

		// Remove from users map
		if users, ok := h.users[client.UserID]; ok {
			for i, c := range users {
				if c.ID == client.ID {
					h.users[client.UserID] = append(users[:i], users[i+1:]...)
					break
				}
			}
			if len(h.users[client.UserID]) == 0 {
				delete(h.users, client.UserID)
			}
		}

		// Remove from clients map
		delete(h.clients, client.ID)

		// Close send channel
		close(client.send)

		h.logger.Infow("Client unregistered",
			"client_id", client.ID,
			"user_id", client.UserID,
		)

		// Broadcast presence offline if no more connections for this user
		if len(h.users[client.UserID]) == 0 {
			h.broadcastPresence(client, false)
		}
	}
}

// subscribeToRoom subscribes a client to a room
func (h *Hub) subscribeToRoom(sub *Subscription) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Check if client has permission to join room
	if !h.canJoinRoom(sub.Client, sub.Room) {
		sub.Client.sendError("FORBIDDEN", "Cannot join this room")
		return
	}

	h.addClientToRoom(sub.Client, sub.Room)

	h.logger.Debugw("Client subscribed to room",
		"client_id", sub.Client.ID,
		"room", sub.Room,
	)
}

// unsubscribeFromRoom unsubscribes a client from a room
func (h *Hub) unsubscribeFromRoom(sub *Subscription) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.removeClientFromRoom(sub.Client, sub.Room)

	h.logger.Debugw("Client unsubscribed from room",
		"client_id", sub.Client.ID,
		"room", sub.Room,
	)
}

// broadcastMessage broadcasts a message to a room
func (h *Hub) broadcastMessage(message *Message) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	// Marshal message data
	data, err := json.Marshal(message.Data)
	if err != nil {
		h.logger.Errorw("Failed to marshal message",
			"error", err,
			"room", message.Room,
		)
		return
	}

	// Send to all clients in the room
	if clients, ok := h.rooms[message.Room]; ok {
		for client := range clients {
			// Don't send back to sender (optional)
			if message.Sender != nil && client.ID == message.Sender.ID {
				continue
			}

			select {
			case client.send <- data:
			default:
				// Client's send channel is full, close it
				go func(c *Client) {
					h.unregister <- c
				}(client)
			}
		}
	}
}

// BroadcastToTenant broadcasts a message to all clients in a tenant
func (h *Hub) BroadcastToTenant(tenantID uuid.UUID, event *Event) {
	room := "tenant:" + tenantID.String()
	h.broadcast <- &Message{
		Room: room,
		Data: event,
	}
}

// BroadcastToUser broadcasts a message to all connections of a user
func (h *Hub) BroadcastToUser(userID uuid.UUID, event *Event) {
	room := "user:" + userID.String()
	h.broadcast <- &Message{
		Room: room,
		Data: event,
	}
}

// BroadcastToConversation broadcasts a message to all clients watching a conversation
func (h *Hub) BroadcastToConversation(conversationID uuid.UUID, event *Event) {
	room := "conversation:" + conversationID.String()
	h.broadcast <- &Message{
		Room: room,
		Data: event,
	}
}

// addClientToRoom adds a client to a room
func (h *Hub) addClientToRoom(client *Client, room string) {
	if h.rooms[room] == nil {
		h.rooms[room] = make(map[*Client]bool)
	}
	h.rooms[room][client] = true
	client.rooms[room] = true
}

// removeClientFromRoom removes a client from a room
func (h *Hub) removeClientFromRoom(client *Client, room string) {
	if clients, ok := h.rooms[room]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.rooms, room)
		}
	}
	delete(client.rooms, room)
}

// canJoinRoom checks if a client can join a room
func (h *Hub) canJoinRoom(client *Client, room string) bool {
	// Parse room type and ID
	// Format: "type:id" (e.g., "tenant:uuid", "conversation:uuid")
	
	// For now, allow joining any room within the same tenant
	// TODO: Add more granular permission checks
	
	return true
}

// broadcastPresence broadcasts user presence status
func (h *Hub) broadcastPresence(client *Client, online bool) {
	status := "offline"
	eventType := EventPresenceOffline
	if online {
		status = "online"
		eventType = EventPresenceOnline
	}

	event, _ := NewEvent(eventType, PresenceEventData{
		UserID: client.UserID,
		Status: status,
	})
	event.UserID = client.UserID
	event.TenantID = client.TenantID

	// Broadcast to tenant
	h.BroadcastToTenant(client.TenantID, event)
}

// GetOnlineUsers returns a list of online users for a tenant
func (h *Hub) GetOnlineUsers(tenantID uuid.UUID) []uuid.UUID {
	h.mu.RLock()
	defer h.mu.RUnlock()

	userMap := make(map[uuid.UUID]bool)
	tenantRoom := "tenant:" + tenantID.String()

	if clients, ok := h.rooms[tenantRoom]; ok {
		for client := range clients {
			userMap[client.UserID] = true
		}
	}

	users := make([]uuid.UUID, 0, len(userMap))
	for userID := range userMap {
		users = append(users, userID)
	}

	return users
}

// GetClientCount returns the number of connected clients
func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// GetRoomCount returns the number of active rooms
func (h *Hub) GetRoomCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.rooms)
}