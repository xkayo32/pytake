package conversation

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/redis"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Service handles conversation business logic
type Service struct {
	db     *gorm.DB
	redis  *redis.Client
	logger *zap.SugaredLogger
}

// NewService creates a new conversation service
func NewService(db *gorm.DB, redis *redis.Client, logger *zap.SugaredLogger) *Service {
	return &Service{
		db:     db,
		redis:  redis,
		logger: logger,
	}
}

// CreateConversation creates a new conversation
func (s *Service) CreateConversation(tenantID uuid.UUID, req *CreateConversationRequest) (*models.Conversation, error) {
	// Check if contact exists or create new one
	contact, err := s.findOrCreateContact(tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to find or create contact: %w", err)
	}

	// Check for existing open conversation
	var existingConv models.Conversation
	err = s.db.Where("tenant_id = ? AND contact_id = ? AND status IN (?, ?)",
		tenantID, contact.ID, models.ConversationStatusOpen, models.ConversationStatusPending).
		First(&existingConv).Error
	
	if err == nil {
		// Return existing conversation
		return &existingConv, nil
	}

	// Create new conversation
	conversation := &models.Conversation{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		ContactID:        contact.ID,
		Status:          models.ConversationStatusOpen,
		Channel:         req.Channel,
		WhatsAppConfigID: req.WhatsAppConfigID,
		AssignedUserID:  req.AssignedUserID,
		Metadata:        req.Metadata,
	}

	if err := s.db.Create(conversation).Error; err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	// Load associations
	s.db.Preload("Contact").Preload("WhatsAppConfig").Preload("AssignedUser").First(conversation, conversation.ID)

	return conversation, nil
}

// GetConversation retrieves a conversation by ID
func (s *Service) GetConversation(id uuid.UUID, tenantID uuid.UUID) (*models.Conversation, error) {
	var conversation models.Conversation
	err := s.db.Preload("Contact").
		Preload("WhatsAppConfig").
		Preload("AssignedUser").
		Preload("Tags").
		Where("id = ? AND tenant_id = ?", id, tenantID).
		First(&conversation).Error
	
	if err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	return &conversation, nil
}

// GetConversations retrieves conversations with filters
func (s *Service) GetConversations(filter *models.ConversationFilter) ([]models.Conversation, int64, error) {
	query := s.db.Model(&models.Conversation{}).
		Preload("Contact").
		Preload("WhatsAppConfig").
		Preload("AssignedUser").
		Preload("Tags").
		Where("tenant_id = ?", filter.TenantID)

	// Apply filters
	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}
	if filter.Channel != nil {
		query = query.Where("channel = ?", *filter.Channel)
	}
	if filter.AssignedUserID != nil {
		query = query.Where("assigned_user_id = ?", *filter.AssignedUserID)
	}
	if filter.ContactID != nil {
		query = query.Where("contact_id = ?", *filter.ContactID)
	}
	if filter.UnreadOnly {
		query = query.Where("unread_count > 0")
	}
	if len(filter.Tags) > 0 {
		query = query.Joins("JOIN conversation_tags ON conversation_tags.conversation_id = conversations.id").
			Where("conversation_tags.tag IN ?", filter.Tags)
	}
	if filter.SearchTerm != "" {
		searchPattern := "%" + filter.SearchTerm + "%"
		query = query.Joins("JOIN contacts ON contacts.id = conversations.contact_id").
			Where("contacts.name ILIKE ? OR contacts.phone ILIKE ? OR contacts.email ILIKE ? OR conversations.last_message_preview ILIKE ?",
				searchPattern, searchPattern, searchPattern, searchPattern)
	}
	if filter.DateFrom != nil {
		query = query.Where("conversations.created_at >= ?", *filter.DateFrom)
	}
	if filter.DateTo != nil {
		query = query.Where("conversations.created_at <= ?", *filter.DateTo)
	}
	if filter.HasSatisfaction != nil {
		if *filter.HasSatisfaction {
			query = query.Where("satisfaction_rating IS NOT NULL")
		} else {
			query = query.Where("satisfaction_rating IS NULL")
		}
	}
	if filter.MinRating != nil {
		query = query.Where("satisfaction_rating >= ?", *filter.MinRating)
	}
	if filter.MaxRating != nil {
		query = query.Where("satisfaction_rating <= ?", *filter.MaxRating)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Apply ordering
	orderBy := filter.OrderBy
	if orderBy == "" {
		orderBy = "last_message_at"
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

	var conversations []models.Conversation
	if err := query.Find(&conversations).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get conversations: %w", err)
	}

	return conversations, total, nil
}

