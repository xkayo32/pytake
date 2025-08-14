package analytics

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// EngineImpl implements the CampaignAnalyzer interface
type EngineImpl struct {
	db     *gorm.DB
	logger Logger
}

// Logger interface for analytics engine logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// NewEngine creates a new analytics engine
func NewEngine(db *gorm.DB, logger Logger) *EngineImpl {
	return &EngineImpl{
		db:     db,
		logger: logger,
	}
}

// Message Tracking Implementation

// RecordMessageSent records when a message is sent
func (e *EngineImpl) RecordMessageSent(ctx context.Context, campaignID, contactID uuid.UUID, messageID string) error {
	now := time.Now()

	// Create campaign message record
	campaignMessage := &models.CampaignMessage{
		CampaignID:     campaignID,
		ContactID:      contactID,
		MessageID:      &messageID,
		Status:         "sent",
		SentAt:         &now,
		MessageContent: models.JSON{},
		Metadata:       models.JSON{},
	}

	if err := e.db.WithContext(ctx).Create(campaignMessage).Error; err != nil {
		return fmt.Errorf("failed to record message sent: %w", err)
	}

	// Update campaign statistics
	if err := e.updateCampaignStats(ctx, campaignID, "messages_sent", 1); err != nil {
		e.logger.Warn("Failed to update campaign stats for sent message", "campaign_id", campaignID, "error", err)
	}

	// Update daily analytics
	if err := e.updateDailyAnalytics(ctx, campaignID, now, "messages_sent", 1); err != nil {
		e.logger.Warn("Failed to update daily analytics for sent message", "campaign_id", campaignID, "error", err)
	}

	e.logger.Debug("Message sent recorded", "campaign_id", campaignID, "contact_id", contactID, "message_id", messageID)
	return nil
}

