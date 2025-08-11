package nodes

import (
	"context"
	"fmt"

	"github.com/pytake/pytake-go/internal/flow/engine"
)

// MessageNode sends a WhatsApp message
type MessageNode struct {
	*BaseNode
}

// MessageType defines the type of message to send
type MessageType string

const (
	MessageTypeText     MessageType = "text"
	MessageTypeImage    MessageType = "image"
	MessageTypeDocument MessageType = "document"
	MessageTypeAudio    MessageType = "audio"
	MessageTypeVideo    MessageType = "video"
	MessageTypeTemplate MessageType = "template"
	MessageTypeButton   MessageType = "button"
	MessageTypeList     MessageType = "list"
)

// MessageConfig represents the configuration for a message node
type MessageConfig struct {
	MessageType MessageType               `json:"message_type"`
	Text        string                    `json:"text"`
	MediaURL    string                    `json:"media_url,omitempty"`
	Caption     string                    `json:"caption,omitempty"`
	Template    *TemplateConfig           `json:"template,omitempty"`
	Buttons     []ButtonConfig            `json:"buttons,omitempty"`
	ListItems   []ListItemConfig          `json:"list_items,omitempty"`
	Variables   map[string]interface{}    `json:"variables,omitempty"`
	Metadata    map[string]interface{}    `json:"metadata,omitempty"`
}

// TemplateConfig represents WhatsApp template message configuration
type TemplateConfig struct {
	Name       string                    `json:"name"`
	Language   string                    `json:"language"`
	Components []TemplateComponent       `json:"components,omitempty"`
}

// TemplateComponent represents a component in a WhatsApp template
type TemplateComponent struct {
	Type       string                    `json:"type"`
	Parameters []TemplateParameter       `json:"parameters,omitempty"`
}

// TemplateParameter represents a parameter in a template component
type TemplateParameter struct {
	Type string      `json:"type"`
	Text string      `json:"text,omitempty"`
	URL  string      `json:"url,omitempty"`
}

// ButtonConfig represents a button in an interactive message
type ButtonConfig struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Type  string `json:"type"` // reply, url, phone
	URL   string `json:"url,omitempty"`
	Phone string `json:"phone,omitempty"`
}

// ListItemConfig represents an item in a list message
type ListItemConfig struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
}

// NewMessageNode creates a new message node
func NewMessageNode(config map[string]interface{}) (engine.FlowNode, error) {
	base := NewBaseNode(engine.NodeTypeMessage, config)
	node := &MessageNode{
		BaseNode: base,
	}
	
	if err := node.Validate(); err != nil {
		return nil, err
	}
	
	return node, nil
}

// Execute executes the message node
func (n *MessageNode) Execute(ctx context.Context, execCtx *engine.ExecutionContext) (*engine.NodeResult, error) {
	n.LogExecution(execCtx, "Executing message node")
	
	// Parse message configuration
	messageConfig, err := n.parseMessageConfig()
	if err != nil {
		n.LogError(execCtx, "Failed to parse message config", err)
		return nil, engine.NewNodeError(n.ID, fmt.Sprintf("invalid message configuration: %v", err))
	}
	
	// Interpolate variables in message content
	if err := n.interpolateMessageVariables(messageConfig, execCtx); err != nil {
		n.LogError(execCtx, "Failed to interpolate message variables", err)
		return nil, engine.NewNodeError(n.ID, fmt.Sprintf("variable interpolation failed: %v", err))
	}
	
	// Prepare message data for WhatsApp service
	messageData := n.prepareMessageData(messageConfig, execCtx)
	
	// Send message via WhatsApp service
	if execCtx.Services.WhatsAppService != nil {
		if err := execCtx.Services.WhatsAppService.SendMessage(ctx, messageData); err != nil {
			n.LogError(execCtx, "Failed to send WhatsApp message", err)
			return nil, engine.NewNodeError(n.ID, fmt.Sprintf("failed to send message: %v", err))
		}
	}
	
	n.LogExecution(execCtx, "Message sent successfully", "type", messageConfig.MessageType)
	
	// Update variables
	variables := make(map[string]interface{})
	variables["last_message_type"] = string(messageConfig.MessageType)
	variables["last_message_sent_at"] = execCtx.LastActivity
	
	// Get next node
	nextNodeID := n.GetNextNodeID(nil, "")
	if nextNodeID == "" && len(n.NextNodes) > 0 {
		nextNodeID = n.NextNodes[0]
	}
	
	return &engine.NodeResult{
		Success:    true,
		NextNodeID: nextNodeID,
		Variables:  variables,
		Message:    "Message sent successfully",
		Metadata: map[string]interface{}{
			"message_type": string(messageConfig.MessageType),
			"text_length":  len(messageConfig.Text),
		},
	}, nil
}

