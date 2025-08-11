package matchers

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/pytake/pytake-go/internal/flow/trigger"
)

// MessageMatcher handles message-based triggers
type MessageMatcher struct{}

// NewMessageMatcher creates a new message matcher
func NewMessageMatcher() *MessageMatcher {
	return &MessageMatcher{}
}

// GetSupportedTypes returns the trigger types this matcher supports
func (m *MessageMatcher) GetSupportedTypes() []trigger.TriggerType {
	return []trigger.TriggerType{
		trigger.TriggerTypeMessageReceived,
		trigger.TriggerTypeKeywordMatch,
		trigger.TriggerTypeButtonClick,
		trigger.TriggerTypeListSelection,
	}
}

// Match checks if an event matches this trigger
func (m *MessageMatcher) Match(ctx context.Context, event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	switch event.TriggerType {
	case trigger.TriggerTypeMessageReceived:
		return m.matchMessageReceived(event, config)
	case trigger.TriggerTypeKeywordMatch:
		return m.matchKeyword(event, config)
	case trigger.TriggerTypeButtonClick:
		return m.matchButtonClick(event, config)
	case trigger.TriggerTypeListSelection:
		return m.matchListSelection(event, config)
	default:
		return nil, fmt.Errorf("unsupported trigger type: %s", event.TriggerType)
	}
}

// Validate validates the trigger configuration
func (m *MessageMatcher) Validate(config *trigger.TriggerConfig) error {
	switch config.Type {
	case trigger.TriggerTypeMessageReceived:
		return m.validateMessageReceived(config)
	case trigger.TriggerTypeKeywordMatch:
		return m.validateKeywordMatch(config)
	case trigger.TriggerTypeButtonClick:
		return m.validateButtonClick(config)
	case trigger.TriggerTypeListSelection:
		return m.validateListSelection(config)
	default:
		return fmt.Errorf("unsupported trigger type: %s", config.Type)
	}
}

// matchMessageReceived matches any message received
func (m *MessageMatcher) matchMessageReceived(event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	// Check if message type filter is specified
	if messageType, exists := config.Conditions["message_type"]; exists {
		eventMessageType, ok := event.Data["message_type"].(string)
		if !ok || eventMessageType != messageType {
			return nil, nil // No match
		}
	}
	
	// Check if sender filter is specified
	if senderType, exists := config.Conditions["sender_type"]; exists {
		eventSenderType, ok := event.Data["sender_type"].(string)
		if !ok || eventSenderType != senderType {
			return nil, nil // No match
		}
	}
	
	// Create match with message data as context
	match := &trigger.TriggerMatch{
		Event:     event,
		Variables: m.extractMessageVariables(event),
		Context:   map[string]interface{}{
			"message": event.Data,
		},
		MatchedAt: event.Timestamp,
	}
	
	return match, nil
}

// matchKeyword matches messages containing specific keywords
func (m *MessageMatcher) matchKeyword(event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	// Get message content
	messageText, ok := event.Data["text"].(string)
	if !ok || messageText == "" {
		return nil, nil // No text content to match
	}
	
	// Get keywords from config
	keywords, exists := config.Conditions["keywords"]
	if !exists {
		return nil, fmt.Errorf("keywords not specified in trigger config")
	}
	
	keywordList, ok := keywords.([]interface{})
	if !ok {
		return nil, fmt.Errorf("keywords must be an array")
	}
	
	// Check matching mode (exact, contains, regex)
	matchMode := "contains" // default
	if mode, exists := config.Conditions["match_mode"]; exists {
		if modeStr, ok := mode.(string); ok {
			matchMode = modeStr
		}
	}
	
	// Case sensitivity
	caseSensitive := false
	if cs, exists := config.Conditions["case_sensitive"]; exists {
		if csBool, ok := cs.(bool); ok {
			caseSensitive = csBool
		}
	}
	
	// Prepare message text for comparison
	compareText := messageText
	if !caseSensitive {
		compareText = strings.ToLower(compareText)
	}
	
	// Check each keyword
	var matchedKeywords []string
	for _, kw := range keywordList {
		keyword, ok := kw.(string)
		if !ok {
			continue
		}
		
		if !caseSensitive {
			keyword = strings.ToLower(keyword)
		}
		
		var matched bool
		switch matchMode {
		case "exact":
			matched = compareText == keyword
		case "contains":
			matched = strings.Contains(compareText, keyword)
		case "regex":
			if regex, err := regexp.Compile(keyword); err == nil {
				matched = regex.MatchString(compareText)
			}
		case "starts_with":
			matched = strings.HasPrefix(compareText, keyword)
		case "ends_with":
			matched = strings.HasSuffix(compareText, keyword)
		}
		
		if matched {
			matchedKeywords = append(matchedKeywords, keyword)
		}
	}
	
	if len(matchedKeywords) == 0 {
		return nil, nil // No keywords matched
	}
	
	// Create match with keyword context
	variables := m.extractMessageVariables(event)
	variables["matched_keywords"] = matchedKeywords
	variables["matched_text"] = messageText
	
	match := &trigger.TriggerMatch{
		Event:     event,
		Variables: variables,
		Context: map[string]interface{}{
			"message":          event.Data,
			"matched_keywords": matchedKeywords,
			"match_mode":       matchMode,
		},
		MatchedAt: event.Timestamp,
	}
	
	return match, nil
}

