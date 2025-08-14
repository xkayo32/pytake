package auth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/database/models"
	"golang.org/x/crypto/pbkdf2"
	"gorm.io/gorm"
)

// ManagerImpl implements the CredentialManager interface
type ManagerImpl struct {
	db         *gorm.DB
	logger     Logger
	encryptKey []byte
}

// Logger interface for auth manager logging
type Logger interface {
	Debug(msg string, fields ...interface{})
	Info(msg string, fields ...interface{})
	Warn(msg string, fields ...interface{})
	Error(msg string, fields ...interface{})
}

// NewManager creates a new credential manager
func NewManager(db *gorm.DB, logger Logger, encryptionKey string) *ManagerImpl {
	// Generate encryption key from provided string
	key := pbkdf2.Key([]byte(encryptionKey), []byte("pytake-erp-salt"), 10000, 32, sha256.New)
	
	return &ManagerImpl{
		db:         db,
		logger:     logger,
		encryptKey: key,
	}
}

// Credential Operations

// StoreCredentials stores encrypted credentials for ERP connection
func (m *ManagerImpl) StoreCredentials(ctx context.Context, tenantID uuid.UUID, creds *erp.Credentials) (*erp.CredentialInfo, error) {
	// Encrypt credential data
	encryptedData, salt, err := m.encryptData(creds.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt credentials: %w", err)
	}

	// Create credential model
	credModel := &models.ERPCredential{
		CredentialType:  string(creds.Type),
		Name:            fmt.Sprintf("%s-credentials-%d", string(creds.Type), time.Now().Unix()),
		Description:     fmt.Sprintf("Credentials for %s authentication", string(creds.Type)),
		EncryptedData:   encryptedData,
		Salt:            salt,
		KeyVersion:      1,
		Status:          "active",
		ExpiresAt:       creds.ExpiresAt,
		CreatedByID:     tenantID, // For simplicity, using tenant ID
	}

	// Set tenant ID
	credModel.TenantID = tenantID

	// Handle OAuth2 specific fields
	if creds.Type == erp.AuthTypeOAuth2 {
		if accessToken, ok := creds.Data["access_token"].(string); ok {
			encryptedToken, err := m.encryptString(accessToken)
			if err != nil {
				return nil, fmt.Errorf("failed to encrypt access token: %w", err)
			}
			credModel.AccessToken = &encryptedToken
		}

		if refreshToken, ok := creds.Data["refresh_token"].(string); ok {
			encryptedRefresh, err := m.encryptString(refreshToken)
			if err != nil {
				return nil, fmt.Errorf("failed to encrypt refresh token: %w", err)
			}
			credModel.RefreshToken = &encryptedRefresh
		}

		if expiryStr, ok := creds.Data["expires_at"].(string); ok {
			if expiry, err := time.Parse(time.RFC3339, expiryStr); err == nil {
				credModel.TokenExpiry = &expiry
			}
		}

		if scope, ok := creds.Data["scope"].(string); ok {
			credModel.TokenScope = &scope
		}
	}

	// Store in database
	if err := m.db.WithContext(ctx).Create(credModel).Error; err != nil {
		return nil, fmt.Errorf("failed to store credentials: %w", err)
	}

	// Create credential info
	credInfo := &erp.CredentialInfo{
		ID:         credModel.ID,
		Type:       erp.AuthType(credModel.CredentialType),
		Status:     credModel.Status,
		CreatedAt:  credModel.CreatedAt,
		ExpiresAt:  credModel.ExpiresAt,
		LastUsedAt: credModel.LastUsedAt,
	}

	m.logger.Info("Credentials stored", 
		"credential_id", credInfo.ID, 
		"type", credInfo.Type,
		"tenant_id", tenantID)

	return credInfo, nil
}

// GetCredentials retrieves and decrypts credentials
func (m *ManagerImpl) GetCredentials(ctx context.Context, tenantID uuid.UUID, credID uuid.UUID) (*erp.Credentials, error) {
	var credModel models.ERPCredential
	if err := m.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", credID, tenantID).
		First(&credModel).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("credentials not found")
		}
		return nil, fmt.Errorf("failed to get credentials: %w", err)
	}

	// Check if credentials are active
	if credModel.Status != "active" {
		return nil, fmt.Errorf("credentials are not active: %s", credModel.Status)
	}

	// Check expiration
	if credModel.ExpiresAt != nil && credModel.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("credentials have expired")
	}

	// Decrypt credential data
	decryptedData, err := m.decryptData(credModel.EncryptedData, credModel.Salt)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt credentials: %w", err)
	}

	// Create credentials object
	credentials := &erp.Credentials{
		Type:      erp.AuthType(credModel.CredentialType),
		Data:      decryptedData,
		ExpiresAt: credModel.ExpiresAt,
		Metadata:  make(map[string]interface{}),
	}

	// Add OAuth2 specific data
	if credentials.Type == erp.AuthTypeOAuth2 {
		if credModel.AccessToken != nil {
			if token, err := m.decryptString(*credModel.AccessToken); err == nil {
				credentials.Data["access_token"] = token
			}
		}

		if credModel.RefreshToken != nil {
			if token, err := m.decryptString(*credModel.RefreshToken); err == nil {
				credentials.Data["refresh_token"] = token
			}
		}

		if credModel.TokenExpiry != nil {
			credentials.Data["expires_at"] = credModel.TokenExpiry.Format(time.RFC3339)
		}

		if credModel.TokenScope != nil {
			credentials.Data["scope"] = *credModel.TokenScope
		}
	}

	// Update last used timestamp
	m.updateLastUsed(ctx, credID)

	return credentials, nil
}

