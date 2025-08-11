package engine

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// CampaignEngine defines the interface for campaign management and execution
type CampaignEngine interface {
	// Campaign Lifecycle
	CreateCampaign(ctx context.Context, tenantID uuid.UUID, request *CreateCampaignRequest) (*Campaign, error)
	UpdateCampaign(ctx context.Context, tenantID, campaignID uuid.UUID, request *UpdateCampaignRequest) (*Campaign, error)
	DeleteCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error
	GetCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) (*Campaign, error)
	ListCampaigns(ctx context.Context, tenantID uuid.UUID, filter *CampaignFilter) ([]*Campaign, int64, error)
	
	// Campaign Execution
	StartCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error
	PauseCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error
	ResumeCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error
	CancelCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) error
	
	// Scheduling
	ScheduleCampaign(ctx context.Context, tenantID, campaignID uuid.UUID, scheduleAt time.Time) error
	RescheduleCampaign(ctx context.Context, tenantID, campaignID uuid.UUID, newScheduleAt time.Time) error
	
	// Message Processing
	ProcessCampaignMessages(ctx context.Context, campaignID uuid.UUID, batchSize int) error
	SendCampaignMessage(ctx context.Context, campaignID, contactID uuid.UUID) (*CampaignMessage, error)
	
	// Analytics and Tracking
	GetCampaignAnalytics(ctx context.Context, tenantID, campaignID uuid.UUID, dateRange *DateRange) (*CampaignAnalytics, error)
	UpdateMessageStatus(ctx context.Context, messageID uuid.UUID, status MessageDeliveryStatus, timestamp time.Time) error
	TrackMessageEngagement(ctx context.Context, messageID uuid.UUID, engagement *MessageEngagement) error
	
	// A/B Testing
	CreateABTest(ctx context.Context, tenantID, campaignID uuid.UUID, testConfig *ABTestConfig) (*ABTest, error)
	GetABTestResults(ctx context.Context, tenantID, campaignID uuid.UUID, testID uuid.UUID) (*ABTestResults, error)
}

// CampaignScheduler handles campaign scheduling and execution
type CampaignScheduler interface {
	// Scheduling Management
	Start(ctx context.Context) error
	Stop(ctx context.Context) error
	
	// Schedule Operations
	ScheduleCampaign(ctx context.Context, campaign *Campaign, executeAt time.Time) error
	CancelScheduledCampaign(ctx context.Context, campaignID uuid.UUID) error
	RescheduleCompaign(ctx context.Context, campaignID uuid.UUID, newExecuteAt time.Time) error
	
	// Recurring Campaigns
	ScheduleRecurringCampaign(ctx context.Context, campaign *Campaign, recurrenceRule string) error
	
	// Status
	GetScheduledCampaigns(ctx context.Context) ([]*ScheduledCampaign, error)
	GetNextExecutionTime(ctx context.Context, campaignID uuid.UUID) (*time.Time, error)
}

// MessageSender handles sending individual campaign messages
type MessageSender interface {
	// Send Messages
	SendMessage(ctx context.Context, message *CampaignMessage) error
	SendBatch(ctx context.Context, messages []*CampaignMessage) ([]*SendResult, error)
	
	// Rate Limiting
	SetRateLimit(messagesPerSecond int)
	GetRateLimit() int
	
	// Status
	GetSendingStats() *SendingStats
}

// CampaignAnalyzer handles campaign analytics and reporting
type CampaignAnalyzer interface {
	// Analytics Collection
	RecordMessageSent(ctx context.Context, campaignID, contactID uuid.UUID, messageID string) error
	RecordMessageDelivered(ctx context.Context, messageID string, timestamp time.Time) error
	RecordMessageRead(ctx context.Context, messageID string, timestamp time.Time) error
	RecordMessageReplied(ctx context.Context, messageID string, timestamp time.Time) error
	RecordMessageClicked(ctx context.Context, messageID string, url string, timestamp time.Time) error
	RecordMessageFailed(ctx context.Context, messageID string, errorReason string, timestamp time.Time) error
	
	// Analytics Retrieval
	GetCampaignSummary(ctx context.Context, campaignID uuid.UUID) (*CampaignSummary, error)
	GetCampaignMetrics(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*CampaignMetrics, error)
	GetCampaignTrends(ctx context.Context, campaignID uuid.UUID, granularity string) ([]*TrendDataPoint, error)
	
	// Comparison and Benchmarking
	CompareCampaigns(ctx context.Context, campaignIDs []uuid.UUID) (*CampaignComparison, error)
	GetIndustryBenchmarks(ctx context.Context, industry string) (*IndustryBenchmarks, error)
}

