package conversation

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ContactService handles contact business logic
type ContactService struct {
	db     *gorm.DB
	logger *zap.SugaredLogger
}

// NewContactService creates a new contact service
func NewContactService(db *gorm.DB, logger *zap.SugaredLogger) *ContactService {
	return &ContactService{
		db:     db,
		logger: logger,
	}
}

// CreateContact creates a new contact
func (s *ContactService) CreateContact(tenantID uuid.UUID, req *CreateContactRequest) (*models.Contact, error) {
	// Check for duplicate phone/email
	if req.WhatsAppPhone != "" {
		var existing models.Contact
		err := s.db.Where("whatsapp_phone = ? AND tenant_id = ?", req.WhatsAppPhone, tenantID).First(&existing).Error
		if err == nil {
			return nil, fmt.Errorf("contact with this WhatsApp phone already exists")
		}
	}

	contact := &models.Contact{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		Name:              req.Name,
		Phone:             req.Phone,
		WhatsAppPhone:     req.WhatsAppPhone,
		Email:             req.Email,
		Status:            req.Status,
		ProfilePictureURL: req.ProfilePictureURL,
		Language:          req.Language,
		Timezone:          req.Timezone,
		CompanyName:       req.CompanyName,
		JobTitle:          req.JobTitle,
		Address:           req.Address,
		City:              req.City,
		State:             req.State,
		Country:           req.Country,
		PostalCode:        req.PostalCode,
		DateOfBirth:       req.DateOfBirth,
		CustomFields:      req.CustomFields,
		OptInMarketing:    req.OptInMarketing,
		ExternalID:        req.ExternalID,
		Source:            "manual",
	}

	if contact.Status == "" {
		contact.Status = models.ContactStatusActive
	}
	if contact.Language == "" {
		contact.Language = "pt"
	}
	if contact.Timezone == "" {
		contact.Timezone = "America/Sao_Paulo"
	}

	// Start transaction
	tx := s.db.Begin()

	// Create contact
	if err := tx.Create(contact).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create contact: %w", err)
	}

	// Add tags if provided
	for _, tag := range req.Tags {
		contactTag := &models.ContactTag{
			ContactID: contact.ID,
			Tag:       tag,
		}
		if err := tx.Create(contactTag).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to add tag: %w", err)
		}
	}

	tx.Commit()

	// Load tags
	s.db.Preload("Tags").First(contact, contact.ID)

	return contact, nil
}

// GetContact retrieves a contact by ID
func (s *ContactService) GetContact(id uuid.UUID, tenantID uuid.UUID) (*models.Contact, error) {
	var contact models.Contact
	err := s.db.Preload("Tags").
		Preload("Notes").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&contact).Error
	
	if err != nil {
		return nil, fmt.Errorf("contact not found: %w", err)
	}

	return &contact, nil
}

