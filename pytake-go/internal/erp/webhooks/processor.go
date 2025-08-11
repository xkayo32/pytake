package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/erp"
	"gorm.io/gorm"
)

// ProcessorImpl implements the WebhookProcessor interface
type ProcessorImpl struct {
	db         *gorm.DB
	httpClient *http.Client
	logger     Logger
	syncEngine SyncEngine
}

// Logger interface for webhook processor logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// SyncEngine interface for data synchronization
type SyncEngine interface {
	ProcessRealTimeEvent(ctx context.Context, event *erp.SyncEvent) error
}

// NewProcessor creates a new webhook processor
func NewProcessor(db *gorm.DB, logger Logger, syncEngine SyncEngine) *ProcessorImpl {
	return &ProcessorImpl{
		db:         db,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		logger:     logger,
		syncEngine: syncEngine,
	}
}

// Webhook Registration Implementation

// RegisterWebhook registers a new webhook
func (p *ProcessorImpl) RegisterWebhook(ctx context.Context, webhook *erp.WebhookConfig) (*erp.Webhook, error) {
	// Validate webhook config
	if err := p.validateWebhookConfig(webhook); err != nil {
		return nil, fmt.Errorf("invalid webhook config: %w", err)
	}

	// Create webhook model
	dbWebhook := &models.ERPWebhook{
		EventType:       webhook.EventType,
		Direction:       string(webhook.Direction),
		TargetURL:       webhook.TargetURL,
		Secret:          webhook.Secret,
		HTTPMethod:      webhook.HTTPMethod,
		Headers:         p.convertHeadersToJSON(webhook.Headers),
		IsActive:        webhook.IsActive,
		RetryAttempts:   webhook.RetryAttempts,
		RetryDelay:      webhook.RetryDelay,
		Timeout:         webhook.Timeout,
	}

	if err := p.db.WithContext(ctx).Create(dbWebhook).Error; err != nil {
		return nil, fmt.Errorf("failed to create webhook: %w", err)
	}

	// Convert to domain model
	domainWebhook := p.convertToWebhook(dbWebhook)

	p.logger.Info("Webhook registered", "webhook_id", domainWebhook.ID, "event_type", webhook.EventType, "direction", webhook.Direction)
	return domainWebhook, nil
}