// Data Structures

// Campaign represents a marketing campaign
type Campaign struct {
	ID              uuid.UUID      `json:"id"`
	TenantID        uuid.UUID      `json:"tenant_id"`
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	Type            CampaignType   `json:"type"`
	Status          CampaignStatus `json:"status"`
	
	// Targeting
	TargetType      TargetType     `json:"target_type"`
	TargetSegmentID *uuid.UUID     `json:"target_segment_id,omitempty"`
	TargetContactIDs []uuid.UUID   `json:"target_contact_ids,omitempty"`
	
	// Message Configuration
	MessageTemplateID *uuid.UUID         `json:"message_template_id,omitempty"`
	MessageContent    MessageContent     `json:"message_content"`
	MessageType       MessageType        `json:"message_type"`
	
	// Scheduling
	ScheduledAt      *time.Time         `json:"scheduled_at,omitempty"`
	StartDate        *time.Time         `json:"start_date,omitempty"`
	EndDate          *time.Time         `json:"end_date,omitempty"`
	Timezone         string             `json:"timezone"`
	SendingRateLimit int                `json:"sending_rate_limit"`
	
	// Campaign-specific Settings
	DripSettings     *DripCampaignSettings `json:"drip_settings,omitempty"`
	TriggerSettings  *TriggerCampaignSettings `json:"trigger_settings,omitempty"`
	RecurringSettings *RecurringCampaignSettings `json:"recurring_settings,omitempty"`
	
	// General Settings
	Settings         map[string]interface{} `json:"settings"`
	Tags             []string              `json:"tags"`
	
	// Statistics
	TotalTargets     int                   `json:"total_targets"`
	MessagesSent     int                   `json:"messages_sent"`
	MessagesDelivered int                  `json:"messages_delivered"`
	MessagesRead     int                   `json:"messages_read"`
	MessagesReplied  int                   `json:"messages_replied"`
	MessagesClicked  int                   `json:"messages_clicked"`
	MessagesFailed   int                   `json:"messages_failed"`
	
	// Calculated Metrics
	DeliveryRate     float64               `json:"delivery_rate"`
	OpenRate         float64               `json:"open_rate"`
	ResponseRate     float64               `json:"response_rate"`
	ClickRate        float64               `json:"click_rate"`
	UnsubscribeRate  float64               `json:"unsubscribe_rate"`
	
	// Execution Info
	StartedAt        *time.Time            `json:"started_at,omitempty"`
	CompletedAt      *time.Time            `json:"completed_at,omitempty"`
	PausedAt         *time.Time            `json:"paused_at,omitempty"`
	CancelledAt      *time.Time            `json:"cancelled_at,omitempty"`
	ErrorMessage     *string               `json:"error_message,omitempty"`
	
	// Metadata
	CreatedAt        time.Time             `json:"created_at"`
	UpdatedAt        time.Time             `json:"updated_at"`
	CreatedByID      uuid.UUID             `json:"created_by_id"`
}

// CampaignMessage represents a message sent as part of a campaign
type CampaignMessage struct {
	ID               uuid.UUID             `json:"id"`
	CampaignID       uuid.UUID             `json:"campaign_id"`
	ContactID        uuid.UUID             `json:"contact_id"`
	ConversationID   *uuid.UUID            `json:"conversation_id,omitempty"`
	
	// Message Details
	MessageID        *string               `json:"message_id,omitempty"`
	MessageType      MessageType           `json:"message_type"`
	MessageContent   MessageContent        `json:"message_content"`
	
	// Delivery Status
	Status           MessageDeliveryStatus `json:"status"`
	SentAt           *time.Time            `json:"sent_at,omitempty"`
	DeliveredAt      *time.Time            `json:"delivered_at,omitempty"`
	ReadAt           *time.Time            `json:"read_at,omitempty"`
	FailedAt         *time.Time            `json:"failed_at,omitempty"`
	ErrorMessage     *string               `json:"error_message,omitempty"`
	
	// Engagement Tracking
	Opened           bool                  `json:"opened"`
	Clicked          bool                  `json:"clicked"`
	Replied          bool                  `json:"replied"`
	RepliedAt        *time.Time            `json:"replied_at,omitempty"`
	ClickedAt        *time.Time            `json:"clicked_at,omitempty"`
	Unsubscribed     bool                  `json:"unsubscribed"`
	UnsubscribedAt   *time.Time            `json:"unsubscribed_at,omitempty"`
	
	// Drip Campaign Specific
	DripSequence     *int                  `json:"drip_sequence,omitempty"`
	IsFollowUp       bool                  `json:"is_follow_up"`
	ParentMessageID  *uuid.UUID            `json:"parent_message_id,omitempty"`
	
	// Metadata
	Metadata         map[string]interface{} `json:"metadata"`
	CreatedAt        time.Time             `json:"created_at"`
	UpdatedAt        time.Time             `json:"updated_at"`
}