// UpdateConversation updates a conversation
func (s *Service) UpdateConversation(id uuid.UUID, tenantID uuid.UUID, req *UpdateConversationRequest) (*models.Conversation, error) {
	var conversation models.Conversation
	if err := s.db.Where("id = ? AND tenant_id = ?", id, tenantID).First(&conversation).Error; err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	// Update fields if provided
	if req.Status != nil {
		conversation.Status = *req.Status
		if *req.Status == models.ConversationStatusClosed {
			now := time.Now()
			conversation.ClosedAt = &now
			conversation.ClosedByID = req.ClosedByID
		}
	}
	if req.AssignedUserID != nil {
		conversation.AssignedUserID = req.AssignedUserID
	}
	if req.Notes != "" {
		conversation.Notes = req.Notes
	}
	if req.SatisfactionRating != nil {
		conversation.SatisfactionRating = req.SatisfactionRating
	}
	if req.Metadata != nil {
		conversation.Metadata = req.Metadata
	}

	if err := s.db.Save(&conversation).Error; err != nil {
		return nil, fmt.Errorf("failed to update conversation: %w", err)
	}

	// Load associations
	s.db.Preload("Contact").Preload("WhatsAppConfig").Preload("AssignedUser").First(&conversation, conversation.ID)

	return &conversation, nil
}

