package matchers

import (
	"context"
	"fmt"
	"strings"

	"github.com/pytake/pytake-go/internal/flow/trigger"
)

// WebhookMatcher handles webhook-based triggers
type WebhookMatcher struct{}

// NewWebhookMatcher creates a new webhook matcher
func NewWebhookMatcher() *WebhookMatcher {
	return &WebhookMatcher{}
}

// GetSupportedTypes returns the trigger types this matcher supports
func (m *WebhookMatcher) GetSupportedTypes() []trigger.TriggerType {
	return []trigger.TriggerType{
		trigger.TriggerTypeWebhook,
		trigger.TriggerTypeAPI,
		trigger.TriggerTypeContactCreated,
		trigger.TriggerTypeContactUpdated,
		trigger.TriggerTypeCustomEvent,
	}
}

// Match checks if an event matches this trigger
func (m *WebhookMatcher) Match(ctx context.Context, event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	switch event.TriggerType {
	case trigger.TriggerTypeWebhook:
		return m.matchWebhook(event, config)
	case trigger.TriggerTypeAPI:
		return m.matchAPI(event, config)
	case trigger.TriggerTypeContactCreated:
		return m.matchContactEvent(event, config, "created")
	case trigger.TriggerTypeContactUpdated:
		return m.matchContactEvent(event, config, "updated")
	case trigger.TriggerTypeCustomEvent:
		return m.matchCustomEvent(event, config)
	default:
		return nil, fmt.Errorf("unsupported trigger type: %s", event.TriggerType)
	}
}

// Validate validates the trigger configuration
func (m *WebhookMatcher) Validate(config *trigger.TriggerConfig) error {
	switch config.Type {
	case trigger.TriggerTypeWebhook:
		return m.validateWebhook(config)
	case trigger.TriggerTypeAPI:
		return m.validateAPI(config)
	case trigger.TriggerTypeContactCreated, trigger.TriggerTypeContactUpdated:
		return m.validateContactEvent(config)
	case trigger.TriggerTypeCustomEvent:
		return m.validateCustomEvent(config)
	default:
		return fmt.Errorf("unsupported trigger type: %s", config.Type)
	}
}

// matchWebhook matches webhook events
func (m *WebhookMatcher) matchWebhook(event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	// Check webhook source if specified
	if webhookSource, exists := config.Conditions["webhook_source"]; exists {
		eventSource, ok := event.Data["source"].(string)
		if !ok || eventSource != webhookSource {
			return nil, nil // Source doesn't match
		}
	}
	
	// Check webhook event type if specified
	if eventType, exists := config.Conditions["event_type"]; exists {
		eventEventType, ok := event.Data["event_type"].(string)
		if !ok || eventEventType != eventType {
			return nil, nil // Event type doesn't match
		}
	}
	
	// Check webhook URL pattern if specified
	if urlPattern, exists := config.Conditions["url_pattern"]; exists {
		eventURL, ok := event.Data["url"].(string)
		if !ok {
			return nil, nil // No URL in event
		}
		
		pattern, ok := urlPattern.(string)
		if !ok {
			return nil, fmt.Errorf("url_pattern must be a string")
		}
		
		if !strings.Contains(eventURL, pattern) {
			return nil, nil // URL pattern doesn't match
		}
	}
	
	// Check custom conditions
	if customConditions, exists := config.Conditions["custom_conditions"]; exists {
		if !m.evaluateCustomConditions(event.Data, customConditions) {
			return nil, nil // Custom conditions not met
		}
	}
	
	// Create match with webhook data
	variables := m.extractWebhookVariables(event)
	
	match := &trigger.TriggerMatch{
		Event:     event,
		Variables: variables,
		Context: map[string]interface{}{
			"webhook_data": event.Data,
		},
		MatchedAt: event.Timestamp,
	}
	
	return match, nil
}

// matchAPI matches API events
func (m *WebhookMatcher) matchAPI(event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	// Check API endpoint if specified
	if endpoint, exists := config.Conditions["endpoint"]; exists {
		eventEndpoint, ok := event.Data["endpoint"].(string)
		if !ok || eventEndpoint != endpoint {
			return nil, nil // Endpoint doesn't match
		}
	}
	
	// Check HTTP method if specified
	if method, exists := config.Conditions["method"]; exists {
		eventMethod, ok := event.Data["method"].(string)
		if !ok || strings.ToUpper(eventMethod) != strings.ToUpper(method.(string)) {
			return nil, nil // Method doesn't match
		}
	}
	
	// Check API key or authentication if specified
	if requiredAuth, exists := config.Conditions["require_auth"]; exists {
		if reqAuth, ok := requiredAuth.(bool); ok && reqAuth {
			if authenticated, ok := event.Data["authenticated"].(bool); !ok || !authenticated {
				return nil, nil // Authentication required but not provided
			}
		}
	}
	
	// Create match with API data
	variables := m.extractAPIVariables(event)
	
	match := &trigger.TriggerMatch{
		Event:     event,
		Variables: variables,
		Context: map[string]interface{}{
			"api_data": event.Data,
		},
		MatchedAt: event.Timestamp,
	}
	
	return match, nil
}