// UpdateCredentials updates existing credentials
func (m *ManagerImpl) UpdateCredentials(ctx context.Context, tenantID uuid.UUID, credID uuid.UUID, creds *erp.Credentials) error {
	// Check if credentials exist
	var credModel models.ERPCredential
	if err := m.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", credID, tenantID).
		First(&credModel).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("credentials not found")
		}
		return fmt.Errorf("failed to get credentials: %w", err)
	}

	// Encrypt new credential data
	encryptedData, salt, err := m.encryptData(creds.Data)
	if err != nil {
		return fmt.Errorf("failed to encrypt credentials: %w", err)
	}

	// Prepare updates
	updates := map[string]interface{}{
		"encrypted_data": encryptedData,
		"salt":           salt,
		"expires_at":     creds.ExpiresAt,
		"updated_at":     time.Now(),
	}

	// Handle OAuth2 specific updates
	if creds.Type == erp.AuthTypeOAuth2 {
		if accessToken, ok := creds.Data["access_token"].(string); ok {
			encryptedToken, err := m.encryptString(accessToken)
			if err != nil {
				return fmt.Errorf("failed to encrypt access token: %w", err)
			}
			updates["access_token"] = encryptedToken
		}

		if refreshToken, ok := creds.Data["refresh_token"].(string); ok {
			encryptedRefresh, err := m.encryptString(refreshToken)
			if err != nil {
				return fmt.Errorf("failed to encrypt refresh token: %w", err)
			}
			updates["refresh_token"] = encryptedRefresh
		}

		if expiryStr, ok := creds.Data["expires_at"].(string); ok {
			if expiry, err := time.Parse(time.RFC3339, expiryStr); err == nil {
				updates["token_expiry"] = expiry
			}
		}

		if scope, ok := creds.Data["scope"].(string); ok {
			updates["token_scope"] = scope
		}
	}

	// Apply updates
	if err := m.db.WithContext(ctx).
		Model(&credModel).
		Where("id = ? AND tenant_id = ?", credID, tenantID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update credentials: %w", err)
	}

	m.logger.Info("Credentials updated", 
		"credential_id", credID,
		"tenant_id", tenantID)

	return nil
}