// UnregisterWebhook unregisters a webhook
func (p *ProcessorImpl) UnregisterWebhook(ctx context.Context, webhookID uuid.UUID) error {
	result := p.db.WithContext(ctx).Delete(&models.ERPWebhook{}, webhookID)
	if result.Error != nil {
		return fmt.Errorf("failed to delete webhook: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("webhook not found")
	}

	p.logger.Info("Webhook unregistered", "webhook_id", webhookID)
	return nil
}

// ListWebhooks lists webhooks for a tenant
func (p *ProcessorImpl) ListWebhooks(ctx context.Context, tenantID uuid.UUID) ([]*erp.Webhook, error) {
	var dbWebhooks []*models.ERPWebhook
	if err := p.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Find(&dbWebhooks).Error; err != nil {
		return nil, fmt.Errorf("failed to retrieve webhooks: %w", err)
	}

	webhooks := make([]*erp.Webhook, len(dbWebhooks))
	for i, dbWebhook := range dbWebhooks {
		webhooks[i] = p.convertToWebhook(dbWebhook)
	}

	return webhooks, nil
}

// Webhook Processing Implementation

// ProcessIncomingWebhook processes incoming webhook from ERP
func (p *ProcessorImpl) ProcessIncomingWebhook(ctx context.Context, payload *erp.WebhookPayload) (*erp.WebhookResult, error) {
	startTime := time.Now()
	
	// Find the webhook configuration
	webhook, err := p.findWebhookForEvent(ctx, payload.EventType, erp.WebhookDirectionIncoming)
	if err != nil {
		return p.createWebhookResult(false, "Webhook configuration not found", startTime), nil
	}

	// Validate webhook signature if secret is configured
	if webhook.Secret != nil && payload.Signature != "" {
		if !p.ValidateSignature(ctx, p.marshalPayload(payload), payload.Signature, *webhook.Secret) {
			p.logger.Warn("Invalid webhook signature", "event_type", payload.EventType, "webhook_id", webhook.ID)
			return p.createWebhookResult(false, "Invalid signature", startTime), nil
		}
	}

	// Log the incoming webhook
	logID, err := p.logWebhookRequest(ctx, webhook.ID, payload, "incoming")
	if err != nil {
		p.logger.Error("Failed to log webhook request", "error", err)
	}

	// Process the webhook payload
	result, err := p.processWebhookData(ctx, webhook, payload)
	if err != nil {
		p.logger.Error("Failed to process webhook", "webhook_id", webhook.ID, "error", err)
		p.updateWebhookLog(ctx, logID, "failed", err.Error(), nil)
		return p.createWebhookResult(false, err.Error(), startTime), nil
	}

	// Update webhook log with success
	p.updateWebhookLog(ctx, logID, "completed", "", result.SyncedData)

	// Update webhook metrics
	p.updateWebhookMetrics(ctx, webhook.ID, true, time.Since(startTime))

	p.logger.Info("Incoming webhook processed successfully", 
		"webhook_id", webhook.ID, 
		"event_type", payload.EventType,
		"entity_type", payload.EntityType,
		"entity_id", payload.EntityID)

	return result, nil
}

// SendOutgoingWebhook sends webhook to external ERP system
func (p *ProcessorImpl) SendOutgoingWebhook(ctx context.Context, webhook *erp.Webhook, data map[string]interface{}) error {
	if webhook.TargetURL == nil {
		return fmt.Errorf("target URL is required for outgoing webhook")
	}

	// Create webhook payload
	payload := &erp.WebhookPayload{
		EventType:  webhook.EventType,
		Data:       data,
		Timestamp:  time.Now(),
		RequestID:  uuid.New().String(),
	}

	// Extract entity information from data if available
	if entityType, ok := data["entity_type"].(string); ok {
		payload.EntityType = entityType
	}
	if entityID, ok := data["entity_id"].(string); ok {
		payload.EntityID = entityID
	}
	if operation, ok := data["operation"].(string); ok {
		payload.Operation = operation
	}

	// Marshal payload to JSON
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Generate signature if secret is configured
	if webhook.Secret != nil {
		signature := p.generateSignature(payloadBytes, *webhook.Secret)
		payload.Signature = signature
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", *webhook.TargetURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "PyTake-Webhook/1.0")
	req.Header.Set("X-PyTake-Event", webhook.EventType)
	req.Header.Set("X-PyTake-Request-ID", payload.RequestID)
	
	if payload.Signature != "" {
		req.Header.Set("X-PyTake-Signature", payload.Signature)
	}

	// Add custom headers from webhook config
	if webhookConfig, ok := webhook.Config["headers"].(map[string]interface{}); ok {
		for key, value := range webhookConfig {
			if valueStr, ok := value.(string); ok {
				req.Header.Set(key, valueStr)
			}
		}
	}

	// Log the outgoing webhook
	logID, err := p.logWebhookRequest(ctx, webhook.ID, payload, "outgoing")
	if err != nil {
		p.logger.Error("Failed to log outgoing webhook request", "error", err)
	}

	// Send the request with retries
	var lastErr error
	maxRetries := webhook.Config["retry_attempts"].(int)
	if maxRetries == 0 {
		maxRetries = 3
	}

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Wait before retry
			retryDelay := time.Duration(webhook.Config["retry_delay"].(int)) * time.Second
			time.Sleep(retryDelay)
			p.logger.Info("Retrying webhook delivery", "webhook_id", webhook.ID, "attempt", attempt)
		}

		resp, err := p.httpClient.Do(req)
		if err != nil {
			lastErr = err
			p.logger.Warn("Webhook delivery failed", "webhook_id", webhook.ID, "attempt", attempt, "error", err)
			continue
		}

		// Read response body
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		// Check if successful
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			p.updateWebhookLog(ctx, logID, "completed", "", map[string]interface{}{
				"status_code": resp.StatusCode,
				"response":    string(body),
			})
			p.updateWebhookMetrics(ctx, webhook.ID, true, time.Since(time.Now()))
			
			p.logger.Info("Outgoing webhook delivered successfully", 
				"webhook_id", webhook.ID, 
				"url", *webhook.TargetURL,
				"status_code", resp.StatusCode)
			return nil
		}

		lastErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
		p.logger.Warn("Webhook delivery failed with HTTP error", 
			"webhook_id", webhook.ID, 
			"attempt", attempt,
			"status_code", resp.StatusCode,
			"response", string(body))
	}

	// All retries failed
	p.updateWebhookLog(ctx, logID, "failed", lastErr.Error(), nil)
	p.updateWebhookMetrics(ctx, webhook.ID, false, time.Since(time.Now()))
	
	return fmt.Errorf("webhook delivery failed after %d attempts: %w", maxRetries+1, lastErr)
}

