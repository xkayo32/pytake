package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ContactStatus represents the status of a contact
type ContactStatus string

const (
	ContactStatusActive   ContactStatus = "active"
	ContactStatusInactive ContactStatus = "inactive"
	ContactStatusBlocked  ContactStatus = "blocked"
	ContactStatusDeleted  ContactStatus = "deleted"
)

// Contact represents a contact/customer
type Contact struct {
	TenantModel
	Name             string         `gorm:"type:varchar(255);not null;index" json:"name"`
	Phone            string         `gorm:"type:varchar(50);index" json:"phone,omitempty"`
	WhatsAppPhone    string         `gorm:"type:varchar(50);unique;index" json:"whatsapp_phone,omitempty"`
	Email            string         `gorm:"type:varchar(255);index" json:"email,omitempty"`
	Status           ContactStatus  `gorm:"type:varchar(50);default:'active';index" json:"status"`
	ProfilePictureURL string        `gorm:"type:text" json:"profile_picture_url,omitempty"`
	Source           string         `gorm:"type:varchar(100)" json:"source,omitempty"` // whatsapp, manual, import, api
	Language         string         `gorm:"type:varchar(10);default:'pt'" json:"language"`
	Timezone         string         `gorm:"type:varchar(50);default:'America/Sao_Paulo'" json:"timezone"`
	Tags             []ContactTag   `gorm:"foreignKey:ContactID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"tags,omitempty"`
	CustomFields     JSON           `gorm:"type:jsonb" json:"custom_fields,omitempty"`
	Conversations    []Conversation `gorm:"foreignKey:ContactID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"conversations,omitempty"`
	Notes            []ContactNote  `gorm:"foreignKey:ContactID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"notes,omitempty"`
	
	// CRM Fields
	CompanyName      string     `gorm:"type:varchar(255)" json:"company_name,omitempty"`
	JobTitle         string     `gorm:"type:varchar(255)" json:"job_title,omitempty"`
	Address          string     `gorm:"type:text" json:"address,omitempty"`
	City             string     `gorm:"type:varchar(100)" json:"city,omitempty"`
	State            string     `gorm:"type:varchar(100)" json:"state,omitempty"`
	Country          string     `gorm:"type:varchar(100)" json:"country,omitempty"`
	PostalCode       string     `gorm:"type:varchar(20)" json:"postal_code,omitempty"`
	DateOfBirth      *time.Time `json:"date_of_birth,omitempty"`
	
	// Tracking Fields
	FirstContactAt   *time.Time `json:"first_contact_at,omitempty"`
	LastContactAt    *time.Time `json:"last_contact_at,omitempty"`
	TotalMessages    int        `gorm:"default:0" json:"total_messages"`
	TotalConversations int      `gorm:"default:0" json:"total_conversations"`
	
	// Marketing Fields
	OptInMarketing   bool       `gorm:"default:false" json:"opt_in_marketing"`
	OptInAt          *time.Time `json:"opt_in_at,omitempty"`
	OptOutAt         *time.Time `json:"opt_out_at,omitempty"`
	LifetimeValue    float64    `gorm:"default:0" json:"lifetime_value"`
	LeadScore        int        `gorm:"default:0" json:"lead_score"`
	SegmentID        *uuid.UUID `gorm:"type:uuid" json:"segment_id,omitempty"`
	
	// External IDs
	ExternalID       string     `gorm:"type:varchar(255);index" json:"external_id,omitempty"`
	ERPCustomerID    string     `gorm:"type:varchar(255)" json:"erp_customer_id,omitempty"`
	CRMContactID     string     `gorm:"type:varchar(255)" json:"crm_contact_id,omitempty"`
	
	// AI Context
	AIContext        JSON       `gorm:"type:jsonb" json:"ai_context,omitempty"`
	Preferences      JSON       `gorm:"type:jsonb" json:"preferences,omitempty"`
}

// TableName sets the table name
func (Contact) TableName() string {
	return "contacts"
}

// BeforeCreate hook
func (c *Contact) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.FirstContactAt == nil {
		now := time.Now()
		c.FirstContactAt = &now
	}
	return c.TenantModel.BeforeCreate(tx)
}

