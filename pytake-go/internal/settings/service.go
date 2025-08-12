package settings

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/datatypes"

	"github.com/pytake/pytake-go/internal/models"
	"github.com/pytake/pytake-go/internal/redis"
	"github.com/pytake/pytake-go/internal/logger"
)

// Service manages application settings
type Service struct {
	db     *gorm.DB
	redis  *redis.Client
	logger *logger.Logger
	cache  *settingsCache
	mu     sync.RWMutex
}

// settingsCache provides in-memory caching for frequently accessed settings
type settingsCache struct {
	system map[string]*models.SystemSetting
	tenant map[string]map[string]*models.TenantSetting // tenantID -> key -> setting
	mu     sync.RWMutex
}

// NewService creates a new settings service
func NewService(db *gorm.DB, rdb *redis.Client, log *logger.Logger) *Service {
	service := &Service{
		db:     db,
		redis:  rdb,
		logger: log,
		cache: &settingsCache{
			system: make(map[string]*models.SystemSetting),
			tenant: make(map[string]map[string]*models.TenantSetting),
		},
	}

	// Initialize default settings if needed
	if err := service.InitializeDefaults(); err != nil {
		log.Error("Failed to initialize default settings", err)
	}

	// Load settings into cache
	service.RefreshCache()

	return service
}

// InitializeDefaults creates default system settings if they don't exist
func (s *Service) InitializeDefaults() error {
	defaults := models.DefaultSystemSettings()
	
	for _, setting := range defaults {
		var existing models.SystemSetting
		err := s.db.Where("key = ?", setting.Key).First(&existing).Error
		
		if errors.Is(err, gorm.ErrRecordNotFound) {
			setting.ID = uuid.New()
			setting.CreatedAt = time.Now()
			setting.UpdatedAt = time.Now()
			
			if err := s.db.Create(&setting).Error; err != nil {
				s.logger.Error("Failed to create default setting", err, "key", setting.Key)
				continue
			}
		}
	}
	
	return nil
}

// RefreshCache reloads all settings into memory cache
func (s *Service) RefreshCache() {
	s.cache.mu.Lock()
	defer s.cache.mu.Unlock()

	// Load system settings
	var systemSettings []models.SystemSetting
	if err := s.db.Find(&systemSettings).Error; err == nil {
		for i := range systemSettings {
			s.cache.system[systemSettings[i].Key] = &systemSettings[i]
		}
	}

	// Clear tenant cache - will be loaded on demand
	s.cache.tenant = make(map[string]map[string]*models.TenantSetting)
}

// Get retrieves a setting value with fallback hierarchy: user -> tenant -> system -> env -> default
func (s *Service) Get(key string, tenantID *uuid.UUID, userID *uuid.UUID) (interface{}, error) {
	// Check user setting first
	if userID != nil {
		if value, err := s.getUserSetting(key, *userID); err == nil {
			return value, nil
		}
	}

	// Check tenant setting
	if tenantID != nil {
		if value, err := s.getTenantSetting(key, *tenantID); err == nil {
			return value, nil
		}
	}

	// Check system setting
	if value, err := s.getSystemSetting(key); err == nil {
		return value, nil
	}

	// Check environment variable as fallback
	envKey := s.keyToEnvVar(key)
	if envValue := os.Getenv(envKey); envValue != "" {
		return envValue, nil
	}

	// Return error if not found
	return nil, fmt.Errorf("setting not found: %s", key)
}

// GetString retrieves a string setting
func (s *Service) GetString(key string, tenantID *uuid.UUID, userID *uuid.UUID) (string, error) {
	value, err := s.Get(key, tenantID, userID)
	if err != nil {
		return "", err
	}

	switch v := value.(type) {
	case string:
		return v, nil
	default:
		return fmt.Sprintf("%v", v), nil
	}
}

// GetInt retrieves an integer setting
func (s *Service) GetInt(key string, tenantID *uuid.UUID, userID *uuid.UUID) (int, error) {
	value, err := s.Get(key, tenantID, userID)
	if err != nil {
		return 0, err
	}

	switch v := value.(type) {
	case int:
		return v, nil
	case int64:
		return int(v), nil
	case float64:
		return int(v), nil
	case string:
		return strconv.Atoi(v)
	default:
		return 0, fmt.Errorf("cannot convert %T to int", v)
	}
}