// Webhook Validation Implementation

// ValidateSignature validates webhook signature
func (p *ProcessorImpl) ValidateSignature(ctx context.Context, payload []byte, signature string, secret string) bool {
	// Remove any prefix like "sha256="
	if strings.HasPrefix(signature, "sha256=") {
		signature = signature[7:]
	}

	// Generate expected signature
	expectedSignature := p.generateSignature(payload, secret)
	
	// Compare signatures
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// ValidatePayload validates webhook payload against rules
func (p *ProcessorImpl) ValidatePayload(ctx context.Context, payload *erp.WebhookPayload, rules *erp.ValidationRules) error {
	if rules == nil {
		return nil
	}

	// Check required fields
	for _, field := range rules.RequiredFields {
		if !p.hasField(payload.Data, field) {
			return fmt.Errorf("required field missing: %s", field)
		}
	}

	// Check field types
	for field, expectedType := range rules.FieldTypes {
		if value, exists := payload.Data[field]; exists {
			if !p.isValidType(value, expectedType) {
				return fmt.Errorf("invalid type for field %s: expected %s", field, expectedType)
			}
		}
	}

	// Apply custom validation rules
	for field, rule := range rules.CustomRules {
		if err := p.applyCustomRule(payload.Data, field, rule); err != nil {
			return fmt.Errorf("custom validation failed for field %s: %w", field, err)
		}
	}

	return nil
}

// Helper Methods

func (p *ProcessorImpl) validateWebhookConfig(config *erp.WebhookConfig) error {
	if config.EventType == "" {
		return fmt.Errorf("event type is required")
	}

	if config.Direction == erp.WebhookDirectionOutgoing && (config.TargetURL == nil || *config.TargetURL == "") {
		return fmt.Errorf("target URL is required for outgoing webhooks")
	}

	if config.RetryAttempts < 0 || config.RetryAttempts > 10 {
		return fmt.Errorf("retry attempts must be between 0 and 10")
	}

	if config.Timeout <= 0 || config.Timeout > 300 {
		return fmt.Errorf("timeout must be between 1 and 300 seconds")
	}

	return nil
}

func (p *ProcessorImpl) convertHeadersToJSON(headers map[string]string) models.JSON {
	if headers == nil {
		return make(models.JSON)
	}

	json := make(models.JSON)
	for key, value := range headers {
		json[key] = value
	}
	return json
}

func (p *ProcessorImpl) convertToWebhook(dbWebhook *models.ERPWebhook) *erp.Webhook {
	webhook := &erp.Webhook{
		ID:              dbWebhook.ID,
		ERPConnectionID: dbWebhook.ERPConnectionID,
		EventType:       dbWebhook.EventType,
		Direction:       erp.WebhookDirection(dbWebhook.Direction),
		TargetURL:       dbWebhook.TargetURL,
		Secret:          dbWebhook.Secret,
		IsActive:        dbWebhook.IsActive,
		Config:          make(map[string]interface{}),
		CreatedAt:       dbWebhook.CreatedAt,
		UpdatedAt:       dbWebhook.UpdatedAt,
	}

	// Convert config fields
	webhook.Config["http_method"] = dbWebhook.HTTPMethod
	webhook.Config["retry_attempts"] = dbWebhook.RetryAttempts
	webhook.Config["retry_delay"] = dbWebhook.RetryDelay
	webhook.Config["timeout"] = dbWebhook.Timeout

	// Convert headers
	if len(dbWebhook.Headers) > 0 {
		headers := make(map[string]string)
		for key, value := range dbWebhook.Headers {
			if valueStr, ok := value.(string); ok {
				headers[key] = valueStr
			}
		}
		webhook.Config["headers"] = headers
	}

	return webhook
}

func (p *ProcessorImpl) findWebhookForEvent(ctx context.Context, eventType string, direction erp.WebhookDirection) (*erp.Webhook, error) {
	var dbWebhook models.ERPWebhook
	if err := p.db.WithContext(ctx).
		Where("event_type = ? AND direction = ? AND is_active = true", eventType, string(direction)).
		First(&dbWebhook).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("webhook not found for event type: %s", eventType)
		}
		return nil, fmt.Errorf("failed to find webhook: %w", err)
	}

	return p.convertToWebhook(&dbWebhook), nil
}

