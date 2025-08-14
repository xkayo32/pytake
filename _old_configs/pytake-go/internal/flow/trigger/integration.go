package trigger

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/flow/engine"
)

// TriggerSystem represents the complete trigger system
type TriggerSystem struct {
	Manager    TriggerManager
	Processor  TriggerProcessor
	Emitter    TriggerEventEmitter
	Scheduler  TriggerScheduler
}

// NewTriggerSystem creates a new complete trigger system
func NewTriggerSystem(manager TriggerManager, flowEngine engine.FlowEngine, logger engine.Logger, workers int) (*TriggerSystem, error) {
	// Create processor
	processor := NewProcessor(manager, nil, flowEngine, logger, workers)
	
	// Create emitter
	emitter := NewEventEmitter(processor)
	
	// Matchers will be registered externally to avoid import cycles
	
	return &TriggerSystem{
		Manager:   manager,
		Processor: processor,
		Emitter:   emitter,
		Scheduler: nil, // Can be added later for scheduled triggers
	}, nil
}

// Start starts the trigger system
func (ts *TriggerSystem) Start(ctx context.Context) error {
	if err := ts.Processor.Start(ctx); err != nil {
		return fmt.Errorf("failed to start trigger processor: %w", err)
	}
	
	if ts.Scheduler != nil {
		if err := ts.Scheduler.Start(ctx); err != nil {
			return fmt.Errorf("failed to start trigger scheduler: %w", err)
		}
	}
	
	return nil
}

// Stop stops the trigger system
func (ts *TriggerSystem) Stop(ctx context.Context) error {
	if err := ts.Processor.Stop(ctx); err != nil {
		return fmt.Errorf("failed to stop trigger processor: %w", err)
	}
	
	if ts.Scheduler != nil {
		if err := ts.Scheduler.Stop(ctx); err != nil {
			return fmt.Errorf("failed to stop trigger scheduler: %w", err)
		}
	}
	
	return nil
}

// GetStats returns system statistics
func (ts *TriggerSystem) GetStats() map[string]interface{} {
	stats := map[string]interface{}{}
	
	// Get processor stats
	if processor, ok := ts.Processor.(*Processor); ok {
		stats["processor"] = processor.GetStats()
	}
	
	return stats
}

// Integration functions for other services

// IntegrateWithWhatsAppWebhook integrates triggers with WhatsApp webhook events
func (ts *TriggerSystem) IntegrateWithWhatsAppWebhook(ctx context.Context, webhookData map[string]interface{}, tenantID string) error {
	// Extract message data from webhook
	messageData, ok := webhookData["message"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("invalid webhook data: missing message")
	}
	
	// Extract contact info
	contactPhone, _ := messageData["from"].(string)
	conversationID := fmt.Sprintf("conv_%s", contactPhone) // Simplified conversation ID
	
	// Parse UUIDs (simplified for example)
	// In real implementation, you would look up or create proper UUIDs
	tenantUUID, err := parseOrCreateTenantID(tenantID)
	if err != nil {
		return fmt.Errorf("invalid tenant ID: %w", err)
	}
	
	contactUUID, err := parseOrCreateContactID(contactPhone, tenantUUID)
	if err != nil {
		return fmt.Errorf("failed to get contact ID: %w", err)
	}
	
	conversationUUID, err := parseOrCreateConversationID(conversationID, tenantUUID)
	if err != nil {
		return fmt.Errorf("failed to get conversation ID: %w", err)
	}
	
	// Emit message received event
	return ts.Emitter.EmitMessageReceived(ctx, tenantUUID, conversationUUID, contactUUID, messageData)
}

// IntegrateWithContactService integrates triggers with contact service events
func (ts *TriggerSystem) IntegrateWithContactService(ctx context.Context, action string, contactData map[string]interface{}) error {
	// Extract tenant and contact IDs
	tenantIDStr, ok := contactData["tenant_id"].(string)
	if !ok {
		return fmt.Errorf("missing tenant_id in contact data")
	}
	
	contactIDStr, ok := contactData["id"].(string)
	if !ok {
		return fmt.Errorf("missing contact id")
	}
	
	// Parse UUIDs
	tenantUUID, err := parseOrCreateTenantID(tenantIDStr)
	if err != nil {
		return fmt.Errorf("invalid tenant ID: %w", err)
	}
	
	contactUUID, err := parseOrCreateContactID(contactIDStr, tenantUUID)
	if err != nil {
		return fmt.Errorf("invalid contact ID: %w", err)
	}
	
	// Determine event type
	var eventType TriggerType
	switch action {
	case "created":
		eventType = TriggerTypeContactCreated
	case "updated":
		eventType = TriggerTypeContactUpdated
	default:
		return fmt.Errorf("unsupported contact action: %s", action)
	}
	
	// Emit contact event
	return ts.Emitter.EmitContactEvent(ctx, tenantUUID, contactUUID, eventType, contactData)
}

