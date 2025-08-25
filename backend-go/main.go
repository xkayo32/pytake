package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Set Gin mode
	if os.Getenv("NODE_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	db, err := InitDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize Redis
	redis := InitRedis()
	defer redis.Close()

	// Create router
	router := gin.Default()

	// Setup CORS (using manual middleware instead)
	
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "https://app.pytake.net" || origin == "http://app.pytake.net" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"service": "pytake-backend",
			"version": "1.0.0",
		})
	})

	// Create services
	flowService := NewFlowService(db, redis)
	whatsappService := NewWhatsAppService(db, redis)
	authService := NewAuthService(db, redis)

	// Setup routes
	api := router.Group("/api/v1")
	{
		// Auth routes
		api.POST("/auth/login", authService.Login)
		api.GET("/auth/me", authService.Me)
		api.POST("/auth/logout", authService.Logout)

		// Flow routes
		api.GET("/flows", flowService.GetFlows)
		api.POST("/flows", flowService.CreateFlow)
		api.GET("/flows/:id", flowService.GetFlow)
		api.PUT("/flows/:id", flowService.UpdateFlow)
		api.DELETE("/flows/:id", flowService.DeleteFlow)
		api.PATCH("/flows/:id/status", flowService.UpdateFlowStatus)
		api.POST("/flows/:id/test", flowService.TestFlow)
		api.GET("/flows/:id/test/:execution_id/logs", flowService.GetFlowTestLogs)
		api.GET("/flows/window-status", flowService.CheckConversationWindow)
		api.GET("/flows/templates", flowService.GetAvailableTemplates)

		// WhatsApp routes
		api.GET("/whatsapp/numbers", whatsappService.GetNumbers)
		api.GET("/whatsapp/phone-numbers", whatsappService.GetPhoneNumbers)
		api.GET("/whatsapp-configs", whatsappService.GetConfigs)
		api.POST("/whatsapp-configs", whatsappService.SaveConfig)
		api.PUT("/whatsapp-configs/:id", whatsappService.UpdateConfig)
		api.DELETE("/whatsapp-configs/:id", whatsappService.DeleteConfig)
		api.POST("/whatsapp-configs/:id/test", whatsappService.TestConfig)
		api.PUT("/whatsapp-configs/:id/default", whatsappService.SetDefaultConfig)
		api.GET("/whatsapp/templates", whatsappService.GetTemplates)
		api.GET("/whatsapp/templates/manage", whatsappService.GetTemplates) // Alias for frontend compatibility
		api.POST("/whatsapp/templates/sync", whatsappService.SyncTemplates)
		api.POST("/whatsapp/templates", whatsappService.CreateTemplate)
		api.PUT("/whatsapp/templates/:id", whatsappService.UpdateTemplate)
		api.DELETE("/whatsapp/templates/:id", whatsappService.DeleteTemplate)
		api.POST("/whatsapp/templates/:id/submit", whatsappService.SubmitTemplate)
		
		// Webhook routes
		webhookService := NewWebhookService(db, redis)
		api.POST("/whatsapp-configs/:id/webhook/validate", webhookService.ValidateWebhookConfig)
		api.POST("/whatsapp-configs/:id/webhook/subscribe", webhookService.SubscribeWebhook)
		api.GET("/webhook/logs", webhookService.GetWebhookLogs)
	}
	
	// Webhook endpoints (outside auth group - Meta needs to access these)
	webhookService := NewWebhookService(db, redis)
	router.GET("/webhook/whatsapp", webhookService.WebhookVerification)
	router.POST("/webhook/whatsapp", webhookService.WebhookReceive)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Fatal(router.Run(":" + port))
}