// Validate validates the message node configuration
func (n *MessageNode) Validate() error {
	if err := n.BaseNode.Validate(); err != nil {
		return err
	}
	
	// Validate message type
	messageType := n.GetConfigString("message_type", "")
	if messageType == "" {
		return engine.NewValidationError("message_type is required")
	}
	
	// Validate based on message type
	switch MessageType(messageType) {
	case MessageTypeText:
		if n.GetConfigString("text", "") == "" {
			return engine.NewValidationError("text is required for text messages")
		}
	case MessageTypeImage, MessageTypeDocument, MessageTypeAudio, MessageTypeVideo:
		if n.GetConfigString("media_url", "") == "" {
			return engine.NewValidationError("media_url is required for media messages")
		}
	case MessageTypeTemplate:
		template := n.GetConfigMap("template")
		if len(template) == 0 {
			return engine.NewValidationError("template configuration is required for template messages")
		}
		if template["name"] == "" {
			return engine.NewValidationError("template name is required")
		}
	case MessageTypeButton:
		buttons := n.GetConfigArray("buttons")
		if len(buttons) == 0 {
			return engine.NewValidationError("buttons are required for button messages")
		}
	case MessageTypeList:
		listItems := n.GetConfigArray("list_items")
		if len(listItems) == 0 {
			return engine.NewValidationError("list_items are required for list messages")
		}
	default:
		return engine.NewValidationError(fmt.Sprintf("unsupported message type: %s", messageType))
	}
	
	return nil
}

// parseMessageConfig parses the node configuration into MessageConfig
func (n *MessageNode) parseMessageConfig() (*MessageConfig, error) {
	config := &MessageConfig{
		MessageType: MessageType(n.GetConfigString("message_type", "")),
		Text:        n.GetConfigString("text", ""),
		MediaURL:    n.GetConfigString("media_url", ""),
		Caption:     n.GetConfigString("caption", ""),
		Variables:   n.GetConfigMap("variables"),
		Metadata:    n.GetConfigMap("metadata"),
	}
	
	// Parse template configuration
	if templateConfig := n.GetConfigMap("template"); len(templateConfig) > 0 {
		template := &TemplateConfig{
			Name:     fmt.Sprintf("%v", templateConfig["name"]),
			Language: fmt.Sprintf("%v", templateConfig["language"]),
		}
		
		if components, ok := templateConfig["components"].([]interface{}); ok {
			for _, comp := range components {
				if compMap, ok := comp.(map[string]interface{}); ok {
					component := TemplateComponent{
						Type: fmt.Sprintf("%v", compMap["type"]),
					}
					
					if params, ok := compMap["parameters"].([]interface{}); ok {
						for _, param := range params {
							if paramMap, ok := param.(map[string]interface{}); ok {
								parameter := TemplateParameter{
									Type: fmt.Sprintf("%v", paramMap["type"]),
									Text: fmt.Sprintf("%v", paramMap["text"]),
									URL:  fmt.Sprintf("%v", paramMap["url"]),
								}
								component.Parameters = append(component.Parameters, parameter)
							}
						}
					}
					
					template.Components = append(template.Components, component)
				}
			}
		}
		
		config.Template = template
	}
	
	// Parse buttons
	if buttonsArray := n.GetConfigArray("buttons"); len(buttonsArray) > 0 {
		for _, btn := range buttonsArray {
			if btnMap, ok := btn.(map[string]interface{}); ok {
				button := ButtonConfig{
					ID:    fmt.Sprintf("%v", btnMap["id"]),
					Title: fmt.Sprintf("%v", btnMap["title"]),
					Type:  fmt.Sprintf("%v", btnMap["type"]),
					URL:   fmt.Sprintf("%v", btnMap["url"]),
					Phone: fmt.Sprintf("%v", btnMap["phone"]),
				}
				config.Buttons = append(config.Buttons, button)
			}
		}
	}
	
	// Parse list items
	if listArray := n.GetConfigArray("list_items"); len(listArray) > 0 {
		for _, item := range listArray {
			if itemMap, ok := item.(map[string]interface{}); ok {
				listItem := ListItemConfig{
					ID:          fmt.Sprintf("%v", itemMap["id"]),
					Title:       fmt.Sprintf("%v", itemMap["title"]),
					Description: fmt.Sprintf("%v", itemMap["description"]),
				}
				config.ListItems = append(config.ListItems, listItem)
			}
		}
	}
	
	return config, nil
}