func (p *ProcessorImpl) processWebhookData(ctx context.Context, webhook *erp.Webhook, payload *erp.WebhookPayload) (*erp.WebhookResult, error) {
	// Create sync event from webhook payload
	syncEvent := &erp.SyncEvent{
		EventType:  payload.EventType,
		EntityType: payload.EntityType,
		EntityID:   payload.EntityID,
		Operation:  payload.Operation,
		Data:       payload.Data,
		Source:     "webhook",
		Timestamp:  payload.Timestamp,
		Metadata: map[string]interface{}{
			"webhook_id": webhook.ID,
			"request_id": payload.RequestID,
		},
	}

	// Process through sync engine
	if err := p.syncEngine.ProcessRealTimeEvent(ctx, syncEvent); err != nil {
		return nil, fmt.Errorf("sync processing failed: %w", err)
	}

	// Create successful result
	return &erp.WebhookResult{
		Success:     true,
		ProcessedAt: time.Now(),
		EntityID:    payload.EntityID,
		SyncedData:  payload.Data,
	}, nil
}

func (p *ProcessorImpl) logWebhookRequest(ctx context.Context, webhookID uuid.UUID, payload *erp.WebhookPayload, direction string) (uuid.UUID, error) {
	// Extract headers from payload
	var headers models.JSON
	if payload.Headers != nil {
		headers = make(models.JSON)
		for key, value := range payload.Headers {
			headers[key] = value
		}
	}

	// Convert payload data to JSON
	var requestBody models.JSON
	if payload.Data != nil {
		requestBody = models.JSON(payload.Data)
	}

	webhookLog := &models.ERPWebhookLog{
		ERPWebhookID: webhookID,
		EventType:    payload.EventType,
		Direction:    direction,
		RequestID:    payload.RequestID,
		Method:       "POST",
		Headers:      headers,
		RequestBody:  requestBody,
		ReceivedAt:   payload.Timestamp,
		Status:       "pending",
		IPAddress:    p.extractIPFromHeaders(payload.Headers),
		UserAgent:    p.extractUserAgentFromHeaders(payload.Headers),
	}

	if err := p.db.WithContext(ctx).Create(webhookLog).Error; err != nil {
		return uuid.Nil, fmt.Errorf("failed to create webhook log: %w", err)
	}

	return webhookLog.ID, nil
}