// GetBool retrieves a boolean setting
func (s *Service) GetBool(key string, tenantID *uuid.UUID, userID *uuid.UUID) (bool, error) {
	value, err := s.Get(key, tenantID, userID)
	if err != nil {
		return false, err
	}

	switch v := value.(type) {
	case bool:
		return v, nil
	case string:
		return strconv.ParseBool(v)
	case int:
		return v != 0, nil
	case float64:
		return v != 0, nil
	default:
		return false, fmt.Errorf("cannot convert %T to bool", v)
	}
}

// GetJSON retrieves a JSON setting
func (s *Service) GetJSON(key string, tenantID *uuid.UUID, userID *uuid.UUID, target interface{}) error {
	value, err := s.Get(key, tenantID, userID)
	if err != nil {
		return err
	}

	switch v := value.(type) {
	case string:
		return json.Unmarshal([]byte(v), target)
	case []byte:
		return json.Unmarshal(v, target)
	default:
		data, err := json.Marshal(v)
		if err != nil {
			return err
		}
		return json.Unmarshal(data, target)
	}
}

// SetSystemSetting updates or creates a system setting
func (s *Service) SetSystemSetting(key string, value interface{}, updatedBy *uuid.UUID) error {
	var setting models.SystemSetting
	err := s.db.Where("key = ?", key).First(&setting).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new setting
		setting = models.SystemSetting{
			ID:        uuid.New(),
			Key:       key,
			CreatedAt: time.Now(),
		}
	}

	// Update value
	if err := setting.SetValue(value); err != nil {
		return err
	}
	
	setting.UpdatedAt = time.Now()
	setting.UpdatedBy = updatedBy

	// Save to database
	if err := s.db.Save(&setting).Error; err != nil {
		return err
	}

	// Update cache
	s.cache.mu.Lock()
	s.cache.system[key] = &setting
	s.cache.mu.Unlock()

	// Invalidate Redis cache
	s.invalidateRedisCache("system", key)

	// Log audit
	if updatedBy != nil {
		s.logAudit(key, "system", nil, nil, value, "update", *updatedBy)
	}

	return nil
}

// SetTenantSetting updates or creates a tenant setting
func (s *Service) SetTenantSetting(tenantID uuid.UUID, key string, value interface{}, updatedBy uuid.UUID) error {
	var setting models.TenantSetting
	err := s.db.Where("tenant_id = ? AND key = ?", tenantID, key).First(&setting).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new setting
		setting = models.TenantSetting{
			ID:        uuid.New(),
			TenantID:  tenantID,
			Key:       key,
			CreatedAt: time.Now(),
		}
	}

	// Update value
	if err := setting.SetValue(value); err != nil {
		return err
	}
	
	setting.UpdatedAt = time.Now()
	setting.UpdatedBy = updatedBy

	// Save to database
	if err := s.db.Save(&setting).Error; err != nil {
		return err
	}

	// Update cache
	s.cache.mu.Lock()
	if s.cache.tenant[tenantID.String()] == nil {
		s.cache.tenant[tenantID.String()] = make(map[string]*models.TenantSetting)
	}
	s.cache.tenant[tenantID.String()][key] = &setting
	s.cache.mu.Unlock()

	// Invalidate Redis cache
	s.invalidateRedisCache("tenant", fmt.Sprintf("%s:%s", tenantID.String(), key))

	// Log audit
	s.logAudit(key, "tenant", &tenantID, nil, value, "update", updatedBy)

	return nil
}

// SetUserSetting updates or creates a user setting
func (s *Service) SetUserSetting(userID uuid.UUID, key string, value interface{}) error {
	var setting models.UserSetting
	err := s.db.Where("user_id = ? AND key = ?", userID, key).First(&setting).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new setting
		setting = models.UserSetting{
			ID:        uuid.New(),
			UserID:    userID,
			Key:       key,
			CreatedAt: time.Now(),
		}
	}

	// Update value
	if err := setting.SetValue(value); err != nil {
		return err
	}
	
	setting.UpdatedAt = time.Now()

	// Save to database
	if err := s.db.Save(&setting).Error; err != nil {
		return err
	}

	// Invalidate Redis cache
	s.invalidateRedisCache("user", fmt.Sprintf("%s:%s", userID.String(), key))

	// Log audit
	s.logAudit(key, "user", nil, &userID, value, "update", userID)

	return nil
}

// GetAllSystemSettings retrieves all system settings
func (s *Service) GetAllSystemSettings(publicOnly bool) ([]models.SystemSetting, error) {
	var settings []models.SystemSetting
	query := s.db.Model(&models.SystemSetting{})
	
	if publicOnly {
		query = query.Where("is_public = ?", true)
	}
	
	if err := query.Find(&settings).Error; err != nil {
		return nil, err
	}
	
	return settings, nil
}

