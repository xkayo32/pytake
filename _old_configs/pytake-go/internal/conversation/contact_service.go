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

// ImportContacts imports contacts from a CSV file
func (s *ContactService) ImportContacts(tenantID uuid.UUID, fileName string, data [][]string, mappingRules map[string]interface{}, userID uuid.UUID) (*models.ContactImport, error) {
	// Create import record
	importRecord := &models.ContactImport{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		FileName:       fileName,
		Status:         "processing",
		TotalRecords:   len(data) - 1, // Exclude header
		MappingRules:   models.JSON(mappingRules),
		CreatedByID:    userID,
	}

	now := time.Now()
	importRecord.StartedAt = &now

	if err := s.db.Create(importRecord).Error; err != nil {
		return nil, fmt.Errorf("failed to create import record: %w", err)
	}

	// Process contacts in batches
	go s.processContactImport(importRecord, data, mappingRules)

	return importRecord, nil
}

// processContactImport processes the contact import in background
func (s *ContactService) processContactImport(importRecord *models.ContactImport, data [][]string, mappingRules map[string]interface{}) {
	defer func() {
		if r := recover(); r != nil {
			s.logger.Errorw("Contact import panicked", "error", r, "import_id", importRecord.ID)
			now := time.Now()
			importRecord.Status = "failed"
			importRecord.CompletedAt = &now
			s.db.Save(importRecord)
		}
	}()

	headers := data[0]
	rows := data[1:]

	var errors []string
	successCount := 0
	errorCount := 0

	// Process each row
	for i, row := range rows {
		// Map row data to contact fields
		contactData := make(map[string]string)
		for j, value := range row {
			if j < len(headers) {
				header := headers[j]
				contactData[header] = value
			}
		}

		// Create contact from mapped data
		contact := &models.Contact{
			TenantModel: models.TenantModel{
				TenantID: importRecord.TenantID,
			},
			Source: "import",
			Status: models.ContactStatusActive,
		}

		// Apply mapping rules
		if name, ok := contactData["name"]; ok && name != "" {
			contact.Name = name
		}
		if phone, ok := contactData["phone"]; ok && phone != "" {
			contact.Phone = phone
			contact.WhatsAppPhone = phone // Default to same as phone
		}
		if whatsappPhone, ok := contactData["whatsapp_phone"]; ok && whatsappPhone != "" {
			contact.WhatsAppPhone = whatsappPhone
		}
		if email, ok := contactData["email"]; ok && email != "" {
			contact.Email = email
		}
		if company, ok := contactData["company"]; ok && company != "" {
			contact.CompanyName = company
		}
		if jobTitle, ok := contactData["job_title"]; ok && jobTitle != "" {
			contact.JobTitle = jobTitle
		}

		// Validate required fields
		if contact.Name == "" {
			errorMsg := fmt.Sprintf("Row %d: Name is required", i+2)
			errors = append(errors, errorMsg)
			errorCount++
			continue
		}

		// Check for duplicates
		if contact.WhatsAppPhone != "" {
			var existing models.Contact
			err := s.db.Where("whatsapp_phone = ? AND tenant_id = ?", contact.WhatsAppPhone, importRecord.TenantID).First(&existing).Error
			if err == nil {
				errorMsg := fmt.Sprintf("Row %d: Contact with WhatsApp phone %s already exists", i+2, contact.WhatsAppPhone)
				errors = append(errors, errorMsg)
				errorCount++
				continue
			}
		}

		// Create contact
		if err := s.db.Create(contact).Error; err != nil {
			errorMsg := fmt.Sprintf("Row %d: Failed to create contact - %v", i+2, err)
			errors = append(errors, errorMsg)
			errorCount++
		} else {
			successCount++
		}

		// Update progress
		importRecord.ProcessedRecords = i + 1
		importRecord.SuccessCount = successCount
		importRecord.ErrorCount = errorCount
		s.db.Save(importRecord)
	}

	// Complete import
	now := time.Now()
	importRecord.Status = "completed"
	importRecord.CompletedAt = &now
	importRecord.SuccessCount = successCount
	importRecord.ErrorCount = errorCount
	if len(errors) > 0 {
		importRecord.Errors = models.JSON(errors)
	}

	s.db.Save(importRecord)

	s.logger.Infow("Contact import completed",
		"import_id", importRecord.ID,
		"success_count", successCount,
		"error_count", errorCount,
		"total_records", importRecord.TotalRecords,
	)
}

// GetContactImport retrieves an import record
func (s *ContactService) GetContactImport(id uuid.UUID, tenantID uuid.UUID) (*models.ContactImport, error) {
	var importRecord models.ContactImport
	err := s.db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&importRecord).Error
	if err != nil {
		return nil, fmt.Errorf("import record not found: %w", err)
	}
	return &importRecord, nil
}

// GetContactImports retrieves import history
func (s *ContactService) GetContactImports(tenantID uuid.UUID, limit, offset int) ([]models.ContactImport, int64, error) {
	var imports []models.ContactImport
	var total int64

	query := s.db.Model(&models.ContactImport{}).Where("tenant_id = ?", tenantID)
	query.Count(&total)

	err := query.Preload("CreatedBy").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&imports).Error

	if err != nil {
		return nil, 0, fmt.Errorf("failed to get imports: %w", err)
	}

	return imports, total, nil
}

