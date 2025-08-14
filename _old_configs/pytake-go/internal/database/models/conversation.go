package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ConversationStatus represents the status of a conversation
type ConversationStatus string

const (
	ConversationStatusOpen     ConversationStatus = "open"
	ConversationStatusClosed   ConversationStatus = "closed"
	ConversationStatusArchived ConversationStatus = "archived"
	ConversationStatusPending  ConversationStatus = "pending"
)

// ConversationChannel represents the channel of communication
type ConversationChannel string

const (
	ChannelWhatsApp  ConversationChannel = "whatsapp"
	ChannelWebChat   ConversationChannel = "webchat"
	ChannelEmail     ConversationChannel = "email"
	ChannelInstagram ConversationChannel = "instagram"
	ChannelFacebook  ConversationChannel = "facebook"
)

// Conversation represents a conversation thread
type Conversation struct {
	TenantModel
	ContactID           uuid.UUID           `gorm:"type:uuid;index" json:"contact_id"`
	Contact             *Contact            `gorm:"foreignKey:ContactID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"contact,omitempty"`
	WhatsAppConfigID    *uuid.UUID          `gorm:"type:uuid;index" json:"whatsapp_config_id,omitempty"`
	WhatsAppConfig      *WhatsAppConfig     `gorm:"foreignKey:WhatsAppConfigID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"whatsapp_config,omitempty"`
	AssignedUserID      *uuid.UUID          `gorm:"type:uuid;index" json:"assigned_user_id,omitempty"`
	AssignedUser        *User               `gorm:"foreignKey:AssignedUserID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"assigned_user,omitempty"`
	Status              ConversationStatus  `gorm:"type:varchar(50);default:'open';index" json:"status"`
	Channel             ConversationChannel `gorm:"type:varchar(50);not null;index" json:"channel"`
	UnreadCount         int                 `gorm:"default:0" json:"unread_count"`
	LastMessageAt       *time.Time          `gorm:"index" json:"last_message_at,omitempty"`
	LastMessagePreview  string              `gorm:"type:text" json:"last_message_preview,omitempty"`
	LastMessageType     string              `gorm:"type:varchar(50)" json:"last_message_type,omitempty"`
	LastMessageFrom     string              `gorm:"type:varchar(50)" json:"last_message_from,omitempty"`
	Tags                []ConversationTag   `gorm:"foreignKey:ConversationID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"tags,omitempty"`
	Messages            []Message           `gorm:"foreignKey:ConversationID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"messages,omitempty"`
	Metadata            JSON                `gorm:"type:jsonb" json:"metadata,omitempty"`
	ClosedAt            *time.Time          `json:"closed_at,omitempty"`
	ClosedByID          *uuid.UUID          `gorm:"type:uuid" json:"closed_by_id,omitempty"`
	ClosedBy            *User               `gorm:"foreignKey:ClosedByID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"closed_by,omitempty"`
	FirstResponseAt     *time.Time          `json:"first_response_at,omitempty"`
	WaitingTime         int                 `gorm:"default:0" json:"waiting_time"` // in seconds
	InteractionCount    int                 `gorm:"default:0" json:"interaction_count"`
	SatisfactionRating  *int                `json:"satisfaction_rating,omitempty"` // 1-5 scale
	Notes               string              `gorm:"type:text" json:"notes,omitempty"`
}

// TableName sets the table name
func (Conversation) TableName() string {
	return "conversations"
}

// BeforeCreate hook
func (c *Conversation) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return c.TenantModel.BeforeCreate(tx)
}

// ConversationTag represents a tag assigned to a conversation
type ConversationTag struct {
	BaseModel
	ConversationID uuid.UUID    `gorm:"type:uuid;index;not null" json:"conversation_id"`
	Conversation   *Conversation `gorm:"foreignKey:ConversationID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"conversation,omitempty"`
	Tag            string       `gorm:"type:varchar(100);not null;index" json:"tag"`
	Color          string       `gorm:"type:varchar(7)" json:"color,omitempty"` // Hex color
	CreatedByID    uuid.UUID    `gorm:"type:uuid" json:"created_by_id"`
	CreatedBy      *User        `gorm:"foreignKey:CreatedByID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"created_by,omitempty"`
}

// TableName sets the table name
func (ConversationTag) TableName() string {
	return "conversation_tags"
}

// ConversationFilter represents filters for querying conversations
type ConversationFilter struct {
	TenantID         uuid.UUID
	Status           *ConversationStatus
	Channel          *ConversationChannel
	AssignedUserID   *uuid.UUID
	ContactID        *uuid.UUID
	Tags             []string
	UnreadOnly       bool
	SearchTerm       string
	DateFrom         *time.Time
	DateTo           *time.Time
	HasSatisfaction  *bool
	MinRating        *int
	MaxRating        *int
	OrderBy          string // last_message_at, created_at, unread_count
	OrderDesc        bool
	Limit            int
	Offset           int
}

// ConversationStats represents conversation statistics
type ConversationStats struct {
	TotalConversations   int                       `json:"total_conversations"`
	OpenConversations    int                       `json:"open_conversations"`
	ClosedConversations  int                       `json:"closed_conversations"`
	ArchivedConversations int                      `json:"archived_conversations"`
	TotalUnread          int                       `json:"total_unread"`
	AvgResponseTime      float64                   `json:"avg_response_time"` // in seconds
	AvgWaitingTime       float64                   `json:"avg_waiting_time"`  // in seconds
	AvgSatisfaction      float64                   `json:"avg_satisfaction"`
	ByChannel            map[string]int            `json:"by_channel"`
	ByStatus             map[string]int            `json:"by_status"`
	ByUser               map[string]int            `json:"by_user"`
	RecentActivity       []ConversationActivity    `json:"recent_activity"`
}

// ConversationActivity represents recent activity in conversations
type ConversationActivity struct {
	ConversationID     uuid.UUID  `json:"conversation_id"`
	ContactName        string     `json:"contact_name"`
	LastMessage        string     `json:"last_message"`
	LastMessageAt      time.Time  `json:"last_message_at"`
	UnreadCount        int        `json:"unread_count"`
	Status             string     `json:"status"`
	Channel            string     `json:"channel"`
}