package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pytake/pytake-go/internal/config"
)

// Claims represents JWT claims
type Claims struct {
	UserID   uuid.UUID `json:"user_id"`
	Email    string    `json:"email"`
	Role     string    `json:"role"`
	TenantID *uuid.UUID `json:"tenant_id,omitempty"`
	jwt.RegisteredClaims
}

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// JWTManager handles JWT operations
type JWTManager struct {
	config *config.Config
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(cfg *config.Config) *JWTManager {
	return &JWTManager{
		config: cfg,
	}
}

// GenerateTokenPair generates access and refresh tokens
func (j *JWTManager) GenerateTokenPair(userID uuid.UUID, email, role string, tenantID *uuid.UUID) (*TokenPair, error) {
	now := time.Now()

	// Access token claims
	accessClaims := &Claims{
		UserID:   userID,
		Email:    email,
		Role:     role,
		TenantID: tenantID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(j.config.JWTExpiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    j.config.AppName,
			Subject:   userID.String(),
			ID:        uuid.New().String(),
		},
	}

	// Generate access token
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(j.config.JWTSecret))
	if err != nil {
		return nil, err
	}

	// Refresh token claims (longer expiration)
	refreshClaims := &Claims{
		UserID:   userID,
		Email:    email,
		Role:     role,
		TenantID: tenantID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(j.config.JWTRefreshExpiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    j.config.AppName,
			Subject:   userID.String(),
			ID:        uuid.New().String(),
		},
	}

	// Generate refresh token
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(j.config.JWTSecret))
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int64(j.config.JWTExpiration.Seconds()),
		TokenType:    "Bearer",
	}, nil
}

// ValidateToken validates and parses a JWT token
func (j *JWTManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(j.config.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// RefreshToken generates new tokens from a valid refresh token
func (j *JWTManager) RefreshToken(refreshToken string) (*TokenPair, error) {
	claims, err := j.ValidateToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Generate new token pair
	return j.GenerateTokenPair(claims.UserID, claims.Email, claims.Role, claims.TenantID)
}