// GetTenantSettings retrieves all settings for a tenant
func (s *Service) GetTenantSettings(tenantID uuid.UUID) ([]models.TenantSetting, error) {
	var settings []models.TenantSetting
	if err := s.db.Where("tenant_id = ? AND is_active = ?", tenantID, true).Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}

// GetUserSettings retrieves all settings for a user
func (s *Service) GetUserSettings(userID uuid.UUID) ([]models.UserSetting, error) {
	var settings []models.UserSetting
	if err := s.db.Where("user_id = ?", userID).Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}

// DeleteTenantSetting removes a tenant setting
func (s *Service) DeleteTenantSetting(tenantID uuid.UUID, key string, deletedBy uuid.UUID) error {
	// Get old value for audit
	var setting models.TenantSetting
	if err := s.db.Where("tenant_id = ? AND key = ?", tenantID, key).First(&setting).Error; err != nil {
		return err
	}

	oldValue, _ := setting.GetValue()

	// Delete from database
	if err := s.db.Delete(&setting).Error; err != nil {
		return err
	}

	// Remove from cache
	s.cache.mu.Lock()
	if tenantSettings, exists := s.cache.tenant[tenantID.String()]; exists {
		delete(tenantSettings, key)
	}
	s.cache.mu.Unlock()

	// Invalidate Redis cache
	s.invalidateRedisCache("tenant", fmt.Sprintf("%s:%s", tenantID.String(), key))

	// Log audit
	s.logAudit(key, "tenant", &tenantID, nil, oldValue, "delete", deletedBy)

	return nil
}

// ApplyTemplate applies a configuration template to a tenant
func (s *Service) ApplyTemplate(tenantID uuid.UUID, templateID uuid.UUID, appliedBy uuid.UUID) error {
	var template models.ConfigurationTemplate
	if err := s.db.First(&template, templateID).Error; err != nil {
		return err
	}

	// Parse template settings
	var settings map[string]interface{}
	if err := json.Unmarshal(template.Settings, &settings); err != nil {
		return err
	}

	// Apply each setting
	for key, value := range settings {
		if err := s.SetTenantSetting(tenantID, key, value, appliedBy); err != nil {
			s.logger.Error("Failed to apply template setting", err, "key", key)
			continue
		}
	}

	return nil
}

// Private helper methods

func (s *Service) getSystemSetting(key string) (interface{}, error) {
	// Check cache first
	s.cache.mu.RLock()
	if setting, exists := s.cache.system[key]; exists {
		s.cache.mu.RUnlock()
		return setting.GetValue()
	}
	s.cache.mu.RUnlock()

	// Check Redis cache
	redisKey := fmt.Sprintf("setting:system:%s", key)
	if cached, err := s.redis.Get(context.Background(), redisKey).Result(); err == nil {
		var value interface{}
		if err := json.Unmarshal([]byte(cached), &value); err == nil {
			return value, nil
		}
	}

	// Load from database
	var setting models.SystemSetting
	if err := s.db.Where("key = ?", key).First(&setting).Error; err != nil {
		return nil, err
	}

	// Update cache
	s.cache.mu.Lock()
	s.cache.system[key] = &setting
	s.cache.mu.Unlock()

	value, err := setting.GetValue()
	if err != nil {
		return nil, err
	}

	// Cache in Redis
	if data, err := json.Marshal(value); err == nil {
		s.redis.Set(context.Background(), redisKey, data, 5*time.Minute)
	}

	return value, nil
}

func (s *Service) getTenantSetting(key string, tenantID uuid.UUID) (interface{}, error) {
	// Check cache first
	s.cache.mu.RLock()
	if tenantSettings, exists := s.cache.tenant[tenantID.String()]; exists {
		if setting, exists := tenantSettings[key]; exists {
			s.cache.mu.RUnlock()
			return setting.GetValue()
		}
	}
	s.cache.mu.RUnlock()

	// Check Redis cache
	redisKey := fmt.Sprintf("setting:tenant:%s:%s", tenantID.String(), key)
	if cached, err := s.redis.Get(context.Background(), redisKey).Result(); err == nil {
		var value interface{}
		if err := json.Unmarshal([]byte(cached), &value); err == nil {
			return value, nil
		}
	}

	// Load from database
	var setting models.TenantSetting
	if err := s.db.Where("tenant_id = ? AND key = ? AND is_active = ?", tenantID, key, true).First(&setting).Error; err != nil {
		return nil, err
	}

	// Update cache
	s.cache.mu.Lock()
	if s.cache.tenant[tenantID.String()] == nil {
		s.cache.tenant[tenantID.String()] = make(map[string]*models.TenantSetting)
	}
	s.cache.tenant[tenantID.String()][key] = &setting
	s.cache.mu.Unlock()

	value, err := setting.GetValue()
	if err != nil {
		return nil, err
	}

	// Cache in Redis
	if data, err := json.Marshal(value); err == nil {
		s.redis.Set(context.Background(), redisKey, data, 5*time.Minute)
	}

	return value, nil
}