// Enums

// CampaignType represents different types of campaigns
type CampaignType string

const (
	CampaignTypeBroadcast CampaignType = "broadcast"
	CampaignTypeDrip      CampaignType = "drip"
	CampaignTypeTriggered CampaignType = "triggered"
	CampaignTypeRecurring CampaignType = "recurring"
)

// CampaignStatus represents the status of a campaign
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

// TargetType represents how campaign targets are defined
type TargetType string

const (
	TargetTypeSegment  TargetType = "segment"
	TargetTypeContacts TargetType = "contacts"
	TargetTypeAll      TargetType = "all"
)

// MessageType represents the type of message
type MessageType string

const (
	MessageTypeText        MessageType = "text"
	MessageTypeTemplate    MessageType = "template"
	MessageTypeMedia       MessageType = "media"
	MessageTypeInteractive MessageType = "interactive"
)

// MessageDeliveryStatus represents message delivery status
type MessageDeliveryStatus string

const (
	MessageStatusPending   MessageDeliveryStatus = "pending"
	MessageStatusSent      MessageDeliveryStatus = "sent"
	MessageStatusDelivered MessageDeliveryStatus = "delivered"
	MessageStatusRead      MessageDeliveryStatus = "read"
	MessageStatusFailed    MessageDeliveryStatus = "failed"
	MessageStatusBounced   MessageDeliveryStatus = "bounced"
)

// Campaign Settings

// DripCampaignSettings represents settings for drip campaigns
type DripCampaignSettings struct {
	Interval         int    `json:"interval"`          // Time between messages
	IntervalType     string `json:"interval_type"`     // minutes, hours, days, weeks
	MaxMessages      int    `json:"max_messages"`      // Maximum messages per contact
	StopOnReply      bool   `json:"stop_on_reply"`     // Stop drip if contact replies
	StopOnOptOut     bool   `json:"stop_on_opt_out"`   // Stop drip if contact opts out
}

// TriggerCampaignSettings represents settings for triggered campaigns
type TriggerCampaignSettings struct {
	TriggerEvent     string                 `json:"trigger_event"`
	TriggerConditions map[string]interface{} `json:"trigger_conditions"`
	TriggerDelay     int                    `json:"trigger_delay"` // Delay in minutes
	MaxFrequency     *int                   `json:"max_frequency,omitempty"` // Max triggers per contact per day
}

// RecurringCampaignSettings represents settings for recurring campaigns
type RecurringCampaignSettings struct {
	RecurrenceRule   string     `json:"recurrence_rule"` // RRULE format
	RecurrenceEnd    *time.Time `json:"recurrence_end,omitempty"`
	MaxOccurrences   *int       `json:"max_occurrences,omitempty"`
}

// MessageContent represents the content of a message
type MessageContent struct {
	Text         *string                `json:"text,omitempty"`
	MediaURL     *string                `json:"media_url,omitempty"`
	MediaType    *string                `json:"media_type,omitempty"`
	Caption      *string                `json:"caption,omitempty"`
	TemplateID   *string                `json:"template_id,omitempty"`
	TemplateData map[string]interface{} `json:"template_data,omitempty"`
	Interactive  *InteractiveContent    `json:"interactive,omitempty"`
}