// IntegrateWithAPIEndpoint integrates triggers with API endpoint calls
func (ts *TriggerSystem) IntegrateWithAPIEndpoint(ctx context.Context, endpoint, method string, requestBody interface{}, headers map[string]string, tenantID, userID string) error {
	// Parse tenant UUID
	tenantUUID, err := parseOrCreateTenantID(tenantID)
	if err != nil {
		return fmt.Errorf("invalid tenant ID: %w", err)
	}
	
	// Check if user is authenticated
	authenticated := userID != ""
	
	// Emit API event
	return ts.Emitter.EmitAPIEvent(ctx, tenantUUID, endpoint, method, requestBody, headers, authenticated)
}

// Example helper functions (would be replaced with actual service calls)

func parseOrCreateTenantID(tenantID string) (uuid.UUID, error) {
	// In real implementation, this would parse or look up the tenant
	return uuid.Parse(tenantID)
}

func parseOrCreateContactID(identifier string, tenantID uuid.UUID) (uuid.UUID, error) {
	// In real implementation, this would look up or create a contact by phone number
	// For now, generate a deterministic UUID based on identifier
	return uuid.NewSHA1(tenantID, []byte(identifier)), nil
}

func parseOrCreateConversationID(identifier string, tenantID uuid.UUID) (uuid.UUID, error) {
	// In real implementation, this would look up or create a conversation
	// For now, generate a deterministic UUID based on identifier
	return uuid.NewSHA1(tenantID, []byte(identifier)), nil
}

// ConfigurationHelpers provides utility functions for trigger configuration

// CreateKeywordTrigger creates a keyword-based trigger configuration
func CreateKeywordTrigger(keywords []string, matchMode string, caseSensitive bool, priority int) *TriggerConfig {
	return &TriggerConfig{
		Type: TriggerTypeKeywordMatch,
		Conditions: map[string]interface{}{
			"keywords":       keywords,
			"match_mode":     matchMode,
			"case_sensitive": caseSensitive,
		},
		Settings: map[string]interface{}{
			"priority": priority,
		},
		Priority: priority,
		Enabled:  true,
	}
}

// CreateButtonTrigger creates a button click trigger configuration
func CreateButtonTrigger(buttonIDs []string, priority int) *TriggerConfig {
	return &TriggerConfig{
		Type: TriggerTypeButtonClick,
		Conditions: map[string]interface{}{
			"button_ids": buttonIDs,
		},
		Settings: map[string]interface{}{
			"priority": priority,
		},
		Priority: priority,
		Enabled:  true,
	}
}

// CreateWebhookTrigger creates a webhook-based trigger configuration
func CreateWebhookTrigger(source, eventType string, customConditions map[string]interface{}, priority int) *TriggerConfig {
	conditions := map[string]interface{}{
		"webhook_source": source,
		"event_type":     eventType,
	}
	
	if customConditions != nil {
		conditions["custom_conditions"] = customConditions
	}
	
	return &TriggerConfig{
		Type:       TriggerTypeWebhook,
		Conditions: conditions,
		Settings: map[string]interface{}{
			"priority": priority,
		},
		Priority: priority,
		Enabled:  true,
	}
}

// CreateContactTrigger creates a contact event trigger configuration
func CreateContactTrigger(eventType TriggerType, requiredTags []string, fieldConditions map[string]interface{}, priority int) *TriggerConfig {
	conditions := map[string]interface{}{}
	
	if len(requiredTags) > 0 {
		conditions["contact_tags"] = requiredTags
	}
	
	if fieldConditions != nil {
		conditions["contact_fields"] = fieldConditions
	}
	
	return &TriggerConfig{
		Type:       eventType,
		Conditions: conditions,
		Settings: map[string]interface{}{
			"priority": priority,
		},
		Priority: priority,
		Enabled:  true,
	}
}