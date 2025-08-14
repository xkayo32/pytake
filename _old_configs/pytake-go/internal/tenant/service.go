package tenant

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// Service handles tenant business logic
type Service struct {
	db *gorm.DB
}

// NewService creates a new tenant service
func NewService(db *gorm.DB) *Service {
	return &Service{
		db: db,
	}
}

// CreateTenant creates a new tenant with the user as owner
func (s *Service) CreateTenant(req *CreateTenantRequest, ownerID uuid.UUID) (*models.Tenant, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create tenant
	tenant := &models.Tenant{
		Name:      req.Name,
		Domain:    req.Domain,
		Plan:      "basic", // Default plan
		OwnerID:   ownerID,
		Status:    "active",
		CreatedBy: ownerID,
		Settings: models.JSON{
			"max_users":            10,
			"max_whatsapp_configs": 1,
			"features": map[string]bool{
				"whatsapp":     true,
				"ai_assistant": false,
				"campaigns":    false,
				"flows":        true,
			},
			"branding": map[string]string{
				"theme": "light",
			},
			"rate_limit": map[string]int{
				"requests_per_second": 10,
				"burst_limit":         20,
			},
		},
	}

	if err := tx.Create(tenant).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create tenant: %w", err)
	}

	// Add owner as admin member
	tenantUser := &models.TenantUser{
		TenantID: tenant.ID,
		UserID:   ownerID,
		Role:     "admin",
		Status:   "active",
	}

	if err := tx.Create(tenantUser).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to add owner to tenant: %w", err)
	}

	// Update user's default tenant if they don't have one
	var user models.User
	if err := tx.First(&user, ownerID).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	if user.DefaultTenantID == nil {
		user.DefaultTenantID = &tenant.ID
		if err := tx.Save(&user).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to update user default tenant: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Reload tenant with relationships
	if err := s.db.Preload("Owner").First(tenant, tenant.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to reload tenant: %w", err)
	}

	return tenant, nil
}

// GetTenantByID gets a tenant by ID
func (s *Service) GetTenantByID(id uuid.UUID) (*models.Tenant, error) {
	var tenant models.Tenant
	err := s.db.Preload("Owner").First(&tenant, id).Error
	if err != nil {
		return nil, fmt.Errorf("tenant not found: %w", err)
	}
	return &tenant, nil
}

// GetUserTenants gets all tenants for a user
func (s *Service) GetUserTenants(userID uuid.UUID) ([]TenantMembershipResponse, error) {
	var tenantUsers []models.TenantUser
	err := s.db.Preload("Tenant").Where("user_id = ? AND status = ?", userID, "active").Find(&tenantUsers).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get user tenants: %w", err)
	}

	var responses []TenantMembershipResponse
	for _, tu := range tenantUsers {
		responses = append(responses, TenantMembershipResponse{
			TenantID:   tu.TenantID,
			Name:       tu.Tenant.Name,
			Domain:     tu.Tenant.Domain,
			Role:       tu.Role,
			Status:     tu.Status,
			JoinedAt:   tu.JoinedAt,
			IsOwner:    tu.Tenant.OwnerID == userID,
			Plan:       tu.Tenant.Plan,
		})
	}

	return responses, nil
}

// UpdateTenant updates tenant information
func (s *Service) UpdateTenant(id uuid.UUID, req *UpdateTenantRequest, userID uuid.UUID) (*models.Tenant, error) {
	// Check if user has admin access to tenant
	if !s.hasAdminAccess(id, userID) {
		return nil, fmt.Errorf("insufficient permissions")
	}

	var tenant models.Tenant
	if err := s.db.Preload("Owner").First(&tenant, id).Error; err != nil {
		return nil, fmt.Errorf("tenant not found: %w", err)
	}

	// Update fields if provided
	if req.Name != "" {
		tenant.Name = req.Name
	}
	if req.Domain != "" {
		tenant.Domain = req.Domain
	}
	if req.Settings != nil {
		// Merge settings with existing ones
		if tenant.Settings == nil {
			tenant.Settings = make(models.JSON)
		}
		
		// Update features if provided
		if req.Settings.Features != nil {
			features, _ := tenant.Settings["features"].(map[string]interface{})
			if features == nil {
				features = make(map[string]interface{})
			}
			for k, v := range req.Settings.Features {
				features[k] = v
			}
			tenant.Settings["features"] = features
		}
		
		// Update branding if provided
		if req.Settings.Branding.Theme != "" {
			branding, _ := tenant.Settings["branding"].(map[string]interface{})
			if branding == nil {
				branding = make(map[string]interface{})
			}
			branding["theme"] = req.Settings.Branding.Theme
			tenant.Settings["branding"] = branding
		}
	}

	tenant.UpdatedBy = &userID

	if err := s.db.Save(&tenant).Error; err != nil {
		return nil, fmt.Errorf("failed to update tenant: %w", err)
	}

	return &tenant, nil
}