// InteractiveContent represents interactive message content
type InteractiveContent struct {
	Type    string      `json:"type"` // buttons, list, etc.
	Header  *string     `json:"header,omitempty"`
	Body    string      `json:"body"`
	Footer  *string     `json:"footer,omitempty"`
	Buttons []Button    `json:"buttons,omitempty"`
	List    *ListMenu   `json:"list,omitempty"`
}

// Button represents an interactive button
type Button struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Type  string `json:"type,omitempty"` // reply, url, phone_number
	URL   *string `json:"url,omitempty"`
	Phone *string `json:"phone,omitempty"`
}

// ListMenu represents an interactive list menu
type ListMenu struct {
	ButtonText string        `json:"button_text"`
	Sections   []ListSection `json:"sections"`
}

// ListSection represents a section in a list menu
type ListSection struct {
	Title string     `json:"title"`
	Rows  []ListRow  `json:"rows"`
}

// ListRow represents a row in a list section
type ListRow struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`
}

// Request/Response Structures

// CreateCampaignRequest represents a request to create a campaign
type CreateCampaignRequest struct {
	Name             string                      `json:"name" validate:"required,min=3,max=255"`
	Description      string                      `json:"description"`
	Type             CampaignType                `json:"type" validate:"required"`
	TargetType       TargetType                  `json:"target_type" validate:"required"`
	TargetSegmentID  *uuid.UUID                  `json:"target_segment_id,omitempty"`
	TargetContactIDs []uuid.UUID                 `json:"target_contact_ids,omitempty"`
	MessageTemplateID *uuid.UUID                 `json:"message_template_id,omitempty"`
	MessageContent   MessageContent              `json:"message_content" validate:"required"`
	MessageType      MessageType                 `json:"message_type" validate:"required"`
	ScheduledAt      *time.Time                  `json:"scheduled_at,omitempty"`
	StartDate        *time.Time                  `json:"start_date,omitempty"`
	EndDate          *time.Time                  `json:"end_date,omitempty"`
	Timezone         string                      `json:"timezone"`
	SendingRateLimit int                         `json:"sending_rate_limit"`
	DripSettings     *DripCampaignSettings       `json:"drip_settings,omitempty"`
	TriggerSettings  *TriggerCampaignSettings    `json:"trigger_settings,omitempty"`
	RecurringSettings *RecurringCampaignSettings `json:"recurring_settings,omitempty"`
	Settings         map[string]interface{}      `json:"settings"`
	Tags             []string                    `json:"tags"`
}

// UpdateCampaignRequest represents a request to update a campaign
type UpdateCampaignRequest struct {
	Name             *string                     `json:"name,omitempty" validate:"omitempty,min=3,max=255"`
	Description      *string                     `json:"description,omitempty"`
	TargetType       *TargetType                 `json:"target_type,omitempty"`
	TargetSegmentID  *uuid.UUID                  `json:"target_segment_id,omitempty"`
	TargetContactIDs []uuid.UUID                 `json:"target_contact_ids,omitempty"`
	MessageTemplateID *uuid.UUID                 `json:"message_template_id,omitempty"`
	MessageContent   *MessageContent             `json:"message_content,omitempty"`
	MessageType      *MessageType                `json:"message_type,omitempty"`
	ScheduledAt      *time.Time                  `json:"scheduled_at,omitempty"`
	StartDate        *time.Time                  `json:"start_date,omitempty"`
	EndDate          *time.Time                  `json:"end_date,omitempty"`
	SendingRateLimit *int                        `json:"sending_rate_limit,omitempty"`
	DripSettings     *DripCampaignSettings       `json:"drip_settings,omitempty"`
	TriggerSettings  *TriggerCampaignSettings    `json:"trigger_settings,omitempty"`
	RecurringSettings *RecurringCampaignSettings `json:"recurring_settings,omitempty"`
	Settings         map[string]interface{}      `json:"settings,omitempty"`
	Tags             []string                    `json:"tags,omitempty"`
}

// CampaignFilter represents filters for campaign queries
type CampaignFilter struct {
	Type        *CampaignType   `json:"type,omitempty"`
	Status      *CampaignStatus `json:"status,omitempty"`
	Search      string          `json:"search,omitempty"`
	Tags        []string        `json:"tags,omitempty"`
	CreatedByID *uuid.UUID      `json:"created_by_id,omitempty"`
	CreatedFrom *time.Time      `json:"created_from,omitempty"`
	CreatedTo   *time.Time      `json:"created_to,omitempty"`
	SortBy      string          `json:"sort_by,omitempty"`
	SortDesc    bool            `json:"sort_desc,omitempty"`
	Limit       int             `json:"limit,omitempty"`
	Offset      int             `json:"offset,omitempty"`
}

// Analytics Structures

// CampaignAnalytics represents analytics data for a campaign
type CampaignAnalytics struct {
	CampaignID       uuid.UUID              `json:"campaign_id"`
	Period           string                 `json:"period"`
	Summary          CampaignSummary        `json:"summary"`
	DailyMetrics     []*DailyMetrics       `json:"daily_metrics"`
	EngagementFunnel EngagementFunnel       `json:"engagement_funnel"`
	Demographics     map[string]interface{} `json:"demographics"`
	DeviceInfo       map[string]interface{} `json:"device_info"`
	GeographicData   map[string]interface{} `json:"geographic_data"`
}

// CampaignSummary represents summary statistics for a campaign
type CampaignSummary struct {
	TotalTargets      int     `json:"total_targets"`
	MessagesSent      int     `json:"messages_sent"`
	MessagesDelivered int     `json:"messages_delivered"`
	MessagesRead      int     `json:"messages_read"`
	MessagesReplied   int     `json:"messages_replied"`
	MessagesClicked   int     `json:"messages_clicked"`
	MessagesFailed    int     `json:"messages_failed"`
	DeliveryRate      float64 `json:"delivery_rate"`
	OpenRate          float64 `json:"open_rate"`
	ResponseRate      float64 `json:"response_rate"`
	ClickRate         float64 `json:"click_rate"`
	UnsubscribeRate   float64 `json:"unsubscribe_rate"`
}

// DailyMetrics represents daily metrics for a campaign
type DailyMetrics struct {
	Date              time.Time `json:"date"`
	MessagesSent      int       `json:"messages_sent"`
	MessagesDelivered int       `json:"messages_delivered"`
	MessagesRead      int       `json:"messages_read"`
	MessagesReplied   int       `json:"messages_replied"`
	MessagesClicked   int       `json:"messages_clicked"`
	MessagesFailed    int       `json:"messages_failed"`
}

// EngagementFunnel represents the engagement funnel for a campaign
type EngagementFunnel struct {
	Sent      FunnelStep `json:"sent"`
	Delivered FunnelStep `json:"delivered"`
	Read      FunnelStep `json:"read"`
	Clicked   FunnelStep `json:"clicked"`
	Replied   FunnelStep `json:"replied"`
}

// FunnelStep represents a step in the engagement funnel
type FunnelStep struct {
	Count      int     `json:"count"`
	Rate       float64 `json:"rate"`
	DropoffRate float64 `json:"dropoff_rate"`
}

// CampaignMetrics represents detailed metrics for a campaign
type CampaignMetrics struct {
	CampaignID    uuid.UUID         `json:"campaign_id"`
	DateRange     DateRange         `json:"date_range"`
	Summary       CampaignSummary   `json:"summary"`
	Trends        []*TrendDataPoint `json:"trends"`
	Segmentation  []SegmentMetrics  `json:"segmentation"`
}

// TrendDataPoint represents a data point in campaign trends
type TrendDataPoint struct {
	Timestamp         time.Time `json:"timestamp"`
	MessagesSent      int       `json:"messages_sent"`
	MessagesDelivered int       `json:"messages_delivered"`
	MessagesRead      int       `json:"messages_read"`
	MessagesReplied   int       `json:"messages_replied"`
	DeliveryRate      float64   `json:"delivery_rate"`
	OpenRate          float64   `json:"open_rate"`
	ResponseRate      float64   `json:"response_rate"`
}

// SegmentMetrics represents metrics for different segments
type SegmentMetrics struct {
	SegmentName  string          `json:"segment_name"`
	SegmentValue string          `json:"segment_value"`
	Count        int             `json:"count"`
	Summary      CampaignSummary `json:"summary"`
}

// CampaignComparison represents comparison between campaigns
type CampaignComparison struct {
	Campaigns []CampaignComparisonItem `json:"campaigns"`
	Benchmark *IndustryBenchmarks      `json:"benchmark,omitempty"`
}

// CampaignComparisonItem represents a campaign in comparison
type CampaignComparisonItem struct {
	CampaignID   uuid.UUID       `json:"campaign_id"`
	CampaignName string          `json:"campaign_name"`
	Summary      CampaignSummary `json:"summary"`
	Ranking      int             `json:"ranking"`
}

// IndustryBenchmarks represents industry benchmarks
type IndustryBenchmarks struct {
	Industry          string  `json:"industry"`
	AvgDeliveryRate   float64 `json:"avg_delivery_rate"`
	AvgOpenRate       float64 `json:"avg_open_rate"`
	AvgClickRate      float64 `json:"avg_click_rate"`
	AvgResponseRate   float64 `json:"avg_response_rate"`
	AvgUnsubscribeRate float64 `json:"avg_unsubscribe_rate"`
}

// Scheduling Structures

// ScheduledCampaign represents a scheduled campaign
type ScheduledCampaign struct {
	CampaignID   uuid.UUID `json:"campaign_id"`
	CampaignName string    `json:"campaign_name"`
	ExecuteAt    time.Time `json:"execute_at"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