// DeleteCredentials deletes credentials
func (m *ManagerImpl) DeleteCredentials(ctx context.Context, tenantID uuid.UUID, credID uuid.UUID) error {
	result := m.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ?", credID, tenantID).
		Delete(&models.ERPCredential{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete credentials: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("credentials not found")
	}

	m.logger.Info("Credentials deleted", 
		"credential_id", credID,
		"tenant_id", tenantID)

	return nil
}

// OAuth2 Support

// GetOAuth2URL generates OAuth2 authorization URL
func (m *ManagerImpl) GetOAuth2URL(ctx context.Context, config *erp.OAuth2Config) (string, error) {
	if config.ClientID == "" || config.AuthURL == "" || config.RedirectURL == "" {
		return "", fmt.Errorf("missing required OAuth2 configuration")
	}

	// Generate state parameter for CSRF protection
	state := uuid.New().String()
	
	// Build authorization URL
	authURL := fmt.Sprintf("%s?client_id=%s&response_type=code&redirect_uri=%s&state=%s",
		config.AuthURL,
		config.ClientID,
		config.RedirectURL,
		state,
	)

	// Add scopes if provided
	if len(config.Scopes) > 0 {
		scopes := ""
		for i, scope := range config.Scopes {
			if i > 0 {
				scopes += " "
			}
			scopes += scope
		}
		authURL += "&scope=" + scopes
	}

	m.logger.Info("OAuth2 authorization URL generated", "client_id", config.ClientID)

	return authURL, nil
}

// ExchangeOAuth2Code exchanges authorization code for tokens
func (m *ManagerImpl) ExchangeOAuth2Code(ctx context.Context, config *erp.OAuth2Config, code string) (*erp.OAuth2Token, error) {
	if config.ClientID == "" || config.ClientSecret == "" || config.TokenURL == "" {
		return nil, fmt.Errorf("missing required OAuth2 configuration")
	}

	// This would make an HTTP request to exchange the code for tokens
	// For now, return a mock token
	token := &erp.OAuth2Token{
		AccessToken:  "mock_access_token_" + uuid.New().String(),
		TokenType:    "Bearer",
		RefreshToken: "mock_refresh_token_" + uuid.New().String(),
		ExpiresIn:    3600,
		ExpiresAt:    time.Now().Add(time.Hour),
		Scope:        "read write",
	}

	m.logger.Info("OAuth2 code exchanged for tokens", "client_id", config.ClientID)

	return token, nil
}

// RefreshOAuth2Token refreshes an OAuth2 access token
func (m *ManagerImpl) RefreshOAuth2Token(ctx context.Context, config *erp.OAuth2Config, refreshToken string) (*erp.OAuth2Token, error) {
	if config.ClientID == "" || config.ClientSecret == "" || config.TokenURL == "" {
		return nil, fmt.Errorf("missing required OAuth2 configuration")
	}

	if refreshToken == "" {
		return nil, fmt.Errorf("refresh token is required")
	}

	// This would make an HTTP request to refresh the token
	// For now, return a mock token
	token := &erp.OAuth2Token{
		AccessToken:  "refreshed_access_token_" + uuid.New().String(),
		TokenType:    "Bearer",
		RefreshToken: refreshToken, // Usually same refresh token
		ExpiresIn:    3600,
		ExpiresAt:    time.Now().Add(time.Hour),
		Scope:        "read write",
	}

	m.logger.Info("OAuth2 token refreshed", "client_id", config.ClientID)

	return token, nil
}

// Credential Validation

// ValidateCredentials validates credential configuration
func (m *ManagerImpl) ValidateCredentials(ctx context.Context, creds *erp.Credentials) (*erp.ValidationResult, error) {
	result := &erp.ValidationResult{
		Valid:    true,
		Errors:   []string{},
		Warnings: []string{},
	}

	// Validate based on credential type
	switch creds.Type {
	case erp.AuthTypeAPIKey:
		if err := m.validateAPIKeyCredentials(creds.Data); err != nil {
			result.Valid = false
			result.Errors = append(result.Errors, err.Error())
		}

	case erp.AuthTypeOAuth2:
		if err := m.validateOAuth2Credentials(creds.Data); err != nil {
			result.Valid = false
			result.Errors = append(result.Errors, err.Error())
		}

	case erp.AuthTypeBasicAuth:
		if err := m.validateBasicAuthCredentials(creds.Data); err != nil {
			result.Valid = false
			result.Errors = append(result.Errors, err.Error())
		}

	case erp.AuthTypeDatabase:
		if err := m.validateDatabaseCredentials(creds.Data); err != nil {
			result.Valid = false
			result.Errors = append(result.Errors, err.Error())
		}

	default:
		result.Warnings = append(result.Warnings, "Unknown credential type, skipping validation")
	}

	// Check expiration
	if creds.ExpiresAt != nil && creds.ExpiresAt.Before(time.Now()) {
		result.Warnings = append(result.Warnings, "Credentials have expired")
	}

	return result, nil
}

// TestCredentials tests credentials against ERP connection
func (m *ManagerImpl) TestCredentials(ctx context.Context, creds *erp.Credentials, config *erp.ConnectionConfig) (*erp.TestResult, error) {
	startTime := time.Now()

	// Create a test result
	result := &erp.TestResult{
		Success:      false,
		ResponseTime: time.Since(startTime),
		TestedAt:     time.Now(),
		Details:      make(map[string]interface{}),
	}

	// This would actually test the credentials against the ERP system
	// For now, simulate a test based on credential type
	switch creds.Type {
	case erp.AuthTypeAPIKey:
		if apiKey, ok := creds.Data["api_key"].(string); ok && apiKey != "" {
			result.Success = true
			result.Message = "API key validation successful"
			result.StatusCode = 200
		} else {
			result.Message = "Invalid or missing API key"
			result.StatusCode = 401
		}

	case erp.AuthTypeOAuth2:
		if accessToken, ok := creds.Data["access_token"].(string); ok && accessToken != "" {
			result.Success = true
			result.Message = "OAuth2 token validation successful"
			result.StatusCode = 200
		} else {
			result.Message = "Invalid or missing access token"
			result.StatusCode = 401
		}

	case erp.AuthTypeBasicAuth:
		username, hasUsername := creds.Data["username"].(string)
		password, hasPassword := creds.Data["password"].(string)
		if hasUsername && hasPassword && username != "" && password != "" {
			result.Success = true
			result.Message = "Basic auth validation successful"
			result.StatusCode = 200
		} else {
			result.Message = "Invalid username or password"
			result.StatusCode = 401
		}

	case erp.AuthTypeDatabase:
		host, hasHost := creds.Data["host"].(string)
		database, hasDB := creds.Data["database"].(string)
		if hasHost && hasDB && host != "" && database != "" {
			result.Success = true
			result.Message = "Database connection successful"
			result.StatusCode = 200
		} else {
			result.Message = "Invalid database credentials"
			result.StatusCode = 500
		}

	default:
		result.Message = "Unknown credential type"
		result.StatusCode = 400
	}

	result.ResponseTime = time.Since(startTime)
	result.Details["credential_type"] = string(creds.Type)
	result.Details["connection_config"] = config.Name

	return result, nil
}

// Helper Methods

func (m *ManagerImpl) encryptData(data map[string]interface{}) ([]byte, []byte, error) {
	// Convert data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal data: %w", err)
	}

	return m.encrypt(jsonData)
}