// MergeContacts merges two contacts
func (s *ContactService) MergeContacts(primaryID, secondaryID uuid.UUID, tenantID uuid.UUID) error {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	// Get both contacts
	var primary, secondary models.Contact
	if err := tx.Where("id = ? AND tenant_id = ?", primaryID, tenantID).First(&primary).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("primary contact not found: %w", err)
	}
	if err := tx.Where("id = ? AND tenant_id = ?", secondaryID, tenantID).First(&secondary).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("secondary contact not found: %w", err)
	}

	// Merge data from secondary to primary
	if primary.Email == "" && secondary.Email != "" {
		primary.Email = secondary.Email
	}
	if primary.Phone == "" && secondary.Phone != "" {
		primary.Phone = secondary.Phone
	}
	if primary.CompanyName == "" && secondary.CompanyName != "" {
		primary.CompanyName = secondary.CompanyName
	}
	if primary.JobTitle == "" && secondary.JobTitle != "" {
		primary.JobTitle = secondary.JobTitle
	}
	if primary.Address == "" && secondary.Address != "" {
		primary.Address = secondary.Address
	}
	if primary.ProfilePictureURL == "" && secondary.ProfilePictureURL != "" {
		primary.ProfilePictureURL = secondary.ProfilePictureURL
	}

	// Merge custom fields
	if len(primary.CustomFields) == 0 && len(secondary.CustomFields) > 0 {
		primary.CustomFields = secondary.CustomFields
	}

	// Update statistics
	primary.TotalMessages += secondary.TotalMessages
	primary.TotalConversations += secondary.TotalConversations
	primary.LifetimeValue += secondary.LifetimeValue

	// Use earliest contact date
	if secondary.FirstContactAt != nil && (primary.FirstContactAt == nil || secondary.FirstContactAt.Before(*primary.FirstContactAt)) {
		primary.FirstContactAt = secondary.FirstContactAt
	}

	// Use latest contact date
	if secondary.LastContactAt != nil && (primary.LastContactAt == nil || secondary.LastContactAt.After(*primary.LastContactAt)) {
		primary.LastContactAt = secondary.LastContactAt
	}

	// Update primary contact
	if err := tx.Save(&primary).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update primary contact: %w", err)
	}

	// Move conversations from secondary to primary
	if err := tx.Model(&models.Conversation{}).Where("contact_id = ?", secondaryID).Update("contact_id", primaryID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to move conversations: %w", err)
	}

	// Move messages from secondary to primary
	if err := tx.Model(&models.Message{}).Where("contact_id = ?", secondaryID).Update("contact_id", primaryID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to move messages: %w", err)
	}

	// Move tags from secondary to primary (avoid duplicates)
	var secondaryTags []models.ContactTag
	tx.Where("contact_id = ?", secondaryID).Find(&secondaryTags)
	for _, tag := range secondaryTags {
		// Check if tag already exists on primary
		var existingTag models.ContactTag
		err := tx.Where("contact_id = ? AND tag = ?", primaryID, tag.Tag).First(&existingTag).Error
		if err != nil {
			// Tag doesn't exist, move it
			tag.ContactID = primaryID
			tx.Save(&tag)
		} else {
			// Tag exists, delete the duplicate
			tx.Delete(&tag)
		}
	}

	// Move notes from secondary to primary
	if err := tx.Model(&models.ContactNote{}).Where("contact_id = ?", secondaryID).Update("contact_id", primaryID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to move notes: %w", err)
	}

	// Delete secondary contact
	if err := tx.Delete(&secondary).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete secondary contact: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit merge: %w", err)
	}

	s.logger.Infow("Contacts merged successfully",
		"primary_id", primaryID,
		"secondary_id", secondaryID,
		"tenant_id", tenantID,
	)

	return nil
}

// UpdateContactStats updates contact statistics
func (s *ContactService) UpdateContactStats(contactID uuid.UUID) error {
	// Count total messages for this contact
	var messageCount int64
	s.db.Model(&models.Message{}).Where("contact_id = ?", contactID).Count(&messageCount)

	// Count total conversations for this contact
	var conversationCount int64
	s.db.Model(&models.Conversation{}).Where("contact_id = ?", contactID).Count(&conversationCount)

	// Get last contact time from latest message
	var lastMessage models.Message
	err := s.db.Where("contact_id = ?", contactID).Order("created_at DESC").First(&lastMessage).Error
	var lastContactAt *time.Time
	if err == nil {
		lastContactAt = &lastMessage.CreatedAt
	}

	// Update contact statistics
	return s.db.Model(&models.Contact{}).Where("id = ?", contactID).Updates(map[string]interface{}{
		"total_messages":     messageCount,
		"total_conversations": conversationCount,
		"last_contact_at":    lastContactAt,
		"updated_at":         time.Now(),
	}).Error
}