package context

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/ai"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// ManagerImpl implements the ContextManager interface
type ManagerImpl struct {
	db             *gorm.DB
	logger         Logger
	embeddingStore EmbeddingStore
	vectorSearch   VectorSearch
	aiProvider     ai.AIProvider
}

// Logger interface for context manager logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// EmbeddingStore interface for storing embeddings
type EmbeddingStore interface {
	Store(ctx context.Context, id uuid.UUID, embedding []float32) error
	Get(ctx context.Context, id uuid.UUID) ([]float32, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Search(ctx context.Context, query []float32, limit int) ([]EmbeddingMatch, error)
}

// VectorSearch interface for vector similarity search
type VectorSearch interface {
	IndexVector(id uuid.UUID, vector []float32, metadata map[string]interface{}) error
	Search(vector []float32, k int) ([]VectorMatch, error)
	Delete(id uuid.UUID) error
}

// EmbeddingMatch represents an embedding search result
type EmbeddingMatch struct {
	ID         uuid.UUID `json:"id"`
	Similarity float32   `json:"similarity"`
	Metadata   map[string]interface{} `json:"metadata"`
}

// VectorMatch represents a vector search result
type VectorMatch struct {
	ID       uuid.UUID              `json:"id"`
	Score    float32                `json:"score"`
	Vector   []float32              `json:"vector"`
	Metadata map[string]interface{} `json:"metadata"`
}

// NewManager creates a new context manager
func NewManager(db *gorm.DB, logger Logger, embeddingStore EmbeddingStore, vectorSearch VectorSearch, aiProvider ai.AIProvider) *ManagerImpl {
	return &ManagerImpl{
		db:             db,
		logger:         logger,
		embeddingStore: embeddingStore,
		vectorSearch:   vectorSearch,
		aiProvider:     aiProvider,
	}
}

// Context Operations

// CreateContext creates a new conversation context
func (m *ManagerImpl) CreateContext(ctx context.Context, tenantID uuid.UUID, config *ai.ContextConfig) (*ai.ConversationContext, error) {
	// Create context model
	contextModel := &models.AIContext{
		TenantID:       tenantID,
		WindowSize:     config.WindowSize,
		MaxMessages:    config.MaxMessages,
		RetentionDays:  int(config.RetentionPeriod.Hours() / 24),
		Features:       config.Features,
		Metadata:       models.JSON(config.Metadata),
		IsActive:       true,
	}

	// Set default values
	if contextModel.WindowSize == 0 {
		contextModel.WindowSize = 10
	}
	if contextModel.MaxMessages == 0 {
		contextModel.MaxMessages = 100
	}
	if contextModel.RetentionDays == 0 {
		contextModel.RetentionDays = 30
	}

	// Create in database
	if err := m.db.WithContext(ctx).Create(contextModel).Error; err != nil {
		return nil, fmt.Errorf("failed to create context: %w", err)
	}

	// Convert to domain model
	conversationContext := m.convertToConversationContext(contextModel)

	m.logger.Info("Context created", 
		"context_id", conversationContext.ID,
		"tenant_id", tenantID)

	return conversationContext, nil
}

// UpdateContext updates an existing context
func (m *ManagerImpl) UpdateContext(ctx context.Context, contextID uuid.UUID, update *ai.ContextUpdate) error {
	// Build updates map
	updates := make(map[string]interface{})

	if update.Summary != nil {
		updates["summary"] = *update.Summary
	}
	if update.Topics != nil {
		topicsJSON, _ := json.Marshal(update.Topics)
		updates["topics"] = string(topicsJSON)
	}
	if update.Entities != nil {
		updates["entities"] = models.JSON(update.Entities)
	}
	if update.Metadata != nil {
		updates["metadata"] = models.JSON(update.Metadata)
	}

	if len(updates) == 0 {
		return nil // No updates to apply
	}

	updates["updated_at"] = time.Now()

	// Apply updates
	if err := m.db.WithContext(ctx).
		Model(&models.AIContext{}).
		Where("id = ?", contextID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update context: %w", err)
	}

	// Generate and store updated embeddings if summary changed
	if update.Summary != nil {
		embedding, err := m.GenerateEmbedding(ctx, *update.Summary)
		if err != nil {
			m.logger.Warn("Failed to generate embedding for updated summary", "error", err)
		} else {
			if err := m.StoreEmbedding(ctx, contextID, embedding); err != nil {
				m.logger.Warn("Failed to store embedding", "error", err)
			}
		}
	}

	m.logger.Info("Context updated", "context_id", contextID)

	return nil
}

// GetContext retrieves a conversation context
func (m *ManagerImpl) GetContext(ctx context.Context, contextID uuid.UUID) (*ai.ConversationContext, error) {
	var contextModel models.AIContext
	if err := m.db.WithContext(ctx).
		Preload("Messages").
		First(&contextModel, contextID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("context not found")
		}
		return nil, fmt.Errorf("failed to get context: %w", err)
	}

	return m.convertToConversationContext(&contextModel), nil
}

