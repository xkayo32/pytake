package ai

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/ai/context"
	"github.com/pytake/pytake-go/internal/ai/providers/openai"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/logger"
	"gorm.io/gorm"
)

// Handler handles AI-related HTTP requests
type Handler struct {
	db             *gorm.DB
	contextManager *context.ManagerImpl
	openaiClient   *openai.ClientImpl
	log            *logger.Logger
}

// NewHandler creates a new AI handler
func NewHandler(
	db *gorm.DB,
	contextManager *context.ManagerImpl,
	openaiClient *openai.ClientImpl,
	log *logger.Logger,
) *Handler {
	return &Handler{
		db:             db,
		contextManager: contextManager,
		openaiClient:   openaiClient,
		log:            log,
	}
}

// ChatRequest represents a chat completion request
type ChatRequest struct {
	ConversationID uuid.UUID              `json:"conversation_id" binding:"required"`
	Message        string                 `json:"message" binding:"required"`
	Model          string                 `json:"model,omitempty"`
	Temperature    float32                `json:"temperature,omitempty"`
	MaxTokens      int                    `json:"max_tokens,omitempty"`
	PersonaID      *uuid.UUID             `json:"persona_id,omitempty"`
	Context        map[string]interface{} `json:"context,omitempty"`
	Stream         bool                   `json:"stream,omitempty"`
}