// matchButtonClick matches button interaction events
func (m *MessageMatcher) matchButtonClick(event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	// Check if it's an interactive message
	messageType, ok := event.Data["message_type"].(string)
	if !ok || messageType != "interactive" {
		return nil, nil // Not an interactive message
	}
	
	// Check if it's a button type
	interactiveType, ok := event.Data["interactive_type"].(string)
	if !ok || interactiveType != "button_reply" {
		return nil, nil // Not a button click
	}
	
	// Get button ID from event
	buttonID, ok := event.Data["button_id"].(string)
	if !ok {
		return nil, nil // No button ID
	}
	
	// Check if specific button IDs are configured
	if targetButtons, exists := config.Conditions["button_ids"]; exists {
		buttonList, ok := targetButtons.([]interface{})
		if !ok {
			return nil, fmt.Errorf("button_ids must be an array")
		}
		
		matched := false
		for _, btn := range buttonList {
			if btnStr, ok := btn.(string); ok && btnStr == buttonID {
				matched = true
				break
			}
		}
		
		if !matched {
			return nil, nil // Button ID doesn't match
		}
	}
	
	// Create match with button context
	variables := m.extractMessageVariables(event)
	variables["button_id"] = buttonID
	if buttonText, ok := event.Data["button_text"].(string); ok {
		variables["button_text"] = buttonText
	}
	
	match := &trigger.TriggerMatch{
		Event:     event,
		Variables: variables,
		Context: map[string]interface{}{
			"message":   event.Data,
			"button_id": buttonID,
		},
		MatchedAt: event.Timestamp,
	}
	
	return match, nil
}

// matchListSelection matches list selection events
func (m *MessageMatcher) matchListSelection(event *trigger.TriggerEvent, config *trigger.TriggerConfig) (*trigger.TriggerMatch, error) {
	// Check if it's an interactive message
	messageType, ok := event.Data["message_type"].(string)
	if !ok || messageType != "interactive" {
		return nil, nil // Not an interactive message
	}
	
	// Check if it's a list type
	interactiveType, ok := event.Data["interactive_type"].(string)
	if !ok || interactiveType != "list_reply" {
		return nil, nil // Not a list selection
	}
	
	// Get list item ID from event
	listItemID, ok := event.Data["list_item_id"].(string)
	if !ok {
		return nil, nil // No list item ID
	}
	
	// Check if specific list items are configured
	if targetItems, exists := config.Conditions["list_item_ids"]; exists {
		itemList, ok := targetItems.([]interface{})
		if !ok {
			return nil, fmt.Errorf("list_item_ids must be an array")
		}
		
		matched := false
		for _, item := range itemList {
			if itemStr, ok := item.(string); ok && itemStr == listItemID {
				matched = true
				break
			}
		}
		
		if !matched {
			return nil, nil // List item ID doesn't match
		}
	}
	
	// Create match with list selection context
	variables := m.extractMessageVariables(event)
	variables["list_item_id"] = listItemID
	if listItemTitle, ok := event.Data["list_item_title"].(string); ok {
		variables["list_item_title"] = listItemTitle
	}
	
	match := &trigger.TriggerMatch{
		Event:     event,
		Variables: variables,
		Context: map[string]interface{}{
			"message":      event.Data,
			"list_item_id": listItemID,
		},
		MatchedAt: event.Timestamp,
	}
	
	return match, nil
}

