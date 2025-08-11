package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Application
	AppEnv     string
	AppPort    string
	AppName    string
	AppVersion string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// JWT
	JWTSecret             string
	JWTExpiration         time.Duration
	JWTRefreshExpiration  time.Duration

	// WhatsApp
	WhatsAppAPIURL           string
	WhatsAppPhoneNumberID    string
	WhatsAppAccessToken      string
	WhatsAppWebhookVerifyToken string
	WhatsAppWebhookSecret    string

	// Rate Limiting
	RateLimitRequests int
	RateLimitDuration time.Duration

	// CORS
	CORSAllowedOrigins []string
	CORSAllowedMethods []string
	CORSAllowedHeaders []string

	// Logging
	LogLevel  string
	LogFormat string
}

func Load() (*Config, error) {
	// Load .env file if exists
	if err := godotenv.Load(".env.development"); err != nil {
		// Try .env.test for test environment
		if err := godotenv.Load(".env.test"); err != nil {
			// Only error if not production and not test
			appEnv := os.Getenv("APP_ENV")
			if appEnv != "production" && appEnv != "test" {
				// Ignore error in test mode for now
			}
		}
	}

	cfg := &Config{
		// Application
		AppEnv:     getEnv("APP_ENV", "development"),
		AppPort:    getEnv("APP_PORT", "8080"),
		AppName:    getEnv("APP_NAME", "PyTake"),
		AppVersion: getEnv("APP_VERSION", "1.0.0"),

		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "pytake"),
		DBPassword: getEnv("DB_PASSWORD", "pytake123"),
		DBName:     getEnv("DB_NAME", "pytake_db"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		// Redis
		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       0,

		// JWT
		JWTSecret:            getEnv("JWT_SECRET", "secret-key"),
		JWTExpiration:        24 * time.Hour,
		JWTRefreshExpiration: 7 * 24 * time.Hour,

		// WhatsApp
		WhatsAppAPIURL:             getEnv("WHATSAPP_API_URL", "https://graph.facebook.com/v18.0"),
		WhatsAppPhoneNumberID:      getEnv("WHATSAPP_PHONE_NUMBER_ID", ""),
		WhatsAppAccessToken:        getEnv("WHATSAPP_ACCESS_TOKEN", ""),
		WhatsAppWebhookVerifyToken: getEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "verify-token"),
		WhatsAppWebhookSecret:      getEnv("WHATSAPP_WEBHOOK_SECRET", ""),

		// Rate Limiting
		RateLimitRequests: 10,
		RateLimitDuration: time.Second,

		// Logging
		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}