// matchContactEvent matches contact-related events
func (m *WebhookMatcher) matchContactEvent(event *trigger.TriggerEvent, config *trigger.TriggerConfig, expectedAction string) (*trigger.TriggerMatch, error) {
	// Check action type
	action, ok := event.Data["action"].(string)
	if !ok || action != expectedAction {
		return nil, nil // Action doesn't match
	}
	
	// Check contact tags if specified
	if requiredTags, exists := config.Conditions["contact_tags"]; exists {
		tagList, ok := requiredTags.([]interface{})
		if !ok {
			return nil, fmt.Errorf("contact_tags must be an array")
		}
		
		eventTags, ok := event.Data["contact_tags"].([]interface{})
		if !ok {
			eventTags = []interface{}{}
		}
		
		// Check if contact has all required tags
		for _, requiredTag := range tagList {
			found := false
			for _, eventTag := range eventTags {
				if requiredTag == eventTag {
					found = true
					break
				}
			}
			if !found {
				return nil, nil // Required tag not found
			}
		}
	}
	
	// Check contact fields if specified
	if fieldConditions, exists := config.Conditions["contact_fields"]; exists {
		if !m.evaluateContactFields(event.Data, fieldConditions) {
			return nil, nil // Field conditions not met
		}
	}
	
	// Create match with contact data
	variables := m.extractContactVariables(event)
	
	match := &trigger.TriggerMatch{
		Event:     event,
		Variables: variables,
		Context: map[string]interface{}{
			"contact_data": event.Data,
			"action":       action,
		},
		MatchedAt: event.Timestamp,
	}
	
	return match, nil
}

// matchCustomEvent matches custom events
func (m *WebhookMatcher) matchCustomEvent(event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	// Check event name if specified
	if eventName, exists := config.Conditions["event_name"]; exists {
		eventEventName, ok := event.Data["event_name"].(string)
		if !ok || eventEventName != eventName {
			return nil, nil // Event name doesn't match
		}
	}
	
	// Check custom conditions
	if customConditions, exists := config.Conditions["custom_conditions"]; exists {
		if !m.evaluateCustomConditions(event.Data, customConditions) {
			return nil, nil // Custom conditions not met
		}
	}
	
	// Create match with custom event data
	variables := m.extractCustomEventVariables(event)
	
	match := &trigger.TriggerMatch{
		Event:     event,
		Variables: variables,
		Context: map[string]interface{}{
			"custom_event_data": event.Data,
		},
		MatchedAt: event.Timestamp,
	}
	
	return match, nil
}

// Helper methods

// evaluateCustomConditions evaluates custom conditions against event data
func (m *WebhookMatcher) evaluateCustomConditions(eventData map[string]interface{}, conditions interface{}) bool {
	conditionMap, ok := conditions.(map[string]interface{})
	if !ok {
		return false
	}
	
	for field, expectedValue := range conditionMap {
		eventValue, exists := eventData[field]
		if !exists {
			return false
		}
		
		// Simple equality check (can be extended for complex conditions)
		if eventValue != expectedValue {
			return false
		}
	}
	
	return true
}

// evaluateContactFields evaluates contact field conditions
func (m *WebhookMatcher) evaluateContactFields(eventData map[string]interface{}, fieldConditions interface{}) bool {
	conditionMap, ok := fieldConditions.(map[string]interface{})
	if !ok {
		return false
	}
	
	contactData, ok := eventData["contact_data"].(map[string]interface{})
	if !ok {
		return false
	}
	
	for field, expectedValue := range conditionMap {
		fieldValue, exists := contactData[field]
		if !exists {
			return false
		}
		
		if fieldValue != expectedValue {
			return false
		}
	}
	
	return true
}

// Variable extraction methods

func (m *WebhookMatcher) extractWebhookVariables(event *trigger.TriggerEvent) map[string]interface{} {
	variables := make(map[string]interface{})
	
	// Common webhook variables
	if source, ok := event.Data["source"].(string); ok {
		variables["webhook_source"] = source
	}
	
	if eventType, ok := event.Data["event_type"].(string); ok {
		variables["webhook_event_type"] = eventType
	}
	
	if url, ok := event.Data["url"].(string); ok {
		variables["webhook_url"] = url
	}
	
	// Add all webhook data as variables with webhook_ prefix
	for key, value := range event.Data {
		variables["webhook_"+key] = value
	}
	
	m.addCommonVariables(variables, event)
	return variables
}