// DeleteConversation deletes a conversation
func (s *Service) DeleteConversation(id uuid.UUID, tenantID uuid.UUID) error {
	result := s.db.Where("id = ? AND tenant_id = ?", id, tenantID).Delete(&models.Conversation{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete conversation: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("conversation not found")
	}
	return nil
}

// AddTag adds a tag to a conversation
func (s *Service) AddTag(conversationID uuid.UUID, tenantID uuid.UUID, tag string, userID uuid.UUID) error {
	// Verify conversation belongs to tenant
	var conversation models.Conversation
	if err := s.db.Where("id = ? AND tenant_id = ?", conversationID, tenantID).First(&conversation).Error; err != nil {
		return fmt.Errorf("conversation not found: %w", err)
	}

	// Check if tag already exists
	var existingTag models.ConversationTag
	err := s.db.Where("conversation_id = ? AND tag = ?", conversationID, tag).First(&existingTag).Error
	if err == nil {
		return nil // Tag already exists
	}

	// Create new tag
	conversationTag := &models.ConversationTag{
		ConversationID: conversationID,
		Tag:           tag,
		CreatedByID:   userID,
	}

	if err := s.db.Create(conversationTag).Error; err != nil {
		return fmt.Errorf("failed to add tag: %w", err)
	}

	return nil
}

// RemoveTag removes a tag from a conversation
func (s *Service) RemoveTag(conversationID uuid.UUID, tenantID uuid.UUID, tag string) error {
	// Verify conversation belongs to tenant
	var conversation models.Conversation
	if err := s.db.Where("id = ? AND tenant_id = ?", conversationID, tenantID).First(&conversation).Error; err != nil {
		return fmt.Errorf("conversation not found: %w", err)
	}

	result := s.db.Where("conversation_id = ? AND tag = ?", conversationID, tag).Delete(&models.ConversationTag{})
	if result.Error != nil {
		return fmt.Errorf("failed to remove tag: %w", result.Error)
	}

	return nil
}

// MarkAsRead marks all messages in a conversation as read
func (s *Service) MarkAsRead(conversationID uuid.UUID, tenantID uuid.UUID) error {
	// Reset unread count
	result := s.db.Model(&models.Conversation{}).
		Where("id = ? AND tenant_id = ?", conversationID, tenantID).
		Update("unread_count", 0)
	
	if result.Error != nil {
		return fmt.Errorf("failed to mark as read: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("conversation not found")
	}

	// Update message read status
	now := time.Now()
	s.db.Model(&models.Message{}).
		Where("conversation_id = ? AND direction = ? AND read_at IS NULL", 
			conversationID, models.MessageDirectionInbound).
		Update("read_at", now)

	return nil
}

// GetConversationStats gets conversation statistics
func (s *Service) GetConversationStats(tenantID uuid.UUID) (*models.ConversationStats, error) {
	stats := &models.ConversationStats{
		ByChannel: make(map[string]int),
		ByStatus:  make(map[string]int),
		ByUser:    make(map[string]int),
	}

	// Total conversations
	var totalCount int64
	s.db.Model(&models.Conversation{}).Where("tenant_id = ?", tenantID).Count(&totalCount)
	stats.TotalConversations = int(totalCount)

	// By status
	var statusCounts []struct {
		Status string
		Count  int
	}
	s.db.Model(&models.Conversation{}).
		Select("status, COUNT(*) as count").
		Where("tenant_id = ?", tenantID).
		Group("status").
		Scan(&statusCounts)
	
	for _, sc := range statusCounts {
		stats.ByStatus[sc.Status] = sc.Count
		switch models.ConversationStatus(sc.Status) {
		case models.ConversationStatusOpen:
			stats.OpenConversations = sc.Count
		case models.ConversationStatusClosed:
			stats.ClosedConversations = sc.Count
		case models.ConversationStatusArchived:
			stats.ArchivedConversations = sc.Count
		}
	}

	// By channel
	var channelCounts []struct {
		Channel string
		Count   int
	}
	s.db.Model(&models.Conversation{}).
		Select("channel, COUNT(*) as count").
		Where("tenant_id = ?", tenantID).
		Group("channel").
		Scan(&channelCounts)
	
	for _, cc := range channelCounts {
		stats.ByChannel[cc.Channel] = cc.Count
	}

	// Total unread
	var totalUnread int64
	s.db.Model(&models.Conversation{}).
		Where("tenant_id = ?", tenantID).
		Select("COALESCE(SUM(unread_count), 0)").
		Scan(&totalUnread)
	stats.TotalUnread = int(totalUnread)

	// Average response time
	s.db.Model(&models.Conversation{}).
		Where("tenant_id = ? AND first_response_at IS NOT NULL", tenantID).
		Select("AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)))").
		Scan(&stats.AvgResponseTime)

	// Average waiting time
	s.db.Model(&models.Conversation{}).
		Where("tenant_id = ?", tenantID).
		Select("AVG(waiting_time)").
		Scan(&stats.AvgWaitingTime)

	// Average satisfaction
	s.db.Model(&models.Conversation{}).
		Where("tenant_id = ? AND satisfaction_rating IS NOT NULL", tenantID).
		Select("AVG(satisfaction_rating)").
		Scan(&stats.AvgSatisfaction)

	// Recent activity
	var recentConversations []models.Conversation
	s.db.Preload("Contact").
		Where("tenant_id = ?", tenantID).
		Order("last_message_at DESC").
		Limit(10).
		Find(&recentConversations)
	
	for _, conv := range recentConversations {
		activity := models.ConversationActivity{
			ConversationID: conv.ID,
			LastMessage:    conv.LastMessagePreview,
			UnreadCount:    conv.UnreadCount,
			Status:        string(conv.Status),
			Channel:       string(conv.Channel),
		}
		if conv.Contact != nil {
			activity.ContactName = conv.Contact.Name
		}
		if conv.LastMessageAt != nil {
			activity.LastMessageAt = *conv.LastMessageAt
		}
		stats.RecentActivity = append(stats.RecentActivity, activity)
	}

	return stats, nil
}

// findOrCreateContact finds or creates a contact
func (s *Service) findOrCreateContact(tenantID uuid.UUID, req *CreateConversationRequest) (*models.Contact, error) {
	if req.ContactID != nil {
		var contact models.Contact
		if err := s.db.Where("id = ? AND tenant_id = ?", *req.ContactID, tenantID).First(&contact).Error; err != nil {
			return nil, fmt.Errorf("contact not found: %w", err)
		}
		return &contact, nil
	}

	// Create new contact if phone provided
	if req.ContactPhone != "" {
		var contact models.Contact
		err := s.db.Where("whatsapp_phone = ? AND tenant_id = ?", req.ContactPhone, tenantID).First(&contact).Error
		if err == nil {
			return &contact, nil
		}

		// Create new contact
		contact = models.Contact{
			TenantModel: models.TenantModel{
				TenantID: tenantID,
			},
			Name:          req.ContactName,
			WhatsAppPhone: req.ContactPhone,
			Phone:         req.ContactPhone,
			Source:        "whatsapp",
			Status:        models.ContactStatusActive,
		}

		if err := s.db.Create(&contact).Error; err != nil {
			return nil, fmt.Errorf("failed to create contact: %w", err)
		}

		return &contact, nil
	}

	return nil, fmt.Errorf("contact ID or phone is required")
}

// GetOrCreateConversationByPhone gets or creates a conversation by phone number
func (s *Service) GetOrCreateConversationByPhone(ctx context.Context, tenantID uuid.UUID, phone string, channel models.ConversationChannel, whatsappConfigID *uuid.UUID) (*models.Conversation, error) {
	// Normalize phone number
	phone = strings.TrimSpace(phone)
	
	// Find or create contact
	var contact models.Contact
	err := s.db.Where("whatsapp_phone = ? AND tenant_id = ?", phone, tenantID).First(&contact).Error
	if err != nil {
		// Create new contact
		contact = models.Contact{
			TenantModel: models.TenantModel{
				TenantID: tenantID,
			},
			Name:          phone, // Use phone as name initially
			WhatsAppPhone: phone,
			Phone:         phone,
			Source:        string(channel),
			Status:        models.ContactStatusActive,
		}
		
		if err := s.db.Create(&contact).Error; err != nil {
			return nil, fmt.Errorf("failed to create contact: %w", err)
		}
	}

	// Find existing open conversation
	var conversation models.Conversation
	err = s.db.Where("tenant_id = ? AND contact_id = ? AND status IN (?, ?)",
		tenantID, contact.ID, models.ConversationStatusOpen, models.ConversationStatusPending).
		First(&conversation).Error
	
	if err == nil {
		// Return existing conversation
		return &conversation, nil
	}

	// Create new conversation
	conversation = models.Conversation{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		ContactID:        contact.ID,
		Status:          models.ConversationStatusOpen,
		Channel:         channel,
		WhatsAppConfigID: whatsappConfigID,
	}

	if err := s.db.Create(&conversation).Error; err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	return &conversation, nil
}

// AddMessage adds a message to a conversation
func (s *Service) AddMessage(tenantID uuid.UUID, req *SendMessageRequest) (*models.Message, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	// Verify conversation belongs to tenant
	var conversation models.Conversation
	if err := tx.Where("id = ? AND tenant_id = ?", req.ConversationID, tenantID).First(&conversation).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	// Create message
	message := &models.Message{
		TenantModel: models.TenantModel{
			TenantID: tenantID,
		},
		ConversationID: conversation.ID,
		ContactID:      conversation.ContactID,
		Direction:      models.MessageDirectionInbound, // Default, can be overridden
		Type:           req.Type,
		Status:         models.MessageStatusReceived,
		Content:        req.Content,
		MediaURL:       req.MediaURL,
		ReplyToID:      req.ReplyToID,
		Metadata:       req.Metadata,
	}

	// Handle media messages
	if req.MediaURL != "" {
		message.Content = req.MediaCaption
	}

	if err := tx.Create(message).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	// Update conversation last message info
	now := time.Now()
	preview := message.Content
	if len(preview) > 100 {
		preview = preview[:100] + "..."
	}

	updates := map[string]interface{}{
		"last_message_at":      now,
		"last_message_preview": preview,
		"last_message_type":    message.Type,
		"last_message_from":    string(message.Direction),
		"updated_at":           now,
	}

	// Increment unread count if inbound
	if message.Direction == models.MessageDirectionInbound {
		tx.Model(&models.Conversation{}).Where("id = ?", conversation.ID).Update("unread_count", gorm.Expr("unread_count + ?", 1))
	}

	tx.Model(&models.Conversation{}).Where("id = ?", conversation.ID).Updates(updates)

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return message, nil
}

// GetMessages retrieves messages for a conversation
func (s *Service) GetMessages(conversationID uuid.UUID, tenantID uuid.UUID, filter *models.MessageFilter) ([]models.Message, int64, error) {
	// Verify conversation belongs to tenant
	var conversation models.Conversation
	if err := s.db.Where("id = ? AND tenant_id = ?", conversationID, tenantID).First(&conversation).Error; err != nil {
		return nil, 0, fmt.Errorf("conversation not found: %w", err)
	}

	query := s.db.Model(&models.Message{}).Where("conversation_id = ?", conversationID)

	// Apply filters
	if filter != nil {
		if filter.Direction != nil {
			query = query.Where("direction = ?", *filter.Direction)
		}
		if filter.Status != nil {
			query = query.Where("status = ?", *filter.Status)
		}
		if filter.Type != nil {
			query = query.Where("type = ?", *filter.Type)
		}
		if filter.SearchTerm != "" {
			searchPattern := "%" + filter.SearchTerm + "%"
			query = query.Where("content ILIKE ?", searchPattern)
		}
		if filter.DateFrom != nil {
			query = query.Where("created_at >= ?", *filter.DateFrom)
		}
		if filter.DateTo != nil {
			query = query.Where("created_at <= ?", *filter.DateTo)
		}
		if filter.HasMedia != nil {
			if *filter.HasMedia {
				query = query.Where("media_url IS NOT NULL AND media_url != ''")
			} else {
				query = query.Where("media_url IS NULL OR media_url = ''")
			}
		}
		if filter.IsTemplate != nil {
			if *filter.IsTemplate {
				query = query.Where("template_name IS NOT NULL AND template_name != ''")
			} else {
				query = query.Where("template_name IS NULL OR template_name = ''")
			}
		}
		if filter.AIProcessed != nil {
			query = query.Where("ai_processed = ?", *filter.AIProcessed)
		}
	}

	// Count total
	var total int64
	query.Count(&total)

	// Apply ordering
	orderBy := "created_at"
	if filter != nil && filter.OrderBy != "" {
		orderBy = filter.OrderBy
	}
	if filter != nil && filter.OrderDesc {
		orderBy += " DESC"
	} else {
		orderBy += " ASC"
	}
	query = query.Order(orderBy)

	// Apply pagination
	if filter != nil {
		if filter.Limit > 0 {
			query = query.Limit(filter.Limit)
		}
		if filter.Offset > 0 {
			query = query.Offset(filter.Offset)
		}
	}

	var messages []models.Message
	if err := query.Preload("ReplyTo").Preload("User").Find(&messages).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, total, nil
}

// GetMessageStats gets message statistics for a conversation
func (s *Service) GetMessageStats(conversationID uuid.UUID, tenantID uuid.UUID) (*models.MessageStats, error) {
	// Verify conversation belongs to tenant
	var conversation models.Conversation
	if err := s.db.Where("id = ? AND tenant_id = ?", conversationID, tenantID).First(&conversation).Error; err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	stats := &models.MessageStats{
		ByStatus:    make(map[string]int),
		ByType:      make(map[string]int),
		ByDirection: make(map[string]int),
		HourlyDistribution: make(map[int]int),
	}

	// Total messages
	var totalCount int64
	s.db.Model(&models.Message{}).Where("conversation_id = ?", conversationID).Count(&totalCount)
	stats.TotalMessages = int(totalCount)

	// By direction
	var directionCounts []struct {
		Direction string
		Count     int
	}
	s.db.Model(&models.Message{}).
		Select("direction, COUNT(*) as count").
		Where("conversation_id = ?", conversationID).
		Group("direction").
		Scan(&directionCounts)

	for _, dc := range directionCounts {
		stats.ByDirection[dc.Direction] = dc.Count
		if models.MessageDirection(dc.Direction) == models.MessageDirectionInbound {
			stats.InboundMessages = dc.Count
		} else {
			stats.OutboundMessages = dc.Count
		}
	}

	// By status
	var statusCounts []struct {
		Status string
		Count  int
	}
	s.db.Model(&models.Message{}).
		Select("status, COUNT(*) as count").
		Where("conversation_id = ?", conversationID).
		Group("status").
		Scan(&statusCounts)

	for _, sc := range statusCounts {
		stats.ByStatus[sc.Status] = sc.Count
	}

	// By type
	var typeCounts []struct {
		Type  string
		Count int
	}
	s.db.Model(&models.Message{}).
		Select("type, COUNT(*) as count").
		Where("conversation_id = ?", conversationID).
		Group("type").
		Scan(&typeCounts)

	for _, tc := range typeCounts {
		stats.ByType[tc.Type] = tc.Count
	}

	// Time-based stats
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -7)
	monthStart := todayStart.AddDate(0, -1, 0)

	// Today's messages
	var todayCount int64
	s.db.Model(&models.Message{}).Where("conversation_id = ? AND created_at >= ?", conversationID, todayStart).Count(&todayCount)
	stats.TodayMessages = int(todayCount)

	// Week's messages
	var weekCount int64
	s.db.Model(&models.Message{}).Where("conversation_id = ? AND created_at >= ?", conversationID, weekStart).Count(&weekCount)
	stats.WeekMessages = int(weekCount)

	// Month's messages
	var monthCount int64
	s.db.Model(&models.Message{}).Where("conversation_id = ? AND created_at >= ?", conversationID, monthStart).Count(&monthCount)
	stats.MonthMessages = int(monthCount)

	// Hourly distribution
	var hourlyData []struct {
		Hour  int
		Count int
	}
	s.db.Model(&models.Message{}).
		Select("EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count").
		Where("conversation_id = ? AND created_at >= ?", conversationID, monthStart).
		Group("hour").
		Scan(&hourlyData)

	for _, hd := range hourlyData {
		stats.HourlyDistribution[hd.Hour] = hd.Count
	}

	// Average response time (outbound messages after inbound)
	var avgResponseTime float64
	s.db.Raw(`
		SELECT AVG(EXTRACT(EPOCH FROM (outbound.created_at - inbound.created_at)))
		FROM messages inbound
		JOIN messages outbound ON outbound.conversation_id = inbound.conversation_id
			AND outbound.created_at > inbound.created_at
			AND outbound.direction = 'outbound'
		WHERE inbound.conversation_id = ? 
			AND inbound.direction = 'inbound'
			AND outbound.created_at - inbound.created_at = (
				SELECT MIN(o2.created_at - inbound.created_at)
				FROM messages o2
				WHERE o2.conversation_id = inbound.conversation_id
					AND o2.created_at > inbound.created_at
					AND o2.direction = 'outbound'
			)
	`, conversationID).Scan(&avgResponseTime)
	stats.AvgResponseTime = avgResponseTime

	// Delivery and read rates for outbound messages
	var outboundTotal, deliveredCount, readCount int64
	s.db.Model(&models.Message{}).Where("conversation_id = ? AND direction = ?", conversationID, models.MessageDirectionOutbound).Count(&outboundTotal)
	s.db.Model(&models.Message{}).Where("conversation_id = ? AND direction = ? AND status = ?", conversationID, models.MessageDirectionOutbound, models.MessageStatusDelivered).Count(&deliveredCount)
	s.db.Model(&models.Message{}).Where("conversation_id = ? AND direction = ? AND status = ?", conversationID, models.MessageDirectionOutbound, models.MessageStatusRead).Count(&readCount)

	if outboundTotal > 0 {
		stats.DeliveryRate = float64(deliveredCount) / float64(outboundTotal) * 100
		stats.ReadRate = float64(readCount) / float64(outboundTotal) * 100
	}

	return stats, nil
}

// TransferConversation transfers a conversation to another user
func (s *Service) TransferConversation(conversationID uuid.UUID, tenantID uuid.UUID, newUserID uuid.UUID, transferredByID uuid.UUID) error {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
	}()

	// Verify conversation exists
	var conversation models.Conversation
	if err := tx.Where("id = ? AND tenant_id = ?", conversationID, tenantID).First(&conversation).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("conversation not found: %w", err)
	}

	// Update assigned user
	if err := tx.Model(&conversation).Update("assigned_user_id", newUserID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to transfer conversation: %w", err)
	}

	// Add transfer note
	transferNote := fmt.Sprintf("Conversation transferred to user %s", newUserID.String())
	if conversation.Notes != "" {
		transferNote = conversation.Notes + "\n\n" + transferNote
	}
	tx.Model(&conversation).Update("notes", transferNote)

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transfer: %w", err)
	}

	s.logger.Infow("Conversation transferred",
		"conversation_id", conversationID,
		"from_user_id", conversation.AssignedUserID,
		"to_user_id", newUserID,
		"transferred_by", transferredByID,
	)

	return nil
}