// GetContacts retrieves contacts with filters
func (s *ContactService) GetContacts(filter *models.ContactFilter) ([]models.Contact, int64, error) {
	query := s.db.Model(&models.Contact{}).
		Preload("Tags").
		Where("tenant_id = ?", filter.TenantID)

	// Apply filters
	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}
	if len(filter.Tags) > 0 {
		query = query.Joins("JOIN contact_tags ON contact_tags.contact_id = contacts.id").
			Where("contact_tags.tag IN ?", filter.Tags)
	}
	if filter.SearchTerm != "" {
		searchPattern := "%" + filter.SearchTerm + "%"
		query = query.Where("name ILIKE ? OR phone ILIKE ? OR email ILIKE ? OR company_name ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern)
	}
	if filter.Source != nil {
		query = query.Where("source = ?", *filter.Source)
	}
	if filter.HasConversations != nil {
		if *filter.HasConversations {
			query = query.Where("total_conversations > 0")
		} else {
			query = query.Where("total_conversations = 0")
		}
	}
	if filter.OptInMarketing != nil {
		query = query.Where("opt_in_marketing = ?", *filter.OptInMarketing)
	}
	if filter.MinLeadScore != nil {
		query = query.Where("lead_score >= ?", *filter.MinLeadScore)
	}
	if filter.MaxLeadScore != nil {
		query = query.Where("lead_score <= ?", *filter.MaxLeadScore)
	}
	if filter.SegmentID != nil {
		query = query.Where("segment_id = ?", *filter.SegmentID)
	}
	if filter.DateFrom != nil {
		query = query.Where("created_at >= ?", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		query = query.Where("created_at <= ?", *filter.DateTo)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Apply ordering
	orderBy := filter.OrderBy
	if orderBy == "" {
		orderBy = "created_at"
	}
	if filter.OrderDesc {
		orderBy += " DESC"
	} else {
		orderBy += " ASC"
	}
	query = query.Order(orderBy)

	// Apply pagination
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	var contacts []models.Contact
	if err := query.Find(&contacts).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get contacts: %w", err)
	}

	return contacts, total, nil
}

// UpdateContact updates a contact
func (s *ContactService) UpdateContact(id uuid.UUID, tenantID uuid.UUID, req *UpdateContactRequest) (*models.Contact, error) {
	var contact models.Contact
	if err := s.db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&contact).Error; err != nil {
		return nil, fmt.Errorf("contact not found: %w", err)
	}

	// Update fields if provided
	if req.Name != "" {
		contact.Name = req.Name
	}
	if req.Phone != "" {
		contact.Phone = req.Phone
	}
	if req.WhatsAppPhone != "" {
		// Check for duplicate
		var existing models.Contact
		err := s.db.Where("whatsapp_phone = ? AND tenant_id = ? AND id != ?", 
			req.WhatsAppPhone, tenantID, id).First(&existing).Error
		if err == nil {
			return nil, fmt.Errorf("another contact with this WhatsApp phone already exists")
		}
		contact.WhatsAppPhone = req.WhatsAppPhone
	}
	if req.Email != "" {
		contact.Email = req.Email
	}
	if req.Status != nil {
		contact.Status = *req.Status
	}
	if req.ProfilePictureURL != "" {
		contact.ProfilePictureURL = req.ProfilePictureURL
	}
	if req.Language != "" {
		contact.Language = req.Language
	}
	if req.Timezone != "" {
		contact.Timezone = req.Timezone
	}
	if req.CompanyName != "" {
		contact.CompanyName = req.CompanyName
	}
	if req.JobTitle != "" {
		contact.JobTitle = req.JobTitle
	}
	if req.Address != "" {
		contact.Address = req.Address
	}
	if req.City != "" {
		contact.City = req.City
	}
	if req.State != "" {
		contact.State = req.State
	}
	if req.Country != "" {
		contact.Country = req.Country
	}
	if req.PostalCode != "" {
		contact.PostalCode = req.PostalCode
	}
	if req.DateOfBirth != nil {
		contact.DateOfBirth = req.DateOfBirth
	}
	if req.CustomFields != nil {
		contact.CustomFields = req.CustomFields
	}
	if req.OptInMarketing != nil {
		contact.OptInMarketing = *req.OptInMarketing
		if *req.OptInMarketing {
			now := time.Now()
			contact.OptInAt = &now
			contact.OptOutAt = nil
		} else {
			now := time.Now()
			contact.OptOutAt = &now
		}
	}
	if req.LeadScore != nil {
		contact.LeadScore = *req.LeadScore
	}
	if req.ExternalID != "" {
		contact.ExternalID = req.ExternalID
	}

	if err := s.db.Save(&contact).Error; err != nil {
		return nil, fmt.Errorf("failed to update contact: %w", err)
	}

	// Load tags
	s.db.Preload("Tags").First(&contact, contact.ID)

	return &contact, nil
}