// DeleteContext deletes a conversation context
func (m *ManagerImpl) DeleteContext(ctx context.Context, contextID uuid.UUID) error {
	// Delete embeddings
	if m.embeddingStore != nil {
		if err := m.embeddingStore.Delete(ctx, contextID); err != nil {
			m.logger.Warn("Failed to delete embeddings", "context_id", contextID, "error", err)
		}
	}

	// Delete from vector search index
	if m.vectorSearch != nil {
		if err := m.vectorSearch.Delete(contextID); err != nil {
			m.logger.Warn("Failed to delete from vector index", "context_id", contextID, "error", err)
		}
	}

	// Delete context and related messages
	if err := m.db.WithContext(ctx).
		Where("id = ?", contextID).
		Delete(&models.AIContext{}).Error; err != nil {
		return fmt.Errorf("failed to delete context: %w", err)
	}

	m.logger.Info("Context deleted", "context_id", contextID)

	return nil
}

// Message History

// AddMessage adds a message to the context
func (m *ManagerImpl) AddMessage(ctx context.Context, contextID uuid.UUID, message *ai.Message) error {
	// Get context to check limits
	var contextModel models.AIContext
	if err := m.db.WithContext(ctx).First(&contextModel, contextID).Error; err != nil {
		return fmt.Errorf("failed to get context: %w", err)
	}

	// Check message limit
	var messageCount int64
	if err := m.db.WithContext(ctx).
		Model(&models.AIMessage{}).
		Where("ai_context_id = ?", contextID).
		Count(&messageCount).Error; err != nil {
		return fmt.Errorf("failed to count messages: %w", err)
	}

	// If at limit, remove oldest message
	if int(messageCount) >= contextModel.MaxMessages {
		var oldestMessage models.AIMessage
		if err := m.db.WithContext(ctx).
			Where("ai_context_id = ?", contextID).
			Order("created_at ASC").
			First(&oldestMessage).Error; err == nil {
			m.db.Delete(&oldestMessage)
		}
	}

	// Create message model
	messageModel := &models.AIMessage{
		AIContextID: contextID,
		Role:        message.Role,
		Content:     message.Content,
		Name:        message.Name,
		Metadata:    models.JSON(message.Metadata),
	}

	// Save message
	if err := m.db.WithContext(ctx).Create(messageModel).Error; err != nil {
		return fmt.Errorf("failed to add message: %w", err)
	}

	// Update context summary if needed
	if messageCount%5 == 0 { // Update summary every 5 messages
		go m.updateContextSummary(context.Background(), contextID)
	}

	return nil
}

// GetMessages retrieves messages from the context
func (m *ManagerImpl) GetMessages(ctx context.Context, contextID uuid.UUID, limit int) ([]*ai.Message, error) {
	var messageModels []*models.AIMessage
	
	query := m.db.WithContext(ctx).
		Where("ai_context_id = ?", contextID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&messageModels).Error; err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	// Convert to domain models
	messages := make([]*ai.Message, len(messageModels))
	for i, model := range messageModels {
		messages[len(messages)-1-i] = &ai.Message{ // Reverse order
			Role:      model.Role,
			Content:   model.Content,
			Name:      model.Name,
			Metadata:  model.Metadata,
			Timestamp: model.CreatedAt,
		}
	}

	return messages, nil
}

