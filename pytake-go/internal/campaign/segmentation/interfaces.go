package segmentation

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// SegmentationEngine defines the interface for contact segmentation
type SegmentationEngine interface {
	// Segment Management
	CreateSegment(ctx context.Context, tenantID uuid.UUID, request *CreateSegmentRequest) (*ContactSegment, error)
	UpdateSegment(ctx context.Context, tenantID, segmentID uuid.UUID, request *UpdateSegmentRequest) (*ContactSegment, error)
	DeleteSegment(ctx context.Context, tenantID, segmentID uuid.UUID) error
	GetSegment(ctx context.Context, tenantID, segmentID uuid.UUID) (*ContactSegment, error)
	ListSegments(ctx context.Context, tenantID uuid.UUID, filter *SegmentFilter) ([]*ContactSegment, int64, error)
	
	// Segment Calculation
	CalculateSegment(ctx context.Context, tenantID, segmentID uuid.UUID) ([]uuid.UUID, error)
	RefreshSegment(ctx context.Context, tenantID, segmentID uuid.UUID) error
	RefreshAllSegments(ctx context.Context, tenantID uuid.UUID) error
	
	// Contact Querying
	GetContactsInSegment(ctx context.Context, tenantID, segmentID uuid.UUID, pagination *Pagination) ([]*ContactInfo, int64, error)
	CheckContactInSegment(ctx context.Context, tenantID, segmentID, contactID uuid.UUID) (bool, error)
	GetSegmentsForContact(ctx context.Context, tenantID, contactID uuid.UUID) ([]*ContactSegment, error)
	
	// Dynamic Querying
	QueryContacts(ctx context.Context, tenantID uuid.UUID, rules *SegmentationRules) ([]uuid.UUID, error)
	ValidateRules(ctx context.Context, rules *SegmentationRules) (*ValidationResult, error)
	EstimateSegmentSize(ctx context.Context, tenantID uuid.UUID, rules *SegmentationRules) (int, error)
}

// RuleEngine defines the interface for processing segmentation rules
type RuleEngine interface {
	// Rule Processing
	EvaluateRules(ctx context.Context, tenantID uuid.UUID, contactID uuid.UUID, rules *SegmentationRules) (bool, error)
	EvaluateCondition(ctx context.Context, tenantID uuid.UUID, contactID uuid.UUID, condition *SegmentCondition) (bool, error)
	
	// Rule Validation
	ValidateCondition(condition *SegmentCondition) error
	ValidateRules(rules *SegmentationRules) error
	
	// Supported Operations
	GetSupportedFields() []FieldDefinition
	GetSupportedOperators(fieldType string) []OperatorDefinition
}

// Data Structures

// ContactSegment represents a contact segment
type ContactSegment struct {
	ID                  uuid.UUID          `json:"id"`
	TenantID            uuid.UUID          `json:"tenant_id"`
	Name                string             `json:"name"`
	Description         string             `json:"description"`
	Type                SegmentType        `json:"type"`
	Rules               *SegmentationRules `json:"rules,omitempty"`
	ContactIDs          []uuid.UUID        `json:"contact_ids,omitempty"`
	ContactCount        int                `json:"contact_count"`
	LastCalculatedAt    *time.Time         `json:"last_calculated_at,omitempty"`
	AutoUpdate          bool               `json:"auto_update"`
	Tags                []string           `json:"tags"`
	CreatedAt           time.Time          `json:"created_at"`
	UpdatedAt           time.Time          `json:"updated_at"`
	CreatedByID         uuid.UUID          `json:"created_by_id"`
}

// SegmentType represents the type of segment
type SegmentType string

const (
	SegmentTypeStatic  SegmentType = "static"  // manually defined list of contacts
	SegmentTypeDynamic SegmentType = "dynamic" // rule-based segment
)

// SegmentationRules represents a set of rules for segmentation
type SegmentationRules struct {
	Operator   LogicalOperator    `json:"operator"` // AND, OR
	Conditions []*SegmentCondition `json:"conditions"`
	Groups     []*SegmentationRules `json:"groups,omitempty"` // nested rule groups
}

// SegmentCondition represents a single segmentation condition
type SegmentCondition struct {
	Field    string      `json:"field"`    // contact field to check
	Operator string      `json:"operator"` // comparison operator
	Value    interface{} `json:"value"`    // value to compare against
	
	// Advanced options
	CaseSensitive *bool `json:"case_sensitive,omitempty"`
	DateRange     *DateRangeValue `json:"date_range,omitempty"`
	NumberRange   *NumberRangeValue `json:"number_range,omitempty"`
	ListOptions   *ListConditionOptions `json:"list_options,omitempty"`
}

// LogicalOperator represents logical operators
type LogicalOperator string

const (
	LogicalOperatorAND LogicalOperator = "AND"
	LogicalOperatorOR  LogicalOperator = "OR"
)

// Common condition values
type DateRangeValue struct {
	From *time.Time `json:"from,omitempty"`
	To   *time.Time `json:"to,omitempty"`
}

type NumberRangeValue struct {
	Min *float64 `json:"min,omitempty"`
	Max *float64 `json:"max,omitempty"`
}

type ListConditionOptions struct {
	Values      []interface{} `json:"values"`
	MatchAny    bool          `json:"match_any"`    // true = match any, false = match all
	MatchExact  bool          `json:"match_exact"`  // exact match vs contains
}

// Field and Operator Definitions

// FieldDefinition represents a field that can be used in segmentation
type FieldDefinition struct {
	Name        string      `json:"name"`
	DisplayName string      `json:"display_name"`
	Type        string      `json:"type"` // string, number, boolean, date, array
	Description string      `json:"description"`
	Options     []FieldOption `json:"options,omitempty"` // for enum fields
}