// ContactTag represents a tag assigned to a contact
type ContactTag struct {
	BaseModel
	ContactID   uuid.UUID `gorm:"type:uuid;index;not null" json:"contact_id"`
	Contact     *Contact  `gorm:"foreignKey:ContactID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"contact,omitempty"`
	Tag         string    `gorm:"type:varchar(100);not null;index" json:"tag"`
	Category    string    `gorm:"type:varchar(100)" json:"category,omitempty"`
	Color       string    `gorm:"type:varchar(7)" json:"color,omitempty"` // Hex color
	CreatedByID uuid.UUID `gorm:"type:uuid" json:"created_by_id"`
	CreatedBy   *User     `gorm:"foreignKey:CreatedByID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"created_by,omitempty"`
}

// TableName sets the table name
func (ContactTag) TableName() string {
	return "contact_tags"
}

// ContactNote represents a note about a contact
type ContactNote struct {
	BaseModel
	ContactID   uuid.UUID `gorm:"type:uuid;index;not null" json:"contact_id"`
	Contact     *Contact  `gorm:"foreignKey:ContactID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"contact,omitempty"`
	Note        string    `gorm:"type:text;not null" json:"note"`
	IsPrivate   bool      `gorm:"default:false" json:"is_private"`
	CreatedByID uuid.UUID `gorm:"type:uuid;not null" json:"created_by_id"`
	CreatedBy   *User     `gorm:"foreignKey:CreatedByID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"created_by,omitempty"`
}

// TableName sets the table name
func (ContactNote) TableName() string {
	return "contact_notes"
}

// ContactFilter represents filters for querying contacts
type ContactFilter struct {
	TenantID         uuid.UUID
	Status           *ContactStatus
	Tags             []string
	SearchTerm       string // searches in name, phone, email, company
	Source           *string
	HasConversations *bool
	OptInMarketing   *bool
	MinLeadScore     *int
	MaxLeadScore     *int
	SegmentID        *uuid.UUID
	DateFrom         *time.Time
	DateTo           *time.Time
	OrderBy          string // name, created_at, last_contact_at, lead_score
	OrderDesc        bool
	Limit            int
	Offset           int
}

// ContactStats represents contact statistics
type ContactStats struct {
	TotalContacts      int            `json:"total_contacts"`
	ActiveContacts     int            `json:"active_contacts"`
	BlockedContacts    int            `json:"blocked_contacts"`
	NewContactsToday   int            `json:"new_contacts_today"`
	NewContactsWeek    int            `json:"new_contacts_week"`
	NewContactsMonth   int            `json:"new_contacts_month"`
	WithConversations  int            `json:"with_conversations"`
	OptedInMarketing   int            `json:"opted_in_marketing"`
	BySource           map[string]int `json:"by_source"`
	ByStatus           map[string]int `json:"by_status"`
	TopTags            []TagCount     `json:"top_tags"`
	AvgLeadScore       float64        `json:"avg_lead_score"`
	TotalLifetimeValue float64        `json:"total_lifetime_value"`
}

// TagCount represents a tag with its count
type TagCount struct {
	Tag      string `json:"tag"`
	Count    int    `json:"count"`
	Category string `json:"category,omitempty"`
	Color    string `json:"color,omitempty"`
}

// ContactImport represents a batch import of contacts
type ContactImport struct {
	TenantModel
	FileName        string    `gorm:"type:varchar(255)" json:"file_name"`
	Status          string    `gorm:"type:varchar(50)" json:"status"` // pending, processing, completed, failed
	TotalRecords    int       `json:"total_records"`
	ProcessedRecords int      `json:"processed_records"`
	SuccessCount    int       `json:"success_count"`
	ErrorCount      int       `json:"error_count"`
	Errors          JSON      `gorm:"type:jsonb" json:"errors,omitempty"`
	MappingRules    JSON      `gorm:"type:jsonb" json:"mapping_rules,omitempty"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	CreatedByID     uuid.UUID `gorm:"type:uuid" json:"created_by_id"`
	CreatedBy       *User     `gorm:"foreignKey:CreatedByID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"created_by,omitempty"`
}

// TableName sets the table name
func (ContactImport) TableName() string {
	return "contact_imports"
}