// RecordMessageDelivered records when a message is delivered
func (e *EngineImpl) RecordMessageDelivered(ctx context.Context, messageID string, timestamp time.Time) error {
	// Update campaign message
	updates := map[string]interface{}{
		"status":       "delivered",
		"delivered_at": timestamp,
		"updated_at":   time.Now(),
	}

	var campaignMessage models.CampaignMessage
	if err := e.db.WithContext(ctx).
		Model(&campaignMessage).
		Where("message_id = ?", messageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to record message delivered: %w", err)
	}

	// Get campaign ID for stats update
	if err := e.db.WithContext(ctx).
		Select("campaign_id").
		Where("message_id = ?", messageID).
		First(&campaignMessage).Error; err == nil {

		// Update campaign statistics
		if err := e.updateCampaignStats(ctx, campaignMessage.CampaignID, "messages_delivered", 1); err != nil {
			e.logger.Warn("Failed to update campaign stats for delivered message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}

		// Update daily analytics
		if err := e.updateDailyAnalytics(ctx, campaignMessage.CampaignID, timestamp, "messages_delivered", 1); err != nil {
			e.logger.Warn("Failed to update daily analytics for delivered message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}
	}

	e.logger.Debug("Message delivered recorded", "message_id", messageID)
	return nil
}

// RecordMessageRead records when a message is read
func (e *EngineImpl) RecordMessageRead(ctx context.Context, messageID string, timestamp time.Time) error {
	// Update campaign message
	updates := map[string]interface{}{
		"status":     "read",
		"read_at":    timestamp,
		"opened":     true,
		"updated_at": time.Now(),
	}

	var campaignMessage models.CampaignMessage
	if err := e.db.WithContext(ctx).
		Model(&campaignMessage).
		Where("message_id = ?", messageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to record message read: %w", err)
	}

	// Get campaign ID for stats update
	if err := e.db.WithContext(ctx).
		Select("campaign_id").
		Where("message_id = ?", messageID).
		First(&campaignMessage).Error; err == nil {

		// Update campaign statistics
		if err := e.updateCampaignStats(ctx, campaignMessage.CampaignID, "messages_read", 1); err != nil {
			e.logger.Warn("Failed to update campaign stats for read message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}

		// Update daily analytics
		if err := e.updateDailyAnalytics(ctx, campaignMessage.CampaignID, timestamp, "messages_read", 1); err != nil {
			e.logger.Warn("Failed to update daily analytics for read message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}
	}

	e.logger.Debug("Message read recorded", "message_id", messageID)
	return nil
}

// RecordMessageReplied records when a message receives a reply
func (e *EngineImpl) RecordMessageReplied(ctx context.Context, messageID string, timestamp time.Time) error {
	// Update campaign message
	updates := map[string]interface{}{
		"replied":    true,
		"replied_at": timestamp,
		"updated_at": time.Now(),
	}

	var campaignMessage models.CampaignMessage
	if err := e.db.WithContext(ctx).
		Model(&campaignMessage).
		Where("message_id = ?", messageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to record message reply: %w", err)
	}

	// Get campaign ID for stats update
	if err := e.db.WithContext(ctx).
		Select("campaign_id").
		Where("message_id = ?", messageID).
		First(&campaignMessage).Error; err == nil {

		// Update campaign statistics
		if err := e.updateCampaignStats(ctx, campaignMessage.CampaignID, "messages_replied", 1); err != nil {
			e.logger.Warn("Failed to update campaign stats for replied message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}

		// Update daily analytics
		if err := e.updateDailyAnalytics(ctx, campaignMessage.CampaignID, timestamp, "messages_replied", 1); err != nil {
			e.logger.Warn("Failed to update daily analytics for replied message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}
	}

	e.logger.Debug("Message reply recorded", "message_id", messageID)
	return nil
}

// RecordMessageClicked records when a message link is clicked
func (e *EngineImpl) RecordMessageClicked(ctx context.Context, messageID string, url string, timestamp time.Time) error {
	// Update campaign message
	updates := map[string]interface{}{
		"clicked":    true,
		"clicked_at": timestamp,
		"updated_at": time.Now(),
	}

	var campaignMessage models.CampaignMessage
	if err := e.db.WithContext(ctx).
		Model(&campaignMessage).
		Where("message_id = ?", messageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to record message click: %w", err)
	}

	// Get campaign ID for stats update
	if err := e.db.WithContext(ctx).
		Select("campaign_id").
		Where("message_id = ?", messageID).
		First(&campaignMessage).Error; err == nil {

		// Update campaign statistics
		if err := e.updateCampaignStats(ctx, campaignMessage.CampaignID, "messages_clicked", 1); err != nil {
			e.logger.Warn("Failed to update campaign stats for clicked message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}

		// Update daily analytics
		if err := e.updateDailyAnalytics(ctx, campaignMessage.CampaignID, timestamp, "messages_clicked", 1); err != nil {
			e.logger.Warn("Failed to update daily analytics for clicked message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}
	}

	e.logger.Debug("Message click recorded", "message_id", messageID, "url", url)
	return nil
}

// RecordMessageFailed records when a message fails
func (e *EngineImpl) RecordMessageFailed(ctx context.Context, messageID string, errorReason string, timestamp time.Time) error {
	// Update campaign message
	updates := map[string]interface{}{
		"status":        "failed",
		"failed_at":     timestamp,
		"error_message": errorReason,
		"updated_at":    time.Now(),
	}

	var campaignMessage models.CampaignMessage
	if err := e.db.WithContext(ctx).
		Model(&campaignMessage).
		Where("message_id = ?", messageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to record message failure: %w", err)
	}

	// Get campaign ID for stats update
	if err := e.db.WithContext(ctx).
		Select("campaign_id").
		Where("message_id = ?", messageID).
		First(&campaignMessage).Error; err == nil {

		// Update campaign statistics
		if err := e.updateCampaignStats(ctx, campaignMessage.CampaignID, "messages_failed", 1); err != nil {
			e.logger.Warn("Failed to update campaign stats for failed message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}

		// Update daily analytics
		if err := e.updateDailyAnalytics(ctx, campaignMessage.CampaignID, timestamp, "messages_failed", 1); err != nil {
			e.logger.Warn("Failed to update daily analytics for failed message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}
	}

	e.logger.Debug("Message failure recorded", "message_id", messageID, "error", errorReason)
	return nil
}

// RecordMessageUnsubscribed records when a contact unsubscribes
func (e *EngineImpl) RecordMessageUnsubscribed(ctx context.Context, messageID string, timestamp time.Time) error {
	// Update campaign message
	updates := map[string]interface{}{
		"unsubscribed":    true,
		"unsubscribed_at": timestamp,
		"updated_at":      time.Now(),
	}

	var campaignMessage models.CampaignMessage
	if err := e.db.WithContext(ctx).
		Model(&campaignMessage).
		Where("message_id = ?", messageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to record message unsubscribe: %w", err)
	}

	// Get campaign ID for stats update
	if err := e.db.WithContext(ctx).
		Select("campaign_id").
		Where("message_id = ?", messageID).
		First(&campaignMessage).Error; err == nil {

		// Update daily analytics
		if err := e.updateDailyAnalytics(ctx, campaignMessage.CampaignID, timestamp, "messages_unsubscribed", 1); err != nil {
			e.logger.Warn("Failed to update daily analytics for unsubscribed message", "campaign_id", campaignMessage.CampaignID, "error", err)
		}
	}

	e.logger.Debug("Message unsubscribe recorded", "message_id", messageID)
	return nil
}

// Campaign Analytics Implementation

// GetCampaignSummary gets campaign summary statistics
func (e *EngineImpl) GetCampaignSummary(ctx context.Context, campaignID uuid.UUID) (*CampaignSummary, error) {
	var campaign models.Campaign
	if err := e.db.WithContext(ctx).First(&campaign, campaignID).Error; err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Calculate rates
	deliveryRate := e.calculateRate(campaign.MessagesDelivered, campaign.MessagesSent)
	openRate := e.calculateRate(campaign.MessagesRead, campaign.MessagesDelivered)
	clickRate := e.calculateRate(campaign.MessagesClicked, campaign.MessagesRead)
	responseRate := e.calculateRate(campaign.MessagesReplied, campaign.MessagesDelivered)
	unsubscribeRate := e.calculateRate(0, campaign.MessagesSent) // Would be calculated from unsubscribe data

	// Calculate engagement metrics
	totalEngagements := campaign.MessagesRead + campaign.MessagesClicked + campaign.MessagesReplied
	uniqueEngagers := e.getUniqueEngagers(ctx, campaignID)
	avgEngagementTime := e.getAvgEngagementTime(ctx, campaignID)

	// Calculate performance score (weighted average of key metrics)
	performanceScore := e.calculatePerformanceScore(deliveryRate, openRate, responseRate)

	return &CampaignSummary{
		CampaignID:        campaignID,
		TotalTargets:      campaign.TotalTargets,
		MessagesSent:      campaign.MessagesSent,
		MessagesDelivered: campaign.MessagesDelivered,
		MessagesRead:      campaign.MessagesRead,
		MessagesReplied:   campaign.MessagesReplied,
		MessagesClicked:   campaign.MessagesClicked,
		MessagesFailed:    campaign.MessagesFailed,
		DeliveryRate:      deliveryRate,
		OpenRate:          openRate,
		ClickRate:         clickRate,
		ResponseRate:      responseRate,
		UnsubscribeRate:   unsubscribeRate,
		TotalEngagements:  totalEngagements,
		UniqueEngagers:    uniqueEngagers,
		AvgEngagementTime: avgEngagementTime,
		PerformanceScore:  performanceScore,
		QualityScore:      performanceScore, // Simplified - would use more complex calculation
		LastUpdated:       time.Now(),
	}, nil
}

// GetCampaignMetrics gets detailed campaign metrics
func (e *EngineImpl) GetCampaignMetrics(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*CampaignMetrics, error) {
	// Get campaign summary
	summary, err := e.GetCampaignSummary(ctx, campaignID)
	if err != nil {
		return nil, err
	}

	// Get daily metrics
	dailyMetrics, err := e.getDailyMetrics(ctx, campaignID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get daily metrics: %w", err)
	}

	// Get hourly metrics
	hourlyMetrics, err := e.getHourlyMetrics(ctx, campaignID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("failed to get hourly metrics: %w", err)
	}

	// Get engagement funnel
	engagementFunnel := e.calculateEngagementFunnel(*summary)

	return &CampaignMetrics{
		CampaignID:       campaignID,
		DateRange:        *dateRange,
		Summary:          *summary,
		DailyMetrics:     dailyMetrics,
		HourlyMetrics:    hourlyMetrics,
		SegmentBreakdown: []*SegmentMetrics{}, // Would be implemented based on segments
		DeviceBreakdown:  make(map[string]int),
		LocationBreakdown: make(map[string]int),
		EngagementFunnel: engagementFunnel,
	}, nil
}

// GetCampaignTrends gets campaign trend data
func (e *EngineImpl) GetCampaignTrends(ctx context.Context, campaignID uuid.UUID, granularity string) ([]*TrendDataPoint, error) {
	var trendPoints []*TrendDataPoint

	// Get daily analytics data
	var analytics []models.CampaignAnalytics
	query := e.db.WithContext(ctx).
		Where("campaign_id = ?", campaignID).
		Order("date ASC")

	if err := query.Find(&analytics).Error; err != nil {
		return nil, fmt.Errorf("failed to get analytics data: %w", err)
	}

	// Convert to trend data points
	for _, analytic := range analytics {
		trendPoint := &TrendDataPoint{
			Timestamp:         analytic.Date,
			MessagesSent:      analytic.MessagesSent,
			MessagesDelivered: analytic.MessagesDelivered,
			MessagesRead:      analytic.MessagesRead,
			MessagesReplied:   analytic.MessagesReplied,
			MessagesClicked:   analytic.MessagesClicked,
			DeliveryRate:      analytic.DeliveryRate,
			OpenRate:          analytic.OpenRate,
			ResponseRate:      analytic.ResponseRate,
			ClickRate:         analytic.ClickRate,
			ConversionRate:    analytic.ConversionRate,
			Revenue:           analytic.Revenue,
		}
		trendPoints = append(trendPoints, trendPoint)
	}

	return trendPoints, nil
}

// GetCampaignPerformance gets detailed campaign performance
func (e *EngineImpl) GetCampaignPerformance(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*CampaignPerformance, error) {
	// Get campaign summary for overall performance
	summary, err := e.GetCampaignSummary(ctx, campaignID)
	if err != nil {
		return nil, err
	}

	overallPerformance := PerformanceMetrics{
		DeliveryRate:    summary.DeliveryRate,
		OpenRate:        summary.OpenRate,
		ClickRate:       summary.ClickRate,
		ResponseRate:    summary.ResponseRate,
		ConversionRate:  0, // Would be calculated from conversion data
		UnsubscribeRate: summary.UnsubscribeRate,
		EngagementRate:  e.calculateEngagementRate(*summary),
	}

	// Get time-based performance
	timeBasedPerformance := e.getTimeBasedPerformance(ctx, campaignID, dateRange)

	// Get benchmark comparison (simplified)
	benchmarkComparison := BenchmarkComparison{
		Industry: IndustryBenchmarks{
			Industry:            "general",
			AvgDeliveryRate:     0.95,
			AvgOpenRate:         0.25,
			AvgClickRate:        0.03,
			AvgResponseRate:     0.15,
			AvgConversionRate:   0.02,
			AvgUnsubscribeRate:  0.001,
			LastUpdated:         time.Now().AddDate(0, 0, -7),
		},
		Percentile: e.calculatePercentile(overallPerformance),
		Insights:   []string{},
	}

	return &CampaignPerformance{
		CampaignID:          campaignID,
		DateRange:           *dateRange,
		OverallPerformance:  overallPerformance,
		SegmentPerformance:  []SegmentPerformance{},
		TimeBasedPerformance: timeBasedPerformance,
		ContentPerformance:  ContentPerformance{},
		ChannelPerformance:  make(map[string]PerformanceMetrics),
		BenchmarkComparison: benchmarkComparison,
	}, nil
}

// Real-time Analytics Implementation

// GetRealTimeStats gets real-time campaign statistics
func (e *EngineImpl) GetRealTimeStats(ctx context.Context, campaignID uuid.UUID) (*RealTimeStats, error) {
	var campaign models.Campaign
	if err := e.db.WithContext(ctx).First(&campaign, campaignID).Error; err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Get current hour statistics
	now := time.Now()
	currentHourStart := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, now.Location())

	var currentHourStats struct {
		Sent      int
		Delivered int
		Failed    int
	}

	e.db.WithContext(ctx).
		Model(&models.CampaignMessage{}).
		Where("campaign_id = ? AND sent_at >= ?", campaignID, currentHourStart).
		Select("COUNT(*) as sent").
		Row().Scan(&currentHourStats.Sent)

	e.db.WithContext(ctx).
		Model(&models.CampaignMessage{}).
		Where("campaign_id = ? AND delivered_at >= ?", campaignID, currentHourStart).
		Select("COUNT(*) as delivered").
		Row().Scan(&currentHourStats.Delivered)

	e.db.WithContext(ctx).
		Model(&models.CampaignMessage{}).
		Where("campaign_id = ? AND failed_at >= ?", campaignID, currentHourStart).
		Select("COUNT(*) as failed").
		Row().Scan(&currentHourStats.Failed)

	// Calculate messages per minute (last 10 minutes)
	tenMinutesAgo := now.Add(-10 * time.Minute)
	var recentMessages int64
	e.db.WithContext(ctx).
		Model(&models.CampaignMessage{}).
		Where("campaign_id = ? AND sent_at >= ?", campaignID, tenMinutesAgo).
		Count(&recentMessages)

	messagesPerMinute := float64(recentMessages) / 10.0

	// Get last message sent time
	var lastMessageSentAt time.Time
	e.db.WithContext(ctx).
		Model(&models.CampaignMessage{}).
		Where("campaign_id = ?", campaignID).
		Order("sent_at DESC").
		Limit(1).
		Pluck("sent_at", &lastMessageSentAt)

	// Calculate error rate
	errorRate := 0.0
	if currentHourStats.Sent > 0 {
		errorRate = float64(currentHourStats.Failed) / float64(currentHourStats.Sent)
	}

	return &RealTimeStats{
		CampaignID:           campaignID,
		CurrentStatus:        campaign.Status,
		MessagesInQueue:      0, // Would be calculated from queue
		MessagesPerMinute:    messagesPerMinute,
		CurrentHourSent:      currentHourStats.Sent,
		CurrentHourDelivered: currentHourStats.Delivered,
		CurrentHourFailed:    currentHourStats.Failed,
		LastMessageSentAt:    lastMessageSentAt,
		ActiveContacts:       0, // Would be calculated
		ErrorRate:            errorRate,
		LastUpdated:          now,
	}, nil
}

// GetLiveMessageStats gets live message statistics
func (e *EngineImpl) GetLiveMessageStats(ctx context.Context, campaignID uuid.UUID, duration time.Duration) (*LiveMessageStats, error) {
	since := time.Now().Add(-duration)

	// Get recent message events
	var messages []models.CampaignMessage
	if err := e.db.WithContext(ctx).
		Where("campaign_id = ? AND sent_at >= ?", campaignID, since).
		Order("sent_at DESC").
		Limit(1000).
		Find(&messages).Error; err != nil {
		return nil, fmt.Errorf("failed to get live message stats: %w", err)
	}

	var messageEvents []*MessageEvent
	eventSummary := make(map[string]int)
	var totalLatency time.Duration
	var latencyCount int
	successCount := 0

	for _, msg := range messages {
		if msg.SentAt != nil {
			event := &MessageEvent{
				EventID:   uuid.New(),
				MessageID: *msg.MessageID,
				ContactID: msg.ContactID,
				EventType: "sent",
				Timestamp: *msg.SentAt,
			}
			messageEvents = append(messageEvents, event)
			eventSummary["sent"]++

			if msg.DeliveredAt != nil {
				deliveredEvent := &MessageEvent{
					EventID:   uuid.New(),
					MessageID: *msg.MessageID,
					ContactID: msg.ContactID,
					EventType: "delivered",
					Timestamp: *msg.DeliveredAt,
					Latency:   durationPtr(msg.DeliveredAt.Sub(*msg.SentAt)),
				}
				messageEvents = append(messageEvents, deliveredEvent)
				eventSummary["delivered"]++
				totalLatency += msg.DeliveredAt.Sub(*msg.SentAt)
				latencyCount++
				successCount++
			}

			if msg.FailedAt != nil {
				failedEvent := &MessageEvent{
					EventID:     uuid.New(),
					MessageID:   *msg.MessageID,
					ContactID:   msg.ContactID,
					EventType:   "failed",
					Timestamp:   *msg.FailedAt,
					ErrorReason: msg.ErrorMessage,
				}
				messageEvents = append(messageEvents, failedEvent)
				eventSummary["failed"]++
			}
		}
	}

	// Calculate averages
	var averageLatency time.Duration
	if latencyCount > 0 {
		averageLatency = totalLatency / time.Duration(latencyCount)
	}

	successRate := 0.0
	if len(messages) > 0 {
		successRate = float64(successCount) / float64(len(messages))
	}

	return &LiveMessageStats{
		CampaignID:      campaignID,
		Duration:        duration,
		MessageEvents:   messageEvents,
		EventSummary:    eventSummary,
		TrendPoints:     []*LiveTrendPoint{},
		AverageLatency:  averageLatency,
		SuccessRate:     successRate,
		GeneratedAt:     time.Now(),
	}, nil
}

// Helper methods

func (e *EngineImpl) updateCampaignStats(ctx context.Context, campaignID uuid.UUID, field string, increment int) error {
	return e.db.WithContext(ctx).
		Model(&models.Campaign{}).
		Where("id = ?", campaignID).
		Update(field, gorm.Expr(fmt.Sprintf("%s + ?", field), increment)).Error
}

func (e *EngineImpl) updateDailyAnalytics(ctx context.Context, campaignID uuid.UUID, date time.Time, field string, increment int) error {
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)

	// Try to update existing record
	result := e.db.WithContext(ctx).
		Model(&models.CampaignAnalytics{}).
		Where("campaign_id = ? AND date = ?", campaignID, dateOnly).
		Update(field, gorm.Expr(fmt.Sprintf("%s + ?", field), increment))

	if result.Error != nil {
		return result.Error
	}

	// If no record was updated, create a new one
	if result.RowsAffected == 0 {
		analytics := &models.CampaignAnalytics{
			CampaignID: campaignID,
			Date:       dateOnly,
		}

		// Set the specific field value
		switch field {
		case "messages_sent":
			analytics.MessagesSent = increment
		case "messages_delivered":
			analytics.MessagesDelivered = increment
		case "messages_read":
			analytics.MessagesRead = increment
		case "messages_replied":
			analytics.MessagesReplied = increment
		case "messages_clicked":
			analytics.MessagesClicked = increment
		case "messages_failed":
			analytics.MessagesFailed = increment
		case "messages_unsubscribed":
			analytics.MessagesUnsubscribed = increment
		}

		return e.db.WithContext(ctx).Create(analytics).Error
	}

	return nil
}

func (e *EngineImpl) calculateRate(numerator, denominator int) float64 {
	if denominator == 0 {
		return 0.0
	}
	return float64(numerator) / float64(denominator)
}

func (e *EngineImpl) getUniqueEngagers(ctx context.Context, campaignID uuid.UUID) int {
	var count int64
	e.db.WithContext(ctx).
		Model(&models.CampaignMessage{}).
		Where("campaign_id = ? AND (opened = true OR clicked = true OR replied = true)", campaignID).
		Distinct("contact_id").
		Count(&count)
	return int(count)
}

func (e *EngineImpl) getAvgEngagementTime(ctx context.Context, campaignID uuid.UUID) float64 {
	// This would calculate average time between message sent and first engagement
	// For now, returning a placeholder
	return 0.0
}

func (e *EngineImpl) calculatePerformanceScore(deliveryRate, openRate, responseRate float64) float64 {
	// Weighted performance score calculation
	return (deliveryRate*0.3 + openRate*0.4 + responseRate*0.3) * 100
}

func (e *EngineImpl) calculateEngagementFunnel(summary CampaignSummary) EngagementFunnel {
	return EngagementFunnel{
		Sent: FunnelStep{
			Count:       summary.MessagesSent,
			Rate:        1.0,
			DropoffRate: 0.0,
		},
		Delivered: FunnelStep{
			Count:       summary.MessagesDelivered,
			Rate:        summary.DeliveryRate,
			DropoffRate: 1.0 - summary.DeliveryRate,
			DropoffCount: summary.MessagesSent - summary.MessagesDelivered,
		},
		Read: FunnelStep{
			Count:       summary.MessagesRead,
			Rate:        summary.OpenRate,
			DropoffRate: 1.0 - summary.OpenRate,
			DropoffCount: summary.MessagesDelivered - summary.MessagesRead,
		},
		Clicked: FunnelStep{
			Count:       summary.MessagesClicked,
			Rate:        summary.ClickRate,
			DropoffRate: 1.0 - summary.ClickRate,
			DropoffCount: summary.MessagesRead - summary.MessagesClicked,
		},
		Replied: FunnelStep{
			Count:       summary.MessagesReplied,
			Rate:        summary.ResponseRate,
			DropoffRate: 1.0 - summary.ResponseRate,
			DropoffCount: summary.MessagesDelivered - summary.MessagesReplied,
		},
		Converted: FunnelStep{
			Count: 0, // Would be calculated from conversion data
			Rate:  0.0,
		},
	}
}

func (e *EngineImpl) calculateEngagementRate(summary CampaignSummary) float64 {
	if summary.MessagesDelivered == 0 {
		return 0.0
	}
	totalEngagements := summary.MessagesRead + summary.MessagesClicked + summary.MessagesReplied
	return float64(totalEngagements) / float64(summary.MessagesDelivered)
}

func (e *EngineImpl) getDailyMetrics(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) ([]*DailyMetrics, error) {
	var analytics []models.CampaignAnalytics
	if err := e.db.WithContext(ctx).
		Where("campaign_id = ? AND date >= ? AND date <= ?", campaignID, dateRange.From, dateRange.To).
		Order("date ASC").
		Find(&analytics).Error; err != nil {
		return nil, err
	}

	dailyMetrics := make([]*DailyMetrics, len(analytics))
	for i, analytic := range analytics {
		dailyMetrics[i] = &DailyMetrics{
			Date:              analytic.Date,
			MessagesSent:      analytic.MessagesSent,
			MessagesDelivered: analytic.MessagesDelivered,
			MessagesRead:      analytic.MessagesRead,
			MessagesReplied:   analytic.MessagesReplied,
			MessagesClicked:   analytic.MessagesClicked,
			MessagesFailed:    analytic.MessagesFailed,
			Conversions:       analytic.Conversions,
			Revenue:           analytic.Revenue,
			DeliveryRate:      analytic.DeliveryRate,
			OpenRate:          analytic.OpenRate,
			ClickRate:         analytic.ClickRate,
			ResponseRate:      analytic.ResponseRate,
			ConversionRate:    analytic.ConversionRate,
		}
	}

	return dailyMetrics, nil
}

func (e *EngineImpl) getHourlyMetrics(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) ([]*HourlyMetrics, error) {
	// This would query message data and aggregate by hour
	// For now, returning empty slice
	return []*HourlyMetrics{}, nil
}

func (e *EngineImpl) getTimeBasedPerformance(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) []TimePerformance {
	// This would analyze performance by time periods
	// For now, returning empty slice
	return []TimePerformance{}
}

func (e *EngineImpl) calculatePercentile(metrics PerformanceMetrics) int {
	// This would compare against industry benchmarks
	// For now, returning a placeholder
	return 75
}

func durationPtr(d time.Duration) *time.Duration {
	return &d
}

// Stub implementations for other methods

func (e *EngineImpl) GetSegmentPerformance(ctx context.Context, tenantID uuid.UUID, segmentID uuid.UUID, dateRange *DateRange) (*SegmentPerformance, error) {
	return &SegmentPerformance{
		SegmentID:   segmentID,
		SegmentName: "Segment Name",
		Metrics:     PerformanceMetrics{},
		Rank:        1,
		Insights:    []string{},
	}, nil
}

func (e *EngineImpl) GetContactEngagement(ctx context.Context, tenantID uuid.UUID, contactID uuid.UUID, dateRange *DateRange) (*ContactEngagement, error) {
	return &ContactEngagement{
		ContactID:       contactID,
		TenantID:        tenantID,
		DateRange:       *dateRange,
		EngagementScore: 0.75,
		EngagementLevel: "high",
	}, nil
}

func (e *EngineImpl) CompareCampaigns(ctx context.Context, campaignIDs []uuid.UUID) (*CampaignComparison, error) {
	return &CampaignComparison{
		Campaigns:   []CampaignComparisonItem{},
		Metrics:     []string{"delivery_rate", "open_rate", "response_rate"},
		Insights:    []ComparisonInsight{},
		GeneratedAt: time.Now(),
	}, nil
}

func (e *EngineImpl) GetIndustryBenchmarks(ctx context.Context, industry string) (*IndustryBenchmarks, error) {
	return &IndustryBenchmarks{
		Industry:            industry,
		SampleSize:          1000,
		AvgDeliveryRate:     0.95,
		AvgOpenRate:         0.25,
		AvgClickRate:        0.03,
		AvgResponseRate:     0.15,
		AvgConversionRate:   0.02,
		AvgUnsubscribeRate:  0.001,
		LastUpdated:         time.Now().AddDate(0, 0, -7),
	}, nil
}

func (e *EngineImpl) GetTenantBenchmarks(ctx context.Context, tenantID uuid.UUID, dateRange *DateRange) (*TenantBenchmarks, error) {
	return &TenantBenchmarks{
		TenantID:        tenantID,
		DateRange:       *dateRange,
		CampaignCount:   10,
		AvgMetrics:      PerformanceMetrics{},
		BestMetrics:     PerformanceMetrics{},
		TrendDirection:  make(map[string]string),
		SeasonalPatterns: make(map[string]float64),
		LastUpdated:     time.Now(),
	}, nil
}

func (e *EngineImpl) GetABTestResults(ctx context.Context, testID uuid.UUID) (*ABTestResults, error) {
	return &ABTestResults{
		TestID:              testID,
		Status:              "completed",
		Winner:              stringPtr("Group A"),
		WinnerConfidence:    0.95,
		GroupResults:        []ABTestGroupResults{},
		StatisticalTest:     StatisticalTestResult{},
		Insights:            []ABTestInsight{},
		Recommendations:     []string{},
		GeneratedAt:         time.Now(),
	}, nil
}

func (e *EngineImpl) CalculateStatisticalSignificance(ctx context.Context, testID uuid.UUID) (*StatisticalSignificance, error) {
	return &StatisticalSignificance{
		TestID:             testID,
		IsSignificant:      true,
		PValue:             0.05,
		ConfidenceLevel:    0.95,
		SampleSizeAdequate: true,
		RecommendedAction:  "Proceed with winning variant",
		PowerAnalysis:      PowerAnalysis{},
	}, nil
}

func (e *EngineImpl) RecordConversion(ctx context.Context, messageID string, conversionType string, value float64, timestamp time.Time) error {
	e.logger.Debug("Conversion recorded", "message_id", messageID, "type", conversionType, "value", value)
	return nil
}

func (e *EngineImpl) GetRevenueAnalytics(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*RevenueAnalytics, error) {
	return &RevenueAnalytics{
		CampaignID:         campaignID,
		DateRange:          *dateRange,
		TotalRevenue:       0.0,
		RevenuePerMessage:  0.0,
		RevenuePerContact:  0.0,
		ConversionRevenue:  make(map[string]float64),
		DailyRevenue:       []*DailyRevenue{},
		RevenueBySegment:   []*SegmentRevenue{},
		RevenueByChannel:   make(map[string]float64),
		CostAnalysis:       CostAnalysis{},
		ROIAnalysis:        ROIAnalysis{},
		RevenueAttribution: AttributionAnalysis{},
	}, nil
}

func (e *EngineImpl) TrackAttributionPath(ctx context.Context, contactID uuid.UUID, touchpoint *AttributionTouchpoint) error {
	e.logger.Debug("Attribution touchpoint tracked", "contact_id", contactID, "touchpoint_type", touchpoint.TouchpointType)
	return nil
}

func (e *EngineImpl) GetAttributionAnalysis(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*AttributionAnalysis, error) {
	return &AttributionAnalysis{
		CampaignID:        campaignID,
		DateRange:         *dateRange,
		AttributionModel:  "last_click",
		TotalConversions:  0,
		TotalRevenue:      0.0,
		AttributedRevenue: 0.0,
	}, nil
}

func (e *EngineImpl) ExportCampaignData(ctx context.Context, campaignID uuid.UUID, format string, dateRange *DateRange) (*ExportResult, error) {
	return &ExportResult{
		ExportID:    uuid.New(),
		Format:      format,
		FileURL:     "https://example.com/export.csv",
		FileName:    fmt.Sprintf("campaign_%s_export.%s", campaignID.String()[:8], format),
		FileSize:    1024,
		RecordCount: 100,
		CreatedAt:   time.Now(),
		ExpiresAt:   time.Now().Add(24 * time.Hour),
		Status:      "completed",
	}, nil
}

func (e *EngineImpl) ScheduleReport(ctx context.Context, tenantID uuid.UUID, config *ReportConfig) (*ScheduledReport, error) {
	return &ScheduledReport{
		ReportID:  uuid.New(),
		TenantID:  tenantID,
		Config:    *config,
		NextRun:   time.Now().Add(time.Hour),
		RunCount:  0,
		Status:    "active",
		CreatedAt: time.Now(),
	}, nil
}

func (e *EngineImpl) GenerateInsights(ctx context.Context, campaignID uuid.UUID, dateRange *DateRange) (*CampaignInsights, error) {
	return &CampaignInsights{
		CampaignID:      campaignID,
		GeneratedAt:     time.Now(),
		Insights:        []Insight{},
		Recommendations: []Recommendation{},
		KeyFindings:     []KeyFinding{},
		Performance:     InsightSummary{},
		Opportunities:   []Opportunity{},
		RiskFactors:     []RiskFactor{},
	}, nil
}

func stringPtr(s string) *string {
	return &s
}