package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Campaign represents a marketing campaign
type Campaign struct {
	BaseModel
	TenantModel

	// Basic Information
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	Type        string `gorm:"not null;default:'broadcast'" json:"type"` // broadcast, drip, triggered
	Status      string `gorm:"not null;default:'draft'" json:"status"`   // draft, scheduled, running, paused, completed, cancelled
	
	// Campaign Configuration
	TargetType       string         `gorm:"not null;default:'segment'" json:"target_type"` // segment, contacts, all
	TargetSegmentID  *uuid.UUID     `gorm:"type:uuid;index" json:"target_segment_id,omitempty"`
	TargetContactIDs pq.StringArray `gorm:"type:text[]" json:"target_contact_ids,omitempty"`
	
	// Message Configuration
	MessageTemplateID *uuid.UUID `gorm:"type:uuid;index" json:"message_template_id,omitempty"`
	MessageContent    JSON       `gorm:"type:jsonb" json:"message_content"`
	MessageType       string     `gorm:"default:'text'" json:"message_type"` // text, template, media, interactive
	
	// Scheduling
	ScheduledAt      *time.Time `json:"scheduled_at,omitempty"`
	StartDate        *time.Time `json:"start_date,omitempty"`
	EndDate          *time.Time `json:"end_date,omitempty"`
	Timezone         string     `gorm:"default:'UTC'" json:"timezone"`
	SendingRateLimit int        `gorm:"default:100" json:"sending_rate_limit"` // messages per minute
	
	// Drip Campaign Settings (for type='drip')
	DripInterval     *int    `json:"drip_interval,omitempty"`     // minutes between messages
	DripIntervalType *string `json:"drip_interval_type,omitempty"` // minutes, hours, days, weeks
	MaxMessages      *int    `json:"max_messages,omitempty"`       // max messages per contact
	
	// Triggered Campaign Settings (for type='triggered')
	TriggerEvent     *string `json:"trigger_event,omitempty"`     // contact_created, tag_added, etc.
	TriggerConditions JSON   `gorm:"type:jsonb" json:"trigger_conditions,omitempty"`
	TriggerDelay     *int    `json:"trigger_delay,omitempty"`     // delay in minutes before sending
	
	// Campaign Settings
	Settings JSON `gorm:"type:jsonb" json:"settings"`
	Tags     pq.StringArray `gorm:"type:text[]" json:"tags"`
	
	// Statistics
	TotalTargets    int `gorm:"default:0" json:"total_targets"`
	MessagesSent    int `gorm:"default:0" json:"messages_sent"`
	MessagesDelivered int `gorm:"default:0" json:"messages_delivered"`
	MessagesRead    int `gorm:"default:0" json:"messages_read"`
	MessagesReplied int `gorm:"default:0" json:"messages_replied"`
	MessagesClicked int `gorm:"default:0" json:"messages_clicked"`
	MessagesFailed  int `gorm:"default:0" json:"messages_failed"`
	
	// Campaign Metrics
	DeliveryRate    float64 `gorm:"default:0" json:"delivery_rate"`
	OpenRate        float64 `gorm:"default:0" json:"open_rate"`
	ResponseRate    float64 `gorm:"default:0" json:"response_rate"`
	ClickRate       float64 `gorm:"default:0" json:"click_rate"`
	UnsubscribeRate float64 `gorm:"default:0" json:"unsubscribe_rate"`
	
	// Execution Info
	StartedAt    *time.Time `json:"started_at,omitempty"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	PausedAt     *time.Time `json:"paused_at,omitempty"`
	CancelledAt  *time.Time `json:"cancelled_at,omitempty"`
	ErrorMessage *string    `json:"error_message,omitempty"`
	
	// Metadata
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	
	// Relationships
	TargetSegment    *ContactSegment    `gorm:"foreignKey:TargetSegmentID" json:"target_segment,omitempty"`
	MessageTemplate  *MessageTemplate   `gorm:"foreignKey:MessageTemplateID" json:"message_template,omitempty"`
	CreatedBy        *User              `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	CampaignMessages []*CampaignMessage `gorm:"foreignKey:CampaignID" json:"campaign_messages,omitempty"`
	CampaignAnalytics *CampaignAnalytics `gorm:"foreignKey:CampaignID" json:"campaign_analytics,omitempty"`
}

// TableName returns the table name for Campaign
func (Campaign) TableName() string {
	return "campaigns"
}

