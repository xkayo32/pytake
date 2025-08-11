package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/config"
	"github.com/pytake/pytake-go/internal/database/models"
	"github.com/pytake/pytake-go/internal/redis"
	"gorm.io/gorm"
)

// Service handles authentication business logic
type Service struct {
	db         *gorm.DB
	redis      *redis.Client
	jwtManager *JWTManager
	config     *config.Config
}

// NewService creates a new authentication service
func NewService(db *gorm.DB, rdb *redis.Client, cfg *config.Config) *Service {
	return &Service{
		db:         db,
		redis:      rdb,
		jwtManager: NewJWTManager(cfg),
		config:     cfg,
	}
}

// Register creates a new user account
func (s *Service) Register(req *RegisterRequest) (*AuthResponse, error) {
	// Validate password strength
	if err := ValidatePasswordStrength(req.Password); err != nil {
		return nil, err
	}

	// Check if user already exists
	var existingUser models.User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("user with this email already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Hash password
	hashedPassword, err := HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := models.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: hashedPassword,
		Role:     "user",
		IsActive: true,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate tokens
	tokens, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email, user.Role, user.DefaultTenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Store refresh token in Redis
	refreshKey := fmt.Sprintf("refresh_token:%s", user.ID.String())
	if err := s.redis.Set(context.Background(), refreshKey, tokens.RefreshToken, s.config.JWTRefreshExpiration).Err(); err != nil {
		// Log error but don't fail registration
		// log.Error("Failed to store refresh token in Redis", err)
	}

	return &AuthResponse{
		User:   s.userToResponse(&user),
		Tokens: *tokens,
	}, nil
}

// Login authenticates a user
func (s *Service) Login(req *LoginRequest) (*AuthResponse, error) {
	// Find user by email
	var user models.User
	if err := s.db.Where("email = ? AND is_active = ?", req.Email, true).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid credentials")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check password
	if err := CheckPassword(user.Password, req.Password); err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Update last login time
	now := time.Now()
	if err := s.db.Model(&user).Update("last_login_at", &now).Error; err != nil {
		// Log error but don't fail login
	}

	// Generate tokens
	tokens, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email, user.Role, user.DefaultTenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Store refresh token in Redis
	refreshKey := fmt.Sprintf("refresh_token:%s", user.ID.String())
	if err := s.redis.Set(context.Background(), refreshKey, tokens.RefreshToken, s.config.JWTRefreshExpiration).Err(); err != nil {
		// Log error but don't fail login
	}

	return &AuthResponse{
		User:   s.userToResponse(&user),
		Tokens: *tokens,
	}, nil
}

// RefreshTokens generates new tokens from refresh token
func (s *Service) RefreshTokens(req *RefreshRequest) (*TokenPair, error) {
	// Validate refresh token
	claims, err := s.jwtManager.ValidateToken(req.RefreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Check if refresh token exists in Redis
	refreshKey := fmt.Sprintf("refresh_token:%s", claims.UserID.String())
	storedToken, err := s.redis.Get(context.Background(), refreshKey).Result()
	if err != nil || storedToken != req.RefreshToken {
		return nil, errors.New("refresh token not found or expired")
	}

	// Verify user is still active
	var user models.User
	if err := s.db.Where("id = ? AND is_active = ?", claims.UserID, true).First(&user).Error; err != nil {
		return nil, errors.New("user not found or inactive")
	}

	// Generate new token pair
	tokens, err := s.jwtManager.GenerateTokenPair(user.ID, user.Email, user.Role, user.DefaultTenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Update refresh token in Redis
	if err := s.redis.Set(context.Background(), refreshKey, tokens.RefreshToken, s.config.JWTRefreshExpiration).Err(); err != nil {
		// Log error but don't fail refresh
	}

	return tokens, nil
}

// Logout invalidates refresh token
func (s *Service) Logout(userID uuid.UUID) error {
	// Remove refresh token from Redis
	refreshKey := fmt.Sprintf("refresh_token:%s", userID.String())
	return s.redis.Del(context.Background(), refreshKey).Err()
}

// GetUserByID retrieves user by ID
func (s *Service) GetUserByID(userID uuid.UUID) (*UserResponse, error) {
	var user models.User
	if err := s.db.Where("id = ? AND is_active = ?", userID, true).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	userResp := s.userToResponse(&user)
	return &userResp, nil
}

// ValidateToken validates a JWT token and returns user info
func (s *Service) ValidateToken(tokenString string) (*Claims, error) {
	return s.jwtManager.ValidateToken(tokenString)
}

// userToResponse converts user model to response
func (s *Service) userToResponse(user *models.User) UserResponse {
	return UserResponse{
		ID:            user.ID,
		Name:          user.Name,
		Email:         user.Email,
		Role:          user.Role,
		IsActive:      user.IsActive,
		EmailVerified: user.EmailVerified,
		TenantID:      user.DefaultTenantID,
		CreatedAt:     user.CreatedAt.Format(time.RFC3339),
	}
}