// DeleteContact deletes a contact
func (s *ContactService) DeleteContact(id uuid.UUID, tenantID uuid.UUID) error {
	// Soft delete by changing status
	result := s.db.Model(&models.Contact{}).
		Where("id = ? AND tenant_id = ?", id, tenantID).
		Update("status", models.ContactStatusDeleted)
	
	if result.Error != nil {
		return fmt.Errorf("failed to delete contact: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("contact not found")
	}
	
	return nil
}

// AddContactTag adds a tag to a contact
func (s *ContactService) AddContactTag(contactID uuid.UUID, tenantID uuid.UUID, req *AddTagRequest, userID uuid.UUID) error {
	// Verify contact belongs to tenant
	var contact models.Contact
	if err := s.db.Where("id = ? AND tenant_id = ?", contactID, tenantID).First(&contact).Error; err != nil {
		return fmt.Errorf("contact not found: %w", err)
	}

	// Check if tag already exists
	var existingTag models.ContactTag
	err := s.db.Where("contact_id = ? AND tag = ?", contactID, req.Tag).First(&existingTag).Error
	if err == nil {
		return nil // Tag already exists
	}

	// Create new tag
	contactTag := &models.ContactTag{
		ContactID:   contactID,
		Tag:        req.Tag,
		Category:   req.Category,
		Color:      req.Color,
		CreatedByID: userID,
	}

	if err := s.db.Create(contactTag).Error; err != nil {
		return fmt.Errorf("failed to add tag: %w", err)
	}

	return nil
}

// RemoveContactTag removes a tag from a contact
func (s *ContactService) RemoveContactTag(contactID uuid.UUID, tenantID uuid.UUID, tag string) error {
	// Verify contact belongs to tenant
	var contact models.Contact
	if err := s.db.Where("id = ? AND tenant_id = ?", contactID, tenantID).First(&contact).Error; err != nil {
		return fmt.Errorf("contact not found: %w", err)
	}

	result := s.db.Where("contact_id = ? AND tag = ?", contactID, tag).Delete(&models.ContactTag{})
	if result.Error != nil {
		return fmt.Errorf("failed to remove tag: %w", result.Error)
	}

	return nil
}

// AddContactNote adds a note to a contact
func (s *ContactService) AddContactNote(contactID uuid.UUID, tenantID uuid.UUID, note string, userID uuid.UUID, isPrivate bool) (*models.ContactNote, error) {
	// Verify contact belongs to tenant
	var contact models.Contact
	if err := s.db.Where("id = ? AND tenant_id = ?", contactID, tenantID).First(&contact).Error; err != nil {
		return nil, fmt.Errorf("contact not found: %w", err)
	}

	contactNote := &models.ContactNote{
		ContactID:   contactID,
		Note:        note,
		IsPrivate:   isPrivate,
		CreatedByID: userID,
	}

	if err := s.db.Create(contactNote).Error; err != nil {
		return nil, fmt.Errorf("failed to add note: %w", err)
	}

	return contactNote, nil
}

// GetContactStats gets contact statistics
func (s *ContactService) GetContactStats(tenantID uuid.UUID) (*models.ContactStats, error) {
	stats := &models.ContactStats{
		BySource: make(map[string]int),
		ByStatus: make(map[string]int),
	}

	// Total contacts
	var totalCount int64
	s.db.Model(&models.Contact{}).Where("tenant_id = ?", tenantID).Count(&totalCount)
	stats.TotalContacts = int(totalCount)

	// Active contacts
	var activeCount int64
	s.db.Model(&models.Contact{}).Where("tenant_id = ? AND status = ?", tenantID, models.ContactStatusActive).Count(&activeCount)
	stats.ActiveContacts = int(activeCount)

	// Blocked contacts
	var blockedCount int64
	s.db.Model(&models.Contact{}).Where("tenant_id = ? AND status = ?", tenantID, models.ContactStatusBlocked).Count(&blockedCount)
	stats.BlockedContacts = int(blockedCount)

	// New contacts today
	today := time.Now().Truncate(24 * time.Hour)
	var todayCount int64
	s.db.Model(&models.Contact{}).Where("tenant_id = ? AND created_at >= ?", tenantID, today).Count(&todayCount)
	stats.NewContactsToday = int(todayCount)

	// New contacts this week
	weekAgo := time.Now().AddDate(0, 0, -7)
	var weekCount int64
	s.db.Model(&models.Contact{}).Where("tenant_id = ? AND created_at >= ?", tenantID, weekAgo).Count(&weekCount)
	stats.NewContactsWeek = int(weekCount)

	// New contacts this month
	monthAgo := time.Now().AddDate(0, -1, 0)
	var monthCount int64
	s.db.Model(&models.Contact{}).Where("tenant_id = ? AND created_at >= ?", tenantID, monthAgo).Count(&monthCount)
	stats.NewContactsMonth = int(monthCount)

	// With conversations
	var convCount int64
	s.db.Model(&models.Contact{}).Where("tenant_id = ? AND total_conversations > 0", tenantID).Count(&convCount)
	stats.WithConversations = int(convCount)

	// Opted in marketing
	var optedCount int64
	s.db.Model(&models.Contact{}).Where("tenant_id = ? AND opt_in_marketing = ?", tenantID, true).Count(&optedCount)
	stats.OptedInMarketing = int(optedCount)

	// By source
	var sourceCounts []struct {
		Source string
		Count  int
	}
	s.db.Model(&models.Contact{}).
		Select("source, COUNT(*) as count").
		Where("tenant_id = ?", tenantID).
		Group("source").
		Scan(&sourceCounts)
	
	for _, sc := range sourceCounts {
		stats.BySource[sc.Source] = sc.Count
	}

	// By status
	var statusCounts []struct {
		Status string
		Count  int
	}
	s.db.Model(&models.Contact{}).
		Select("status, COUNT(*) as count").
		Where("tenant_id = ?", tenantID).
		Group("status").
		Scan(&statusCounts)
	
	for _, sc := range statusCounts {
		stats.ByStatus[sc.Status] = sc.Count
	}

	// Top tags
	var tagCounts []struct {
		Tag      string
		Count    int
		Category string
		Color    string
	}
	s.db.Table("contact_tags").
		Select("tag, COUNT(*) as count, MAX(category) as category, MAX(color) as color").
		Joins("JOIN contacts ON contact_tags.contact_id = contacts.id").
		Where("contacts.tenant_id = ?", tenantID).
		Group("tag").
		Order("count DESC").
		Limit(10).
		Scan(&tagCounts)
	
	for _, tc := range tagCounts {
		stats.TopTags = append(stats.TopTags, models.TagCount{
			Tag:      tc.Tag,
			Count:    tc.Count,
			Category: tc.Category,
			Color:    tc.Color,
		})
	}

	// Average lead score
	s.db.Model(&models.Contact{}).
		Where("tenant_id = ?", tenantID).
		Select("AVG(lead_score)").
		Scan(&stats.AvgLeadScore)

	// Total lifetime value
	s.db.Model(&models.Contact{}).
		Where("tenant_id = ?", tenantID).
		Select("SUM(lifetime_value)").
		Scan(&stats.TotalLifetimeValue)

	return stats, nil
}