// CampaignMessage represents a message sent as part of a campaign
type CampaignMessage struct {
	BaseModel
	TenantModel

	CampaignID     uuid.UUID `gorm:"type:uuid;not null;index" json:"campaign_id"`
	ContactID      uuid.UUID `gorm:"type:uuid;not null;index" json:"contact_id"`
	ConversationID *uuid.UUID `gorm:"type:uuid;index" json:"conversation_id,omitempty"`
	
	// Message Info
	MessageID      *string `gorm:"index" json:"message_id,omitempty"`        // WhatsApp message ID
	MessageType    string  `gorm:"not null" json:"message_type"`
	MessageContent JSON    `gorm:"type:jsonb;not null" json:"message_content"`
	
	// Status and Tracking
	Status           string     `gorm:"not null;default:'pending'" json:"status"` // pending, sent, delivered, read, failed, bounced
	SentAt           *time.Time `json:"sent_at,omitempty"`
	DeliveredAt      *time.Time `json:"delivered_at,omitempty"`
	ReadAt           *time.Time `json:"read_at,omitempty"`
	FailedAt         *time.Time `json:"failed_at,omitempty"`
	ErrorMessage     *string    `json:"error_message,omitempty"`
	
	// Engagement Tracking
	Opened           bool       `gorm:"default:false" json:"opened"`
	Clicked          bool       `gorm:"default:false" json:"clicked"`
	Replied          bool       `gorm:"default:false" json:"replied"`
	RepliedAt        *time.Time `json:"replied_at,omitempty"`
	ClickedAt        *time.Time `json:"clicked_at,omitempty"`
	Unsubscribed     bool       `gorm:"default:false" json:"unsubscribed"`
	UnsubscribedAt   *time.Time `json:"unsubscribed_at,omitempty"`
	
	// Drip Campaign Tracking
	DripSequence     *int `json:"drip_sequence,omitempty"`     // sequence number for drip campaigns
	IsFollowUp       bool `gorm:"default:false" json:"is_follow_up"`
	ParentMessageID  *uuid.UUID `gorm:"type:uuid" json:"parent_message_id,omitempty"`
	
	// Metadata
	Metadata JSON `gorm:"type:jsonb" json:"metadata"`
	
	// Relationships
	Campaign     *Campaign     `gorm:"foreignKey:CampaignID;constraint:OnDelete:CASCADE" json:"campaign,omitempty"`
	Contact      *Contact      `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
	Conversation *Conversation `gorm:"foreignKey:ConversationID" json:"conversation,omitempty"`
	ParentMessage *CampaignMessage `gorm:"foreignKey:ParentMessageID" json:"parent_message,omitempty"`
	ChildMessages []*CampaignMessage `gorm:"foreignKey:ParentMessageID" json:"child_messages,omitempty"`
}

// TableName returns the table name for CampaignMessage
func (CampaignMessage) TableName() string {
	return "campaign_messages"
}

// ContactSegment represents a segment of contacts for targeting
type ContactSegment struct {
	BaseModel
	TenantModel

	// Basic Information
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	Type        string `gorm:"not null;default:'dynamic'" json:"type"` // static, dynamic
	
	// Segmentation Rules (for dynamic segments)
	Rules       JSON `gorm:"type:jsonb" json:"rules"`
	Conditions  JSON `gorm:"type:jsonb" json:"conditions"`
	
	// Static Segment (for static segments)
	ContactIDs  pq.StringArray `gorm:"type:text[]" json:"contact_ids,omitempty"`
	
	// Statistics
	ContactCount        int        `gorm:"default:0" json:"contact_count"`
	LastCalculatedAt    *time.Time `json:"last_calculated_at,omitempty"`
	
	// Settings
	AutoUpdate  bool           `gorm:"default:true" json:"auto_update"` // auto-update dynamic segments
	Tags        pq.StringArray `gorm:"type:text[]" json:"tags"`
	
	// Metadata
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	
	// Relationships
	CreatedBy *User       `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	Campaigns []*Campaign `gorm:"foreignKey:TargetSegmentID" json:"campaigns,omitempty"`
}

// TableName returns the table name for ContactSegment
func (ContactSegment) TableName() string {
	return "contact_segments"
}

