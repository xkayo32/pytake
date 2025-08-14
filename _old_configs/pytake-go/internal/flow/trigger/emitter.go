package trigger

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// EventEmitter implements the TriggerEventEmitter interface
type EventEmitter struct {
	processor TriggerProcessor
}

// NewEventEmitter creates a new event emitter
func NewEventEmitter(processor TriggerProcessor) *EventEmitter {
	return &EventEmitter{
		processor: processor,
	}
}

// EmitEvent emits a trigger event
func (e *EventEmitter) EmitEvent(ctx context.Context, event *TriggerEvent) error {
	if event == nil {
		return fmt.Errorf("event cannot be nil")
	}
	
	// Set timestamp if not provided
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	
	// Generate ID if not provided
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}
	
	// Initialize data and metadata if nil
	if event.Data == nil {
		event.Data = make(map[string]interface{})
	}
	
	if event.Metadata == nil {
		event.Metadata = make(map[string]interface{})
	}
	
	return e.processor.ProcessEvent(ctx, event)
}

// EmitMessageReceived emits a message received event
func (e *EventEmitter) EmitMessageReceived(ctx context.Context, tenantID, conversationID, contactID uuid.UUID, message map[string]interface{}) error {
	event := &TriggerEvent{
		ID:             uuid.New(),
		TenantID:       tenantID,
		TriggerType:    TriggerTypeMessageReceived,
		ContactID:      &contactID,
		ConversationID: &conversationID,
		Data:           message,
		Metadata: map[string]interface{}{
			"source": "whatsapp_webhook",
		},
		Timestamp: time.Now(),
	}
	
	// Add message type detection
	if msgType, ok := message["type"].(string); ok {
		event.Data["message_type"] = msgType
	}
	
	// Add sender type
	event.Data["sender_type"] = "contact"
	
	// Emit keyword match events if message contains text
	if text, ok := message["text"].(string); ok && text != "" {
		// Create a separate keyword match event
		keywordEvent := &TriggerEvent{
			ID:             uuid.New(),
			TenantID:       tenantID,
			TriggerType:    TriggerTypeKeywordMatch,
			ContactID:      &contactID,
			ConversationID: &conversationID,
			Data:           message,
			Metadata: map[string]interface{}{
				"source":           "whatsapp_webhook",
				"original_event":   event.ID.String(),
			},
			Timestamp: time.Now(),
		}
		
		// Process keyword event asynchronously
		go func() {
			if err := e.processor.ProcessEvent(ctx, keywordEvent); err != nil {
				// Log error but don't fail the main event
			}
		}()
	}
	
	// Emit button/list selection events for interactive messages
	if msgType, ok := message["type"].(string); ok && msgType == "interactive" {
		if interactiveType, ok := message["interactive_type"].(string); ok {
			var triggerType TriggerType
			switch interactiveType {
			case "button_reply":
				triggerType = TriggerTypeButtonClick
			case "list_reply":
				triggerType = TriggerTypeListSelection
			default:
				// Process main event only
				return e.EmitEvent(ctx, event)
			}
			
			interactiveEvent := &TriggerEvent{
				ID:             uuid.New(),
				TenantID:       tenantID,
				TriggerType:    triggerType,
				ContactID:      &contactID,
				ConversationID: &conversationID,
				Data:           message,
				Metadata: map[string]interface{}{
					"source":         "whatsapp_webhook",
					"original_event": event.ID.String(),
				},
				Timestamp: time.Now(),
			}
			
			// Process interactive event asynchronously
			go func() {
				if err := e.processor.ProcessEvent(ctx, interactiveEvent); err != nil {
					// Log error but don't fail the main event
				}
			}()
		}
	}
	
	return e.EmitEvent(ctx, event)
}

// EmitWebhookEvent emits a webhook event
func (e *EventEmitter) EmitWebhookEvent(ctx context.Context, tenantID uuid.UUID, webhookType string, data map[string]interface{}) error {
	event := &TriggerEvent{
		ID:          uuid.New(),
		TenantID:    tenantID,
		TriggerType: TriggerTypeWebhook,
		Data:        data,
		Metadata: map[string]interface{}{
			"source":       "webhook",
			"webhook_type": webhookType,
		},
		Timestamp: time.Now(),
	}
	
	// Add webhook type to data
	event.Data["webhook_type"] = webhookType
	
	return e.EmitEvent(ctx, event)
}

