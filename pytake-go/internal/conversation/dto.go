package conversation

import (
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
)

// CreateConversationRequest represents a request to create a conversation
type CreateConversationRequest struct {
	ContactID        *uuid.UUID                   `json:"contact_id,omitempty"`
	ContactPhone     string                       `json:"contact_phone,omitempty"`
	ContactName      string                       `json:"contact_name,omitempty"`
	Channel          models.ConversationChannel   `json:"channel" validate:"required,oneof=whatsapp webchat email instagram facebook"`
	WhatsAppConfigID *uuid.UUID                   `json:"whatsapp_config_id,omitempty"`
	AssignedUserID   *uuid.UUID                   `json:"assigned_user_id,omitempty"`
	Metadata         models.JSON                  `json:"metadata,omitempty"`
}

// UpdateConversationRequest represents a request to update a conversation
type UpdateConversationRequest struct {
	Status             *models.ConversationStatus `json:"status,omitempty" validate:"omitempty,oneof=open closed archived pending"`
	AssignedUserID     *uuid.UUID                `json:"assigned_user_id,omitempty"`
	Notes              string                    `json:"notes,omitempty"`
	SatisfactionRating *int                      `json:"satisfaction_rating,omitempty" validate:"omitempty,min=1,max=5"`
	Metadata           models.JSON               `json:"metadata,omitempty"`
	ClosedByID         *uuid.UUID                `json:"closed_by_id,omitempty"`
}

// ConversationResponse represents a conversation in API responses
type ConversationResponse struct {
	ID                 uuid.UUID                   `json:"id"`
	ContactID          uuid.UUID                   `json:"contact_id"`
	Contact            *ContactResponse            `json:"contact,omitempty"`
	WhatsAppConfigID   *uuid.UUID                  `json:"whatsapp_config_id,omitempty"`
	AssignedUserID     *uuid.UUID                  `json:"assigned_user_id,omitempty"`
	AssignedUser       *UserResponse               `json:"assigned_user,omitempty"`
	Status             models.ConversationStatus   `json:"status"`
	Channel            models.ConversationChannel  `json:"channel"`
	UnreadCount        int                         `json:"unread_count"`
	LastMessageAt      *time.Time                  `json:"last_message_at,omitempty"`
	LastMessagePreview string                      `json:"last_message_preview,omitempty"`
	LastMessageType    string                      `json:"last_message_type,omitempty"`
	LastMessageFrom    string                      `json:"last_message_from,omitempty"`
	Tags               []string                    `json:"tags"`
	Metadata           models.JSON                 `json:"metadata,omitempty"`
	Notes              string                      `json:"notes,omitempty"`
	SatisfactionRating *int                        `json:"satisfaction_rating,omitempty"`
	CreatedAt          time.Time                   `json:"created_at"`
	UpdatedAt          time.Time                   `json:"updated_at"`
}