// ClearMessages clears all messages from the context
func (m *ManagerImpl) ClearMessages(ctx context.Context, contextID uuid.UUID) error {
	if err := m.db.WithContext(ctx).
		Where("ai_context_id = ?", contextID).
		Delete(&models.AIMessage{}).Error; err != nil {
		return fmt.Errorf("failed to clear messages: %w", err)
	}

	// Clear summary
	m.db.WithContext(ctx).
		Model(&models.AIContext{}).
		Where("id = ?", contextID).
		Update("summary", "")

	m.logger.Info("Messages cleared", "context_id", contextID)

	return nil
}

// Context Search

// SearchSimilar searches for similar contexts using embeddings
func (m *ManagerImpl) SearchSimilar(ctx context.Context, tenantID uuid.UUID, query string, limit int) ([]*ai.ConversationContext, error) {
	// Generate embedding for query
	queryEmbedding, err := m.GenerateEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	// Search in embedding store
	matches, err := m.embeddingStore.Search(ctx, queryEmbedding, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search embeddings: %w", err)
	}

	// Fetch contexts
	contexts := make([]*ai.ConversationContext, 0, len(matches))
	for _, match := range matches {
		var contextModel models.AIContext
		if err := m.db.WithContext(ctx).
			Where("id = ? AND tenant_id = ?", match.ID, tenantID).
			First(&contextModel).Error; err == nil {
			contexts = append(contexts, m.convertToConversationContext(&contextModel))
		}
	}

	return contexts, nil
}

// GetRelevantContext gets enriched context for a message
func (m *ManagerImpl) GetRelevantContext(ctx context.Context, tenantID uuid.UUID, message string) (*ai.EnrichedContext, error) {
	// Search for similar contexts
	similarContexts, err := m.SearchSimilar(ctx, tenantID, message, 5)
	if err != nil {
		m.logger.Warn("Failed to find similar contexts", "error", err)
	}

	// Get customer context if available
	var customerContext *ai.ConversationContext
	if len(similarContexts) > 0 {
		customerContext = similarContexts[0]
	}

	// Search for relevant FAQs
	faqs := m.searchFAQs(ctx, tenantID, message)

	// Search for relevant products
	products := m.searchProducts(ctx, tenantID, message)

	// Get customer history if context is available
	var customerHistory *ai.CustomerHistory
	if customerContext != nil && customerContext.CustomerID != uuid.Nil {
		customerHistory = m.getCustomerHistory(ctx, customerContext.CustomerID)
	}

	enrichedContext := &ai.EnrichedContext{
		Context:         customerContext,
		RelatedContexts: similarContexts[1:], // Exclude the main context
		RelevantFAQs:    faqs,
		ProductInfo:     products,
		CustomerHistory: customerHistory,
	}

	return enrichedContext, nil
}

// Embeddings

// GenerateEmbedding generates embeddings for text
func (m *ManagerImpl) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	// Use OpenAI's embedding model
	// This is a simplified implementation
	// In production, call the actual embedding API
	
	// For now, generate a mock embedding
	embedding := make([]float32, 1536) // OpenAI ada-002 dimension
	for i := range embedding {
		// Generate deterministic values based on text
		hash := 0
		for _, r := range text {
			hash = (hash*31 + int(r)) % 1000000
		}
		embedding[i] = float32(hash%1000) / 1000.0
	}

	// Normalize the embedding
	norm := float32(0)
	for _, v := range embedding {
		norm += v * v
	}
	norm = float32(math.Sqrt(float64(norm)))
	
	if norm > 0 {
		for i := range embedding {
			embedding[i] /= norm
		}
	}

	return embedding, nil
}

// StoreEmbedding stores embeddings for a context
func (m *ManagerImpl) StoreEmbedding(ctx context.Context, contextID uuid.UUID, embedding []float32) error {
	// Store in embedding store
	if err := m.embeddingStore.Store(ctx, contextID, embedding); err != nil {
		return fmt.Errorf("failed to store embedding: %w", err)
	}

	// Index in vector search
	if m.vectorSearch != nil {
		metadata := map[string]interface{}{
			"context_id": contextID.String(),
			"timestamp":  time.Now().Unix(),
		}
		if err := m.vectorSearch.IndexVector(contextID, embedding, metadata); err != nil {
			m.logger.Warn("Failed to index vector", "error", err)
		}
	}

	// Store in database
	embeddingJSON, _ := json.Marshal(embedding)
	m.db.WithContext(ctx).
		Model(&models.AIContext{}).
		Where("id = ?", contextID).
		Update("embedding", string(embeddingJSON))

	return nil
}