// MessageTemplate represents a reusable message template
type MessageTemplate struct {
	BaseModel
	TenantModel

	// Basic Information
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Type        string `gorm:"not null;default:'text'" json:"type"` // text, media, interactive, template
	
	// Template Content
	Content     JSON           `gorm:"type:jsonb;not null" json:"content"`
	Variables   pq.StringArray `gorm:"type:text[]" json:"variables"`          // list of variables used in template
	PreviewText *string        `json:"preview_text,omitempty"`                // preview for UI
	
	// WhatsApp Template Info (for approved templates)
	WhatsAppTemplateID   *string `json:"whatsapp_template_id,omitempty"`
	WhatsAppTemplateName *string `json:"whatsapp_template_name,omitempty"`
	WhatsAppStatus       *string `json:"whatsapp_status,omitempty"`       // pending, approved, rejected
	WhatsAppLanguage     *string `json:"whatsapp_language,omitempty"`
	
	// Template Settings
	RequireApproval bool           `gorm:"default:false" json:"require_approval"`
	IsActive        bool           `gorm:"default:true" json:"is_active"`
	Tags            pq.StringArray `gorm:"type:text[]" json:"tags"`
	
	// Usage Statistics
	UsageCount      int        `gorm:"default:0" json:"usage_count"`
	LastUsedAt      *time.Time `json:"last_used_at,omitempty"`
	
	// Metadata
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	
	// Relationships
	CreatedBy *User       `gorm:"foreignKey:CreatedByID" json:"created_by,omitempty"`
	Campaigns []*Campaign `gorm:"foreignKey:MessageTemplateID" json:"campaigns,omitempty"`
}

// TableName returns the table name for MessageTemplate
func (MessageTemplate) TableName() string {
	return "message_templates"
}

// CampaignAnalytics stores aggregated analytics data for campaigns
type CampaignAnalytics struct {
	BaseModel
	TenantModel

	CampaignID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_campaign_analytics_date" json:"campaign_id"`
	Date       time.Time `gorm:"type:date;not null;uniqueIndex:idx_campaign_analytics_date" json:"date"`
	
	// Daily Metrics
	MessagesSent      int `gorm:"default:0" json:"messages_sent"`
	MessagesDelivered int `gorm:"default:0" json:"messages_delivered"`
	MessagesRead      int `gorm:"default:0" json:"messages_read"`
	MessagesReplied   int `gorm:"default:0" json:"messages_replied"`
	MessagesClicked   int `gorm:"default:0" json:"messages_clicked"`
	MessagesFailed    int `gorm:"default:0" json:"messages_failed"`
	MessagesUnsubscribed int `gorm:"default:0" json:"messages_unsubscribed"`
	
	// Calculated Rates
	DeliveryRate      float64 `gorm:"default:0" json:"delivery_rate"`
	OpenRate          float64 `gorm:"default:0" json:"open_rate"`
	ResponseRate      float64 `gorm:"default:0" json:"response_rate"`
	ClickRate         float64 `gorm:"default:0" json:"click_rate"`
	UnsubscribeRate   float64 `gorm:"default:0" json:"unsubscribe_rate"`
	
	// Engagement Metrics
	UniqueOpeners     int     `gorm:"default:0" json:"unique_openers"`
	UniqueClickers    int     `gorm:"default:0" json:"unique_clickers"`
	UniqueRepliers    int     `gorm:"default:0" json:"unique_repliers"`
	AvgEngagementTime float64 `gorm:"default:0" json:"avg_engagement_time_seconds"`
	
	// Conversion Metrics
	Conversions       int     `gorm:"default:0" json:"conversions"`
	ConversionRate    float64 `gorm:"default:0" json:"conversion_rate"`
	Revenue           float64 `gorm:"default:0" json:"revenue"`
	
	// Additional Data
	Demographics      JSON `gorm:"type:jsonb" json:"demographics"`
	DeviceInfo        JSON `gorm:"type:jsonb" json:"device_info"`
	GeographicData    JSON `gorm:"type:jsonb" json:"geographic_data"`
	
	// Relationships
	Campaign *Campaign `gorm:"foreignKey:CampaignID;constraint:OnDelete:CASCADE" json:"campaign,omitempty"`
}

// TableName returns the table name for CampaignAnalytics
func (CampaignAnalytics) TableName() string {
	return "campaign_analytics"
}