// InviteUser invites a user to join a tenant
func (s *Service) InviteUser(tenantID uuid.UUID, req *InviteUserRequest, inviterID uuid.UUID) (*models.TenantInvite, error) {
	// Check if inviter has admin access
	if !s.hasAdminAccess(tenantID, inviterID) {
		return nil, fmt.Errorf("insufficient permissions")
	}

	// Check if tenant exists and can invite users
	var tenant models.Tenant
	if err := s.db.Preload("Members").First(&tenant, tenantID).Error; err != nil {
		return nil, fmt.Errorf("tenant not found: %w", err)
	}

	if !tenant.CanInviteUsers(len(tenant.Members)) {
		return nil, fmt.Errorf("tenant has reached maximum user limit")
	}

	// Check if user is already a member
	var existingMembership models.TenantUser
	if err := s.db.Where("tenant_id = ? AND user_id = ?", tenantID, req.UserID).First(&existingMembership).Error; err == nil {
		return nil, fmt.Errorf("user is already a member of this tenant")
	}

	// Check for existing pending invite
	var existingInvite models.TenantInvite
	if err := s.db.Where("tenant_id = ? AND email = ? AND status = ?", tenantID, req.Email, "pending").First(&existingInvite).Error; err == nil {
		return nil, fmt.Errorf("invite already sent to this email")
	}

	// Generate invite token
	token, err := generateInviteToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate invite token: %w", err)
	}

	// Create invite
	invite := &models.TenantInvite{
		TenantID:  tenantID,
		Email:     req.Email,
		Role:      req.Role,
		Status:    "pending",
		Token:     token,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days
		InvitedBy: inviterID,
	}

	if err := s.db.Create(invite).Error; err != nil {
		return nil, fmt.Errorf("failed to create invite: %w", err)
	}

	return invite, nil
}

// AcceptInvite accepts a tenant invitation
func (s *Service) AcceptInvite(token string, userID uuid.UUID) error {
	// Find invite
	var invite models.TenantInvite
	if err := s.db.Where("token = ? AND status = ?", token, "pending").First(&invite).Error; err != nil {
		return fmt.Errorf("invalid or expired invite: %w", err)
	}

	// Check if invite is expired
	if invite.ExpiresAt.Before(time.Now()) {
		invite.Status = "expired"
		s.db.Save(&invite)
		return fmt.Errorf("invite has expired")
	}

	// Get user email to verify
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if user.Email != invite.Email {
		return fmt.Errorf("invite email does not match user email")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create tenant membership
	tenantUser := &models.TenantUser{
		TenantID:  invite.TenantID,
		UserID:    userID,
		Role:      invite.Role,
		Status:    "active",
		InvitedBy: &invite.InvitedBy,
	}

	if err := tx.Create(tenantUser).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to create membership: %w", err)
	}

	// Update invite status
	now := time.Now()
	invite.Status = "accepted"
	invite.AcceptedAt = &now
	if err := tx.Save(&invite).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update invite: %w", err)
	}

	// Set as default tenant if user doesn't have one
	if user.DefaultTenantID == nil {
		user.DefaultTenantID = &invite.TenantID
		if err := tx.Save(&user).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to update user default tenant: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// hasAdminAccess checks if user has admin access to tenant
func (s *Service) hasAdminAccess(tenantID uuid.UUID, userID uuid.UUID) bool {
	var count int64
	s.db.Model(&models.TenantUser{}).Where(
		"tenant_id = ? AND user_id = ? AND role IN ? AND status = ?",
		tenantID, userID, []string{"admin", "owner"}, "active",
	).Count(&count)
	return count > 0
}

// generateInviteToken generates a secure invite token
func generateInviteToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}