type FieldOption struct {
	Value       interface{} `json:"value"`
	DisplayName string      `json:"display_name"`
}

// OperatorDefinition represents an operator that can be used with a field type
type OperatorDefinition struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	ValueType   string `json:"value_type"` // single, range, list, none
}

// Request/Response Structures

// CreateSegmentRequest represents a request to create a segment
type CreateSegmentRequest struct {
	Name        string             `json:"name" validate:"required,min=3,max=255"`
	Description string             `json:"description"`
	Type        SegmentType        `json:"type" validate:"required"`
	Rules       *SegmentationRules `json:"rules,omitempty"`
	ContactIDs  []uuid.UUID        `json:"contact_ids,omitempty"`
	AutoUpdate  bool               `json:"auto_update"`
	Tags        []string           `json:"tags"`
}

// UpdateSegmentRequest represents a request to update a segment
type UpdateSegmentRequest struct {
	Name        *string            `json:"name,omitempty" validate:"omitempty,min=3,max=255"`
	Description *string            `json:"description,omitempty"`
	Rules       *SegmentationRules `json:"rules,omitempty"`
	ContactIDs  []uuid.UUID        `json:"contact_ids,omitempty"`
	AutoUpdate  *bool              `json:"auto_update,omitempty"`
	Tags        []string           `json:"tags,omitempty"`
}

// SegmentFilter represents filters for listing segments
type SegmentFilter struct {
	Type        *SegmentType `json:"type,omitempty"`
	Search      string       `json:"search,omitempty"`
	Tags        []string     `json:"tags,omitempty"`
	CreatedByID *uuid.UUID   `json:"created_by_id,omitempty"`
	CreatedFrom *time.Time   `json:"created_from,omitempty"`
	CreatedTo   *time.Time   `json:"created_to,omitempty"`
	AutoUpdate  *bool        `json:"auto_update,omitempty"`
	SortBy      string       `json:"sort_by,omitempty"`
	SortDesc    bool         `json:"sort_desc,omitempty"`
}

// ContactInfo represents basic contact information for segments
type ContactInfo struct {
	ID            uuid.UUID              `json:"id"`
	Name          string                 `json:"name"`
	PhoneNumber   string                 `json:"phone_number"`
	Email         *string                `json:"email,omitempty"`
	Tags          []string               `json:"tags"`
	CustomFields  map[string]interface{} `json:"custom_fields"`
	CreatedAt     time.Time              `json:"created_at"`
	LastMessageAt *time.Time             `json:"last_message_at,omitempty"`
	IsActive      bool                   `json:"is_active"`
}

// Pagination represents pagination parameters
type Pagination struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// ValidationResult represents the result of rule validation
type ValidationResult struct {
	IsValid bool             `json:"is_valid"`
	Errors  []ValidationError `json:"errors,omitempty"`
	Warnings []ValidationWarning `json:"warnings,omitempty"`
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ValidationWarning represents a validation warning
type ValidationWarning struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Segment Statistics

// SegmentStatistics represents statistics for a segment
type SegmentStatistics struct {
	SegmentID        uuid.UUID `json:"segment_id"`
	ContactCount     int       `json:"contact_count"`
	ActiveContacts   int       `json:"active_contacts"`
	InactiveContacts int       `json:"inactive_contacts"`
	NewContactsToday int       `json:"new_contacts_today"`
	NewContactsWeek  int       `json:"new_contacts_week"`
	NewContactsMonth int       `json:"new_contacts_month"`
	
	// Demographic data
	Demographics     map[string]interface{} `json:"demographics"`
	AgeDistribution  map[string]int         `json:"age_distribution,omitempty"`
	LocationDistribution map[string]int     `json:"location_distribution,omitempty"`
	
	// Engagement data
	MessagesSentToday    int     `json:"messages_sent_today"`
	MessagesReceivedToday int    `json:"messages_received_today"`
	AverageResponseTime  float64 `json:"average_response_time_seconds"`
	EngagementRate       float64 `json:"engagement_rate"`
	
	LastUpdatedAt        time.Time `json:"last_updated_at"`
}

// Predefined Segments

// PredefinedSegment represents a predefined segment template
type PredefinedSegment struct {
	ID          string             `json:"id"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Category    string             `json:"category"`
	Rules       *SegmentationRules `json:"rules"`
	Tags        []string           `json:"tags"`
}

// Common predefined segments
var CommonPredefinedSegments = []*PredefinedSegment{
	{
		ID:          "active_users",
		Name:        "Active Users",
		Description: "Users who have sent a message in the last 30 days",
		Category:    "Engagement",
		Rules: &SegmentationRules{
			Operator: LogicalOperatorAND,
			Conditions: []*SegmentCondition{
				{
					Field:    "last_message_at",
					Operator: "within_days",
					Value:    30,
				},
			},
		},
		Tags: []string{"engagement", "active"},
	},
	{
		ID:          "new_users",
		Name:        "New Users",
		Description: "Users created in the last 7 days",
		Category:    "Acquisition",
		Rules: &SegmentationRules{
			Operator: LogicalOperatorAND,
			Conditions: []*SegmentCondition{
				{
					Field:    "created_at",
					Operator: "within_days",
					Value:    7,
				},
			},
		},
		Tags: []string{"acquisition", "new"},
	},
	{
		ID:          "vip_customers",
		Name:        "VIP Customers",
		Description: "Customers with VIP tag",
		Category:    "Loyalty",
		Rules: &SegmentationRules{
			Operator: LogicalOperatorAND,
			Conditions: []*SegmentCondition{
				{
					Field:    "tags",
					Operator: "contains",
					Value:    "vip",
				},
			},
		},
		Tags: []string{"loyalty", "vip"},
	},
}