// Helper Methods

func (m *ManagerImpl) convertToConversationContext(model *models.AIContext) *ai.ConversationContext {
	context := &ai.ConversationContext{
		ID:             model.ID,
		TenantID:       model.TenantID,
		ConversationID: model.ConversationID,
		CustomerID:     model.CustomerID,
		Summary:        model.Summary,
		Entities:       model.Entities,
		Metadata:       model.Metadata,
		WindowSize:     model.WindowSize,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
	}

	// Parse topics
	if model.Topics != "" {
		json.Unmarshal([]byte(model.Topics), &context.Topics)
	}

	// Convert messages
	if model.Messages != nil {
		context.Messages = make([]*ai.Message, len(model.Messages))
		for i, msg := range model.Messages {
			context.Messages[i] = &ai.Message{
				Role:      msg.Role,
				Content:   msg.Content,
				Name:      msg.Name,
				Metadata:  msg.Metadata,
				Timestamp: msg.CreatedAt,
			}
		}
	}

	return context
}

func (m *ManagerImpl) updateContextSummary(ctx context.Context, contextID uuid.UUID) {
	// Get recent messages
	messages, err := m.GetMessages(ctx, contextID, 20)
	if err != nil {
		m.logger.Warn("Failed to get messages for summary", "error", err)
		return
	}

	if len(messages) == 0 {
		return
	}

	// Build prompt for summarization
	prompt := "Summarize the following conversation in 2-3 sentences:\n\n"
	for _, msg := range messages {
		prompt += fmt.Sprintf("%s: %s\n", msg.Role, msg.Content)
	}

	// Generate summary using AI
	request := &ai.ChatRequest{
		Messages: []*ai.Message{
			{Role: "user", Content: prompt},
		},
		Model:       "gpt-3.5-turbo",
		MaxTokens:   100,
		Temperature: 0.7,
	}

	response, err := m.aiProvider.GenerateResponse(ctx, request)
	if err != nil {
		m.logger.Warn("Failed to generate summary", "error", err)
		return
	}

	// Update context with summary
	summary := response.Content
	m.UpdateContext(ctx, contextID, &ai.ContextUpdate{
		Summary: &summary,
	})

	// Extract topics from the conversation
	topics := m.extractTopics(messages)
	if len(topics) > 0 {
		m.UpdateContext(ctx, contextID, &ai.ContextUpdate{
			Topics: topics,
		})
	}
}

func (m *ManagerImpl) extractTopics(messages []*ai.Message) []string {
	// Simple topic extraction based on frequency
	// In production, use NLP for better topic extraction
	wordFreq := make(map[string]int)
	
	for _, msg := range messages {
		words := strings.Fields(strings.ToLower(msg.Content))
		for _, word := range words {
			if len(word) > 4 { // Only consider longer words
				wordFreq[word]++
			}
		}
	}

	// Sort by frequency
	type wordCount struct {
		word  string
		count int
	}
	
	var sorted []wordCount
	for word, count := range wordFreq {
		if count > 1 { // Only words that appear more than once
			sorted = append(sorted, wordCount{word, count})
		}
	}
	
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].count > sorted[j].count
	})

	// Return top 5 topics
	topics := make([]string, 0, 5)
	for i := 0; i < len(sorted) && i < 5; i++ {
		topics = append(topics, sorted[i].word)
	}

	return topics
}

func (m *ManagerImpl) searchFAQs(ctx context.Context, tenantID uuid.UUID, query string) []*ai.FAQ {
	// This would search in a FAQ database
	// For now, return empty
	return []*ai.FAQ{}
}

func (m *ManagerImpl) searchProducts(ctx context.Context, tenantID uuid.UUID, query string) []*ai.Product {
	// This would search in a product database
	// For now, return empty
	return []*ai.Product{}
}

func (m *ManagerImpl) getCustomerHistory(ctx context.Context, customerID uuid.UUID) *ai.CustomerHistory {
	// This would fetch customer history from database
	// For now, return a mock history
	return &ai.CustomerHistory{
		TotalInteractions: 0,
		LastInteraction:   time.Now(),
		PurchaseHistory:   []*ai.Purchase{},
		SupportTickets:    []*ai.Ticket{},
		Preferences:       make(map[string]interface{}),
	}
}