// extractMessageVariables extracts common variables from message events
func (m *MessageMatcher) extractMessageVariables(event *trigger.TriggerEvent) map[string]interface{} {
	variables := make(map[string]interface{})
	
	// Extract common message fields
	if text, ok := event.Data["text"].(string); ok {
		variables["message_text"] = text
	}
	
	if messageType, ok := event.Data["message_type"].(string); ok {
		variables["message_type"] = messageType
	}
	
	if timestamp, ok := event.Data["timestamp"]; ok {
		variables["message_timestamp"] = timestamp
	}
	
	if phoneNumber, ok := event.Data["from"].(string); ok {
		variables["contact_phone"] = phoneNumber
	}
	
	if contactName, ok := event.Data["contact_name"].(string); ok {
		variables["contact_name"] = contactName
	}
	
	// Add event metadata
	if event.ContactID != nil {
		variables["contact_id"] = event.ContactID.String()
	}
	
	if event.ConversationID != nil {
		variables["conversation_id"] = event.ConversationID.String()
	}
	
	variables["event_id"] = event.ID.String()
	variables["event_timestamp"] = event.Timestamp
	
	return variables
}

// Validation methods

func (m *MessageMatcher) validateMessageReceived(config *trigger.TriggerConfig) error {
	// Optional validations for message type and sender type
	if messageType, exists := config.Conditions["message_type"]; exists {
		if _, ok := messageType.(string); !ok {
			return fmt.Errorf("message_type must be a string")
		}
	}
	
	if senderType, exists := config.Conditions["sender_type"]; exists {
		if _, ok := senderType.(string); !ok {
			return fmt.Errorf("sender_type must be a string")
		}
	}
	
	return nil
}

func (m *MessageMatcher) validateKeywordMatch(config *trigger.TriggerConfig) error {
	keywords, exists := config.Conditions["keywords"]
	if !exists {
		return fmt.Errorf("keywords are required for keyword match trigger")
	}
	
	keywordList, ok := keywords.([]interface{})
	if !ok {
		return fmt.Errorf("keywords must be an array")
	}
	
	if len(keywordList) == 0 {
		return fmt.Errorf("at least one keyword is required")
	}
	
	// Validate each keyword is a string
	for i, kw := range keywordList {
		if _, ok := kw.(string); !ok {
			return fmt.Errorf("keyword at index %d must be a string", i)
		}
	}
	
	// Validate match mode
	if matchMode, exists := config.Conditions["match_mode"]; exists {
		if modeStr, ok := matchMode.(string); ok {
			validModes := []string{"exact", "contains", "regex", "starts_with", "ends_with"}
			valid := false
			for _, validMode := range validModes {
				if modeStr == validMode {
					valid = true
					break
				}
			}
			if !valid {
				return fmt.Errorf("invalid match_mode: %s", modeStr)
			}
		} else {
			return fmt.Errorf("match_mode must be a string")
		}
	}
	
	return nil
}

func (m *MessageMatcher) validateButtonClick(config *trigger.TriggerConfig) error {
	// Optional button IDs validation
	if buttonIDs, exists := config.Conditions["button_ids"]; exists {
		buttonList, ok := buttonIDs.([]interface{})
		if !ok {
			return fmt.Errorf("button_ids must be an array")
		}
		
		for i, btn := range buttonList {
			if _, ok := btn.(string); !ok {
				return fmt.Errorf("button_id at index %d must be a string", i)
			}
		}
	}
	
	return nil
}

func (m *MessageMatcher) validateListSelection(config *trigger.TriggerConfig) error {
	// Optional list item IDs validation
	if listItemIDs, exists := config.Conditions["list_item_ids"]; exists {
		itemList, ok := listItemIDs.([]interface{})
		if !ok {
			return fmt.Errorf("list_item_ids must be an array")
		}
		
		for i, item := range itemList {
			if _, ok := item.(string); !ok {
				return fmt.Errorf("list_item_id at index %d must be a string", i)
			}
		}
	}
	
	return nil
}