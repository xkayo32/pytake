package conversations

import (
	"time"
)

// Swagger documentation for Conversations endpoints

// ConversationDoc represents a conversation
// @Description WhatsApp conversation thread
type ConversationDoc struct {
	// Conversation ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Customer phone number
	// example: +5511999999999
	CustomerPhone string `json:"customer_phone" example:"+5511999999999"`
	
	// Customer name
	// example: John Doe
	CustomerName string `json:"customer_name" example:"John Doe"`
	
	// Customer ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	CustomerID string `json:"customer_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Assigned agent ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	AssignedTo string `json:"assigned_to,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Conversation status
	// enum: open,in_progress,waiting,resolved,closed
	// example: open
	Status string `json:"status" example:"open"`
	
	// Priority level
	// enum: low,medium,high,urgent
	// example: medium
	Priority string `json:"priority" example:"medium"`
	
	// Channel
	// example: whatsapp
	Channel string `json:"channel" example:"whatsapp"`
	
	// WhatsApp configuration ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	WhatsAppConfigID string `json:"whatsapp_config_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Department
	// example: support
	Department string `json:"department,omitempty" example:"support"`
	
	// Tags
	// example: ["vip", "billing"]
	Tags []string `json:"tags" example:"[\"vip\", \"billing\"]"`
	
	// First message preview
	// example: Hello, I need help with my order
	FirstMessage string `json:"first_message" example:"Hello, I need help with my order"`
	
	// Last message preview
	// example: Thank you for your help!
	LastMessage string `json:"last_message" example:"Thank you for your help!"`
	
	// Last message time
	// example: 2024-01-15T10:30:00Z
	LastMessageAt string `json:"last_message_at" example:"2024-01-15T10:30:00Z"`
	
	// Unread message count
	// example: 3
	UnreadCount int `json:"unread_count" example:"3"`
	
	// Total message count
	// example: 25
	MessageCount int `json:"message_count" example:"25"`
	
	// AI enabled flag
	// example: true
	AIEnabled bool `json:"ai_enabled" example:"true"`
	
	// Active flow ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ActiveFlowID string `json:"active_flow_id,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Rating
	// example: 4.5
	Rating float32 `json:"rating,omitempty" example:"4.5"`
	
	// Resolution time in minutes
	// example: 45
	ResolutionTime int `json:"resolution_time,omitempty" example:"45"`
	
	// Started at
	// example: 2024-01-15T10:00:00Z
	StartedAt string `json:"started_at" example:"2024-01-15T10:00:00Z"`
	
	// Ended at
	// example: 2024-01-15T10:45:00Z
	EndedAt string `json:"ended_at,omitempty" example:"2024-01-15T10:45:00Z"`
	
	// Creation timestamp
	// example: 2024-01-15T10:00:00Z
	CreatedAt string `json:"created_at" example:"2024-01-15T10:00:00Z"`
	
	// Last update timestamp
	// example: 2024-01-15T10:30:00Z
	UpdatedAt string `json:"updated_at" example:"2024-01-15T10:30:00Z"`
	
	// Messages
	Messages []MessageDoc `json:"messages,omitempty"`
	
	// Contact information
	Contact *ContactDoc `json:"contact,omitempty"`
	
	// Assigned agent information
	Agent *AgentDoc `json:"agent,omitempty"`
	
	// Metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// MessageDoc represents a message in conversation
// @Description Message in a conversation
type MessageDoc struct {
	// Message ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Conversation ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ConversationID string `json:"conversation_id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// WhatsApp message ID
	// example: wamid.123456789
	WhatsAppID string `json:"whatsapp_id" example:"wamid.123456789"`
	
	// Message direction
	// enum: inbound,outbound
	// example: inbound
	Direction string `json:"direction" example:"inbound"`
	
	// Message type
	// enum: text,image,document,audio,video,location,template,button,interactive
	// example: text
	Type string `json:"type" example:"text"`
	
	// Message content
	// example: Hello, how can I help you?
	Content string `json:"content" example:"Hello, how can I help you?"`
	
	// Media URL
	// example: https://example.com/media/image.jpg
	MediaURL string `json:"media_url,omitempty" example:"https://example.com/media/image.jpg"`
	
	// Media type
	// example: image/jpeg
	MediaType string `json:"media_type,omitempty" example:"image/jpeg"`
	
	// Sender type
	// enum: customer,agent,system,bot
	// example: customer
	SenderType string `json:"sender_type" example:"customer"`
	
	// Sender ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	SenderID string `json:"sender_id,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Sender name
	// example: John Doe
	SenderName string `json:"sender_name" example:"John Doe"`
	
	// Delivery status
	// enum: pending,sent,delivered,read,failed
	// example: delivered
	Status string `json:"status" example:"delivered"`
	
	// Error message
	// example: 
	Error string `json:"error,omitempty"`
	
	// Is from me
	// example: false
	IsFromMe bool `json:"is_from_me" example:"false"`
	
	// Read status
	// example: true
	IsRead bool `json:"is_read" example:"true"`
	
	// Reply to message ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ReplyTo string `json:"reply_to,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Quoted message
	QuotedMessage *MessageDoc `json:"quoted_message,omitempty"`
	
	// Timestamp
	// example: 2024-01-15T10:30:00Z
	Timestamp string `json:"timestamp" example:"2024-01-15T10:30:00Z"`
	
	// Metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ContactDoc represents a contact
// @Description Contact information
type ContactDoc struct {
	// Contact ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Phone number
	// example: +5511999999999
	Phone string `json:"phone" example:"+5511999999999"`
	
	// Name
	// example: John Doe
	Name string `json:"name" example:"John Doe"`
	
	// Email
	// example: john.doe@example.com
	Email string `json:"email,omitempty" example:"john.doe@example.com"`
	
	// Profile picture URL
	// example: https://example.com/avatar.jpg
	AvatarURL string `json:"avatar_url,omitempty" example:"https://example.com/avatar.jpg"`
	
	// Tags
	// example: ["vip", "premium"]
	Tags []string `json:"tags" example:"[\"vip\", \"premium\"]"`
	
	// Custom fields
	CustomFields map[string]interface{} `json:"custom_fields,omitempty"`
}

// AgentDoc represents an agent
// @Description Agent information
type AgentDoc struct {
	// Agent ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	ID string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Name
	// example: Jane Smith
	Name string `json:"name" example:"Jane Smith"`
	
	// Email
	// example: jane.smith@example.com
	Email string `json:"email" example:"jane.smith@example.com"`
	
	// Avatar URL
	// example: https://example.com/agent-avatar.jpg
	AvatarURL string `json:"avatar_url,omitempty" example:"https://example.com/agent-avatar.jpg"`
	
	// Department
	// example: support
	Department string `json:"department" example:"support"`
	
	// Status
	// enum: online,offline,busy,away
	// example: online
	Status string `json:"status" example:"online"`
}

// CreateConversationRequestDoc represents conversation creation request
// @Description Create new conversation request
type CreateConversationRequestDoc struct {
	// Customer phone number
	// required: true
	// example: +5511999999999
	CustomerPhone string `json:"customer_phone" binding:"required" example:"+5511999999999"`
	
	// Customer name
	// example: John Doe
	CustomerName string `json:"customer_name,omitempty" example:"John Doe"`
	
	// WhatsApp configuration ID
	// required: true
	// example: 550e8400-e29b-41d4-a716-446655440000
	WhatsAppConfigID string `json:"whatsapp_config_id" binding:"required" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Initial message
	// example: Hello, I need assistance
	InitialMessage string `json:"initial_message,omitempty" example:"Hello, I need assistance"`
	
	// Department
	// example: support
	Department string `json:"department,omitempty" example:"support"`
	
	// Tags
	// example: ["new_customer"]
	Tags []string `json:"tags,omitempty" example:"[\"new_customer\"]"`
	
	// Metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// UpdateConversationRequestDoc represents conversation update request
// @Description Update conversation request
type UpdateConversationRequestDoc struct {
	// Status
	// enum: open,in_progress,waiting,resolved,closed
	// example: in_progress
	Status string `json:"status,omitempty" example:"in_progress"`
	
	// Priority
	// enum: low,medium,high,urgent
	// example: high
	Priority string `json:"priority,omitempty" example:"high"`
	
	// Assigned to agent ID
	// example: 550e8400-e29b-41d4-a716-446655440000
	AssignedTo string `json:"assigned_to,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
	
	// Department
	// example: billing
	Department string `json:"department,omitempty" example:"billing"`
	
	// Tags
	// example: ["resolved", "refund"]
	Tags []string `json:"tags,omitempty" example:"[\"resolved\", \"refund\"]"`
	
	// Notes
	// example: Customer issue resolved with refund
	Notes string `json:"notes,omitempty" example:"Customer issue resolved with refund"`
	
	// Metadata
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// ConversationListResponseDoc represents paginated conversation list
// @Description Paginated list of conversations
type ConversationListResponseDoc struct {
	// Conversations array
	Conversations []ConversationDoc `json:"conversations"`
	
	// Total count
	// example: 150
	Total int64 `json:"total" example:"150"`
	
	// Current page
	// example: 1
	Page int `json:"page" example:"1"`
	
	// Items per page
	// example: 20
	Limit int `json:"limit" example:"20"`
	
	// Has more pages
	// example: true
	HasMore bool `json:"has_more" example:"true"`
}

// ConversationStatsDoc represents conversation statistics
// @Description Conversation statistics
type ConversationStatsDoc struct {
	// Total conversations
	// example: 1500
	Total int64 `json:"total" example:"1500"`
	
	// Open conversations
	// example: 45
	Open int64 `json:"open" example:"45"`
	
	// In progress conversations
	// example: 23
	InProgress int64 `json:"in_progress" example:"23"`
	
	// Waiting conversations
	// example: 12
	Waiting int64 `json:"waiting" example:"12"`
	
	// Resolved conversations
	// example: 1200
	Resolved int64 `json:"resolved" example:"1200"`
	
	// Closed conversations
	// example: 220
	Closed int64 `json:"closed" example:"220"`
	
	// Average resolution time (minutes)
	// example: 35.5
	AvgResolutionTime float64 `json:"avg_resolution_time" example:"35.5"`
	
	// Average rating
	// example: 4.2
	AvgRating float64 `json:"avg_rating" example:"4.2"`
	
	// Today's conversations
	// example: 67
	Today int64 `json:"today" example:"67"`
	
	// This week's conversations
	// example: 312
	ThisWeek int64 `json:"this_week" example:"312"`
	
	// This month's conversations
	// example: 1250
	ThisMonth int64 `json:"this_month" example:"1250"`
}

// GetConversations godoc
// @Summary List conversations
// @Description Get paginated list of conversations with filters
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param status query string false "Filter by status" Enums(open,in_progress,waiting,resolved,closed)
// @Param priority query string false "Filter by priority" Enums(low,medium,high,urgent)
// @Param assigned_to query string false "Filter by assigned agent ID" format(uuid)
// @Param department query string false "Filter by department"
// @Param tag query string false "Filter by tag"
// @Param search query string false "Search in customer name or phone"
// @Param from_date query string false "Filter from date" format(date-time)
// @Param to_date query string false "Filter to date" format(date-time)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20) maximum(100)
// @Param sort query string false "Sort field" default(last_message_at) Enums(created_at,updated_at,last_message_at)
// @Param order query string false "Sort order" default(desc) Enums(asc,desc)
// @Success 200 {object} ConversationListResponseDoc "List of conversations"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations [get]
func GetConversationsDoc() {}

// GetConversation godoc
// @Summary Get conversation
// @Description Get a specific conversation with messages
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Param include_messages query bool false "Include messages" default(true)
// @Param message_limit query int false "Number of messages to include" default(50)
// @Success 200 {object} ConversationDoc "Conversation details"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id} [get]
func GetConversationDoc() {}

// CreateConversation godoc
// @Summary Create conversation
// @Description Create a new conversation
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param conversation body CreateConversationRequestDoc true "Conversation data"
// @Success 201 {object} ConversationDoc "Created conversation"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "WhatsApp config not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations [post]
func CreateConversationDoc() {}

// UpdateConversation godoc
// @Summary Update conversation
// @Description Update conversation details
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Param conversation body UpdateConversationRequestDoc true "Update data"
// @Success 200 {object} ConversationDoc "Updated conversation"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id} [put]
func UpdateConversationDoc() {}

// DeleteConversation godoc
// @Summary Delete conversation
// @Description Delete a conversation and its messages
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Success 204 "Conversation deleted"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id} [delete]
func DeleteConversationDoc() {}

// GetConversationMessages godoc
// @Summary Get conversation messages
// @Description Get messages from a conversation
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(50) maximum(200)
// @Param direction query string false "Filter by direction" Enums(inbound,outbound)
// @Param type query string false "Filter by type" Enums(text,image,document,audio,video)
// @Success 200 {array} MessageDoc "List of messages"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id}/messages [get]
func GetConversationMessagesDoc() {}

// SendConversationMessage godoc
// @Summary Send message in conversation
// @Description Send a message within a conversation
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Param message body SendMessageRequestDoc true "Message data"
// @Success 200 {object} MessageDoc "Sent message"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id}/messages [post]
func SendConversationMessageDoc() {}

// AssignConversation godoc
// @Summary Assign conversation
// @Description Assign conversation to an agent
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Param request body map[string]string true "Assignment data" example({"agent_id":"550e8400-e29b-41d4-a716-446655440000"})
// @Success 200 {object} ConversationDoc "Updated conversation"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation or agent not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id}/assign [post]
func AssignConversationDoc() {}

// TransferConversation godoc
// @Summary Transfer conversation
// @Description Transfer conversation to another department or agent
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Param request body map[string]string true "Transfer data" example({"department":"billing","agent_id":"550e8400-e29b-41d4-a716-446655440000"})
// @Success 200 {object} ConversationDoc "Updated conversation"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id}/transfer [post]
func TransferConversationDoc() {}

// CloseConversation godoc
// @Summary Close conversation
// @Description Close a conversation
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Param request body map[string]interface{} false "Close data" example({"reason":"resolved","notes":"Issue resolved"})
// @Success 200 {object} ConversationDoc "Closed conversation"
// @Failure 400 {object} ErrorResponseDoc "Invalid request"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id}/close [post]
func CloseConversationDoc() {}

// ReopenConversation godoc
// @Summary Reopen conversation
// @Description Reopen a closed conversation
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Param request body map[string]string false "Reopen data" example({"reason":"customer_request"})
// @Success 200 {object} ConversationDoc "Reopened conversation"
// @Failure 400 {object} ErrorResponseDoc "Invalid request or conversation not closed"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id}/reopen [post]
func ReopenConversationDoc() {}

// GetConversationStats godoc
// @Summary Get conversation statistics
// @Description Get statistics about conversations
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param from_date query string false "Start date" format(date)
// @Param to_date query string false "End date" format(date)
// @Param department query string false "Filter by department"
// @Param agent_id query string false "Filter by agent" format(uuid)
// @Success 200 {object} ConversationStatsDoc "Conversation statistics"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/stats [get]
func GetConversationStatsDoc() {}

// MarkMessagesAsRead godoc
// @Summary Mark messages as read
// @Description Mark all messages in a conversation as read
// @Tags Conversations
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Conversation ID" format(uuid)
// @Success 200 {object} map[string]interface{} "Updated count"
// @Failure 401 {object} ErrorResponseDoc "Unauthorized"
// @Failure 404 {object} ErrorResponseDoc "Conversation not found"
// @Failure 500 {object} ErrorResponseDoc "Internal server error"
// @Router /conversations/{id}/read [post]
func MarkMessagesAsReadDoc() {}

// ErrorResponseDoc represents an error response
// @Description Standard error response format
type ErrorResponseDoc struct {
	// Error code
	// example: NOT_FOUND
	Code string `json:"code" example:"NOT_FOUND"`
	
	// Error message
	// example: Conversation not found
	Message string `json:"message" example:"Conversation not found"`
	
	// Additional error details
	Details map[string]interface{} `json:"details,omitempty"`
}

// SendMessageRequestDoc represents message sending request (imported from whatsapp package)
type SendMessageRequestDoc struct {
	// Message content for text messages
	// required: true when type is text
	// example: Hello, how can I help you?
	Content string `json:"content,omitempty" example:"Hello, how can I help you?"`
	
	// Message type
	// enum: text,image,document,audio,video
	// example: text
	Type string `json:"type" example:"text"`
	
	// Media URL for media messages
	// example: https://example.com/image.jpg
	MediaURL string `json:"media_url,omitempty" example:"https://example.com/image.jpg"`
	
	// Caption for media messages
	// example: Check this out!
	Caption string `json:"caption,omitempty" example:"Check this out!"`
}