// DateRange represents a date range
type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// MessageEngagement represents message engagement data
type MessageEngagement struct {
	Type      string                 `json:"type"`      // opened, clicked, replied
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// SendResult represents the result of sending a message
type SendResult struct {
	MessageID uuid.UUID `json:"message_id"`
	Success   bool      `json:"success"`
	Error     *string   `json:"error,omitempty"`
	SentAt    time.Time `json:"sent_at"`
}

// SendingStats represents statistics about message sending
type SendingStats struct {
	MessagesPerSecond    float64   `json:"messages_per_second"`
	TotalMessagesSent    int64     `json:"total_messages_sent"`
	SuccessfulSends      int64     `json:"successful_sends"`
	FailedSends          int64     `json:"failed_sends"`
	QueueSize            int       `json:"queue_size"`
	LastMessageSentAt    time.Time `json:"last_message_sent_at"`
	RateLimitExceeded    int64     `json:"rate_limit_exceeded"`
}

// A/B Testing Structures

// ABTestConfig represents A/B test configuration
type ABTestConfig struct {
	TestName       string                 `json:"test_name"`
	TestType       string                 `json:"test_type"`
	ControlGroup   ABTestGroup            `json:"control_group"`
	TestGroups     []ABTestGroup          `json:"test_groups"`
	TrafficSplit   map[string]float64     `json:"traffic_split"`
	WinnerCriteria string                 `json:"winner_criteria"`
	MinSampleSize  int                    `json:"min_sample_size"`
	Duration       time.Duration          `json:"duration"`
	Settings       map[string]interface{} `json:"settings"`
}

// ABTestGroup represents a group in an A/B test
type ABTestGroup struct {
	Name           string         `json:"name"`
	MessageContent MessageContent `json:"message_content"`
	Settings       map[string]interface{} `json:"settings"`
}

// ABTest represents an A/B test
type ABTest struct {
	ID             uuid.UUID      `json:"id"`
	CampaignID     uuid.UUID      `json:"campaign_id"`
	Config         ABTestConfig   `json:"config"`
	Status         string         `json:"status"`
	StartedAt      *time.Time     `json:"started_at,omitempty"`
	CompletedAt    *time.Time     `json:"completed_at,omitempty"`
	WinnerGroup    *string        `json:"winner_group,omitempty"`
	Results        *ABTestResults `json:"results,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

// ABTestResults represents the results of an A/B test
type ABTestResults struct {
	TestID         uuid.UUID               `json:"test_id"`
	Status         string                  `json:"status"`
	Winner         *string                 `json:"winner,omitempty"`
	Confidence     float64                 `json:"confidence"`
	GroupResults   []ABTestGroupResults    `json:"group_results"`
	StatisticalData map[string]interface{} `json:"statistical_data"`
	CompletedAt    time.Time               `json:"completed_at"`
}

// ABTestGroupResults represents results for a test group
type ABTestGroupResults struct {
	GroupName        string          `json:"group_name"`
	SampleSize       int             `json:"sample_size"`
	Summary          CampaignSummary `json:"summary"`
	PerformanceScore float64         `json:"performance_score"`
	IsWinner         bool            `json:"is_winner"`
}