// interpolateMessageVariables interpolates variables in message content
func (n *MessageNode) interpolateMessageVariables(config *MessageConfig, execCtx *engine.ExecutionContext) error {
	// Interpolate text
	config.Text = n.InterpolateString(config.Text, execCtx)
	
	// Interpolate caption
	config.Caption = n.InterpolateString(config.Caption, execCtx)
	
	// Interpolate media URL
	config.MediaURL = n.InterpolateString(config.MediaURL, execCtx)
	
	// Interpolate template parameters
	if config.Template != nil {
		for i := range config.Template.Components {
			for j := range config.Template.Components[i].Parameters {
				config.Template.Components[i].Parameters[j].Text = 
					n.InterpolateString(config.Template.Components[i].Parameters[j].Text, execCtx)
				config.Template.Components[i].Parameters[j].URL = 
					n.InterpolateString(config.Template.Components[i].Parameters[j].URL, execCtx)
			}
		}
	}
	
	// Interpolate button titles and URLs
	for i := range config.Buttons {
		config.Buttons[i].Title = n.InterpolateString(config.Buttons[i].Title, execCtx)
		config.Buttons[i].URL = n.InterpolateString(config.Buttons[i].URL, execCtx)
	}
	
	// Interpolate list item titles and descriptions
	for i := range config.ListItems {
		config.ListItems[i].Title = n.InterpolateString(config.ListItems[i].Title, execCtx)
		config.ListItems[i].Description = n.InterpolateString(config.ListItems[i].Description, execCtx)
	}
	
	return nil
}

// prepareMessageData prepares the message data for the WhatsApp service
func (n *MessageNode) prepareMessageData(config *MessageConfig, execCtx *engine.ExecutionContext) map[string]interface{} {
	messageData := map[string]interface{}{
		"tenant_id": execCtx.TenantID,
		"type":      string(config.MessageType),
	}
	
	// Add recipient information
	if execCtx.ContactID != nil {
		messageData["contact_id"] = *execCtx.ContactID
	}
	if execCtx.ConversationID != nil {
		messageData["conversation_id"] = *execCtx.ConversationID
	}
	
	// Add message content based on type
	switch config.MessageType {
	case MessageTypeText:
		messageData["text"] = config.Text
		
	case MessageTypeImage, MessageTypeDocument, MessageTypeAudio, MessageTypeVideo:
		messageData["media_url"] = config.MediaURL
		if config.Caption != "" {
			messageData["caption"] = config.Caption
		}
		
	case MessageTypeTemplate:
		messageData["template"] = map[string]interface{}{
			"name":       config.Template.Name,
			"language":   config.Template.Language,
			"components": config.Template.Components,
		}
		
	case MessageTypeButton:
		messageData["text"] = config.Text
		messageData["buttons"] = config.Buttons
		
	case MessageTypeList:
		messageData["text"] = config.Text
		messageData["list_items"] = config.ListItems
	}
	
	// Add metadata
	if config.Metadata != nil {
		messageData["metadata"] = config.Metadata
	}
	
	// Add flow execution context
	messageData["flow_execution"] = map[string]interface{}{
		"execution_id": execCtx.ExecutionID,
		"flow_id":      execCtx.FlowID,
		"node_id":      n.ID,
	}
	
	return messageData
}