// ContactResponse represents a contact in API responses
type ContactResponse struct {
	ID               uuid.UUID            `json:"id"`
	Name             string               `json:"name"`
	Phone            string               `json:"phone,omitempty"`
	WhatsAppPhone    string               `json:"whatsapp_phone,omitempty"`
	Email            string               `json:"email,omitempty"`
	ProfilePictureURL string              `json:"profile_picture_url,omitempty"`
	Status           models.ContactStatus `json:"status"`
	CompanyName      string               `json:"company_name,omitempty"`
	Tags             []string             `json:"tags"`
	CustomFields     models.JSON          `json:"custom_fields,omitempty"`
	LastContactAt    *time.Time           `json:"last_contact_at,omitempty"`
	CreatedAt        time.Time            `json:"created_at"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Avatar   string    `json:"avatar,omitempty"`
}

// CreateContactRequest represents a request to create a contact
type CreateContactRequest struct {
	Name             string               `json:"name" validate:"required,min=2,max=255"`
	Phone            string               `json:"phone,omitempty"`
	WhatsAppPhone    string               `json:"whatsapp_phone,omitempty"`
	Email            string               `json:"email,omitempty" validate:"omitempty,email"`
	Status           models.ContactStatus `json:"status,omitempty" validate:"omitempty,oneof=active inactive blocked"`
	ProfilePictureURL string              `json:"profile_picture_url,omitempty"`
	Language         string               `json:"language,omitempty"`
	Timezone         string               `json:"timezone,omitempty"`
	CompanyName      string               `json:"company_name,omitempty"`
	JobTitle         string               `json:"job_title,omitempty"`
	Address          string               `json:"address,omitempty"`
	City             string               `json:"city,omitempty"`
	State            string               `json:"state,omitempty"`
	Country          string               `json:"country,omitempty"`
	PostalCode       string               `json:"postal_code,omitempty"`
	DateOfBirth      *time.Time           `json:"date_of_birth,omitempty"`
	CustomFields     models.JSON          `json:"custom_fields,omitempty"`
	Tags             []string             `json:"tags,omitempty"`
	OptInMarketing   bool                 `json:"opt_in_marketing"`
	ExternalID       string               `json:"external_id,omitempty"`
}

// UpdateContactRequest represents a request to update a contact
type UpdateContactRequest struct {
	Name             string               `json:"name,omitempty"`
	Phone            string               `json:"phone,omitempty"`
	WhatsAppPhone    string               `json:"whatsapp_phone,omitempty"`
	Email            string               `json:"email,omitempty" validate:"omitempty,email"`
	Status           *models.ContactStatus `json:"status,omitempty" validate:"omitempty,oneof=active inactive blocked"`
	ProfilePictureURL string              `json:"profile_picture_url,omitempty"`
	Language         string               `json:"language,omitempty"`
	Timezone         string               `json:"timezone,omitempty"`
	CompanyName      string               `json:"company_name,omitempty"`
	JobTitle         string               `json:"job_title,omitempty"`
	Address          string               `json:"address,omitempty"`
	City             string               `json:"city,omitempty"`
	State            string               `json:"state,omitempty"`
	Country          string               `json:"country,omitempty"`
	PostalCode       string               `json:"postal_code,omitempty"`
	DateOfBirth      *time.Time           `json:"date_of_birth,omitempty"`
	CustomFields     models.JSON          `json:"custom_fields,omitempty"`
	OptInMarketing   *bool                `json:"opt_in_marketing,omitempty"`
	LeadScore        *int                 `json:"lead_score,omitempty"`
	ExternalID       string               `json:"external_id,omitempty"`
}

// AddTagRequest represents a request to add a tag
type AddTagRequest struct {
	Tag      string `json:"tag" validate:"required,min=1,max=100"`
	Category string `json:"category,omitempty"`
	Color    string `json:"color,omitempty" validate:"omitempty,hexcolor"`
}

// SendMessageRequest represents a request to send a message
type SendMessageRequest struct {
	ConversationID uuid.UUID   `json:"conversation_id" validate:"required"`
	Type           string      `json:"type" validate:"required,oneof=text image document audio video location template"`
	Content        string      `json:"content,omitempty"`
	MediaURL       string      `json:"media_url,omitempty"`
	MediaCaption   string      `json:"media_caption,omitempty"`
	ReplyToID      *uuid.UUID  `json:"reply_to_id,omitempty"`
	Metadata       models.JSON `json:"metadata,omitempty"`
}

// MessageResponse represents a message in API responses
type MessageResponse struct {
	ID               uuid.UUID                `json:"id"`
	ConversationID   uuid.UUID                `json:"conversation_id"`
	ContactID        uuid.UUID                `json:"contact_id"`
	UserID           *uuid.UUID               `json:"user_id,omitempty"`
	Direction        models.MessageDirection  `json:"direction"`
	Type             string                   `json:"type"`
	Status           models.MessageStatus     `json:"status"`
	Content          string                   `json:"content,omitempty"`
	MediaURL         string                   `json:"media_url,omitempty"`
	MediaType        string                   `json:"media_type,omitempty"`
	ThumbnailURL     string                   `json:"thumbnail_url,omitempty"`
	WhatsAppID       string                   `json:"whatsapp_id,omitempty"`
	ReplyToID        *uuid.UUID               `json:"reply_to_id,omitempty"`
	SentAt           *time.Time               `json:"sent_at,omitempty"`
	DeliveredAt      *time.Time               `json:"delivered_at,omitempty"`
	ReadAt           *time.Time               `json:"read_at,omitempty"`
	FailedAt         *time.Time               `json:"failed_at,omitempty"`
	ErrorMessage     string                   `json:"error_message,omitempty"`
	CreatedAt        time.Time                `json:"created_at"`
}

// ConversationListResponse represents a paginated list of conversations
type ConversationListResponse struct {
	Conversations []ConversationResponse `json:"conversations"`
	Total         int64                  `json:"total"`
	Page          int                    `json:"page"`
	PageSize      int                    `json:"page_size"`
}

// ContactListResponse represents a paginated list of contacts
type ContactListResponse struct {
	Contacts  []ContactResponse `json:"contacts"`
	Total     int64            `json:"total"`
	Page      int              `json:"page"`
	PageSize  int              `json:"page_size"`
}

// MessageListResponse represents a paginated list of messages
type MessageListResponse struct {
	Messages  []MessageResponse `json:"messages"`
	Total     int64            `json:"total"`
	Page      int              `json:"page"`
	PageSize  int              `json:"page_size"`
}