func (p *ProcessorImpl) updateWebhookLog(ctx context.Context, logID uuid.UUID, status string, errorMsg string, result map[string]interface{}) {
	updates := map[string]interface{}{
		"status":       status,
		"processed_at": time.Now(),
	}

	if errorMsg != "" {
		updates["error_message"] = errorMsg
	}

	if result != nil {
		updates["processing_result"] = models.JSON(result)
	}

	if err := p.db.WithContext(ctx).
		Model(&models.ERPWebhookLog{}).
		Where("id = ?", logID).
		Updates(updates).Error; err != nil {
		p.logger.Error("Failed to update webhook log", "log_id", logID, "error", err)
	}
}

func (p *ProcessorImpl) updateWebhookMetrics(ctx context.Context, webhookID uuid.UUID, success bool, processingTime time.Duration) {
	updates := map[string]interface{}{
		"last_processed_at": time.Now(),
		"total_processed":   gorm.Expr("total_processed + 1"),
	}

	if success {
		updates["last_received_at"] = time.Now()
	} else {
		updates["total_failed"] = gorm.Expr("total_failed + 1")
		updates["last_error_at"] = time.Now()
	}

	// Update average processing time
	updates["avg_processing_time"] = gorm.Expr("(avg_processing_time + ?) / 2", processingTime.Milliseconds())

	if err := p.db.WithContext(ctx).
		Model(&models.ERPWebhook{}).
		Where("id = ?", webhookID).
		Updates(updates).Error; err != nil {
		p.logger.Error("Failed to update webhook metrics", "webhook_id", webhookID, "error", err)
	}
}

func (p *ProcessorImpl) generateSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

func (p *ProcessorImpl) marshalPayload(payload *erp.WebhookPayload) []byte {
	data, _ := json.Marshal(payload)
	return data
}

func (p *ProcessorImpl) createWebhookResult(success bool, message string, startTime time.Time) *erp.WebhookResult {
	result := &erp.WebhookResult{
		Success:     success,
		ProcessedAt: time.Now(),
		ShouldRetry: !success,
	}

	if message != "" {
		result.ErrorMessage = &message
	}

	return result
}

func (p *ProcessorImpl) hasField(data map[string]interface{}, field string) bool {
	_, exists := data[field]
	return exists
}

func (p *ProcessorImpl) isValidType(value interface{}, expectedType string) bool {
	switch expectedType {
	case "string":
		_, ok := value.(string)
		return ok
	case "number":
		_, ok1 := value.(int)
		_, ok2 := value.(float64)
		return ok1 || ok2
	case "boolean":
		_, ok := value.(bool)
		return ok
	case "array":
		_, ok := value.([]interface{})
		return ok
	case "object":
		_, ok := value.(map[string]interface{})
		return ok
	default:
		return true // Unknown type, allow it
	}
}

func (p *ProcessorImpl) applyCustomRule(data map[string]interface{}, field string, rule interface{}) error {
	// This would implement custom validation rules based on the rule configuration
	// For now, return nil (no validation errors)
	return nil
}

func (p *ProcessorImpl) extractIPFromHeaders(headers map[string]string) string {
	if headers == nil {
		return ""
	}

	// Try different headers for IP address
	if ip := headers["X-Forwarded-For"]; ip != "" {
		// Take the first IP if multiple
		if parts := strings.Split(ip, ","); len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	if ip := headers["X-Real-IP"]; ip != "" {
		return ip
	}

	if ip := headers["Remote-Addr"]; ip != "" {
		return ip
	}

	return ""
}

func (p *ProcessorImpl) extractUserAgentFromHeaders(headers map[string]string) string {
	if headers == nil {
		return ""
	}

	return headers["User-Agent"]
}