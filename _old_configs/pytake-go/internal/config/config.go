package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Application
	AppEnv     string
	AppPort    string
	AppHost    string
	AppName    string
	AppVersion string

	// Database
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	DBSSLMode         string
	DBMaxConnections  int
	DBIdleConnections int
	DBConnLifetime    time.Duration
	DatabaseURL       string // Alternative connection string

	// Redis
	RedisHost          string
	RedisPort          string
	RedisPassword      string
	RedisDB            int
	RedisMaxRetries    int
	RedisPoolSize      int
	RedisMinIdleConns  int
	RedisURL           string // Alternative connection string

	// JWT
	JWTSecret            string
	JWTExpiration        time.Duration
	JWTRefreshExpiration time.Duration
	JWTIssuer           string
	JWTAudience         string

	// Storage (MinIO/S3)
	MinioEndpoint   string
	MinioAccessKey  string
	MinioSecretKey  string
	MinioBucket     string
	MinioUseSSL     bool
	MinioPublicURL  string
	
	// AWS S3 (alternative to MinIO)
	AWSRegion           string
	AWSAccessKeyID      string
	AWSSecretAccessKey  string
	S3Bucket           string
	S3PublicURL        string

	// WhatsApp
	WhatsAppAPIURL             string
	WhatsAppPhoneNumberID      string
	WhatsAppAccessToken        string
	WhatsAppWebhookVerifyToken string
	WhatsAppWebhookSecret      string
	WhatsAppAPIVersion         string
	WhatsAppBaseURL            string

	// OpenAI
	OpenAI struct {
		APIKey      string
		Model       string
		MaxTokens   int
		Temperature float64
	}

	// Email (SMTP)
	SMTP struct {
		Host      string
		Port      int
		Username  string
		Password  string
		FromEmail string
		FromName  string
		UseTLS    bool
	}

	// Queue
	Queue struct {
		RedisPrefix    string
		MaxRetries     int
		DefaultTimeout time.Duration
		WorkerPools    map[string]int
	}

	// ERP
	ERP struct {
		EncryptionKey    string
		HubSoftTimeout   time.Duration
		IxcSoftTimeout   time.Duration
		MKSolutionsTimeout time.Duration
		SisGPTimeout     time.Duration
	}

	// Rate Limiting
	RateLimit struct {
		Enabled          bool
		RequestsPerSecond int
		Burst            int
		CleanupInterval  time.Duration
	}

	// CORS
	CORS struct {
		AllowedOrigins   []string
		AllowedMethods   []string
		AllowedHeaders   []string
		AllowCredentials bool
		MaxAge          int
	}

	// Logging
	Log struct {
		Level      string
		Format     string
		Output     string
		FilePath   string
		MaxSize    int
		MaxBackups int
		MaxAge     int
	}

	// Monitoring
	Monitoring struct {
		MetricsEnabled bool
		MetricsPort    int
		MetricsPath    string
		PrometheusURL  string
		GrafanaURL     string
		GrafanaUser    string
		GrafanaPass    string
		TracingEnabled bool
		JaegerHost     string
		JaegerPort     int
	}

	// Security
	Security struct {
		HeadersEnabled   bool
		CSRFEnabled      bool
		HTTPSOnly        bool
		TrustedProxies   []string
	}

	// File Upload
	Upload struct {
		MaxSize         int64
		AllowedTypes    []string
		Path            string
	}

	// WebSocket
	WebSocket struct {
		Enabled         bool
		MaxConnections  int
		PingInterval    time.Duration
		PongWait        time.Duration
	}

	// Development
	Dev struct {
		DebugEnabled    bool
		ProfilerEnabled bool
		HotReload       bool
	}

	// Server TLS
	ServerTLS struct {
		Enabled  bool
		CertFile string
		KeyFile  string
	}
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
		AppHost:    getEnv("APP_HOST", "0.0.0.0"),
		AppName:    getEnv("APP_NAME", "PyTake"),
		AppVersion: getEnv("APP_VERSION", "1.0.0"),

		// Database
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "5432"),
		DBUser:            getEnv("DB_USER", "pytake"),
		DBPassword:        getEnv("DB_PASSWORD", "pytake123"),
		DBName:            getEnv("DB_NAME", "pytake_dev"),
		DBSSLMode:         getEnv("DB_SSL_MODE", "disable"),
		DBMaxConnections:  getEnvAsInt("DB_MAX_CONNECTIONS", 25),
		DBIdleConnections: getEnvAsInt("DB_IDLE_CONNECTIONS", 5),
		DBConnLifetime:    time.Duration(getEnvAsInt("DB_CONNECTION_LIFETIME", 300)) * time.Second,
		DatabaseURL:       getEnv("DATABASE_URL", ""),

		// Redis
		RedisHost:         getEnv("REDIS_HOST", "localhost"),
		RedisPort:         getEnv("REDIS_PORT", "6379"),
		RedisPassword:     getEnv("REDIS_PASSWORD", "pytake123"),
		RedisDB:           getEnvAsInt("REDIS_DB", 0),
		RedisMaxRetries:   getEnvAsInt("REDIS_MAX_RETRIES", 3),
		RedisPoolSize:     getEnvAsInt("REDIS_POOL_SIZE", 10),
		RedisMinIdleConns: getEnvAsInt("REDIS_MIN_IDLE_CONNECTIONS", 3),
		RedisURL:          getEnv("REDIS_URL", ""),

		// JWT
		JWTSecret:            getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		JWTExpiration:        parseDuration(getEnv("JWT_ACCESS_TOKEN_EXPIRY", "24h"), 24*time.Hour),
		JWTRefreshExpiration: parseDuration(getEnv("JWT_REFRESH_TOKEN_EXPIRY", "168h"), 7*24*time.Hour),
		JWTIssuer:           getEnv("JWT_ISSUER", "pytake"),
		JWTAudience:         getEnv("JWT_AUDIENCE", "pytake-api"),

		// Storage
		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey: getEnv("MINIO_ACCESS_KEY", "pytake"),
		MinioSecretKey: getEnv("MINIO_SECRET_KEY", "pytake123"),
		MinioBucket:    getEnv("MINIO_BUCKET", "pytake-media"),
		MinioUseSSL:    getEnvAsBool("MINIO_USE_SSL", false),
		MinioPublicURL: getEnv("MINIO_PUBLIC_URL", "http://localhost:9000"),
		
		// AWS S3
		AWSRegion:          getEnv("AWS_REGION", "us-east-1"),
		AWSAccessKeyID:     getEnv("AWS_ACCESS_KEY_ID", ""),
		AWSSecretAccessKey: getEnv("AWS_SECRET_ACCESS_KEY", ""),
		S3Bucket:          getEnv("S3_BUCKET", "pytake-files"),
		S3PublicURL:       getEnv("S3_PUBLIC_URL", ""),

		// WhatsApp
		WhatsAppAPIURL:             getEnv("WHATSAPP_API_URL", "https://graph.facebook.com/v18.0"),
		WhatsAppPhoneNumberID:      getEnv("WHATSAPP_PHONE_NUMBER_ID", ""),
		WhatsAppAccessToken:        getEnv("WHATSAPP_ACCESS_TOKEN", ""),
		WhatsAppWebhookVerifyToken: getEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "verify-token"),
		WhatsAppWebhookSecret:      getEnv("WHATSAPP_WEBHOOK_SECRET", ""),
		WhatsAppAPIVersion:         getEnv("WHATSAPP_API_VERSION", "v18.0"),
		WhatsAppBaseURL:           getEnv("WHATSAPP_BASE_URL", "https://graph.facebook.com"),
	}

	// OpenAI
	cfg.OpenAI.APIKey = getEnv("OPENAI_API_KEY", "")
	cfg.OpenAI.Model = getEnv("OPENAI_MODEL", "gpt-3.5-turbo")
	cfg.OpenAI.MaxTokens = getEnvAsInt("OPENAI_MAX_TOKENS", 4096)
	cfg.OpenAI.Temperature = getEnvAsFloat("OPENAI_TEMPERATURE", 0.7)

	// Email
	cfg.SMTP.Host = getEnv("SMTP_HOST", "localhost")
	cfg.SMTP.Port = getEnvAsInt("SMTP_PORT", 1025)
	cfg.SMTP.Username = getEnv("SMTP_USERNAME", "")
	cfg.SMTP.Password = getEnv("SMTP_PASSWORD", "")
	cfg.SMTP.FromEmail = getEnv("SMTP_FROM_EMAIL", "noreply@pytake.com")
	cfg.SMTP.FromName = getEnv("SMTP_FROM_NAME", "PyTake")
	cfg.SMTP.UseTLS = getEnvAsBool("SMTP_USE_TLS", false)

	// Queue
	cfg.Queue.RedisPrefix = getEnv("QUEUE_REDIS_PREFIX", "pytake:queue")
	cfg.Queue.MaxRetries = getEnvAsInt("QUEUE_MAX_RETRIES", 3)
	cfg.Queue.DefaultTimeout = parseDuration(getEnv("QUEUE_DEFAULT_TIMEOUT", "5m"), 5*time.Minute)
	cfg.Queue.WorkerPools = parseWorkerPools(getEnv("QUEUE_WORKER_POOLS", `{"default":5,"email":3,"webhook":10,"sync":2,"cleanup":1}`))

	// ERP
	cfg.ERP.EncryptionKey = getEnv("ERP_ENCRYPTION_KEY", "dev-erp-encryption-key-32-chars")
	cfg.ERP.HubSoftTimeout = parseDuration(getEnv("ERP_HUBSOFT_TIMEOUT", "30s"), 30*time.Second)
	cfg.ERP.IxcSoftTimeout = parseDuration(getEnv("ERP_IXCSOFT_TIMEOUT", "30s"), 30*time.Second)
	cfg.ERP.MKSolutionsTimeout = parseDuration(getEnv("ERP_MKSOLUTIONS_TIMEOUT", "30s"), 30*time.Second)
	cfg.ERP.SisGPTimeout = parseDuration(getEnv("ERP_SISGP_TIMEOUT", "30s"), 30*time.Second)

	// Rate Limiting
	cfg.RateLimit.Enabled = getEnvAsBool("RATE_LIMIT_ENABLED", true)
	cfg.RateLimit.RequestsPerSecond = getEnvAsInt("RATE_LIMIT_RPS", 10)
	cfg.RateLimit.Burst = getEnvAsInt("RATE_LIMIT_BURST", 20)
	cfg.RateLimit.CleanupInterval = parseDuration(getEnv("RATE_LIMIT_CLEANUP_INTERVAL", "60s"), 60*time.Second)

	// CORS
	cfg.CORS.AllowedOrigins = strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "*"), ",")
	cfg.CORS.AllowedMethods = strings.Split(getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS,PATCH"), ",")
	cfg.CORS.AllowedHeaders = strings.Split(getEnv("CORS_ALLOWED_HEADERS", "Content-Type,Authorization,X-Requested-With"), ",")
	cfg.CORS.AllowCredentials = getEnvAsBool("CORS_ALLOW_CREDENTIALS", true)
	cfg.CORS.MaxAge = getEnvAsInt("CORS_MAX_AGE", 86400)

	// Logging
	cfg.Log.Level = getEnv("LOG_LEVEL", "info")
	cfg.Log.Format = getEnv("LOG_FORMAT", "json")
	cfg.Log.Output = getEnv("LOG_OUTPUT", "stdout")
	cfg.Log.FilePath = getEnv("LOG_FILE_PATH", "./logs/pytake.log")
	cfg.Log.MaxSize = getEnvAsInt("LOG_MAX_SIZE", 100)
	cfg.Log.MaxBackups = getEnvAsInt("LOG_MAX_BACKUPS", 5)
	cfg.Log.MaxAge = getEnvAsInt("LOG_MAX_AGE", 30)

	// Monitoring
	cfg.Monitoring.MetricsEnabled = getEnvAsBool("METRICS_ENABLED", true)
	cfg.Monitoring.MetricsPort = getEnvAsInt("METRICS_PORT", 9090)
	cfg.Monitoring.MetricsPath = getEnv("METRICS_PATH", "/metrics")
	cfg.Monitoring.PrometheusURL = getEnv("PROMETHEUS_ENDPOINT", "http://localhost:9090")
	cfg.Monitoring.GrafanaURL = getEnv("GRAFANA_ENDPOINT", "http://localhost:3000")
	cfg.Monitoring.GrafanaUser = getEnv("GRAFANA_USER", "admin")
	cfg.Monitoring.GrafanaPass = getEnv("GRAFANA_PASSWORD", "admin")
	cfg.Monitoring.TracingEnabled = getEnvAsBool("TRACING_ENABLED", false)
	cfg.Monitoring.JaegerHost = getEnv("JAEGER_AGENT_HOST", "localhost")
	cfg.Monitoring.JaegerPort = getEnvAsInt("JAEGER_AGENT_PORT", 6831)

	// Security
	cfg.Security.HeadersEnabled = getEnvAsBool("SECURITY_HEADERS_ENABLED", true)
	cfg.Security.CSRFEnabled = getEnvAsBool("CSRF_ENABLED", false)
	cfg.Security.HTTPSOnly = getEnvAsBool("HTTPS_ONLY", false)
	cfg.Security.TrustedProxies = strings.Split(getEnv("TRUSTED_PROXIES", ""), ",")

	// File Upload
	cfg.Upload.MaxSize = int64(getEnvAsInt("MAX_UPLOAD_SIZE", 10*1024*1024)) // 10MB default
	cfg.Upload.AllowedTypes = strings.Split(getEnv("ALLOWED_FILE_TYPES", "image/jpeg,image/png,image/gif,application/pdf,audio/mpeg,audio/wav,video/mp4"), ",")
	cfg.Upload.Path = getEnv("UPLOAD_PATH", "./uploads")

	// WebSocket
	cfg.WebSocket.Enabled = getEnvAsBool("WS_ENABLED", true)
	cfg.WebSocket.MaxConnections = getEnvAsInt("WS_MAX_CONNECTIONS", 1000)
	cfg.WebSocket.PingInterval = parseDuration(getEnv("WS_PING_INTERVAL", "30s"), 30*time.Second)
	cfg.WebSocket.PongWait = parseDuration(getEnv("WS_PONG_WAIT", "60s"), 60*time.Second)

	// Development
	cfg.Dev.DebugEnabled = getEnvAsBool("DEBUG_ENABLED", false)
	cfg.Dev.ProfilerEnabled = getEnvAsBool("PROFILER_ENABLED", false)
	cfg.Dev.HotReload = getEnvAsBool("HOT_RELOAD", false)

	// Server TLS
	cfg.ServerTLS.Enabled = getEnvAsBool("TLS_ENABLED", false)
	cfg.ServerTLS.CertFile = getEnv("TLS_CERT_FILE", "")
	cfg.ServerTLS.KeyFile = getEnv("TLS_KEY_FILE", "")

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsFloat(key string, defaultValue float64) float64 {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseFloat(valueStr, 64); err == nil {
		return value
	}
	return defaultValue
}

func parseDuration(value string, defaultValue time.Duration) time.Duration {
	if duration, err := time.ParseDuration(value); err == nil {
		return duration
	}
	return defaultValue
}

func parseWorkerPools(value string) map[string]int {
	defaultPools := map[string]int{
		"default": 5,
		"email":   3,
		"webhook": 10,
		"sync":    2,
		"cleanup": 1,
	}
	
	// For now, return default pools
	// TODO: Parse JSON string to map
	return defaultPools
}