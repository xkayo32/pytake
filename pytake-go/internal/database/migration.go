package database

import (
	"github.com/pytake/pytake-go/internal/database/models"
	"gorm.io/gorm"
)

// Migrate runs database migrations
func Migrate(db *gorm.DB) error {
	// Enable UUID extension
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error; err != nil {
		return err
	}

	// Auto-migrate all models in correct order (dependencies first)
	return db.AutoMigrate(
		&models.User{},
		&models.Tenant{},
		&models.TenantUser{},
		&models.TenantInvite{},
		&models.WhatsAppConfig{},
		&models.Contact{},
		&models.Conversation{},
		&models.Message{},
		
		// Flow models
		&models.Flow{},
		&models.FlowTemplate{},
		&models.FlowVariable{},
		&models.FlowTrigger{},
		&models.FlowVersion{},
		&models.FlowExecution{},
		&models.FlowExecutionStep{},
		&models.FlowExecutionEvent{},
		
		// Flow analytics models
		&models.FlowAnalytics{},
		&models.FlowNodeAnalytics{},
		&models.FlowUserJourney{},
		&models.FlowABTest{},
		&models.FlowPerformanceAlert{},
		&models.FlowReport{},
		
		// Trigger models
		&models.TriggerCondition{},
		&models.TriggerEvent{},
		&models.TriggerExecution{},
		&models.TriggerSchedule{},
		&models.TriggerStats{},
	)
}