func (m *WebhookMatcher) extractAPIVariables(event *trigger.TriggerEvent) map[string]interface{} {
	variables := make(map[string]interface{})
	
	// API-specific variables
	if endpoint, ok := event.Data["endpoint"].(string); ok {
		variables["api_endpoint"] = endpoint
	}
	
	if method, ok := event.Data["method"].(string); ok {
		variables["api_method"] = method
	}
	
	if requestBody, ok := event.Data["request_body"]; ok {
		variables["api_request_body"] = requestBody
	}
	
	if headers, ok := event.Data["headers"].(map[string]interface{}); ok {
		variables["api_headers"] = headers
	}
	
	m.addCommonVariables(variables, event)
	return variables
}

func (m *WebhookMatcher) extractContactVariables(event *trigger.TriggerEvent) map[string]interface{} {
	variables := make(map[string]interface{})
	
	// Contact-specific variables
	if contactData, ok := event.Data["contact_data"].(map[string]interface{}); ok {
		for key, value := range contactData {
			variables["contact_"+key] = value
		}
	}
	
	if action, ok := event.Data["action"].(string); ok {
		variables["contact_action"] = action
	}
	
	m.addCommonVariables(variables, event)
	return variables
}

func (m *WebhookMatcher) extractCustomEventVariables(event *trigger.TriggerEvent) map[string]interface{} {
	variables := make(map[string]interface{})
	
	// Custom event variables
	if eventName, ok := event.Data["event_name"].(string); ok {
		variables["custom_event_name"] = eventName
	}
	
	// Add all custom event data
	for key, value := range event.Data {
		if key != "event_name" { // Avoid duplication
			variables["custom_"+key] = value
		}
	}
	
	m.addCommonVariables(variables, event)
	return variables
}

func (m *WebhookMatcher) addCommonVariables(variables map[string]interface{}, event *trigger.TriggerEvent) {
	variables["event_id"] = event.ID.String()
	variables["event_timestamp"] = event.Timestamp
	variables["tenant_id"] = event.TenantID.String()
	
	if event.ContactID != nil {
		variables["contact_id"] = event.ContactID.String()
	}
	
	if event.ConversationID != nil {
		variables["conversation_id"] = event.ConversationID.String()
	}
}

// Validation methods

func (m *WebhookMatcher) validateWebhook(config *trigger.TriggerConfig) error {
	// Optional validation for webhook source
	if webhookSource, exists := config.Conditions["webhook_source"]; exists {
		if _, ok := webhookSource.(string); !ok {
			return fmt.Errorf("webhook_source must be a string")
		}
	}
	
	// Optional validation for event type
	if eventType, exists := config.Conditions["event_type"]; exists {
		if _, ok := eventType.(string); !ok {
			return fmt.Errorf("event_type must be a string")
		}
	}
	
	return nil
}

func (m *WebhookMatcher) validateAPI(config *trigger.TriggerConfig) error {
	// Optional validation for endpoint
	if endpoint, exists := config.Conditions["endpoint"]; exists {
		if _, ok := endpoint.(string); !ok {
			return fmt.Errorf("endpoint must be a string")
		}
	}
	
	// Optional validation for method
	if method, exists := config.Conditions["method"]; exists {
		if methodStr, ok := method.(string); ok {
			validMethods := []string{"GET", "POST", "PUT", "PATCH", "DELETE"}
			valid := false
			for _, validMethod := range validMethods {
				if strings.ToUpper(methodStr) == validMethod {
					valid = true
					break
				}
			}
			if !valid {
				return fmt.Errorf("invalid HTTP method: %s", methodStr)
			}
		} else {
			return fmt.Errorf("method must be a string")
		}
	}
	
	return nil
}

func (m *WebhookMatcher) validateContactEvent(config *trigger.TriggerConfig) error {
	// Optional validation for contact tags
	if contactTags, exists := config.Conditions["contact_tags"]; exists {
		if tagList, ok := contactTags.([]interface{}); ok {
			for i, tag := range tagList {
				if _, ok := tag.(string); !ok {
					return fmt.Errorf("contact tag at index %d must be a string", i)
				}
			}
		} else {
			return fmt.Errorf("contact_tags must be an array")
		}
	}
	
	return nil
}

func (m *WebhookMatcher) validateCustomEvent(config *trigger.TriggerConfig) error {
	// Optional validation for event name
	if eventName, exists := config.Conditions["event_name"]; exists {
		if _, ok := eventName.(string); !ok {
			return fmt.Errorf("event_name must be a string")
		}
	}
	
	return nil
}