func (s *Service) getUserSetting(key string, userID uuid.UUID) (interface{}, error) {
	// Check Redis cache
	redisKey := fmt.Sprintf("setting:user:%s:%s", userID.String(), key)
	if cached, err := s.redis.Get(context.Background(), redisKey).Result(); err == nil {
		var value interface{}
		if err := json.Unmarshal([]byte(cached), &value); err == nil {
			return value, nil
		}
	}

	// Load from database
	var setting models.UserSetting
	if err := s.db.Where("user_id = ? AND key = ?", userID, key).First(&setting).Error; err != nil {
		return nil, err
	}

	value, err := setting.GetValue()
	if err != nil {
		return nil, err
	}

	// Cache in Redis
	if data, err := json.Marshal(value); err == nil {
		s.redis.Set(context.Background(), redisKey, data, 5*time.Minute)
	}

	return value, nil
}

func (s *Service) invalidateRedisCache(settingType, key string) {
	redisKey := fmt.Sprintf("setting:%s:%s", settingType, key)
	s.redis.Del(context.Background(), redisKey)
}

func (s *Service) keyToEnvVar(key string) string {
	// Convert setting key to environment variable format
	// e.g., "app.name" -> "APP_NAME"
	envKey := ""
	for _, char := range key {
		if char == '.' {
			envKey += "_"
		} else {
			envKey += string(char)
		}
	}
	return "PYTAKE_" + envKey // Prefix with PYTAKE_ to avoid conflicts
}

func (s *Service) logAudit(key, settingType string, tenantID, userID *uuid.UUID, value interface{}, action string, changedBy uuid.UUID) {
	data, _ := json.Marshal(value)
	
	audit := models.SettingAuditLog{
		ID:         uuid.New(),
		SettingKey: key,
		SettingType: settingType,
		EntityID:   tenantID,
		NewValue:   datatypes.JSON(data),
		Action:     action,
		ChangedBy:  changedBy,
		ChangedAt:  time.Now(),
	}
	
	if userID != nil {
		audit.EntityID = userID
	}
	
	if err := s.db.Create(&audit).Error; err != nil {
		s.logger.Error("Failed to create audit log", err)
	}
}

// GetFeatureFlag checks if a feature flag is enabled
func (s *Service) GetFeatureFlag(key string, tenantID *uuid.UUID) (bool, error) {
	var flag models.FeatureFlag
	if err := s.db.Where("key = ?", key).First(&flag).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil // Default to disabled if not found
		}
		return false, err
	}

	// Check if globally enabled
	if !flag.IsEnabled {
		return false, nil
	}

	// Check rollout percentage if applicable
	if flag.Rollout > 0 && flag.Rollout < 100 && tenantID != nil {
		// Simple hash-based rollout
		hash := 0
		for _, b := range tenantID.String() {
			hash += int(b)
		}
		if (hash % 100) >= flag.Rollout {
			return false, nil
		}
	}

	// Check conditions if any
	if len(flag.Conditions) > 0 {
		// TODO: Implement condition evaluation
		// For now, return true if globally enabled
	}

	return true, nil
}

// UpdateFeatureFlag updates a feature flag
func (s *Service) UpdateFeatureFlag(key string, enabled bool, rollout int, updatedBy uuid.UUID) error {
	var flag models.FeatureFlag
	err := s.db.Where("key = ?", key).First(&flag).Error
	
	if errors.Is(err, gorm.ErrRecordNotFound) {
		flag = models.FeatureFlag{
			ID:        uuid.New(),
			Key:       key,
			CreatedAt: time.Now(),
		}
	}
	
	flag.IsEnabled = enabled
	flag.Rollout = rollout
	flag.UpdatedAt = time.Now()
	
	if err := s.db.Save(&flag).Error; err != nil {
		return err
	}
	
	// Log audit
	s.logAudit(key, "feature_flag", nil, nil, map[string]interface{}{
		"enabled": enabled,
		"rollout": rollout,
	}, "update", updatedBy)
	
	return nil
}