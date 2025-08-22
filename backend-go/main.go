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
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
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

	// Setup routes
	api := router.Group("/api/v1")
	{
		// Flow routes
		api.GET("/flows", flowService.GetFlows)
		api.POST("/flows", flowService.CreateFlow)
		api.GET("/flows/:id", flowService.GetFlow)
		api.PUT("/flows/:id", flowService.UpdateFlow)
		api.DELETE("/flows/:id", flowService.DeleteFlow)
		api.PATCH("/flows/:id/status", flowService.UpdateFlowStatus)

		// WhatsApp routes
		api.GET("/whatsapp/numbers", whatsappService.GetNumbers)
		api.GET("/whatsapp/phone-numbers", whatsappService.GetPhoneNumbers)
		api.GET("/whatsapp-configs", whatsappService.GetConfigs)
		api.GET("/whatsapp/templates", whatsappService.GetTemplates)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server starting on port %s", port)
	log.Fatal(router.Run(":" + port))
}