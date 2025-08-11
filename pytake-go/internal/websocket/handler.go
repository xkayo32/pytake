package websocket

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/logger"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: Implement proper origin checking
		// For now, allow all origins in development
		return true
	},
}

// Handler handles WebSocket connections
type Handler struct {
	hub    *Hub
	config *config.Config
	logger *zap.SugaredLogger
}

// NewHandler creates a new WebSocket handler
func NewHandler(hub *Hub, cfg *config.Config, log *logger.Logger) *Handler {
	zapLogger := zap.NewNop().Sugar() // Use a noop logger for now
	return &Handler{
		hub:    hub,
		config: cfg,
		logger: zapLogger,
	}
}

// HandleWebSocket handles WebSocket connection upgrade
func (h *Handler) HandleWebSocket(c *gin.Context) {
	// Get user from context (set by auth middleware)
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	claims := user.(*auth.Claims)

	// Get tenant ID from context or claims
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		// Use default tenant from claims if available
		if claims.TenantID != nil {
			tenantID = *claims.TenantID
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tenant context required"})
			return
		}
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Errorw("Failed to upgrade connection",
			"error", err,
			"user_id", claims.UserID,
		)
		return
	}

	// Create new client
	client := NewClient(
		h.hub,
		conn,
		claims.UserID,
		tenantID.(uuid.UUID),
		h.logger,
	)

	// Register client with hub
	h.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in new goroutines
	go client.WritePump()
	go client.ReadPump()

	h.logger.Infow("WebSocket connection established",
		"client_id", client.ID,
		"user_id", claims.UserID,
		"tenant_id", tenantID,
	)
}

// GetStats returns WebSocket statistics
func (h *Handler) GetStats(c *gin.Context) {
	// Get tenant ID from context (optional)
	var onlineUsers []uuid.UUID
	if tenantID, exists := c.Get("tenant_id"); exists {
		onlineUsers = h.hub.GetOnlineUsers(tenantID.(uuid.UUID))
	}

	stats := gin.H{
		"total_clients": h.hub.GetClientCount(),
		"total_rooms":   h.hub.GetRoomCount(),
		"online_users":  onlineUsers,
	}

	c.JSON(http.StatusOK, stats)
}