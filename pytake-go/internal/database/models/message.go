package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MessageDirection represents the direction of a message
type MessageDirection string

const (
	MessageDirectionInbound  MessageDirection = "inbound"
	MessageDirectionOutbound MessageDirection = "outbound"
)

// MessageStatus represents the status of a message
type MessageStatus string

const (
	MessageStatusPending   MessageStatus = "pending"
	MessageStatusSent      MessageStatus = "sent"
	MessageStatusDelivered MessageStatus = "delivered"
	MessageStatusRead      MessageStatus = "read"
	MessageStatusFailed    MessageStatus = "failed"
	MessageStatusReceived  MessageStatus = "received"
)

// Message represents a message in a conversation
type Message struct {
	TenantModel
	ConversationID   uuid.UUID        `gorm:"type:uuid;index;not null" json:"conversation_id"`
	Conversation     *Conversation    `gorm:"foreignKey:ConversationID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"conversation,omitempty"`
	ContactID        uuid.UUID        `gorm:"type:uuid;index" json:"contact_id"`
	Contact          *Contact         `gorm:"foreignKey:ContactID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"contact,omitempty"`
	WhatsAppConfigID *uuid.UUID       `gorm:"type:uuid;index" json:"whatsapp_config_id,omitempty"`
	WhatsAppConfig   *WhatsAppConfig  `gorm:"foreignKey:WhatsAppConfigID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"whatsapp_config,omitempty"`
	UserID           *uuid.UUID       `gorm:"type:uuid;index" json:"user_id,omitempty"`
	User             *User            `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"user,omitempty"`
	
	// Message Details
	Direction        MessageDirection `gorm:"type:varchar(50);not null;index" json:"direction"`
	Type             string           `gorm:"type:varchar(50);not null;index" json:"type"` // text, image, document, audio, video, location, template
	Status           MessageStatus    `gorm:"type:varchar(50);not null;index" json:"status"`
	Content          string           `gorm:"type:text" json:"content,omitempty"`
	MediaURL         string           `gorm:"type:text" json:"media_url,omitempty"`
	MediaType        string           `gorm:"type:varchar(100)" json:"media_type,omitempty"`
	MediaSize        int64            `json:"media_size,omitempty"`
	MediaDuration    int              `json:"media_duration,omitempty"` // for audio/video in seconds
	ThumbnailURL     string           `gorm:"type:text" json:"thumbnail_url,omitempty"`
	
	// WhatsApp Specific
	WhatsAppID       string           `gorm:"type:varchar(255);unique;index" json:"whatsapp_id,omitempty"`
	WhatsAppStatus   string           `gorm:"type:varchar(50)" json:"whatsapp_status,omitempty"`
	ReplyToID        *uuid.UUID       `gorm:"type:uuid" json:"reply_to_id,omitempty"`
	ReplyTo          *Message         `gorm:"foreignKey:ReplyToID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"reply_to,omitempty"`
	ForwardedFrom    string           `gorm:"type:varchar(255)" json:"forwarded_from,omitempty"`
	
	// Template Message
	TemplateName     string           `gorm:"type:varchar(255)" json:"template_name,omitempty"`
	TemplateLanguage string           `gorm:"type:varchar(10)" json:"template_language,omitempty"`
	TemplateParams   JSON             `gorm:"type:jsonb" json:"template_params,omitempty"`
	
	// Location Message
	LocationLat      *float64         `json:"location_lat,omitempty"`
	LocationLng      *float64         `json:"location_lng,omitempty"`
	LocationName     string           `gorm:"type:varchar(255)" json:"location_name,omitempty"`
	LocationAddress  string           `gorm:"type:text" json:"location_address,omitempty"`
	
	// Interactive Message
	InteractiveType  string           `gorm:"type:varchar(50)" json:"interactive_type,omitempty"` // button, list
	InteractiveData  JSON             `gorm:"type:jsonb" json:"interactive_data,omitempty"`
	
	// Reactions
	Reactions        []MessageReaction `gorm:"foreignKey:MessageID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"reactions,omitempty"`
	
	// Metadata
	Metadata         JSON             `gorm:"type:jsonb" json:"metadata,omitempty"`
	ErrorMessage     string           `gorm:"type:text" json:"error_message,omitempty"`
	ErrorCode        string           `gorm:"type:varchar(100)" json:"error_code,omitempty"`
	SentAt           *time.Time       `json:"sent_at,omitempty"`
	DeliveredAt      *time.Time       `json:"delivered_at,omitempty"`
	ReadAt           *time.Time       `json:"read_at,omitempty"`
	FailedAt         *time.Time       `json:"failed_at,omitempty"`
	
	// AI Processing
	AIProcessed      bool             `gorm:"default:false" json:"ai_processed"`
	AIIntent         string           `gorm:"type:varchar(255)" json:"ai_intent,omitempty"`
	AISentiment      string           `gorm:"type:varchar(50)" json:"ai_sentiment,omitempty"` // positive, negative, neutral
	AIEntities       JSON             `gorm:"type:jsonb" json:"ai_entities,omitempty"`
	AIContext        JSON             `gorm:"type:jsonb" json:"ai_context,omitempty"`
}