// EmitContactEvent emits a contact-related event
func (e *EventEmitter) EmitContactEvent(ctx context.Context, tenantID, contactID uuid.UUID, eventType TriggerType, data map[string]interface{}) error {
	event := &TriggerEvent{
		ID:          uuid.New(),
		TenantID:    tenantID,
		TriggerType: eventType,
		ContactID:   &contactID,
		Data:        data,
		Metadata: map[string]interface{}{
			"source": "contact_service",
		},
		Timestamp: time.Now(),
	}
	
	// Add action type to data
	switch eventType {
	case TriggerTypeContactCreated:
		event.Data["action"] = "created"
	case TriggerTypeContactUpdated:
		event.Data["action"] = "updated"
	}
	
	return e.EmitEvent(ctx, event)
}

// EmitCustomEvent emits a custom event
func (e *EventEmitter) EmitCustomEvent(ctx context.Context, tenantID uuid.UUID, eventName string, data map[string]interface{}) error {
	event := &TriggerEvent{
		ID:          uuid.New(),
		TenantID:    tenantID,
		TriggerType: TriggerTypeCustomEvent,
		Data:        data,
		Metadata: map[string]interface{}{
			"source":     "custom",
			"event_name": eventName,
		},
		Timestamp: time.Now(),
	}
	
	// Add event name to data
	event.Data["event_name"] = eventName
	
	return e.EmitEvent(ctx, event)
}

// EmitAPIEvent emits an API event
func (e *EventEmitter) EmitAPIEvent(ctx context.Context, tenantID uuid.UUID, endpoint, method string, requestBody interface{}, headers map[string]string, authenticated bool) error {
	data := map[string]interface{}{
		"endpoint":      endpoint,
		"method":        method,
		"authenticated": authenticated,
	}
	
	if requestBody != nil {
		data["request_body"] = requestBody
	}
	
	if headers != nil {
		data["headers"] = headers
	}
	
	event := &TriggerEvent{
		ID:          uuid.New(),
		TenantID:    tenantID,
		TriggerType: TriggerTypeAPI,
		Data:        data,
		Metadata: map[string]interface{}{
			"source": "api",
		},
		Timestamp: time.Now(),
	}
	
	return e.EmitEvent(ctx, event)
}

// EmitScheduledEvent emits a scheduled event
func (e *EventEmitter) EmitScheduledEvent(ctx context.Context, tenantID, flowID uuid.UUID, triggerID uuid.UUID, scheduledData map[string]interface{}) error {
	event := &TriggerEvent{
		ID:          uuid.New(),
		TenantID:    tenantID,
		TriggerType: TriggerTypeScheduled,
		Data:        scheduledData,
		Metadata: map[string]interface{}{
			"source":     "scheduler",
			"flow_id":    flowID.String(),
			"trigger_id": triggerID.String(),
		},
		Timestamp: time.Now(),
	}
	
	// Add scheduling info to data
	event.Data["flow_id"] = flowID.String()
	event.Data["trigger_id"] = triggerID.String()
	
	return e.EmitEvent(ctx, event)
}

// EmitCampaignEvent emits a campaign-related event
func (e *EventEmitter) EmitCampaignEvent(ctx context.Context, tenantID, campaignID uuid.UUID, eventType TriggerType, data map[string]interface{}) error {
	event := &TriggerEvent{
		ID:          uuid.New(),
		TenantID:    tenantID,
		TriggerType: eventType,
		Data:        data,
		Metadata: map[string]interface{}{
			"source":      "campaign_service",
			"campaign_id": campaignID.String(),
		},
		Timestamp: time.Now(),
	}
	
	// Add campaign info to data
	event.Data["campaign_id"] = campaignID.String()
	
	// Add action type
	switch eventType {
	case TriggerTypeCampaignStart:
		event.Data["action"] = "started"
	case TriggerTypeCampaignEnd:
		event.Data["action"] = "ended"
	}
	
	return e.EmitEvent(ctx, event)
}

// Helper method to create batch events
func (e *EventEmitter) EmitBatchEvents(ctx context.Context, events []*TriggerEvent) error {
	for _, event := range events {
		if err := e.EmitEvent(ctx, event); err != nil {
			return fmt.Errorf("failed to emit event %s: %w", event.ID, err)
		}
	}
	return nil
}

// Helper method to create event with common fields
func (e *EventEmitter) createBaseEvent(tenantID uuid.UUID, triggerType TriggerType) *TriggerEvent {
	return &TriggerEvent{
		ID:          uuid.New(),
		TenantID:    tenantID,
		TriggerType: triggerType,
		Data:        make(map[string]interface{}),
		Metadata:    make(map[string]interface{}),
		Timestamp:   time.Now(),
	}
}