// CampaignEvent stores campaign lifecycle events
type CampaignEvent struct {
	BaseModel
	TenantModel

	CampaignID uuid.UUID `gorm:"type:uuid;not null;index" json:"campaign_id"`
	
	// Event Information
	EventType    string    `gorm:"not null;index" json:"event_type"` // started, paused, resumed, completed, cancelled, error
	EventMessage string    `json:"event_message"`
	EventData    JSON      `gorm:"type:jsonb" json:"event_data"`
	Timestamp    time.Time `gorm:"not null;index" json:"timestamp"`
	
	// User Context
	UserID *uuid.UUID `gorm:"type:uuid" json:"user_id,omitempty"`
	
	// Relationships
	Campaign *Campaign `gorm:"foreignKey:CampaignID;constraint:OnDelete:CASCADE" json:"campaign,omitempty"`
	User     *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// TableName returns the table name for CampaignEvent
func (CampaignEvent) TableName() string {
	return "campaign_events"
}

// CampaignSchedule stores scheduling information for campaigns
type CampaignSchedule struct {
	BaseModel
	TenantModel

	CampaignID uuid.UUID `gorm:"type:uuid;not null;index" json:"campaign_id"`
	
	// Schedule Configuration
	ScheduleType    string    `gorm:"not null" json:"schedule_type"` // immediate, scheduled, recurring
	ExecuteAt       time.Time `gorm:"not null;index" json:"execute_at"`
	Timezone        string    `gorm:"not null" json:"timezone"`
	
	// Recurring Schedule (for recurring campaigns)
	RecurrenceRule  *string `json:"recurrence_rule,omitempty"`  // RRULE format
	RecurrenceEnd   *time.Time `json:"recurrence_end,omitempty"`
	
	// Execution Status
	Status          string     `gorm:"not null;default:'pending'" json:"status"` // pending, executed, failed, cancelled
	ExecutedAt      *time.Time `json:"executed_at,omitempty"`
	ErrorMessage    *string    `json:"error_message,omitempty"`
	
	// Next Execution (for recurring)
	NextExecutionAt *time.Time `json:"next_execution_at,omitempty"`
	ExecutionCount  int        `gorm:"default:0" json:"execution_count"`
	
	// Relationships
	Campaign *Campaign `gorm:"foreignKey:CampaignID;constraint:OnDelete:CASCADE" json:"campaign,omitempty"`
}

// TableName returns the table name for CampaignSchedule
func (CampaignSchedule) TableName() string {
	return "campaign_schedules"
}

// CampaignABTest stores A/B testing configuration and results
type CampaignABTest struct {
	BaseModel
	TenantModel

	CampaignID uuid.UUID `gorm:"type:uuid;not null;index" json:"campaign_id"`
	
	// Test Configuration
	TestName        string  `gorm:"not null" json:"test_name"`
	TestType        string  `gorm:"not null" json:"test_type"`    // message_content, send_time, audience
	ControlGroup    JSON    `gorm:"type:jsonb" json:"control_group"`
	TestGroups      JSON    `gorm:"type:jsonb" json:"test_groups"`
	TrafficSplit    JSON    `gorm:"type:jsonb" json:"traffic_split"` // percentage allocation
	
	// Test Status
	Status          string     `gorm:"not null;default:'draft'" json:"status"` // draft, running, completed, cancelled
	StartedAt       *time.Time `json:"started_at,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	
	// Winner Selection
	WinnerCriteria  string     `json:"winner_criteria"`   // delivery_rate, open_rate, click_rate, conversion_rate
	WinnerGroup     *string    `json:"winner_group,omitempty"`
	WinnerSelectedAt *time.Time `json:"winner_selected_at,omitempty"`
	SignificanceLevel float64  `gorm:"default:0.95" json:"significance_level"`
	
	// Test Results
	Results         JSON `gorm:"type:jsonb" json:"results"`
	
	// Relationships
	Campaign *Campaign `gorm:"foreignKey:CampaignID;constraint:OnDelete:CASCADE" json:"campaign,omitempty"`
}

// TableName returns the table name for CampaignABTest
func (CampaignABTest) TableName() string {
	return "campaign_ab_tests"
}

// CampaignStatus represents campaign status values
type CampaignStatus string

const (
	CampaignStatusDraft     CampaignStatus = "draft"
	CampaignStatusScheduled CampaignStatus = "scheduled"
	CampaignStatusRunning   CampaignStatus = "running"
	CampaignStatusPaused    CampaignStatus = "paused"
	CampaignStatusCompleted CampaignStatus = "completed"
	CampaignStatusCancelled CampaignStatus = "cancelled"
	CampaignStatusFailed    CampaignStatus = "failed"
)

// CampaignType represents campaign types
type CampaignType string

const (
	CampaignTypeBroadcast CampaignType = "broadcast"  // one-time broadcast to audience
	CampaignTypeDrip      CampaignType = "drip"       // sequential messages over time
	CampaignTypeTriggered CampaignType = "triggered"  // triggered by events
	CampaignTypeRecurring CampaignType = "recurring"  // recurring broadcasts
)

// CampaignMessageStatus represents campaign message delivery status
type CampaignMessageStatus string

const (
	CampaignMessageStatusPending   CampaignMessageStatus = "pending"
	CampaignMessageStatusSent      CampaignMessageStatus = "sent"
	CampaignMessageStatusDelivered CampaignMessageStatus = "delivered"
	CampaignMessageStatusRead      CampaignMessageStatus = "read"
	CampaignMessageStatusFailed    CampaignMessageStatus = "failed"
	CampaignMessageStatusBounced   CampaignMessageStatus = "bounced"
)