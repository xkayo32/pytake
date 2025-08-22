package main

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

type WhatsAppService struct {
	db    *sql.DB
	redis *redis.Client
}

func NewWhatsAppService(db *sql.DB, redis *redis.Client) *WhatsAppService {
	return &WhatsAppService{
		db:    db,
		redis: redis,
	}
}

// GetNumbers returns all WhatsApp numbers (for frontend compatibility)
func (s *WhatsAppService) GetNumbers(c *gin.Context) {
	// This combines both phone numbers and configs for frontend compatibility
	numbers := []WhatsAppNumber{}

	// Get phone numbers from database
	phoneNumbers := s.getPhoneNumbersFromDB()

	// Get configs from database
	configs := s.getConfigsFromDB()

	// Combine data similar to the frontend proxy logic
	if len(phoneNumbers) > 0 {
		for i, num := range phoneNumbers {
			// Find corresponding config
			var config *WhatsAppConfig
			for _, cfg := range configs {
				if cfg.PhoneNumberID == num.ID || cfg.PhoneNumberID == num.ID {
					config = &cfg
					break
				}
			}

			number := WhatsAppNumber{
				ID:                num.ID,
				Phone:             num.DisplayPhoneNumber,
				Number:            num.DisplayPhoneNumber,
				Name:              num.VerifiedName,
				Label:             num.VerifiedName,
				Status:            "connected",
				Verified:          true,
				IsVerified:        true,
				BusinessName:      num.VerifiedName,
				QualityRating:     num.QualityRating,
				PlatformType:      num.PlatformType,
				WebhookConfigured: false,
				BusinessAccountID: num.BusinessAccountID,
				LastSeen:          time.Now().Format(time.RFC3339),
			}

			if config != nil {
				number.Name = config.Name
				number.Label = config.Name
				number.Status = config.Status
				number.BusinessName = config.BusinessName
				number.WebhookConfigured = config.WebhookVerifyToken != ""
				number.CreatedAt = &config.CreatedAt
				number.UpdatedAt = &config.UpdatedAt
			}

			if i == 0 {
				number.ID = "whatsapp-1"
			}

			numbers = append(numbers, number)
		}
	} else if len(configs) > 0 {
		// Fallback to configs if no phone numbers
		for i, config := range configs {
			status := "DISCONNECTED"
			if config.Status == "connected" || config.IsDefault {
				status = "CONNECTED"
			}

			number := WhatsAppNumber{
				ID:                config.ID,
				Phone:             config.PhoneNumber,
				Number:            config.PhoneNumber,
				Name:              config.Name,
				Label:             config.Name,
				Status:            status,
				Verified:          config.IsVerified,
				IsVerified:        config.IsVerified,
				BusinessName:      config.BusinessName,
				WebhookConfigured: config.WebhookVerifyToken != "",
				BusinessAccountID: config.BusinessAccountID,
				CreatedAt:         &config.CreatedAt,
				UpdatedAt:         &config.UpdatedAt,
				LastSeen:          config.UpdatedAt.Format(time.RFC3339),
			}

			if i == 0 {
				number.ID = "whatsapp-1"
			}

			numbers = append(numbers, number)
		}
	}

	// If no data found, return empty array (don't create fake data)
	if len(numbers) == 0 {
		log.Println("⚠️ No WhatsApp numbers found in database")
	}

	log.Printf("✅ Returning %d WhatsApp numbers", len(numbers))
	c.JSON(http.StatusOK, numbers)
}

// GetPhoneNumbers returns WhatsApp phone numbers from the Business API
func (s *WhatsAppService) GetPhoneNumbers(c *gin.Context) {
	numbers := s.getPhoneNumbersFromDB()
	log.Printf("✅ Returning %d phone numbers", len(numbers))
	c.JSON(http.StatusOK, numbers)
}

// GetConfigs returns WhatsApp configurations
func (s *WhatsAppService) GetConfigs(c *gin.Context) {
	configs := s.getConfigsFromDB()
	log.Printf("✅ Returning %d WhatsApp configs", len(configs))
	c.JSON(http.StatusOK, configs)
}

// GetTemplates returns WhatsApp message templates
func (s *WhatsAppService) GetTemplates(c *gin.Context) {
	templates := s.getTemplatesFromDB()
	log.Printf("✅ Returning %d WhatsApp templates", len(templates))
	c.JSON(http.StatusOK, templates)
}

// getPhoneNumbersFromDB retrieves phone numbers from database
func (s *WhatsAppService) getPhoneNumbersFromDB() []WhatsAppPhoneNumber {
	query := `
		SELECT id, display_phone_number, verified_name, quality_rating, platform_type, business_account_id
		FROM whatsapp_phone_numbers 
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		log.Printf("Error querying phone numbers: %v", err)
		return []WhatsAppPhoneNumber{}
	}
	defer rows.Close()

	var numbers []WhatsAppPhoneNumber

	for rows.Next() {
		var num WhatsAppPhoneNumber
		var businessAccountID sql.NullString

		err := rows.Scan(
			&num.ID,
			&num.DisplayPhoneNumber,
			&num.VerifiedName,
			&num.QualityRating,
			&num.PlatformType,
			&businessAccountID,
		)
		if err != nil {
			log.Printf("Error scanning phone number: %v", err)
			continue
		}

		if businessAccountID.Valid {
			num.BusinessAccountID = businessAccountID.String
		}

		numbers = append(numbers, num)
	}

	return numbers
}

// getConfigsFromDB retrieves WhatsApp configs from database
func (s *WhatsAppService) getConfigsFromDB() []WhatsAppConfig {
	query := `
		SELECT id, name, phone_number, phone_number_id, business_account_id, 
		       business_name, is_default, is_verified, status, webhook_verify_token,
		       created_at, updated_at
		FROM whatsapp_configs 
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		log.Printf("Error querying WhatsApp configs: %v", err)
		return []WhatsAppConfig{}
	}
	defer rows.Close()

	var configs []WhatsAppConfig

	for rows.Next() {
		var config WhatsAppConfig

		err := rows.Scan(
			&config.ID,
			&config.Name,
			&config.PhoneNumber,
			&config.PhoneNumberID,
			&config.BusinessAccountID,
			&config.BusinessName,
			&config.IsDefault,
			&config.IsVerified,
			&config.Status,
			&config.WebhookVerifyToken,
			&config.CreatedAt,
			&config.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning WhatsApp config: %v", err)
			continue
		}

		configs = append(configs, config)
	}

	return configs
}

// getTemplatesFromDB retrieves WhatsApp templates from database
func (s *WhatsAppService) getTemplatesFromDB() []WhatsAppTemplate {
	query := `
		SELECT id, name, category, language, status, components
		FROM whatsapp_templates 
		WHERE status = 'APPROVED'
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		log.Printf("Error querying WhatsApp templates: %v", err)
		return []WhatsAppTemplate{}
	}
	defer rows.Close()

	var templates []WhatsAppTemplate

	for rows.Next() {
		var template WhatsAppTemplate
		var componentsJSON sql.NullString

		err := rows.Scan(
			&template.ID,
			&template.Name,
			&template.Category,
			&template.Language,
			&template.Status,
			&componentsJSON,
		)
		if err != nil {
			log.Printf("Error scanning WhatsApp template: %v", err)
			continue
		}

		// Parse components JSON if available
		if componentsJSON.Valid {
			// You can implement JSON parsing here if needed
			// For now, we'll leave it empty
			template.Components = []WhatsAppTemplateComponent{}
		}

		templates = append(templates, template)
	}

	return templates
}