// ChatResponse represents a chat completion response
type ChatResponse struct {
	Message       string                 `json:"message"`
	TokensUsed    int                    `json:"tokens_used"`
	Cost          float64                `json:"cost"`
	ConversationID uuid.UUID             `json:"conversation_id"`
	MessageID     uuid.UUID              `json:"message_id"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

// Chat handles AI chat completion requests
// @Summary AI Chat Completion
// @Description Generate AI response for a conversation
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body ChatRequest true "Chat request"
// @Success 200 {object} ChatResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/chat [post]
func (h *Handler) Chat(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Get or create AI context
	aiContext, err := h.contextManager.GetOrCreateContext(c.Request.Context(), tid, req.ConversationID, nil)
	if err != nil {
		h.log.Error("Failed to get AI context", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize AI context"})
		return
	}

	// Add user message to context
	err = h.contextManager.AddMessage(c.Request.Context(), aiContext.ID, "user", req.Message, nil)
	if err != nil {
		h.log.Error("Failed to add user message", "error", err)
	}

	// Prepare chat request
	model := req.Model
	if model == "" {
		model = "gpt-3.5-turbo"
	}

	temperature := req.Temperature
	if temperature == 0 {
		temperature = 0.7
	}

	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = 500
	}

	// Get conversation messages for context
	messages, err := h.contextManager.GetContextWindow(c.Request.Context(), aiContext.ID, 10)
	if err != nil {
		h.log.Error("Failed to get context window", "error", err)
	}

	// Add system prompt if persona is specified
	if req.PersonaID != nil {
		var persona models.AIPersona
		if err := h.db.First(&persona, "id = ? AND tenant_id = ?", req.PersonaID, tid).Error; err == nil {
			messages = append([]openai.Message{{
				Role:    "system",
				Content: persona.Personality,
			}}, messages...)
		}
	}

	// Add current user message
	messages = append(messages, openai.Message{
		Role:    "user",
		Content: req.Message,
	})

	// Create completion request
	completionReq := &openai.CompletionRequest{
		Model:       model,
		Messages:    messages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Stream:      req.Stream,
	}

	// Handle streaming response
	if req.Stream {
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")

		stream, err := h.openaiClient.CreateCompletionStream(c.Request.Context(), completionReq)
		if err != nil {
			h.log.Error("Failed to create completion stream", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate response"})
			return
		}

		var fullResponse string
		for chunk := range stream {
			if chunk.Error != nil {
				h.log.Error("Stream error", "error", chunk.Error)
				break
			}
			fullResponse += chunk.Content
			c.SSEvent("message", chunk.Content)
			c.Writer.Flush()
		}

		// Save assistant message
		h.contextManager.AddMessage(c.Request.Context(), aiContext.ID, "assistant", fullResponse, nil)
		return
	}

	// Non-streaming response
	response, err := h.openaiClient.CreateCompletion(c.Request.Context(), completionReq)
	if err != nil {
		h.log.Error("Failed to create completion", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate response"})
		return
	}

	// Save assistant message
	messageID := uuid.New()
	err = h.contextManager.AddMessage(c.Request.Context(), aiContext.ID, "assistant", response.Content, map[string]interface{}{
		"tokens_used": response.TokensUsed,
		"model":       model,
	})
	if err != nil {
		h.log.Error("Failed to save assistant message", "error", err)
	}

	// Save interaction log
	interaction := &models.AIInteraction{
		ConversationID:   req.ConversationID,
		ContextID:        aiContext.ID,
		RequestType:      "chat",
		Model:            model,
		Provider:         "openai",
		ResponseText:     response.Content,
		PromptTokens:     response.PromptTokens,
		CompletionTokens: response.CompletionTokens,
		TotalTokens:      response.TokensUsed,
		EstimatedCost:    h.estimateCost(model, response.TokensUsed),
		Status:           "success",
	}
	interaction.TenantID = tid
	h.db.Create(interaction)

	c.JSON(http.StatusOK, ChatResponse{
		Message:        response.Content,
		TokensUsed:     response.TokensUsed,
		Cost:           interaction.EstimatedCost,
		ConversationID: req.ConversationID,
		MessageID:      messageID,
	})
}

// GetContexts retrieves AI contexts
// @Summary List AI contexts
// @Description Get list of AI conversation contexts
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param conversation_id query string false "Filter by conversation ID" format(uuid)
// @Param is_active query bool false "Filter by active status"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {array} models.AIContext
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/contexts [get]
func (h *Handler) GetContexts(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse query parameters
	conversationID := c.Query("conversation_id")
	isActive := c.Query("is_active")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Build query
	query := h.db.Model(&models.AIContext{}).Where("tenant_id = ?", tid)

	if conversationID != "" {
		if cid, err := uuid.Parse(conversationID); err == nil {
			query = query.Where("conversation_id = ?", cid)
		}
	}

	if isActive != "" {
		if isActive == "true" {
			query = query.Where("is_active = ?", true)
		} else if isActive == "false" {
			query = query.Where("is_active = ?", false)
		}
	}

	// Count total
	var total int64
	query.Count(&total)

	// Fetch contexts
	var contexts []models.AIContext
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("last_activity DESC").Find(&contexts).Error; err != nil {
		h.log.Error("Failed to fetch contexts", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch contexts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"contexts": contexts,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"has_more": total > int64(page*limit),
	})
}

// GetContext retrieves a specific AI context
// @Summary Get AI context
// @Description Get AI context details with messages
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Context ID" format(uuid)
// @Param include_messages query bool false "Include messages" default(true)
// @Success 200 {object} models.AIContext
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/contexts/{id} [get]
func (h *Handler) GetContext(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	contextID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(contextID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid context ID"})
		return
	}

	includeMessages := c.DefaultQuery("include_messages", "true") == "true"

	var aiContext models.AIContext
	query := h.db.Where("id = ? AND tenant_id = ?", cid, tid)

	if includeMessages {
		query = query.Preload("Messages")
	}

	if err := query.First(&aiContext).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Context not found"})
			return
		}
		h.log.Error("Failed to fetch context", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch context"})
		return
	}

	c.JSON(http.StatusOK, aiContext)
}

// ClearContext clears an AI context
// @Summary Clear AI context
// @Description Clear messages and reset AI context
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Context ID" format(uuid)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/contexts/{id}/clear [post]
func (h *Handler) ClearContext(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	contextID := c.Param("id")

	tid, _ := uuid.Parse(tenantID)
	cid, err := uuid.Parse(contextID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid context ID"})
		return
	}

	// Verify context ownership
	var aiContext models.AIContext
	if err := h.db.Where("id = ? AND tenant_id = ?", cid, tid).First(&aiContext).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Context not found"})
			return
		}
		h.log.Error("Failed to fetch context", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch context"})
		return
	}

	// Clear messages
	if err := h.db.Where("ai_context_id = ?", cid).Delete(&models.AIMessage{}).Error; err != nil {
		h.log.Error("Failed to clear messages", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear context"})
		return
	}

	// Update context
	updates := map[string]interface{}{
		"summary":       "",
		"topics":        "[]",
		"last_activity": time.Now(),
	}
	h.db.Model(&aiContext).Updates(updates)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Context cleared successfully",
	})
}

// GetPersonas retrieves AI personas
// @Summary List AI personas
// @Description Get list of AI personas
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param is_active query bool false "Filter by active status"
// @Param is_default query bool false "Filter by default status"
// @Success 200 {array} models.AIPersona
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/personas [get]
func (h *Handler) GetPersonas(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse query parameters
	isActive := c.Query("is_active")
	isDefault := c.Query("is_default")

	// Build query
	query := h.db.Model(&models.AIPersona{}).Where("tenant_id = ?", tid)

	if isActive != "" {
		if isActive == "true" {
			query = query.Where("is_active = ?", true)
		} else if isActive == "false" {
			query = query.Where("is_active = ?", false)
		}
	}

	if isDefault != "" {
		if isDefault == "true" {
			query = query.Where("is_default = ?", true)
		} else if isDefault == "false" {
			query = query.Where("is_default = ?", false)
		}
	}

	// Fetch personas
	var personas []models.AIPersona
	if err := query.Order("name ASC").Find(&personas).Error; err != nil {
		h.log.Error("Failed to fetch personas", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch personas"})
		return
	}

	c.JSON(http.StatusOK, personas)
}

// CreatePersona creates a new AI persona
// @Summary Create AI persona
// @Description Create a new AI personality
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param persona body CreatePersonaRequest true "Persona data"
// @Success 201 {object} models.AIPersona
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/personas [post]
func (h *Handler) CreatePersona(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	userID := c.GetString("user_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)
	uid, _ := uuid.Parse(userID)

	type CreatePersonaRequest struct {
		Name         string   `json:"name" binding:"required"`
		Description  string   `json:"description"`
		Personality  string   `json:"personality" binding:"required"`
		Tone         string   `json:"tone"`
		Style        string   `json:"style"`
		Instructions []string `json:"instructions"`
		Constraints  []string `json:"constraints"`
		Capabilities []string `json:"capabilities"`
		Language     string   `json:"language"`
		IsDefault    bool     `json:"is_default"`
	}

	var req CreatePersonaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create persona
	persona := &models.AIPersona{
		Name:         req.Name,
		Description:  req.Description,
		Personality:  req.Personality,
		Tone:         req.Tone,
		Style:        req.Style,
		Instructions: req.Instructions,
		Constraints:  req.Constraints,
		Capabilities: req.Capabilities,
		Language:     req.Language,
		IsActive:     true,
		IsDefault:    req.IsDefault,
		CreatedByID:  uid,
	}
	persona.TenantID = tid

	// If setting as default, unset other defaults
	if req.IsDefault {
		h.db.Model(&models.AIPersona{}).
			Where("tenant_id = ? AND is_default = ?", tid, true).
			Update("is_default", false)
	}

	if err := h.db.Create(persona).Error; err != nil {
		h.log.Error("Failed to create persona", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create persona"})
		return
	}

	c.JSON(http.StatusCreated, persona)
}

// GetTemplates retrieves AI prompt templates
// @Summary List AI templates
// @Description Get list of AI prompt templates
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param category query string false "Filter by category"
// @Param persona_id query string false "Filter by persona ID" format(uuid)
// @Param is_active query bool false "Filter by active status"
// @Success 200 {array} models.AIPromptTemplate
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/templates [get]
func (h *Handler) GetTemplates(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse query parameters
	category := c.Query("category")
	personaID := c.Query("persona_id")
	isActive := c.Query("is_active")

	// Build query
	query := h.db.Model(&models.AIPromptTemplate{}).
		Where("tenant_id = ?", tid).
		Preload("Persona")

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if personaID != "" {
		if pid, err := uuid.Parse(personaID); err == nil {
			query = query.Where("persona_id = ?", pid)
		}
	}

	if isActive != "" {
		if isActive == "true" {
			query = query.Where("is_active = ?", true)
		} else if isActive == "false" {
			query = query.Where("is_active = ?", false)
		}
	}

	// Fetch templates
	var templates []models.AIPromptTemplate
	if err := query.Order("category ASC, name ASC").Find(&templates).Error; err != nil {
		h.log.Error("Failed to fetch templates", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch templates"})
		return
	}

	c.JSON(http.StatusOK, templates)
}

// GetInteractions retrieves AI interaction logs
// @Summary List AI interactions
// @Description Get AI interaction history
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param conversation_id query string false "Filter by conversation ID" format(uuid)
// @Param status query string false "Filter by status" Enums(pending,success,failed)
// @Param from_date query string false "Start date" format(date-time)
// @Param to_date query string false "End date" format(date-time)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {array} models.AIInteraction
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/interactions [get]
func (h *Handler) GetInteractions(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse query parameters
	conversationID := c.Query("conversation_id")
	status := c.Query("status")
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Build query
	query := h.db.Model(&models.AIInteraction{}).
		Where("tenant_id = ?", tid).
		Preload("Context").
		Preload("Conversation")

	if conversationID != "" {
		if cid, err := uuid.Parse(conversationID); err == nil {
			query = query.Where("conversation_id = ?", cid)
		}
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if fromDate != "" {
		if t, err := time.Parse(time.RFC3339, fromDate); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}

	if toDate != "" {
		if t, err := time.Parse(time.RFC3339, toDate); err == nil {
			query = query.Where("created_at <= ?", t)
		}
	}

	// Count total
	var total int64
	query.Count(&total)

	// Fetch interactions
	var interactions []models.AIInteraction
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&interactions).Error; err != nil {
		h.log.Error("Failed to fetch interactions", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch interactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"interactions": interactions,
		"total":        total,
		"page":         page,
		"limit":        limit,
		"has_more":     total > int64(page*limit),
	})
}

// GetUsageStats retrieves AI usage statistics
// @Summary Get AI usage stats
// @Description Get AI usage statistics and costs
// @Tags AI
// @Accept json
// @Produce json
// @Security Bearer
// @Param from_date query string false "Start date" format(date)
// @Param to_date query string false "End date" format(date)
// @Param group_by query string false "Group by" Enums(day,week,month)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /ai/stats [get]
func (h *Handler) GetUsageStats(c *gin.Context) {
	tenantID := c.GetString("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id required"})
		return
	}

	tid, _ := uuid.Parse(tenantID)

	// Parse date range
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")
	groupBy := c.DefaultQuery("group_by", "day")

	query := h.db.Model(&models.AIInteraction{}).
		Where("tenant_id = ? AND status = ?", tid, "success")

	if fromDate != "" {
		if t, err := time.Parse("2006-01-02", fromDate); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}

	if toDate != "" {
		if t, err := time.Parse("2006-01-02", toDate); err == nil {
			query = query.Where("created_at <= ?", t.Add(24*time.Hour))
		}
	}

	// Get aggregate stats
	type Stats struct {
		TotalInteractions int64   `json:"total_interactions"`
		TotalTokens       int64   `json:"total_tokens"`
		TotalCost         float64 `json:"total_cost"`
		AvgTokens         float64 `json:"avg_tokens"`
		AvgCost           float64 `json:"avg_cost"`
	}

	var stats Stats
	query.Select(
		"COUNT(*) as total_interactions",
		"SUM(total_tokens) as total_tokens",
		"SUM(estimated_cost) as total_cost",
		"AVG(total_tokens) as avg_tokens",
		"AVG(estimated_cost) as avg_cost",
	).Scan(&stats)

	// Get usage by model
	var modelUsage []struct {
		Model       string  `json:"model"`
		Count       int64   `json:"count"`
		TotalTokens int64   `json:"total_tokens"`
		TotalCost   float64 `json:"total_cost"`
	}

	h.db.Model(&models.AIInteraction{}).
		Where("tenant_id = ? AND status = ?", tid, "success").
		Select("model, COUNT(*) as count, SUM(total_tokens) as total_tokens, SUM(estimated_cost) as total_cost").
		Group("model").
		Scan(&modelUsage)

	c.JSON(http.StatusOK, gin.H{
		"stats":        stats,
		"model_usage":  modelUsage,
		"period":       gin.H{"from": fromDate, "to": toDate},
		"group_by":     groupBy,
	})
}

// estimateCost estimates the cost based on model and tokens
func (h *Handler) estimateCost(model string, tokens int) float64 {
	// Pricing per 1K tokens (approximate)
	pricing := map[string]float64{
		"gpt-4":         0.03,
		"gpt-4-turbo":   0.01,
		"gpt-3.5-turbo": 0.002,
		"gpt-3.5":       0.002,
	}

	rate, ok := pricing[model]
	if !ok {
		rate = 0.002 // default rate
	}

	return float64(tokens) / 1000.0 * rate
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}