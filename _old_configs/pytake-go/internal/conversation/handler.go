package conversation

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/auth"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/logger"
	"github.com/pytake/pytake-go/internal/redis"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Handler handles conversation HTTP requests
type Handler struct {
	service        *Service
	contactService *ContactService
	validator      *validator.Validate
	logger         *zap.SugaredLogger
}

// NewHandler creates a new conversation handler
func NewHandler(db *gorm.DB, rdb *redis.Client, cfg *config.Config, log *logger.Logger) *Handler {
	zapLogger := zap.NewNop().Sugar() // Use a noop logger for now
	service := NewService(db, rdb, zapLogger)
	contactService := NewContactService(db, zapLogger)
	
	return &Handler{
		service:        service,
		contactService: contactService,
		validator:      validator.New(),
		logger:         zapLogger,
	}
}

// CreateConversation creates a new conversation
func (h *Handler) CreateConversation(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	var req CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Create conversation
	conversation, err := h.service.CreateConversation(tenantID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Errorw("Failed to create conversation",
			"error", err,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to create conversation", err)
		return
	}

	h.logger.Infow("Conversation created",
		"conversation_id", conversation.ID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusCreated, h.buildConversationResponse(conversation))
}

// GetConversation gets a conversation
func (h *Handler) GetConversation(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse conversation ID
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid conversation ID", err)
		return
	}

	// Get conversation
	conversation, err := h.service.GetConversation(conversationID, tenantID.(uuid.UUID))
	if err != nil {
		h.errorResponse(c, http.StatusNotFound, "Conversation not found", err)
		return
	}

	c.JSON(http.StatusOK, h.buildConversationResponse(conversation))
}

// GetConversations lists conversations
func (h *Handler) GetConversations(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse query parameters
	filter := &models.ConversationFilter{
		TenantID: tenantID.(uuid.UUID),
	}

	// Status filter
	if status := c.Query("status"); status != "" {
		s := models.ConversationStatus(status)
		filter.Status = &s
	}

	// Channel filter
	if channel := c.Query("channel"); channel != "" {
		ch := models.ConversationChannel(channel)
		filter.Channel = &ch
	}

	// Assigned user filter
	if assignedUserID := c.Query("assigned_user_id"); assignedUserID != "" {
		if id, err := uuid.Parse(assignedUserID); err == nil {
			filter.AssignedUserID = &id
		}
	}

	// Unread only filter
	if unreadOnly := c.Query("unread_only"); unreadOnly == "true" {
		filter.UnreadOnly = true
	}

	// Search term
	filter.SearchTerm = c.Query("search")

	// Tags filter
	if tags := c.QueryArray("tags"); len(tags) > 0 {
		filter.Tags = tags
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	filter.Limit = pageSize
	filter.Offset = (page - 1) * pageSize

	// Ordering
	filter.OrderBy = c.DefaultQuery("order_by", "last_message_at")
	filter.OrderDesc = c.Query("order") != "asc"

	// Get conversations
	conversations, total, err := h.service.GetConversations(filter)
	if err != nil {
		h.logger.Errorw("Failed to get conversations",
			"error", err,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to get conversations", err)
		return
	}

	// Build response
	response := ConversationListResponse{
		Conversations: make([]ConversationResponse, 0, len(conversations)),
		Total:        total,
		Page:         page,
		PageSize:     pageSize,
	}

	for _, conv := range conversations {
		response.Conversations = append(response.Conversations, *h.buildConversationResponse(&conv))
	}

	c.JSON(http.StatusOK, response)
}

// UpdateConversation updates a conversation
func (h *Handler) UpdateConversation(c *gin.Context) {
	// Get tenant ID and user from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	user, _ := c.Get("user")
	claims := user.(*auth.Claims)

	// Parse conversation ID
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid conversation ID", err)
		return
	}

	var req UpdateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Set closed by ID if closing
	if req.Status != nil && *req.Status == models.ConversationStatusClosed {
		req.ClosedByID = &claims.UserID
	}

	// Update conversation
	conversation, err := h.service.UpdateConversation(conversationID, tenantID.(uuid.UUID), &req)
	if err != nil {
		h.logger.Errorw("Failed to update conversation",
			"error", err,
			"conversation_id", conversationID,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to update conversation", err)
		return
	}

	h.logger.Infow("Conversation updated",
		"conversation_id", conversationID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusOK, h.buildConversationResponse(conversation))
}

// DeleteConversation deletes a conversation
func (h *Handler) DeleteConversation(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse conversation ID
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid conversation ID", err)
		return
	}

	// Delete conversation
	if err := h.service.DeleteConversation(conversationID, tenantID.(uuid.UUID)); err != nil {
		h.logger.Errorw("Failed to delete conversation",
			"error", err,
			"conversation_id", conversationID,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to delete conversation", err)
		return
	}

	h.logger.Infow("Conversation deleted",
		"conversation_id", conversationID,
		"tenant_id", tenantID,
	)

	c.JSON(http.StatusOK, gin.H{"message": "Conversation deleted successfully"})
}

// AddConversationTag adds a tag to a conversation
func (h *Handler) AddConversationTag(c *gin.Context) {
	// Get tenant ID and user from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	user, _ := c.Get("user")
	claims := user.(*auth.Claims)

	// Parse conversation ID
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid conversation ID", err)
		return
	}

	var req AddTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid request format", err)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		h.validationErrorResponse(c, err)
		return
	}

	// Add tag
	if err := h.service.AddTag(conversationID, tenantID.(uuid.UUID), req.Tag, claims.UserID); err != nil {
		h.logger.Errorw("Failed to add tag",
			"error", err,
			"conversation_id", conversationID,
			"tag", req.Tag,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to add tag", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag added successfully"})
}