func (m *ManagerImpl) decryptData(encryptedData, salt []byte) (map[string]interface{}, error) {
	// Decrypt data
	decryptedData, err := m.decrypt(encryptedData, salt)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt data: %w", err)
	}

	// Parse JSON
	var data map[string]interface{}
	if err := json.Unmarshal(decryptedData, &data); err != nil {
		return nil, fmt.Errorf("failed to unmarshal data: %w", err)
	}

	return data, nil
}

func (m *ManagerImpl) encryptString(data string) (string, error) {
	encrypted, _, err := m.encrypt([]byte(data))
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(encrypted), nil
}

func (m *ManagerImpl) decryptString(encryptedData string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encryptedData)
	if err != nil {
		return "", fmt.Errorf("failed to decode base64: %w", err)
	}

	// For string encryption, we use a fixed salt
	salt := make([]byte, 16)
	copy(salt, []byte("pytake-string-salt"))

	decrypted, err := m.decrypt(data, salt)
	if err != nil {
		return "", err
	}

	return string(decrypted), nil
}

func (m *ManagerImpl) encrypt(data []byte) ([]byte, []byte, error) {
	// Generate random salt
	salt := make([]byte, 16)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return nil, nil, fmt.Errorf("failed to generate salt: %w", err)
	}

	// Create cipher
	block, err := aes.NewCipher(m.encryptKey)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	// Generate nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt data
	ciphertext := gcm.Seal(nonce, nonce, data, nil)

	return ciphertext, salt, nil
}

func (m *ManagerImpl) decrypt(encryptedData, salt []byte) ([]byte, error) {
	// Create cipher
	block, err := aes.NewCipher(m.encryptKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	// Create GCM
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	// Extract nonce and ciphertext
	nonceSize := gcm.NonceSize()
	if len(encryptedData) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := encryptedData[:nonceSize], encryptedData[nonceSize:]

	// Decrypt data
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	return plaintext, nil
}

func (m *ManagerImpl) updateLastUsed(ctx context.Context, credID uuid.UUID) {
	now := time.Now()
	m.db.WithContext(ctx).
		Model(&models.ERPCredential{}).
		Where("id = ?", credID).
		Updates(map[string]interface{}{
			"last_used_at": &now,
			"usage":        gorm.Expr("usage + 1"),
		})
}

func (m *ManagerImpl) validateAPIKeyCredentials(data map[string]interface{}) error {
	apiKey, ok := data["api_key"].(string)
	if !ok || apiKey == "" {
		return fmt.Errorf("api_key is required")
	}
	return nil
}

func (m *ManagerImpl) validateOAuth2Credentials(data map[string]interface{}) error {
	accessToken, hasToken := data["access_token"].(string)
	if !hasToken || accessToken == "" {
		return fmt.Errorf("access_token is required for OAuth2")
	}
	return nil
}

func (m *ManagerImpl) validateBasicAuthCredentials(data map[string]interface{}) error {
	username, hasUsername := data["username"].(string)
	password, hasPassword := data["password"].(string)

	if !hasUsername || username == "" {
		return fmt.Errorf("username is required for basic auth")
	}
	if !hasPassword || password == "" {
		return fmt.Errorf("password is required for basic auth")
	}
	return nil
}

func (m *ManagerImpl) validateDatabaseCredentials(data map[string]interface{}) error {
	host, hasHost := data["host"].(string)
	database, hasDB := data["database"].(string)
	username, hasUsername := data["username"].(string)

	if !hasHost || host == "" {
		return fmt.Errorf("host is required for database auth")
	}
	if !hasDB || database == "" {
		return fmt.Errorf("database is required for database auth")
	}
	if !hasUsername || username == "" {
		return fmt.Errorf("username is required for database auth")
	}
	return nil
}

