package tenant

import (
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
)

// CreateTenantRequest represents a tenant creation request
type CreateTenantRequest struct {
	Name   string `json:"name" validate:"required,min=2,max=255"`
	Domain string `json:"domain" validate:"omitempty,fqdn,max=100"`
}

// UpdateTenantRequest represents a tenant update request
type UpdateTenantRequest struct {
	Name     string                   `json:"name" validate:"omitempty,min=2,max=255"`
	Domain   string                   `json:"domain" validate:"omitempty,fqdn,max=100"`
	Settings *models.TenantSettings   `json:"settings"`
}

// InviteUserRequest represents a user invitation request
type InviteUserRequest struct {
	Email  string    `json:"email" validate:"required,email"`
	Role   string    `json:"role" validate:"required,oneof=admin member viewer"`
	UserID uuid.UUID `json:"user_id"` // Optional: if inviting existing user
}

// TenantResponse represents a tenant in API responses
type TenantResponse struct {
	ID         uuid.UUID              `json:"id"`
	Name       string                 `json:"name"`
	Domain     string                 `json:"domain"`
	Status     string                 `json:"status"`
	Plan       string                 `json:"plan"`
	Settings   models.TenantSettings  `json:"settings"`
	ExpiresAt  *time.Time             `json:"expires_at"`
	CreatedAt  time.Time              `json:"created_at"`
	UpdatedAt  time.Time              `json:"updated_at"`
	Owner      UserSummary            `json:"owner"`
	MemberCount int                   `json:"member_count"`
}

// TenantMembershipResponse represents user's membership in a tenant
type TenantMembershipResponse struct {
	TenantID  uuid.UUID `json:"tenant_id"`
	Name      string    `json:"name"`
	Domain    string    `json:"domain"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	JoinedAt  time.Time `json:"joined_at"`
	IsOwner   bool      `json:"is_owner"`
	Plan      string    `json:"plan"`
}

// TenantMemberResponse represents a tenant member
type TenantMemberResponse struct {
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	JoinedAt  time.Time `json:"joined_at"`
	IsOwner   bool      `json:"is_owner"`
	InvitedBy *string   `json:"invited_by"`
}

// InviteResponse represents an invitation
type InviteResponse struct {
	ID        uuid.UUID  `json:"id"`
	Email     string     `json:"email"`
	Role      string     `json:"role"`
	Status    string     `json:"status"`
	ExpiresAt time.Time  `json:"expires_at"`
	InvitedBy UserSummary `json:"invited_by"`
	CreatedAt time.Time  `json:"created_at"`
}

// UserSummary represents a user summary for responses
type UserSummary struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
}

// TenantStatsResponse represents tenant statistics
type TenantStatsResponse struct {
	TotalMembers    int `json:"total_members"`
	ActiveMembers   int `json:"active_members"`
	PendingInvites  int `json:"pending_invites"`
	WhatsAppConfigs int `json:"whatsapp_configs"`
	TotalMessages   int `json:"total_messages"`
	ActiveContacts  int `json:"active_contacts"`
}

// SwitchTenantRequest represents a tenant switch request
type SwitchTenantRequest struct {
	TenantID uuid.UUID `json:"tenant_id" validate:"required"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Message string                 `json:"message,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}