// TableName sets the table name
func (Message) TableName() string {
	return "messages"
}

// BeforeCreate hook
func (m *Message) BeforeCreate(tx *gorm.DB) (err error) {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	
	// Update conversation last message info
	if m.ConversationID != uuid.Nil {
		now := time.Now()
		preview := m.Content
		if len(preview) > 100 {
			preview = preview[:100] + "..."
		}
		
		updates := map[string]interface{}{
			"last_message_at":      now,
			"last_message_preview": preview,
			"last_message_type":    m.Type,
			"last_message_from":    m.Direction,
			"updated_at":          now,
		}
		
		// Increment unread count for inbound messages
		if MessageDirection(m.Direction) == MessageDirectionInbound {
			tx.Model(&Conversation{}).
				Where("id = ?", m.ConversationID).
				Update("unread_count", gorm.Expr("unread_count + ?", 1))
		}
		
		tx.Model(&Conversation{}).
			Where("id = ?", m.ConversationID).
			Updates(updates)
	}
	
	return m.TenantModel.BeforeCreate(tx)
}

// MessageReaction represents a reaction to a message
type MessageReaction struct {
	BaseModel
	MessageID   uuid.UUID `gorm:"type:uuid;index;not null" json:"message_id"`
	Message     *Message  `gorm:"foreignKey:MessageID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"message,omitempty"`
	UserID      uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	User        *User     `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"user,omitempty"`
	Reaction    string    `gorm:"type:varchar(50);not null" json:"reaction"` // emoji or predefined reaction
}

// TableName sets the table name
func (MessageReaction) TableName() string {
	return "message_reactions"
}

// MessageFilter represents filters for querying messages
type MessageFilter struct {
	ConversationID   *uuid.UUID
	ContactID        *uuid.UUID
	Direction        *MessageDirection
	Status           *MessageStatus
	Type             *string
	SearchTerm       string
	DateFrom         *time.Time
	DateTo           *time.Time
	HasMedia         *bool
	IsTemplate       *bool
	AIProcessed      *bool
	OrderBy          string // created_at, sent_at
	OrderDesc        bool
	Limit            int
	Offset           int
}

// MessageStats represents message statistics
type MessageStats struct {
	TotalMessages      int                  `json:"total_messages"`
	InboundMessages    int                  `json:"inbound_messages"`
	OutboundMessages   int                  `json:"outbound_messages"`
	TodayMessages      int                  `json:"today_messages"`
	WeekMessages       int                  `json:"week_messages"`
	MonthMessages      int                  `json:"month_messages"`
	ByStatus           map[string]int       `json:"by_status"`
	ByType             map[string]int       `json:"by_type"`
	ByDirection        map[string]int       `json:"by_direction"`
	AvgResponseTime    float64              `json:"avg_response_time"` // in seconds
	DeliveryRate       float64              `json:"delivery_rate"`     // percentage
	ReadRate           float64              `json:"read_rate"`         // percentage
	HourlyDistribution map[int]int          `json:"hourly_distribution"`
}