// RemoveConversationTag removes a tag from a conversation
func (h *Handler) RemoveConversationTag(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse conversation ID
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid conversation ID", err)
		return
	}

	tag := c.Param("tag")
	if tag == "" {
		h.errorResponse(c, http.StatusBadRequest, "Tag is required", nil)
		return
	}

	// Remove tag
	if err := h.service.RemoveTag(conversationID, tenantID.(uuid.UUID), tag); err != nil {
		h.logger.Errorw("Failed to remove tag",
			"error", err,
			"conversation_id", conversationID,
			"tag", tag,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to remove tag", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag removed successfully"})
}

// MarkAsRead marks a conversation as read
func (h *Handler) MarkAsRead(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Parse conversation ID
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, "Invalid conversation ID", err)
		return
	}

	// Mark as read
	if err := h.service.MarkAsRead(conversationID, tenantID.(uuid.UUID)); err != nil {
		h.logger.Errorw("Failed to mark as read",
			"error", err,
			"conversation_id", conversationID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to mark as read", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

// GetConversationStats gets conversation statistics
func (h *Handler) GetConversationStats(c *gin.Context) {
	// Get tenant ID from context
	tenantID, exists := c.Get("tenant_id")
	if !exists {
		h.errorResponse(c, http.StatusBadRequest, "Tenant context required", nil)
		return
	}

	// Get stats
	stats, err := h.service.GetConversationStats(tenantID.(uuid.UUID))
	if err != nil {
		h.logger.Errorw("Failed to get conversation stats",
			"error", err,
			"tenant_id", tenantID,
		)
		h.errorResponse(c, http.StatusInternalServerError, "Failed to get statistics", err)
		return
	}

	c.JSON(http.StatusOK, stats)
}

// buildConversationResponse builds a conversation response DTO
func (h *Handler) buildConversationResponse(conversation *models.Conversation) *ConversationResponse {
	response := &ConversationResponse{
		ID:                 conversation.ID,
		ContactID:          conversation.ContactID,
		WhatsAppConfigID:   conversation.WhatsAppConfigID,
		AssignedUserID:     conversation.AssignedUserID,
		Status:             conversation.Status,
		Channel:            conversation.Channel,
		UnreadCount:        conversation.UnreadCount,
		LastMessageAt:      conversation.LastMessageAt,
		LastMessagePreview: conversation.LastMessagePreview,
		LastMessageType:    conversation.LastMessageType,
		LastMessageFrom:    conversation.LastMessageFrom,
		Metadata:           conversation.Metadata,
		Notes:              conversation.Notes,
		SatisfactionRating: conversation.SatisfactionRating,
		CreatedAt:          conversation.CreatedAt,
		UpdatedAt:          conversation.UpdatedAt,
		Tags:               make([]string, 0),
	}

	// Add contact if loaded
	if conversation.Contact != nil {
		response.Contact = h.buildContactResponse(conversation.Contact)
	}

	// Add assigned user if loaded
	if conversation.AssignedUser != nil {
		response.AssignedUser = &UserResponse{
			ID:    conversation.AssignedUser.ID,
			Name:  conversation.AssignedUser.Name,
			Email: conversation.AssignedUser.Email,
		}
	}

	// Add tags
	for _, tag := range conversation.Tags {
		response.Tags = append(response.Tags, tag.Tag)
	}

	return response
}

// buildContactResponse builds a contact response DTO
func (h *Handler) buildContactResponse(contact *models.Contact) *ContactResponse {
	response := &ContactResponse{
		ID:                contact.ID,
		Name:              contact.Name,
		Phone:             contact.Phone,
		WhatsAppPhone:     contact.WhatsAppPhone,
		Email:             contact.Email,
		ProfilePictureURL: contact.ProfilePictureURL,
		Status:            contact.Status,
		CompanyName:       contact.CompanyName,
		CustomFields:      contact.CustomFields,
		LastContactAt:     contact.LastContactAt,
		CreatedAt:         contact.CreatedAt,
		Tags:              make([]string, 0),
	}

	// Add tags
	for _, tag := range contact.Tags {
		response.Tags = append(response.Tags, tag.Tag)
	}

	return response
}

// errorResponse sends error response
func (h *Handler) errorResponse(c *gin.Context, statusCode int, message string, err error) {
	response := gin.H{
		"error": message,
	}

	if err != nil && h.logger != nil {
		response["details"] = err.Error()
	}

	c.JSON(statusCode, response)
}

// validationErrorResponse handles validation errors
func (h *Handler) validationErrorResponse(c *gin.Context, err error) {
	details := make(map[string]interface{})

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			field := fieldError.Field()
			switch fieldError.Tag() {
			case "required":
				details[field] = "This field is required"
			case "email":
				details[field] = "Invalid email format"
			case "oneof":
				details[field] = "Invalid value"
			case "min":
				details[field] = "Value is too small"
			case "max":
				details[field] = "Value is too large"
			case "hexcolor":
				details[field] = "Invalid hex color format"
			default:
				details[field] = "Invalid value"
			}
		}
	}

	response := gin.H{
		"error":   "Validation failed",
		"details": details,
	}

	c.JSON(http.StatusBadRequest, response)
}